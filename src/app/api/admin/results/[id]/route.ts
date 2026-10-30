import type { NextRequest } from "next/server";
import { assertAdmin } from "@/lib/adminAuth";
import { jsonError } from "@/lib/apiResponse";
import { deleteInterviewResult, getInterviewResult } from "@/lib/resultBank";

export async function GET(request: NextRequest, ctx: RouteContext<"/api/admin/results/[id]">) {
  try {
    assertAdmin(request);
    const { id } = await ctx.params;
    const result = await getInterviewResult(id);
    if (!result) return Response.json({ error: "Result not found" }, { status: 404 });
    return Response.json({ result });
  } catch (error) {
    return jsonError(error);
  }
}

export async function DELETE(request: NextRequest, ctx: RouteContext<"/api/admin/results/[id]">) {
  try {
    assertAdmin(request);
    const { id } = await ctx.params;
    await deleteInterviewResult(id);
    return Response.json({ deleted: true, id });
  } catch (error) {
    return jsonError(error);
  }
}
