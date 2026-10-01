"use client";

import { Clock, BarChart3, Users, Play } from "lucide-react";
import { StatusBadge } from "@/components/common/StatusBadge";
import { cn } from "@/lib/utils";
import type { GDTopic } from "@/types/gd";

interface GDTopicCardProps {
  topic: GDTopic;
  onStart?: () => void;
  className?: string;
}

export function GDTopicCard({ topic, onStart, className }: GDTopicCardProps) {
  return (
    <div
      className={cn(
        "flex flex-col rounded-2xl border border-border bg-white p-5 shadow-sm transition hover:shadow-md",
        className
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h3 className="text-base font-semibold text-slate-900">{topic.topic}</h3>
          <p className="mt-1 text-sm text-muted">{topic.category}</p>
        </div>
        <StatusBadge status={topic.difficulty} />
      </div>

      <div className="mt-4 grid grid-cols-3 gap-3">
        <div className="rounded-xl bg-indigo-50 px-3 py-2">
          <div className="flex items-center gap-1.5 text-[11px] text-indigo-500">
            <Clock className="h-3 w-3" />
            Duration
          </div>
          <p className="mt-0.5 text-sm font-semibold text-indigo-700">{topic.duration} min</p>
        </div>
        <div className="rounded-xl bg-blue-50 px-3 py-2">
          <div className="flex items-center gap-1.5 text-[11px] text-blue-500">
            <Users className="h-3 w-3" />
            Times Used
          </div>
          <p className="mt-0.5 text-sm font-semibold text-blue-700">{topic.timesUsed}</p>
        </div>
        <div className="rounded-xl bg-slate-50 px-3 py-2">
          <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
            <BarChart3 className="h-3 w-3" />
            Avg Score
          </div>
          <p className="mt-0.5 text-sm font-semibold text-slate-700">{topic.averageScore}%</p>
        </div>
      </div>

      {onStart && (
        <button
          type="button"
          onClick={onStart}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-primary-dark"
        >
          <Play className="h-4 w-4" />
          Start GD
        </button>
      )}
    </div>
  );
}
