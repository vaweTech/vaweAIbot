"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { StatCard } from "@/components/dashboard/StatCard";
import { SpeakingCard } from "@/components/speaking/SpeakingCard";
import { Search } from "@/components/common/Search";
import { Filters } from "@/components/common/Filters";
import { StatusBadge } from "@/components/common/StatusBadge";
import { EmptyState } from "@/components/common/EmptyState";
import { speakingTests } from "@/data/speakingTests";
import { speakingResults } from "@/data/speakingResults";
import { DIFFICULTIES } from "@/lib/utils";
import {
  Plus,
  Mic,
  CheckCircle2,
  BarChart3,
  Users,
  LayoutGrid,
  List,
  Play,
  Eye,
} from "lucide-react";

export default function SpeakingPage() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [view, setView] = useState<"table" | "cards">("table");
  const [filters, setFilters] = useState({ category: "", difficulty: "", status: "" });

  const categories = useMemo(
    () => [...new Set(speakingTests.map((t) => t.category))].sort(),
    []
  );

  const kpis = useMemo(() => {
    const completed = speakingResults.filter((r) => r.status === "completed").length;
    const avgScore = Math.round(
      speakingTests.reduce((sum, t) => sum + t.averageScore, 0) / speakingTests.length
    );
    const totalAttempts = speakingTests.reduce((sum, t) => sum + t.attempts, 0);
    return {
      totalTests: speakingTests.length,
      totalAttempts,
      completedResults: completed,
      averageScore: avgScore,
    };
  }, []);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return speakingTests.filter((test) => {
      const matchesSearch =
        !q ||
        test.topic.toLowerCase().includes(q) ||
        test.category.toLowerCase().includes(q);
      return (
        matchesSearch &&
        (!filters.category || test.category === filters.category) &&
        (!filters.difficulty || test.difficulty === filters.difficulty) &&
        (!filters.status || test.status === filters.status)
      );
    });
  }, [search, filters]);

  return (
    <AppShell
      title="Speaking Assessments"
      subtitle="Create and manage AI-powered speaking evaluation tests."
      actions={
        <Link
          href="/speaking/create"
          className="flex items-center gap-2 rounded-xl bg-primary px-3 py-2 text-sm font-medium text-white hover:bg-primary-dark"
        >
          <Plus className="h-4 w-4" />
          Create Test
        </Link>
      }
    >
      <div className="space-y-6 animate-fade-in">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Total Tests"
            value={kpis.totalTests}
            icon={Mic}
            accent="from-indigo-500 to-blue-600"
          />
          <StatCard
            title="Total Attempts"
            value={kpis.totalAttempts}
            icon={Users}
            accent="from-emerald-500 to-teal-600"
          />
          <StatCard
            title="Completed Results"
            value={kpis.completedResults}
            icon={CheckCircle2}
            accent="from-violet-500 to-purple-600"
          />
          <StatCard
            title="Average Score"
            value={`${kpis.averageScore}%`}
            icon={BarChart3}
            accent="from-amber-500 to-orange-600"
          />
        </div>

        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <Search
            value={search}
            onChange={setSearch}
            placeholder="Search speaking tests..."
            className="w-full lg:max-w-sm"
          />
          <div className="flex flex-wrap items-center gap-3">
            <Filters
              filters={[
                {
                  key: "category",
                  label: "Category",
                  value: filters.category,
                  options: categories.map((c) => ({ label: c, value: c })),
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
                  options: ["active", "completed", "draft"].map((s) => ({
                    label: s,
                    value: s,
                  })),
                },
              ]}
              onChange={(key, value) => setFilters((f) => ({ ...f, [key]: value }))}
            />
            <div className="flex rounded-xl border border-border bg-white p-1">
              <button
                type="button"
                onClick={() => setView("table")}
                className={`rounded-lg p-2 ${view === "table" ? "bg-primary-light text-primary" : "text-slate-500"}`}
                aria-label="Table view"
              >
                <List className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => setView("cards")}
                className={`rounded-lg p-2 ${view === "cards" ? "bg-primary-light text-primary" : "text-slate-500"}`}
                aria-label="Card view"
              >
                <LayoutGrid className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        {filtered.length === 0 ? (
          <EmptyState title="No speaking tests found" />
        ) : view === "cards" ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((test) => (
              <SpeakingCard
                key={test.id}
                test={test}
                onStart={() => router.push(`/speaking/session/${test.id}`)}
              />
            ))}
          </div>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-border bg-white shadow-sm">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-border bg-slate-50 text-xs uppercase tracking-wide text-muted">
                <tr>
                  <th className="px-4 py-3 font-semibold">Topic</th>
                  <th className="px-4 py-3 font-semibold">Category</th>
                  <th className="px-4 py-3 font-semibold">Duration</th>
                  <th className="px-4 py-3 font-semibold">Difficulty</th>
                  <th className="px-4 py-3 font-semibold">Attempts</th>
                  <th className="px-4 py-3 font-semibold">Avg Score</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map((test) => (
                  <tr key={test.id} className="hover:bg-slate-50/80">
                    <td className="max-w-xs px-4 py-3 font-medium text-slate-900">
                      {test.topic}
                    </td>
                    <td className="px-4 py-3 text-slate-600">{test.category}</td>
                    <td className="px-4 py-3 text-slate-600">{test.duration} min</td>
                    <td className="px-4 py-3">
                      <StatusBadge status={test.difficulty} />
                    </td>
                    <td className="px-4 py-3 text-slate-600">{test.attempts}</td>
                    <td className="px-4 py-3 font-semibold text-indigo-600">
                      {test.averageScore}%
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={test.status} />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <Link
                          href={`/speaking/session/${test.id}`}
                          className="inline-flex items-center gap-1 rounded-lg bg-primary px-2.5 py-1.5 text-xs font-medium text-white hover:bg-primary-dark"
                        >
                          <Play className="h-3 w-3" />
                          Start
                        </Link>
                        <Link
                          href={`/speaking/result/${test.id}`}
                          className="inline-flex items-center gap-1 rounded-lg border border-border px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
                        >
                          <Eye className="h-3 w-3" />
                          Result
                        </Link>
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
