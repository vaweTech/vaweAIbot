"use client";

import { use, useMemo } from "react";
import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { ScoreCard } from "@/components/interviews/ScoreCard";
import { LanguageAnalysisPanel } from "@/components/interviews/LanguageAnalysisPanel";
import { TranscriptPanel } from "@/components/interviews/TranscriptPanel";
import { ErrorState } from "@/components/common/LoadingState";
import { getSpeakingTestById } from "@/data/speakingTests";
import { getSpeakingResultById, speakingResults } from "@/data/speakingResults";
import { formatDate } from "@/lib/utils";
import { analyzeLanguage } from "@/lib/languageCheck";
import { ArrowLeft } from "lucide-react";

export default function SpeakingResultPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const test = getSpeakingTestById(id);

  const result = useMemo(() => {
    const byTest = speakingResults.find((r) => r.testId === id);
    if (byTest) return byTest;
    const byResultId = getSpeakingResultById(id);
    if (byResultId) return byResultId;
    return speakingResults[0];
  }, [id]);

  const language = useMemo(
    () => analyzeLanguage(result?.transcript || ""),
    [result]
  );

  if (!result) {
    return (
      <AppShell title="Speaking Result">
        <ErrorState title="Result not found" />
      </AppShell>
    );
  }

  return (
    <AppShell
      title="Speaking Assessment Report"
      subtitle={result.topic}
      actions={
        <Link
          href="/speaking"
          className="inline-flex items-center gap-2 rounded-xl border border-border px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Link>
      }
    >
      <div className="space-y-6 animate-fade-in">
        <div className="grid gap-4 rounded-2xl border border-border bg-gradient-to-br from-indigo-50 to-white p-6 sm:grid-cols-2 lg:grid-cols-4">
          <Meta label="Student" value={result.studentName} />
          <Meta label="Topic" value={result.topic} />
          <Meta label="Date" value={formatDate(result.date)} />
          <div>
            <p className="text-xs text-muted">Overall Score</p>
            <p className="mt-1 text-3xl font-bold text-indigo-600">
              {result.scores.overall}
            </p>
          </div>
        </div>

        <section>
          <h2 className="mb-4 text-base font-semibold text-slate-900">
            Performance Overview
          </h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">
            <ScoreCard label="Fluency" score={result.scores.fluency} />
            <ScoreCard label="Grammar" score={result.scores.grammar} />
            <ScoreCard label="Pronouns" score={language.pronounsScore} />
            <ScoreCard label="Vocabulary" score={result.scores.vocabulary} />
            <ScoreCard label="Communication" score={result.scores.communication} />
            <ScoreCard label="Topic Relevance" score={result.scores.topicRelevance} />
            <ScoreCard label="Sentence Structure" score={result.scores.sentenceStructure} />
            <ScoreCard label="Overall" score={result.scores.overall} />
          </div>
        </section>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <Stat label="Speaking Duration" value={result.speakingDuration} />
          <Stat label="Word Count" value={result.wordCount} />
          <Stat label="Filler Words" value={result.fillerWords} />
        </div>

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

        <LanguageAnalysisPanel
          analysis={{
            score: result.scores.grammar,
            pronounsScore: language.pronounsScore,
            totalSentences: language.sentences,
            errors: language.grammarErrors + language.pronounErrors,
            pronounErrors: language.pronounErrors,
            correctSentences: Math.max(
              0,
              language.sentences - language.grammarErrors - language.pronounErrors
            ),
            mistakes: language.mistakes,
          }}
        />

        <TranscriptPanel
          transcript={result.transcript}
          speakingDuration={result.speakingDuration}
          wordCount={result.wordCount}
          fillerWords={result.fillerWords}
        />

        {test && (
          <p className="text-center text-xs text-muted">
            Test: {test.topic} · {test.category} · {test.difficulty}
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

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-border bg-white p-4 text-center shadow-sm">
      <p className="text-xs text-muted">{label}</p>
      <p className="mt-1 text-lg font-bold text-slate-900">{value}</p>
    </div>
  );
}
