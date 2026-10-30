import { Repeat } from "lucide-react";
import { REPETITION_LABELS, type RepetitionReport } from "@/lib/repetition";

/** Lists repeated words, phrases and sentences found in one answer. */
export function RepetitionPanel({ report }: { report: RepetitionReport | undefined }) {
  if (!report) return null;

  if (report.total === 0) {
    return (
      <div className="flex items-center gap-2 rounded-2xl border border-emerald-100 bg-emerald-50/50 px-4 py-2.5 text-xs text-emerald-700">
        <Repeat className="h-3.5 w-3.5" /> No repeated words or lines
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-amber-200 bg-amber-50/40 p-4">
      <div className="flex items-center justify-between gap-2">
        <p className="flex items-center gap-1.5 text-xs font-semibold text-amber-800">
          <Repeat className="h-3.5 w-3.5" /> Repetition
        </p>
        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-800">
          {report.total} {report.total === 1 ? "mistake" : "mistakes"}
        </span>
      </div>
      <ul className="mt-2.5 space-y-1.5">
        {report.issues.map((issue) => (
          <li key={`${issue.kind}:${issue.text}`} className="flex items-start gap-2 text-sm">
            <span className="mt-0.5 shrink-0 rounded-md bg-white px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-700 ring-1 ring-amber-200">
              {REPETITION_LABELS[issue.kind]}
            </span>
            <span className="min-w-0 flex-1 text-slate-700">&ldquo;{issue.text}&rdquo;</span>
            <span className="shrink-0 text-xs font-semibold text-amber-700">{issue.count}×</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
