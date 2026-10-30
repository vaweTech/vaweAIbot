"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Mic, Square, Volume2 } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  cleanupTranscript,
  getStyleVoice,
  isSpeechSupported,
  recognitionLangFor,
  requestMicPermission,
  speakAs,
  startVoiceCapture,
  type VoiceStyle,
} from "@/lib/speech";

type VoiceSession = NonNullable<ReturnType<typeof startVoiceCapture>>;

const OPTIONS: {
  value: VoiceStyle;
  label: string;
  hint: string;
  sample: string;
  missingHint?: string;
}[] = [
  {
    value: "south-indian-male",
    label: "Indian English (South Indian, male)",
    hint: "Male interviewer with a South Indian touch",
    sample: "Hello, I am your interviewer. Tell me about a project you have worked on.",
    missingHint: "No South Indian male voice in this browser — open in Microsoft Edge for one",
  },
  {
    value: "en-US",
    label: "English (US)",
    hint: "Try this if India English mishears you",
    sample: "Hello, I am your interviewer. Tell me about a project you have worked on.",
  },
  {
    value: "hi-IN",
    label: "Indian English (Hindi accent)",
    hint: "English questions in a Hindi-accent voice",
    sample: "Hello, I am your interviewer. Tell me about a project you have worked on.",
    missingHint: "No Hindi voice in this browser — using the closest match",
  },
];

export function voiceStyleLabel(style: VoiceStyle): string {
  return OPTIONS.find((o) => o.value === style)?.label ?? style;
}

export function LanguagePicker({
  value,
  onChange,
}: {
  value: VoiceStyle;
  onChange: (style: VoiceStyle) => void;
}) {
  const [playing, setPlaying] = useState<VoiceStyle | null>(null);
  const [voices, setVoices] = useState<
    Partial<Record<VoiceStyle, { name: string; matched: boolean }>>
  >({});
  const [testing, setTesting] = useState(false);
  const [heard, setHeard] = useState("");
  const [testError, setTestError] = useState("");
  const sessionRef = useRef<VoiceSession | null>(null);

  useEffect(() => {
    let cancelled = false;
    void Promise.all(
      OPTIONS.map(async (o) => [o.value, await getStyleVoice("interviewer", o.value)] as const)
    ).then((pairs) => {
      if (!cancelled) setVoices(Object.fromEntries(pairs));
    });
    return () => {
      cancelled = true;
      void sessionRef.current?.stop();
      window.speechSynthesis?.cancel();
    };
  }, []);

  const preview = async (style: VoiceStyle, sample: string) => {
    if (playing === style) {
      window.speechSynthesis?.cancel();
      setPlaying(null);
      return;
    }
    onChange(style);
    setPlaying(style);
    await speakAs("interviewer", sample, { style });
    setPlaying((current) => (current === style ? null : current));
  };

  const startMicTest = async () => {
    setTestError("");
    setHeard("");
    if (!isSpeechSupported()) {
      setTestError("Voice-to-text needs Chrome or Edge.");
      return;
    }
    if (!(await requestMicPermission())) {
      setTestError("Microphone permission denied. Allow the mic and try again.");
      return;
    }
    window.speechSynthesis?.cancel();
    setPlaying(null);
    const session = startVoiceCapture(
      (text) => setHeard(text),
      (message) => setTestError(message),
      { lang: recognitionLangFor(value) }
    );
    if (!session) {
      setTestError("Could not start the microphone.");
      return;
    }
    sessionRef.current = session;
    setTesting(true);
  };

  const stopMicTest = async () => {
    const text = (await sessionRef.current?.stop()) ?? "";
    sessionRef.current = null;
    setTesting(false);
    const cleaned = cleanupTranscript(text || heard);
    setHeard(cleaned);
    if (!cleaned) setTestError("Nothing was heard. Speak a little louder and closer to the mic.");
  };

  const selected = OPTIONS.find((o) => o.value === value);

  return (
    <div className="mt-4 text-left">
      <p className="mb-2 text-xs font-medium text-slate-600">Preview each voice, then pick one</p>
      <div className="space-y-2">
        {OPTIONS.map((option) => {
          const active = option.value === value;
          const isPlaying = playing === option.value;
          const voice = voices[option.value];
          const fallback = voice && !voice.matched && option.missingHint;
          return (
            <div
              key={option.value}
              className={cn(
                "flex items-center gap-3 rounded-2xl border p-3 transition",
                active ? "border-indigo-300 bg-indigo-50/70" : "border-slate-200 bg-white hover:bg-slate-50"
              )}
            >
              <button
                type="button"
                onClick={() => onChange(option.value)}
                disabled={testing}
                className="flex min-w-0 flex-1 items-center gap-3 text-left"
              >
                <span
                  className={cn(
                    "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border",
                    active ? "border-indigo-600 bg-indigo-600 text-white" : "border-slate-300"
                  )}
                >
                  {active && <Check className="h-3 w-3" />}
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-semibold text-slate-800">{option.label}</span>
                  <span className="block truncate text-[11px] text-slate-500">
                    {option.hint}
                    {voice ? ` · ${voice.name}` : ""}
                  </span>
                  {fallback && (
                    <span className="block text-[11px] text-amber-700">{option.missingHint}</span>
                  )}
                </span>
              </button>
              <button
                type="button"
                onClick={() => void preview(option.value, option.sample)}
                disabled={testing}
                className={cn(
                  "inline-flex shrink-0 items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-medium transition disabled:opacity-50",
                  isPlaying
                    ? "border-rose-200 bg-rose-50 text-rose-700"
                    : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                )}
              >
                {isPlaying ? <Square className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />}
                {isPlaying ? "Stop" : "Preview"}
              </button>
            </div>
          );
        })}
      </div>

      <div className="mt-3 rounded-2xl border border-dashed border-slate-200 bg-slate-50/60 p-3">
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs text-slate-600">
            Test the mic in <span className="font-semibold">{selected?.label}</span>
          </p>
          <button
            type="button"
            onClick={() => void (testing ? stopMicTest() : startMicTest())}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold text-white",
              testing ? "bg-rose-600 hover:bg-rose-700" : "bg-indigo-600 hover:bg-indigo-700"
            )}
          >
            {testing ? <Square className="h-3.5 w-3.5" /> : <Mic className="h-3.5 w-3.5" />}
            {testing ? "Stop test" : "Test mic"}
          </button>
        </div>
        {(testing || heard) && (
          <p className="mt-2 rounded-xl bg-white px-3 py-2 text-xs text-slate-700">
            {heard ? `Heard: ${heard}` : "Listening… say a sentence"}
          </p>
        )}
        {testError && <p className="mt-2 text-xs text-rose-600">{testError}</p>}
      </div>
    </div>
  );
}
