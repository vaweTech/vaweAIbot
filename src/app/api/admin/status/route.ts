import { adminCodeRequired } from "@/lib/adminAuth";
import { EMBEDDING_MODEL, isEmbeddingConfigured } from "@/lib/embeddings";
import { isFirebaseConfigured } from "@/lib/firebaseAdmin";
import { countQuestionsByType } from "@/lib/questionBank";

export async function GET() {
  const firebase = isFirebaseConfigured();
  const embeddings = isEmbeddingConfigured();

  let counts: Record<string, number> | null = null;
  let error: string | null = null;

  if (firebase) {
    try {
      counts = await countQuestionsByType();
    } catch (e) {
      error = e instanceof Error ? e.message : "Could not reach Firestore";
    }
  }

  return Response.json({
    firebase,
    embeddings,
    embeddingModel: EMBEDDING_MODEL,
    requiresCode: adminCodeRequired(),
    counts,
    error,
  });
}
