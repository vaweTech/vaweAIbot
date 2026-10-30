import { assertAdmin } from "@/lib/adminAuth";
import { jsonError } from "@/lib/apiResponse";
import { listInterviewResults } from "@/lib/resultBank";

export async function GET(request: Request) {
  try {
    assertAdmin(request);
    return Response.json({ results: await listInterviewResults() });
  } catch (error) {
    return jsonError(error);
  }
}
