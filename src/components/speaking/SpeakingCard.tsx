"use client";

import { Clock, BarChart3, Play, Mic } from "lucide-react";
import { StatusBadge } from "@/components/common/StatusBadge";
import { cn } from "@/lib/utils";
import type { SpeakingTest } from "@/types/speaking";

interface SpeakingCardProps {
  test: SpeakingTest;
  onStart?: () => void;
  className?: string;
}

export function SpeakingCard({ test, onStart, className }: SpeakingCardProps) {
  return (
    <div
      className={cn(
        "flex flex-col rounded-2xl border border-border bg-white p-5 shadow-sm transition hover:shadow-md",
        className
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-1 gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-blue-600 text-white shadow-sm">
            <Mic className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <h3 className="text-base font-semibold text-slate-900">{test.topic}</h3>
            <p className="mt-0.5 text-sm text-muted">{test.category}</p>
          </div>
        </div>
        <StatusBadge status={test.difficulty} />
      </div>

      <div className="mt-4 grid grid-cols-3 gap-3">
        <div className="rounded-xl bg-indigo-50 px-3 py-2">
          <div className="flex items-center gap-1.5 text-[11px] text-indigo-500">
            <Clock className="h-3 w-3" />
            Duration
          </div>
          <p className="mt-0.5 text-sm font-semibold text-indigo-700">{test.duration} min</p>
        </div>
        <div className="rounded-xl bg-blue-50 px-3 py-2">
          <div className="flex items-center gap-1.5 text-[11px] text-blue-500">
            <BarChart3 className="h-3 w-3" />
            Attempts
          </div>
          <p className="mt-0.5 text-sm font-semibold text-blue-700">{test.attempts}</p>
        </div>
        <div className="rounded-xl bg-slate-50 px-3 py-2">
          <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
            <BarChart3 className="h-3 w-3" />
            Avg Score
          </div>
          <p className="mt-0.5 text-sm font-semibold text-slate-700">{test.averageScore}%</p>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between">
        <StatusBadge status={test.status} />
        {onStart && (
          <button
            type="button"
            onClick={onStart}
            className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-primary-dark"
          >
            <Play className="h-4 w-4" />
            Start Test
          </button>
        )}
      </div>
    </div>
  );
}
