"use client";

import type { AnswerEvaluation, EvaluationMode } from "@/lib/answerEvaluation";
import type { SessionQuestion } from "@/app/api/questions/session/route";
import { getAdminCode } from "@/lib/adminClient";
import type { BankQuestionType } from "@/types/questionBank";
import type { InterviewResultDraft } from "@/types/interviewResult";
import type { InterviewTest, TestSummary } from "@/types/interviewTest";

export type { SessionQuestion };

async function readError(response: Response): Promise<string> {
  try {
    const data = (await response.json()) as { error?: string };
    return data.error || `Request failed (${response.status})`;
  } catch {
    return `Request failed (${response.status})`;
  }
}

/**
 * Loads questions from the Firestore bank. Returns an empty list rather than
 * throwing when the bank is unreachable, so a session can fall back to the
 * built-in prototype questions instead of dead-ending.
 */
export async function fetchSessionQuestions(options: {
  type: BankQuestionType;
  count?: number;
  category?: string;
  difficulty?: string;
}): Promise<{ questions: SessionQuestion[]; error: string | null }> {
  const params = new URLSearchParams({ type: options.type });
  if (options.count) params.set("count", String(options.count));
  if (options.category) params.set("category", options.category);
  if (options.difficulty) params.set("difficulty", options.difficulty);

  try {
    const response = await fetch(`/api/questions/session?${params}`);
    if (!response.ok) return { questions: [], error: await readError(response) };
    const data = (await response.json()) as { questions: SessionQuestion[] };
    return { questions: data.questions ?? [], error: null };
  } catch (error) {
    return { questions: [], error: error instanceof Error ? error.message : "Network error" };
  }
}

/** Published tests a student can pick. Empty on failure, like fetchSessionQuestions. */
export async function fetchPublishedTests(): Promise<{ tests: TestSummary[]; error: string | null }> {
  try {
    const response = await fetch("/api/tests");
    if (!response.ok) return { tests: [], error: await readError(response) };
    const data = (await response.json()) as { tests: TestSummary[] };
    return { tests: data.tests ?? [], error: null };
  } catch (error) {
    return { tests: [], error: error instanceof Error ? error.message : "Network error" };
  }
}

/** One test with its questions. Sends the admin code so admins can preview drafts. */
export async function fetchTest(id: string): Promise<InterviewTest> {
  const response = await fetch(`/api/tests/${encodeURIComponent(id)}`, {
    headers: { "x-admin-code": getAdminCode() },
  });
  if (!response.ok) throw new Error(await readError(response));
  return ((await response.json()) as { test: InterviewTest }).test;
}

/** Saves a finished interview to Firestore and returns its result id. */
export async function saveInterviewResult(draft: InterviewResultDraft): Promise<string> {
  const response = await fetch("/api/results", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(draft),
  });
  if (!response.ok) throw new Error(await readError(response));
  return ((await response.json()) as { id: string }).id;
}

/** Grades an answer on the server against the stored answer key. */
export async function scoreAnswer(options: {
  questionId: string;
  transcript: string;
  durationSeconds: number;
  mode?: EvaluationMode;
}): Promise<AnswerEvaluation> {
  const response = await fetch("/api/score/answer", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(options),
  });
  if (!response.ok) throw new Error(await readError(response));
  return (await response.json()) as AnswerEvaluation;
}
