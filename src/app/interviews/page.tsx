"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { Search } from "@/components/common/Search";
import { Filters } from "@/components/common/Filters";
import { StatusBadge } from "@/components/common/StatusBadge";
import { EmptyState } from "@/components/common/EmptyState";
import { interviews as initialInterviews } from "@/data/interviews";
import type { Interview } from "@/types/interview";
import { Plus, HelpCircle, Play, Eye } from "lucide-react";
import { COURSES, BATCHES, DIFFICULTIES, JOB_ROLES } from "@/lib/utils";

export default function InterviewsPage() {
  const [items] = useState<Interview[]>(initialInterviews);
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState({
    jobRole: "",
    course: "",
    batch: "",
    difficulty: "",
    status: "",
  });

  const filtered = useMemo(() => {
    return items.filter((item) => {
      const q = search.toLowerCase();
      const matchesSearch =
        !q ||
        item.name.toLowerCase().includes(q) ||
        item.jobRole.toLowerCase().includes(q);
      return (
        matchesSearch &&
        (!filters.jobRole || item.jobRole === filters.jobRole) &&
        (!filters.course || item.course === filters.course) &&
        (!filters.batch || item.batch === filters.batch) &&
        (!filters.difficulty || item.difficulty === filters.difficulty) &&
        (!filters.status || item.status === filters.status)
      );
    });
  }, [items, search, filters]);

  return (
    <AppShell
      title="AI Mock Interviews"
      subtitle="Create and manage AI-powered voice interview assessments."
      actions={
        <div className="flex gap-2">
          <Link
            href="/questions/interview"
            className="hidden items-center gap-2 rounded-xl border border-border bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 sm:flex"
          >
            <HelpCircle className="h-4 w-4" />
            Question Bank
          </Link>
          <Link
            href="/interviews/create"
            className="flex items-center gap-2 rounded-xl bg-primary px-3 py-2 text-sm font-medium text-white hover:bg-primary-dark"
          >
            <Plus className="h-4 w-4" />
            Create Interview
          </Link>
        </div>
      }
    >
      <div className="space-y-4 animate-fade-in">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <Search
            value={search}
            onChange={setSearch}
            placeholder="Search interviews..."
            className="w-full lg:max-w-sm"
          />
          <Filters
            filters={[
              {
                key: "jobRole",
                label: "Job Role",
                value: filters.jobRole,
                options: JOB_ROLES.map((r) => ({ label: r, value: r })),
              },
              {
                key: "course",
                label: "Course",
                value: filters.course,
                options: COURSES.map((c) => ({ label: c, value: c })),
              },
              {
                key: "batch",
                label: "Batch",
                value: filters.batch,
                options: BATCHES.map((b) => ({ label: b, value: b })),
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
                options: ["active", "draft", "completed", "archived"].map((s) => ({
                  label: s,
                  value: s,
                })),
              },
            ]}
            onChange={(key, value) => setFilters((f) => ({ ...f, [key]: value }))}
          />
        </div>

        {filtered.length === 0 ? (
          <EmptyState title="No interviews found" />
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-border bg-white shadow-sm">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-border bg-slate-50 text-xs uppercase tracking-wide text-muted">
                <tr>
                  <th className="px-4 py-3 font-semibold">Interview Name</th>
                  <th className="px-4 py-3 font-semibold">Job Role</th>
                  <th className="px-4 py-3 font-semibold">Questions</th>
                  <th className="px-4 py-3 font-semibold">Duration</th>
                  <th className="px-4 py-3 font-semibold">Difficulty</th>
                  <th className="px-4 py-3 font-semibold">Attempts</th>
                  <th className="px-4 py-3 font-semibold">Average Score</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/80">
                    <td className="px-4 py-3 font-medium text-slate-900">{item.name}</td>
                    <td className="px-4 py-3 text-slate-600">{item.jobRole}</td>
                    <td className="px-4 py-3 text-slate-600">{item.questionCount}</td>
                    <td className="px-4 py-3 text-slate-600">{item.duration} min</td>
                    <td className="px-4 py-3">
                      <StatusBadge status={item.difficulty} />
                    </td>
                    <td className="px-4 py-3 text-slate-600">{item.attempts}</td>
                    <td className="px-4 py-3 font-semibold text-indigo-600">
                      {item.averageScore}%
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={item.status} />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <Link
                          href={`/interviews/session/${item.id}`}
                          className="inline-flex items-center gap-1 rounded-lg bg-primary px-2.5 py-1.5 text-xs font-medium text-white hover:bg-primary-dark"
                        >
                          <Play className="h-3 w-3" />
                          Start
                        </Link>
                        <Link
                          href={`/interviews/result/${item.id}`}
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
