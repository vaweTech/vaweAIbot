export type BankQuestionType = "technical" | "hr" | "gd";
export type BankDifficulty = "Beginner" | "Intermediate" | "Advanced";
export type BankStatus = "draft" | "approved" | "archived";
/** GD answers are graded per argument side; interview answers use "none". */
export type ArgumentSide = "none" | "for" | "against" | "example";

/** One expected idea in the model answer. Synonyms widen the semantic match. */
export interface KeyPointInput {
  id: string;
  text: string;
  synonyms: string[];
  /** 1 = nice to have, 3 = central to the answer */
  weight: number;
  /** Missing a must-have point caps the content score */
  mustHave: boolean;
  side: ArgumentSide;
}

export interface KeyPoint extends KeyPointInput {
  embedding: number[];
}

/** Payload the admin console submits */
export interface QuestionDraft {
  type: BankQuestionType;
  question: string;
  category: string;
  role: string;
  difficulty: BankDifficulty;
  tags: string[];
  modelAnswer: string;
  keyPoints: KeyPointInput[];
  followUpQuestion: string;
  /** GD only: opening lines the AI bots can speak */
  botLines: string[];
  status: BankStatus;
}

/** Readable document at questions/{id} — safe to expose to students */
export interface QuestionSummary {
  id: string;
  type: BankQuestionType;
  question: string;
  category: string;
  role: string;
  difficulty: BankDifficulty;
  tags: string[];
  status: BankStatus;
  version: number;
  keyPointCount: number;
  mustHaveCount: number;
  followUpQuestion: string;
  embeddingModel: string;
  createdAt: string;
  updatedAt: string;
}

/** Server-only document at questions/{id}/private/answerKey */
export interface AnswerKey {
  modelAnswer: string;
  answerEmbedding: number[];
  keyPoints: KeyPoint[];
  botLines: string[];
  embeddingModel: string;
}

export interface DuplicateMatch {
  id: string;
  question: string;
  similarity: number;
}

export interface BulkImportRow {
  index: number;
  question: string;
  ok: boolean;
  id?: string;
  error?: string;
  duplicateOf?: string;
}

export function emptyKeyPoint(): KeyPointInput {
  return {
    id: `kp-${Math.random().toString(36).slice(2, 9)}`,
    text: "",
    synonyms: [],
    weight: 2,
    mustHave: false,
    side: "none",
  };
}

export function emptyQuestionDraft(): QuestionDraft {
  return {
    type: "technical",
    question: "",
    category: "React",
    role: "Any",
    difficulty: "Intermediate",
    tags: [],
    modelAnswer: "",
    keyPoints: [emptyKeyPoint()],
    followUpQuestion: "",
    botLines: [],
    status: "draft",
  };
}

/**
 * Shared validation so the form and the bulk importer reject the same things.
 * Returns human-readable problems; empty array means the draft is saveable.
 */
export function validateQuestionDraft(draft: QuestionDraft): string[] {
  const problems: string[] = [];

  if (!draft.question.trim()) problems.push("Question text is required");
  if (draft.question.trim().length > 0 && draft.question.trim().length < 10) {
    problems.push("Question text is too short to be meaningful");
  }
  if (!draft.modelAnswer.trim()) problems.push("Model answer is required");

  const points = draft.keyPoints.filter((kp) => kp.text.trim());
  if (points.length === 0) {
    problems.push("Add at least one key point — scoring compares answers against these");
  }
  for (const kp of points) {
    if (kp.weight < 1 || kp.weight > 3) {
      problems.push(`Key point "${kp.text.slice(0, 30)}" must have a weight between 1 and 3`);
    }
  }
  if (draft.type === "gd" && points.some((kp) => kp.side === "none")) {
    problems.push("GD arguments need a side: for, against, or example");
  }

  return problems;
}
