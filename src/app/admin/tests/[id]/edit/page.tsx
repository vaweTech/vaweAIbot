"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { TestBuilder } from "@/components/admin/TestBuilder";
import { SetupNotice, useAdminStatus } from "@/components/admin/SetupNotice";
import { ErrorState, LoadingState } from "@/components/common/LoadingState";
import { adminFetch } from "@/lib/adminClient";
import type { InterviewTest } from "@/types/interviewTest";
import { ArrowLeft } from "lucide-react";

export default function EditTestPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { status } = useAdminStatus();
  const [test, setTest] = useState<InterviewTest | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const data = await adminFetch<{ test: InterviewTest }>(`/api/admin/tests/${id}`);
        if (active) setTest(data.test);
      } catch (e) {
        if (active) setError(e instanceof Error ? e.message : "Could not load the test");
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
      title="Edit Interview Test"
      subtitle="Change the questions or their order. Students see the update immediately."
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
        {loading ? (
          <LoadingState message="Loading test..." />
        ) : error || !test ? (
          <ErrorState title="Could not load the test" description={error} />
        ) : (
          <TestBuilder testId={id} initial={test} disabled={Boolean(status && !status.firebase)} />
        )}
      </div>
    </AppShell>
  );
}
