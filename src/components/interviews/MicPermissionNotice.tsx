"use client";

import { useState } from "react";
import { Mic, MicOff, RefreshCw } from "lucide-react";
import { MicSettingsButton } from "@/components/interviews/MicSettingsButton";
import type { MicPermission } from "@/lib/speech";
import { cn } from "@/lib/utils";

export type MicStatus = MicPermission | "checking" | "unsupported";

/** Mic states where the student cannot answer at all. */
export function micBlocked(status: MicStatus): boolean {
  return status === "denied" || status === "no-device" || status === "unsupported";
}

const BLOCKED_COPY: Record<"denied" | "no-device" | "unsupported", { title: string; steps: string[] }> = {
  denied: {
    title: "Microphone is blocked. Allow it to answer.",
    steps: [
      "Click the lock icon at the left of the address bar and set Microphone to Allow.",
      "If it already says Allow, turn on Windows Settings > Privacy & security > Microphone for your browser.",
      "Press Check again.",
    ],
  },
  "no-device": {
    title: "No microphone found.",
    steps: [
      "Plug in a headset or microphone, or turn on your laptop's built-in mic.",
      "Check it is not disabled in Windows sound settings, then press Check again.",
    ],
  },
  unsupported: {
    title: "Speech-to-text needs Google Chrome or Microsoft Edge.",
    steps: ["Open this page in Chrome or Edge on a computer."],
  },
};

/** One-line warning about the microphone; renders nothing when the mic is fine. */
export function MicPermissionNotice({
  status,
  onRetry,
  checking,
  className,
}: {
  status: MicStatus;
  onRetry: () => void;
  /** True while a permission request is in flight. */
  checking?: boolean;
  className?: string;
}) {
  const [showSteps, setShowSteps] = useState(false);

  if (status === "prompt") {
    return (
      <div
        className={cn(
          "flex flex-wrap items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2",
          className
        )}
      >
        <Mic className="h-4 w-4 shrink-0 text-amber-600" />
        <p className="min-w-0 flex-1 text-xs text-amber-900">
          <span className="font-semibold">Microphone not allowed yet.</span> Choose Allow when the browser asks.
        </p>
        <button
          type="button"
          onClick={onRetry}
          disabled={checking}
          className="rounded-lg bg-amber-500 px-2.5 py-1 text-xs font-semibold text-white hover:bg-amber-600 disabled:opacity-60"
        >
          {checking ? "Waiting…" : "Allow microphone"}
        </button>
      </div>
    );
  }

  if (!micBlocked(status)) return null;
  const copy = BLOCKED_COPY[status as keyof typeof BLOCKED_COPY];

  return (
    <div role="alert" className={cn("rounded-xl border border-rose-200 bg-rose-50 px-3 py-2", className)}>
      <div className="flex flex-wrap items-center gap-2">
        <MicOff className="h-4 w-4 shrink-0 text-rose-600" />
        <p className="min-w-0 flex-1 text-xs text-rose-900">
          <span className="font-semibold">{copy.title}</span>{" "}
          <button
            type="button"
            onClick={() => setShowSteps((v) => !v)}
            className="font-medium text-rose-700 underline underline-offset-2"
          >
            {showSteps ? "Hide" : "How?"}
          </button>
        </p>
        {status === "denied" && <MicSettingsButton onRetry={onRetry} checking={checking} />}
        {status === "no-device" && (
          <button
            type="button"
            onClick={onRetry}
            disabled={checking}
            className="inline-flex items-center gap-1 rounded-lg border border-rose-200 bg-white px-2.5 py-1 text-xs font-semibold text-rose-700 hover:bg-rose-100 disabled:opacity-60"
          >
            <RefreshCw className={cn("h-3 w-3", checking && "animate-spin")} /> Check again
          </button>
        )}
      </div>
      {showSteps && (
        <ol className="mt-1.5 list-decimal space-y-0.5 pl-10 text-[11px] text-rose-800">
          {copy.steps.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>
      )}
    </div>
  );
}
