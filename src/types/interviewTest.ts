import type { BankDifficulty, BankQuestionType, BankStatus } from "@/types/questionBank";

export type TestStatus = "draft" | "published";
/** Which question types a test draws from. */
export type TestQuestionType = "technical" | "hr" | "mixed";

export const MAX_TEST_QUESTIONS = 50;
export const DEFAULT_TEST_QUESTIONS = 5;

/** What the admin builder submits. Question order is the order asked. */
export interface TestDraft {
  title: string;
  description: string;
  questionType: TestQuestionType;
  /** How many questions the test must contain. */
  totalQuestions: number;
  questionIds: string[];
  status: TestStatus;
}

/** A question as shown inside a test — never includes the answer key. */
export interface TestQuestion {
  id: string;
  question: string;
  type: BankQuestionType;
  category: string;
  difficulty: BankDifficulty;
  /** Admin only: lets the builder flag questions that are still drafts. */
  status?: BankStatus;
}

export interface TestSummary {
  id: string;
  title: string;
  description: string;
  questionType: TestQuestionType;
  status: TestStatus;
  questionCount: number;
  /** Difficulty mix, e.g. { Beginner: 2, Intermediate: 3 } */
  difficultyCounts: Partial<Record<BankDifficulty, number>>;
  createdAt: string;
  updatedAt: string;
}

export interface InterviewTest extends TestSummary {
  questions: TestQuestion[];
}

export const TEST_TYPE_LABELS: Record<TestQuestionType, string> = {
  technical: "Technical",
  hr: "HR / Behavioural",
  mixed: "Technical + HR",
};

export function emptyTestDraft(): TestDraft {
  return {
    title: "",
    description: "",
    questionType: "technical",
    totalQuestions: DEFAULT_TEST_QUESTIONS,
    questionIds: [],
    status: "draft",
  };
}

export function validateTestDraft(draft: TestDraft): string[] {
  const problems: string[] = [];
  if (!draft.title.trim()) problems.push("Give the test a title");
  const total = draft.totalQuestions;
  const picked = draft.questionIds.length;
  if (!Number.isInteger(total) || total < 1 || total > MAX_TEST_QUESTIONS) {
    problems.push(`Total questions must be between 1 and ${MAX_TEST_QUESTIONS}`);
  } else if (picked < total) {
    problems.push(`Select ${total - picked} more question${total - picked > 1 ? "s" : ""}`);
  } else if (picked > total) {
    problems.push(`Remove ${picked - total} question${picked - total > 1 ? "s" : ""} or raise the total`);
  }
  if (new Set(draft.questionIds).size !== draft.questionIds.length) {
    problems.push("A question is selected twice");
  }
  return problems;
}

/** Whether a bank question type is allowed in a test of the given type. */
export function typeAllowed(testType: TestQuestionType, questionType: BankQuestionType): boolean {
  if (questionType === "gd") return false;
  return testType === "mixed" || testType === questionType;
}
