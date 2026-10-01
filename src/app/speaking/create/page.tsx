"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { SuccessState } from "@/components/common/LoadingState";
import { speakingTests } from "@/data/speakingTests";
import { DIFFICULTIES } from "@/lib/utils";
import type { Difficulty } from "@/types/speaking";

const SPEAKING_CATEGORIES = [
  "Personal",
  "Technical",
  "Communication",
  "Soft Skills",
  "Problem Solving",
  "Technology",
  "Behavioral",
  "Career",
  "Creative",
  "Data Science",
  "Marketing",
  "Cloud",
] as const;

const DEFAULT_CRITERIA = [
  "Fluency",
  "Grammar",
  "Vocabulary",
  "Communication",
  "Topic relevance",
  "Sentence structure",
  "Clarity",
  "Structure",
];

export default function CreateSpeakingPage() {
  const router = useRouter();
  const [saved, setSaved] = useState(false);
  const [form, setForm] = useState<{
    topic: string;
    category: string;
    duration: number;
    difficulty: Difficulty;
  }>({
    topic: "",
    category: SPEAKING_CATEGORIES[0],
    duration: 3,
    difficulty: "Beginner",
  });
  const [criteria, setCriteria] = useState<string[]>([
    "Fluency",
    "Grammar",
    "Vocabulary",
    "Communication",
    "Topic relevance",
    "Sentence structure",
  ]);

  const toggleCriterion = (criterion: string) => {
    setCriteria((prev) =>
      prev.includes(criterion)
        ? prev.filter((c) => c !== criterion)
        : [...prev, criterion]
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.topic.trim() || criteria.length === 0) return;

    const newTest = {
      id: `SPK${String(speakingTests.length + 1).padStart(3, "0")}`,
      topic: form.topic.trim(),
      category: form.category,
      duration: form.duration,
      difficulty: form.difficulty,
      evaluationCriteria: criteria,
      attempts: 0,
      averageScore: 0,
      averageFluency: 0,
      status: "active" as const,
      createdAt: new Date().toISOString(),
    };
    speakingTests.unshift(newTest);
    setSaved(true);
    setTimeout(() => router.push("/speaking"), 1000);
  };

  return (
    <AppShell
      title="Create Speaking Test"
      subtitle="Configure a new AI-powered speaking assessment."
    >
      <form onSubmit={handleSubmit} className="mx-auto max-w-3xl space-y-6 animate-fade-in">
        {saved && (
          <SuccessState title="Speaking test created" description="Redirecting to speaking list..." />
        )}

        <div className="rounded-2xl border border-border bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-base font-semibold text-slate-900">Test Details</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="sm:col-span-2 block text-sm">
              <span className="mb-1.5 block font-medium text-slate-700">Topic</span>
              <input
                required
                value={form.topic}
                onChange={(e) => setForm({ ...form, topic: e.target.value })}
                className="w-full rounded-xl border border-border px-3 py-2.5 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                placeholder="e.g. Introduce yourself and your career goals"
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1.5 block font-medium text-slate-700">Category</span>
              <select
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                className="w-full rounded-xl border border-border px-3 py-2.5 outline-none focus:border-primary"
              >
                {SPEAKING_CATEGORIES.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </label>
            <label className="block text-sm">
              <span className="mb-1.5 block font-medium text-slate-700">Difficulty</span>
              <select
                value={form.difficulty}
                onChange={(e) =>
                  setForm({ ...form, difficulty: e.target.value as Difficulty })
                }
                className="w-full rounded-xl border border-border px-3 py-2.5 outline-none focus:border-primary"
              >
                {DIFFICULTIES.map((d) => (
                  <option key={d}>{d}</option>
                ))}
              </select>
            </label>
            <label className="block text-sm">
              <span className="mb-1.5 block font-medium text-slate-700">Duration (minutes)</span>
              <input
                type="number"
                min={1}
                max={10}
                value={form.duration}
                onChange={(e) => setForm({ ...form, duration: Number(e.target.value) })}
                className="w-full rounded-xl border border-border px-3 py-2.5 outline-none focus:border-primary"
              />
            </label>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-base font-semibold text-slate-900">Evaluation Criteria</h2>
          <div className="flex flex-wrap gap-2">
            {DEFAULT_CRITERIA.map((criterion) => (
              <button
                key={criterion}
                type="button"
                onClick={() => toggleCriterion(criterion)}
                className={`rounded-xl border px-4 py-2 text-sm font-medium transition ${
                  criteria.includes(criterion)
                    ? "border-primary bg-primary-light text-primary"
                    : "border-border text-slate-600 hover:bg-slate-50"
                }`}
              >
                {criterion}
              </button>
            ))}
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={() => router.push("/speaking")}
            className="rounded-xl border border-border px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!form.topic.trim() || criteria.length === 0}
            className="rounded-xl bg-primary px-5 py-2.5 text-sm font-medium text-white hover:bg-primary-dark disabled:cursor-not-allowed disabled:opacity-50"
          >
            Save Speaking Test
          </button>
        </div>
      </form>
    </AppShell>
  );
}
