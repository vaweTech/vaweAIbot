import {
  emptyKeyPoint,
  emptyQuestionDraft,
  type ArgumentSide,
  type BankDifficulty,
  type BankQuestionType,
  type KeyPointInput,
  type QuestionDraft,
} from "@/types/questionBank";

export const CSV_COLUMNS = [
  "type",
  "question",
  "category",
  "role",
  "difficulty",
  "tags",
  "modelAnswer",
  "keyPoints",
  "followUpQuestion",
] as const;

/**
 * Key points in a flat cell:
 *   text | weight | mustHave | syn1;syn2  ||  next point | 2 | no | syn
 */
export function parseKeyPointCell(cell: string): KeyPointInput[] {
  return cell
    .split("||")
    .map((chunk) => chunk.trim())
    .filter(Boolean)
    .map((chunk) => {
      const [text, weight, mustHave, synonyms, side] = chunk.split("|").map((p) => p.trim());
      return {
        ...emptyKeyPoint(),
        text: text ?? "",
        weight: Number(weight) >= 1 && Number(weight) <= 3 ? Number(weight) : 2,
        mustHave: /^(yes|true|1|y)$/i.test(mustHave ?? ""),
        synonyms: (synonyms ?? "")
          .split(";")
          .map((s) => s.trim())
          .filter(Boolean),
        side: normalizeSide(side),
      };
    })
    .filter((kp) => kp.text);
}

function normalizeSide(value: unknown): ArgumentSide {
  const v = String(value ?? "").toLowerCase();
  if (v === "for" || v === "against" || v === "example") return v;
  return "none";
}

function normalizeType(value: unknown): BankQuestionType {
  const v = String(value ?? "").toLowerCase();
  if (v === "hr" || v === "gd") return v;
  return "technical";
}

function normalizeDifficulty(value: unknown): BankDifficulty {
  const v = String(value ?? "").toLowerCase();
  if (v.startsWith("beg")) return "Beginner";
  if (v.startsWith("adv")) return "Advanced";
  return "Intermediate";
}

function toList(value: unknown): string[] {
  if (Array.isArray(value)) return value.map((v) => String(v).trim()).filter(Boolean);
  return String(value ?? "")
    .split(/[,;]/)
    .map((v) => v.trim())
    .filter(Boolean);
}

/** Accepts the JSON shape or a CSV row object and normalises both to a draft. */
export function toQuestionDraft(raw: Record<string, unknown>): QuestionDraft {
  const base = emptyQuestionDraft();
  const type = normalizeType(raw.type);

  let keyPoints: KeyPointInput[] = [];
  const rawPoints = raw.keyPoints;
  if (Array.isArray(rawPoints)) {
    keyPoints = rawPoints.map((p) => {
      if (typeof p === "string") return { ...emptyKeyPoint(), text: p };
      const point = p as Record<string, unknown>;
      return {
        ...emptyKeyPoint(),
        text: String(point.text ?? ""),
        synonyms: toList(point.synonyms),
        weight: Number(point.weight) >= 1 && Number(point.weight) <= 3 ? Number(point.weight) : 2,
        mustHave: Boolean(point.mustHave),
        side: normalizeSide(point.side),
      };
    });
  } else if (typeof rawPoints === "string") {
    keyPoints = parseKeyPointCell(rawPoints);
  }

  return {
    ...base,
    type,
    question: String(raw.question ?? "").trim(),
    category: String(raw.category ?? (type === "gd" ? "Technology" : "React")).trim(),
    role: String(raw.role ?? "Any").trim(),
    difficulty: normalizeDifficulty(raw.difficulty),
    tags: toList(raw.tags),
    modelAnswer: String(raw.modelAnswer ?? raw.answer ?? "").trim(),
    keyPoints: keyPoints.filter((kp) => kp.text.trim()),
    followUpQuestion: String(raw.followUpQuestion ?? "").trim(),
    botLines: toList(raw.botLines),
    status: String(raw.status ?? "") === "approved" ? "approved" : "draft",
  };
}

/** Minimal CSV reader that understands quoted fields and escaped quotes. */
export function parseCsv(input: string): Record<string, string>[] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < input.length; i++) {
    const char = input[i];

    if (inQuotes) {
      if (char === '"') {
        if (input[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += char;
      }
      continue;
    }

    if (char === '"') {
      inQuotes = true;
    } else if (char === ",") {
      row.push(field);
      field = "";
    } else if (char === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else if (char !== "\r") {
      field += char;
    }
  }

  if (field || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  const nonEmpty = rows.filter((r) => r.some((cell) => cell.trim()));
  if (nonEmpty.length < 2) return [];

  const headers = nonEmpty[0].map((h) => h.trim());
  return nonEmpty.slice(1).map((cells) => {
    const record: Record<string, string> = {};
    headers.forEach((header, index) => {
      record[header] = (cells[index] ?? "").trim();
    });
    return record;
  });
}

export type ParseResult = {
  drafts: QuestionDraft[];
  format: "json" | "csv";
  problems: string[];
};

/** Detects JSON vs CSV and converts either into drafts. */
export function parseImportText(text: string): ParseResult {
  const trimmed = text.trim();
  if (!trimmed) return { drafts: [], format: "json", problems: ["Nothing to import"] };

  if (trimmed.startsWith("[") || trimmed.startsWith("{")) {
    try {
      const parsed = JSON.parse(trimmed);
      const list = Array.isArray(parsed) ? parsed : [parsed];
      return {
        drafts: list.map((item) => toQuestionDraft(item as Record<string, unknown>)),
        format: "json",
        problems: [],
      };
    } catch (error) {
      return {
        drafts: [],
        format: "json",
        problems: [error instanceof Error ? `Invalid JSON: ${error.message}` : "Invalid JSON"],
      };
    }
  }

  const records = parseCsv(trimmed);
  if (records.length === 0) {
    return {
      drafts: [],
      format: "csv",
      problems: ["No data rows found. The first line must be a header row."],
    };
  }

  const headers = Object.keys(records[0]);
  const problems: string[] = [];
  if (!headers.includes("question")) problems.push('CSV is missing a "question" column');
  if (!headers.includes("modelAnswer")) problems.push('CSV is missing a "modelAnswer" column');

  return { drafts: records.map(toQuestionDraft), format: "csv", problems };
}

export const SAMPLE_JSON = `[
  {
    "type": "technical",
    "question": "What is React and why is it used in modern web applications?",
    "category": "React",
    "role": "Frontend Developer",
    "difficulty": "Intermediate",
    "tags": ["react", "frontend"],
    "modelAnswer": "React is a JavaScript library for building user interfaces. It uses a component based architecture so UI can be reused, and a virtual DOM that makes re-rendering efficient.",
    "keyPoints": [
      { "text": "JavaScript library for building user interfaces", "synonyms": ["JS library", "UI library"], "weight": 3, "mustHave": true },
      { "text": "Component based and reusable architecture", "synonyms": ["components", "reusable UI"], "weight": 2, "mustHave": false },
      { "text": "Virtual DOM improves rendering performance", "synonyms": ["vDOM", "faster re-render"], "weight": 2, "mustHave": false }
    ],
    "followUpQuestion": "Can you explain how the virtual DOM decides what to update?",
    "status": "approved"
  },
  {
    "type": "gd",
    "question": "Will Artificial Intelligence reduce employment or create new opportunities?",
    "category": "Technology",
    "difficulty": "Intermediate",
    "modelAnswer": "A balanced view accepts that AI automates routine work while creating new roles, and that reskilling decides the outcome.",
    "keyPoints": [
      { "text": "AI automates routine and repetitive jobs", "synonyms": ["automation", "replaces manual work"], "weight": 3, "mustHave": true, "side": "against" },
      { "text": "New roles emerge such as AI trainers and data stewards", "synonyms": ["new jobs", "prompt engineer"], "weight": 3, "mustHave": false, "side": "for" },
      { "text": "Reskilling and education decide the impact", "synonyms": ["upskilling", "training programmes"], "weight": 2, "mustHave": false, "side": "example" }
    ],
    "botLines": [
      "I believe AI will change the type of jobs rather than remove them.",
      "Repetitive roles in support and manufacturing may be affected first."
    ],
    "status": "approved"
  }
]`;

export const SAMPLE_CSV = `type,question,category,role,difficulty,tags,modelAnswer,keyPoints,followUpQuestion
technical,"What is a REST API?",Node.js,Backend Developer,Beginner,"api;rest","A REST API exposes resources over HTTP using standard methods and stateless requests.","Uses HTTP methods like GET and POST|3|yes|verbs;http methods || Stateless request handling|2|no|no session","What is the difference between PUT and PATCH?"
hr,"Tell me about a challenge you solved.",HR,Any,Beginner,"behavioural","Describe the situation, the action you took and the measurable result.","Describes a concrete situation|3|yes|context;background || States the action taken|3|yes|what I did || Ends with a result|2|no|outcome;impact",""`;
