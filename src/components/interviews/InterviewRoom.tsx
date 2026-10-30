"use client";

import { useEffect, useRef, useState } from "react";
import {
  AlertTriangle,
  Captions,
  CaptionsOff,
  Eye,
  Mic,
  MicOff,
  PhoneOff,
  RotateCcw,
  ScanFace,
  Signal,
  Square,
  Video,
  VideoOff,
} from "lucide-react";
import { AudioWaveform } from "@/components/interviews/AudioWaveform";
import { InterviewerAvatar, type AvatarLook } from "@/components/interviews/InterviewerAvatar";
import { FACE_MESSAGES, useFaceMonitor, type FaceStatus } from "@/components/interviews/useFaceMonitor";
import type { VoiceStyle } from "@/lib/speech";
import { cn } from "@/lib/utils";

export type InterviewRoomPhase = "question" | "listening" | "review";

type Persona = { name: string; title: string; look: AvatarLook };

/** Who the student "meets", matched to the voice they picked. */
export const INTERVIEWER_PERSONAS: Record<VoiceStyle, Persona> = {
  "south-indian-male": {
    name: "Karthik Raman",
    title: "Senior Technical Interviewer",
    look: {
      skin: "#a86b46",
      skinShade: "#8d5536",
      hair: "#1c1410",
      hairStyle: "short",
      suit: "#1e293b",
      shirt: "#e2e8f0",
      tie: "#7c2d12",
      mustache: true,
    },
  },
  "en-US": {
    name: "Alex Morgan",
    title: "Hiring Manager",
    look: {
      skin: "#f0c8a8",
      skinShade: "#d9a888",
      hair: "#6b4a2b",
      hairStyle: "short",
      suit: "#334155",
      shirt: "#dbeafe",
      glasses: true,
    },
  },
  "hi-IN": {
    name: "Priya Sharma",
    title: "HR & Talent Lead",
    look: {
      skin: "#c68a63",
      skinShade: "#a96f4b",
      hair: "#140d0a",
      hairStyle: "long",
      suit: "#7f1d1d",
      shirt: "#fde68a",
    },
  },
};

/** Answer length the scoring rewards; the bar under the video shows where the student is. */
const IDEAL_MIN_SECONDS = 30;
const IDEAL_MAX_SECONDS = 90;
const BAR_MAX_SECONDS = 150;
export const PREP_SECONDS = 5;

/** Face-check states that need no warning. */
const NEUTRAL_FACE_STATUSES: FaceStatus[] = ["ok", "loading", "unavailable"];

function formatClock(seconds: number) {
  return `${Math.floor(seconds / 60)}:${(seconds % 60).toString().padStart(2, "0")}`;
}

/** Last part of a long string, so captions stay two lines like real subtitles. */
function tail(text: string, max = 180) {
  return text.length > max ? `…${text.slice(-max)}` : text;
}

function SpeakingBars({ active }: { active: boolean }) {
  return (
    <span className="flex h-3 items-end gap-[2px]">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className={cn("w-[3px] rounded-full bg-emerald-400", active ? "animate-waveform" : "h-1 opacity-60")}
          style={active ? { animationDelay: `${i * 0.15}s`, minHeight: "30%", maxHeight: "100%" } : undefined}
        />
      ))}
    </span>
  );
}

function ControlButton({
  onClick,
  disabled,
  label,
  active = true,
  children,
}: {
  onClick: () => void;
  disabled?: boolean;
  label: string;
  active?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={label}
      aria-label={label}
      className={cn(
        "flex h-11 w-11 items-center justify-center rounded-full transition disabled:cursor-not-allowed disabled:opacity-40",
        active ? "bg-slate-700 text-white hover:bg-slate-600" : "bg-rose-500/90 text-white hover:bg-rose-500"
      )}
    >
      {children}
    </button>
  );
}

export function InterviewRoom({
  voiceStyle,
  question,
  questionNumber,
  totalQuestions,
  phase,
  interviewerSpeaking,
  liveText,
  elapsed,
  micError,
  prepCountdown,
  onCancelPrep,
  onStartAnswer,
  onStopAnswer,
  onReplay,
  onLeave,
}: {
  /** Seconds until recording starts by itself; null when not counting down. */
  prepCountdown: number | null;
  onCancelPrep: () => void;
  voiceStyle: VoiceStyle;
  question: string;
  questionNumber: number;
  totalQuestions: number;
  phase: InterviewRoomPhase;
  interviewerSpeaking: boolean;
  liveText: string;
  elapsed: number;
  micError: string;
  onStartAnswer: () => void;
  onStopAnswer: () => void;
  onReplay: () => void;
  onLeave: () => void;
}) {
  const persona = INTERVIEWER_PERSONAS[voiceStyle];
  const [captionsOn, setCaptionsOn] = useState(true);
  const [cameraOn, setCameraOn] = useState(false);
  const [cameraError, setCameraError] = useState("");
  const [sessionSeconds, setSessionSeconds] = useState(0);
  const streamRef = useRef<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const face = useFaceMonitor(videoRef, cameraOn);
  const faceWarning = cameraOn && !NEUTRAL_FACE_STATUSES.includes(face.status);
  const lookingAway = face.status === "looking-away";

  useEffect(() => {
    const timer = setInterval(() => setSessionSeconds((s) => s + 1), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  const toggleCamera = () => {
    if (cameraOn) {
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
      setCameraOn(false);
      return;
    }
    setCameraError("");
    void navigator.mediaDevices
      ?.getUserMedia({ video: { width: 640, height: 360, facingMode: "user" } })
      .then((stream) => {
        streamRef.current = stream;
        setCameraOn(true);
      })
      .catch(() => setCameraError("Camera blocked — allow it in the browser to see yourself"));
  };

  const listening = phase === "listening";
  const showStudentCaption = listening && liveText;

  return (
    <div className="overflow-hidden rounded-3xl bg-slate-950 shadow-2xl shadow-slate-900/20 ring-1 ring-slate-900/10">
      <div className="flex items-center justify-between gap-3 border-b border-white/5 px-4 py-2.5 text-xs text-slate-300">
        <div className="flex items-center gap-2">
          {listening ? (
            <span className="inline-flex items-center gap-1.5 rounded-md bg-rose-600/90 px-2 py-0.5 font-semibold text-white">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" /> REC {formatClock(elapsed)}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 rounded-md bg-emerald-500/15 px-2 py-0.5 font-medium text-emerald-300">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> Live
            </span>
          )}
          <span className="hidden text-slate-400 sm:inline">{formatClock(sessionSeconds)}</span>
          {face.lookAwayCount > 0 && (
            <span
              className="inline-flex items-center gap-1 rounded-md bg-amber-500/15 px-2 py-0.5 font-medium text-amber-300"
              title="Times you looked away from the screen"
            >
              <Eye className="h-3 w-3" /> Looked away {face.lookAwayCount}×
            </span>
          )}
        </div>
        <p className="font-medium text-slate-200">
          Question {questionNumber} <span className="text-slate-500">of {totalQuestions}</span>
        </p>
        <span className="inline-flex items-center gap-1 text-slate-400">
          <Signal className="h-3.5 w-3.5 text-emerald-400" /> HD
        </span>
      </div>

      <div className="relative aspect-[4/3] w-full overflow-hidden sm:aspect-video">
        {/* Interviewer "camera": a soft office backdrop with depth-of-field blur. */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_20%_10%,#334155_0%,transparent_55%),radial-gradient(ellipse_at_85%_30%,#78350f55_0%,transparent_45%),radial-gradient(ellipse_at_50%_100%,#0f172a_0%,#020617_70%)]" />
        <div className="absolute left-[8%] top-[12%] h-[38%] w-[22%] rounded-lg bg-slate-700/30 blur-md" />
        <div className="absolute right-[10%] top-[18%] h-[22%] w-[14%] rounded-full bg-amber-200/10 blur-2xl" />
        <div className="absolute bottom-0 left-0 right-0 h-1/3 bg-gradient-to-t from-black/60 to-transparent" />

        <InterviewerAvatar
          look={persona.look}
          speaking={interviewerSpeaking}
          className="absolute bottom-0 left-1/2 h-[86%] -translate-x-1/2 drop-shadow-2xl"
        />
        {/* Soft key light from the side, like a webcam in a lit office. */}
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_35%_35%,rgba(255,237,213,0.10),transparent_50%)]" />
        <div
          className={cn(
            "pointer-events-none absolute inset-0 rounded-none ring-inset transition",
            interviewerSpeaking ? "ring-4 ring-emerald-400/80" : "ring-0"
          )}
        />

        <div className="absolute left-3 top-3 flex items-center gap-2 rounded-lg bg-black/50 px-2.5 py-1.5 text-xs text-white backdrop-blur">
          <SpeakingBars active={interviewerSpeaking} />
          <span className="font-semibold">{persona.name}</span>
          <span className="hidden text-slate-300 sm:inline">· {persona.title}</span>
        </div>

        {captionsOn && (showStudentCaption || question) && (
          <div className="absolute inset-x-3 bottom-3 z-10 flex justify-center sm:inset-x-[18%] sm:bottom-5">
            <p className="max-w-2xl rounded-lg bg-black/75 px-3 py-2 text-center text-sm leading-relaxed text-white sm:text-base">
              <span className={cn("mr-1.5 font-semibold", showStudentCaption ? "text-sky-300" : "text-amber-300")}>
                {showStudentCaption ? "You:" : `${persona.name.split(" ")[0]}:`}
              </span>
              {showStudentCaption ? tail(liveText) : question}
            </p>
          </div>
        )}

        {faceWarning && (
          <div
            role="alert"
            className={cn(
              "absolute left-1/2 top-12 z-20 flex w-[min(92%,26rem)] -translate-x-1/2 items-start gap-2 rounded-xl px-3 py-2 text-sm font-medium text-white shadow-xl backdrop-blur animate-fade-in sm:top-3",
              lookingAway ? "bg-amber-500/90" : "bg-rose-600/90"
            )}
          >
            {lookingAway ? (
              <Eye className="mt-0.5 h-4 w-4 shrink-0" />
            ) : (
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            )}
            <span>{FACE_MESSAGES[face.status]}</span>
          </div>
        )}

        <div
          className={cn(
            "absolute right-3 top-3 aspect-video w-32 overflow-hidden rounded-xl bg-slate-800 shadow-xl ring-2 transition sm:w-48",
            faceWarning
              ? lookingAway
                ? "ring-4 ring-amber-400"
                : "ring-4 ring-rose-500"
              : listening
                ? "ring-sky-400"
                : "ring-white/10"
          )}
        >
          {cameraOn && (
            <span
              className={cn(
                "absolute left-1.5 top-1.5 z-10 inline-flex items-center gap-1 rounded bg-black/60 px-1.5 py-0.5 text-[10px] font-medium",
                face.status === "ok" ? "text-emerald-300" : faceWarning ? "text-amber-300" : "text-slate-300"
              )}
              title={FACE_MESSAGES[face.status]}
            >
              <ScanFace className="h-3 w-3" />
              {face.status === "ok"
                ? "Face OK"
                : face.status === "loading"
                  ? "Checking…"
                  : face.status === "unavailable"
                    ? "No face check"
                    : "Warning"}
            </span>
          )}
          {cameraOn ? (
            <video
              ref={(el) => {
                videoRef.current = el;
                if (el && streamRef.current && el.srcObject !== streamRef.current) {
                  el.srcObject = streamRef.current;
                }
              }}
              autoPlay
              muted
              playsInline
              className="h-full w-full -scale-x-100 object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-slate-700 to-slate-800">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-500 text-sm font-semibold text-white sm:h-12 sm:w-12">
                You
              </span>
            </div>
          )}
          <div className="absolute bottom-1 left-1.5 flex items-center gap-1 rounded bg-black/55 px-1.5 py-0.5 text-[10px] text-white">
            {listening ? <Mic className="h-3 w-3 text-sky-300" /> : <MicOff className="h-3 w-3 text-slate-400" />}
            You
          </div>
          {listening && (
            <AudioWaveform active bars={10} className="absolute bottom-1 right-1.5 h-4 w-14 gap-[2px]" />
          )}
        </div>

        {prepCountdown !== null && phase === "question" && (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-950/55 backdrop-blur-[2px]">
            <div className="text-center text-white">
              <p className="text-sm font-medium text-slate-200">Take a moment to think</p>
              <p className="mt-1 text-xs text-slate-400">Recording starts automatically in</p>
              <div className="relative mx-auto mt-4 flex h-24 w-24 items-center justify-center">
                <svg viewBox="0 0 100 100" className="absolute inset-0 -rotate-90">
                  <circle cx="50" cy="50" r="44" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="6" />
                  <circle
                    cx="50"
                    cy="50"
                    r="44"
                    fill="none"
                    stroke="#818cf8"
                    strokeWidth="6"
                    strokeLinecap="round"
                    strokeDasharray={2 * Math.PI * 44}
                    strokeDashoffset={2 * Math.PI * 44 * (1 - prepCountdown / PREP_SECONDS)}
                    className="transition-[stroke-dashoffset] duration-1000 ease-linear"
                  />
                </svg>
                <span className="text-4xl font-bold tabular-nums">{prepCountdown}</span>
              </div>
              <div className="mt-5 flex justify-center gap-2">
                <button
                  type="button"
                  onClick={onStartAnswer}
                  className="inline-flex items-center gap-1.5 rounded-full bg-indigo-500 px-4 py-2 text-sm font-semibold hover:bg-indigo-400"
                >
                  <Mic className="h-4 w-4" /> Answer now
                </button>
                <button
                  type="button"
                  onClick={onCancelPrep}
                  className="rounded-full bg-white/10 px-4 py-2 text-sm font-medium text-slate-200 hover:bg-white/20"
                >
                  I need more time
                </button>
              </div>
            </div>
          </div>
        )}

        {listening && (
          <div className="absolute inset-x-0 bottom-0 h-1.5 bg-white/10">
            <div
              className={cn(
                "h-full transition-all duration-1000 ease-linear",
                elapsed < IDEAL_MIN_SECONDS
                  ? "bg-amber-400"
                  : elapsed <= IDEAL_MAX_SECONDS
                    ? "bg-emerald-400"
                    : "bg-rose-500"
              )}
              style={{ width: `${Math.min(100, (elapsed / BAR_MAX_SECONDS) * 100)}%` }}
            />
            <span
              className="absolute -top-0.5 h-2.5 w-px bg-white/60"
              style={{ left: `${(IDEAL_MIN_SECONDS / BAR_MAX_SECONDS) * 100}%` }}
            />
            <span
              className="absolute -top-0.5 h-2.5 w-px bg-white/60"
              style={{ left: `${(IDEAL_MAX_SECONDS / BAR_MAX_SECONDS) * 100}%` }}
            />
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900 px-4 py-3">
        <p className="min-w-0 flex-1 truncate text-xs text-slate-400">
          {micError ? (
            <span className="text-rose-300">{micError}</span>
          ) : cameraError ? (
            <span className="text-amber-300">{cameraError}</span>
          ) : cameraOn && face.status === "unavailable" ? (
            <span className="text-amber-300">{FACE_MESSAGES.unavailable}</span>
          ) : interviewerSpeaking ? (
            `${persona.name.split(" ")[0]} is asking the question…`
          ) : prepCountdown !== null && phase === "question" ? (
            `Recording starts in ${prepCountdown}s — or press Answer now`
          ) : listening && elapsed < IDEAL_MIN_SECONDS ? (
            "Keep going — aim for at least 30 seconds"
          ) : listening && elapsed > IDEAL_MAX_SECONDS ? (
            "Good length — start wrapping up"
          ) : phase === "question" ? (
            "Your turn — press the mic and answer out loud"
          ) : listening ? (
            "Listening… press stop when you finish"
          ) : (
            "Check the transcript below, then submit"
          )}
        </p>

        <div className="flex items-center gap-2">
          {listening ? (
            <button
              type="button"
              onClick={onStopAnswer}
              className="inline-flex h-11 items-center gap-2 rounded-full bg-rose-600 px-5 text-sm font-semibold text-white shadow-lg shadow-rose-900/40 hover:bg-rose-500"
            >
              <Square className="h-4 w-4" /> Stop answer
            </button>
          ) : (
            <button
              type="button"
              onClick={onStartAnswer}
              disabled={phase !== "question"}
              className="inline-flex h-11 items-center gap-2 rounded-full bg-indigo-500 px-5 text-sm font-semibold text-white shadow-lg shadow-indigo-900/40 hover:bg-indigo-400 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400 disabled:shadow-none"
            >
              <Mic className="h-4 w-4" /> Answer
            </button>
          )}
          <ControlButton onClick={toggleCamera} label={cameraOn ? "Turn camera off" : "Turn camera on"} active={cameraOn}>
            {cameraOn ? <Video className="h-5 w-5" /> : <VideoOff className="h-5 w-5" />}
          </ControlButton>
          <ControlButton
            onClick={() => setCaptionsOn((on) => !on)}
            label={captionsOn ? "Hide captions" : "Show captions"}
          >
            {captionsOn ? <Captions className="h-5 w-5" /> : <CaptionsOff className="h-5 w-5" />}
          </ControlButton>
          <ControlButton onClick={onReplay} disabled={phase !== "question"} label="Repeat the question">
            <RotateCcw className="h-5 w-5" />
          </ControlButton>
        </div>

        <div className="flex flex-1 justify-end">
          <button
            type="button"
            onClick={onLeave}
            className="inline-flex h-11 items-center gap-2 rounded-full bg-rose-600 px-4 text-sm font-semibold text-white hover:bg-rose-500"
          >
            <PhoneOff className="h-4 w-4" /> <span className="hidden sm:inline">Leave</span>
          </button>
        </div>
      </div>
    </div>
  );
}
