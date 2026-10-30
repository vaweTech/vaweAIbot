import type { NextRequest } from "next/server";
import { assertAdmin } from "@/lib/adminAuth";
import { jsonError } from "@/lib/apiResponse";
import { deleteTest, getTest, setTestStatus, updateTest } from "@/lib/testBank";
import type { TestDraft, TestStatus } from "@/types/interviewTest";

export async function GET(request: NextRequest, ctx: RouteContext<"/api/admin/tests/[id]">) {
  try {
    assertAdmin(request);
    const { id } = await ctx.params;
    const test = await getTest(id);
    if (!test) return Response.json({ error: "Test not found" }, { status: 404 });
    return Response.json({ test });
  } catch (error) {
    return jsonError(error);
  }
}

export async function PUT(request: NextRequest, ctx: RouteContext<"/api/admin/tests/[id]">) {
  try {
    assertAdmin(request);
    const { id } = await ctx.params;
    const body = (await request.json()) as { draft?: TestDraft };
    if (!body?.draft) {
      return Response.json({ error: "Missing test draft" }, { status: 400 });
    }
    await updateTest(id, body.draft);
    return Response.json({ saved: true, id });
  } catch (error) {
    return jsonError(error);
  }
}

export async function PATCH(request: NextRequest, ctx: RouteContext<"/api/admin/tests/[id]">) {
  try {
    assertAdmin(request);
    const { id } = await ctx.params;
    const body = (await request.json()) as { status?: TestStatus };
    if (body?.status !== "draft" && body?.status !== "published") {
      return Response.json({ error: "Status must be draft or published" }, { status: 400 });
    }
    await setTestStatus(id, body.status);
    return Response.json({ saved: true, id, status: body.status });
  } catch (error) {
    return jsonError(error);
  }
}

export async function DELETE(request: NextRequest, ctx: RouteContext<"/api/admin/tests/[id]">) {
  try {
    assertAdmin(request);
    const { id } = await ctx.params;
    await deleteTest(id);
    return Response.json({ deleted: true, id });
  } catch (error) {
    return jsonError(error);
  }
}
