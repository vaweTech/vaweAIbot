"use client";

import { Mic } from "lucide-react";
import { StatusBadge } from "@/components/common/StatusBadge";
import { cn, formatDuration, getInitials } from "@/lib/utils";
import type { ParticipationLevel } from "@/types/gd";

interface GDParticipantCardProps {
  name: string;
  status: "speaking" | "listening";
  speakingTime: number | string;
  participation?: ParticipationLevel;
  className?: string;
}

function formatSpeakingTime(value: number | string): string {
  return typeof value === "number" ? formatDuration(value) : value;
}

export function GDParticipantCard({
  name,
  status,
  speakingTime,
  participation,
  className,
}: GDParticipantCardProps) {
  const isSpeaking = status === "speaking";

  return (
    <div
      className={cn(
        "rounded-2xl border border-border bg-white p-4 shadow-sm transition",
        isSpeaking && "border-indigo-300 ring-2 ring-indigo-100",
        className
      )}
    >
      <div className="flex items-center gap-3">
        <div className="relative shrink-0">
          {isSpeaking && (
            <span className="absolute inset-0 rounded-full bg-indigo-400/30 animate-pulse-ring" />
          )}
          <div
            className={cn(
              "relative flex h-11 w-11 items-center justify-center rounded-full text-sm font-semibold",
              isSpeaking
                ? "bg-gradient-to-br from-indigo-500 to-blue-600 text-white"
                : "bg-slate-100 text-slate-600"
            )}
          >
            {getInitials(name)}
          </div>
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="truncate text-sm font-semibold text-slate-900">{name}</p>
            {isSpeaking && (
              <span className="flex items-center gap-1 rounded-full bg-rose-50 px-2 py-0.5 text-[10px] font-medium text-rose-600">
                <Mic className="h-3 w-3 animate-pulse" />
                Speaking
              </span>
            )}
          </div>
          <p className="mt-0.5 text-xs text-muted">
            {formatSpeakingTime(speakingTime)} speaking
          </p>
        </div>

        {participation && (
          <StatusBadge status={participation} className="shrink-0" />
        )}
      </div>
    </div>
  );
}
