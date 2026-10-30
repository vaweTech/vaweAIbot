import type { AnswerResult } from "@/components/interviews/AnswerFeedback";

type Graded = { transcript: string; result?: AnswerResult | null } | undefined | null;

export type InterviewSummary = {
  overall: number | null;
  /** Average answer marks on technical questions; null when the interview had none. */
  knowledge: number | null;
  /** Average answer quality on HR questions; null when the interview had none. */
  answerQuality: number | null;
  english: number | null;
  fluency: number | null;
  /** Repetition mistakes across all answers; missing on results saved before it was checked. */
  repeats?: number;
  answered: number;
  graded: number;
  /** Improvement areas that came up most often across answers. */
  focus: string[];
};

function average(values: number[]): number | null {
  return values.length > 0 ? Math.round(values.reduce((a, b) => a + b, 0) / values.length) : null;
}

/** Per-answer lines that only make sense next to that answer, not in an overall summary. */
const ANSWER_SPECIFIC = [
  "Essential point",
  "Also mention",
  "Incorrect:",
  "Avoid:",
  "Touched on but",
  "Repeated ",
  "Overused word",
];

const REPEATS_FOCUS = 3;

export function summarizeInterview(answers: Graded[]): InterviewSummary {
  const results = answers.flatMap((a) => (a?.result ? [a.result] : []));
  const hr = results.filter((r) => r.questionType === "hr");
  const technical = results.filter((r) => r.questionType !== "hr");

  const counts = new Map<string, number>();
  for (const result of results) {
    for (const area of result.improvementAreas ?? []) {
      if (ANSWER_SPECIFIC.some((prefix) => area.startsWith(prefix))) continue;
      counts.set(area, (counts.get(area) ?? 0) + 1);
    }
  }
  const repeats = results.reduce((sum, r) => sum + (r.repetition?.total ?? 0), 0);
  if (repeats >= REPEATS_FOCUS) {
    counts.set("Avoid repeating the same words and lines", repeats);
  }

  return {
    overall: average(results.map((r) => r.scores.overall)),
    knowledge: average(technical.map((r) => r.scores.technicalKnowledge)),
    answerQuality: average(hr.map((r) => r.scores.technicalKnowledge)),
    english: average(results.map((r) => Math.round((r.scores.grammar + r.scores.pronouns) / 2))),
    fluency: average(results.map((r) => r.scores.fluency)),
    repeats,
    answered: answers.filter((a) => Boolean(a?.transcript)).length,
    graded: results.length,
    focus: [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4)
      .map(([area]) => area),
  };
}
