"use client";

import type { GrammarError } from "@/types/interview";
import { GrammarErrorCard } from "@/components/interviews/GrammarErrorCard";
import { ScoreCard } from "@/components/interviews/ScoreCard";

export type LanguageAnalysisView = {
  score: number;
  pronounsScore: number;
  totalSentences: number;
  errors: number;
  pronounErrors: number;
  correctSentences: number;
  mistakes: GrammarError[];
};

interface LanguageAnalysisPanelProps {
  analysis: LanguageAnalysisView;
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3 text-center">
      <p className="text-[11px] uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-lg font-bold text-slate-900">{value}</p>
    </div>
  );
}

export function LanguageAnalysisPanel({ analysis }: LanguageAnalysisPanelProps) {
  const grammarMistakes = analysis.mistakes.filter((m) => m.category !== "Pronouns");
  const pronounMistakes = analysis.mistakes.filter((m) => m.category === "Pronouns");

  return (
    <div className="space-y-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div>
        <h3 className="text-sm font-semibold text-slate-900">Grammar & Pronouns</h3>
        <p className="mt-1 text-xs text-slate-500">
          Scores are based on issues found in your spoken transcript.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <ScoreCard label="Grammar" score={analysis.score} />
        <ScoreCard label="Pronouns" score={analysis.pronounsScore} />
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Sentences" value={analysis.totalSentences} />
        <Stat label="Grammar issues" value={analysis.errors - analysis.pronounErrors} />
        <Stat label="Pronoun issues" value={analysis.pronounErrors} />
        <Stat label="Clear sentences" value={analysis.correctSentences} />
      </div>

      {pronounMistakes.length > 0 && (
        <div>
          <h4 className="mb-3 text-xs font-semibold uppercase tracking-wide text-violet-700">
            Pronoun corrections
          </h4>
          <div className="grid gap-3 md:grid-cols-2">
            {pronounMistakes.map((error) => (
              <GrammarErrorCard key={error.id} error={error} />
            ))}
          </div>
        </div>
      )}

      {grammarMistakes.length > 0 && (
        <div>
          <h4 className="mb-3 text-xs font-semibold uppercase tracking-wide text-indigo-700">
            Grammar corrections
          </h4>
          <div className="grid gap-3 md:grid-cols-2">
            {grammarMistakes.map((error) => (
              <GrammarErrorCard key={error.id} error={error} />
            ))}
          </div>
        </div>
      )}

      {analysis.mistakes.length === 0 && (
        <p className="rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          No grammar or pronoun issues detected in this transcript.
        </p>
      )}
    </div>
  );
}
