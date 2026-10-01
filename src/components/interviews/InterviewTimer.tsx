"use client";

import { Timer } from "lucide-react";
import { cn } from "@/lib/utils";

interface InterviewTimerProps {
  seconds: number;
  label?: string;
  mode?: "countdown" | "elapsed";
  className?: string;
}

function formatTimer(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

export function InterviewTimer({
  seconds,
  label = "Time Remaining",
  mode = "countdown",
  className,
}: InterviewTimerProps) {
  const isLow = mode === "countdown" && seconds <= 30 && seconds > 0;
  const isExpired = mode === "countdown" && seconds === 0;

  return (
    <div
      className={cn(
        "inline-flex flex-col items-center rounded-2xl border border-border bg-white px-5 py-3 shadow-sm",
        isLow && "border-rose-200 bg-rose-50/50",
        className
      )}
    >
      <div className="flex items-center gap-1.5 text-xs font-medium text-muted">
        <Timer className={cn("h-3.5 w-3.5", isLow ? "text-rose-500" : "text-indigo-600")} />
        {label}
      </div>
      <p
        className={cn(
          "mt-0.5 font-mono text-2xl font-bold tracking-tight",
          isExpired ? "text-rose-600" : isLow ? "text-rose-600" : "text-indigo-600"
        )}
      >
        {formatTimer(seconds)}
      </p>
    </div>
  );
}
