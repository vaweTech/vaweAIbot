/**
 * Finds repetition in a spoken answer: stuttered words ("the the"), the same
 * phrase said again, whole sentences said twice, and one word leaned on too often.
 */

export type RepetitionKind = "word" | "phrase" | "sentence" | "overused";

export type RepetitionIssue = {
  kind: RepetitionKind;
  /** What was repeated, as the student said it. */
  text: string;
  /** How many times it was said in total. */
  count: number;
};

export type RepetitionReport = {
  issues: RepetitionIssue[];
  /** Extra, unnecessary repeats across all issues — the number shown as mistakes. */
  total: number;
  /** Extra repeats of stuttered words; these hurt fluency. */
  stutters: number;
  /** Extra repeats of phrases and sentences; these hurt communication. */
  repeatedLines: number;
};

export const EMPTY_REPETITION: RepetitionReport = { issues: [], total: 0, stutters: 0, repeatedLines: 0 };

/** Doubles that are correct English ("I had had enough", "that that is"). */
const VALID_DOUBLES = new Set(["had", "that"]);

/** Words that recur in any answer and say nothing about repetition on their own. */
const STOPWORDS = new Set(
  (
    "a an the and or but so if then than to of in on at by for with from as is am are was were be been being " +
    "it its this that these those there here i me my mine we us our you your he him his she her they them their " +
    "do does did done have has had not no yes can could will would should may might must shall also just very " +
    "what which who whom whose when where why how all any some more most other such only own same too into " +
    "about over under again further once because while during before after above below up down out off " +
    "um uh like basically actually right okay ok yeah well really thing things one"
  ).split(" ")
);

const MIN_SENTENCE_WORDS = 4;
const SIMILAR_SENTENCE = 0.8;
/** Longer repeats are reported cut to this many words. */
const MAX_PHRASE_WORDS = 12;
const OVERUSED_MIN_COUNT = 5;
const OVERUSED_MIN_SHARE = 0.08;
const OVERUSED_MIN_WORDS = 30;
const MAX_ISSUES = 8;

type Token = { word: string; raw: string };

function tokenize(text: string): Token[] {
  return text
    .split(/\s+/)
    .map((raw) => ({ raw: raw.replace(/^[^\w']+|[^\w']+$/g, ""), word: raw.toLowerCase().replace(/[^a-z0-9']/g, "") }))
    .filter((t) => t.word.length > 0);
}

function hasContent(words: string[]): boolean {
  return words.some((w) => !STOPWORDS.has(w));
}

function findStutters(tokens: Token[]): RepetitionIssue[] {
  const byWord = new Map<string, RepetitionIssue>();
  let i = 0;
  while (i < tokens.length) {
    let j = i + 1;
    while (j < tokens.length && tokens[j].word === tokens[i].word) j++;
    const run = j - i;
    if (run >= 2 && !(run === 2 && VALID_DOUBLES.has(tokens[i].word))) {
      const existing = byWord.get(tokens[i].word);
      if (existing) existing.count += run - 1;
      else byWord.set(tokens[i].word, { kind: "word", text: `${tokens[i].raw} ${tokens[i].raw}`, count: run - 1 });
    }
    i = j;
  }
  // `count` above holds extra repeats; report the total times the word was said in a row.
  return [...byWord.values()].map((issue) => ({ ...issue, count: issue.count + 1 }));
}

function normalizeSentence(sentence: string): string[] {
  return tokenize(sentence).map((t) => t.word);
}

function similarity(a: string[], b: string[]): number {
  const setA = new Set(a);
  const setB = new Set(b);
  let shared = 0;
  for (const w of setA) if (setB.has(w)) shared++;
  return shared / (setA.size + setB.size - shared);
}

function findRepeatedSentences(text: string): RepetitionIssue[] {
  const sentences = text
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => ({ raw: s.replace(/[.!?]+$/, ""), words: normalizeSentence(s) }))
    .filter((s) => s.words.length >= MIN_SENTENCE_WORDS && hasContent(s.words));

  const groups: { raw: string; words: string[]; count: number }[] = [];
  for (const sentence of sentences) {
    const match = groups.find((g) => similarity(g.words, sentence.words) >= SIMILAR_SENTENCE);
    if (match) match.count++;
    else groups.push({ ...sentence, count: 1 });
  }
  return groups
    .filter((g) => g.count >= 2)
    .map((g) => ({ kind: "sentence" as const, text: g.raw, count: g.count }));
}

/** Non-overlapping occurrences of the phrase starting at each index. */
function countPhrase(words: string[], phrase: string[]): number {
  let count = 0;
  for (let i = 0; i + phrase.length <= words.length; ) {
    let same = true;
    for (let k = 0; k < phrase.length; k++) {
      if (words[i + k] !== phrase[k]) {
        same = false;
        break;
      }
    }
    if (same) {
      count++;
      i += phrase.length;
    } else {
      i++;
    }
  }
  return count;
}

/** Marks a sentence end so a repeated phrase never runs from one sentence into the next. */
const BOUNDARY = "\u0000";

function findRepeatedPhrases(text: string, coveredSentences: string[]): RepetitionIssue[] {
  const tokens: Token[] = [];
  for (const sentence of text.split(/(?<=[.!?])\s+/)) {
    tokens.push(...tokenize(sentence), { word: BOUNDARY, raw: "" });
  }
  const words = tokens.map((t) => t.word);
  const used = new Array<boolean>(words.length).fill(false);
  const found: RepetitionIssue[] = [];

  for (let i = 0; i < words.length; i++) {
    if (used[i] || words[i] === BOUNDARY) continue;

    // Longest stretch starting here that is said again later, without overlapping itself.
    let best = 0;
    for (let j = i + 1; j < words.length; j++) {
      let k = 0;
      while (
        i + k < j &&
        j + k < words.length &&
        words[i + k] === words[j + k] &&
        words[i + k] !== BOUNDARY
      ) {
        k++;
      }
      best = Math.max(best, k);
    }
    if (best < 3) continue;

    const length = Math.min(best, MAX_PHRASE_WORDS);
    const phrase = words.slice(i, i + length);
    const key = phrase.join(" ");
    // A stutter like "the the the" is a word issue; a whole repeated sentence is reported once as a sentence.
    if (new Set(phrase).size === 1 || !hasContent(phrase) || coveredSentences.some((c) => c.includes(key))) {
      continue;
    }
    const count = countPhrase(words, phrase);
    // Three-word phrases recur naturally, so they must come up three times.
    if (count < (length === 3 ? 3 : 2)) continue;

    for (let p = 0; p + length <= words.length; p++) {
      if (words.slice(p, p + length).join(" ") === key) used.fill(true, p, p + length);
    }
    found.push({ kind: "phrase", text: tokens.slice(i, i + length).map((t) => t.raw).join(" "), count });
  }
  return found;
}

function findOverused(tokens: Token[], questionWords: Set<string>): RepetitionIssue[] {
  if (tokens.length < OVERUSED_MIN_WORDS) return [];
  const counts = new Map<string, { raw: string; count: number }>();
  for (const t of tokens) {
    if (t.word.length < 4 || STOPWORDS.has(t.word) || questionWords.has(t.word)) continue;
    const entry = counts.get(t.word);
    if (entry) entry.count++;
    else counts.set(t.word, { raw: t.raw, count: 1 });
  }
  return [...counts.values()]
    .filter((e) => e.count >= OVERUSED_MIN_COUNT && e.count / tokens.length >= OVERUSED_MIN_SHARE)
    .map((e) => ({ kind: "overused" as const, text: e.raw, count: e.count }));
}

/**
 * @param question Words from the question are expected to recur in the answer,
 *   so they are never reported as overused.
 */
export function detectRepetition(text: string, question = ""): RepetitionReport {
  const tokens = tokenize(text);
  const questionWords = new Set(tokenize(question).map((t) => t.word));

  const stutters = findStutters(tokens);
  const sentences = findRepeatedSentences(text);
  const phrases = findRepeatedPhrases(
    text,
    sentences.map((s) => normalizeSentence(s.text).join(" "))
  );
  const overused = findOverused(tokens, questionWords).filter(
    (o) => !phrases.some((p) => p.text.toLowerCase().includes(o.text.toLowerCase()))
  );

  const extra = (issues: RepetitionIssue[]) => issues.reduce((sum, i) => sum + i.count - 1, 0);
  const stutterCount = extra(stutters);
  const repeatedLines = extra(sentences) + extra(phrases);

  const issues = [...sentences, ...phrases, ...stutters, ...overused]
    .sort((a, b) => b.count - a.count)
    .slice(0, MAX_ISSUES);

  return {
    issues,
    total: stutterCount + repeatedLines + overused.length,
    stutters: stutterCount,
    repeatedLines,
  };
}

export const REPETITION_LABELS: Record<RepetitionKind, string> = {
  word: "Repeated word",
  phrase: "Repeated phrase",
  sentence: "Repeated sentence",
  overused: "Overused word",
};

/** Points taken off fluency and communication for repetition. */
export function repetitionPenalty(report: RepetitionReport): { fluency: number; communication: number } {
  return {
    fluency: Math.min(15, report.stutters * 3),
    communication: Math.min(20, report.repeatedLines * 4 + (report.total - report.stutters - report.repeatedLines) * 2),
  };
}

/** Advice lines for the most notable repetitions, for the "Improve" list. */
export function repetitionAdvice(report: RepetitionReport, limit = 2): string[] {
  return report.issues.slice(0, limit).map((issue) => {
    const quoted = `"${issue.text.length > 70 ? `${issue.text.slice(0, 67)}...` : issue.text}"`;
    switch (issue.kind) {
      case "sentence":
        return `Repeated sentence: ${quoted} said ${issue.count} times — make each point once, then move on`;
      case "phrase":
        return `Repeated phrase: ${quoted} said ${issue.count} times — vary your wording`;
      case "word":
        return `Repeated word: ${quoted} — pause briefly instead of restarting the word`;
      case "overused":
        return `Overused word: ${quoted} used ${issue.count} times — try a synonym`;
    }
  });
}
