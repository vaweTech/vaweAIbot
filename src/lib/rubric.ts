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

import type { EvaluationWeights } from "@/types/interview";
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
      label: "Relevance & self-awareness",
      marks: 2,
      guidance:
        "Does the answer respond directly to what was asked, stay consistent, and sound honest, self-aware and professional? There is no technical right answer: never judge technical accuracy. Deduct for dodging the question, contradictions, or red flags an employer would worry about (blaming others, negativity about past teams, dishonesty).",
    },
    {
      key: "concepts",
      label: "Expected points",
      marks: 3,
      guidance: "Scored from the key points.",
    },
    {
      key: "reasoning",
      label: "Examples & impact (STAR)",
      marks: 3,
      guidance:
        "Does the student back claims with a specific real situation, the task, what they personally did, and the result or what they learned (STAR), rather than generic statements like 'I am hardworking'?",
    },
    {
      key: "clarity",
      label: "Structure & attitude",
      marks: 2,
      guidance:
        "Is the answer organised with a clear start and finish, confident, and positive in tone? Judge structure and attitude only, never grammar, vocabulary or accent.",
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

/**
 * How the overall score is built once the examiner has marked an answer.
 * Answer marks carry the most weight so fluent English cannot rescue a wrong
 * answer. HR answers have no technical right answer and are about how the
 * student comes across, so communication counts for more.
 */
export const OVERALL_WEIGHTS: Record<BankQuestionType, EvaluationWeights> = {
  technical: { technicalKnowledge: 60, relevance: 0, communication: 10, grammar: 10, fluency: 10, vocabulary: 10 },
  hr: { technicalKnowledge: 50, relevance: 0, communication: 20, grammar: 10, fluency: 10, vocabulary: 10 },
  gd: { technicalKnowledge: 60, relevance: 0, communication: 10, grammar: 10, fluency: 10, vocabulary: 10 },
};

/** Percent of the overall score that comes from the answer marks. */
export function answerMarksShare(type: BankQuestionType): number {
  const w = OVERALL_WEIGHTS[type];
  const total = w.technicalKnowledge + w.relevance + w.communication + w.grammar + w.fluency + w.vocabulary;
  return Math.round((w.technicalKnowledge / total) * 100);
}

/** What the answer-marks score is called for each type; HR answers have no "technical" score. */
export const CONTENT_SCORE_LABEL: Record<BankQuestionType, string> = {
  technical: "Technical",
  hr: "Answer quality",
  gd: "Content",
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
