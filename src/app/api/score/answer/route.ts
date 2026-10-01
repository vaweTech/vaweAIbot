import { evaluateAnswer, type EvaluationMode } from "@/lib/answerEvaluation";
import { jsonError } from "@/lib/apiResponse";
import { getQuestionWithAnswerKey } from "@/lib/questionBank";

/**
 * Grades a spoken answer. The answer key never leaves the server until the
 * grading is done, so a student cannot read the expected answer in advance.
 */
export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      questionId?: string;
      transcript?: string;
      durationSeconds?: number;
      mode?: EvaluationMode;
    };

    const questionId = body.questionId?.trim();
    const transcript = body.transcript?.trim();

    if (!questionId) {
      return Response.json({ error: "questionId is required" }, { status: 400 });
    }
    if (!transcript) {
      return Response.json({ error: "No speech was captured to score" }, { status: 400 });
    }

    const record = await getQuestionWithAnswerKey(questionId);
    if (!record) {
      return Response.json({ error: "Question not found" }, { status: 404 });
    }
    if (record.answerKey.keyPoints.length === 0) {
      return Response.json(
        { error: "This question has no answer key yet, so it cannot be scored" },
        { status: 409 }
      );
    }

    const evaluation = await evaluateAnswer({
      summary: record.summary,
      answerKey: record.answerKey,
      transcript,
      durationSeconds: Number(body.durationSeconds) || 1,
      mode: body.mode,
    });

    return Response.json(evaluation);
  } catch (error) {
    return jsonError(error);
  }
}
