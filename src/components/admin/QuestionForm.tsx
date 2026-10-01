"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { adminFetch } from "@/lib/adminClient";
import { DIFFICULTIES, GD_CATEGORIES, INTERVIEW_CATEGORIES, JOB_ROLES } from "@/lib/utils";
import {
  emptyKeyPoint,
  emptyQuestionDraft,
  validateQuestionDraft,
  type ArgumentSide,
  type BankQuestionType,
  type DuplicateMatch,
  type KeyPointInput,
  type QuestionDraft,
} from "@/types/questionBank";
import { AlertTriangle, Copy, Plus, Save, Trash2 } from "lucide-react";

type FormKeyPoint = KeyPointInput & { synonymsText: string };

type FormState = Omit<QuestionDraft, "keyPoints" | "tags" | "botLines"> & {
  keyPoints: FormKeyPoint[];
  tagsText: string;
  botLinesText: string;
};

function toFormState(draft: QuestionDraft): FormState {
  const keyPoints = draft.keyPoints.length > 0 ? draft.keyPoints : [emptyKeyPoint()];
  return {
    ...draft,
    keyPoints: keyPoints.map((kp) => ({ ...kp, synonymsText: kp.synonyms.join(", ") })),
    tagsText: draft.tags.join(", "),
    botLinesText: draft.botLines.join("\n"),
  };
}

function toDraft(form: FormState): QuestionDraft {
  const splitList = (value: string) =>
    value
      .split(",")
      .map((v) => v.trim())
      .filter(Boolean);

  return {
    type: form.type,
    question: form.question,
    category: form.category,
    role: form.role,
    difficulty: form.difficulty,
    tags: splitList(form.tagsText),
    modelAnswer: form.modelAnswer,
    followUpQuestion: form.followUpQuestion,
    status: form.status,
    botLines: form.botLinesText
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean),
    keyPoints: form.keyPoints.map(({ synonymsText, ...kp }) => ({
      ...kp,
      synonyms: splitList(synonymsText),
    })),
  };
}

const inputClass =
  "w-full rounded-xl border border-border px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20";

interface QuestionFormProps {
  mode: "create" | "edit";
  questionId?: string;
  initialDraft?: QuestionDraft;
  disabled?: boolean;
}

export function QuestionForm({
  mode,
  questionId,
  initialDraft,
  disabled,
}: QuestionFormProps) {
  const router = useRouter();
  const [form, setForm] = useState<FormState>(() =>
    toFormState(initialDraft ?? emptyQuestionDraft())
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [duplicates, setDuplicates] = useState<DuplicateMatch[]>([]);

  const isGd = form.type === "gd";
  const categories = isGd ? GD_CATEGORIES : INTERVIEW_CATEGORIES;
  const problems = validateQuestionDraft(toDraft(form));

  const patch = (changes: Partial<FormState>) => setForm((f) => ({ ...f, ...changes }));

  const changeType = (type: BankQuestionType) => {
    setForm((f) => ({
      ...f,
      type,
      category: type === "gd" ? GD_CATEGORIES[0] : INTERVIEW_CATEGORIES[0],
      // GD arguments must declare a side; interview points must not.
      keyPoints: f.keyPoints.map((kp) => ({
        ...kp,
        side: type === "gd" ? (kp.side === "none" ? "for" : kp.side) : "none",
      })),
    }));
  };

  const patchKeyPoint = (id: string, changes: Partial<FormKeyPoint>) =>
    setForm((f) => ({
      ...f,
      keyPoints: f.keyPoints.map((kp) => (kp.id === id ? { ...kp, ...changes } : kp)),
    }));

  const addKeyPoint = () =>
    setForm((f) => ({
      ...f,
      keyPoints: [
        ...f.keyPoints,
        { ...emptyKeyPoint(), synonymsText: "", side: f.type === "gd" ? "for" : "none" },
      ],
    }));

  const removeKeyPoint = (id: string) =>
    setForm((f) => ({
      ...f,
      keyPoints: f.keyPoints.length > 1 ? f.keyPoints.filter((kp) => kp.id !== id) : f.keyPoints,
    }));

  const save = async (allowDuplicate = false) => {
    setSaving(true);
    setError("");
    setDuplicates([]);

    try {
      const draft = toDraft(form);
      const result = await adminFetch<{
        saved?: boolean;
        id?: string;
        duplicates?: DuplicateMatch[];
        __status: number;
      }>(
        mode === "edit" ? `/api/admin/questions/${questionId}` : "/api/admin/questions",
        {
          method: mode === "edit" ? "PUT" : "POST",
          body: JSON.stringify({ draft, allowDuplicate }),
        }
      );

      if (result.__status === 409 && result.duplicates?.length) {
        setDuplicates(result.duplicates);
        return;
      }

      router.push("/admin/questions");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save the question");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5">
      <section className="rounded-2xl border border-border bg-white p-5 shadow-sm">
        <h2 className="text-sm font-semibold text-slate-900">Question</h2>

        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Type</label>
            <select
              value={form.type}
              onChange={(e) => changeType(e.target.value as BankQuestionType)}
              className={inputClass}
            >
              <option value="technical">Technical</option>
              <option value="hr">HR / Behavioural</option>
              <option value="gd">Group Discussion</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Category</label>
            <select
              value={form.category}
              onChange={(e) => patch({ category: e.target.value })}
              className={inputClass}
            >
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Difficulty</label>
            <select
              value={form.difficulty}
              onChange={(e) =>
                patch({ difficulty: e.target.value as QuestionDraft["difficulty"] })
              }
              className={inputClass}
            >
              {DIFFICULTIES.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-4">
          <label className="mb-1 block text-sm font-medium text-slate-700">
            {isGd ? "Discussion topic" : "Question text"}
          </label>
          <textarea
            value={form.question}
            onChange={(e) => patch({ question: e.target.value })}
            rows={2}
            placeholder={
              isGd
                ? "Will Artificial Intelligence reduce employment or create new opportunities?"
                : "What is React and why is it used in modern web applications?"
            }
            className={inputClass}
          />
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Job role</label>
            <select
              value={form.role}
              onChange={(e) => patch({ role: e.target.value })}
              className={inputClass}
            >
              {["Any", ...JOB_ROLES].map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Tags (comma-separated)
            </label>
            <input
              type="text"
              value={form.tagsText}
              onChange={(e) => patch({ tagsText: e.target.value })}
              placeholder="react, frontend"
              className={inputClass}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Status</label>
            <select
              value={form.status}
              onChange={(e) => patch({ status: e.target.value as QuestionDraft["status"] })}
              className={inputClass}
            >
              <option value="draft">Draft — not served to students</option>
              <option value="approved">Approved — live</option>
              <option value="archived">Archived</option>
            </select>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-white p-5 shadow-sm">
        <h2 className="text-sm font-semibold text-slate-900">Model answer</h2>
        <p className="mt-1 text-xs text-muted">
          Write it the way a strong candidate would say it. Scoring compares meaning, not
          wording, so students never have to repeat this text.
        </p>
        <textarea
          value={form.modelAnswer}
          onChange={(e) => patch({ modelAnswer: e.target.value })}
          rows={5}
          className={`mt-3 ${inputClass}`}
        />

        <div className="mt-4">
          <label className="mb-1 block text-sm font-medium text-slate-700">
            Follow-up question (optional)
          </label>
          <input
            type="text"
            value={form.followUpQuestion}
            onChange={(e) => patch({ followUpQuestion: e.target.value })}
            placeholder="Asked automatically when the student misses most key points"
            className={inputClass}
          />
        </div>

        {isGd && (
          <div className="mt-4">
            <label className="mb-1 block text-sm font-medium text-slate-700">
              AI bot opening lines (one per line)
            </label>
            <textarea
              value={form.botLinesText}
              onChange={(e) => patch({ botLinesText: e.target.value })}
              rows={4}
              placeholder={"I believe AI will change the type of jobs rather than remove them.\nRepetitive roles may be affected first."}
              className={inputClass}
            />
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-border bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">
              {isGd ? "Expected arguments" : "Key points"}
            </h2>
            <p className="mt-1 max-w-xl text-xs text-muted">
              Each point is scored separately. Synonyms widen the match, so &ldquo;JS
              library&rdquo; still counts for a point written as &ldquo;JavaScript library
              for building user interfaces&rdquo;.
            </p>
          </div>
          <button
            type="button"
            onClick={addKeyPoint}
            className="inline-flex items-center gap-1.5 rounded-xl border border-border px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
          >
            <Plus className="h-3.5 w-3.5" />
            Add point
          </button>
        </div>

        <div className="mt-4 space-y-3">
          {form.keyPoints.map((kp, index) => (
            <div key={kp.id} className="rounded-xl border border-border bg-slate-50/60 p-3">
              <div className="flex items-start gap-2">
                <span className="mt-2 text-xs font-semibold text-slate-400">{index + 1}</span>
                <div className="min-w-0 flex-1 space-y-2">
                  <input
                    type="text"
                    value={kp.text}
                    onChange={(e) => patchKeyPoint(kp.id, { text: e.target.value })}
                    placeholder="Virtual DOM improves rendering performance"
                    className={`${inputClass} bg-white`}
                  />
                  <input
                    type="text"
                    value={kp.synonymsText}
                    onChange={(e) => patchKeyPoint(kp.id, { synonymsText: e.target.value })}
                    placeholder="Similar terms: vDOM, faster re-render, diffing"
                    className={`${inputClass} bg-white text-xs`}
                  />
                  <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600">
                    <label className="flex items-center gap-1.5">
                      Weight
                      <select
                        value={kp.weight}
                        onChange={(e) =>
                          patchKeyPoint(kp.id, { weight: Number(e.target.value) })
                        }
                        className="rounded-lg border border-border bg-white px-2 py-1 outline-none focus:border-primary"
                      >
                        <option value={1}>1 — minor</option>
                        <option value={2}>2 — normal</option>
                        <option value={3}>3 — central</option>
                      </select>
                    </label>
                    <label className="flex items-center gap-1.5">
                      <input
                        type="checkbox"
                        checked={kp.mustHave}
                        onChange={(e) => patchKeyPoint(kp.id, { mustHave: e.target.checked })}
                        className="h-3.5 w-3.5 rounded border-border"
                      />
                      Must have
                    </label>
                    {isGd && (
                      <label className="flex items-center gap-1.5">
                        Side
                        <select
                          value={kp.side}
                          onChange={(e) =>
                            patchKeyPoint(kp.id, { side: e.target.value as ArgumentSide })
                          }
                          className="rounded-lg border border-border bg-white px-2 py-1 outline-none focus:border-primary"
                        >
                          <option value="for">For</option>
                          <option value="against">Against</option>
                          <option value="example">Example</option>
                        </select>
                      </label>
                    )}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => removeKeyPoint(kp.id)}
                  disabled={form.keyPoints.length === 1}
                  className="rounded-lg border border-rose-200 p-1.5 text-rose-600 hover:bg-rose-50 disabled:opacity-40"
                  aria-label="Remove point"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {problems.length > 0 && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <p className="font-semibold">Fix these before saving</p>
          <ul className="mt-2 space-y-1">
            {problems.map((p) => (
              <li key={p}>• {p}</li>
            ))}
          </ul>
        </div>
      )}

      {duplicates.length > 0 && (
        <div className="rounded-2xl border border-orange-200 bg-orange-50 p-4 text-sm text-orange-900">
          <div className="flex items-start gap-2">
            <Copy className="mt-0.5 h-4 w-4 shrink-0" />
            <div>
              <p className="font-semibold">A very similar question already exists</p>
              <ul className="mt-2 space-y-1">
                {duplicates.map((d) => (
                  <li key={d.id}>
                    {Math.round(d.similarity * 100)}% match — {d.question}
                  </li>
                ))}
              </ul>
              <button
                type="button"
                onClick={() => void save(true)}
                className="mt-3 rounded-xl bg-orange-600 px-3 py-2 text-xs font-semibold text-white hover:bg-orange-700"
              >
                Save anyway
              </button>
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="flex items-start gap-2 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <p>{error}</p>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => void save(false)}
          disabled={saving || problems.length > 0 || disabled}
          className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary-dark disabled:opacity-50"
        >
          <Save className="h-4 w-4" />
          {saving
            ? "Generating embeddings…"
            : mode === "edit"
            ? "Save changes"
            : "Save question"}
        </button>
        <Link
          href="/admin/questions"
          className="rounded-xl border border-border px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
        >
          Cancel
        </Link>
        {saving && (
          <span className="text-xs text-muted">
            Embedding the question, the answer and each key point…
          </span>
        )}
      </div>
    </div>
  );
}
