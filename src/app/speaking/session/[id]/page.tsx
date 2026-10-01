"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { SpeakingSession } from "@/components/speaking/SpeakingSession";
import { TranscriptPanel } from "@/components/interviews/TranscriptPanel";
import { EvaluationCard } from "@/components/interviews/EvaluationCard";
import { ScoreCard } from "@/components/interviews/ScoreCard";
import { ErrorState, LoadingState } from "@/components/common/LoadingState";
import type { VoiceState } from "@/components/interviews/VoiceRecorder";
import { getSpeakingTestById } from "@/data/speakingTests";
import {
  simulateTranscript,
  simulateSpeakingEvaluation,
  runEvaluationSteps,
  type EvaluationStep,
} from "@/lib/mockAI";
import { Flag } from "lucide-react";

export default function SpeakingSessionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const test = getSpeakingTestById(id);

  const [loading, setLoading] = useState(true);
  const [voiceState, setVoiceState] = useState<VoiceState>("Ready");
  const [elapsed, setElapsed] = useState(0);
  const [transcript, setTranscript] = useState("");
  const [showTranscript, setShowTranscript] = useState(false);
  const [evalSteps, setEvalSteps] = useState<EvaluationStep[]>([]);
  const [evaluation, setEvaluation] = useState<Awaited<
    ReturnType<typeof simulateSpeakingEvaluation>
  > | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 400);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (voiceState !== "Listening") return;
    const interval = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(interval);
  }, [voiceState]);

  if (loading) {
    return (
      <AppShell title="Speaking Session">
        <LoadingState message="Preparing speaking assessment..." />
      </AppShell>
    );
  }

  if (!test) {
    return (
      <AppShell title="Speaking Session">
        <ErrorState
          title="Test not found"
          description="This speaking test could not be loaded."
        />
      </AppShell>
    );
  }

  const handleStart = () => {
    setVoiceState("Listening");
    setElapsed(0);
    setShowTranscript(false);
    setEvaluation(null);
    setEvalSteps([]);
  };

  const handleStop = async () => {
    setVoiceState("Processing");
    const text = await simulateTranscript(2);
    setTranscript(text);
    setShowTranscript(true);
    setVoiceState("Evaluating");
    await runEvaluationSteps(setEvalSteps);
    const result = await simulateSpeakingEvaluation();
    setEvaluation(result);
    setVoiceState("Completed");
  };

  const handleViewResults = () => {
    router.push(`/speaking/result/${id}`);
  };

  return (
    <AppShell title="Speaking Assessment" subtitle={test.topic}>
      <div className="mx-auto max-w-5xl space-y-6 animate-fade-in">
        <div className="grid gap-6 lg:grid-cols-5">
          <div className="space-y-4 lg:col-span-3">
            <SpeakingSession
              topic={test.topic}
              duration={test.duration}
              state={voiceState}
              elapsed={elapsed}
              onStart={handleStart}
              onStop={handleStop}
            />

            {showTranscript && (
              <TranscriptPanel
                transcript={transcript}
                speakingDuration={
                  evaluation?.speakingDuration ||
                  `${Math.floor(elapsed / 60)}m ${elapsed % 60}s`
                }
                wordCount={evaluation?.wordCount || transcript.split(/\s+/).length}
                fillerWords={evaluation?.fillerWords}
              />
            )}

            {voiceState === "Completed" && (
              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={handleViewResults}
                  className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-white hover:bg-primary-dark"
                >
                  <Flag className="h-4 w-4" />
                  View Full Results
                </button>
                <Link
                  href="/speaking"
                  className="rounded-xl border border-border px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  Back to Tests
                </Link>
              </div>
            )}
          </div>

          <div className="space-y-4 lg:col-span-2">
            <div className="rounded-2xl border border-border bg-white p-4 shadow-sm">
              <h3 className="mb-3 text-sm font-semibold text-slate-900">Test Info</h3>
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <dt className="text-muted">Category</dt>
                  <dd className="font-medium text-slate-800">{test.category}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted">Difficulty</dt>
                  <dd className="font-medium text-slate-800">{test.difficulty}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted">Duration</dt>
                  <dd className="font-medium text-slate-800">{test.duration} min</dd>
                </div>
              </dl>
              <div className="mt-3">
                <p className="text-xs text-muted">Evaluation Criteria</p>
                <div className="mt-1 flex flex-wrap gap-1">
                  {test.evaluationCriteria.map((c) => (
                    <span
                      key={c}
                      className="rounded-full bg-indigo-50 px-2 py-0.5 text-[11px] text-indigo-700"
                    >
                      {c}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {(voiceState === "Evaluating" || evalSteps.length > 0) && (
              <EvaluationCard steps={evalSteps} />
            )}

            {evaluation && (
              <div className="rounded-2xl border border-border bg-white p-4 shadow-sm">
                <h3 className="mb-3 text-sm font-semibold text-slate-900">Score Overview</h3>
                <div className="grid grid-cols-2 gap-3">
                  <ScoreCard label="Fluency" score={evaluation.scores.fluency} />
                  <ScoreCard label="Grammar" score={evaluation.scores.grammar} />
                  <ScoreCard label="Vocabulary" score={evaluation.scores.vocabulary} />
                  <ScoreCard label="Communication" score={evaluation.scores.communication} />
                  <ScoreCard label="Topic Relevance" score={evaluation.scores.topicRelevance} />
                  <ScoreCard label="Sentence Structure" score={evaluation.scores.sentenceStructure} />
                </div>
                <div className="mt-3 rounded-xl bg-indigo-50 py-3 text-center">
                  <p className="text-xs text-indigo-500">Overall</p>
                  <p className="text-2xl font-bold text-indigo-700">
                    {evaluation.scores.overall}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
