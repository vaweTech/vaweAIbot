import type { NextRequest } from "next/server";
import { assertAdmin } from "@/lib/adminAuth";
import { jsonError } from "@/lib/apiResponse";
import {
  deleteQuestion,
  getQuestionWithAnswerKey,
  setQuestionStatus,
  updateQuestion,
} from "@/lib/questionBank";
import type { BankStatus, QuestionDraft } from "@/types/questionBank";

export async function GET(
  request: NextRequest,
  ctx: RouteContext<"/api/admin/questions/[id]">
) {
  try {
    assertAdmin(request);
    const { id } = await ctx.params;
    const found = await getQuestionWithAnswerKey(id);
    if (!found) {
      return Response.json({ error: "Question not found" }, { status: 404 });
    }

    // Vectors are large and useless to the editor — strip them from the response.
    return Response.json({
      summary: found.summary,
      answerKey: {
        modelAnswer: found.answerKey.modelAnswer,
        botLines: found.answerKey.botLines,
        keyPoints: found.answerKey.keyPoints.map(({ embedding, ...rest }) => rest),
      },
    });
  } catch (error) {
    return jsonError(error);
  }
}

export async function PUT(
  request: NextRequest,
  ctx: RouteContext<"/api/admin/questions/[id]">
) {
  try {
    assertAdmin(request);
    const { id } = await ctx.params;
    const body = (await request.json()) as { draft: QuestionDraft };
    if (!body?.draft) {
      return Response.json({ error: "Missing question draft" }, { status: 400 });
    }
    await updateQuestion(id, body.draft);
    return Response.json({ saved: true, id });
  } catch (error) {
    return jsonError(error);
  }
}

export async function PATCH(
  request: NextRequest,
  ctx: RouteContext<"/api/admin/questions/[id]">
) {
  try {
    assertAdmin(request);
    const { id } = await ctx.params;
    const body = (await request.json()) as { status?: BankStatus };
    if (!body?.status) {
      return Response.json({ error: "Missing status" }, { status: 400 });
    }
    await setQuestionStatus(id, body.status);
    return Response.json({ saved: true, id, status: body.status });
  } catch (error) {
    return jsonError(error);
  }
}

export async function DELETE(
  request: NextRequest,
  ctx: RouteContext<"/api/admin/questions/[id]">
) {
  try {
    assertAdmin(request);
    const { id } = await ctx.params;
    await deleteQuestion(id);
    return Response.json({ deleted: true, id });
  } catch (error) {
    return jsonError(error);
  }
}
