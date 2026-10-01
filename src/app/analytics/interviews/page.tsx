"use client";

import { AppShell } from "@/components/layout/AppShell";
import { StatCard } from "@/components/dashboard/StatCard";
import { ProgressChart, ScoreDistribution, SkillChart } from "@/components/analytics/Charts";
import { analyticsData } from "@/data/analytics";
import { Mic, CheckCircle2, Percent, Brain, Languages, SpellCheck, MessageCircle } from "lucide-react";

export default function InterviewAnalyticsPage() {
  const { interviewAnalytics } = analyticsData;

  const skillData = [
    { skill: "Technical", score: interviewAnalytics.technical },
    { skill: "Communication", score: interviewAnalytics.communication },
    { skill: "Grammar", score: interviewAnalytics.grammar },
    { skill: "Fluency", score: interviewAnalytics.fluency },
  ];

  const trendData = interviewAnalytics.trend.map((t) => ({
    month: t.month,
    score: t.score,
  }));

  return (
    <AppShell
      title="Interview Analytics"
      subtitle="Performance insights from AI mock interview assessments."
    >
      <div className="space-y-6 animate-fade-in">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            title="Total Interviews"
            value={interviewAnalytics.total.toLocaleString()}
            icon={Mic}
            accent="from-indigo-500 to-blue-600"
          />
          <StatCard
            title="Completed"
            value={interviewAnalytics.completed.toLocaleString()}
            icon={CheckCircle2}
            accent="from-emerald-500 to-teal-500"
          />
          <StatCard
            title="Average Score"
            value={`${interviewAnalytics.averageScore}%`}
            icon={Percent}
            accent="from-violet-500 to-indigo-500"
          />
          <StatCard
            title="Technical Knowledge"
            value={`${interviewAnalytics.technical}%`}
            icon={Brain}
            accent="from-blue-500 to-cyan-500"
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <StatCard
            title="Communication"
            value={`${interviewAnalytics.communication}%`}
            icon={Languages}
            accent="from-sky-500 to-blue-500"
          />
          <StatCard
            title="Grammar"
            value={`${interviewAnalytics.grammar}%`}
            icon={SpellCheck}
            accent="from-amber-500 to-orange-500"
          />
          <StatCard
            title="Fluency"
            value={`${interviewAnalytics.fluency}%`}
            icon={MessageCircle}
            accent="from-indigo-500 to-purple-500"
          />
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-2xl border border-border bg-white p-5 shadow-sm">
            <h2 className="mb-4 text-base font-semibold text-slate-900">
              Interview Score Trend
            </h2>
            <ProgressChart
              data={trendData}
              lines={[{ key: "score", color: "#4f46e5", name: "Average Score" }]}
            />
          </div>
          <div className="rounded-2xl border border-border bg-white p-5 shadow-sm">
            <h2 className="mb-4 text-base font-semibold text-slate-900">Skill Breakdown</h2>
            <SkillChart data={skillData} color="#4f46e5" />
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-base font-semibold text-slate-900">Score Distribution</h2>
          <ScoreDistribution data={interviewAnalytics.distribution} />
        </div>
      </div>
    </AppShell>
  );
}
