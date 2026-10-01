import { jsonError } from "@/lib/apiResponse";
import { getQuestionWithAnswerKey, listQuestions } from "@/lib/questionBank";
import type { BankQuestionType } from "@/types/questionBank";

const MAX_COUNT = 20;

export type SessionQuestion = {
  id: string;
  type: BankQuestionType;
  question: string;
  category: string;
  difficulty: string;
  role: string;
  keyPointCount: number;
  /** GD only: opening lines the AI bots speak. Never includes the answer key. */
  botLines: string[];
};

/**
 * Picks approved questions for a live interview or GD session.
 *
 * Only fields that are safe for a student to see are returned — the model
 * answer, key points and embeddings all stay on the server.
 */
export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const type = (url.searchParams.get("type") ?? "technical") as BankQuestionType;
    const category = url.searchParams.get("category") ?? undefined;
    const difficulty = url.searchParams.get("difficulty") ?? undefined;
    const count = Math.min(MAX_COUNT, Math.max(1, Number(url.searchParams.get("count")) || 5));

    const all = await listQuestions({ type, category, status: "approved" });
    const eligible = all.filter(
      (q) => q.keyPointCount > 0 && (!difficulty || q.difficulty === difficulty)
    );

    // Shuffle so repeat attempts do not replay the same order.
    for (let i = eligible.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [eligible[i], eligible[j]] = [eligible[j], eligible[i]];
    }
    const picked = eligible.slice(0, count);

    // Bot lines live beside the answer key, so fetch them only for GD.
    const botLinesById = new Map<string, string[]>();
    if (type === "gd") {
      const records = await Promise.all(picked.map((q) => getQuestionWithAnswerKey(q.id)));
      for (const record of records) {
        if (record) botLinesById.set(record.summary.id, record.answerKey.botLines);
      }
    }

    const questions: SessionQuestion[] = picked.map((q) => ({
      id: q.id,
      type: q.type,
      question: q.question,
      category: q.category,
      difficulty: q.difficulty,
      role: q.role,
      keyPointCount: q.keyPointCount,
      botLines: botLinesById.get(q.id) ?? [],
    }));

    return Response.json({ questions, available: eligible.length });
  } catch (error) {
    return jsonError(error);
  }
}
