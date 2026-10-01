"use client";

import { useMemo, useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { Search } from "@/components/common/Search";
import { Filters } from "@/components/common/Filters";
import { Modal } from "@/components/common/Modal";
import { StatusBadge } from "@/components/common/StatusBadge";
import { EmptyState } from "@/components/common/EmptyState";
import { interviewQuestions as initialQuestions } from "@/data/interviewQuestions";
import type { InterviewQuestion } from "@/types/interview";
import { DIFFICULTIES, INTERVIEW_CATEGORIES, JOB_ROLES } from "@/lib/utils";
import { Plus, Pencil, Trash2 } from "lucide-react";

const emptyForm = (): Omit<InterviewQuestion, "id"> => ({
  question: "",
  category: "Java",
  jobRole: "Java Developer",
  difficulty: "Beginner",
  expectedTopics: [],
  expectedAnswerPoints: [],
  keywords: [],
  status: "active",
});

export default function InterviewQuestionsPage() {
  const [questions, setQuestions] = useState<InterviewQuestion[]>(initialQuestions);
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState({ category: "", difficulty: "", status: "" });
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm());
  const [topicsInput, setTopicsInput] = useState("");

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return questions.filter((item) => {
      const matchesSearch =
        !q ||
        item.question.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q) ||
        item.jobRole.toLowerCase().includes(q) ||
        item.expectedTopics.some((t) => t.toLowerCase().includes(q));
      return (
        matchesSearch &&
        (!filters.category || item.category === filters.category) &&
        (!filters.difficulty || item.difficulty === filters.difficulty) &&
        (!filters.status || item.status === filters.status)
      );
    });
  }, [questions, search, filters]);

  const openAdd = () => {
    setEditingId(null);
    setForm(emptyForm());
    setTopicsInput("");
    setModalOpen(true);
  };

  const openEdit = (item: InterviewQuestion) => {
    setEditingId(item.id);
    setForm({
      question: item.question,
      category: item.category,
      jobRole: item.jobRole,
      difficulty: item.difficulty,
      expectedTopics: item.expectedTopics,
      expectedAnswerPoints: item.expectedAnswerPoints,
      keywords: item.keywords,
      status: item.status,
    });
    setTopicsInput(item.expectedTopics.join(", "));
    setModalOpen(true);
  };

  const handleSave = () => {
    const expectedTopics = topicsInput
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);
    const payload = { ...form, expectedTopics };

    if (editingId) {
      setQuestions((prev) =>
        prev.map((q) => (q.id === editingId ? { ...payload, id: editingId } : q))
      );
    } else {
      const nextId = `IQ${String(questions.length + 1).padStart(3, "0")}`;
      setQuestions((prev) => [...prev, { ...payload, id: nextId }]);
    }
    setModalOpen(false);
  };

  const handleDelete = (id: string) => {
    if (confirm("Delete this question?")) {
      setQuestions((prev) => prev.filter((q) => q.id !== id));
    }
  };

  return (
    <AppShell
      title="Interview Question Bank"
      subtitle="Manage technical and HR interview questions for AI mock interviews."
      actions={
        <button
          type="button"
          onClick={openAdd}
          className="flex items-center gap-2 rounded-xl bg-primary px-3 py-2 text-sm font-medium text-white hover:bg-primary-dark"
        >
          <Plus className="h-4 w-4" />
          Add Question
        </button>
      }
    >
      <div className="space-y-4 animate-fade-in">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <Search
            value={search}
            onChange={setSearch}
            placeholder="Search questions..."
            className="w-full lg:max-w-sm"
          />
          <Filters
            filters={[
              {
                key: "category",
                label: "Category",
                value: filters.category,
                options: INTERVIEW_CATEGORIES.map((c) => ({ label: c, value: c })),
              },
              {
                key: "difficulty",
                label: "Difficulty",
                value: filters.difficulty,
                options: DIFFICULTIES.map((d) => ({ label: d, value: d })),
              },
              {
                key: "status",
                label: "Status",
                value: filters.status,
                options: [
                  { label: "Active", value: "active" },
                  { label: "Inactive", value: "inactive" },
                ],
              },
            ]}
            onChange={(key, value) => setFilters((f) => ({ ...f, [key]: value }))}
          />
        </div>

        {filtered.length === 0 ? (
          <EmptyState title="No questions found" />
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-border bg-white shadow-sm">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-border bg-slate-50 text-xs uppercase tracking-wide text-muted">
                <tr>
                  <th className="px-4 py-3 font-semibold">Question</th>
                  <th className="px-4 py-3 font-semibold">Category</th>
                  <th className="px-4 py-3 font-semibold">Job Role</th>
                  <th className="px-4 py-3 font-semibold">Difficulty</th>
                  <th className="px-4 py-3 font-semibold">Expected Topics</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/80">
                    <td className="max-w-xs px-4 py-3 font-medium text-slate-900">
                      {item.question}
                    </td>
                    <td className="px-4 py-3 text-slate-600">{item.category}</td>
                    <td className="px-4 py-3 text-slate-600">{item.jobRole}</td>
                    <td className="px-4 py-3">
                      <StatusBadge status={item.difficulty} />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {item.expectedTopics.slice(0, 3).map((t) => (
                          <span
                            key={t}
                            className="rounded-full bg-indigo-50 px-2 py-0.5 text-xs text-indigo-700"
                          >
                            {t}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={item.status} />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => openEdit(item)}
                          className="inline-flex items-center gap-1 rounded-lg border border-border px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
                        >
                          <Pencil className="h-3 w-3" />
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(item.id)}
                          className="inline-flex items-center gap-1 rounded-lg border border-rose-200 px-2.5 py-1.5 text-xs font-medium text-rose-600 hover:bg-rose-50"
                        >
                          <Trash2 className="h-3 w-3" />
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingId ? "Edit Question" : "Add Question"}
        size="lg"
        footer={
          <>
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="rounded-xl border border-border px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={!form.question.trim()}
              className="rounded-xl bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-dark disabled:opacity-50"
            >
              Save
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Question</label>
            <textarea
              value={form.question}
              onChange={(e) => setForm((f) => ({ ...f, question: e.target.value }))}
              rows={3}
              className="w-full rounded-xl border border-border px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Category</label>
              <select
                value={form.category}
                onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                className="w-full rounded-xl border border-border px-3 py-2 text-sm outline-none focus:border-primary"
              >
                {INTERVIEW_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Job Role</label>
              <select
                value={form.jobRole}
                onChange={(e) => setForm((f) => ({ ...f, jobRole: e.target.value }))}
                className="w-full rounded-xl border border-border px-3 py-2 text-sm outline-none focus:border-primary"
              >
                {[...JOB_ROLES, "Any"].map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Difficulty</label>
              <select
                value={form.difficulty}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    difficulty: e.target.value as InterviewQuestion["difficulty"],
                  }))
                }
                className="w-full rounded-xl border border-border px-3 py-2 text-sm outline-none focus:border-primary"
              >
                {DIFFICULTIES.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Status</label>
              <select
                value={form.status}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    status: e.target.value as InterviewQuestion["status"],
                  }))
                }
                className="w-full rounded-xl border border-border px-3 py-2 text-sm outline-none focus:border-primary"
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Expected Topics (comma-separated)
            </label>
            <input
              type="text"
              value={topicsInput}
              onChange={(e) => setTopicsInput(e.target.value)}
              placeholder="e.g. Components, Virtual DOM, UI"
              className="w-full rounded-xl border border-border px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
          </div>
        </div>
      </Modal>
    </AppShell>
  );
}
