"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { QuestionForm } from "@/components/admin/QuestionForm";
import { SetupNotice, useAdminStatus } from "@/components/admin/SetupNotice";
import { ErrorState, LoadingState } from "@/components/common/LoadingState";
import { adminFetch } from "@/lib/adminClient";
import type { KeyPointInput, QuestionDraft, QuestionSummary } from "@/types/questionBank";
import { ArrowLeft } from "lucide-react";

type LoadedQuestion = {
  summary: QuestionSummary;
  answerKey: {
    modelAnswer: string;
    botLines: string[];
    keyPoints: KeyPointInput[];
  };
};

export default function EditQuestionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { status } = useAdminStatus();
  const [draft, setDraft] = useState<QuestionDraft | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    void (async () => {
      try {
        const data = await adminFetch<LoadedQuestion>(`/api/admin/questions/${id}`);
        if (!active) return;
        setDraft({
          type: data.summary.type,
          question: data.summary.question,
          category: data.summary.category,
          role: data.summary.role,
          difficulty: data.summary.difficulty,
          tags: data.summary.tags,
          status: data.summary.status,
          followUpQuestion: data.summary.followUpQuestion,
          modelAnswer: data.answerKey.modelAnswer,
          keyPoints: data.answerKey.keyPoints,
          botLines: data.answerKey.botLines,
        });
      } catch (e) {
        if (active) setError(e instanceof Error ? e.message : "Could not load question");
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [id]);

  return (
    <AppShell
      title="Edit Question"
      subtitle="Saving re-generates embeddings and bumps the version."
      actions={
        <Link
          href="/admin/questions"
          className="inline-flex items-center gap-2 rounded-xl border border-border px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Link>
      }
    >
      <div className="mx-auto max-w-4xl space-y-4 animate-fade-in">
        <SetupNotice status={status} />
        {loading ? (
          <LoadingState message="Loading question..." />
        ) : error || !draft ? (
          <ErrorState title="Could not load question" description={error} />
        ) : (
          <QuestionForm mode="edit" questionId={id} initialDraft={draft} />
        )}
      </div>
    </AppShell>
  );
}
