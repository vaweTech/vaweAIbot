import { Check, Lock } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Progress through the interview. Upcoming questions stay hidden and scores
 * wait for the final report, as in a real interview.
 */
export function InterviewAgenda({
  questions,
  currentIndex,
  answered,
  interviewerName,
}: {
  questions: string[];
  currentIndex: number;
  /** Indexed like `questions`. */
  answered: boolean[];
  interviewerName: string;
}) {
  const answeredCount = answered.filter(Boolean).length;

  return (
    <div className="space-y-4">
      <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-900">Interview agenda</h3>
          <span className="text-xs text-slate-500">
            {answeredCount}/{questions.length} done
          </span>
        </div>

        <ol className="mt-4 space-y-1">
          {questions.map((text, index) => {
            const done = answered[index];
            const current = index === currentIndex && !done;
            return (
              <li
                key={index}
                className={cn(
                  "flex items-start gap-3 rounded-2xl p-2.5 transition",
                  current && "bg-indigo-50 ring-1 ring-indigo-100"
                )}
              >
                <span
                  className={cn(
                    "mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold",
                    done
                      ? "bg-emerald-500 text-white"
                      : current
                        ? "bg-indigo-600 text-white"
                        : "bg-slate-100 text-slate-400"
                  )}
                >
                  {done ? <Check className="h-3.5 w-3.5" /> : index + 1}
                </span>
                <div className="min-w-0 flex-1">
                  {done || current ? (
                    <p className={cn("line-clamp-2 text-xs", current ? "font-medium text-slate-800" : "text-slate-500")}>
                      {text}
                    </p>
                  ) : (
                    <p className="flex items-center gap-1 text-xs text-slate-400">
                      <Lock className="h-3 w-3" /> Question {index + 1}
                    </p>
                  )}
                  {current && (
                    <p className="mt-1 flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-indigo-600">
                      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-indigo-500" /> In progress
                    </p>
                  )}
                </div>
              </li>
            );
          })}
        </ol>

        <p className="mt-4 rounded-2xl bg-slate-50 px-3 py-2.5 text-xs text-slate-500">
          Scores and feedback for every answer appear in your report at the end.
        </p>
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white p-5 text-xs text-slate-600 shadow-sm">
        <h3 className="text-sm font-semibold text-slate-900">Answer length</h3>
        <p className="mt-1">The bar under {interviewerName}&apos;s video fills while you speak.</p>
        <ul className="mt-3 space-y-1.5">
          <li className="flex items-center gap-2">
            <span className="h-2 w-6 rounded-full bg-amber-400" /> Under 30s — too short
          </li>
          <li className="flex items-center gap-2">
            <span className="h-2 w-6 rounded-full bg-emerald-400" /> 30–90s — ideal
          </li>
          <li className="flex items-center gap-2">
            <span className="h-2 w-6 rounded-full bg-rose-500" /> Over 90s — wrap up
          </li>
        </ul>
      </div>
    </div>
  );
}
