import type { DocumentData, Timestamp } from "firebase-admin/firestore";
import { QUESTIONS_COLLECTION, TESTS_COLLECTION, getFirestore } from "@/lib/firebaseAdmin";
import { QuestionBankError } from "@/lib/questionBank";
import type { BankDifficulty } from "@/types/questionBank";
import {
  typeAllowed,
  validateTestDraft,
  type InterviewTest,
  type TestDraft,
  type TestQuestion,
  type TestStatus,
  type TestSummary,
} from "@/types/interviewTest";

function toIso(value: unknown): string {
  if (value && typeof (value as Timestamp).toDate === "function") {
    return (value as Timestamp).toDate().toISOString();
  }
  return new Date().toISOString();
}

function toSummary(id: string, data: DocumentData): TestSummary {
  return {
    id,
    title: data.title ?? "",
    description: data.description ?? "",
    questionType: data.questionType ?? "technical",
    status: data.status ?? "draft",
    questionCount: data.questionCount ?? (data.questionIds?.length || 0),
    difficultyCounts: data.difficultyCounts ?? {},
    createdAt: toIso(data.createdAt),
    updatedAt: toIso(data.updatedAt),
  };
}

/** Reads the current text of each question, preserving the test's order. */
async function loadQuestions(ids: string[]): Promise<TestQuestion[]> {
  if (ids.length === 0) return [];
  const { db } = await getFirestore();
  const refs = ids.map((id) => db.collection(QUESTIONS_COLLECTION).doc(id));
  const docs = await db.getAll(...refs, {
    fieldMask: ["question", "type", "category", "difficulty", "status", "keyPointCount"],
  });

  const questions: TestQuestion[] = [];
  for (const doc of docs) {
    if (!doc.exists) continue;
    questions.push({
      id: doc.id,
      question: doc.get("question") ?? "",
      type: doc.get("type") ?? "technical",
      category: doc.get("category") ?? "",
      difficulty: doc.get("difficulty") ?? "Intermediate",
      status: doc.get("status") ?? "draft",
    });
  }
  return questions;
}

/** Validates the draft against the live question bank before writing. */
async function prepare(draft: TestDraft) {
  const clean: TestDraft = {
    ...draft,
    title: draft.title.trim(),
    description: draft.description.trim(),
  };
  const problems = validateTestDraft(clean);
  if (problems.length > 0) throw new QuestionBankError(problems.join("; "));

  const { db } = await getFirestore();
  const refs = clean.questionIds.map((id) => db.collection(QUESTIONS_COLLECTION).doc(id));
  const docs = await db.getAll(...refs, { fieldMask: ["type", "difficulty", "keyPointCount", "status"] });

  const difficultyCounts: Partial<Record<BankDifficulty, number>> = {};
  for (const doc of docs) {
    if (!doc.exists) throw new QuestionBankError(`Question ${doc.id} no longer exists`);
    if (!typeAllowed(clean.questionType, doc.get("type"))) {
      throw new QuestionBankError(`A ${doc.get("type")} question cannot be in this test type`);
    }
    if (!doc.get("keyPointCount")) {
      throw new QuestionBankError("Every question needs key points so answers can be scored");
    }
    if (doc.get("status") === "archived") {
      throw new QuestionBankError("Archived questions cannot be used in a test");
    }
    const difficulty = (doc.get("difficulty") as BankDifficulty) ?? "Intermediate";
    difficultyCounts[difficulty] = (difficultyCounts[difficulty] ?? 0) + 1;
  }

  return { clean, difficultyCounts };
}

export async function createTest(draft: TestDraft): Promise<string> {
  const { clean, difficultyCounts } = await prepare(draft);
  const { db, FieldValue } = await getFirestore();
  const ref = db.collection(TESTS_COLLECTION).doc();
  await ref.set({
    ...clean,
    questionCount: clean.questionIds.length,
    difficultyCounts,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });
  return ref.id;
}

export async function updateTest(id: string, draft: TestDraft): Promise<void> {
  const { clean, difficultyCounts } = await prepare(draft);
  const { db, FieldValue } = await getFirestore();
  const ref = db.collection(TESTS_COLLECTION).doc(id);
  if (!(await ref.get()).exists) throw new QuestionBankError("Test not found");
  await ref.update({
    ...clean,
    questionCount: clean.questionIds.length,
    difficultyCounts,
    updatedAt: FieldValue.serverTimestamp(),
  });
}

export async function setTestStatus(id: string, status: TestStatus): Promise<void> {
  const { db, FieldValue } = await getFirestore();
  await db.collection(TESTS_COLLECTION).doc(id).update({
    status,
    updatedAt: FieldValue.serverTimestamp(),
  });
}

export async function deleteTest(id: string): Promise<void> {
  const { db } = await getFirestore();
  await db.collection(TESTS_COLLECTION).doc(id).delete();
}

export async function listTests(filters: { status?: TestStatus } = {}): Promise<TestSummary[]> {
  const { db } = await getFirestore();
  let query = db.collection(TESTS_COLLECTION).limit(200);
  if (filters.status) query = query.where("status", "==", filters.status);
  const snapshot = await query.get();
  return snapshot.docs
    .map((doc) => toSummary(doc.id, doc.data()))
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export async function getTest(id: string): Promise<InterviewTest | null> {
  const { db } = await getFirestore();
  const doc = await db.collection(TESTS_COLLECTION).doc(id).get();
  if (!doc.exists) return null;
  const data = doc.data() ?? {};
  const questions = await loadQuestions((data.questionIds as string[]) ?? []);
  return { ...toSummary(doc.id, data), questions };
}
