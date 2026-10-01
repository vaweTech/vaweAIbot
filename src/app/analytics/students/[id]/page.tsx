"use client";

import { use, useMemo } from "react";
import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { StatCard } from "@/components/dashboard/StatCard";
import { ProgressChart } from "@/components/analytics/Charts";
import { StatusBadge } from "@/components/common/StatusBadge";
import { ErrorState } from "@/components/common/LoadingState";
import { getStudentById } from "@/data/students";
import { getInitials } from "@/lib/utils";
import {
  ArrowLeft,
  Mic,
  MessagesSquare,
  MessageSquare,
  Percent,
  Languages,
  SpellCheck,
} from "lucide-react";

function buildProgressData(student: NonNullable<ReturnType<typeof getStudentById>>) {
  const months = ["Apr 2026", "May 2026", "Jun 2026", "Jul 2026", "Aug 2026", "Sep 2026"];
  const base = student.averageScore - 12;
  return months.map((month, i) => ({
    month,
    overall: Math.min(100, Math.round(base + i * 2 + (student.averageScore % 5))),
    communication: Math.min(100, Math.round(student.communicationScore - 10 + i * 2)),
    grammar: Math.min(100, Math.round(student.grammarScore - 8 + i * 1.5)),
  }));
}

function buildSkillGaps(student: NonNullable<ReturnType<typeof getStudentById>>) {
  const skills = [
    { name: "Technical Knowledge", score: student.averageScore - 3 },
    { name: "Communication", score: student.communicationScore },
    { name: "Grammar", score: student.grammarScore },
    { name: "Fluency", score: student.communicationScore - 4 },
    { name: "Vocabulary", score: student.grammarScore + 2 },
    { name: "Team Interaction", score: student.averageScore - 5 },
  ];
  const sorted = [...skills].sort((a, b) => b.score - a.score);
  return {
    strong: sorted.slice(0, 3),
    improvement: sorted.slice(-3).reverse(),
  };
}

export default function StudentProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const student = getStudentById(id);

  const progressData = useMemo(
    () => (student ? buildProgressData(student) : []),
    [student]
  );
  const skillGaps = useMemo(() => (student ? buildSkillGaps(student) : null), [student]);

  if (!student) {
    return (
      <AppShell title="Student Profile">
        <ErrorState title="Student not found" />
      </AppShell>
    );
  }

  return (
    <AppShell
      title={student.name}
      subtitle={`${student.course} · ${student.batch}`}
      actions={
        <Link
          href="/analytics/students"
          className="flex items-center gap-2 rounded-xl border border-border bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Link>
      }
    >
      <div className="space-y-6 animate-fade-in">
        <div className="flex flex-col gap-4 rounded-2xl border border-border bg-white p-5 shadow-sm sm:flex-row sm:items-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-blue-600 text-xl font-bold text-white">
            {getInitials(student.name)}
          </div>
          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-3">
              <h2 className="text-xl font-semibold text-slate-900">{student.name}</h2>
              <StatusBadge status={student.status} />
            </div>
            <p className="mt-1 text-sm text-muted">{student.email}</p>
            <p className="text-sm text-muted">
              {student.id} · {student.course} · {student.batch}
            </p>
          </div>
          <div className="text-center sm:text-right">
            <p className="text-sm text-muted">Overall Score</p>
            <p className="text-3xl font-bold text-indigo-600">{student.averageScore}%</p>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <StatCard
            title="Interviews Completed"
            value={student.interviewsCompleted}
            icon={Mic}
            accent="from-indigo-500 to-blue-600"
          />
          <StatCard
            title="GD Sessions"
            value={student.gdSessionsCompleted}
            icon={MessagesSquare}
            accent="from-violet-500 to-indigo-500"
          />
          <StatCard
            title="Speaking Tests"
            value={student.speakingTestsCompleted}
            icon={MessageSquare}
            accent="from-sky-500 to-blue-500"
          />
          <StatCard
            title="Average Score"
            value={`${student.averageScore}%`}
            icon={Percent}
            accent="from-indigo-500 to-purple-500"
          />
          <StatCard
            title="Communication"
            value={`${student.communicationScore}%`}
            icon={Languages}
            accent="from-blue-500 to-indigo-500"
          />
          <StatCard
            title="Grammar"
            value={`${student.grammarScore}%`}
            icon={SpellCheck}
            accent="from-amber-500 to-orange-500"
          />
        </div>

        <div className="rounded-2xl border border-border bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-base font-semibold text-slate-900">Performance Over Time</h2>
          <ProgressChart
            data={progressData}
            lines={[
              { key: "overall", color: "#4f46e5", name: "Overall" },
              { key: "communication", color: "#0ea5e9", name: "Communication" },
              { key: "grammar", color: "#f59e0b", name: "Grammar" },
            ]}
          />
        </div>

        {skillGaps && (
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="rounded-2xl border border-border bg-white p-5 shadow-sm">
              <h2 className="mb-4 text-base font-semibold text-emerald-700">Strong Skills</h2>
              <div className="space-y-4">
                {skillGaps.strong.map((skill) => (
                  <div key={skill.name}>
                    <div className="mb-1 flex justify-between text-sm">
                      <span className="font-medium text-slate-700">{skill.name}</span>
                      <span className="font-semibold text-emerald-600">{skill.score}%</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                      <div
                        className="h-full rounded-full bg-emerald-500"
                        style={{ width: `${skill.score}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-2xl border border-border bg-white p-5 shadow-sm">
              <h2 className="mb-4 text-base font-semibold text-amber-700">Improvement Areas</h2>
              <div className="space-y-4">
                {skillGaps.improvement.map((skill) => (
                  <div key={skill.name}>
                    <div className="mb-1 flex justify-between text-sm">
                      <span className="font-medium text-slate-700">{skill.name}</span>
                      <span className="font-semibold text-amber-600">{skill.score}%</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                      <div
                        className="h-full rounded-full bg-amber-500"
                        style={{ width: `${skill.score}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
