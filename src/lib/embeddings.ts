/**
 * Google Gemini embedding wrapper.
 *
 * The same model and dimension count must be used when storing answers and when
 * scoring a student, otherwise the vectors are not comparable. The model name is
 * written onto every document so a future model change can be detected and the
 * bank re-embedded.
 *
 * Note: the current embedding models expose `embedContent` (one text per call)
 * and `asyncBatchEmbedContent` (a long-running job). There is no synchronous
 * batch method, so many texts are sent as parallel single calls.
 */

const API_BASE = "https://generativelanguage.googleapis.com/v1beta/models";
/** Parallel in-flight requests. Kept low to stay inside free-tier rate limits. */
const CONCURRENCY = 4;
const MAX_ATTEMPTS = 5;
/**
 * Minimum gap between request starts. The free tier limits requests per minute,
 * and a bulk import of a few dozen questions will blow through it in seconds
 * without pacing. Raise this if you still see 429s.
 */
const MIN_INTERVAL_MS = Number(process.env.EMBEDDING_MIN_INTERVAL_MS ?? 700);
/** gemini-embedding-001 accepts 2048 tokens; keep well under it. */
const MAX_CHARS = 7000;

export const EMBEDDING_MODEL = process.env.EMBEDDING_MODEL || "gemini-embedding-001";

/**
 * Native output is 3072 floats, which is slow to transfer and bloats Firestore
 * documents. 768 is a supported truncation and is plenty for answer matching.
 * Truncated vectors are not unit-length, which is fine because cosine
 * similarity divides by magnitude anyway.
 */
export const EMBEDDING_DIMENSIONS = 768;

export function isEmbeddingConfigured(): boolean {
  return Boolean(process.env.GOOGLE_AI_API_KEY);
}

function apiKey(): string {
  const key = process.env.GOOGLE_AI_API_KEY;
  if (!key) {
    throw new Error(
      "GOOGLE_AI_API_KEY is not set. Add it to .env.local to generate embeddings."
    );
  }
  return key;
}

function prepare(text: string): string {
  const clean = text.replace(/\s+/g, " ").trim();
  return clean.length > MAX_CHARS ? clean.slice(0, MAX_CHARS) : clean;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Spaces out request starts across the whole process. Reserving the slot before
 * any await keeps this correct without a lock, since JS runs it to completion.
 */
let nextSlot = 0;
async function takeSlot(): Promise<void> {
  const now = Date.now();
  const start = Math.max(now, nextSlot);
  nextSlot = start + MIN_INTERVAL_MS;
  if (start > now) await sleep(start - now);
}

/** Google returns a RetryInfo hint on 429; obeying it beats guessing. */
function retryAfterMs(body: string): number | null {
  const match = /"retryDelay"\s*:\s*"(\d+(?:\.\d+)?)s"/.exec(body);
  return match ? Math.ceil(Number(match[1]) * 1000) : null;
}

async function embedOne(text: string): Promise<number[]> {
  let lastError = "";

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    await takeSlot();

    const response = await fetch(`${API_BASE}/${EMBEDDING_MODEL}:embedContent`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        // Header rather than ?key= so the secret stays out of URLs and logs.
        "x-goog-api-key": apiKey(),
      },
      body: JSON.stringify({
        model: `models/${EMBEDDING_MODEL}`,
        content: { parts: [{ text }] },
        taskType: "SEMANTIC_SIMILARITY",
        outputDimensionality: EMBEDDING_DIMENSIONS,
      }),
    });

    if (response.ok) {
      const data = (await response.json()) as { embedding?: { values?: number[] } };
      const values = data.embedding?.values;
      if (!values?.length) throw new Error("Embedding response contained no vector");
      return values;
    }

    lastError = (await response.text()).slice(0, 300);

    // Rate limits and transient upstream failures are worth retrying; a bad key
    // or a retired model name is not.
    const rateLimited = response.status === 429;
    const retryable = rateLimited || response.status >= 500;
    if (!retryable || attempt === MAX_ATTEMPTS) {
      throw new Error(`Embedding request failed (${response.status}): ${lastError}`);
    }

    // A per-minute quota needs a pause measured in seconds, not milliseconds.
    const wait = rateLimited
      ? (retryAfterMs(lastError) ?? 20_000 * attempt)
      : 500 * 2 ** (attempt - 1);
    // Hold back every other worker too, not just this one.
    nextSlot = Math.max(nextSlot, Date.now() + wait);
    await sleep(wait);
  }

  throw new Error(`Embedding request failed after ${MAX_ATTEMPTS} attempts: ${lastError}`);
}

/** Embeds many texts, preserving input order. Empty strings get empty vectors. */
export async function embedTexts(texts: string[]): Promise<number[][]> {
  const prepared = texts.map(prepare);
  const results: number[][] = prepared.map(() => []);
  const queue = prepared
    .map((text, index) => ({ text, index }))
    .filter((item) => item.text.length > 0);

  let cursor = 0;
  const workers = Array.from({ length: Math.min(CONCURRENCY, queue.length) }, async () => {
    while (cursor < queue.length) {
      const item = queue[cursor++];
      results[item.index] = await embedOne(item.text);
    }
  });

  await Promise.all(workers);
  return results;
}

export async function embedText(text: string): Promise<number[]> {
  const [vector] = await embedTexts([text]);
  return vector;
}

export function cosineSimilarity(a: number[], b: number[]): number {
  if (!a?.length || !b?.length || a.length !== b.length) return 0;
  let dot = 0;
  let magA = 0;
  let magB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    magA += a[i] * a[i];
    magB += b[i] * b[i];
  }
  if (magA === 0 || magB === 0) return 0;
  return dot / (Math.sqrt(magA) * Math.sqrt(magB));
}

/**
 * Text used to embed a key point. Folding synonyms in widens the region of
 * meaning that counts as a match, so a student saying "JS library" still hits
 * a point written as "JavaScript library for building user interfaces".
 */
export function keyPointEmbeddingText(text: string, synonyms: string[]): string {
  const extras = synonyms.map((s) => s.trim()).filter(Boolean);
  return extras.length > 0 ? `${text}. ${extras.join(". ")}` : text;
}
