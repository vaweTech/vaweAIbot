"use client";

import { use, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { VoiceRecorder, type VoiceState } from "@/components/interviews/VoiceRecorder";
import { TranscriptPanel } from "@/components/interviews/TranscriptPanel";
import { EvaluationCard } from "@/components/interviews/EvaluationCard";
import { ScoreCard } from "@/components/interviews/ScoreCard";
import { GrammarErrorCard } from "@/components/interviews/GrammarErrorCard";
import { InterviewTimer } from "@/components/interviews/InterviewTimer";
import { ErrorState, LoadingState } from "@/components/common/LoadingState";
import { getInterviewById } from "@/data/interviews";
import { interviewQuestions } from "@/data/interviewQuestions";
import {
  simulateTranscript,
  simulateInterviewEvaluation,
  runEvaluationSteps,
  type EvaluationStep,
} from "@/lib/mockAI";
import { Bot, RotateCcw, ChevronRight, Flag } from "lucide-react";

export default function InterviewSessionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const interview = getInterviewById(id);

  const questions = useMemo(() => {
    if (!interview) return [];
    const selected = interview.questionIds
      .map((qid) => interviewQuestions.find((q) => q.id === qid))
      .filter(Boolean);
    if (selected.length > 0) return selected;
    return interviewQuestions.slice(0, interview.questionCount || 5);
  }, [interview]);

  const [loading, setLoading] = useState(true);
  const [qIndex, setQIndex] = useState(0);
  const [voiceState, setVoiceState] = useState<VoiceState>("Ready");
  const [elapsed, setElapsed] = useState(0);
  const [transcript, setTranscript] = useState("");
  const [showTranscript, setShowTranscript] = useState(false);
  const [evalSteps, setEvalSteps] = useState<EvaluationStep[]>([]);
  const [evaluation, setEvaluation] = useState<Awaited<
    ReturnType<typeof simulateInterviewEvaluation>
  > | null>(null);
  const [answered, setAnswered] = useState(0);

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
      <AppShell title="AI Interview">
        <LoadingState message="Preparing interview session..." />
      </AppShell>
    );
  }

  if (!interview || questions.length === 0) {
    return (
      <AppShell title="AI Interview">
        <ErrorState title="Interview not found" description="This interview session could not be loaded." />
      </AppShell>
    );
  }

  const currentQ = questions[qIndex]!;
  const progress = ((qIndex + (evaluation ? 1 : 0)) / questions.length) * 100;

  const handleStart = () => {
    setVoiceState("Listening");
    setElapsed(0);
    setShowTranscript(false);
    setEvaluation(null);
    setEvalSteps([]);
  };

  const handleStop = async () => {
    setVoiceState("Processing");
    const text = await simulateTranscript(qIndex);
    setTranscript(text);
    setShowTranscript(true);
    setVoiceState("Evaluating");
    await runEvaluationSteps(setEvalSteps);
    const result = await simulateInterviewEvaluation(interview.weights);
    setEvaluation(result);
    setVoiceState("Completed");
    setAnswered((a) => a + 1);
  };

  const handleNext = () => {
    if (qIndex >= questions.length - 1) {
      router.push(`/interviews/result/${id}`);
      return;
    }
    setQIndex((i) => i + 1);
    setVoiceState("Ready");
    setElapsed(0);
    setTranscript("");
    setShowTranscript(false);
    setEvaluation(null);
    setEvalSteps([]);
  };

  return (
    <AppShell
      title={interview.name}
      subtitle={`Question ${qIndex + 1} of ${questions.length}`}
      actions={<InterviewTimer seconds={interview.duration * 60} mode="countdown" />}
    >
      <div className="mx-auto max-w-5xl space-y-6 animate-fade-in">
        <div>
          <div className="mb-2 flex justify-between text-xs text-muted">
            <span>Progress</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-blue-500 transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-5">
          <div className="space-y-4 lg:col-span-3">
            <div className="rounded-2xl border border-border bg-white p-6 shadow-sm">
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-blue-600 text-white shadow">
                  <Bot className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-900">AI Interviewer</p>
                  <p className="text-xs text-muted">{interview.jobRole}</p>
                </div>
              </div>
              <p className="text-lg font-medium leading-relaxed text-slate-800">
                {currentQ.question}
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  Replay Question
                </button>
              </div>
            </div>

            <VoiceRecorder
              state={voiceState}
              elapsed={elapsed}
              onStart={handleStart}
              onStop={handleStop}
            />

            {showTranscript && (
              <TranscriptPanel
                transcript={transcript}
                speakingDuration={evaluation?.speakingDuration || `${Math.floor(elapsed / 60)}m ${elapsed % 60}s`}
                wordCount={evaluation?.wordCount || transcript.split(/\s+/).length}
                fillerWords={evaluation?.fillerWords}
              />
            )}

            {voiceState === "Completed" && (
              <div className="flex flex-wrap gap-3">
                <button
                  onClick={() => setShowTranscript(true)}
                  className="rounded-xl border border-border px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  Review Answer
                </button>
                <button
                  onClick={handleNext}
                  className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-white hover:bg-primary-dark"
                >
                  {qIndex >= questions.length - 1 ? (
                    <>
                      <Flag className="h-4 w-4" />
                      Complete Interview
                    </>
                  ) : (
                    <>
                      Next Question
                      <ChevronRight className="h-4 w-4" />
                    </>
                  )}
                </button>
              </div>
            )}
          </div>

          <div className="space-y-4 lg:col-span-2">
            {(voiceState === "Evaluating" || evalSteps.length > 0) && (
              <EvaluationCard steps={evalSteps} />
            )}

            {evaluation && (
              <>
                <div className="rounded-2xl border border-border bg-white p-4 shadow-sm">
                  <h3 className="mb-3 text-sm font-semibold text-slate-900">Score Overview</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <ScoreCard label="Technical" score={evaluation.scores.technicalKnowledge} />
                    <ScoreCard label="Relevance" score={evaluation.scores.relevance} />
                    <ScoreCard label="Communication" score={evaluation.scores.communication} />
                    <ScoreCard label="Grammar" score={evaluation.scores.grammar} />
                    <ScoreCard label="Pronouns" score={evaluation.grammarAnalysis.pronounsScore ?? evaluation.scores.grammar} />
                    <ScoreCard label="Fluency" score={evaluation.scores.fluency} />
                    <ScoreCard label="Vocabulary" score={evaluation.scores.vocabulary} />
                  </div>
                  <div className="mt-3 rounded-xl bg-indigo-50 py-3 text-center">
                    <p className="text-xs text-indigo-500">Overall</p>
                    <p className="text-2xl font-bold text-indigo-700">
                      {evaluation.scores.overall}
                    </p>
                  </div>
                </div>

                <div className="rounded-2xl border border-border bg-white p-4 shadow-sm">
                  <h3 className="mb-3 text-sm font-semibold text-slate-900">Grammar Analysis</h3>
                  <div className="mb-3 grid grid-cols-2 gap-2 text-center text-xs">
                    <div className="rounded-lg bg-slate-50 p-2">
                      <p className="text-muted">Score</p>
                      <p className="font-semibold">{evaluation.grammarAnalysis.score}/100</p>
                    </div>
                    <div className="rounded-lg bg-slate-50 p-2">
                      <p className="text-muted">Errors</p>
                      <p className="font-semibold">{evaluation.grammarAnalysis.errors}</p>
                    </div>
                  </div>
                  <div className="space-y-3">
                    {evaluation.grammarAnalysis.mistakes.slice(0, 2).map((m) => (
                      <GrammarErrorCard key={m.id} error={m} />
                    ))}
                  </div>
                </div>
              </>
            )}

            <div className="rounded-2xl border border-dashed border-border bg-slate-50 p-4 text-center text-xs text-muted">
              Answered {answered} of {questions.length} questions
              <div className="mt-2">
                <Link href={`/interviews/result/${id}`} className="text-primary hover:underline">
                  Skip to results →
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
