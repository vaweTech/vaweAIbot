import { assertAdmin } from "@/lib/adminAuth";
import { jsonError } from "@/lib/apiResponse";
import { createTest, listTests } from "@/lib/testBank";
import type { TestDraft } from "@/types/interviewTest";

export async function GET(request: Request) {
  try {
    assertAdmin(request);
    return Response.json({ tests: await listTests() });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: Request) {
  try {
    assertAdmin(request);
    const body = (await request.json()) as { draft?: TestDraft };
    if (!body?.draft) {
      return Response.json({ error: "Missing test draft" }, { status: 400 });
    }
    const id = await createTest(body.draft);
    return Response.json({ saved: true, id });
  } catch (error) {
    return jsonError(error);
  }
}
