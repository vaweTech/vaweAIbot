"use client";

import { getScoreColor } from "@/lib/scoring";
import { cn } from "@/lib/utils";

interface ScoreCardProps {
  label: string;
  score: number;
  max?: number;
}

export function ScoreCard({ label, score, max = 100 }: ScoreCardProps) {
  const pct = Math.min(100, Math.round((score / max) * 100));
  const radius = 36;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (pct / 100) * circumference;

  return (
    <div className="flex flex-col items-center rounded-2xl border border-border bg-white p-4 shadow-sm">
      <div className="relative h-24 w-24">
        <svg className="h-full w-full -rotate-90" viewBox="0 0 88 88">
          <circle cx="44" cy="44" r={radius} fill="none" stroke="#e2e8f0" strokeWidth="8" />
          <circle
            cx="44"
            cy="44"
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            className={cn(getScoreColor(score))}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className={cn("text-xl font-bold", getScoreColor(score))}>{score}</span>
        </div>
      </div>
      <p className="mt-2 text-center text-xs font-medium text-slate-600">{label}</p>
    </div>
  );
}
