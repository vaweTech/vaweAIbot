"use client";

import { Mic, Square, Loader2, CheckCircle2, Clock } from "lucide-react";
import { AudioWaveform } from "@/components/interviews/AudioWaveform";
import type { VoiceState } from "@/components/interviews/VoiceRecorder";
import { cn } from "@/lib/utils";

interface SpeakingSessionProps {
  topic: string;
  duration: number;
  state: VoiceState;
  elapsed?: number;
  onStart: () => void;
  onStop: () => void;
  className?: string;
}

export function SpeakingSession({
  topic,
  duration,
  state,
  elapsed = 0,
  onStart,
  onStop,
  className,
}: SpeakingSessionProps) {
  const mins = Math.floor(elapsed / 60);
  const secs = elapsed % 60;
  const maxSeconds = duration * 60;

  return (
    <div
      className={cn(
        "rounded-2xl border border-border bg-gradient-to-br from-indigo-50/80 to-white p-6 shadow-sm",
        className
      )}
    >
      <div className="mb-6 text-center">
        <p className="text-xs font-medium uppercase tracking-wide text-indigo-500">
          Speaking Assessment
        </p>
        <h2 className="mt-1 text-lg font-semibold text-slate-900">{topic}</h2>
        <div className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1 text-xs text-muted shadow-sm">
          <Clock className="h-3 w-3" />
          {duration} min allotted
        </div>
      </div>

      <div className="flex flex-col items-center">
        <div className="relative mb-4">
          {(state === "Listening" || state === "Processing") && (
            <span className="absolute inset-0 rounded-full bg-indigo-400/30 animate-pulse-ring" />
          )}
          <div
            className={cn(
              "relative flex h-20 w-20 items-center justify-center rounded-full shadow-lg",
              state === "Listening"
                ? "bg-rose-500 text-white"
                : state === "Completed"
                ? "bg-emerald-500 text-white"
                : "bg-gradient-to-br from-indigo-500 to-blue-600 text-white"
            )}
          >
            {state === "Processing" || state === "Evaluating" ? (
              <Loader2 className="h-8 w-8 animate-spin" />
            ) : state === "Completed" ? (
              <CheckCircle2 className="h-8 w-8" />
            ) : (
              <Mic className="h-8 w-8" />
            )}
          </div>
        </div>

        <p className="text-sm font-semibold text-slate-800">
          {state === "Ready" && "Ready to speak"}
          {state === "Listening" && "Recording your response..."}
          {state === "Processing" && "Processing your response..."}
          {state === "Evaluating" && "Evaluating your speaking..."}
          {state === "Completed" && "Assessment Complete"}
        </p>

        {(state === "Listening" || state === "Ready") && (
          <p className="mt-1 font-mono text-lg text-indigo-600">
            {mins}:{secs.toString().padStart(2, "0")}
            <span className="text-sm text-muted"> / {duration}:00</span>
          </p>
        )}

        {state === "Listening" && maxSeconds > 0 && (
          <div className="mt-2 h-1.5 w-full max-w-xs overflow-hidden rounded-full bg-slate-200">
            <div
              className="h-full rounded-full bg-indigo-500 transition-all"
              style={{ width: `${Math.min(100, (elapsed / maxSeconds) * 100)}%` }}
            />
          </div>
        )}

        <AudioWaveform active={state === "Listening"} className="mt-4 w-full max-w-xs" />

        <div className="mt-5 flex gap-3">
          {state === "Ready" && (
            <button
              type="button"
              onClick={onStart}
              className="flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-primary-dark"
            >
              <Mic className="h-4 w-4" />
              Start Speaking
            </button>
          )}
          {state === "Listening" && (
            <button
              type="button"
              onClick={onStop}
              className="flex items-center gap-2 rounded-xl bg-rose-600 px-5 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-rose-700"
            >
              <Square className="h-4 w-4" />
              Stop Recording
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
