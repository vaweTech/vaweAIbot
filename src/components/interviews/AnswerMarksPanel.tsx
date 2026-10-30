"use client";

import { AlertTriangle, BadgeCheck, Mic, ShieldQuestion, Users, XCircle } from "lucide-react";
import type { EvaluationReview, TranscriptIssue } from "@/lib/answerEvaluation";
import type { FactualError } from "@/lib/answerJudge";
import type { RubricScore } from "@/lib/rubric";
import { cn } from "@/lib/utils";

const RUBRIC_TITLE: Record<RubricScore["type"], string> = {
  technical: "Technical rubric",
  hr: "HR answer rubric",
  gd: "Discussion rubric",
};

function barColor(fraction: number) {
  if (fraction >= 0.75) return "bg-emerald-500";
  if (fraction >= 0.5) return "bg-amber-500";
  return "bg-rose-500";
}

function ReviewBadge({ review }: { review: EvaluationReview }) {
  if (review.gradedBy === "none") return null;

  if (review.needsReview) {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
        <p className="flex items-center gap-1.5 font-semibold">
          <ShieldQuestion className="h-4 w-4" /> Flagged for trainer review
        </p>
        {review.reasons.length > 0 && (
          <ul className="mt-1.5 list-disc space-y-0.5 pl-5">
            {review.reasons.slice(0, 3).map((reason) => (
              <li key={reason}>{reason}</li>
            ))}
          </ul>
        )}
      </div>
    );
  }

  if (review.secondOpinion) {
    return (
      <p className="flex items-center gap-1.5 rounded-2xl border border-indigo-100 bg-indigo-50 p-3 text-xs text-indigo-800">
        <Users className="h-4 w-4 shrink-0" />
        Double-checked by a second AI examiner, and both agreed.
      </p>
    );
  }

  return (
    <p className="flex items-center gap-1.5 text-xs text-slate-500">
      <BadgeCheck className="h-4 w-4 text-emerald-600" />
      Graded by the AI examiner
      {review.confidence && <> · {review.confidence} confidence</>}
    </p>
  );
}

export function AnswerMarksPanel({
  rubric,
  factualErrors,
  review,
  transcriptIssue,
  onRetry,
}: {
  rubric?: RubricScore | null;
  factualErrors?: FactualError[];
  review?: EvaluationReview;
  transcriptIssue?: TranscriptIssue | null;
  onRetry?: () => void;
}) {
  const errors = factualErrors ?? [];
  if (!rubric && !transcriptIssue && errors.length === 0 && !review?.needsReview) return null;

  return (
    <div className="space-y-3">
      {transcriptIssue && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-3xl border border-amber-200 bg-amber-50 p-4">
          <div className="flex items-start gap-2 text-sm text-amber-900">
            <Mic className="mt-0.5 h-4 w-4 shrink-0" />
            <span>
              {transcriptIssue === "too-short"
                ? "Too little speech was captured to grade this answer fairly."
                : "Your speech was not captured clearly, so this grade may be unfair to you. Your accent is not the problem — try a quieter place and speak closer to the mic."}
            </span>
          </div>
          {onRetry && (
            <button
              type="button"
              onClick={onRetry}
              className="rounded-xl bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-700"
            >
              Re-record this answer
            </button>
          )}
        </div>
      )}

      {rubric && (
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">{RUBRIC_TITLE[rubric.type]}</h3>
              <p className="mt-0.5 text-xs text-slate-500">
                Knowledge only — your English is graded separately and does not lower these marks.
              </p>
            </div>
            <p className="text-3xl font-bold text-slate-900">
              {rubric.total}
              <span className="text-base font-medium text-slate-400">/10</span>
            </p>
          </div>

          <ul className="mt-4 space-y-3">
            {rubric.items.map((item) => {
              const fraction = item.marks > 0 ? item.awarded / item.marks : 0;
              return (
                <li key={item.key}>
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-slate-700">{item.label}</span>
                    <span className="font-semibold text-slate-900">
                      {item.awarded} / {item.marks}
                    </span>
                  </div>
                  <div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className={cn("h-full rounded-full", barColor(fraction))}
                      style={{ width: `${Math.round(fraction * 100)}%` }}
                    />
                  </div>
                </li>
              );
            })}
          </ul>

          {review && (
            <div className="mt-4">
              <ReviewBadge review={review} />
            </div>
          )}
        </div>
      )}

      {!rubric && review?.needsReview && <ReviewBadge review={review} />}

      {errors.length > 0 && (
        <div className="rounded-3xl border border-rose-200 bg-white p-5 shadow-sm">
          <h3 className="flex items-center gap-1.5 text-sm font-semibold text-rose-800">
            <AlertTriangle className="h-4 w-4" /> Incorrect statements
          </h3>
          <ul className="mt-3 space-y-2">
            {errors.map((error) => (
              <li key={error.quote} className="flex items-start gap-2 rounded-2xl bg-rose-50/70 p-3">
                <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-500" />
                <div className="text-sm">
                  <p className="italic text-slate-700">&ldquo;{error.quote}&rdquo;</p>
                  <p className="mt-0.5 text-xs text-rose-700">{error.issue}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
