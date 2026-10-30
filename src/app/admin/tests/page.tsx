"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { EmptyState } from "@/components/common/EmptyState";
import { LoadingState } from "@/components/common/LoadingState";
import { StatusBadge } from "@/components/common/StatusBadge";
import { SetupNotice, useAdminStatus } from "@/components/admin/SetupNotice";
import { adminFetch } from "@/lib/adminClient";
import { formatDate } from "@/lib/utils";
import { TEST_TYPE_LABELS, type TestStatus, type TestSummary } from "@/types/interviewTest";
import { ClipboardList, Eye, Pencil, Plus, Rocket, Trash2, Undo2 } from "lucide-react";

export default function AdminTestsPage() {
  const { status } = useAdminStatus();
  const [tests, setTests] = useState<TestSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    adminFetch<{ tests: TestSummary[] }>("/api/admin/tests")
      .then((data) => {
        if (active) setTests(data.tests ?? []);
      })
      .catch((e) => {
        if (active) setError(e instanceof Error ? e.message : "Could not load tests");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const changeStatus = async (id: string, next: TestStatus) => {
    try {
      await adminFetch(`/api/admin/tests/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ status: next }),
      });
      setTests((prev) => prev.map((t) => (t.id === id ? { ...t, status: next } : t)));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not update the test");
    }
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this test? The questions stay in the question bank.")) return;
    try {
      await adminFetch(`/api/admin/tests/${id}`, { method: "DELETE" });
      setTests((prev) => prev.filter((t) => t.id !== id));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not delete the test");
    }
  };

  const published = tests.filter((t) => t.status === "published").length;

  return (
    <AppShell
      title="Interview Tests"
      subtitle="Build tests from the question bank. Published tests show up in the student interview panel."
      actions={
        <Link
          href="/admin/tests/new"
          className="inline-flex items-center gap-2 rounded-xl bg-primary px-3 py-2 text-sm font-medium text-white hover:bg-primary-dark"
        >
          <Plus className="h-4 w-4" />
          Create test
        </Link>
      }
    >
      <div className="space-y-4 animate-fade-in">
        <SetupNotice status={status} />

        {error && (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
            {error}
          </div>
        )}

        {!loading && tests.length > 0 && (
          <div className="grid grid-cols-3 gap-3 sm:max-w-md">
            {[
              { label: "Tests", value: tests.length },
              { label: "Published", value: published },
              { label: "Drafts", value: tests.length - published },
            ].map((s) => (
              <div key={s.label} className="rounded-2xl border border-border bg-white px-4 py-3 shadow-sm">
                <p className="text-xs text-muted">{s.label}</p>
                <p className="text-xl font-bold text-slate-900">{s.value}</p>
              </div>
            ))}
          </div>
        )}

        {loading ? (
          <LoadingState message="Loading tests..." />
        ) : tests.length === 0 ? (
          <EmptyState
            title="No tests yet"
            description="Create a test by choosing a question type and picking questions from the database."
            action={
              <Link
                href="/admin/tests/new"
                className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-dark"
              >
                <Plus className="h-4 w-4" />
                Create test
              </Link>
            }
          />
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {tests.map((t) => (
              <div
                key={t.id}
                className="flex flex-col rounded-2xl border border-border bg-white p-5 shadow-sm transition hover:shadow-md"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <ClipboardList className="h-5 w-5" />
                  </div>
                  <StatusBadge status={t.status} />
                </div>
                <h3 className="mt-3 font-semibold text-slate-900">{t.title}</h3>
                {t.description && (
                  <p className="mt-1 line-clamp-2 text-sm text-slate-500">{t.description}</p>
                )}
                <div className="mt-3 flex flex-wrap gap-1.5 text-[11px]">
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 font-medium text-slate-600">
                    {TEST_TYPE_LABELS[t.questionType]}
                  </span>
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 font-medium text-slate-600">
                    {t.questionCount} questions
                  </span>
                  {Object.entries(t.difficultyCounts).map(([d, n]) => (
                    <span key={d} className="rounded-full bg-slate-50 px-2 py-0.5 text-slate-500">
                      {n} {d.toLowerCase()}
                    </span>
                  ))}
                </div>
                <p className="mt-3 text-[11px] text-muted">Updated {formatDate(t.updatedAt)}</p>

                <div className="mt-4 flex flex-wrap gap-2 border-t border-border pt-4">
                  <Link
                    href={`/admin/tests/${t.id}/edit`}
                    className="inline-flex items-center gap-1 rounded-lg border border-border px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
                  >
                    <Pencil className="h-3 w-3" />
                    Edit
                  </Link>
                  <Link
                    href={`/prototype/interview?test=${t.id}`}
                    className="inline-flex items-center gap-1 rounded-lg border border-indigo-200 px-2.5 py-1.5 text-xs font-medium text-indigo-700 hover:bg-indigo-50"
                  >
                    <Eye className="h-3 w-3" />
                    Try it
                  </Link>
                  {t.status === "published" ? (
                    <button
                      type="button"
                      onClick={() => void changeStatus(t.id, "draft")}
                      className="inline-flex items-center gap-1 rounded-lg border border-border px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
                    >
                      <Undo2 className="h-3 w-3" />
                      Unpublish
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => void changeStatus(t.id, "published")}
                      className="inline-flex items-center gap-1 rounded-lg border border-emerald-200 px-2.5 py-1.5 text-xs font-medium text-emerald-700 hover:bg-emerald-50"
                    >
                      <Rocket className="h-3 w-3" />
                      Publish
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => void remove(t.id)}
                    className="ml-auto inline-flex items-center gap-1 rounded-lg border border-rose-200 px-2.5 py-1.5 text-xs font-medium text-rose-600 hover:bg-rose-50"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
