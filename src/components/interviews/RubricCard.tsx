import { Scale } from "lucide-react";
import { answerMarksShare, RUBRICS } from "@/lib/rubric";
import type { TestQuestionType } from "@/types/interviewTest";

function overallLine(type: "technical" | "hr") {
  const share = answerMarksShare(type);
  return `${share}% answer marks + ${100 - share}% ${type === "hr" ? "communication & English" : "English & delivery"}`;
}

/** Explains how answers will be marked, before the interview starts. */
export function RubricCard({ questionType }: { questionType: TestQuestionType }) {
  const columns =
    questionType === "mixed"
      ? (["technical", "hr"] as const)
      : ([questionType] as const);

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center gap-2">
        <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
          <Scale className="h-4 w-4" />
        </span>
        <div>
          <h3 className="text-sm font-semibold text-slate-900">How you are marked</h3>
          <p className="text-[11px] text-slate-500">Each answer is graded out of 10</p>
        </div>
      </div>

      <table className="mt-4 w-full text-xs">
        {columns.length > 1 && (
          <thead>
            <tr className="text-[10px] uppercase tracking-wide text-slate-400">
              <th className="pb-1.5 text-left font-medium">Part</th>
              <th className="pb-1.5 text-right font-medium">Technical</th>
              <th className="pb-1.5 text-right font-medium">HR</th>
            </tr>
          </thead>
        )}
        <tbody>
          {RUBRICS[columns[0]].map((criterion, row) => (
            <tr key={criterion.key} className="border-t border-slate-100">
              <td className="py-2 text-slate-700">
                {criterion.label}
                {columns.length > 1 && RUBRICS.hr[row].label !== criterion.label && (
                  <span className="block text-[10px] text-slate-400">HR: {RUBRICS.hr[row].label}</span>
                )}
              </td>
              {columns.map((type) => (
                <td key={type} className="py-2 text-right font-semibold text-slate-900">
                  {RUBRICS[type][row].marks}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>

      <div className="mt-3 space-y-1 rounded-2xl bg-slate-50 p-3 text-[11px] leading-relaxed text-slate-600">
        {columns.map((type) => (
          <p key={type}>
            <span className="font-semibold text-slate-800">
              Overall{columns.length > 1 ? ` (${type === "hr" ? "HR" : "Technical"})` : ""}
            </span>{" "}
            = {overallLine(type)}.
          </p>
        ))}
        {questionType === "hr" ? (
          <p>No technical score: HR answers are judged on relevance, real examples (STAR) and structure.</p>
        ) : (
          <p>Grammar mistakes never reduce your answer marks.</p>
        )}
      </div>
    </div>
  );
}
