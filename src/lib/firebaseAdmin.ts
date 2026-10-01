import type { FieldValue as FieldValueType, Firestore } from "firebase-admin/firestore";

const APP_NAME = "vawe-admin";

export function isFirebaseConfigured(): boolean {
  return Boolean(
    process.env.FIREBASE_PROJECT_ID &&
      process.env.FIREBASE_CLIENT_EMAIL &&
      process.env.FIREBASE_PRIVATE_KEY
  );
}

export type FirestoreBundle = {
  db: Firestore;
  FieldValue: typeof FieldValueType;
};

let cached: FirestoreBundle | null = null;

/**
 * Loads firebase-admin on first use rather than at module load, so routes that
 * only report configuration status keep working even if the SDK cannot start.
 */
export async function getFirestore(): Promise<FirestoreBundle> {
  if (cached) return cached;

  if (!isFirebaseConfigured()) {
    throw new Error(
      "Firebase is not configured. Set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL and FIREBASE_PRIVATE_KEY in .env.local."
    );
  }

  const [{ cert, getApps, initializeApp }, firestore] = await Promise.all([
    import("firebase-admin/app"),
    import("firebase-admin/firestore"),
  ]);

  const existing = getApps().find((app) => app.name === APP_NAME);
  const app =
    existing ??
    initializeApp(
      {
        credential: cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          // Service-account keys arrive with literal \n when stored in an env var.
          privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
        }),
      },
      APP_NAME
    );

  cached = { db: firestore.getFirestore(app), FieldValue: firestore.FieldValue };
  return cached;
}

export const QUESTIONS_COLLECTION = "questions";
/** Sub-path holding the model answer and embeddings — never readable by clients. */
export const ANSWER_KEY_PATH = ["private", "answerKey"] as const;
