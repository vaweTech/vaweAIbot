"use client";

import { useCallback, useEffect, useState } from "react";
import { adminFetch, getAdminCode, setAdminCode, type AdminStatus } from "@/lib/adminClient";
import { AlertTriangle, CheckCircle2, KeyRound, ShieldAlert } from "lucide-react";

export function useAdminStatus() {
  const [status, setStatus] = useState<AdminStatus | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const data = await adminFetch<AdminStatus>("/api/admin/status");
      setStatus(data);
    } catch {
      setStatus(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { status, loading, refresh };
}

export function SetupNotice({ status }: { status: AdminStatus | null }) {
  const [code, setCode] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setCode(getAdminCode());
  }, []);

  if (!status) return null;

  const ready = status.firebase && status.embeddings;

  return (
    <div className="space-y-3">
      {!ready && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
            <div className="text-sm text-amber-900">
              <p className="font-semibold">Finish the setup before saving questions</p>
              <ul className="mt-2 space-y-1">
                <li>
                  {status.firebase ? "✓" : "✗"} Firestore credentials
                  {!status.firebase && (
                    <span className="text-amber-700">
                      {" "}
                      — add <code>FIREBASE_PROJECT_ID</code>,{" "}
                      <code>FIREBASE_CLIENT_EMAIL</code> and{" "}
                      <code>FIREBASE_PRIVATE_KEY</code> to <code>.env.local</code>
                    </span>
                  )}
                </li>
                <li>
                  {status.embeddings ? "✓" : "✗"} Embedding API key
                  {!status.embeddings && (
                    <span className="text-amber-700">
                      {" "}
                      — add <code>GOOGLE_AI_API_KEY</code> to <code>.env.local</code>
                    </span>
                  )}
                </li>
              </ul>
              <p className="mt-2 text-xs text-amber-700">
                See <code>.env.example</code> for the full list. Restart{" "}
                <code>npm run dev</code> after editing environment files.
              </p>
            </div>
          </div>
        </div>
      )}

      {status.error && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
          <p className="font-semibold">Firestore returned an error</p>
          <p className="mt-1 text-rose-700">{status.error}</p>
        </div>
      )}

      {ready && !status.error && (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          <span className="flex items-center gap-2 font-medium">
            <CheckCircle2 className="h-4 w-4" />
            Connected
          </span>
          <span className="text-emerald-700">Model: {status.embeddingModel}</span>
          {status.counts && (
            <span className="text-emerald-700">
              {status.counts.total} stored · {status.counts.approved} approved ·{" "}
              {status.counts.draft} draft
            </span>
          )}
        </div>
      )}

      {!status.requiresCode && (
        <div className="flex items-start gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
          <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
          <p>
            These endpoints are open. Set <code>ADMIN_ACCESS_CODE</code> in{" "}
            <code>.env.local</code> to require a code before anyone can write to the
            question bank.
          </p>
        </div>
      )}

      {status.requiresCode && (
        <div className="rounded-xl border border-slate-200 bg-white px-3 py-3">
          <label className="flex flex-wrap items-center gap-2 text-xs font-medium text-slate-600">
            <KeyRound className="h-4 w-4 text-slate-400" />
            Admin access code
            <input
              type="password"
              value={code}
              onChange={(e) => {
                setCode(e.target.value);
                setSaved(false);
              }}
              className="rounded-lg border border-border px-2 py-1.5 text-sm outline-none focus:border-primary"
            />
            <button
              type="button"
              onClick={() => {
                setAdminCode(code);
                setSaved(true);
              }}
              className="rounded-lg bg-slate-800 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-900"
            >
              Use code
            </button>
            {saved && <span className="text-emerald-600">Saved for this tab</span>}
          </label>
        </div>
      )}
    </div>
  );
}
