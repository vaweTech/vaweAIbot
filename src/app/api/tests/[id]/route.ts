import type { NextRequest } from "next/server";
import { AdminAuthError, assertAdmin } from "@/lib/adminAuth";
import { jsonError } from "@/lib/apiResponse";
import { getTest } from "@/lib/testBank";

/**
 * A test with its questions, ready to run. Draft tests are only served to an
 * admin (so they can preview before publishing). Answer keys never leave the server.
 */
export async function GET(request: NextRequest, ctx: RouteContext<"/api/tests/[id]">) {
  try {
    const { id } = await ctx.params;
    const test = await getTest(id);
    if (!test) return Response.json({ error: "Test not found" }, { status: 404 });

    if (test.status !== "published") {
      try {
        assertAdmin(request);
      } catch (error) {
        if (error instanceof AdminAuthError) {
          return Response.json({ error: "This test is not published yet" }, { status: 404 });
        }
        throw error;
      }
    }

    return Response.json({
      test: {
        ...test,
        questions: test.questions.map(({ status: _status, ...q }) => q),
      },
    });
  } catch (error) {
    return jsonError(error);
  }
}
