import { AdminAuthError } from "@/lib/adminAuth";
import { QuestionBankError } from "@/lib/questionBank";

/** Maps thrown errors to the right status code and a message worth showing. */
export function jsonError(error: unknown): Response {
  if (error instanceof AdminAuthError) {
    return Response.json({ error: error.message }, { status: 401 });
  }
  if (error instanceof QuestionBankError) {
    return Response.json({ error: error.message }, { status: 400 });
  }

  const message = error instanceof Error ? error.message : "Unexpected server error";
  const isSetupProblem =
    message.includes("Firebase is not configured") ||
    message.includes("GOOGLE_AI_API_KEY is not set");

  return Response.json({ error: message }, { status: isSetupProblem ? 503 : 500 });
}
