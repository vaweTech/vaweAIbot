"use client";

import { use, useMemo } from "react";
import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { ScoreCard } from "@/components/interviews/ScoreCard";
import { LanguageAnalysisPanel } from "@/components/interviews/LanguageAnalysisPanel";
import { analyzeLanguage } from "@/lib/languageCheck";
import { TranscriptPanel } from "@/components/interviews/TranscriptPanel";
import { StatusBadge } from "@/components/common/StatusBadge";
import { ErrorState } from "@/components/common/LoadingState";
import { getInterviewById } from "@/data/interviews";
import { interviewResults } from "@/data/interviewResults";
import { formatDate } from "@/lib/utils";
import { ArrowLeft } from "lucide-react";

export default function InterviewResultPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const interview = getInterviewById(id);

  const result = useMemo(() => {
    const byInterview = interviewResults.find((r) => r.interviewId === id);
    if (byInterview) return byInterview;
    const byResultId = interviewResults.find((r) => r.id === id);
    return byResultId || interviewResults[0];
  }, [id]);

  const language = useMemo(
    () => analyzeLanguage(result?.transcript || ""),
    [result]
  );

  const mergedMistakes = useMemo(() => {
    if (!result) return [];
    const seen = new Set(result.grammarAnalysis.mistakes.map((m) => m.id));
    return [...result.grammarAnalysis.mistakes, ...language.mistakes.filter((m) => !seen.has(m.id))];
  }, [result, language]);

  if (!result) {
    return (
      <AppShell title="Interview Result">
        <ErrorState title="Result not found" />
      </AppShell>
    );
  }

  return (
    <AppShell
      title="AI Interview Assessment Report"
      subtitle={result.interviewName}
      actions={
        <Link
          href="/interviews"
          className="inline-flex items-center gap-2 rounded-xl border border-border px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Link>
      }
    >
      <div className="space-y-6 animate-fade-in">
        <div className="grid gap-4 rounded-2xl border border-border bg-gradient-to-br from-indigo-50 to-white p-6 sm:grid-cols-2 lg:grid-cols-3">
          <Meta label="Student" value={result.studentName} />
          <Meta label="Interview" value={result.interviewName} />
          <Meta label="Job Role" value={result.jobRole} />
          <Meta label="Date" value={formatDate(result.date)} />
          <Meta label="Duration" value={`${result.duration} min`} />
          <div>
            <p className="text-xs text-muted">Overall Score</p>
            <p className="mt-1 text-3xl font-bold text-indigo-600">{result.scores.overall}</p>
          </div>
        </div>

        <section>
          <h2 className="mb-4 text-base font-semibold text-slate-900">Performance Overview</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-8">
            <ScoreCard label="Technical Knowledge" score={result.scores.technicalKnowledge} />
            <ScoreCard label="Answer Relevance" score={result.scores.relevance} />
            <ScoreCard label="Communication" score={result.scores.communication} />
            <ScoreCard label="Grammar" score={result.scores.grammar} />
            <ScoreCard label="Pronouns" score={language.pronounsScore} />
            <ScoreCard label="Fluency" score={result.scores.fluency} />
            <ScoreCard label="Vocabulary" score={result.scores.vocabulary} />
            <ScoreCard label="Overall" score={result.scores.overall} />
          </div>
        </section>

        <div className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-2xl border border-border bg-white p-5 shadow-sm">
            <h3 className="mb-3 text-sm font-semibold text-emerald-700">Strengths</h3>
            <ul className="space-y-2">
              {result.strengths.map((s) => (
                <li key={s} className="flex gap-2 text-sm text-slate-700">
                  <span className="text-emerald-500">✓</span> {s}
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-2xl border border-border bg-white p-5 shadow-sm">
            <h3 className="mb-3 text-sm font-semibold text-amber-700">Improvement Areas</h3>
            <ul className="space-y-2">
              {result.improvementAreas.map((s) => (
                <li key={s} className="flex gap-2 text-sm text-slate-700">
                  <span className="text-amber-500">•</span> {s}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-white p-5 shadow-sm">
          <h3 className="mb-2 text-sm font-semibold text-slate-900">AI Summary</h3>
          <p className="text-sm leading-relaxed text-slate-600">{result.aiSummary}</p>
        </div>

        <section>
          <h2 className="mb-4 text-base font-semibold text-slate-900">Topic Coverage</h2>
          <div className="space-y-3 rounded-2xl border border-border bg-white p-5 shadow-sm">
            {result.topicCoverage.map((t) => (
              <div key={t.topic}>
                <div className="mb-1 flex justify-between text-sm">
                  <span className="font-medium text-slate-700">{t.topic}</span>
                  <span className="text-indigo-600">{t.coverage}% Covered</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-blue-500"
                    style={{ width: `${t.coverage}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </section>

        <LanguageAnalysisPanel
          analysis={{
            score: result.grammarAnalysis.score,
            pronounsScore: language.pronounsScore,
            totalSentences: result.grammarAnalysis.totalSentences,
            errors: result.grammarAnalysis.errors + language.pronounErrors,
            pronounErrors: language.pronounErrors,
            correctSentences: result.grammarAnalysis.correctSentences,
            mistakes: mergedMistakes,
          }}
        />

        <TranscriptPanel
          transcript={result.transcript}
          speakingDuration={result.speakingDuration}
          wordCount={result.wordCount}
          fillerWords={result.fillerWords}
        />

        {interview && (
          <p className="text-center text-xs text-muted">
            Interview status: <StatusBadge status={interview.status} />
          </p>
        )}
      </div>
    </AppShell>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-muted">{label}</p>
      <p className="mt-1 font-semibold text-slate-900">{value}</p>
    </div>
  );
}
