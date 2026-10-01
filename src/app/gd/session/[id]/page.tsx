"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { GDRoom } from "@/components/gd/GDRoom";
import { GDTimer } from "@/components/gd/GDTimer";
import { Modal } from "@/components/common/Modal";
import { ErrorState, LoadingState } from "@/components/common/LoadingState";
import { getGDSessionById } from "@/data/gdSessions";
import type { GDParticipant, GDTranscriptEntry } from "@/types/gd";

export default function GDSessionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const session = getGDSessionById(id);

  const [loading, setLoading] = useState(true);
  const [participants, setParticipants] = useState<GDParticipant[]>([]);
  const [transcript, setTranscript] = useState<GDTranscriptEntry[]>([]);
  const [elapsed, setElapsed] = useState(0);
  const [showEndModal, setShowEndModal] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 400);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (!session) return;
    setParticipants(session.participants.map((p) => ({ ...p })));
    setTranscript([]);
    setElapsed(0);
  }, [session]);

  useEffect(() => {
    if (!session || loading) return;

    const speakerInterval = setInterval(() => {
      setParticipants((prev) => {
        const speakingIdx = prev.findIndex((p) => p.status === "speaking");
        const nextIdx = (speakingIdx + 1) % prev.length;
        return prev.map((p, i) => ({
          ...p,
          status: i === nextIdx ? "speaking" : "listening",
          speakingTime: i === nextIdx ? p.speakingTime + 5 : p.speakingTime,
          turns: i === nextIdx ? p.turns + 1 : p.turns,
        }));
      });
    }, 4000);

    const transcriptInterval = setInterval(() => {
      setTranscript((prev) => {
        if (prev.length >= session.transcript.length) return prev;
        return [...prev, session.transcript[prev.length]];
      });
    }, 3000);

    const timerInterval = setInterval(() => {
      setElapsed((e) => e + 1);
    }, 1000);

    return () => {
      clearInterval(speakerInterval);
      clearInterval(transcriptInterval);
      clearInterval(timerInterval);
    };
  }, [session, loading]);

  if (loading) {
    return (
      <AppShell title="GD Session">
        <LoadingState message="Joining group discussion room..." />
      </AppShell>
    );
  }

  if (!session) {
    return (
      <AppShell title="GD Session">
        <ErrorState
          title="Session not found"
          description="This group discussion session could not be loaded."
        />
      </AppShell>
    );
  }

  const roomParticipants = participants.map((p) => ({
    name: p.studentName,
    status: p.status,
    speakingTime: p.speakingTime,
    turns: p.turns,
    participation: p.participation,
  }));

  const handleEndConfirm = () => {
    setShowEndModal(false);
    router.push(`/gd/result/${id}`);
  };

  return (
    <AppShell title="Live Group Discussion" subtitle={session.topic}>
      <div className="animate-fade-in space-y-6">
        <GDTimer seconds={elapsed} label="Elapsed Time" mode="elapsed" />
        <GDRoom
          topic={session.topic}
          participants={roomParticipants}
          transcript={transcript}
          status={session.status === "completed" ? "completed" : "active"}
          onEnd={() => setShowEndModal(true)}
        />
      </div>

      <Modal
        open={showEndModal}
        onClose={() => setShowEndModal(false)}
        title="End Group Discussion?"
        size="sm"
        footer={
          <>
            <button
              type="button"
              onClick={() => setShowEndModal(false)}
              className="rounded-xl border border-border px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
            >
              Continue GD
            </button>
            <button
              type="button"
              onClick={handleEndConfirm}
              className="rounded-xl bg-rose-600 px-4 py-2 text-sm font-medium text-white hover:bg-rose-700"
            >
              End & View Results
            </button>
          </>
        }
      >
        <p className="text-sm text-slate-600">
          Are you sure you want to end this group discussion? AI will generate assessment
          reports for all participants.
        </p>
      </Modal>
    </AppShell>
  );
}
