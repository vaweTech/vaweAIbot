import { cn } from "@/lib/utils";

const variants: Record<string, string> = {
  active: "bg-emerald-50 text-emerald-700 border-emerald-200",
  completed: "bg-blue-50 text-blue-700 border-blue-200",
  draft: "bg-slate-50 text-slate-600 border-slate-200",
  archived: "bg-slate-100 text-slate-500 border-slate-200",
  scheduled: "bg-amber-50 text-amber-700 border-amber-200",
  "in-progress": "bg-indigo-50 text-indigo-700 border-indigo-200",
  pending: "bg-amber-50 text-amber-700 border-amber-200",
  inactive: "bg-slate-100 text-slate-500 border-slate-200",
  "at-risk": "bg-rose-50 text-rose-700 border-rose-200",
  Beginner: "bg-emerald-50 text-emerald-700 border-emerald-200",
  Intermediate: "bg-amber-50 text-amber-700 border-amber-200",
  Advanced: "bg-rose-50 text-rose-700 border-rose-200",
  High: "bg-emerald-50 text-emerald-700 border-emerald-200",
  Medium: "bg-amber-50 text-amber-700 border-amber-200",
  Low: "bg-rose-50 text-rose-700 border-rose-200",
  Excellent: "bg-emerald-50 text-emerald-700 border-emerald-200",
  Good: "bg-blue-50 text-blue-700 border-blue-200",
  Average: "bg-amber-50 text-amber-700 border-amber-200",
  "Needs Improvement": "bg-rose-50 text-rose-700 border-rose-200",
  Pronouns: "bg-violet-50 text-violet-700 border-violet-200",
  Tense: "bg-amber-50 text-amber-700 border-amber-200",
  Articles: "bg-sky-50 text-sky-700 border-sky-200",
  Prepositions: "bg-indigo-50 text-indigo-700 border-indigo-200",
  "Subject-Verb Agreement": "bg-rose-50 text-rose-700 border-rose-200",
  "Sentence Structure": "bg-orange-50 text-orange-700 border-orange-200",
  "Word Choice": "bg-teal-50 text-teal-700 border-teal-200",
};

interface StatusBadgeProps {
  status: string;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const key = status;
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium capitalize",
        variants[key] || "bg-slate-50 text-slate-600 border-slate-200",
        className
      )}
    >
      {status.replace("-", " ")}
    </span>
  );
}
