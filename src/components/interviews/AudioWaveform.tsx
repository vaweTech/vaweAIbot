"use client";

import { cn } from "@/lib/utils";

interface AudioWaveformProps {
  active?: boolean;
  bars?: number;
  className?: string;
}

export function AudioWaveform({ active = false, bars = 24, className }: AudioWaveformProps) {
  return (
    <div className={cn("flex h-16 items-center justify-center gap-1", className)}>
      {Array.from({ length: bars }).map((_, i) => (
        <div
          key={i}
          className={cn(
            "w-1 rounded-full bg-indigo-400",
            active ? "animate-waveform" : "h-2 opacity-40"
          )}
          style={{
            height: active ? undefined : "20%",
            animationDelay: active ? `${(i % 8) * 0.1}s` : undefined,
            minHeight: active ? "20%" : undefined,
            maxHeight: "100%",
          }}
        />
      ))}
    </div>
  );
}
