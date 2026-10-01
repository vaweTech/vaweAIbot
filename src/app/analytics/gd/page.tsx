"use client";

import { AppShell } from "@/components/layout/AppShell";
import { StatCard } from "@/components/dashboard/StatCard";
import { SkillChart } from "@/components/analytics/Charts";
import { analyticsData } from "@/data/analytics";
import { MessagesSquare, Users, Percent, BarChart3, Clock } from "lucide-react";

export default function GDAnalyticsPage() {
  const { gdAnalytics } = analyticsData;

  return (
    <AppShell
      title="Group Discussion Analytics"
      subtitle="Insights from AI-powered group discussion sessions."
    >
      <div className="space-y-6 animate-fade-in">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            title="Total Sessions"
            value={gdAnalytics.totalSessions}
            icon={MessagesSquare}
            accent="from-indigo-500 to-blue-600"
          />
          <StatCard
            title="Participants"
            value={gdAnalytics.participants.toLocaleString()}
            icon={Users}
            accent="from-violet-500 to-indigo-500"
          />
          <StatCard
            title="Average Score"
            value={`${gdAnalytics.averageScore}%`}
            icon={Percent}
            accent="from-emerald-500 to-teal-500"
          />
          <StatCard
            title="Avg Participation"
            value={`${gdAnalytics.averageParticipation}%`}
            icon={BarChart3}
            accent="from-sky-500 to-blue-500"
          />
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <StatCard
            title="Avg Speaking Time"
            value={gdAnalytics.averageSpeakingTime}
            icon={Clock}
            accent="from-amber-500 to-orange-500"
          />
          <div className="lg:col-span-2 rounded-2xl border border-border bg-white p-5 shadow-sm">
            <h2 className="mb-4 text-base font-semibold text-slate-900">GD Skill Performance</h2>
            <SkillChart data={gdAnalytics.skills} color="#6366f1" />
          </div>
        </div>
      </div>
    </AppShell>
  );
}
