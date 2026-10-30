/**
 * Asks a Gemini text model to grade a spoken answer the way an examiner would,
 * in one structured call: key-point verdicts with evidence, rubric marks,
 * factual errors, English mistakes and the examiner's own confidence.
 *
 * Embeddings alone cannot do this well: a key point written as a description
 * ("explains the project topic") is far, in vector space, from a concrete
 * answer that actually does it ("my project is a face recognition attendance
 * system"), and rule-based grammar checks miss most real spoken mistakes.
 *
 * The model's output is not trusted blindly. Evidence quotes must be traceable
 * to the transcript and marks must be consistent with the errors found; when
 * the examiner is unsure or inconsistent, a second model grades the same
 * answer and the two verdicts are reconciled. Only uncertain answers pay for
 * that second call.
 *
 * Returns null on any failure so callers can fall back to the embedding and
 * rule-based checks instead of failing the whole grading request.
 */

import type { JudgedDimension } from "@/lib/rubric";
import { rubricGuidance } from "@/lib/rubric";
import type { KeyPointStatus } from "@/lib/semanticScoring";
import type { AnswerKey, BankQuestionType } from "@/types/questionBank";

const API_BASE = "https://generativelanguage.googleapis.com/v1beta/models";
/**
 * Tried in order. Newer flash models are often briefly overloaded (503) and
 * older ones get retired for new keys (404), so a chain keeps grading working.
 */
export const JUDGE_MODELS = (
  process.env.JUDGE_MODELS || "gemini-3.8-flash,gemini-3.5-flash,gemini-flash-latest,gemini-3.1-flash-lite"
)
  .split(",")
  .map((m) => m.trim())
  .filter(Boolean);
/** Per-model wait; a slow model is skipped rather than holding up the student. */
const TIMEOUT_MS = 15_000;
/** Give up on AI grading entirely after this long and use the fallback. */
const TOTAL_BUDGET_MS = 35_000;
const MAX_MISTAKES = 6;
const MAX_FACTUAL_ERRORS = 4;
/** Share of a quote's words that must appear in the transcript for it to count as evidence. */
const EVIDENCE_MATCH = 0.5;

export const MISTAKE_CATEGORIES = [
  "Pronouns",
  "Tense",
  "Articles",
  "Prepositions",
  "Subject-Verb Agreement",
  "Sentence Structure",
  "Word Choice",
] as const;

export const JUDGE_FLAGS = [
  "ambiguous",
  "incomplete",
  "contradictory",
  "unsupported",
  "transcript_unclear",
] as const;
export type JudgeFlag = (typeof JUDGE_FLAGS)[number];
export type JudgeConfidence = "high" | "medium" | "low";

export type JudgedMistake = {
  original: string;
  correction: string;
  category: (typeof MISTAKE_CATEGORIES)[number];
  explanation: string;
};

export type KeyPointVerdict = {
  id: string;
  status: KeyPointStatus;
  /** The student's own words that support the verdict. */
  evidence: string;
  /** Why the verdict was given, in a few words. */
  reason: string;
};

export type FactualError = { quote: string; issue: string };

export type JudgeResult = {
  keyPoints: KeyPointVerdict[];
  /** 0-10 per dimension; concepts are scored from keyPoints instead. */
  rubric: Record<JudgedDimension, number>;
  factualErrors: FactualError[];
  /** 0-100: how directly the answer addresses the question. */
  onTopic: number;
  confidence: JudgeConfidence;
  flags: JudgeFlag[];
  mistakes: JudgedMistake[];
  /** The student's own answer rewritten in correct English, no new facts. */
  improvedAnswer: string;
};

export type JudgeOutcome = {
  result: JudgeResult;
  /** Models whose verdicts went into the result, in order. */
  models: string[];
  secondOpinion: boolean;
  /** Still uncertain after every check: a trainer should look at it. */
  needsReview: boolean;
  /** Plain-language reasons the answer was double-checked or flagged. */
  reviewReasons: string[];
};

const SYSTEM_PROMPT = `You are a strict but fair interview examiner grading answers from engineering students in India.
The answer was spoken aloud and converted to text by speech recognition, so:
- Ignore missing punctuation and capitalisation.
- When a word is obviously mis-heard (for example "eating a stack" for "tech stack"), read it as intended when judging content, and do not report the mis-hearing as a mistake.
- Never lower content or rubric marks for grammar, vocabulary or an Indian accent. English quality is graded separately.

KEY POINTS — for each one:
- "covered": the student clearly conveys this idea in any wording. Doing what the point describes counts: naming and describing their project covers "explains the project topic". Accepted alternatives count fully.
- "partial": the idea is hinted at or named without any substance.
- "missed": the student did not say it. Never give credit for ideas that only appear in the question or the model answer.
- evidence: an exact quote from the transcript, copied as written even if mis-heard, max 12 words; empty when missed.
- reason: why, max 12 words.

RUBRIC — score each dimension 0-10 using the guidance given with the question.

FACTUAL ERRORS — every technically wrong, contradictory or misconceived statement the student made, with the exact quote and the issue in max 15 words. Saying a listed common misconception is always a factual error. Do not list omissions here.

MISTAKES — genuine grammar or pronoun errors in the student's English. Use the exact transcript words as "original", the corrected phrase, and a max 15-word explanation. Do not flag punctuation, capitalisation, filler words or mis-hearings. At most ${MAX_MISTAKES}.

onTopic: 0-100, how directly the answer addresses the question asked.

confidence: "high" when the verdict is clear-cut, "medium" when reasonable examiners might differ slightly, "low" when the answer is vague, ambiguous or hard to interpret.
flags: any that apply — "ambiguous" (could be read as right or wrong), "incomplete" (stops mid-thought), "contradictory" (says opposing things), "unsupported" (claims without substance), "transcript_unclear" (speech recognition garbled too much to grade fairly).

improvedAnswer: the student's own answer in correct, natural spoken English. Keep only their facts; never add new facts, examples or points. Max 60 words.`;

const RESPONSE_SCHEMA = {
  type: "OBJECT",
  properties: {
    keyPoints: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          id: { type: "STRING" },
          status: { type: "STRING", enum: ["covered", "partial", "missed"] },
          evidence: { type: "STRING" },
          reason: { type: "STRING" },
        },
        required: ["id", "status", "evidence", "reason"],
      },
    },
    rubric: {
      type: "OBJECT",
      properties: {
        correctness: { type: "INTEGER" },
        reasoning: { type: "INTEGER" },
        clarity: { type: "INTEGER" },
      },
      required: ["correctness", "reasoning", "clarity"],
    },
    factualErrors: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: { quote: { type: "STRING" }, issue: { type: "STRING" } },
        required: ["quote", "issue"],
      },
    },
    onTopic: { type: "INTEGER" },
    confidence: { type: "STRING", enum: ["high", "medium", "low"] },
    flags: { type: "ARRAY", items: { type: "STRING", enum: [...JUDGE_FLAGS] } },
    mistakes: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          original: { type: "STRING" },
          correction: { type: "STRING" },
          category: { type: "STRING", enum: [...MISTAKE_CATEGORIES] },
          explanation: { type: "STRING" },
        },
        required: ["original", "correction", "category", "explanation"],
      },
    },
    improvedAnswer: { type: "STRING" },
  },
  required: [
    "keyPoints",
    "rubric",
    "factualErrors",
    "onTopic",
    "confidence",
    "flags",
    "mistakes",
    "improvedAnswer",
  ],
};

const TYPE_LABEL: Record<BankQuestionType, string> = {
  technical: "Technical interview question",
  hr: "HR / behavioural interview question",
  gd: "Group discussion topic",
};

/** Extra instructions where a type is graded differently from the default technical view. */
const TYPE_INSTRUCTIONS: Partial<Record<BankQuestionType, string>> = {
  hr: `HOW TO GRADE THIS HR ANSWER:
- There is no technical right answer. Never judge or mention technical accuracy, and do not expect technical terms.
- Judge what an HR interviewer looks for: a direct answer to the question, honesty and self-awareness, a specific real example (situation, task, action, result), a positive professional attitude, and a clear structure.
- Personal facts the student states about themselves (their name, college, projects, hobbies) are their own and cannot be "wrong".
- In factualErrors, list only remarks an employer would see as a red flag (blaming others, negativity about past teams or teachers, dishonesty, arrogance) or statements that contradict each other, with the issue phrased as advice.`,
};

function buildPrompt(
  question: string,
  questionType: BankQuestionType,
  answerKey: AnswerKey,
  transcript: string
): string {
  const points = answerKey.keyPoints
    .map((kp) => {
      const tags = [kp.mustHave ? "essential" : "", kp.side !== "none" ? `side: ${kp.side}` : ""]
        .filter(Boolean)
        .join(", ");
      const synonyms = kp.synonyms.length > 0 ? ` (also accept: ${kp.synonyms.join("; ")})` : "";
      return `- id "${kp.id}"${tags ? ` [${tags}]` : ""}: ${kp.text}${synonyms}`;
    })
    .join("\n");

  const misconceptions = answerKey.misconceptions?.length
    ? `\nCOMMON MISCONCEPTIONS (each one stated is a factual error):\n${answerKey.misconceptions
        .map((m) => `- ${m}`)
        .join("\n")}\n`
    : "";
  const notes = answerKey.rubricNotes?.trim()
    ? `\nTRAINER'S GRADING NOTES:\n${answerKey.rubricNotes.trim()}\n`
    : "";

  return `QUESTION TYPE: ${TYPE_LABEL[questionType]}
${TYPE_INSTRUCTIONS[questionType] ? `\n${TYPE_INSTRUCTIONS[questionType]}\n` : ""}
QUESTION:
${question}

MODEL ANSWER (reference only — the student does not need to match its wording):
${answerKey.modelAnswer}

KEY POINTS:
${points}

RUBRIC GUIDANCE:
${rubricGuidance(questionType)}
${misconceptions}${notes}
STUDENT'S ANSWER (speech-to-text):
"""${transcript}"""`;
}

function words(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2);
}

/** A quote counts as evidence only if most of its words were actually spoken. */
function traceable(quote: string, spoken: Set<string>): boolean {
  const quoted = words(quote);
  if (quoted.length === 0) return false;
  return quoted.filter((w) => spoken.has(w)).length / quoted.length >= EVIDENCE_MATCH;
}

function clampInt(value: unknown, min: number, max: number): number {
  return Math.max(min, Math.min(max, Math.round(Number(value) || 0)));
}

/**
 * Checks the model's output against the transcript and the answer key.
 * Returns the cleaned result plus anything that looked wrong, or null when the
 * output is unusable.
 */
function validate(
  raw: unknown,
  answerKey: AnswerKey,
  transcript: string
): { result: JudgeResult; problems: string[] } | null {
  if (!raw || typeof raw !== "object") return null;
  const data = raw as Partial<JudgeResult>;
  if (!Array.isArray(data.keyPoints) || !data.rubric) return null;

  const statuses = new Set<KeyPointStatus>(["covered", "partial", "missed"]);
  const byId = new Map(
    data.keyPoints
      .filter((kp) => kp && statuses.has(kp.status))
      .map((kp) => [kp.id, kp] as const)
  );
  // Every stored point needs a verdict, otherwise the result cannot replace the fallback.
  if (answerKey.keyPoints.some((kp) => !byId.has(kp.id))) return null;

  const spoken = new Set(words(transcript));
  const problems: string[] = [];

  const keyPoints = answerKey.keyPoints.map((kp): KeyPointVerdict => {
    const verdict = byId.get(kp.id)!;
    const evidence = verdict.status === "missed" ? "" : String(verdict.evidence ?? "").trim().slice(0, 200);
    const reason = String(verdict.reason ?? "").trim().slice(0, 160);
    if (verdict.status !== "missed" && !traceable(evidence, spoken)) {
      // Credit without a real quote is the classic hallucinated verdict.
      problems.push(`No supporting quote for "${kp.text}"`);
      return {
        id: kp.id,
        status: verdict.status === "covered" ? "partial" : "missed",
        evidence: "",
        reason: reason || "Not clearly supported by what was said",
      };
    }
    return { id: kp.id, status: verdict.status, evidence, reason };
  });

  const lowerTranscript = transcript.toLowerCase();
  const categories = new Set<string>(MISTAKE_CATEGORIES);
  const mistakes = (Array.isArray(data.mistakes) ? data.mistakes : [])
    .filter(
      (m) =>
        m &&
        typeof m.original === "string" &&
        m.original.trim() &&
        typeof m.correction === "string" &&
        m.original.trim().toLowerCase() !== m.correction.trim().toLowerCase() &&
        categories.has(m.category) &&
        // Drop invented quotes: the "mistake" must really be in what was said.
        lowerTranscript.includes(m.original.trim().toLowerCase().replace(/[.,!?]+$/, ""))
    )
    .slice(0, MAX_MISTAKES);

  const factualErrors = (Array.isArray(data.factualErrors) ? data.factualErrors : [])
    .filter((e) => e && typeof e.quote === "string" && typeof e.issue === "string" && e.issue.trim())
    .filter((e) => traceable(e.quote, spoken))
    .map((e) => ({ quote: e.quote.trim().slice(0, 200), issue: e.issue.trim().slice(0, 200) }));
  const uniqueErrors = dedupeErrors(factualErrors);

  const rubric = {
    correctness: clampInt(data.rubric.correctness, 0, 10),
    reasoning: clampInt(data.rubric.reasoning, 0, 10),
    clarity: clampInt(data.rubric.clarity, 0, 10),
  };

  const flagSet = new Set<string>(JUDGE_FLAGS);
  const flags = [...new Set((Array.isArray(data.flags) ? data.flags : []).filter((f) => flagSet.has(f)))];
  const confidence: JudgeConfidence =
    data.confidence === "high" || data.confidence === "low" ? data.confidence : "medium";

  if (uniqueErrors.length > 0 && rubric.correctness >= 9) {
    problems.push("Near-full correctness despite factual errors");
  }
  if (keyPoints.every((kp) => kp.status === "missed") && rubric.correctness >= 7) {
    problems.push("High correctness but no expected point covered");
  }

  return {
    result: {
      keyPoints,
      rubric,
      factualErrors: uniqueErrors,
      onTopic: clampInt(data.onTopic, 0, 100),
      confidence,
      flags,
      mistakes,
      improvedAnswer: String(data.improvedAnswer ?? "").trim(),
    },
    problems,
  };
}

/** Drops errors whose quote is contained in an earlier, longer one. */
function dedupeErrors(errors: FactualError[]): FactualError[] {
  const kept: { error: FactualError; key: string }[] = [];
  const byLength = [...errors].sort((x, y) => y.quote.length - x.quote.length);
  for (const error of byLength) {
    const key = words(error.quote).join(" ");
    if (!key || kept.some((k) => k.key.includes(key))) continue;
    kept.push({ error, key });
  }
  // Back in the order the student said them.
  return errors.filter((e) => kept.some((k) => k.error === e)).slice(0, MAX_FACTUAL_ERRORS);
}

/** Why an answer deserves a second examiner, or an empty list if it does not. */
function uncertainty(result: JudgeResult, problems: string[]): string[] {
  const reasons = [...problems];
  if (result.confidence === "low") reasons.push("The examiner was not confident in its grade");
  if (result.flags.includes("ambiguous")) reasons.push("The answer could be read as right or wrong");
  if (result.flags.includes("contradictory")) reasons.push("The answer contradicts itself");
  return reasons;
}

/** Reconciles two examiners: agreement stands, disagreement becomes partial credit. */
function reconcile(a: JudgeResult, b: JudgeResult): { result: JudgeResult; majorDisagreement: boolean } {
  const other = new Map(b.keyPoints.map((kp) => [kp.id, kp]));
  let majorDisagreement = false;

  const keyPoints = a.keyPoints.map((kp): KeyPointVerdict => {
    const second = other.get(kp.id);
    if (!second || second.status === kp.status) return kp;
    if (
      (kp.status === "covered" && second.status === "missed") ||
      (kp.status === "missed" && second.status === "covered")
    ) {
      majorDisagreement = true;
    }
    return {
      id: kp.id,
      status: "partial",
      evidence: kp.evidence || second.evidence,
      reason: "Examiners disagreed, so partial credit was given",
    };
  });

  const average = (x: number, y: number) => Math.round((x + y) / 2);
  const rubric = {
    correctness: average(a.rubric.correctness, b.rubric.correctness),
    reasoning: average(a.rubric.reasoning, b.rubric.reasoning),
    clarity: average(a.rubric.clarity, b.rubric.clarity),
  };
  if (
    Math.abs(a.rubric.correctness - b.rubric.correctness) >= 4 ||
    Math.abs(a.rubric.reasoning - b.rubric.reasoning) >= 4
  ) {
    majorDisagreement = true;
  }

  // An error only one examiner noticed is still shown, but only once.
  const factualErrors = dedupeErrors([...a.factualErrors, ...b.factualErrors]);

  return {
    result: {
      ...a,
      keyPoints,
      rubric,
      factualErrors,
      onTopic: average(a.onTopic, b.onTopic),
      confidence: majorDisagreement ? "low" : "medium",
      flags: [...new Set([...a.flags, ...b.flags])],
    },
    majorDisagreement,
  };
}

type Attempt = { result: JudgeResult; problems: string[]; model: string };

async function gradeWithChain(
  models: string[],
  prompt: string,
  options: { answerKey: AnswerKey; transcript: string; key: string; deadline: number }
): Promise<Attempt | null> {
  for (const model of models) {
    const remaining = options.deadline - Date.now();
    if (remaining < 3000) break;

    try {
      const response = await fetch(`${API_BASE}/${model}:generateContent`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": options.key },
        body: JSON.stringify(requestBody(model, prompt)),
        signal: AbortSignal.timeout(Math.min(TIMEOUT_MS, remaining)),
      });

      if (!response.ok) {
        const detail = (await response.text()).replace(/\s+/g, " ").slice(0, 160);
        console.warn(`[answerJudge] ${model} returned ${response.status}: ${detail}`);
        continue;
      }

      const data = (await response.json()) as {
        candidates?: { content?: { parts?: { text?: string }[] } }[];
      };
      const text = data.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("") ?? "";
      const checked = validate(JSON.parse(text), options.answerKey, options.transcript);
      if (checked) return { ...checked, model };
      console.warn(`[answerJudge] ${model} returned an incomplete verdict`);
    } catch (error) {
      console.warn(`[answerJudge] ${model} failed:`, error instanceof Error ? error.message : error);
    }
  }
  return null;
}

export async function judgeAnswer(options: {
  question: string;
  questionType: BankQuestionType;
  answerKey: AnswerKey;
  transcript: string;
}): Promise<JudgeOutcome | null> {
  const key = process.env.GOOGLE_AI_API_KEY;
  if (!key || options.answerKey.keyPoints.length === 0) return null;

  const prompt = buildPrompt(options.question, options.questionType, options.answerKey, options.transcript);
  const context = {
    answerKey: options.answerKey,
    transcript: options.transcript,
    key,
    deadline: Date.now() + TOTAL_BUDGET_MS,
  };

  const first = await gradeWithChain(JUDGE_MODELS, prompt, context);
  if (!first) return null;

  const reasons = uncertainty(first.result, first.problems);
  if (reasons.length === 0) {
    return { result: first.result, models: [first.model], secondOpinion: false, needsReview: false, reviewReasons: [] };
  }

  // A different model is a genuinely independent second opinion; the same one
  // would mostly repeat itself.
  const others = JUDGE_MODELS.filter((m) => m !== first.model);
  const second = others.length > 0 ? await gradeWithChain(others, prompt, context) : null;
  if (!second) {
    return {
      result: first.result,
      models: [first.model],
      secondOpinion: false,
      needsReview: true,
      reviewReasons: reasons,
    };
  }

  const { result, majorDisagreement } = reconcile(first.result, second.result);
  return {
    result,
    models: [first.model, second.model],
    secondOpinion: true,
    needsReview: majorDisagreement,
    reviewReasons: majorDisagreement
      ? [...reasons, "Two AI examiners disagreed noticeably"]
      : reasons,
  };
}

function requestBody(model: string, prompt: string) {
  // Gemini 2.x takes a thinking token budget, Gemini 3+ a level; for "-latest"
  // aliases the version is unknown, so leave thinking at the model default.
  const thinkingConfig = model.endsWith("-latest")
    ? undefined
    : model.startsWith("gemini-2")
      ? { thinkingBudget: 0 }
      : { thinkingLevel: "low" };

  return {
    systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: 0.1,
      responseMimeType: "application/json",
      responseSchema: RESPONSE_SCHEMA,
      ...(thinkingConfig ? { thinkingConfig } : {}),
    },
  };
}
