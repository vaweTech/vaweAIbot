/**
 * Fixed marking scheme for spoken answers, out of 10.
 *
 * Every question type uses the same four dimensions so results stay
 * comparable, but the marks and the meaning of each dimension change: a
 * technical answer is mostly about being right, an HR answer about saying the
 * expected things with real examples. English quality is deliberately not a
 * dimension; grammar and pronouns are scored separately so a student with
 * weak English but correct knowledge is not marked down on knowledge.
 */

import type { BankQuestionType } from "@/types/questionBank";

export type RubricDimension = "correctness" | "concepts" | "reasoning" | "clarity";

/** Dimensions the examiner model scores directly; concepts come from key-point verdicts. */
export type JudgedDimension = Exclude<RubricDimension, "concepts">;

export type RubricCriterion = {
  key: RubricDimension;
  label: string;
  marks: number;
  /** What the examiner is told to look for. */
  guidance: string;
};

export const RUBRICS: Record<BankQuestionType, RubricCriterion[]> = {
  technical: [
    {
      key: "correctness",
      label: "Technical correctness",
      marks: 4,
      guidance:
        "Is what the student said technically accurate? Reward accurate substance in proportion to how much was said; an answer with no real technical content cannot score high. Deduct for each wrong or contradictory statement and for any listed misconception.",
    },
    {
      key: "concepts",
      label: "Required concepts",
      marks: 3,
      guidance: "Scored from the key points.",
    },
    {
      key: "reasoning",
      label: "Reasoning & examples",
      marks: 2,
      guidance:
        "Does the student explain why or how, or give a concrete example, use case or comparison, rather than only naming terms?",
    },
    {
      key: "clarity",
      label: "Clarity & organisation",
      marks: 1,
      guidance:
        "Are the ideas in a logical order and easy to follow? Judge structure only, never grammar, vocabulary or accent.",
    },
  ],
  hr: [
    {
      key: "correctness",
      label: "Relevance & honesty",
      marks: 2,
      guidance:
        "Does the answer respond to what was asked, stay consistent, and sound genuine and professional? Deduct for contradictions or claims that undermine the answer.",
    },
    {
      key: "concepts",
      label: "Expected points",
      marks: 4,
      guidance: "Scored from the key points.",
    },
    {
      key: "reasoning",
      label: "Examples & impact",
      marks: 3,
      guidance:
        "Does the student back claims with a specific situation, what they did, and the result (STAR style), rather than generic statements?",
    },
    {
      key: "clarity",
      label: "Structure",
      marks: 1,
      guidance:
        "Is the answer organised with a clear start and finish? Judge structure only, never grammar, vocabulary or accent.",
    },
  ],
  gd: [
    {
      key: "correctness",
      label: "Accuracy of claims",
      marks: 2,
      guidance:
        "Are the facts and claims the student uses accurate and not self-contradictory? Deduct for each wrong claim and for any listed misconception.",
    },
    {
      key: "concepts",
      label: "Key arguments",
      marks: 3,
      guidance: "Scored from the key points.",
    },
    {
      key: "reasoning",
      label: "Reasoning & evidence",
      marks: 3,
      guidance:
        "Does the student justify their position with reasons, data or examples, and engage with the other side?",
    },
    {
      key: "clarity",
      label: "Structure & persuasiveness",
      marks: 2,
      guidance:
        "Is the argument organised and convincing? Judge structure only, never grammar, vocabulary or accent.",
    },
  ],
};

export type RubricItem = { key: RubricDimension; label: string; marks: number; awarded: number };

export type RubricScore = {
  type: BankQuestionType;
  items: RubricItem[];
  /** Out of 10, to one decimal. */
  total: number;
  /** total as 0-100, for blending with the other scores. */
  percent: number;
};

function roundHalf(n: number): number {
  return Math.round(n * 2) / 2;
}

/**
 * @param judged examiner scores per dimension, each 0-10
 * @param conceptCoverage weighted key-point coverage, 0-1
 */
export function scoreRubric(
  type: BankQuestionType,
  judged: Record<JudgedDimension, number>,
  conceptCoverage: number
): RubricScore {
  const items = RUBRICS[type].map((criterion) => {
    const fraction =
      criterion.key === "concepts" ? conceptCoverage : Math.max(0, Math.min(10, judged[criterion.key])) / 10;
    return {
      key: criterion.key,
      label: criterion.label,
      marks: criterion.marks,
      awarded: roundHalf(criterion.marks * Math.max(0, Math.min(1, fraction))),
    };
  });
  const total = Math.round(items.reduce((sum, item) => sum + item.awarded, 0) * 10) / 10;
  return { type, items, total, percent: Math.round(total * 10) };
}

/** Rubric text for the examiner prompt, excluding concepts which come from key points. */
export function rubricGuidance(type: BankQuestionType): string {
  return RUBRICS[type]
    .filter((c) => c.key !== "concepts")
    .map((c) => `- ${c.key} (${c.label}): ${c.guidance}`)
    .join("\n");
}
