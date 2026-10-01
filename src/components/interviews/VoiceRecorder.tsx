"use client";

import { Mic, Square, Loader2, CheckCircle2 } from "lucide-react";
import { AudioWaveform } from "./AudioWaveform";
import { cn } from "@/lib/utils";

export type VoiceState = "Ready" | "Listening" | "Processing" | "Evaluating" | "Completed";

interface VoiceRecorderProps {
  state: VoiceState;
  elapsed?: number;
  onStart: () => void;
  onStop: () => void;
}

export function VoiceRecorder({ state, elapsed = 0, onStart, onStop }: VoiceRecorderProps) {
  const mins = Math.floor(elapsed / 60);
  const secs = elapsed % 60;

  return (
    <div className="rounded-2xl border border-border bg-gradient-to-br from-indigo-50/80 to-white p-6">
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
          {state === "Ready" && "Ready to answer"}
          {state === "Listening" && "Listening..."}
          {state === "Processing" && "Processing your response..."}
          {state === "Evaluating" && "Analyzing your answer..."}
          {state === "Completed" && "Answer Recorded"}
        </p>

        {(state === "Listening" || state === "Ready") && (
          <p className="mt-1 font-mono text-lg text-indigo-600">
            {mins}:{secs.toString().padStart(2, "0")}
          </p>
        )}

        <AudioWaveform active={state === "Listening"} className="mt-4 w-full max-w-xs" />

        <div className="mt-5 flex gap-3">
          {state === "Ready" && (
            <button
              onClick={onStart}
              className="flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-primary-dark"
            >
              <Mic className="h-4 w-4" />
              Start Answer
            </button>
          )}
          {state === "Listening" && (
            <button
              onClick={onStop}
              className="flex items-center gap-2 rounded-xl bg-rose-600 px-5 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-rose-700"
            >
              <Square className="h-4 w-4" />
              Stop Answer
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
