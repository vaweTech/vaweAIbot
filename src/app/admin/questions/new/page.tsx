"use client";

import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { QuestionForm } from "@/components/admin/QuestionForm";
import { SetupNotice, useAdminStatus } from "@/components/admin/SetupNotice";
import { ArrowLeft } from "lucide-react";

export default function NewQuestionPage() {
  const { status } = useAdminStatus();
  const notReady = Boolean(status && (!status.firebase || !status.embeddings));

  return (
    <AppShell
      title="Add Question"
      subtitle="Saving generates embeddings for the question, the model answer and every key point."
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
        <QuestionForm mode="create" disabled={notReady} />
      </div>
    </AppShell>
  );
}
