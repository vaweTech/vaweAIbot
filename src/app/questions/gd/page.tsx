"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { Search } from "@/components/common/Search";
import { Filters } from "@/components/common/Filters";
import { EmptyState } from "@/components/common/EmptyState";
import { GDTopicCard } from "@/components/gd/GDTopicCard";
import { gdTopics } from "@/data/gdTopics";
import { gdSessions } from "@/data/gdSessions";
import { DIFFICULTIES, GD_CATEGORIES } from "@/lib/utils";

/** Opens a recorded session for the topic, or the live GD room when none exists. */
function getSessionHref(topicId: string): string {
  const match = gdSessions.find((s) => s.topicId === topicId);
  return match ? `/gd/session/${match.id}` : "/prototype/gd";
}

export default function GDTopicsPage() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState({ category: "", difficulty: "" });

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return gdTopics.filter((item) => {
      const matchesSearch =
        !q ||
        item.topic.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q);
      return (
        matchesSearch &&
        (!filters.category || item.category === filters.category) &&
        (!filters.difficulty || item.difficulty === filters.difficulty)
      );
    });
  }, [search, filters]);

  return (
    <AppShell
      title="Group Discussion Topics"
      subtitle="Browse and start AI-powered group discussion sessions."
    >
      <div className="space-y-4 animate-fade-in">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <Search
            value={search}
            onChange={setSearch}
            placeholder="Search GD topics..."
            className="w-full lg:max-w-sm"
          />
          <Filters
            filters={[
              {
                key: "category",
                label: "Category",
                value: filters.category,
                options: GD_CATEGORIES.map((c) => ({ label: c, value: c })),
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
          <EmptyState title="No GD topics found" />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {filtered.map((topic) => (
              <GDTopicCard
                key={topic.id}
                topic={topic}
                onStart={() => router.push(getSessionHref(topic.id))}
              />
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
