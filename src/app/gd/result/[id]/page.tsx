"use client";

import { use, useMemo, useState } from "react";
import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { ScoreCard } from "@/components/interviews/ScoreCard";
import { LanguageAnalysisPanel } from "@/components/interviews/LanguageAnalysisPanel";
import { Modal } from "@/components/common/Modal";
import { StatusBadge } from "@/components/common/StatusBadge";
import { ErrorState } from "@/components/common/LoadingState";
import { getGDSessionById } from "@/data/gdSessions";
import { gdResults } from "@/data/gdResults";
import { formatDate } from "@/lib/utils";
import { analyzeLanguage } from "@/lib/languageCheck";
import type { GDResult } from "@/types/gd";
import { ArrowLeft, ChevronRight } from "lucide-react";

export default function GDResultPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const session = getGDSessionById(id);
  const [selected, setSelected] = useState<GDResult | null>(null);

  const results = useMemo(
    () => gdResults.filter((r) => r.sessionId === id),
    [id]
  );

  if (!session) {
    return (
      <AppShell title="GD Assessment Report">
        <ErrorState title="Session not found" description="Could not load GD results." />
      </AppShell>
    );
  }

  return (
    <AppShell
      title="GD Assessment Report"
      subtitle={session.topic}
      actions={
        <Link
          href="/gd"
          className="inline-flex items-center gap-2 rounded-xl border border-border px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Link>
      }
    >
      <div className="space-y-6 animate-fade-in">
        <div className="grid gap-4 rounded-2xl border border-border bg-gradient-to-br from-indigo-50 to-white p-6 sm:grid-cols-2 lg:grid-cols-4">
          <Meta label="Topic" value={session.topic} />
          <Meta label="Duration" value={`${session.duration} min`} />
          <Meta label="Participants" value={String(session.participants.length)} />
          <Meta label="Date" value={formatDate(session.date)} />
        </div>

        {results.length === 0 ? (
          <div className="rounded-2xl border border-border bg-white p-8 text-center shadow-sm">
            <p className="text-sm text-muted">
              No participant results available for this session yet.
            </p>
            <p className="mt-2 text-xs text-muted">
              Showing session participants from live data.
            </p>
            <div className="mt-4 overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="border-b border-border bg-slate-50 text-xs uppercase text-muted">
                  <tr>
                    <th className="px-4 py-3">Participant</th>
                    <th className="px-4 py-3">Speaking Time</th>
                    <th className="px-4 py-3">Turns</th>
                    <th className="px-4 py-3">Participation</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {session.participants.map((p) => (
                    <tr key={p.studentId}>
                      <td className="px-4 py-3 font-medium">{p.studentName}</td>
                      <td className="px-4 py-3">{p.speakingTime}s</td>
                      <td className="px-4 py-3">{p.turns}</td>
                      <td className="px-4 py-3">
                        <StatusBadge status={p.participation} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-border bg-white shadow-sm">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-border bg-slate-50 text-xs uppercase tracking-wide text-muted">
                <tr>
                  <th className="px-4 py-3 font-semibold">Participant</th>
                  <th className="px-4 py-3 font-semibold">Speaking Time</th>
                  <th className="px-4 py-3 font-semibold">Turns</th>
                  <th className="px-4 py-3 font-semibold">Participation</th>
                  <th className="px-4 py-3 font-semibold">Overall Score</th>
                  <th className="px-4 py-3 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {results.map((result) => (
                  <tr key={result.id} className="hover:bg-slate-50/80">
                    <td className="px-4 py-3 font-medium text-slate-900">
                      {result.studentName}
                    </td>
                    <td className="px-4 py-3 text-slate-600">{result.speakingTime}s</td>
                    <td className="px-4 py-3 text-slate-600">{result.turns}</td>
                    <td className="px-4 py-3">
                      <StatusBadge status={result.participation} />
                    </td>
                    <td className="px-4 py-3 font-semibold text-indigo-600">
                      {result.scores.overall}%
                    </td>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() => setSelected(result)}
                        className="inline-flex items-center gap-1 rounded-lg border border-border px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
                      >
                        View Analysis
                        <ChevronRight className="h-3 w-3" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="rounded-2xl border border-border bg-white p-5 shadow-sm">
          <h3 className="mb-2 text-sm font-semibold text-slate-900">Session Summary</h3>
          <p className="text-sm text-slate-600">
            Average session score:{" "}
            <span className="font-semibold text-indigo-600">{session.averageScore}%</span>
            {" · "}
            Status: <StatusBadge status={session.status} />
          </p>
        </div>
      </div>

      <Modal
        open={!!selected}
        onClose={() => setSelected(null)}
        title={selected ? `${selected.studentName} — Individual Analysis` : ""}
        size="xl"
      >
        {selected && <GDSelectedAnalysis selected={selected} />}
      </Modal>
    </AppShell>
  );
}

function GDSelectedAnalysis({ selected }: { selected: GDResult }) {
  const language = analyzeLanguage([...selected.keyContributions, selected.aiSummary].join(" "));
  const pronounsScore = selected.scores.pronouns ?? language.pronounsScore;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Metric label="Speaking Time" value={`${selected.speakingTime}s`} />
        <Metric label="Turns" value={selected.turns} />
        <Metric label="Relevant Contributions" value={selected.relevantContributions} />
        <Metric label="Filler Words" value={selected.fillerWords} />
        <Metric label="Interruptions" value={selected.interruptions} />
        <Metric label="Participation" value={selected.participation} />
      </div>

      <div>
        <h4 className="mb-3 text-sm font-semibold text-slate-900">Scores</h4>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <ScoreCard label="Communication" score={selected.scores.communication} />
          <ScoreCard label="Grammar" score={selected.scores.grammar} />
          <ScoreCard label="Pronouns" score={pronounsScore} />
          <ScoreCard label="Fluency" score={selected.scores.fluency} />
          <ScoreCard label="Relevance" score={selected.scores.relevance} />
          <ScoreCard label="Topic Understanding" score={selected.scores.topicUnderstanding} />
          <ScoreCard label="Team Interaction" score={selected.scores.teamInteraction} />
          <ScoreCard label="Overall" score={selected.scores.overall} />
        </div>
      </div>

      <LanguageAnalysisPanel
        analysis={{
          score: selected.scores.grammar,
          pronounsScore,
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

      <div className="rounded-xl bg-indigo-50 p-4">
        <h4 className="text-sm font-semibold text-indigo-900">AI Summary</h4>
        <p className="mt-2 text-sm leading-relaxed text-indigo-800">{selected.aiSummary}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <h4 className="mb-2 text-sm font-semibold text-emerald-700">Strengths</h4>
          <ul className="space-y-1">
            {selected.strengths.map((s) => (
              <li key={s} className="text-sm text-slate-700">
                ✓ {s}
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h4 className="mb-2 text-sm font-semibold text-amber-700">Improvement Areas</h4>
          <ul className="space-y-1">
            {selected.improvementAreas.map((s) => (
              <li key={s} className="text-sm text-slate-700">
                • {s}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div>
        <h4 className="mb-2 text-sm font-semibold text-slate-900">Key Contributions</h4>
        <ul className="space-y-1">
          {selected.keyContributions.map((c) => (
            <li key={c} className="text-sm text-slate-600">
              → {c}
            </li>
          ))}
        </ul>
      </div>
    </div>
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

function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-border bg-slate-50 p-3 text-center">
      <p className="text-xs text-muted">{label}</p>
      <p className="mt-1 font-semibold text-slate-900">{value}</p>
    </div>
  );
}
