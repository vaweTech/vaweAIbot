"use client";

import { AppShell } from "@/components/layout/AppShell";
import { StatCard } from "@/components/dashboard/StatCard";
import { RecentAssessments } from "@/components/dashboard/RecentAssessments";
import {
  PerformanceChart,
  SkillChart,
  ScoreDistribution,
} from "@/components/analytics/Charts";
import { analyticsData } from "@/data/analytics";
import { getGreeting } from "@/lib/utils";
import { currentUser } from "@/types/student";
import {
  Users,
  Mic,
  CheckCircle2,
  MessagesSquare,
  MessageSquare,
  Percent,
  Languages,
  SpellCheck,
} from "lucide-react";

export default function DashboardPage() {
  const { kpis, activity, skillPerformance, performanceDistribution, recentAssessments } =
    analyticsData;

  return (
    <AppShell
      title={`${getGreeting()}, ${currentUser.title}`}
      subtitle="Monitor student interview, communication and group discussion performance."
    >
      <div className="space-y-6 animate-fade-in">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard title="Total Students" value={kpis.totalStudents.toLocaleString()} icon={Users} accent="from-indigo-500 to-blue-600" />
          <StatCard title="Total Interviews" value={kpis.totalInterviews.toLocaleString()} icon={Mic} accent="from-blue-500 to-cyan-500" />
          <StatCard title="Completed Interviews" value={kpis.completedInterviews.toLocaleString()} icon={CheckCircle2} accent="from-emerald-500 to-teal-500" />
          <StatCard title="GD Sessions" value={kpis.gdSessions} icon={MessagesSquare} accent="from-violet-500 to-indigo-500" />
          <StatCard title="Speaking Assessments" value={kpis.speakingAssessments} icon={MessageSquare} accent="from-sky-500 to-blue-500" />
          <StatCard title="Average Interview Score" value={`${kpis.averageInterviewScore}%`} icon={Percent} accent="from-indigo-500 to-purple-500" />
          <StatCard title="Average Communication" value={`${kpis.averageCommunication}%`} icon={Languages} accent="from-blue-500 to-indigo-500" />
          <StatCard title="Average Grammar" value={`${kpis.averageGrammar}%`} icon={SpellCheck} accent="from-amber-500 to-orange-500" />
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-2xl border border-border bg-white p-5 shadow-sm">
            <h2 className="mb-4 text-base font-semibold text-slate-900">Assessment Activity</h2>
            <PerformanceChart data={activity} />
          </div>
          <div className="rounded-2xl border border-border bg-white p-5 shadow-sm">
            <h2 className="mb-4 text-base font-semibold text-slate-900">Skill Performance</h2>
            <SkillChart data={skillPerformance} />
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="rounded-2xl border border-border bg-white p-5 shadow-sm">
            <h2 className="mb-4 text-base font-semibold text-slate-900">Performance Distribution</h2>
            <ScoreDistribution data={performanceDistribution} />
          </div>
          <div className="lg:col-span-2">
            <RecentAssessments assessments={recentAssessments} />
          </div>
        </div>
      </div>
    </AppShell>
  );
}
