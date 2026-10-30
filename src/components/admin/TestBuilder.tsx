"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Modal } from "@/components/common/Modal";
import { StatusBadge } from "@/components/common/StatusBadge";
import { QuestionForm } from "@/components/admin/QuestionForm";
import { adminFetch } from "@/lib/adminClient";
import { answerMarksShare } from "@/lib/rubric";
import { DIFFICULTIES, cn } from "@/lib/utils";
import { emptyQuestionDraft, type QuestionSummary } from "@/types/questionBank";
import {
  DEFAULT_TEST_QUESTIONS,
  MAX_TEST_QUESTIONS,
  TEST_TYPE_LABELS,
  typeAllowed,
  validateTestDraft,
  type InterviewTest,
  type TestDraft,
  type TestQuestion,
  type TestQuestionType,
  type TestStatus,
} from "@/types/interviewTest";
import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  Check,
  Minus,
  Plus,
  Rocket,
  Save,
  Search,
  Shuffle,
  X,
} from "lucide-react";

const inputClass =
  "w-full rounded-xl border border-border px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20";

const TYPE_OPTIONS: TestQuestionType[] = ["technical", "hr", "mixed"];

/** How students will be graded, shown under the type picker. */
const TYPE_GRADING_NOTE: Record<TestQuestionType, string> = {
  technical: `Graded on technical correctness, required concepts and reasoning. Overall = ${answerMarksShare("technical")}% answer marks + ${100 - answerMarksShare("technical")}% English & delivery.`,
  hr: `No technical score. Graded like an HR interviewer: relevance, expected points, real examples (STAR) and structure. Overall = ${answerMarksShare("hr")}% answer marks + ${100 - answerMarksShare("hr")}% communication & English.`,
  mixed: "Each question is graded by its own type: technical questions for correctness, HR questions for relevance, examples and structure.",
};

async function fetchPool(): Promise<QuestionSummary[]> {
  const data = await adminFetch<{ questions: QuestionSummary[] }>("/api/admin/questions");
  return data.questions ?? [];
}

function toTestQuestion(q: QuestionSummary): TestQuestion {
  return {
    id: q.id,
    question: q.question,
    type: q.type,
    category: q.category,
    difficulty: q.difficulty,
    status: q.status,
  };
}

interface TestBuilderProps {
  testId?: string;
  initial?: InterviewTest;
  disabled?: boolean;
}

export function TestBuilder({ testId, initial, disabled }: TestBuilderProps) {
  const router = useRouter();
  const [title, setTitle] = useState(initial?.title ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [questionType, setQuestionType] = useState<TestQuestionType>(
    initial?.questionType ?? "technical"
  );
  const [selected, setSelected] = useState<TestQuestion[]>(initial?.questions ?? []);
  const [totalQuestions, setTotalQuestions] = useState(
    initial?.questionCount || DEFAULT_TEST_QUESTIONS
  );

  const [pool, setPool] = useState<QuestionSummary[]>([]);
  const [poolLoading, setPoolLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [difficulty, setDifficulty] = useState("");
  const [adding, setAdding] = useState(false);
  const [saving, setSaving] = useState<TestStatus | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    fetchPool()
      .then((list) => {
        if (active) setPool(list);
      })
      .catch((e) => {
        if (active) setError(e instanceof Error ? e.message : "Could not load the question bank");
      })
      .finally(() => {
        if (active) setPoolLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const selectedIds = useMemo(() => new Set(selected.map((q) => q.id)), [selected]);

  /** Questions this test type may use, before search/filter narrowing. */
  const eligible = useMemo(
    () => pool.filter((q) => typeAllowed(questionType, q.type) && q.status !== "archived"),
    [pool, questionType]
  );

  const categories = useMemo(
    () => [...new Set(eligible.map((q) => q.category).filter(Boolean))].sort(),
    [eligible]
  );

  const visible = useMemo(() => {
    const term = search.trim().toLowerCase();
    return eligible.filter(
      (q) =>
        (!term ||
          q.question.toLowerCase().includes(term) ||
          q.tags.some((t) => t.toLowerCase().includes(term))) &&
        (!category || q.category === category) &&
        (!difficulty || q.difficulty === difficulty)
    );
  }, [eligible, search, category, difficulty]);

  const changeType = (next: TestQuestionType) => {
    setQuestionType(next);
    setCategory("");
    // Drop picks that the new type no longer allows.
    setSelected((prev) => prev.filter((q) => typeAllowed(next, q.type)));
  };

  const toggle = (q: QuestionSummary) => {
    if (q.keyPointCount === 0) return;
    setSelected((prev) => {
      if (prev.some((s) => s.id === q.id)) return prev.filter((s) => s.id !== q.id);
      if (prev.length >= totalQuestions) return prev;
      return [...prev, toTestQuestion(q)];
    });
  };

  const remaining = Math.max(0, totalQuestions - selected.length);

  const pickRandom = () => {
    const candidates = visible.filter((q) => q.keyPointCount > 0 && !selectedIds.has(q.id));
    for (let i = candidates.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
    }
    setSelected((prev) => [...prev, ...candidates.slice(0, remaining).map(toTestQuestion)]);
  };

  const changeTotal = (value: number) => {
    if (!Number.isFinite(value)) return;
    setTotalQuestions(Math.min(MAX_TEST_QUESTIONS, Math.max(1, Math.round(value))));
  };

  const move = (index: number, delta: number) => {
    setSelected((prev) => {
      const target = index + delta;
      if (target < 0 || target >= prev.length) return prev;
      const next = [...prev];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };

  const onQuestionCreated = async (id: string) => {
    setAdding(false);
    let list: QuestionSummary[];
    try {
      list = await fetchPool();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not reload the question bank");
      return;
    }
    setPool(list);
    const created = list.find((q) => q.id === id);
    if (created && !selectedIds.has(id) && typeAllowed(questionType, created.type)) {
      setSelected((prev) => [...prev, toTestQuestion(created)]);
    }
  };

  const draft: TestDraft = {
    title,
    description,
    questionType,
    totalQuestions,
    questionIds: selected.map((q) => q.id),
    status: initial?.status ?? "draft",
  };
  const problems = validateTestDraft(draft);
  const draftCount = selected.filter((q) => q.status === "draft").length;

  const difficultyMix = DIFFICULTIES.map((d) => ({
    label: d,
    count: selected.filter((q) => q.difficulty === d).length,
  })).filter((d) => d.count > 0);

  const save = async (status: TestStatus) => {
    setSaving(status);
    setError("");
    try {
      await adminFetch(testId ? `/api/admin/tests/${testId}` : "/api/admin/tests", {
        method: testId ? "PUT" : "POST",
        body: JSON.stringify({ draft: { ...draft, status } }),
      });
      router.push("/admin/tests");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save the test");
    } finally {
      setSaving(null);
    }
  };

  return (
    <div className="grid gap-5 lg:grid-cols-5">
      <div className="space-y-5 lg:col-span-3">
        <section className="rounded-2xl border border-border bg-white p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-900">1. Test details</h2>
          <div className="mt-4 space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Title</label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. React Fundamentals — Round 1"
                className={inputClass}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Instructions for students <span className="font-normal text-muted">(optional)</span>
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                placeholder="What this test covers and how long it takes"
                className={inputClass}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Question type</label>
              <div className="grid grid-cols-3 gap-2">
                {TYPE_OPTIONS.map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => changeType(t)}
                    className={cn(
                      "rounded-xl border px-3 py-2 text-sm font-medium transition",
                      questionType === t
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border text-slate-600 hover:bg-slate-50"
                    )}
                  >
                    {TEST_TYPE_LABELS[t]}
                  </button>
                ))}
              </div>
              <p className="mt-2 text-xs text-slate-500">{TYPE_GRADING_NOTE[questionType]}</p>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-border bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-sm font-semibold text-slate-900">
              2. Choose questions from the database
            </h2>
            <button
              type="button"
              onClick={() => setAdding(true)}
              disabled={disabled}
              className="inline-flex items-center gap-1.5 rounded-xl border border-primary/30 px-3 py-1.5 text-xs font-semibold text-primary hover:bg-primary/5 disabled:opacity-50"
            >
              <Plus className="h-3.5 w-3.5" />
              Add new question
            </button>
          </div>

          <div className="mt-4 grid gap-2 sm:grid-cols-3">
            <div className="relative sm:col-span-3">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search questions or tags…"
                className={cn(inputClass, "pl-9")}
              />
            </div>
            <select value={category} onChange={(e) => setCategory(e.target.value)} className={inputClass}>
              <option value="">All categories</option>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <select
              value={difficulty}
              onChange={(e) => setDifficulty(e.target.value)}
              className={inputClass}
            >
              <option value="">All difficulties</option>
              {DIFFICULTIES.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={pickRandom}
              disabled={remaining === 0}
              title={remaining === 0 ? "The test is full — raise the total to add more" : undefined}
              className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-slate-900 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-800 disabled:opacity-40"
            >
              <Shuffle className="h-3.5 w-3.5" />
              {remaining > 0 ? `Fill ${remaining} randomly` : "Test is full"}
            </button>
          </div>

          <p className="mt-3 text-xs text-muted">
            {poolLoading
              ? "Loading questions…"
              : `${visible.length} of ${eligible.length} ${TEST_TYPE_LABELS[questionType]} questions`}
          </p>

          <ul className="mt-2 max-h-[460px] divide-y divide-border overflow-y-auto rounded-xl border border-border scrollbar-thin">
            {!poolLoading && visible.length === 0 && (
              <li className="px-4 py-10 text-center text-sm text-muted">
                No questions match. Clear the filters or add a new question.
              </li>
            )}
            {visible.map((q) => {
              const isSelected = selectedIds.has(q.id);
              const unusable = q.keyPointCount === 0;
              const full = !isSelected && remaining === 0;
              return (
                <li key={q.id}>
                  <button
                    type="button"
                    onClick={() => toggle(q)}
                    disabled={unusable || full}
                    title={
                      unusable
                        ? "Add key points to this question before using it"
                        : full
                          ? "The test is full — raise Total questions to add more"
                          : undefined
                    }
                    className={cn(
                      "flex w-full items-start gap-3 px-4 py-3 text-left transition",
                      isSelected ? "bg-primary/5" : "hover:bg-slate-50",
                      (unusable || full) && "cursor-not-allowed opacity-50"
                    )}
                  >
                    <span
                      className={cn(
                        "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border",
                        isSelected ? "border-primary bg-primary text-white" : "border-slate-300"
                      )}
                    >
                      {isSelected && <Check className="h-3 w-3" />}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-medium text-slate-800">{q.question}</span>
                      <span className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px] text-muted">
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 uppercase">{q.type}</span>
                        <span>{q.category}</span>
                        <StatusBadge status={q.difficulty} className="px-2 py-0 text-[10px]" />
                        {q.status === "draft" && (
                          <StatusBadge status="draft" className="px-2 py-0 text-[10px]" />
                        )}
                        {unusable && <span className="text-rose-600">no key points</span>}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      </div>

      <aside className="lg:col-span-2">
        <div className="space-y-4 lg:sticky lg:top-24">
          <section className="rounded-2xl border border-border bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-900">3. Test order</h2>
              <span
                className={cn(
                  "rounded-full px-2.5 py-0.5 text-xs font-semibold",
                  selected.length === totalQuestions
                    ? "bg-emerald-50 text-emerald-700"
                    : selected.length > totalQuestions
                      ? "bg-rose-50 text-rose-700"
                      : "bg-primary/10 text-primary"
                )}
              >
                {selected.length}/{totalQuestions}
              </span>
            </div>

            <div className="mt-3 flex items-center justify-between gap-3 rounded-xl bg-slate-50 px-3 py-2">
              <label htmlFor="total-questions" className="text-xs font-medium text-slate-700">
                Total questions
              </label>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => changeTotal(totalQuestions - 1)}
                  disabled={totalQuestions <= 1}
                  className="flex h-7 w-7 items-center justify-center rounded-lg border border-border bg-white text-slate-600 hover:bg-slate-100 disabled:opacity-40"
                  aria-label="Fewer questions"
                >
                  <Minus className="h-3.5 w-3.5" />
                </button>
                <input
                  id="total-questions"
                  type="number"
                  min={1}
                  max={MAX_TEST_QUESTIONS}
                  value={totalQuestions}
                  onChange={(e) => changeTotal(Number(e.target.value))}
                  className="h-7 w-14 rounded-lg border border-border bg-white text-center text-sm font-semibold text-slate-800 outline-none focus:border-primary"
                />
                <button
                  type="button"
                  onClick={() => changeTotal(totalQuestions + 1)}
                  disabled={totalQuestions >= MAX_TEST_QUESTIONS}
                  className="flex h-7 w-7 items-center justify-center rounded-lg border border-border bg-white text-slate-600 hover:bg-slate-100 disabled:opacity-40"
                  aria-label="More questions"
                >
                  <Plus className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            {selected.length === 0 ? (
              <p className="mt-4 rounded-xl border border-dashed border-border px-4 py-8 text-center text-sm text-muted">
                Tick {totalQuestions} question{totalQuestions > 1 ? "s" : ""} on the left, or use
                &ldquo;Fill randomly&rdquo;.
              </p>
            ) : (
              <ol className="mt-4 space-y-2">
                {selected.map((q, index) => (
                  <li
                    key={q.id}
                    className="flex items-start gap-2 rounded-xl border border-border bg-slate-50/60 p-2.5"
                  >
                    <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-white text-xs font-bold text-slate-700 shadow-sm">
                      {index + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium leading-snug text-slate-800">{q.question}</p>
                      <p className="mt-0.5 text-[10px] text-muted">
                        {q.type.toUpperCase()} · {q.category} · {q.difficulty}
                        {q.status === "draft" && " · draft"}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center">
                      <button
                        type="button"
                        onClick={() => move(index, -1)}
                        disabled={index === 0}
                        className="rounded-md p-1 text-slate-400 hover:bg-white hover:text-slate-700 disabled:opacity-30"
                        aria-label="Move up"
                      >
                        <ArrowUp className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => move(index, 1)}
                        disabled={index === selected.length - 1}
                        className="rounded-md p-1 text-slate-400 hover:bg-white hover:text-slate-700 disabled:opacity-30"
                        aria-label="Move down"
                      >
                        <ArrowDown className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setSelected((prev) => prev.filter((s) => s.id !== q.id))}
                        className="rounded-md p-1 text-slate-400 hover:bg-white hover:text-rose-600"
                        aria-label="Remove"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </li>
                ))}
              </ol>
            )}

            {difficultyMix.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-1.5">
                {difficultyMix.map((d) => (
                  <StatusBadge key={d.label} status={d.label} className="text-[11px]" />
                ))}
                <span className="text-[11px] text-muted">
                  {difficultyMix.map((d) => `${d.count} ${d.label.toLowerCase()}`).join(" · ")}
                </span>
              </div>
            )}
          </section>

          {draftCount > 0 && (
            <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
              {draftCount} selected question{draftCount > 1 ? "s are" : " is"} still a draft in the
              question bank. They will still be asked in this test.
            </p>
          )}

          {(problems.length > 0 || error) && (
            <div className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-800">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <div>{error || problems.join(" · ")}</div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => void save("draft")}
              disabled={disabled || saving !== null || problems.length > 0}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              <Save className="h-4 w-4" />
              {saving === "draft" ? "Saving…" : "Save draft"}
            </button>
            <button
              type="button"
              onClick={() => void save("published")}
              disabled={disabled || saving !== null || problems.length > 0}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary-dark disabled:opacity-50"
            >
              <Rocket className="h-4 w-4" />
              {saving === "published" ? "Publishing…" : "Publish"}
            </button>
          </div>
          <p className="text-center text-[11px] text-muted">
            Published tests appear in the student interview panel.
          </p>
        </div>
      </aside>

      <Modal open={adding} onClose={() => setAdding(false)} title="Add a new question" size="xl">
        <QuestionForm
          mode="create"
          initialDraft={{
            ...emptyQuestionDraft(),
            type: questionType === "hr" ? "hr" : "technical",
            category: questionType === "hr" ? "HR" : "React",
            status: "approved",
          }}
          onSaved={(id) => void onQuestionCreated(id)}
          onCancel={() => setAdding(false)}
        />
      </Modal>
    </div>
  );
}
