"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { SetupNotice, useAdminStatus } from "@/components/admin/SetupNotice";
import { adminFetch } from "@/lib/adminClient";
import { SAMPLE_CSV, SAMPLE_JSON, parseImportText } from "@/lib/questionImport";
import { validateQuestionDraft, type BulkImportRow } from "@/types/questionBank";
import { ArrowLeft, CheckCircle2, FileJson, FileSpreadsheet, Upload, XCircle } from "lucide-react";

export default function BulkImportPage() {
  const { status, refresh } = useAdminStatus();
  const [text, setText] = useState("");
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState("");
  const [rows, setRows] = useState<BulkImportRow[] | null>(null);
  const [allowDuplicate, setAllowDuplicate] = useState(false);

  const parsed = useMemo(() => (text.trim() ? parseImportText(text) : null), [text]);

  const rowProblems = useMemo(() => {
    if (!parsed) return [];
    return parsed.drafts
      .map((draft, index) => ({ index, problems: validateQuestionDraft(draft) }))
      .filter((r) => r.problems.length > 0);
  }, [parsed]);

  const notReady = Boolean(status && (!status.firebase || !status.embeddings));
  const canImport =
    !!parsed && parsed.drafts.length > 0 && parsed.problems.length === 0 && !notReady;

  const runImport = async () => {
    if (!parsed) return;
    setImporting(true);
    setError("");
    setRows(null);

    try {
      const result = await adminFetch<{ rows: BulkImportRow[] }>(
        "/api/admin/questions/bulk",
        {
          method: "POST",
          body: JSON.stringify({ drafts: parsed.drafts, allowDuplicate }),
        }
      );
      setRows(result.rows ?? []);
      void refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Import failed");
    } finally {
      setImporting(false);
    }
  };

  const succeeded = rows?.filter((r) => r.ok).length ?? 0;
  const failed = rows?.filter((r) => !r.ok).length ?? 0;

  return (
    <AppShell
      title="Bulk Import Questions"
      subtitle="Paste JSON or CSV to load many questions with their answer keys at once."
      actions={
        <Link
          href="/admin/questions"
          className="inline-flex items-center gap-2 rounded-xl border border-border px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Link>
      }
    >
      <div className="mx-auto max-w-4xl space-y-4 animate-fade-in">
        <SetupNotice status={status} />

        <div className="rounded-2xl border border-border bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-sm font-semibold text-slate-900">Paste your data</h2>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setText(SAMPLE_JSON)}
                className="inline-flex items-center gap-1.5 rounded-xl border border-border px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
              >
                <FileJson className="h-3.5 w-3.5" />
                Load JSON sample
              </button>
              <button
                type="button"
                onClick={() => setText(SAMPLE_CSV)}
                className="inline-flex items-center gap-1.5 rounded-xl border border-border px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
              >
                <FileSpreadsheet className="h-3.5 w-3.5" />
                Load CSV sample
              </button>
            </div>
          </div>

          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={16}
            spellCheck={false}
            placeholder="Paste a JSON array, or CSV with a header row..."
            className="mt-3 w-full rounded-xl border border-border bg-slate-50/50 p-3 font-mono text-xs leading-relaxed text-slate-800 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
          />

          <div className="mt-3 rounded-xl bg-slate-50 p-3 text-xs text-slate-600">
            <p className="font-semibold text-slate-700">CSV format</p>
            <p className="mt-1">
              Columns: <code>type, question, category, role, difficulty, tags, modelAnswer,
              keyPoints, followUpQuestion</code>
            </p>
            <p className="mt-1">
              Inside <code>keyPoints</code>, separate points with <code>||</code> and fields
              with <code>|</code> in this order:{" "}
              <code>text | weight | mustHave | synonyms;separated;by;semicolons</code>
            </p>
          </div>
        </div>

        {parsed && (
          <div className="rounded-2xl border border-border bg-white p-5 shadow-sm">
            <h2 className="text-sm font-semibold text-slate-900">Preview</h2>
            <p className="mt-1 text-sm text-slate-600">
              Detected <strong>{parsed.format.toUpperCase()}</strong> with{" "}
              <strong>{parsed.drafts.length}</strong> question
              {parsed.drafts.length === 1 ? "" : "s"}.
            </p>

            {parsed.problems.length > 0 && (
              <ul className="mt-3 space-y-1 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">
                {parsed.problems.map((p) => (
                  <li key={p}>• {p}</li>
                ))}
              </ul>
            )}

            {rowProblems.length > 0 && (
              <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                <p className="font-semibold">
                  {rowProblems.length} row{rowProblems.length === 1 ? "" : "s"} will be
                  rejected
                </p>
                <ul className="mt-2 space-y-1 text-xs">
                  {rowProblems.slice(0, 6).map((r) => (
                    <li key={r.index}>
                      Row {r.index + 1}: {r.problems.join("; ")}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {parsed.drafts.length > 0 && (
              <ul className="mt-3 divide-y divide-border rounded-xl border border-border">
                {parsed.drafts.slice(0, 8).map((draft, index) => (
                  <li key={index} className="px-3 py-2 text-sm">
                    <p className="font-medium text-slate-800">
                      {draft.question || <span className="text-rose-600">(no question)</span>}
                    </p>
                    <p className="mt-0.5 text-xs text-muted">
                      {draft.type} · {draft.category} · {draft.difficulty} ·{" "}
                      {draft.keyPoints.length} key point
                      {draft.keyPoints.length === 1 ? "" : "s"}
                    </p>
                  </li>
                ))}
                {parsed.drafts.length > 8 && (
                  <li className="px-3 py-2 text-xs text-muted">
                    …and {parsed.drafts.length - 8} more
                  </li>
                )}
              </ul>
            )}

            <label className="mt-4 flex items-center gap-2 text-sm text-slate-600">
              <input
                type="checkbox"
                checked={allowDuplicate}
                onChange={(e) => setAllowDuplicate(e.target.checked)}
                className="h-4 w-4 rounded border-border"
              />
              Import even if a near-identical question already exists
            </label>

            <button
              type="button"
              onClick={() => void runImport()}
              disabled={!canImport || importing}
              className="mt-4 inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary-dark disabled:opacity-50"
            >
              <Upload className="h-4 w-4" />
              {importing
                ? "Importing and embedding…"
                : `Import ${parsed.drafts.length} question${
                    parsed.drafts.length === 1 ? "" : "s"
                  }`}
            </button>
          </div>
        )}

        {error && (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
            {error}
          </div>
        )}

        {rows && (
          <div className="rounded-2xl border border-border bg-white p-5 shadow-sm">
            <h2 className="text-sm font-semibold text-slate-900">Import result</h2>
            <p className="mt-1 text-sm text-slate-600">
              <span className="font-semibold text-emerald-700">{succeeded} saved</span>
              {failed > 0 && (
                <>
                  {" · "}
                  <span className="font-semibold text-rose-700">{failed} failed</span>
                </>
              )}
            </p>
            <ul className="mt-3 divide-y divide-border rounded-xl border border-border">
              {rows.map((row) => (
                <li key={row.index} className="flex items-start gap-2 px-3 py-2 text-sm">
                  {row.ok ? (
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                  ) : (
                    <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-500" />
                  )}
                  <div className="min-w-0">
                    <p className="truncate text-slate-800">{row.question}</p>
                    {row.error && <p className="text-xs text-rose-600">{row.error}</p>}
                  </div>
                </li>
              ))}
            </ul>
            <Link
              href="/admin/questions"
              className="mt-4 inline-block rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-dark"
            >
              View question bank
            </Link>
          </div>
        )}
      </div>
    </AppShell>
  );
}
