"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { Search } from "@/components/common/Search";
import { Filters } from "@/components/common/Filters";
import { StatusBadge } from "@/components/common/StatusBadge";
import { EmptyState } from "@/components/common/EmptyState";
import { students } from "@/data/students";
import { COURSES, BATCHES } from "@/lib/utils";
import { Eye } from "lucide-react";

export default function StudentsAnalyticsPage() {
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState({ course: "", batch: "", status: "" });

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return students.filter((s) => {
      const matchesSearch =
        !q ||
        s.name.toLowerCase().includes(q) ||
        s.email.toLowerCase().includes(q) ||
        s.id.toLowerCase().includes(q);
      return (
        matchesSearch &&
        (!filters.course || s.course === filters.course) &&
        (!filters.batch || s.batch === filters.batch) &&
        (!filters.status || s.status === filters.status)
      );
    });
  }, [search, filters]);

  return (
    <AppShell
      title="Student Analytics"
      subtitle="Track individual student performance across all assessments."
    >
      <div className="space-y-4 animate-fade-in">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <Search
            value={search}
            onChange={setSearch}
            placeholder="Search students..."
            className="w-full lg:max-w-sm"
          />
          <Filters
            filters={[
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
                key: "status",
                label: "Status",
                value: filters.status,
                options: [
                  { label: "Active", value: "active" },
                  { label: "Inactive", value: "inactive" },
                  { label: "At Risk", value: "at-risk" },
                ],
              },
            ]}
            onChange={(key, value) => setFilters((f) => ({ ...f, [key]: value }))}
          />
        </div>

        {filtered.length === 0 ? (
          <EmptyState title="No students found" />
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-border bg-white shadow-sm">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-border bg-slate-50 text-xs uppercase tracking-wide text-muted">
                <tr>
                  <th className="px-4 py-3 font-semibold">Student</th>
                  <th className="px-4 py-3 font-semibold">Course</th>
                  <th className="px-4 py-3 font-semibold">Batch</th>
                  <th className="px-4 py-3 font-semibold">Interviews</th>
                  <th className="px-4 py-3 font-semibold">GD Sessions</th>
                  <th className="px-4 py-3 font-semibold">Speaking Tests</th>
                  <th className="px-4 py-3 font-semibold">Average Score</th>
                  <th className="px-4 py-3 font-semibold">Communication</th>
                  <th className="px-4 py-3 font-semibold">Grammar</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50/80">
                    <td className="px-4 py-3">
                      <div>
                        <p className="font-medium text-slate-900">{s.name}</p>
                        <p className="text-xs text-muted">{s.id}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{s.course}</td>
                    <td className="px-4 py-3 text-slate-600">{s.batch}</td>
                    <td className="px-4 py-3 text-slate-600">{s.interviewsCompleted}</td>
                    <td className="px-4 py-3 text-slate-600">{s.gdSessionsCompleted}</td>
                    <td className="px-4 py-3 text-slate-600">{s.speakingTestsCompleted}</td>
                    <td className="px-4 py-3 font-semibold text-indigo-600">{s.averageScore}%</td>
                    <td className="px-4 py-3 text-slate-600">{s.communicationScore}%</td>
                    <td className="px-4 py-3 text-slate-600">{s.grammarScore}%</td>
                    <td className="px-4 py-3">
                      <StatusBadge status={s.status} />
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/analytics/students/${s.id}`}
                        className="inline-flex items-center gap-1 rounded-lg bg-primary px-2.5 py-1.5 text-xs font-medium text-white hover:bg-primary-dark"
                      >
                        <Eye className="h-3 w-3" />
                        View
                      </Link>
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
