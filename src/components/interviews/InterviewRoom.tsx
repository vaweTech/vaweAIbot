"use client";

import { useEffect, useRef, useState } from "react";
import {
  AlertTriangle,
  Captions,
  CaptionsOff,
  Eye,
  LayoutGrid,
  Mic,
  MicOff,
  RotateCcw,
  ScanFace,
  ShieldCheck,
  Signal,
  Users,
  Video,
  VideoOff,
  X,
} from "lucide-react";
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

/** A meeting-app toolbar button: icon above a short label. */
function ToolbarButton({
  onClick,
  disabled,
  label,
  title,
  pressed,
  highlight,
  hideOnMobile,
  children,
}: {
  onClick: () => void;
  disabled?: boolean;
  label: string;
  title?: string;
  pressed?: boolean;
  hideOnMobile?: boolean;
  /** Draws attention to the button, e.g. "Unmute" when it is the student's turn. */
  highlight?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title ?? label}
      aria-label={title ?? label}
      aria-pressed={pressed}
      className={cn(
        hideOnMobile ? "hidden sm:flex" : "flex",
        "min-w-[3.1rem] flex-col items-center gap-1 rounded-lg px-1 py-1.5 text-[10px] font-medium text-zinc-200 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent sm:min-w-[4.5rem] sm:px-2 sm:text-[11px]",
        highlight && "bg-white/10 ring-1 ring-[#0e72ed]"
      )}
    >
      <span className="flex h-6 items-center justify-center">{children}</span>
      <span className="whitespace-nowrap">{label}</span>
    </button>
  );
}

/** Name plate in the bottom-left corner of a video tile. */
function NamePlate({ name, muted, speaking }: { name: string; muted: boolean; speaking?: boolean }) {
  return (
    <span className="inline-flex max-w-full items-center gap-1 rounded bg-black/65 px-1.5 py-0.5 text-[11px] font-medium text-white sm:text-xs">
      {muted ? (
        <MicOff className="h-3 w-3 shrink-0 text-[#e02828]" />
      ) : speaking ? (
        <SpeakingBars active />
      ) : (
        <Mic className="h-3 w-3 shrink-0" />
      )}
      <span className="truncate">{name}</span>
    </span>
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
  onLookAwayCount,
  candidateName,
}: {
  /** Shown on the student's own tile, like a meeting display name. */
  candidateName?: string;
  /** Reports the running count of look-away warnings, e.g. to save with the result. */
  onLookAwayCount?: (count: number) => void;
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
  const [showParticipants, setShowParticipants] = useState(false);
  const [cameraOn, setCameraOn] = useState(false);
  const [cameraError, setCameraError] = useState("");
  const [sessionSeconds, setSessionSeconds] = useState(0);
  const streamRef = useRef<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const face = useFaceMonitor(videoRef, cameraOn);
  const faceWarning = cameraOn && !NEUTRAL_FACE_STATUSES.includes(face.status);
  const lookingAway = face.status === "looking-away";

  useEffect(() => {
    if (face.lookAwayCount > 0) onLookAwayCount?.(face.lookAwayCount);
  }, [face.lookAwayCount, onLookAwayCount]);

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
    <div className="overflow-hidden rounded-xl bg-[#1a1a1a] shadow-2xl shadow-black/30 ring-1 ring-black/40">
      <div className="flex items-center justify-between gap-3 bg-[#1a1a1a] px-3 py-2 text-xs text-zinc-300">
        <div className="flex min-w-0 items-center gap-2">
          <ShieldCheck className="h-4 w-4 shrink-0 text-[#23d959]" aria-label="Secure session" />
          <span className="truncate font-medium text-zinc-100">{persona.name.split(" ")[0]}&apos;s interview room</span>
          <span className="hidden text-zinc-500 sm:inline">·</span>
          <span className="hidden text-zinc-400 sm:inline">
            Question {questionNumber} of {totalQuestions}
          </span>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {face.lookAwayCount > 0 && (
            <span
              className="inline-flex items-center gap-1 rounded bg-amber-500/15 px-1.5 py-0.5 font-medium text-amber-300"
              title="Times you looked away from the screen"
            >
              <Eye className="h-3 w-3" /> {face.lookAwayCount}×
            </span>
          )}
          <span className="inline-flex items-center gap-1 text-zinc-400" title="Connection">
            <Signal className="h-3.5 w-3.5 text-[#23d959]" />
          </span>
          <span className="tabular-nums text-zinc-300">{formatClock(sessionSeconds)}</span>
          <span className="hidden items-center gap-1 rounded bg-white/5 px-2 py-0.5 text-zinc-300 sm:inline-flex">
            <LayoutGrid className="h-3.5 w-3.5" /> Speaker View
          </span>
        </div>
      </div>
      <p className="bg-[#1a1a1a] px-3 pb-1 text-[11px] text-zinc-400 sm:hidden">
        Question {questionNumber} of {totalQuestions}
      </p>

      <div className="bg-black p-1.5 sm:p-2">
      <div
        className={cn(
          "relative aspect-[4/3] w-full overflow-hidden rounded-md sm:aspect-video",
          interviewerSpeaking ? "ring-[3px] ring-[#23d959]" : "ring-1 ring-white/5"
        )}
      >
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
        <div className="absolute bottom-2 left-2 z-10 max-w-[60%]">
          <NamePlate name={persona.name} muted={false} speaking={interviewerSpeaking} />
        </div>

        {listening && (
          <span className="absolute left-2 top-2 z-10 inline-flex items-center gap-1.5 rounded bg-black/65 px-2 py-1 text-[11px] font-medium text-white sm:text-xs">
            <span className="h-2 w-2 animate-pulse rounded-full bg-[#e02828]" />
            Recording {formatClock(elapsed)}
          </span>
        )}

        {captionsOn && (showStudentCaption || question) && (
          <div className="absolute inset-x-3 bottom-9 z-10 flex justify-center sm:inset-x-[16%] sm:bottom-11">
            <p className="max-w-2xl rounded bg-black/80 px-3 py-1.5 text-center text-sm leading-relaxed text-white sm:text-base">
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
            "absolute right-2 top-2 z-10 aspect-video w-28 overflow-hidden rounded-md bg-[#242424] shadow-xl ring-2 transition sm:w-40 lg:w-44",
            faceWarning
              ? lookingAway
                ? "ring-[3px] ring-amber-400"
                : "ring-[3px] ring-[#e02828]"
              : listening
                ? "ring-[3px] ring-[#23d959]"
                : "ring-black/60"
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
            <div className="flex h-full w-full items-center justify-center bg-[#242424]">
              <span className="truncate px-2 text-base font-semibold text-white sm:text-xl">
                {candidateName?.trim() || "You"}
              </span>
            </div>
          )}
          <div className="absolute bottom-1 left-1 max-w-[70%]">
            <NamePlate
              name={candidateName?.trim() ? `${candidateName.trim()} (You)` : "You"}
              muted={!listening}
              speaking={listening}
            />
          </div>
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
                    stroke="#0e72ed"
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
                  className="inline-flex items-center gap-1.5 rounded-lg bg-[#0e72ed] px-4 py-2 text-sm font-semibold hover:bg-[#0b5cbf]"
                >
                  <Mic className="h-4 w-4" /> Answer now
                </button>
                <button
                  type="button"
                  onClick={onCancelPrep}
                  className="rounded-lg bg-white/10 px-4 py-2 text-sm font-medium text-zinc-200 hover:bg-white/20"
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

        {showParticipants && (
          <div className="absolute bottom-2 right-2 z-30 w-60 rounded-lg bg-[#242424] p-3 text-sm text-zinc-200 shadow-2xl ring-1 ring-white/10 animate-fade-in">
            <div className="flex items-center justify-between">
              <p className="font-semibold text-white">Participants (2)</p>
              <button
                type="button"
                onClick={() => setShowParticipants(false)}
                className="rounded p-0.5 text-zinc-400 hover:bg-white/10 hover:text-white"
                aria-label="Close participants"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <ul className="mt-2 space-y-2">
              <li className="flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded bg-[#0e72ed] text-[11px] font-semibold text-white">
                  {persona.name.split(" ").map((w) => w[0]).join("")}
                </span>
                <span className="min-w-0 flex-1 truncate">
                  {persona.name} <span className="text-zinc-400">(Host)</span>
                </span>
                {interviewerSpeaking ? <SpeakingBars active /> : <Mic className="h-3.5 w-3.5 text-zinc-400" />}
              </li>
              <li className="flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded bg-zinc-600 text-[11px] font-semibold text-white">
                  {(candidateName?.trim() || "You").slice(0, 2).toUpperCase()}
                </span>
                <span className="min-w-0 flex-1 truncate">
                  {candidateName?.trim() || "You"} <span className="text-zinc-400">(Me)</span>
                </span>
                {cameraOn ? <Video className="h-3.5 w-3.5 text-zinc-400" /> : <VideoOff className="h-3.5 w-3.5 text-[#e02828]" />}
                {listening ? <Mic className="h-3.5 w-3.5 text-[#23d959]" /> : <MicOff className="h-3.5 w-3.5 text-[#e02828]" />}
              </li>
            </ul>
          </div>
        )}
      </div>
      </div>

      <div className="bg-[#1a1a1a] px-3 pt-1.5 text-center">
        <p className="truncate text-xs text-zinc-400">
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
          ) : listening && elapsed < 3 ? (
            "You're unmuted — answer out loud, then press Mute when you finish"
          ) : listening && elapsed < IDEAL_MIN_SECONDS ? (
            "Keep going — aim for at least 30 seconds"
          ) : listening && elapsed > IDEAL_MAX_SECONDS ? (
            "Good length — start wrapping up"
          ) : phase === "question" ? (
            "Your turn — press Unmute and answer out loud"
          ) : listening ? (
            "Listening… press Mute when you finish"
          ) : (
            "Check the transcript below, then submit"
          )}
        </p>
      </div>

      <div className="flex items-center justify-between gap-1 bg-[#1a1a1a] px-2 py-1.5 sm:px-3">
        <div className="flex items-center gap-0.5 sm:gap-1">
          {listening ? (
            <ToolbarButton onClick={onStopAnswer} label="Mute" title="Stop answering">
              <Mic className="h-5 w-5 text-[#23d959]" />
            </ToolbarButton>
          ) : (
            <ToolbarButton
              onClick={onStartAnswer}
              disabled={phase !== "question"}
              label="Unmute"
              title="Unmute and answer"
              highlight={phase === "question" && !interviewerSpeaking}
            >
              <MicOff className="h-5 w-5 text-[#e02828]" />
            </ToolbarButton>
          )}
          <ToolbarButton onClick={toggleCamera} label={cameraOn ? "Stop Video" : "Start Video"} pressed={cameraOn}>
            {cameraOn ? <Video className="h-5 w-5" /> : <VideoOff className="h-5 w-5 text-[#e02828]" />}
          </ToolbarButton>
        </div>

        <div className="flex items-center gap-0.5 sm:gap-1">
          <ToolbarButton
            onClick={() => setShowParticipants((open) => !open)}
            label="Participants"
            pressed={showParticipants}
            hideOnMobile
          >
            <span className="relative">
              <Users className="h-5 w-5" />
              <span className="absolute -right-2.5 -top-1 rounded bg-zinc-600 px-1 text-[9px] font-semibold leading-tight">
                2
              </span>
            </span>
          </ToolbarButton>
          <ToolbarButton
            onClick={() => setCaptionsOn((on) => !on)}
            label="Captions"
            title={captionsOn ? "Hide captions" : "Show captions"}
            pressed={captionsOn}
          >
            {captionsOn ? <Captions className="h-5 w-5" /> : <CaptionsOff className="h-5 w-5 text-zinc-400" />}
          </ToolbarButton>
          <ToolbarButton onClick={onReplay} disabled={phase !== "question"} label="Repeat" title="Repeat the question">
            <RotateCcw className="h-5 w-5" />
          </ToolbarButton>
        </div>

        <button
          type="button"
          onClick={onLeave}
          className="rounded-lg bg-[#e02828] px-3 py-2 text-sm font-semibold text-white hover:bg-[#c41f1f] sm:px-4"
        >
          Leave
        </button>
      </div>
    </div>
  );
}
