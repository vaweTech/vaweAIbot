"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { Search } from "@/components/common/Search";
import { Filters } from "@/components/common/Filters";
import { StatusBadge } from "@/components/common/StatusBadge";
import { EmptyState } from "@/components/common/EmptyState";
import { LoadingState } from "@/components/common/LoadingState";
import { SetupNotice, useAdminStatus } from "@/components/admin/SetupNotice";
import { adminFetch } from "@/lib/adminClient";
import { DIFFICULTIES } from "@/lib/utils";
import type { BankStatus, QuestionSummary } from "@/types/questionBank";
import { CheckCircle2, Pencil, Plus, Trash2, Upload, Undo2 } from "lucide-react";

const TYPE_LABELS: Record<string, string> = {
  technical: "Technical",
  hr: "HR",
  gd: "Group Discussion",
};

export default function AdminQuestionsPage() {
  const { status, refresh: refreshStatus } = useAdminStatus();
  const [questions, setQuestions] = useState<QuestionSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState({ type: "", difficulty: "", status: "" });

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await adminFetch<{ questions: QuestionSummary[] }>(
        "/api/admin/questions"
      );
      setQuestions(data.questions ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load questions");
      setQuestions([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return questions.filter(
      (q) =>
        (!term ||
          q.question.toLowerCase().includes(term) ||
          q.category.toLowerCase().includes(term) ||
          q.tags.some((t) => t.toLowerCase().includes(term))) &&
        (!filters.type || q.type === filters.type) &&
        (!filters.difficulty || q.difficulty === filters.difficulty) &&
        (!filters.status || q.status === filters.status)
    );
  }, [questions, search, filters]);

  const changeStatus = async (id: string, nextStatus: BankStatus) => {
    try {
      await adminFetch(`/api/admin/questions/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ status: nextStatus }),
      });
      setQuestions((prev) =>
        prev.map((q) => (q.id === id ? { ...q, status: nextStatus } : q))
      );
      void refreshStatus();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not update status");
    }
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this question and its answer key?")) return;
    try {
      await adminFetch(`/api/admin/questions/${id}`, { method: "DELETE" });
      setQuestions((prev) => prev.filter((q) => q.id !== id));
      void refreshStatus();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not delete question");
    }
  };

  return (
    <AppShell
      title="Question Bank (Firestore)"
      subtitle="Store questions, model answers and key points that the AI scores student answers against."
      actions={
        <div className="flex flex-wrap gap-2">
          <Link
            href="/admin/import"
            className="inline-flex items-center gap-2 rounded-xl border border-border px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            <Upload className="h-4 w-4" />
            Bulk import
          </Link>
          <Link
            href="/admin/questions/new"
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-3 py-2 text-sm font-medium text-white hover:bg-primary-dark"
          >
            <Plus className="h-4 w-4" />
            Add question
          </Link>
        </div>
      }
    >
      <div className="space-y-4 animate-fade-in">
        <SetupNotice status={status} />

        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <Search
            value={search}
            onChange={setSearch}
            placeholder="Search questions, categories, tags..."
            className="w-full lg:max-w-sm"
          />
          <Filters
            filters={[
              {
                key: "type",
                label: "Type",
                value: filters.type,
                options: [
                  { label: "Technical", value: "technical" },
                  { label: "HR", value: "hr" },
                  { label: "Group Discussion", value: "gd" },
                ],
              },
              {
                key: "difficulty",
                label: "Difficulty",
                value: filters.difficulty,
                options: DIFFICULTIES.map((d) => ({ label: d, value: d })),
              },
              {
                key: "status",
                label: "Status",
                value: filters.status,
                options: [
                  { label: "Draft", value: "draft" },
                  { label: "Approved", value: "approved" },
                  { label: "Archived", value: "archived" },
                ],
              },
            ]}
            onChange={(key, value) => setFilters((f) => ({ ...f, [key]: value }))}
          />
        </div>

        {error && (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
            {error}
          </div>
        )}

        {loading ? (
          <LoadingState message="Loading question bank..." />
        ) : filtered.length === 0 ? (
          <EmptyState
            title={questions.length === 0 ? "No questions stored yet" : "No matches"}
            description={
              questions.length === 0
                ? "Add your first question, or paste a batch through bulk import."
                : "Try clearing the search or filters."
            }
            action={
              questions.length === 0 ? (
                <Link
                  href="/admin/questions/new"
                  className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-dark"
                >
                  <Plus className="h-4 w-4" />
                  Add question
                </Link>
              ) : undefined
            }
          />
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-border bg-white shadow-sm">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-border bg-slate-50 text-xs uppercase tracking-wide text-muted">
                <tr>
                  <th className="px-4 py-3 font-semibold">Question</th>
                  <th className="px-4 py-3 font-semibold">Type</th>
                  <th className="px-4 py-3 font-semibold">Category</th>
                  <th className="px-4 py-3 font-semibold">Difficulty</th>
                  <th className="px-4 py-3 font-semibold">Key points</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map((q) => (
                  <tr key={q.id} className="hover:bg-slate-50/80">
                    <td className="max-w-sm px-4 py-3">
                      <p className="font-medium text-slate-900">{q.question}</p>
                      {q.tags.length > 0 && (
                        <div className="mt-1 flex flex-wrap gap-1">
                          {q.tags.slice(0, 4).map((t) => (
                            <span
                              key={t}
                              className="rounded-full bg-indigo-50 px-2 py-0.5 text-[11px] text-indigo-700"
                            >
                              {t}
                            </span>
                          ))}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {TYPE_LABELS[q.type] ?? q.type}
                    </td>
                    <td className="px-4 py-3 text-slate-600">{q.category}</td>
                    <td className="px-4 py-3">
                      <StatusBadge status={q.difficulty} />
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {q.keyPointCount}
                      {q.mustHaveCount > 0 && (
                        <span className="text-xs text-muted"> · {q.mustHaveCount} must-have</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={q.status} />
                      <span className="ml-1 text-[11px] text-muted">v{q.version}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-2">
                        <Link
                          href={`/admin/questions/${q.id}/edit`}
                          className="inline-flex items-center gap-1 rounded-lg border border-border px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
                        >
                          <Pencil className="h-3 w-3" />
                          Edit
                        </Link>
                        {q.status === "approved" ? (
                          <button
                            type="button"
                            onClick={() => void changeStatus(q.id, "draft")}
                            className="inline-flex items-center gap-1 rounded-lg border border-border px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
                          >
                            <Undo2 className="h-3 w-3" />
                            Unpublish
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => void changeStatus(q.id, "approved")}
                            className="inline-flex items-center gap-1 rounded-lg border border-emerald-200 px-2.5 py-1.5 text-xs font-medium text-emerald-700 hover:bg-emerald-50"
                          >
                            <CheckCircle2 className="h-3 w-3" />
                            Approve
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => void remove(q.id)}
                          className="inline-flex items-center gap-1 rounded-lg border border-rose-200 px-2.5 py-1.5 text-xs font-medium text-rose-600 hover:bg-rose-50"
                        >
                          <Trash2 className="h-3 w-3" />
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AppShell>
  );
}
