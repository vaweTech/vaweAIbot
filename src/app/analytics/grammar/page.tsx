"use client";

import { useMemo, useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { StatCard } from "@/components/dashboard/StatCard";
import { SkillChart } from "@/components/analytics/Charts";
import { Filters } from "@/components/common/Filters";
import { analyticsData } from "@/data/analytics";
import { grammarResults } from "@/data/grammarResults";
import { students } from "@/data/students";
import { BATCHES } from "@/lib/utils";
import { SpellCheck, AlertTriangle, CheckCircle2 } from "lucide-react";

export default function GrammarAnalyticsPage() {
  const { grammarAverages } = analyticsData;
  const [filters, setFilters] = useState({ student: "", batch: "" });

  const filteredResults = useMemo(() => {
    return grammarResults.filter((r) => {
      const student = students.find((s) => s.id === r.studentId);
      return (
        (!filters.student || r.studentId === filters.student) &&
        (!filters.batch || student?.batch === filters.batch)
      );
    });
  }, [filters]);

  const aggregatedCategories = useMemo(() => {
    const totals = {
      Articles: 0,
      Tense: 0,
      Prepositions: 0,
      "Subject-Verb Agreement": 0,
      "Sentence Structure": 0,
      "Word Choice": 0,
    };
    filteredResults.forEach((r) => {
      totals.Articles += r.categoryBreakdown.articles;
      totals.Tense += r.categoryBreakdown.tense;
      totals.Prepositions += r.categoryBreakdown.prepositions;
      totals["Subject-Verb Agreement"] += r.categoryBreakdown.subjectVerb;
      totals["Sentence Structure"] += r.categoryBreakdown.sentenceStructure;
      totals["Word Choice"] += r.categoryBreakdown.wordChoice;
    });
    return Object.entries(totals).map(([skill, count]) => ({
      skill,
      score: count,
    }));
  }, [filteredResults]);

  const filteredStats = useMemo(() => {
    if (filteredResults.length === 0) {
      return { avgScore: 0, totalErrors: 0, assessments: 0 };
    }
    const totalErrors = filteredResults.reduce((sum, r) => sum + r.errors, 0);
    const avgScore = Math.round(
      filteredResults.reduce((sum, r) => sum + r.score, 0) / filteredResults.length
    );
    return { avgScore, totalErrors, assessments: filteredResults.length };
  }, [filteredResults]);

  const chartData =
    filteredResults.length > 0
      ? aggregatedCategories
      : grammarAverages.mostCommonErrors.map((e) => ({
          skill: e.category,
          score: e.count,
        }));

  return (
    <AppShell
      title="Grammar Analytics"
      subtitle="Analyze grammar errors and improvement trends across students."
    >
      <div className="space-y-6 animate-fade-in">
        <Filters
          filters={[
            {
              key: "student",
              label: "Student",
              value: filters.student,
              options: students.map((s) => ({ label: s.name, value: s.id })),
            },
            {
              key: "batch",
              label: "Batch",
              value: filters.batch,
              options: BATCHES.map((b) => ({ label: b, value: b })),
            },
          ]}
          onChange={(key, value) => setFilters((f) => ({ ...f, [key]: value }))}
        />

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <StatCard
            title="Average Grammar Score"
            value={`${filteredResults.length > 0 ? filteredStats.avgScore : grammarAverages.averageScore}%`}
            icon={SpellCheck}
            accent="from-indigo-500 to-blue-600"
          />
          <StatCard
            title="Total Errors"
            value={
              filteredResults.length > 0
                ? filteredStats.totalErrors.toLocaleString()
                : grammarAverages.totalErrors.toLocaleString()
            }
            icon={AlertTriangle}
            accent="from-amber-500 to-orange-500"
          />
          <StatCard
            title="Assessments Analyzed"
            value={
              filteredResults.length > 0
                ? filteredStats.assessments
                : grammarResults.length
            }
            icon={CheckCircle2}
            accent="from-emerald-500 to-teal-500"
          />
        </div>

        <div className="rounded-2xl border border-border bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-base font-semibold text-slate-900">Error Categories</h2>
          <SkillChart data={chartData} color="#f59e0b" />
          <p className="mt-2 text-xs text-muted">
            {filteredResults.length > 0
              ? `Showing ${filteredResults.length} filtered assessment(s)`
              : "Showing platform-wide error distribution"}
          </p>
        </div>

        <div className="overflow-x-auto rounded-2xl border border-border bg-white shadow-sm">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-border bg-slate-50 text-xs uppercase tracking-wide text-muted">
              <tr>
                <th className="px-4 py-3 font-semibold">Student</th>
                <th className="px-4 py-3 font-semibold">Date</th>
                <th className="px-4 py-3 font-semibold">Score</th>
                <th className="px-4 py-3 font-semibold">Errors</th>
                <th className="px-4 py-3 font-semibold">Sentences</th>
                <th className="px-4 py-3 font-semibold">Top Category</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredResults.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-sm text-muted">
                    No grammar assessments yet. Results appear here once students complete assessments.
                  </td>
                </tr>
              )}
              {filteredResults.slice(0, 10).map((r) => {
                const breakdown = r.categoryBreakdown;
                const top = Object.entries({
                  Articles: breakdown.articles,
                  Tense: breakdown.tense,
                  Prepositions: breakdown.prepositions,
                  "Subject-Verb": breakdown.subjectVerb,
                  Structure: breakdown.sentenceStructure,
                  "Word Choice": breakdown.wordChoice,
                }).sort((a, b) => b[1] - a[1])[0];
                return (
                  <tr key={r.id} className="hover:bg-slate-50/80">
                    <td className="px-4 py-3 font-medium text-slate-900">{r.studentName}</td>
                    <td className="px-4 py-3 text-slate-600">{r.date}</td>
                    <td className="px-4 py-3 font-semibold text-indigo-600">{r.score}%</td>
                    <td className="px-4 py-3 text-slate-600">{r.errors}</td>
                    <td className="px-4 py-3 text-slate-600">{r.totalSentences}</td>
                    <td className="px-4 py-3 text-slate-600">
                      {top[0]} ({top[1]})
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </AppShell>
  );
}
