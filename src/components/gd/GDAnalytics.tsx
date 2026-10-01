"use client";

import { Activity, Clock, MessageCircle, Users } from "lucide-react";
import { StatusBadge } from "@/components/common/StatusBadge";
import { cn, formatDuration } from "@/lib/utils";
import type { ParticipationLevel } from "@/types/gd";

export interface GDAnalyticsParticipant {
  name: string;
  speakingTime: number;
  turns: number;
  participation: ParticipationLevel;
}

interface GDAnalyticsProps {
  participants: GDAnalyticsParticipant[];
  className?: string;
}

export function GDAnalytics({ participants, className }: GDAnalyticsProps) {
  const totalSpeakingTime = participants.reduce((sum, p) => sum + p.speakingTime, 0);
  const totalTurns = participants.reduce((sum, p) => sum + p.turns, 0);
  const avgSpeakingTime =
    participants.length > 0 ? Math.round(totalSpeakingTime / participants.length) : 0;

  return (
    <div className={cn("space-y-4", className)}>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-2xl border border-border bg-white p-4 shadow-sm">
          <div className="flex items-center gap-2 text-[11px] text-indigo-500">
            <Users className="h-3.5 w-3.5" />
            Participants
          </div>
          <p className="mt-1 text-xl font-bold text-slate-900">{participants.length}</p>
        </div>
        <div className="rounded-2xl border border-border bg-white p-4 shadow-sm">
          <div className="flex items-center gap-2 text-[11px] text-blue-500">
            <Clock className="h-3.5 w-3.5" />
            Avg Speaking
          </div>
          <p className="mt-1 text-xl font-bold text-slate-900">{formatDuration(avgSpeakingTime)}</p>
        </div>
        <div className="rounded-2xl border border-border bg-white p-4 shadow-sm">
          <div className="flex items-center gap-2 text-[11px] text-emerald-500">
            <MessageCircle className="h-3.5 w-3.5" />
            Total Turns
          </div>
          <p className="mt-1 text-xl font-bold text-slate-900">{totalTurns}</p>
        </div>
        <div className="rounded-2xl border border-border bg-white p-4 shadow-sm">
          <div className="flex items-center gap-2 text-[11px] text-amber-500">
            <Activity className="h-3.5 w-3.5" />
            Total Time
          </div>
          <p className="mt-1 text-xl font-bold text-slate-900">{formatDuration(totalSpeakingTime)}</p>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-white shadow-sm">
        <div className="border-b border-border px-5 py-3">
          <h3 className="text-sm font-semibold text-slate-900">Participant Breakdown</h3>
        </div>
        <div className="divide-y divide-border">
          {participants.map((participant) => (
            <div
              key={participant.name}
              className="flex items-center justify-between gap-4 px-5 py-3"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-slate-900">{participant.name}</p>
                <p className="text-xs text-muted">
                  {formatDuration(participant.speakingTime)} · {participant.turns} turns
                </p>
              </div>
              <StatusBadge status={participant.participation} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
