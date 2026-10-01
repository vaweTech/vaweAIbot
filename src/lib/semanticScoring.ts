/**
 * Compares a student's spoken answer to the stored answer key by meaning
 * rather than by exact wording.
 *
 * Calibration matters here. With gemini-embedding-001 two completely unrelated
 * sentences still score about 0.64, and a good paraphrase scores about 0.89.
 * Feeding raw cosine into a percentage would therefore award ~64/100 for
 * nonsense, so every similarity is rescaled against a measured floor and
 * ceiling before it becomes a score.
 */

import { cosineSimilarity, embedTexts } from "@/lib/embeddings";
import type { AnswerKey, ArgumentSide } from "@/types/questionBank";

/**
 * Whole answer against the whole model answer. Unrelated text measures ~0.64
 * and a close paraphrase ~0.89, so that is the usable band.
 */
export const ANSWER_FLOOR = Number(process.env.SCORING_ANSWER_FLOOR ?? 0.62);
export const ANSWER_CEILING = Number(process.env.SCORING_ANSWER_CEILING ?? 0.88);

/**
 * Individual key points need a much stricter band. Every sentence in an answer
 * about database indexes is somewhat similar to every key point about database
 * indexes, so an unmentioned point still measures around 0.79 purely from
 * shared topic. Treating that as a match would credit students for things they
 * never said. Measured: same topic but different point ~0.79, point actually
 * made ~0.95.
 */
export const KEYPOINT_FLOOR = Number(process.env.SCORING_KEYPOINT_FLOOR ?? 0.8);
export const KEYPOINT_CEILING = Number(process.env.SCORING_KEYPOINT_CEILING ?? 0.93);

/** Rescaled coverage needed before a point is treated as actually made. */
const COVERED_AT = 0.55;
const PARTIAL_AT = 0.25;
/** Content cannot exceed this when a must-have point was never mentioned. */
const MUST_HAVE_CAP = 55;
/** Upper bound on embedding calls per answer, to stay inside rate limits. */
const MAX_CHUNKS = 8;

export type KeyPointStatus = "covered" | "partial" | "missed";

export type KeyPointResult = {
  id: string;
  text: string;
  weight: number;
  mustHave: boolean;
  side: ArgumentSide;
  /** Raw cosine, useful when calibrating thresholds. */
  similarity: number;
  /** Rescaled 0-1 credit awarded for this point. */
  coverage: number;
  status: KeyPointStatus;
};

export type SemanticResult = {
  /** 0-100, weighted key-point coverage. */
  contentScore: number;
  /** 0-100, whole answer against the whole model answer. */
  answerSimilarity: number;
  keyPoints: KeyPointResult[];
  coveredCount: number;
  partialCount: number;
  missedCount: number;
  missedMustHave: string[];
  /** Whether the must-have cap was applied. */
  capped: boolean;
  /** GD only: how much of each argument side the student touched, 0-100. */
  sideBalance: Record<Exclude<ArgumentSide, "none">, number> | null;
};

export function rescale(similarity: number, floor: number, ceiling: number): number {
  const span = ceiling - floor;
  if (span <= 0) return similarity >= ceiling ? 1 : 0;
  return Math.max(0, Math.min(1, (similarity - floor) / span));
}

/**
 * Splits an answer into pieces to match key points against individually.
 * Matching each point against the whole answer alone dilutes a short, correct
 * point inside a long answer, so sentences are compared too.
 */
export function splitIntoChunks(text: string): string[] {
  const sentences = text
    .split(/(?<=[.!?])\s+|\n+/)
    .map((s) => s.trim())
    .filter(Boolean);

  if (sentences.length === 0) return [];

  // Fold very short fragments into the previous sentence so "Yes." does not
  // become its own chunk and burn an embedding call.
  const merged: string[] = [];
  for (const sentence of sentences) {
    const words = sentence.split(/\s+/).length;
    if (merged.length > 0 && words < 4) {
      merged[merged.length - 1] += ` ${sentence}`;
    } else {
      merged.push(sentence);
    }
  }

  if (merged.length <= MAX_CHUNKS) return merged;

  // Too many sentences: group them evenly rather than dropping the tail.
  const perChunk = Math.ceil(merged.length / MAX_CHUNKS);
  const grouped: string[] = [];
  for (let i = 0; i < merged.length; i += perChunk) {
    grouped.push(merged.slice(i, i + perChunk).join(" "));
  }
  return grouped;
}

function statusFor(coverage: number): KeyPointStatus {
  if (coverage >= COVERED_AT) return "covered";
  if (coverage >= PARTIAL_AT) return "partial";
  return "missed";
}

function emptyResult(): SemanticResult {
  return {
    contentScore: 0,
    answerSimilarity: 0,
    keyPoints: [],
    coveredCount: 0,
    partialCount: 0,
    missedCount: 0,
    missedMustHave: [],
    capped: false,
    sideBalance: null,
  };
}

export async function scoreAnswerSemantically(
  transcript: string,
  answerKey: AnswerKey,
  options: { includeSideBalance?: boolean } = {}
): Promise<SemanticResult> {
  const text = transcript.trim();
  if (!text) return emptyResult();

  const chunks = splitIntoChunks(text);
  // The whole answer is embedded as well so an idea spread across two
  // sentences can still match a single key point.
  const [wholeEmbedding, ...chunkEmbeddings] = await embedTexts([text, ...chunks]);

  const candidates = [wholeEmbedding, ...chunkEmbeddings].filter((v) => v.length > 0);

  const keyPoints: KeyPointResult[] = answerKey.keyPoints.map((kp) => {
    const similarity = kp.embedding?.length
      ? Math.max(0, ...candidates.map((c) => cosineSimilarity(kp.embedding, c)))
      : 0;
    const coverage = rescale(similarity, KEYPOINT_FLOOR, KEYPOINT_CEILING);
    return {
      id: kp.id,
      text: kp.text,
      weight: kp.weight,
      mustHave: kp.mustHave,
      side: kp.side,
      similarity,
      coverage,
      status: statusFor(coverage),
    };
  });

  const totalWeight = keyPoints.reduce((sum, kp) => sum + kp.weight, 0);
  let contentScore =
    totalWeight > 0
      ? (keyPoints.reduce((sum, kp) => sum + kp.coverage * kp.weight, 0) / totalWeight) * 100
      : 0;

  const missedMustHave = keyPoints
    .filter((kp) => kp.mustHave && kp.status === "missed")
    .map((kp) => kp.text);

  const capped = missedMustHave.length > 0 && contentScore > MUST_HAVE_CAP;
  if (capped) contentScore = MUST_HAVE_CAP;

  const answerSimilarity = answerKey.answerEmbedding?.length
    ? rescale(
        cosineSimilarity(answerKey.answerEmbedding, wholeEmbedding),
        ANSWER_FLOOR,
        ANSWER_CEILING
      ) * 100
    : 0;

  let sideBalance: SemanticResult["sideBalance"] = null;
  if (options.includeSideBalance) {
    sideBalance = { for: 0, against: 0, example: 0 };
    for (const side of ["for", "against", "example"] as const) {
      const points = keyPoints.filter((kp) => kp.side === side);
      sideBalance[side] =
        points.length > 0
          ? Math.round((points.reduce((sum, kp) => sum + kp.coverage, 0) / points.length) * 100)
          : 0;
    }
  }

  return {
    contentScore: Math.round(contentScore),
    answerSimilarity: Math.round(answerSimilarity),
    keyPoints,
    coveredCount: keyPoints.filter((kp) => kp.status === "covered").length,
    partialCount: keyPoints.filter((kp) => kp.status === "partial").length,
    missedCount: keyPoints.filter((kp) => kp.status === "missed").length,
    missedMustHave,
    capped,
    sideBalance,
  };
}
