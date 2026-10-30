import { CheckCircle2, ChevronDown, Loader2, MinusCircle, Trophy } from "lucide-react";
import { AnswerFeedback, type AnswerResult } from "@/components/interviews/AnswerFeedback";
import { summarizeInterview } from "@/lib/interviewSummary";
import { getScoreLabel } from "@/lib/scoring";
import { cn } from "@/lib/utils";

export type SessionAnswer = {
  question: string;
  transcript: string;
  status: "grading" | "done";
  result?: AnswerResult;
};

function chipTone(score: number) {
  if (score >= 75) return "bg-emerald-50 text-emerald-700 ring-emerald-200";
  if (score >= 55) return "bg-amber-50 text-amber-700 ring-amber-200";
  return "bg-rose-50 text-rose-700 ring-rose-200";
}

function Stat({ label, value }: { label: string; value: number | null }) {
  return (
    <div className="rounded-2xl bg-white/10 p-3 text-center ring-1 ring-white/15">
      <p className="text-[11px] text-indigo-100">{label}</p>
      <p className="mt-0.5 text-2xl font-bold">{value ?? "–"}</p>
    </div>
  );
}

/** End-of-interview report: overall summary, then full feedback per question. */
export function InterviewReport({
  title,
  questions,
  answers,
  actions,
  toolbar,
}: {
  title: string;
  questions: string[];
  /** Indexed like `questions`; missing entries were never answered. */
  answers: (SessionAnswer | undefined)[];
  actions: React.ReactNode;
  /** Shown under the score header, e.g. save status and download. */
  toolbar?: React.ReactNode;
}) {
  const pending = answers.filter((a) => a?.status === "grading").length;
  const { overall, knowledge, answerQuality, english, fluency, focus, repeats, answered: answeredCount } =
    summarizeInterview(answers);
  // An HR-only interview has no technical score, and vice versa.
  const stats: [string, number | null][] = [
    ...(knowledge !== null || answerQuality === null ? [["Technical", knowledge] as [string, number | null]] : []),
    ...(answerQuality !== null ? [["Answer quality", answerQuality] as [string, number | null]] : []),
    ["English", english],
    ["Fluency", fluency],
  ];

  return (
    <div className="space-y-5">
      <div className="overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-600 to-blue-600 p-6 text-white shadow-lg shadow-indigo-200 sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-indigo-200">
              <Trophy className="h-4 w-4" /> Interview report
            </p>
            <h2 className="mt-1 text-2xl font-bold sm:text-3xl">{title}</h2>
            <p className="mt-1 text-sm text-indigo-100">
              {answeredCount} of {questions.length} questions answered
              {repeats ? ` · ${repeats} repetition ${repeats === 1 ? "mistake" : "mistakes"}` : ""}
              {pending > 0 && ` · grading ${pending} more…`}
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-indigo-200">Overall score</p>
            <p className="text-5xl font-bold">
              {overall ?? (pending > 0 ? <Loader2 className="ml-auto h-10 w-10 animate-spin" /> : "–")}
            </p>
            {overall !== null && <p className="text-sm font-medium text-indigo-100">{getScoreLabel(overall)}</p>}
          </div>
        </div>
        <div className={cn("mt-6 grid gap-3", stats.length === 4 ? "grid-cols-2 sm:grid-cols-4" : "grid-cols-3")}>
          {stats.map(([label, value]) => (
            <Stat key={label} label={label} value={value} />
          ))}
        </div>
      </div>

      {toolbar}

      {focus.length > 0 && (
        <div className="rounded-3xl border border-amber-200 bg-amber-50/60 p-5">
          <h3 className="text-sm font-semibold text-amber-900">Focus on these next time</h3>
          <ul className="mt-2 space-y-1 text-sm text-amber-900/80">
            {focus.map((area) => (
              <li key={area}>• {area}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="space-y-3">
        {questions.map((question, index) => {
          const answer = answers[index];
          const score = answer?.result?.scores.overall;
          return (
            <details
              key={index}
              open={index === 0 && Boolean(answer?.result)}
              className="group rounded-3xl border border-slate-200 bg-white shadow-sm open:shadow-md"
            >
              <summary className="flex cursor-pointer list-none items-center gap-3 p-4 sm:p-5">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-600">
                  {index + 1}
                </span>
                <p className="min-w-0 flex-1 text-sm font-medium text-slate-800">{question}</p>
                {answer?.status === "grading" ? (
                  <span className="inline-flex items-center gap-1.5 text-xs text-slate-500">
                    <Loader2 className="h-4 w-4 animate-spin" /> Grading…
                  </span>
                ) : score !== undefined ? (
                  <span className={cn("rounded-full px-2.5 py-1 text-sm font-bold ring-1", chipTone(score))}>{score}</span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-xs text-slate-400">
                    <MinusCircle className="h-4 w-4" /> Not answered
                  </span>
                )}
                <ChevronDown className="h-4 w-4 shrink-0 text-slate-400 transition group-open:rotate-180" />
              </summary>
              <div className="border-t border-slate-100 p-4 sm:p-5">
                {answer?.result ? (
                  <AnswerFeedback result={answer.result} transcript={answer.transcript} />
                ) : answer ? (
                  <p className="flex items-center gap-2 text-sm text-slate-500">
                    <Loader2 className="h-4 w-4 animate-spin" /> The AI examiner is still grading this answer…
                  </p>
                ) : (
                  <p className="text-sm text-slate-500">You left the interview before this question.</p>
                )}
              </div>
            </details>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center justify-center gap-3 rounded-3xl border border-emerald-100 bg-white p-5">
        <CheckCircle2 className="h-5 w-5 text-emerald-500" />
        {actions}
      </div>
    </div>
  );
}
