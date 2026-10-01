"use client";

import { AlertTriangle, Check, CircleDashed, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { KeyPointResult, SemanticResult } from "@/lib/semanticScoring";

const STATUS_STYLE = {
  covered: {
    icon: Check,
    row: "border-emerald-100 bg-emerald-50/60",
    badge: "bg-emerald-100 text-emerald-700",
    label: "Covered",
  },
  partial: {
    icon: CircleDashed,
    row: "border-amber-100 bg-amber-50/60",
    badge: "bg-amber-100 text-amber-700",
    label: "Partly covered",
  },
  missed: {
    icon: X,
    row: "border-rose-100 bg-rose-50/60",
    badge: "bg-rose-100 text-rose-700",
    label: "Not mentioned",
  },
} as const;

const SIDE_LABEL = {
  for: "In favour",
  against: "Against",
  example: "Example",
} as const;

function KeyPointRow({ point }: { point: KeyPointResult }) {
  const style = STATUS_STYLE[point.status];
  const Icon = style.icon;

  return (
    <li className={cn("flex items-start gap-3 rounded-2xl border p-3", style.row)}>
      <span className={cn("mt-0.5 rounded-full p-1", style.badge)}>
        <Icon className="h-3.5 w-3.5" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm text-slate-800">{point.text}</p>
        <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-[11px]">
          <span className={cn("rounded-full px-2 py-0.5 font-medium", style.badge)}>
            {style.label}
          </span>
          {point.mustHave && (
            <span className="rounded-full bg-slate-800 px-2 py-0.5 font-medium text-white">
              Essential
            </span>
          )}
          {point.side !== "none" && (
            <span className="rounded-full bg-slate-100 px-2 py-0.5 font-medium text-slate-600">
              {SIDE_LABEL[point.side]}
            </span>
          )}
          <span className="text-slate-400">{Math.round(point.coverage * 100)}% match</span>
        </div>
      </div>
    </li>
  );
}

export function KeyPointCoverage({
  semantic,
  modelAnswer,
}: {
  semantic: SemanticResult;
  modelAnswer?: string;
}) {
  if (semantic.keyPoints.length === 0) return null;

  // Missed points first — that is what the student needs to act on.
  const order = { missed: 0, partial: 1, covered: 2 } as const;
  const sorted = [...semantic.keyPoints].sort((a, b) => order[a.status] - order[b.status]);

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold text-slate-900">What the answer needed</h3>
          <p className="mt-0.5 text-xs text-slate-500">
            Matched by meaning, so different wording still counts.
          </p>
        </div>
        <div className="flex items-center gap-3 text-xs">
          <span className="font-medium text-emerald-600">{semantic.coveredCount} covered</span>
          <span className="font-medium text-amber-600">{semantic.partialCount} partial</span>
          <span className="font-medium text-rose-600">{semantic.missedCount} missed</span>
        </div>
      </div>

      {semantic.capped && (
        <p className="mt-3 flex items-start gap-2 rounded-2xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            Content score was capped at {semantic.contentScore} because an essential point was never
            mentioned: {semantic.missedMustHave[0]}
          </span>
        </p>
      )}

      {semantic.sideBalance && (
        <div className="mt-3 grid grid-cols-3 gap-2">
          {(["for", "against", "example"] as const).map((side) => (
            <div key={side} className="rounded-2xl bg-slate-50 p-2.5 text-center">
              <p className="text-[11px] text-slate-500">{SIDE_LABEL[side]}</p>
              <p className="text-lg font-semibold text-slate-800">{semantic.sideBalance![side]}%</p>
            </div>
          ))}
        </div>
      )}

      <ul className="mt-4 space-y-2">
        {sorted.map((point) => (
          <KeyPointRow key={point.id} point={point} />
        ))}
      </ul>

      {modelAnswer && (
        <details className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-3">
          <summary className="cursor-pointer text-xs font-semibold text-slate-700">
            Show the model answer
          </summary>
          <p className="mt-2 text-sm leading-relaxed text-slate-600">{modelAnswer}</p>
        </details>
      )}
    </div>
  );
}
