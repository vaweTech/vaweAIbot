"use client";

import { Square, Users } from "lucide-react";
import { StatusBadge } from "@/components/common/StatusBadge";
import { GDAnalytics } from "@/components/gd/GDAnalytics";
import { GDParticipantCard } from "@/components/gd/GDParticipantCard";
import { GDTranscript } from "@/components/gd/GDTranscript";
import { cn } from "@/lib/utils";
import type { GDAnalyticsParticipant } from "@/components/gd/GDAnalytics";
import type { GDStatus, GDTranscriptEntry } from "@/types/gd";

interface GDRoomParticipant {
  name: string;
  status: "speaking" | "listening";
  speakingTime: number | string;
  turns?: number;
  participation?: GDAnalyticsParticipant["participation"];
}

interface GDRoomProps {
  topic: string;
  participants: GDRoomParticipant[];
  transcript: GDTranscriptEntry[];
  status: GDStatus;
  onEnd?: () => void;
  className?: string;
}

export function GDRoom({
  topic,
  participants,
  transcript,
  status,
  onEnd,
  className,
}: GDRoomProps) {
  const analyticsParticipants: GDAnalyticsParticipant[] = participants.map((p) => ({
    name: p.name,
    speakingTime: typeof p.speakingTime === "number" ? p.speakingTime : 0,
    turns: p.turns ?? 0,
    participation: p.participation ?? "Medium",
  }));

  return (
    <div className={cn("space-y-6", className)}>
      <div className="flex flex-col gap-4 rounded-2xl border border-border bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-indigo-600" />
            <h2 className="text-lg font-semibold text-slate-900">{topic}</h2>
          </div>
          <p className="mt-1 text-sm text-muted">
            {participants.length} participants · Live group discussion
          </p>
        </div>
        <div className="flex items-center gap-3">
          <StatusBadge status={status} />
          {onEnd && status === "active" && (
            <button
              type="button"
              onClick={onEnd}
              className="flex items-center gap-2 rounded-xl bg-rose-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-rose-700"
            >
              <Square className="h-4 w-4" />
              End GD
            </button>
          )}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {participants.map((participant) => (
          <GDParticipantCard
            key={participant.name}
            name={participant.name}
            status={participant.status}
            speakingTime={participant.speakingTime}
            participation={participant.participation}
          />
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <GDTranscript entries={transcript} />
        <GDAnalytics participants={analyticsParticipants} />
      </div>
    </div>
  );
}
