import { jsonError } from "@/lib/apiResponse";
import { saveInterviewResult } from "@/lib/resultBank";

/** Stores a finished interview, with every answer's grading, in Firestore. */
export async function POST(request: Request) {
  try {
    const id = await saveInterviewResult(await request.json());
    return Response.json({ id }, { status: 201 });
  } catch (error) {
    return jsonError(error);
  }
}
