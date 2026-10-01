"use client";

export type SpeechResult = {
  transcript: string;
  usedMicrophone: boolean;
};

export type VoiceProfile = {
  id: string;
  /** Prefer female / male sounding voices when available */
  gender: "female" | "male";
  /** Speech rate 0.7–1.2 */
  rate: number;
  /** Pitch 0.6–1.4 — makes each person sound different */
  pitch: number;
  /** Prefer these voice name fragments (Indian voices first) */
  preferredNames?: string[];
};

/** Distinct Indian-style profiles for GD bots + interviewer */
export const VOICE_PROFILES: Record<string, VoiceProfile> = {
  interviewer: {
    id: "interviewer",
    gender: "female",
    rate: 0.92,
    pitch: 1.05,
    preferredNames: ["Heera", "Neerja", "Raveena", "Veena", "Google हिन्दी", "Microsoft Heera"],
  },
  bot1: {
    id: "bot1", // Aisha — softer female
    gender: "female",
    rate: 0.94,
    pitch: 1.18,
    preferredNames: ["Neerja", "Heera", "Raveena", "Veena", "Zira"],
  },
  bot2: {
    id: "bot2", // Vikram — deeper male
    gender: "male",
    rate: 0.9,
    pitch: 0.78,
    preferredNames: ["Ravi", "Prabhat", "Hemant", "Google हिन्दी", "David", "Mark"],
  },
  bot3: {
    id: "bot3", // Meera — calm female
    gender: "female",
    rate: 0.88,
    pitch: 1.0,
    preferredNames: ["Heera", "Veena", "Neerja", "Raveena", "Susan"],
  },
  bot4: {
    id: "bot4", // Arjun — energetic male
    gender: "male",
    rate: 1.02,
    pitch: 0.92,
    preferredNames: ["Ravi", "Prabhat", "Hemant", "Google UK English Male", "George"],
  },
  moderator: {
    id: "moderator",
    gender: "male",
    rate: 0.93,
    pitch: 0.85,
    preferredNames: ["Ravi", "Prabhat", "Hemant", "Google हिन्दी"],
  },
};

type SpeechRecognitionLike = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  maxAlternatives: number;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((event: {
    results: ArrayLike<{
      0: { transcript: string; confidence?: number };
      isFinal: boolean;
      length?: number;
      [i: number]: { transcript: string; confidence?: number };
    }>;
  }) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
};

type RecognitionCtor = new () => SpeechRecognitionLike;

function getRecognitionCtor(): RecognitionCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: RecognitionCtor;
    webkitSpeechRecognition?: RecognitionCtor;
  };
  return w.SpeechRecognition || w.webkitSpeechRecognition || null;
}

function getRecognition(): SpeechRecognitionLike | null {
  const Ctor = getRecognitionCtor();
  return Ctor ? new Ctor() : null;
}

export function isSpeechSupported(): boolean {
  return getRecognitionCtor() !== null;
}

/** Ask browser for microphone access (needed before speech recognition). */
export async function requestMicPermission(): Promise<boolean> {
  if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
    return isSpeechSupported();
  }
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
    });
    stream.getTracks().forEach((t) => t.stop());
    return true;
  } catch {
    return false;
  }
}

type VoiceSession = {
  stop: () => Promise<string>;
};

export type SpeechLang = "en-IN" | "en-US" | "hi-IN";

/** Fix common STT mistakes for tech / Indian English answers. */
export function cleanupTranscript(raw: string): string {
  let text = raw.replace(/\s+/g, " ").trim();
  if (!text) return text;

  const replacements: [RegExp, string][] = [
    [/\bre act\b/gi, "React"],
    [/\bree act\b/gi, "React"],
    [/\bnode j s\b/gi, "Node.js"],
    [/\bnode js\b/gi, "Node.js"],
    [/\bjava script\b/gi, "JavaScript"],
    [/\btype script\b/gi, "TypeScript"],
    [/\bmongo d b\b/gi, "MongoDB"],
    [/\bmong o d b\b/gi, "MongoDB"],
    [/\bsql\b/gi, "SQL"],
    [/\bapi\b/gi, "API"],
    [/\bhtml\b/gi, "HTML"],
    [/\bcss\b/gi, "CSS"],
    [/\bui\b/gi, "UI"],
  ];
  for (const [pattern, value] of replacements) {
    text = text.replace(pattern, value);
  }
  text = text.replace(/(^\s*\w|[.!?]\s+\w)/g, (m) => m.toUpperCase());
  return text;
}

/**
 * Capture user voice → text. Auto-restarts when Chrome stops early.
 * Use maxAlternatives + optional language for better accuracy.
 */
export function startVoiceCapture(
  onInterim: (text: string) => void,
  onError: (message: string) => void,
  options?: { lang?: SpeechLang }
): VoiceSession | null {
  const Ctor = getRecognitionCtor();
  if (!Ctor) {
    onError("Speech recognition not supported. Please use Chrome or Edge.");
    return null;
  }

  window.speechSynthesis?.cancel();

  const lang = options?.lang ?? "en-IN";
  let committed = ""; // text from previous recognition sessions
  let sessionFinal = "";
  let interimText = "";
  let settled = false;
  let stopping = false;
  let resolveStop: ((text: string) => void) | null = null;
  let recognition: SpeechRecognitionLike | null = null;
  let restartTimer: ReturnType<typeof setTimeout> | null = null;

  const combined = () =>
    [committed, sessionFinal, interimText].map((s) => s.trim()).filter(Boolean).join(" ").trim();

  const bestPhrase = (result: {
    0: { transcript: string; confidence?: number };
    isFinal: boolean;
    length?: number;
    [i: number]: { transcript: string; confidence?: number };
  }) => {
    const n = typeof result.length === "number" ? result.length : 1;
    let best = result[0];
    let score = best?.confidence ?? -1;
    for (let i = 1; i < n; i++) {
      const alt = result[i];
      const c = alt?.confidence ?? -1;
      if (c > score) {
        best = alt;
        score = c;
      }
    }
    return (best?.transcript || "").trim();
  };

  const attach = (rec: SpeechRecognitionLike) => {
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = lang;
    rec.maxAlternatives = 3;

    rec.onresult = (event) => {
      let finals = "";
      let interim = "";
      for (let i = 0; i < event.results.length; i++) {
        const result = event.results[i];
        const phrase = bestPhrase(result);
        if (!phrase) continue;
        if (result.isFinal) finals += phrase + " ";
        else interim = phrase;
      }
      sessionFinal = finals.trim();
      interimText = interim.trim();
      onInterim(combined());
    };

    rec.onerror = (event) => {
      if (event.error === "not-allowed") {
        onError("Microphone blocked. Allow mic access and try again.");
      } else if (event.error === "network") {
        onError("Speech network error. Check internet and retry.");
      } else if (event.error !== "aborted" && event.error !== "no-speech") {
        onError(`Mic: ${event.error}`);
      }
    };

    rec.onend = () => {
      // Keep speech if Chrome stops mid-answer
      if (!stopping && !settled) {
        if (sessionFinal || interimText) {
          committed = combined();
          sessionFinal = "";
          interimText = "";
          onInterim(committed);
        }
        restartTimer = setTimeout(() => {
          if (stopping || settled) return;
          try {
            recognition = new Ctor();
            attach(recognition);
            recognition.start();
          } catch {
            /* ignore */
          }
        }, 180);
        return;
      }

      if (!settled && resolveStop) {
        settled = true;
        resolveStop(cleanupTranscript(combined()));
        resolveStop = null;
      }
    };
  };

  recognition = new Ctor();
  attach(recognition);

  try {
    recognition.start();
  } catch {
    onError("Could not start microphone listening.");
    return null;
  }

  return {
    stop: () =>
      new Promise((resolve) => {
        stopping = true;
        if (restartTimer) clearTimeout(restartTimer);
        resolveStop = resolve;
        try {
          recognition?.stop();
        } catch {
          resolve(cleanupTranscript(combined()));
          return;
        }
        setTimeout(() => {
          if (!settled) {
            settled = true;
            resolve(cleanupTranscript(combined()));
            resolveStop = null;
          }
        }, 1500);
      }),
  };
}

/** Start browser speech recognition (Chrome/Edge). Returns a stop function. */
export function startListening(
  onInterim: (text: string) => void,
  onFinal: (text: string) => void,
  onError: (message: string) => void
): () => void {
  const session = startVoiceCapture(onInterim, onError);
  if (!session) return () => {};
  return () => {
    void session.stop().then((text) => {
      if (text) onFinal(text);
    });
  };
}

/** Wait until browser voices are loaded (Chrome loads them async). */
export function loadVoices(): Promise<SpeechSynthesisVoice[]> {
  if (typeof window === "undefined" || !window.speechSynthesis) {
    return Promise.resolve([]);
  }

  const existing = window.speechSynthesis.getVoices();
  if (existing.length > 0) return Promise.resolve(existing);

  return new Promise((resolve) => {
    const done = () => {
      resolve(window.speechSynthesis.getVoices());
      window.speechSynthesis.onvoiceschanged = null;
    };
    window.speechSynthesis.onvoiceschanged = done;
    // Fallback if event never fires
    setTimeout(done, 500);
  });
}

function isIndianVoice(voice: SpeechSynthesisVoice): boolean {
  const hay = `${voice.name} ${voice.lang}`.toLowerCase();
  return (
    voice.lang.toLowerCase().startsWith("en-in") ||
    voice.lang.toLowerCase().startsWith("hi") ||
    hay.includes("india") ||
    hay.includes("heera") ||
    hay.includes("neerja") ||
    hay.includes("raveena") ||
    hay.includes("veena") ||
    hay.includes("ravi") ||
    hay.includes("prabhat") ||
    hay.includes("hemant") ||
    hay.includes("हिन्दी") ||
    hay.includes("hindi")
  );
}

function genderScore(voice: SpeechSynthesisVoice, gender: "female" | "male"): number {
  const name = voice.name.toLowerCase();
  const femaleHints = ["female", "woman", "zira", "susan", "hazel", "heera", "neerja", "raveena", "veena", "samantha", "karen"];
  const maleHints = ["male", "man", "david", "mark", "george", "ravi", "prabhat", "hemant", "daniel", "james"];

  if (gender === "female") {
    if (femaleHints.some((h) => name.includes(h))) return 3;
    if (maleHints.some((h) => name.includes(h))) return -2;
    return 0;
  }
  if (maleHints.some((h) => name.includes(h))) return 3;
  if (femaleHints.some((h) => name.includes(h))) return -2;
  return 0;
}

export function pickVoiceForProfile(
  voices: SpeechSynthesisVoice[],
  profile: VoiceProfile
): SpeechSynthesisVoice | null {
  if (voices.length === 0) return null;

  const scored = voices.map((voice) => {
    let score = 0;
    const hay = `${voice.name} ${voice.lang}`.toLowerCase();

    // Strong preference for Indian / en-IN
    if (isIndianVoice(voice)) score += 10;
    if (voice.lang.toLowerCase() === "en-in") score += 5;
    if (voice.lang.toLowerCase().startsWith("en")) score += 2;

    // Preferred name matches
    for (const pref of profile.preferredNames || []) {
      if (hay.includes(pref.toLowerCase())) score += 8;
    }

    score += genderScore(voice, profile.gender);

    return { voice, score };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored[0]?.voice ?? null;
}

/**
 * Speak with a named profile so each GD person has a different Indian-style voice.
 * Uses browser Speech Synthesis (Chrome/Edge often include Indian voices like Heera / Ravi).
 */
export async function speakAs(profileId: string, text: string): Promise<void> {
  if (typeof window === "undefined" || !window.speechSynthesis) return;

  const profile = VOICE_PROFILES[profileId] ?? VOICE_PROFILES.interviewer;
  const voices = await loadVoices();
  const voice = pickVoiceForProfile(voices, profile);
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  const estimatedMs = Math.max(3000, Math.min(28000, Math.round((words / Math.max(profile.rate, 0.6)) * 420)));

  return new Promise((resolve) => {
    let settled = false;
    let resumeTimer: ReturnType<typeof setInterval> | null = null;
    let fallbackTimer: ReturnType<typeof setTimeout> | null = null;

    const finish = () => {
      if (settled) return;
      settled = true;
      if (resumeTimer) clearInterval(resumeTimer);
      if (fallbackTimer) clearTimeout(fallbackTimer);
      resolve();
    };

    window.speechSynthesis.cancel();

    // Chrome often never fires utterance.onend, and also pauses TTS after a few seconds.
    fallbackTimer = setTimeout(finish, estimatedMs + 1200);
    resumeTimer = setInterval(() => {
      if (window.speechSynthesis.speaking && window.speechSynthesis.paused) {
        window.speechSynthesis.resume();
      }
    }, 250);

    setTimeout(() => {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = voice?.lang?.startsWith("hi") ? "hi-IN" : "en-IN";
      utterance.rate = profile.rate;
      utterance.pitch = profile.pitch;
      if (voice) utterance.voice = voice;
      utterance.onend = () => finish();
      utterance.onerror = () => finish();
      window.speechSynthesis.speak(utterance);
      window.speechSynthesis.resume();
    }, 80);
  });
}

/** Default speak — uses interviewer Indian female profile */
export async function speakText(text: string): Promise<void> {
  return speakAs("interviewer", text);
}

/** List available voices for debugging / UI badges */
export async function getVoiceLabel(profileId: string): Promise<string> {
  const profile = VOICE_PROFILES[profileId];
  if (!profile) return "Default";
  const voices = await loadVoices();
  const voice = pickVoiceForProfile(voices, profile);
  if (!voice) return `Indian ${profile.gender} (system)`;
  return voice.name;
}
