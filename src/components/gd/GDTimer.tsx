"use client";

import { Timer } from "lucide-react";
import { cn } from "@/lib/utils";

interface GDTimerProps {
  seconds: number;
  label: string;
  mode?: "countdown" | "elapsed";
  className?: string;
}

function formatTimer(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

export function GDTimer({ seconds, label, mode = "countdown", className }: GDTimerProps) {
  const isLow = mode === "countdown" && seconds <= 60 && seconds > 0;

  return (
    <div
      className={cn(
        "flex flex-col items-center rounded-2xl border border-border bg-white px-6 py-5 shadow-sm",
        className
      )}
    >
      <div className="flex items-center gap-2 text-sm font-medium text-muted">
        <Timer className="h-4 w-4 text-indigo-600" />
        {label}
      </div>
      <p
        className={cn(
          "mt-2 font-mono text-4xl font-bold tracking-tight",
          isLow ? "text-rose-600" : "text-indigo-600"
        )}
      >
        {formatTimer(seconds)}
      </p>
    </div>
  );
}
