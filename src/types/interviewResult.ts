import type { AnswerResult } from "@/components/interviews/AnswerFeedback";
import type { InterviewSummary } from "@/lib/interviewSummary";

export interface ResultAnswer {
  question: string;
  /** Bank question id; null for quick-practice questions. */
  questionId: string | null;
  transcript: string;
  /** Missing when the student left before this question or grading failed. */
  result: AnswerResult | null;
}

/** What the browser sends when an interview ends. */
export interface InterviewResultDraft {
  candidateName: string;
  testId: string | null;
  testTitle: string;
  voiceStyle: string;
  startedAt: string;
  finishedAt: string;
  /** Times the face check saw the student look away from the screen. */
  lookAwayCount: number;
  answers: ResultAnswer[];
}

export interface InterviewResult extends InterviewResultDraft {
  id: string;
  summary: InterviewSummary;
  createdAt: string;
}

/** One row in the admin results list — everything except the answers themselves. */
export interface InterviewResultSummary {
  id: string;
  candidateName: string;
  testId: string | null;
  testTitle: string;
  startedAt: string;
  finishedAt: string;
  lookAwayCount: number;
  questionCount: number;
  summary: InterviewSummary;
  createdAt: string;
}

export const MAX_RESULT_ANSWERS = 60;
export const MIN_NAME_LENGTH = 2;
export const MAX_NAME_LENGTH = 80;
/** Firestore documents are capped at 1 MiB; leave headroom for field names and indexes. */
export const MAX_RESULT_BYTES = 800_000;
