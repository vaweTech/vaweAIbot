"use client";

import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { EmptyState } from "@/components/common/EmptyState";
import { LoadingState } from "@/components/common/LoadingState";
import { SetupNotice, useAdminStatus } from "@/components/admin/SetupNotice";
import { adminFetch } from "@/lib/adminClient";
import { formatDate } from "@/lib/utils";
import type { InterviewResult, InterviewResultSummary } from "@/types/interviewResult";
import { Download, Loader2, Search, Trash2 } from "lucide-react";

function scoreClass(score: number | null): string {
  if (score === null) return "text-slate-400";
  if (score >= 75) return "text-emerald-600";
  if (score >= 55) return "text-amber-600";
  return "text-rose-600";
}

function Score({ value }: { value: number | null }) {
  return <span className={`font-semibold ${scoreClass(value)}`}>{value ?? "–"}</span>;
}

export default function AdminResultsPage() {
  const { status } = useAdminStatus();
  const [results, setResults] = useState<InterviewResultSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [downloading, setDownloading] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    adminFetch<{ results: InterviewResultSummary[] }>("/api/admin/results")
      .then((data) => {
        if (active) setResults(data.results ?? []);
      })
      .catch((e) => {
        if (active) setError(e instanceof Error ? e.message : "Could not load results");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return results;
    return results.filter(
      (r) => r.candidateName.toLowerCase().includes(q) || r.testTitle.toLowerCase().includes(q)
    );
  }, [results, query]);

  const download = async (id: string) => {
    setDownloading(id);
    setError("");
    try {
      const { result } = await adminFetch<{ result: InterviewResult }>(`/api/admin/results/${id}`);
      const { downloadReportPdf } = await import("@/lib/reportPdf");
      await downloadReportPdf(result, result.summary, result.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not download the report");
    } finally {
      setDownloading(null);
    }
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this result permanently?")) return;
    try {
      await adminFetch(`/api/admin/results/${id}`, { method: "DELETE" });
      setResults((prev) => prev.filter((r) => r.id !== id));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not delete the result");
    }
  };

  const scored = results.map((r) => r.summary.overall).filter((v): v is number => v !== null);
  const average = scored.length ? Math.round(scored.reduce((a, b) => a + b, 0) / scored.length) : null;

  return (
    <AppShell
      title="Interview Results"
      subtitle="Every finished interview is saved to Firebase. Download any student's report as a PDF."
    >
      <div className="space-y-4 animate-fade-in">
        <SetupNotice status={status} />

        {error && (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
            {error}
          </div>
        )}

        {!loading && results.length > 0 && (
          <div className="flex flex-wrap items-end gap-3">
            <div className="grid grid-cols-3 gap-3 sm:w-md">
              {[
                { label: "Results", value: results.length },
                { label: "Students", value: new Set(results.map((r) => r.candidateName.toLowerCase())).size },
                { label: "Avg. overall", value: average ?? "–" },
              ].map((s) => (
                <div key={s.label} className="rounded-2xl border border-border bg-white px-4 py-3 shadow-sm">
                  <p className="text-xs text-muted">{s.label}</p>
                  <p className="text-xl font-bold text-slate-900">{s.value}</p>
                </div>
              ))}
            </div>
            <label className="relative ml-auto w-full sm:w-72">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search student or test"
                className="w-full rounded-xl border border-border bg-white py-2 pl-9 pr-3 text-sm outline-none focus:border-primary"
              />
            </label>
          </div>
        )}

        {loading ? (
          <LoadingState message="Loading results..." />
        ) : results.length === 0 ? (
          <EmptyState
            title="No results yet"
            description="Results appear here automatically when a student finishes an interview."
          />
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-border bg-white shadow-sm">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-border bg-slate-50 text-xs text-muted">
                <tr>
                  <th className="px-4 py-3 font-medium">Student</th>
                  <th className="px-4 py-3 font-medium">Test</th>
                  <th className="px-4 py-3 font-medium">Date</th>
                  <th className="px-4 py-3 text-center font-medium">Answered</th>
                  <th className="px-4 py-3 text-center font-medium">Overall</th>
                  <th className="px-4 py-3 text-center font-medium">Technical</th>
                  <th className="px-4 py-3 text-center font-medium">Answer quality</th>
                  <th className="px-4 py-3 text-center font-medium">English</th>
                  <th className="px-4 py-3 text-center font-medium">Repeats</th>
                  <th className="px-4 py-3 text-center font-medium">Looked away</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50/60">
                    <td className="px-4 py-3 font-medium text-slate-900">{r.candidateName}</td>
                    <td className="px-4 py-3 text-slate-600">{r.testTitle}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-slate-500">{formatDate(r.createdAt)}</td>
                    <td className="px-4 py-3 text-center text-slate-600">
                      {r.summary.answered}/{r.questionCount}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <Score value={r.summary.overall} />
                    </td>
                    <td className="px-4 py-3 text-center">
                      <Score value={r.summary.knowledge} />
                    </td>
                    <td className="px-4 py-3 text-center">
                      <Score value={r.summary.answerQuality} />
                    </td>
                    <td className="px-4 py-3 text-center">
                      <Score value={r.summary.english} />
                    </td>
                    <td className="px-4 py-3 text-center text-slate-600">{r.summary.repeats ?? "–"}</td>
                    <td className="px-4 py-3 text-center text-slate-600">{r.lookAwayCount}×</td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => void download(r.id)}
                          disabled={downloading === r.id}
                          className="inline-flex items-center gap-1 rounded-lg border border-indigo-200 px-2.5 py-1.5 text-xs font-medium text-indigo-700 hover:bg-indigo-50 disabled:opacity-60"
                        >
                          {downloading === r.id ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <Download className="h-3 w-3" />
                          )}
                          PDF
                        </button>
                        <button
                          type="button"
                          onClick={() => void remove(r.id)}
                          aria-label="Delete result"
                          className="inline-flex items-center rounded-lg border border-rose-200 px-2.5 py-1.5 text-xs text-rose-600 hover:bg-rose-50"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={11} className="px-4 py-6 text-center text-sm text-muted">
                      No results match &ldquo;{query}&rdquo;.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AppShell>
  );
}
