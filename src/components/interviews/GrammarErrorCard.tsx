import type { GrammarError } from "@/types/interview";
import { StatusBadge } from "@/components/common/StatusBadge";

interface GrammarErrorCardProps {
  error: GrammarError;
}

export function GrammarErrorCard({ error }: GrammarErrorCardProps) {
  return (
    <div className="rounded-2xl border border-border bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h4 className="text-sm font-semibold text-slate-900">
          {error.category === "Pronouns" ? "Pronoun Error" : "Grammar Error"}
        </h4>
        <StatusBadge status={error.category} />
      </div>
      <div className="space-y-2 text-sm">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-wide text-muted">Original</p>
          <p className="mt-0.5 rounded-lg bg-rose-50 px-3 py-2 text-rose-700">{error.original}</p>
        </div>
        <div>
          <p className="text-[11px] font-medium uppercase tracking-wide text-muted">Correction</p>
          <p className="mt-0.5 rounded-lg bg-emerald-50 px-3 py-2 text-emerald-700">
            {error.correction}
          </p>
        </div>
        <div>
          <p className="text-[11px] font-medium uppercase tracking-wide text-muted">Explanation</p>
          <p className="mt-0.5 text-slate-600">{error.explanation}</p>
        </div>
      </div>
    </div>
  );
}
