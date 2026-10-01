import type { GrammarError } from "@/types/interview";

export type LanguageAnalysis = {
  mistakes: GrammarError[];
  grammarScore: number;
  pronounsScore: number;
  grammarErrors: number;
  pronounErrors: number;
  sentences: number;
  words: number;
  pronounUses: number;
};

type Rule = {
  id: string;
  category: string;
  re: RegExp;
  correction: string;
  explanation: string;
};

function clamp(n: number, min = 0, max = 100) {
  return Math.max(min, Math.min(max, Math.round(n)));
}

export function wordCount(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

export function sentenceCount(text: string): number {
  return text.split(/[.!?]+/).map((s) => s.trim()).filter(Boolean).length || (text.trim() ? 1 : 0);
}

const PRONOUN_RE =
  /\b(i|me|my|mine|myself|we|us|our|ours|ourselves|you|your|yours|yourself|he|him|his|himself|she|her|hers|herself|they|them|their|theirs|themselves|it|its|itself)\b/gi;

const RULES: Rule[] = [
  // Pronouns
  {
    id: "PR-me-and",
    category: "Pronouns",
    re: /\bme and (him|her|them|he|she|they|[a-z]+)\b/i,
    correction: "He/She and I (subject) or him/her and me (object)",
    explanation: "Do not use “me” as the subject. Use “I” when you are doing the action.",
  },
  {
    id: "PR-him-and-me-subj",
    category: "Pronouns",
    re: /\b(him|her|them) and me (went|are|were|is|was|have|has|do|did|will|can|should|think|want|like|need|said|spoke)\b/i,
    correction: "He/She/They and I …",
    explanation: "Use subject pronouns (he, she, they, I) before a verb.",
  },
  {
    id: "PR-between-i",
    category: "Pronouns",
    re: /\bbetween you and i\b/i,
    correction: "between you and me",
    explanation: "After a preposition (between, for, with), use object pronouns: me, him, her, us, them.",
  },
  {
    id: "PR-for-we",
    category: "Pronouns",
    re: /\b(for|with|to|from) we\b/i,
    correction: "for/with/to/from us",
    explanation: "Use object pronouns after prepositions: me, us, him, her, them.",
  },
  {
    id: "PR-myself-subj",
    category: "Pronouns",
    re: /\bmyself (is|am|will|was|are|have|want|think|like|did|do)\b/i,
    correction: "I …",
    explanation: "Do not use “myself” as the subject. Say “I am …” or “I will …”.",
  },
  {
    id: "PR-me-verb",
    category: "Pronouns",
    re: /\bme (think|want|like|need|am|is|was|have|go|went|said|know)\b/i,
    correction: "I think / I want / I like …",
    explanation: "Use “I” (subject) before a verb, not “me”.",
  },
  {
    id: "PR-him-said",
    category: "Pronouns",
    re: /\b(him|her|them) (said|told|went|thinks|think|wants|want|is|are)\b/i,
    correction: "He/She/They said …",
    explanation: "Use subject pronouns before a verb: he, she, they — not him, her, them.",
  },
  {
    id: "PR-their-is",
    category: "Pronouns",
    re: /\btheir (is|are|was|were) (a|an|the|going|no)\b/i,
    correction: "There is / There are",
    explanation: "“Their” shows possession. Use “there is/are” to point to something.",
  },
  {
    id: "PR-theyre-poss",
    category: "Pronouns",
    re: /\bthey're (book|books|idea|ideas|job|jobs|skill|skills|project|projects|team|opinion)\b/i,
    correction: "their …",
    explanation: "“They’re” means “they are”. Use “their” for possession.",
  },
  {
    id: "PR-your-a",
    category: "Pronouns",
    re: /\byour (a|an) /i,
    correction: "you're a / you're an",
    explanation: "“Your” shows possession. “You’re” means “you are”.",
  },
  {
    id: "PR-your-welcome",
    category: "Pronouns",
    re: /\byour welcome\b/i,
    correction: "you're welcome",
    explanation: "Use “you’re” (you are) in “you’re welcome”.",
  },
  {
    id: "PR-its-a",
    category: "Pronouns",
    re: /\bits (a|an|the) /i,
    correction: "it's a / it's an",
    explanation: "“Its” shows possession. “It’s” means “it is”.",
  },
  {
    id: "PR-them-is",
    category: "Pronouns",
    re: /\bthem (is|was|has|does)\b/i,
    correction: "They are / They were",
    explanation: "“Them” is an object pronoun. Use “they” as the subject.",
  },
  {
    id: "PR-this-people",
    category: "Pronouns",
    re: /\bthis (people|students|things|ideas|jobs|skills)\b/i,
    correction: "these people / these students …",
    explanation: "Use “these” with plural nouns, not “this”.",
  },
  {
    id: "PR-these-person",
    category: "Pronouns",
    re: /\bthese (person|student|thing|idea|job|skill)\b/i,
    correction: "this person / this student …",
    explanation: "Use “this” with a singular noun, not “these”.",
  },
  {
    id: "PR-we-peoples",
    category: "Pronouns",
    re: /\bwe peoples\b/i,
    correction: "we people / we as a people",
    explanation: "“People” is already plural. Do not add “-s”.",
  },
  {
    id: "PR-he-dont",
    category: "Pronouns",
    re: /\b(he|she|it) don'?t\b/i,
    correction: "he/she/it doesn't",
    explanation: "Singular pronouns take “doesn't”, not “don't”.",
  },
  {
    id: "PR-they-was",
    category: "Pronouns",
    re: /\b(they|we) was\b/i,
    correction: "they/we were",
    explanation: "Plural pronouns take “were”, not “was”.",
  },
  {
    id: "PR-i-is",
    category: "Pronouns",
    re: /\b(i) is\b/i,
    correction: "I am",
    explanation: "Use “I am”, not “I is”.",
  },
  {
    id: "PR-you-is",
    category: "Pronouns",
    re: /\byou is\b/i,
    correction: "you are",
    explanation: "Use “you are”, not “you is”.",
  },
  {
    id: "PR-theirselves",
    category: "Pronouns",
    re: /\b(theirselves|themself|hisself)\b/i,
    correction: "themselves / himself",
    explanation: "The correct reflexive forms are himself, herself, themselves.",
  },

  // Grammar — tense, agreement, articles, prepositions
  {
    id: "GR-since",
    category: "Tense",
    re: /\b(am|is|are) .{0,40}\bsince\s+\d+/i,
    correction: "have/has been … for/since …",
    explanation: "Use present perfect continuous with “for/since” for something that started in the past and continues now.",
  },
  {
    id: "GR-working-since",
    category: "Tense",
    re: /\bworking here since\b/i,
    correction: "have been working here for/since …",
    explanation: "Use “have been working” with “for” or “since” for ongoing work.",
  },
  {
    id: "GR-didnt-v2",
    category: "Tense",
    re: /\b(didn't|did not|didnt) (went|saw|did|came|took|got|made|knew|spoke|gave)\b/i,
    correction: "didn't go / didn't see / didn't know …",
    explanation: "After “did not”, use the base verb (go, see, know), not the past form.",
  },
  {
    id: "GR-i-has",
    category: "Subject-Verb Agreement",
    re: /\bi has\b/i,
    correction: "I have",
    explanation: "“I” takes “have”, not “has”.",
  },
  {
    id: "GR-he-have",
    category: "Subject-Verb Agreement",
    re: /\b(he|she|it) have\b/i,
    correction: "he/she/it has",
    explanation: "Singular third-person pronouns take “has”, not “have”.",
  },
  {
    id: "GR-one-of-friend",
    category: "Subject-Verb Agreement",
    re: /\bone of (my|the|our) (friend|student|project|idea|job|skill|member|person|bot)\b/i,
    correction: "one of my friends / one of the students …",
    explanation: "After “one of”, the noun is plural: one of my friends.",
  },
  {
    id: "GR-interested-on",
    category: "Prepositions",
    re: /\binterested on\b/i,
    correction: "interested in",
    explanation: "Use “interested in”, not “interested on”.",
  },
  {
    id: "GR-discuss-about",
    category: "Prepositions",
    re: /\bdiscuss(ed|ing)? about\b/i,
    correction: "discuss / discussed / discussing (no “about”)",
    explanation: "“Discuss” already means talk about. Do not add “about”.",
  },
  {
    id: "GR-depend-of",
    category: "Prepositions",
    re: /\bdepend(s|ed)? of\b/i,
    correction: "depend on",
    explanation: "Use “depend on”, not “depend of”.",
  },
  {
    id: "GR-good-in",
    category: "Prepositions",
    re: /\bgood in (coding|programming|english|communication|speaking)\b/i,
    correction: "good at …",
    explanation: "Use “good at” a skill, not “good in”.",
  },
  {
    id: "GR-become-article",
    category: "Articles",
    re: /\bbecome (software|web|data|full|java|python)\b/i,
    correction: "become a software/web/data engineer …",
    explanation: "Use article “a” before a profession: become a software engineer.",
  },
  {
    id: "GR-want-become",
    category: "Articles",
    re: /\bwant to become (engineer|developer|doctor|teacher|manager)\b/i,
    correction: "want to become an engineer / a developer …",
    explanation: "Use “a/an” before a job title.",
  },
  {
    id: "GR-informations",
    category: "Word Choice",
    re: /\b(informations|advices|equipments|homeworks|stuffs)\b/i,
    correction: "information / advice / equipment / homework / stuff",
    explanation: "These nouns are uncountable in English. Do not add “-s”.",
  },
  {
    id: "GR-more-better",
    category: "Word Choice",
    re: /\bmore (better|easier|harder|faster|worse)\b/i,
    correction: "better / easier / harder …",
    explanation: "Do not use “more” with words that already compare (better, easier).",
  },
  {
    id: "GR-i-am-agree",
    category: "Word Choice",
    re: /\bi am agree\b/i,
    correction: "I agree",
    explanation: "Say “I agree”, not “I am agree”.",
  },
  {
    id: "GR-because-so",
    category: "Sentence Structure",
    re: /\bbecause\b.{8,80}\bso\b/i,
    correction: "Because …, …  (do not also use “so”)",
    explanation: "Do not use both “because” and “so” in the same sentence.",
  },
];

export function detectLanguageIssues(text: string): GrammarError[] {
  const mistakes: GrammarError[] = [];
  const seen = new Set<string>();
  const spans: [number, number][] = [];

  for (const rule of RULES) {
    rule.re.lastIndex = 0;
    const match = rule.re.exec(text);
    if (!match || match.index === undefined || seen.has(rule.id)) continue;
    const start = match.index;
    const end = start + match[0].length;
    if (spans.some(([s, e]) => start < e && end > s)) continue;
    seen.add(rule.id);
    spans.push([start, end]);
    mistakes.push({
      id: rule.id,
      category: rule.category,
      original: match[0].trim(),
      correction: rule.correction,
      explanation: rule.explanation,
    });
  }

  return mistakes.slice(0, 8);
}

export function analyzeLanguage(text: string): LanguageAnalysis {
  const trimmed = text.trim();
  const words = wordCount(trimmed);
  const sentences = sentenceCount(trimmed);
  const mistakes = detectLanguageIssues(trimmed);
  const grammarMistakes = mistakes.filter((m) => m.category !== "Pronouns");
  const pronounMistakes = mistakes.filter((m) => m.category === "Pronouns");
  const pronounUses = (trimmed.match(PRONOUN_RE) || []).length;

  let grammarScore = 94;
  if (words < 8) grammarScore = 38;
  else {
    grammarScore = 94 - grammarMistakes.length * 12;
    if (sentences === 1 && words > 40) grammarScore -= 6;
  }

  let pronounsScore = 92;
  if (words < 8) pronounsScore = 40;
  else {
    pronounsScore = 96 - pronounMistakes.length * 14;
    if (pronounUses === 0 && words >= 20) pronounsScore = Math.min(pronounsScore, 78);
    else if (pronounUses >= 3 && pronounMistakes.length === 0) pronounsScore = Math.max(pronounsScore, 90);
  }

  return {
    mistakes,
    grammarScore: clamp(grammarScore),
    pronounsScore: clamp(pronounsScore),
    grammarErrors: grammarMistakes.length,
    pronounErrors: pronounMistakes.length,
    sentences,
    words,
    pronounUses,
  };
}

export function languageSummary(analysis: LanguageAnalysis): string {
  if (analysis.words < 8) {
    return "Too little speech to judge grammar and pronouns. Please speak for at least 20–30 seconds.";
  }
  const bits: string[] = [];
  bits.push(
    `Grammar score ${analysis.grammarScore} from ${analysis.grammarErrors} grammar issue${analysis.grammarErrors === 1 ? "" : "s"}.`
  );
  bits.push(
    `Pronouns score ${analysis.pronounsScore} from ${analysis.pronounErrors} pronoun issue${analysis.pronounErrors === 1 ? "" : "s"} (${analysis.pronounUses} pronouns used).`
  );
  if (analysis.grammarScore >= 85 && analysis.pronounsScore >= 85) {
    bits.push("Language use was generally accurate.");
  } else if (analysis.grammarScore < 70 || analysis.pronounsScore < 70) {
    bits.push("Focus on the corrections below to raise your language scores.");
  }
  return bits.join(" ");
}
