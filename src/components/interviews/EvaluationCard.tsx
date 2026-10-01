"use client";

import { CheckCircle2, Circle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export interface EvaluationStep {
  label: string;
  done: boolean;
}

interface EvaluationCardProps {
  steps: EvaluationStep[];
  title?: string;
  className?: string;
}

export function EvaluationCard({
  steps,
  title = "Evaluation Progress",
  className,
}: EvaluationCardProps) {
  const completedCount = steps.filter((s) => s.done).length;
  const activeIndex = steps.findIndex((s) => !s.done);
  const progress = steps.length > 0 ? Math.round((completedCount / steps.length) * 100) : 0;

  return (
    <div className={cn("rounded-2xl border border-border bg-white p-5 shadow-sm", className)}>
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
        <span className="text-xs font-medium text-indigo-600">
          {completedCount}/{steps.length}
        </span>
      </div>

      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-100">
        <div
          className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-blue-600 transition-all duration-500"
          style={{ width: `${progress}%` }}
        />
      </div>

      <ul className="mt-4 space-y-3">
        {steps.map((step, index) => {
          const isActive = index === activeIndex;
          const isDone = step.done;

          return (
            <li key={step.label} className="flex items-center gap-3">
              {isDone ? (
                <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-500" />
              ) : isActive ? (
                <Loader2 className="h-5 w-5 shrink-0 animate-spin text-indigo-500" />
              ) : (
                <Circle className="h-5 w-5 shrink-0 text-slate-300" />
              )}
              <span
                className={cn(
                  "text-sm",
                  isDone && "font-medium text-slate-900",
                  isActive && "font-medium text-indigo-700",
                  !isDone && !isActive && "text-muted"
                )}
              >
                {step.label}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
