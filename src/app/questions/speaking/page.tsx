"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { Search } from "@/components/common/Search";
import { Filters } from "@/components/common/Filters";
import { Modal } from "@/components/common/Modal";
import { StatusBadge } from "@/components/common/StatusBadge";
import { EmptyState } from "@/components/common/EmptyState";
import { speakingTopics as initialTopics } from "@/data/speakingTests";
import type { SpeakingTopic } from "@/data/speakingTests";
import { DIFFICULTIES } from "@/lib/utils";
import { Clock, Plus, Pencil, Trash2, Play } from "lucide-react";

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

const emptyForm = (): Omit<SpeakingTopic, "id"> => ({
  topic: "",
  category: "Personal",
  difficulty: "Beginner",
  duration: 3,
  prompts: [],
});

export default function SpeakingTopicsPage() {
  const [topics, setTopics] = useState<SpeakingTopic[]>(initialTopics);
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState({ category: "", difficulty: "" });
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm());
  const [promptsInput, setPromptsInput] = useState("");

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return topics.filter((item) => {
      const matchesSearch =
        !q ||
        item.topic.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q) ||
        item.prompts.some((p) => p.toLowerCase().includes(q));
      return (
        matchesSearch &&
        (!filters.category || item.category === filters.category) &&
        (!filters.difficulty || item.difficulty === filters.difficulty)
      );
    });
  }, [topics, search, filters]);

  const openAdd = () => {
    setEditingId(null);
    setForm(emptyForm());
    setPromptsInput("");
    setModalOpen(true);
  };

  const openEdit = (item: SpeakingTopic) => {
    setEditingId(item.id);
    setForm({
      topic: item.topic,
      category: item.category,
      difficulty: item.difficulty,
      duration: item.duration,
      prompts: item.prompts,
    });
    setPromptsInput(item.prompts.join("\n"));
    setModalOpen(true);
  };

  const handleSave = () => {
    const prompts = promptsInput
      .split("\n")
      .map((p) => p.trim())
      .filter(Boolean);
    const payload = { ...form, prompts };

    if (editingId) {
      setTopics((prev) =>
        prev.map((t) => (t.id === editingId ? { ...payload, id: editingId } : t))
      );
    } else {
      const nextId = `SPK${String(topics.length + 1).padStart(3, "0")}`;
      setTopics((prev) => [...prev, { ...payload, id: nextId }]);
    }
    setModalOpen(false);
  };

  const handleDelete = (id: string) => {
    if (confirm("Delete this speaking topic?")) {
      setTopics((prev) => prev.filter((t) => t.id !== id));
    }
  };

  return (
    <AppShell
      title="Speaking Test Topics"
      subtitle="Manage speaking assessment topics and prompts."
      actions={
        <button
          type="button"
          onClick={openAdd}
          className="flex items-center gap-2 rounded-xl bg-primary px-3 py-2 text-sm font-medium text-white hover:bg-primary-dark"
        >
          <Plus className="h-4 w-4" />
          Add Topic
        </button>
      }
    >
      <div className="space-y-4 animate-fade-in">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <Search
            value={search}
            onChange={setSearch}
            placeholder="Search speaking topics..."
            className="w-full lg:max-w-sm"
          />
          <Filters
            filters={[
              {
                key: "category",
                label: "Category",
                value: filters.category,
                options: SPEAKING_CATEGORIES.map((c) => ({ label: c, value: c })),
              },
              {
                key: "difficulty",
                label: "Difficulty",
                value: filters.difficulty,
                options: DIFFICULTIES.map((d) => ({ label: d, value: d })),
              },
            ]}
            onChange={(key, value) => setFilters((f) => ({ ...f, [key]: value }))}
          />
        </div>

        {filtered.length === 0 ? (
          <EmptyState title="No speaking topics found" />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {filtered.map((item) => (
              <div
                key={item.id}
                className="flex flex-col rounded-2xl border border-border bg-white p-5 shadow-sm transition hover:shadow-md"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <h3 className="text-base font-semibold text-slate-900">{item.topic}</h3>
                    <p className="mt-1 text-sm text-muted">{item.category}</p>
                  </div>
                  <StatusBadge status={item.difficulty} />
                </div>

                <div className="mt-3 flex items-center gap-1.5 text-sm text-slate-600">
                  <Clock className="h-4 w-4 text-indigo-500" />
                  {item.duration} min
                </div>

                <ul className="mt-3 flex-1 space-y-1 text-sm text-slate-600">
                  {item.prompts.slice(0, 3).map((p) => (
                    <li key={p} className="flex items-start gap-2">
                      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-indigo-400" />
                      {p}
                    </li>
                  ))}
                </ul>

                <div className="mt-4 flex gap-2">
                  <Link
                    href={`/speaking/session/${item.id}`}
                    className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-primary px-3 py-2 text-sm font-medium text-white hover:bg-primary-dark"
                  >
                    <Play className="h-4 w-4" />
                    Start
                  </Link>
                  <button
                    type="button"
                    onClick={() => openEdit(item)}
                    className="rounded-xl border border-border px-3 py-2 text-slate-600 hover:bg-slate-50"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(item.id)}
                    className="rounded-xl border border-rose-200 px-3 py-2 text-rose-600 hover:bg-rose-50"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingId ? "Edit Speaking Topic" : "Add Speaking Topic"}
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
              disabled={!form.topic.trim()}
              className="rounded-xl bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-dark disabled:opacity-50"
            >
              Save
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Topic</label>
            <input
              type="text"
              value={form.topic}
              onChange={(e) => setForm((f) => ({ ...f, topic: e.target.value }))}
              className="w-full rounded-xl border border-border px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Category</label>
              <select
                value={form.category}
                onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                className="w-full rounded-xl border border-border px-3 py-2 text-sm outline-none focus:border-primary"
              >
                {SPEAKING_CATEGORIES.map((c) => (
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
                  setForm((f) => ({
                    ...f,
                    difficulty: e.target.value as SpeakingTopic["difficulty"],
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
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Duration (min)
              </label>
              <input
                type="number"
                min={1}
                max={10}
                value={form.duration}
                onChange={(e) =>
                  setForm((f) => ({ ...f, duration: Number(e.target.value) || 3 }))
                }
                className="w-full rounded-xl border border-border px-3 py-2 text-sm outline-none focus:border-primary"
              />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Prompts (one per line)
            </label>
            <textarea
              value={promptsInput}
              onChange={(e) => setPromptsInput(e.target.value)}
              rows={4}
              placeholder="Tell us about your background&#10;Why did you choose this course?"
              className="w-full rounded-xl border border-border px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
          </div>
        </div>
      </Modal>
    </AppShell>
  );
}
