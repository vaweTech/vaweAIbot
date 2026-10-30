import type { DocumentData, Timestamp } from "firebase-admin/firestore";
import { RESULTS_COLLECTION, getFirestore } from "@/lib/firebaseAdmin";
import { summarizeInterview } from "@/lib/interviewSummary";
import { QuestionBankError } from "@/lib/questionBank";
import {
  MAX_NAME_LENGTH,
  MAX_RESULT_ANSWERS,
  MAX_RESULT_BYTES,
  MIN_NAME_LENGTH,
  type InterviewResult,
  type InterviewResultDraft,
  type InterviewResultSummary,
  type ResultAnswer,
} from "@/types/interviewResult";

const MAX_TRANSCRIPT_CHARS = 6000;

function text(value: unknown, max: number): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function isoOrNow(value: unknown): string {
  const date = typeof value === "string" ? new Date(value) : null;
  return date && !Number.isNaN(date.getTime()) ? date.toISOString() : new Date().toISOString();
}

/** Firestore rejects `undefined`, and the browser should not be able to slip in non-JSON values. */
function plain<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function cleanAnswer(raw: unknown): ResultAnswer {
  const answer = (raw ?? {}) as Partial<ResultAnswer>;
  const result = answer.result && typeof answer.result === "object" && answer.result.scores ? answer.result : null;
  return {
    question: text(answer.question, 1000),
    questionId: text(answer.questionId, 200) || null,
    transcript: text(answer.transcript, MAX_TRANSCRIPT_CHARS),
    result: result ? plain(result) : null,
  };
}

export async function saveInterviewResult(raw: unknown): Promise<string> {
  const body = (raw ?? {}) as Partial<InterviewResultDraft>;
  if (!Array.isArray(body.answers) || body.answers.length === 0) {
    throw new QuestionBankError("The result has no answers to save");
  }
  if (body.answers.length > MAX_RESULT_ANSWERS) {
    throw new QuestionBankError(`A result can hold at most ${MAX_RESULT_ANSWERS} answers`);
  }

  const candidateName = text(body.candidateName, MAX_NAME_LENGTH);
  if (candidateName.length < MIN_NAME_LENGTH) {
    throw new QuestionBankError("Candidate name is required");
  }

  const draft: InterviewResultDraft = {
    candidateName,
    testId: text(body.testId, 200) || null,
    testTitle: text(body.testTitle, 200) || "Quick practice",
    voiceStyle: text(body.voiceStyle, 40),
    startedAt: isoOrNow(body.startedAt),
    finishedAt: isoOrNow(body.finishedAt),
    lookAwayCount: Math.max(0, Math.min(10_000, Math.round(Number(body.lookAwayCount) || 0))),
    answers: body.answers.map(cleanAnswer),
  };
  // Scores are recomputed here so the stored summary always matches the stored answers.
  const summary = summarizeInterview(draft.answers);

  if (JSON.stringify(draft).length > MAX_RESULT_BYTES) {
    throw new QuestionBankError("This result is too large to save");
  }

  const { db, FieldValue } = await getFirestore();
  const ref = db.collection(RESULTS_COLLECTION).doc();
  await ref.set({ ...draft, summary, createdAt: FieldValue.serverTimestamp() });
  return ref.id;
}

const LIST_LIMIT = 300;

function toIso(value: unknown): string {
  if (value && typeof (value as Timestamp).toDate === "function") {
    return (value as Timestamp).toDate().toISOString();
  }
  return typeof value === "string" ? value : new Date().toISOString();
}

function toSummaryRow(id: string, data: DocumentData): InterviewResultSummary {
  const answers = Array.isArray(data.answers) ? (data.answers as ResultAnswer[]) : [];
  return {
    id,
    candidateName: data.candidateName ?? "Anonymous",
    testId: data.testId ?? null,
    testTitle: data.testTitle ?? "Quick practice",
    startedAt: data.startedAt ?? "",
    finishedAt: data.finishedAt ?? "",
    lookAwayCount: data.lookAwayCount ?? 0,
    questionCount: answers.length,
    summary: data.summary ?? summarizeInterview(answers),
    createdAt: toIso(data.createdAt),
  };
}

export async function listInterviewResults(): Promise<InterviewResultSummary[]> {
  const { db } = await getFirestore();
  const snap = await db.collection(RESULTS_COLLECTION).orderBy("createdAt", "desc").limit(LIST_LIMIT).get();
  return snap.docs.map((doc) => toSummaryRow(doc.id, doc.data()));
}

export async function getInterviewResult(id: string): Promise<InterviewResult | null> {
  const { db } = await getFirestore();
  const doc = await db.collection(RESULTS_COLLECTION).doc(id).get();
  if (!doc.exists) return null;
  const data = doc.data() ?? {};
  return {
    ...(data as InterviewResultDraft),
    id: doc.id,
    summary: data.summary ?? summarizeInterview(data.answers ?? []),
    createdAt: toIso(data.createdAt),
  };
}

export async function deleteInterviewResult(id: string): Promise<void> {
  const { db } = await getFirestore();
  await db.collection(RESULTS_COLLECTION).doc(id).delete();
}
