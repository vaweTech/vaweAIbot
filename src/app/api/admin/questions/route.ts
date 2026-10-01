import type { NextRequest } from "next/server";
import { assertAdmin } from "@/lib/adminAuth";
import { jsonError } from "@/lib/apiResponse";
import { createQuestion, listQuestions } from "@/lib/questionBank";
import type { QuestionDraft } from "@/types/questionBank";

export async function GET(request: NextRequest) {
  try {
    assertAdmin(request);
    const params = request.nextUrl.searchParams;
    const questions = await listQuestions({
      type: params.get("type") ?? undefined,
      category: params.get("category") ?? undefined,
      status: params.get("status") ?? undefined,
      search: params.get("search") ?? undefined,
    });
    return Response.json({ questions });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: Request) {
  try {
    assertAdmin(request);
    const body = (await request.json()) as {
      draft: QuestionDraft;
      allowDuplicate?: boolean;
    };

    if (!body?.draft) {
      return Response.json({ error: "Missing question draft" }, { status: 400 });
    }

    const { id, duplicates } = await createQuestion(body.draft, {
      allowDuplicate: body.allowDuplicate,
    });

    if (!id) {
      // Not saved: caller decides whether to save anyway.
      return Response.json({ saved: false, duplicates }, { status: 409 });
    }

    return Response.json({ saved: true, id });
  } catch (error) {
    return jsonError(error);
  }
}
