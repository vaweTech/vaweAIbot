"use client";

import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { TestBuilder } from "@/components/admin/TestBuilder";
import { SetupNotice, useAdminStatus } from "@/components/admin/SetupNotice";
import { ArrowLeft } from "lucide-react";

export default function NewTestPage() {
  const { status } = useAdminStatus();
  const notReady = Boolean(status && !status.firebase);

  return (
    <AppShell
      title="Create Interview Test"
      subtitle="Pick a question type, choose questions from the database (or add new ones), then publish."
      actions={
        <Link
          href="/admin/tests"
          className="inline-flex items-center gap-2 rounded-xl border border-border px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Link>
      }
    >
      <div className="space-y-4 animate-fade-in">
        <SetupNotice status={status} />
        <TestBuilder disabled={notReady} />
      </div>
    </AppShell>
  );
}
