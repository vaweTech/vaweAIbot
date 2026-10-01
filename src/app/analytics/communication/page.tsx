"use client";

import { AppShell } from "@/components/layout/AppShell";
import { StatCard } from "@/components/dashboard/StatCard";
import { SkillChart, ProgressChart } from "@/components/analytics/Charts";
import { analyticsData } from "@/data/analytics";
import {
  Languages,
  SpellCheck,
  MessageCircle,
  BookOpen,
  AlignLeft,
  Clock,
  Hash,
} from "lucide-react";

export default function CommunicationAnalyticsPage() {
  const { communicationAverages, communicationTrend } = analyticsData;

  const skillData = [
    { skill: "Communication", score: communicationAverages.communication },
    { skill: "Grammar", score: communicationAverages.grammar },
    { skill: "Fluency", score: communicationAverages.fluency },
    { skill: "Vocabulary", score: communicationAverages.vocabulary },
    { skill: "Sentence Structure", score: communicationAverages.sentenceStructure },
  ];

  const indicators = [
    {
      label: "Avg Speaking Duration",
      value: communicationAverages.speakingDuration,
      icon: Clock,
      description: "Average recorded speaking time per assessment",
    },
    {
      label: "Avg Filler Words",
      value: `${communicationAverages.fillerWords} per response`,
      icon: Hash,
      description: "Count of filler words (um, uh, like, etc.) detected",
    },
    {
      label: "Fluency Score",
      value: `${communicationAverages.fluency}%`,
      icon: MessageCircle,
      description: "Speech rate and pause pattern analysis",
    },
    {
      label: "Vocabulary Score",
      value: `${communicationAverages.vocabulary}%`,
      icon: BookOpen,
      description: "Word variety and topic-relevant terminology usage",
    },
  ];

  return (
    <AppShell
      title="Communication Analytics"
      subtitle="Track speaking, fluency, and vocabulary performance across assessments."
    >
      <div className="space-y-6 animate-fade-in">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            title="Avg Communication"
            value={`${communicationAverages.communication}%`}
            icon={Languages}
            accent="from-indigo-500 to-blue-600"
          />
          <StatCard
            title="Avg Grammar"
            value={`${communicationAverages.grammar}%`}
            icon={SpellCheck}
            accent="from-amber-500 to-orange-500"
          />
          <StatCard
            title="Avg Fluency"
            value={`${communicationAverages.fluency}%`}
            icon={MessageCircle}
            accent="from-sky-500 to-blue-500"
          />
          <StatCard
            title="Avg Vocabulary"
            value={`${communicationAverages.vocabulary}%`}
            icon={BookOpen}
            accent="from-violet-500 to-indigo-500"
          />
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-2xl border border-border bg-white p-5 shadow-sm">
            <h2 className="mb-4 text-base font-semibold text-slate-900">
              Communication Skill Breakdown
            </h2>
            <SkillChart data={skillData} color="#4f46e5" />
          </div>
          <div className="rounded-2xl border border-border bg-white p-5 shadow-sm">
            <h2 className="mb-4 text-base font-semibold text-slate-900">
              Communication Trend
            </h2>
            <ProgressChart
              data={communicationTrend}
              lines={[
                { key: "communication", color: "#4f46e5", name: "Communication" },
                { key: "fluency", color: "#0ea5e9", name: "Fluency" },
                { key: "vocabulary", color: "#10b981", name: "Vocabulary" },
              ]}
            />
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-white p-5 shadow-sm">
          <h2 className="mb-1 text-base font-semibold text-slate-900">
            Speaking Confidence Indicators
          </h2>
          <p className="mb-4 text-sm text-muted">
            Measurable speech metrics — not psychological assessments.
          </p>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {indicators.map((item) => (
              <div
                key={item.label}
                className="rounded-xl border border-border bg-slate-50 p-4"
              >
                <div className="flex items-center gap-2 text-indigo-600">
                  <item.icon className="h-4 w-4" />
                  <span className="text-xs font-medium uppercase tracking-wide">
                    {item.label}
                  </span>
                </div>
                <p className="mt-2 text-xl font-bold text-slate-900">{item.value}</p>
                <p className="mt-1 text-xs text-muted">{item.description}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2">
            <AlignLeft className="h-5 w-5 text-indigo-500" />
            <h2 className="text-base font-semibold text-slate-900">Sentence Structure</h2>
          </div>
          <p className="mt-2 text-3xl font-bold text-indigo-600">
            {communicationAverages.sentenceStructure}%
          </p>
          <p className="mt-1 text-sm text-muted">
            Average score for sentence clarity, complexity, and coherence across all speaking
            assessments.
          </p>
        </div>
      </div>
    </AppShell>
  );
}
