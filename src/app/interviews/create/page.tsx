"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { SuccessState } from "@/components/common/LoadingState";
import { calculateWeightTotal, DEFAULT_WEIGHTS } from "@/lib/scoring";
import type { EvaluationWeights, Difficulty, QuestionSelectionMode } from "@/types/interview";
import { COURSES, BATCHES, DIFFICULTIES, JOB_ROLES } from "@/lib/utils";
import { interviews } from "@/data/interviews";

export default function CreateInterviewPage() {
  const router = useRouter();
  const [saved, setSaved] = useState(false);
  const [form, setForm] = useState<{
    name: string;
    jobRole: string;
    course: string;
    batch: string;
    difficulty: Difficulty;
    duration: number;
    questionCount: number;
    questionSelection: QuestionSelectionMode;
  }>({
    name: "",
    jobRole: JOB_ROLES[0],
    course: COURSES[0],
    batch: BATCHES[0],
    difficulty: "Intermediate",
    duration: 30,
    questionCount: 10,
    questionSelection: "Question Bank",
  });
  const [weights, setWeights] = useState<EvaluationWeights>({ ...DEFAULT_WEIGHTS });

  const totalWeight = useMemo(() => calculateWeightTotal(weights), [weights]);
  const weightValid = totalWeight === 100;

  const updateWeight = (key: keyof EvaluationWeights, value: number) => {
    setWeights((w) => ({ ...w, [key]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!weightValid || !form.name.trim()) return;
    const newInterview = {
      id: `INT${String(interviews.length + 1).padStart(3, "0")}`,
      ...form,
      questionIds: [],
      weights,
      attempts: 0,
      averageScore: 0,
      status: "active" as const,
      createdAt: new Date().toISOString(),
    };
    interviews.unshift(newInterview);
    setSaved(true);
    setTimeout(() => router.push("/interviews"), 1000);
  };

  return (
    <AppShell
      title="Create Interview"
      subtitle="Configure a new AI-powered mock interview assessment."
    >
      <form onSubmit={handleSubmit} className="mx-auto max-w-3xl space-y-6 animate-fade-in">
        {saved && (
          <SuccessState title="Interview created" description="Redirecting to interviews list..." />
        )}

        <div className="rounded-2xl border border-border bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-base font-semibold text-slate-900">Interview Details</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="sm:col-span-2 block text-sm">
              <span className="mb-1.5 block font-medium text-slate-700">Interview Name</span>
              <input
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full rounded-xl border border-border px-3 py-2.5 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                placeholder="e.g. React Frontend Mock Interview"
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1.5 block font-medium text-slate-700">Job Role</span>
              <select
                value={form.jobRole}
                onChange={(e) => setForm({ ...form, jobRole: e.target.value })}
                className="w-full rounded-xl border border-border px-3 py-2.5 outline-none focus:border-primary"
              >
                {JOB_ROLES.map((r) => (
                  <option key={r}>{r}</option>
                ))}
              </select>
            </label>
            <label className="block text-sm">
              <span className="mb-1.5 block font-medium text-slate-700">Course</span>
              <select
                value={form.course}
                onChange={(e) => setForm({ ...form, course: e.target.value })}
                className="w-full rounded-xl border border-border px-3 py-2.5 outline-none focus:border-primary"
              >
                {COURSES.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </label>
            <label className="block text-sm">
              <span className="mb-1.5 block font-medium text-slate-700">Batch</span>
              <select
                value={form.batch}
                onChange={(e) => setForm({ ...form, batch: e.target.value })}
                className="w-full rounded-xl border border-border px-3 py-2.5 outline-none focus:border-primary"
              >
                {BATCHES.map((b) => (
                  <option key={b}>{b}</option>
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
                min={10}
                max={90}
                value={form.duration}
                onChange={(e) => setForm({ ...form, duration: Number(e.target.value) })}
                className="w-full rounded-xl border border-border px-3 py-2.5 outline-none focus:border-primary"
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1.5 block font-medium text-slate-700">Number of Questions</span>
              <input
                type="number"
                min={3}
                max={20}
                value={form.questionCount}
                onChange={(e) => setForm({ ...form, questionCount: Number(e.target.value) })}
                className="w-full rounded-xl border border-border px-3 py-2.5 outline-none focus:border-primary"
              />
            </label>
            <label className="sm:col-span-2 block text-sm">
              <span className="mb-1.5 block font-medium text-slate-700">Question Selection</span>
              <div className="flex flex-wrap gap-3">
                {(["Manual", "Question Bank", "AI Generated"] as QuestionSelectionMode[]).map(
                  (mode) => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => setForm({ ...form, questionSelection: mode })}
                      className={`rounded-xl border px-4 py-2 text-sm font-medium ${
                        form.questionSelection === mode
                          ? "border-primary bg-primary-light text-primary"
                          : "border-border text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      {mode}
                    </button>
                  )
                )}
              </div>
              {form.questionSelection === "AI Generated" && (
                <p className="mt-2 rounded-lg bg-indigo-50 px-3 py-2 text-xs text-indigo-700">
                  AI will simulate generating questions based on job role and difficulty. No external API is called.
                </p>
              )}
            </label>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-semibold text-slate-900">Evaluation Criteria</h2>
            <span
              className={`rounded-full px-3 py-1 text-xs font-semibold ${
                weightValid
                  ? "bg-emerald-50 text-emerald-700"
                  : "bg-rose-50 text-rose-700"
              }`}
            >
              Total Weight: {totalWeight}%
            </span>
          </div>
          {!weightValid && (
            <p className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
              Evaluation weights must total exactly 100%.
            </p>
          )}
          <div className="grid gap-4 sm:grid-cols-2">
            {(
              [
                ["technicalKnowledge", "Technical Knowledge"],
                ["relevance", "Answer Relevance"],
                ["communication", "Communication"],
                ["grammar", "Grammar"],
                ["fluency", "Fluency"],
                ["vocabulary", "Vocabulary"],
              ] as [keyof EvaluationWeights, string][]
            ).map(([key, label]) => (
              <label key={key} className="block text-sm">
                <span className="mb-1.5 flex justify-between font-medium text-slate-700">
                  {label}
                  <span className="text-primary">{weights[key]}%</span>
                </span>
                <input
                  type="range"
                  min={0}
                  max={50}
                  value={weights[key]}
                  onChange={(e) => updateWeight(key, Number(e.target.value))}
                  className="w-full accent-indigo-600"
                />
              </label>
            ))}
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={() => router.push("/interviews")}
            className="rounded-xl border border-border px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!weightValid || !form.name.trim()}
            className="rounded-xl bg-primary px-5 py-2.5 text-sm font-medium text-white hover:bg-primary-dark disabled:cursor-not-allowed disabled:opacity-50"
          >
            Save Interview
          </button>
        </div>
      </form>
    </AppShell>
  );
}
