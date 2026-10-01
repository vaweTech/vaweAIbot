"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { StatCard } from "@/components/dashboard/StatCard";
import { Search } from "@/components/common/Search";
import { Filters } from "@/components/common/Filters";
import { StatusBadge } from "@/components/common/StatusBadge";
import { EmptyState } from "@/components/common/EmptyState";
import { gdSessions } from "@/data/gdSessions";
import { gdTopics } from "@/data/gdTopics";
import { GD_CATEGORIES } from "@/lib/utils";
import {
  Plus,
  HelpCircle,
  Play,
  Eye,
  BookOpen,
  Users,
  CheckCircle2,
  BarChart3,
} from "lucide-react";

export default function GDPage() {
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState({ category: "", status: "" });

  const kpis = useMemo(() => {
    const completed = gdSessions.filter((s) => s.status === "completed").length;
    const active = gdSessions.filter((s) => s.status === "active").length;
    const totalParticipants = gdSessions.reduce(
      (sum, s) => sum + s.participants.length,
      0
    );
    const avgScore =
      gdSessions.length > 0
        ? Math.round(gdSessions.reduce((sum, s) => sum + s.averageScore, 0) / gdSessions.length)
        : 0;
    return {
      totalTopics: gdTopics.length,
      activeSessions: active,
      completed,
      totalParticipants,
      averageScore: avgScore,
    };
  }, []);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return gdSessions.filter((session) => {
      const matchesSearch =
        !q ||
        session.topic.toLowerCase().includes(q) ||
        session.category.toLowerCase().includes(q);
      return (
        matchesSearch &&
        (!filters.category || session.category === filters.category) &&
        (!filters.status || session.status === filters.status)
      );
    });
  }, [search, filters]);

  return (
    <AppShell
      title="AI Group Discussions"
      subtitle="Create and manage AI-powered group discussion assessments."
      actions={
        <div className="flex gap-2">
          <Link
            href="/questions/gd"
            className="hidden items-center gap-2 rounded-xl border border-border bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 sm:flex"
          >
            <HelpCircle className="h-4 w-4" />
            GD Topics
          </Link>
          <Link
            href="/gd/create"
            className="flex items-center gap-2 rounded-xl bg-primary px-3 py-2 text-sm font-medium text-white hover:bg-primary-dark"
          >
            <Plus className="h-4 w-4" />
            Create GD
          </Link>
        </div>
      }
    >
      <div className="space-y-6 animate-fade-in">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <StatCard
            title="Total Topics"
            value={kpis.totalTopics}
            icon={BookOpen}
            accent="from-indigo-500 to-blue-600"
          />
          <StatCard
            title="Active Sessions"
            value={kpis.activeSessions}
            icon={Users}
            accent="from-emerald-500 to-teal-600"
          />
          <StatCard
            title="Completed"
            value={kpis.completed}
            icon={CheckCircle2}
            accent="from-violet-500 to-purple-600"
          />
          <StatCard
            title="Participants"
            value={kpis.totalParticipants}
            icon={Users}
            accent="from-blue-500 to-cyan-600"
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
            placeholder="Search group discussions..."
            className="w-full lg:max-w-sm"
          />
          <Filters
            filters={[
              {
                key: "category",
                label: "Category",
                value: filters.category,
                options: GD_CATEGORIES.map((c) => ({ label: c, value: c })),
              },
              {
                key: "status",
                label: "Status",
                value: filters.status,
                options: ["draft", "scheduled", "active", "completed"].map((s) => ({
                  label: s,
                  value: s,
                })),
              },
            ]}
            onChange={(key, value) => setFilters((f) => ({ ...f, [key]: value }))}
          />
        </div>

        {filtered.length === 0 ? (
          <EmptyState title="No group discussions found" />
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-border bg-white shadow-sm">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-border bg-slate-50 text-xs uppercase tracking-wide text-muted">
                <tr>
                  <th className="px-4 py-3 font-semibold">Topic</th>
                  <th className="px-4 py-3 font-semibold">Category</th>
                  <th className="px-4 py-3 font-semibold">Duration</th>
                  <th className="px-4 py-3 font-semibold">Participants</th>
                  <th className="px-4 py-3 font-semibold">Average Score</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map((session) => (
                  <tr key={session.id} className="hover:bg-slate-50/80">
                    <td className="max-w-xs px-4 py-3 font-medium text-slate-900">
                      {session.topic}
                    </td>
                    <td className="px-4 py-3 text-slate-600">{session.category}</td>
                    <td className="px-4 py-3 text-slate-600">{session.duration} min</td>
                    <td className="px-4 py-3 text-slate-600">
                      {session.participants.length}
                    </td>
                    <td className="px-4 py-3 font-semibold text-indigo-600">
                      {session.averageScore}%
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={session.status} />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <Link
                          href={`/gd/session/${session.id}`}
                          className="inline-flex items-center gap-1 rounded-lg bg-primary px-2.5 py-1.5 text-xs font-medium text-white hover:bg-primary-dark"
                        >
                          <Play className="h-3 w-3" />
                          Start GD
                        </Link>
                        {session.status === "completed" && (
                          <Link
                            href={`/gd/result/${session.id}`}
                            className="inline-flex items-center gap-1 rounded-lg border border-border px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
                          >
                            <Eye className="h-3 w-3" />
                            Result
                          </Link>
                        )}
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
