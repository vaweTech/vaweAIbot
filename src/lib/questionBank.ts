import type { DocumentData, Timestamp } from "firebase-admin/firestore";
import {
  ANSWER_KEY_PATH,
  QUESTIONS_COLLECTION,
  getFirestore,
} from "@/lib/firebaseAdmin";
import {
  EMBEDDING_MODEL,
  cosineSimilarity,
  embedTexts,
  keyPointEmbeddingText,
} from "@/lib/embeddings";
import type {
  AnswerKey,
  DuplicateMatch,
  KeyPoint,
  QuestionDraft,
  QuestionSummary,
} from "@/types/questionBank";
import { validateQuestionDraft } from "@/types/questionBank";

/** Above this cosine score two questions are treated as the same question. */
export const DUPLICATE_THRESHOLD = 0.92;
/** How many existing questions to compare against when checking for duplicates. */
const DUPLICATE_SCAN_LIMIT = 500;

export class QuestionBankError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "QuestionBankError";
  }
}

function toIso(value: unknown): string {
  if (value && typeof (value as Timestamp).toDate === "function") {
    return (value as Timestamp).toDate().toISOString();
  }
  return new Date().toISOString();
}

function toSummary(id: string, data: DocumentData): QuestionSummary {
  return {
    id,
    type: data.type ?? "technical",
    question: data.question ?? "",
    category: data.category ?? "",
    role: data.role ?? "Any",
    difficulty: data.difficulty ?? "Intermediate",
    tags: data.tags ?? [],
    status: data.status ?? "draft",
    version: data.version ?? 1,
    keyPointCount: data.keyPointCount ?? 0,
    mustHaveCount: data.mustHaveCount ?? 0,
    followUpQuestion: data.followUpQuestion ?? "",
    embeddingModel: data.embeddingModel ?? EMBEDDING_MODEL,
    createdAt: toIso(data.createdAt),
    updatedAt: toIso(data.updatedAt),
  };
}

function cleanDraft(draft: QuestionDraft): QuestionDraft {
  return {
    ...draft,
    question: draft.question.trim(),
    modelAnswer: draft.modelAnswer.trim(),
    followUpQuestion: draft.followUpQuestion?.trim() ?? "",
    tags: (draft.tags ?? []).map((t) => t.trim()).filter(Boolean),
    botLines: (draft.botLines ?? []).map((l) => l.trim()).filter(Boolean),
    keyPoints: (draft.keyPoints ?? [])
      .filter((kp) => kp.text.trim())
      .map((kp) => ({
        ...kp,
        text: kp.text.trim(),
        synonyms: (kp.synonyms ?? []).map((s) => s.trim()).filter(Boolean),
        weight: Math.min(3, Math.max(1, Math.round(kp.weight))),
      })),
  };
}

type EmbeddedDraft = {
  draft: QuestionDraft;
  questionEmbedding: number[];
  answerEmbedding: number[];
  keyPoints: KeyPoint[];
};

/**
 * One batched embedding call per question: the question text, the model answer,
 * and every key point (with its synonyms folded in).
 */
async function embedDraft(draft: QuestionDraft): Promise<EmbeddedDraft> {
  const keyPointTexts = draft.keyPoints.map((kp) =>
    keyPointEmbeddingText(kp.text, kp.synonyms)
  );

  const vectors = await embedTexts([
    draft.question,
    draft.modelAnswer,
    ...keyPointTexts,
  ]);

  const [questionEmbedding, answerEmbedding, ...keyPointVectors] = vectors;

  return {
    draft,
    questionEmbedding,
    answerEmbedding,
    keyPoints: draft.keyPoints.map((kp, index) => ({
      ...kp,
      embedding: keyPointVectors[index] ?? [],
    })),
  };
}

export async function findSimilarQuestions(
  type: QuestionDraft["type"],
  embedding: number[],
  excludeId?: string
): Promise<DuplicateMatch[]> {
  if (embedding.length === 0) return [];

  const { db } = await getFirestore();
  const snapshot = await db
    .collection(QUESTIONS_COLLECTION)
    .where("type", "==", type)
    .select("question", "questionEmbedding")
    .limit(DUPLICATE_SCAN_LIMIT)
    .get();

  const matches: DuplicateMatch[] = [];
  for (const doc of snapshot.docs) {
    if (doc.id === excludeId) continue;
    const other = doc.get("questionEmbedding") as number[] | undefined;
    if (!other?.length) continue;
    const similarity = cosineSimilarity(embedding, other);
    if (similarity >= DUPLICATE_THRESHOLD) {
      matches.push({
        id: doc.id,
        question: (doc.get("question") as string) ?? "",
        similarity,
      });
    }
  }

  return matches.sort((a, b) => b.similarity - a.similarity).slice(0, 3);
}

export async function createQuestion(
  input: QuestionDraft,
  options: { allowDuplicate?: boolean } = {}
): Promise<{ id: string; duplicates: DuplicateMatch[] }> {
  const draft = cleanDraft(input);
  const problems = validateQuestionDraft(draft);
  if (problems.length > 0) throw new QuestionBankError(problems.join("; "));

  const embedded = await embedDraft(draft);

  const duplicates = await findSimilarQuestions(draft.type, embedded.questionEmbedding);
  if (duplicates.length > 0 && !options.allowDuplicate) {
    return { id: "", duplicates };
  }

  const { db, FieldValue } = await getFirestore();
  const ref = db.collection(QUESTIONS_COLLECTION).doc();
  const batch = db.batch();

  batch.set(ref, {
    type: draft.type,
    question: draft.question,
    category: draft.category,
    role: draft.role,
    difficulty: draft.difficulty,
    tags: draft.tags,
    status: draft.status,
    version: 1,
    keyPointCount: embedded.keyPoints.length,
    mustHaveCount: embedded.keyPoints.filter((kp) => kp.mustHave).length,
    followUpQuestion: draft.followUpQuestion,
    questionEmbedding: embedded.questionEmbedding,
    embeddingModel: EMBEDDING_MODEL,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });

  batch.set(ref.collection(ANSWER_KEY_PATH[0]).doc(ANSWER_KEY_PATH[1]), {
    modelAnswer: draft.modelAnswer,
    answerEmbedding: embedded.answerEmbedding,
    keyPoints: embedded.keyPoints,
    botLines: draft.botLines,
    embeddingModel: EMBEDDING_MODEL,
  });

  await batch.commit();
  return { id: ref.id, duplicates: [] };
}

export async function updateQuestion(
  id: string,
  input: QuestionDraft
): Promise<void> {
  const draft = cleanDraft(input);
  const problems = validateQuestionDraft(draft);
  if (problems.length > 0) throw new QuestionBankError(problems.join("; "));

  const { db, FieldValue } = await getFirestore();
  const ref = db.collection(QUESTIONS_COLLECTION).doc(id);
  const existing = await ref.get();
  if (!existing.exists) throw new QuestionBankError("Question not found");

  const embedded = await embedDraft(draft);
  const batch = db.batch();

  batch.update(ref, {
    type: draft.type,
    question: draft.question,
    category: draft.category,
    role: draft.role,
    difficulty: draft.difficulty,
    tags: draft.tags,
    status: draft.status,
    version: ((existing.get("version") as number) ?? 1) + 1,
    keyPointCount: embedded.keyPoints.length,
    mustHaveCount: embedded.keyPoints.filter((kp) => kp.mustHave).length,
    followUpQuestion: draft.followUpQuestion,
    questionEmbedding: embedded.questionEmbedding,
    embeddingModel: EMBEDDING_MODEL,
    updatedAt: FieldValue.serverTimestamp(),
  });

  batch.set(ref.collection(ANSWER_KEY_PATH[0]).doc(ANSWER_KEY_PATH[1]), {
    modelAnswer: draft.modelAnswer,
    answerEmbedding: embedded.answerEmbedding,
    keyPoints: embedded.keyPoints,
    botLines: draft.botLines,
    embeddingModel: EMBEDDING_MODEL,
  });

  await batch.commit();
}

export async function setQuestionStatus(
  id: string,
  status: QuestionDraft["status"]
): Promise<void> {
  const { db, FieldValue } = await getFirestore();
  await db.collection(QUESTIONS_COLLECTION).doc(id).update({
    status,
    updatedAt: FieldValue.serverTimestamp(),
  });
}

export async function deleteQuestion(id: string): Promise<void> {
  const { db } = await getFirestore();
  const ref = db.collection(QUESTIONS_COLLECTION).doc(id);
  await ref
    .collection(ANSWER_KEY_PATH[0])
    .doc(ANSWER_KEY_PATH[1])
    .delete()
    .catch(() => undefined);
  await ref.delete();
}

export async function listQuestions(filters: {
  type?: string;
  category?: string;
  status?: string;
  search?: string;
  limit?: number;
}): Promise<QuestionSummary[]> {
  const { db } = await getFirestore();
  let query = db
    .collection(QUESTIONS_COLLECTION)
    .select(
      "type",
      "question",
      "category",
      "role",
      "difficulty",
      "tags",
      "status",
      "version",
      "keyPointCount",
      "mustHaveCount",
      "followUpQuestion",
      "embeddingModel",
      "createdAt",
      "updatedAt"
    )
    .limit(filters.limit ?? 300);

  if (filters.type) query = query.where("type", "==", filters.type);
  if (filters.category) query = query.where("category", "==", filters.category);
  if (filters.status) query = query.where("status", "==", filters.status);

  const snapshot = await query.get();
  let results = snapshot.docs.map((doc) => toSummary(doc.id, doc.data()));

  // Firestore has no substring search, so filter text in memory.
  const term = filters.search?.trim().toLowerCase();
  if (term) {
    results = results.filter(
      (q) =>
        q.question.toLowerCase().includes(term) ||
        q.category.toLowerCase().includes(term) ||
        q.tags.some((t) => t.toLowerCase().includes(term))
    );
  }

  return results.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export async function getQuestionWithAnswerKey(
  id: string
): Promise<{ summary: QuestionSummary; answerKey: AnswerKey } | null> {
  const { db } = await getFirestore();
  const ref = db.collection(QUESTIONS_COLLECTION).doc(id);
  const [doc, answerDoc] = await Promise.all([
    ref.get(),
    ref.collection(ANSWER_KEY_PATH[0]).doc(ANSWER_KEY_PATH[1]).get(),
  ]);

  if (!doc.exists) return null;
  const answerData = answerDoc.data();

  return {
    summary: toSummary(doc.id, doc.data() ?? {}),
    answerKey: {
      modelAnswer: answerData?.modelAnswer ?? "",
      answerEmbedding: answerData?.answerEmbedding ?? [],
      keyPoints: answerData?.keyPoints ?? [],
      botLines: answerData?.botLines ?? [],
      embeddingModel: answerData?.embeddingModel ?? EMBEDDING_MODEL,
    },
  };
}

export async function countQuestionsByType(): Promise<Record<string, number>> {
  const { db } = await getFirestore();
  const snapshot = await db
    .collection(QUESTIONS_COLLECTION)
    .select("type", "status")
    .limit(2000)
    .get();

  const counts: Record<string, number> = {
    total: snapshot.size,
    technical: 0,
    hr: 0,
    gd: 0,
    approved: 0,
    draft: 0,
  };

  for (const doc of snapshot.docs) {
    const type = doc.get("type") as string;
    const status = doc.get("status") as string;
    if (type in counts) counts[type] += 1;
    if (status in counts) counts[status] += 1;
  }

  return counts;
}
