import { delay } from "@/lib/utils";
import { calculateInterviewScore, calculateGDOverall, DEFAULT_WEIGHTS } from "@/lib/scoring";
import { analyzeLanguage, languageSummary, wordCount } from "@/lib/languageCheck";
import type { EvaluationWeights, GrammarError } from "@/types/interview";
import type { EvaluationStep } from "@/lib/mockAI";

const FILLERS = ["basically", "actually", "you know", "like", "um", "uh", "sort of", "kind of", "i mean", "right"];

const TECH_KEYWORDS = [
  "react", "javascript", "java", "python", "node", "component", "api", "database",
  "sql", "frontend", "backend", "full stack", "project", "team", "problem", "solution",
  "skill", "learn", "career", "developer", "code", "application", "experience",
];

function clamp(n: number, min = 0, max = 100) {
  return Math.max(min, Math.min(max, Math.round(n)));
}

export function countFillers(text: string): number {
  const lower = text.toLowerCase();
  let count = 0;
  for (const f of FILLERS) {
    const re = new RegExp(`\\b${f.replace(" ", "\\s+")}\\b`, "gi");
    count += (lower.match(re) || []).length;
  }
  return count;
}

function keywordHits(question: string, answer: string): { hits: number; total: number } {
  const qWords = question
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 4);
  const uniqueQ = Array.from(new Set(qWords)).slice(0, 12);
  const ans = answer.toLowerCase();
  const tech = TECH_KEYWORDS.filter((k) => ans.includes(k));
  const qHits = uniqueQ.filter((w) => ans.includes(w));
  return { hits: qHits.length + tech.length, total: uniqueQ.length + 3 };
}

export function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}m ${s.toString().padStart(2, "0")}s`;
}

export type GrammarAnalysisResult = {
  score: number;
  pronounsScore: number;
  totalSentences: number;
  errors: number;
  pronounErrors: number;
  correctSentences: number;
  mistakes: GrammarError[];
};

/**
 * Analyse the candidate's real transcript and produce scores.
 * Grammar and pronoun scores come from actual language checks on the text.
 */
export async function analyzeVoiceAnswer(options: {
  question: string;
  transcript: string;
  durationSeconds: number;
  weights?: EvaluationWeights;
}): Promise<{
  scores: {
    technicalKnowledge: number;
    relevance: number;
    communication: number;
    grammar: number;
    pronouns: number;
    fluency: number;
    vocabulary: number;
    overall: number;
  };
  strengths: string[];
  improvementAreas: string[];
  aiSummary: string;
  topicCoverage: { topic: string; coverage: number }[];
  grammarAnalysis: GrammarAnalysisResult;
  speakingDuration: string;
  wordCount: number;
  fillerWords: number;
  usedRealVoice: boolean;
}> {
  await delay(900);

  const text = options.transcript.trim();
  const words = wordCount(text);
  const fillers = countFillers(text);
  const duration = Math.max(1, options.durationSeconds);
  const { hits, total } = keywordHits(options.question, text);
  const language = analyzeLanguage(text);

  let substance = 40;
  if (words >= 20) substance = 55;
  if (words >= 40) substance = 70;
  if (words >= 70) substance = 82;
  if (words >= 100) substance = 90;
  if (words < 8) substance = 28;

  const relevance = clamp(40 + (hits / Math.max(total, 1)) * 55 + (words > 25 ? 8 : 0));

  const fillerRatio = words > 0 ? fillers / words : 0;
  const communication = clamp(88 - fillerRatio * 180 - (words < 15 ? 20 : 0) + (language.sentences >= 2 ? 5 : 0));

  const wpm = (words / duration) * 60;
  let fluency = 70;
  if (wpm >= 90 && wpm <= 160) fluency = 88;
  else if (wpm >= 70 && wpm < 90) fluency = 78;
  else if (wpm > 160 && wpm < 200) fluency = 75;
  else if (words < 10) fluency = 45;
  else fluency = 62;
  fluency = clamp(fluency - fillers * 3);

  const unique = new Set(text.toLowerCase().split(/\s+/).filter(Boolean));
  const variety = words > 0 ? unique.size / words : 0;
  const vocabulary = clamp(50 + variety * 55 + (words > 30 ? 8 : 0));

  const grammar = language.grammarScore;
  const pronouns = language.pronounsScore;
  const languageForOverall = clamp((grammar + pronouns) / 2);

  const technicalKnowledge = clamp((substance + relevance) / 2 + (hits > 2 ? 6 : 0));

  const scores = {
    technicalKnowledge,
    relevance,
    communication,
    grammar,
    fluency,
    vocabulary,
  };
  const overall = calculateInterviewScore(
    { ...scores, grammar: languageForOverall },
    options.weights ?? DEFAULT_WEIGHTS
  );

  const strengths: string[] = [];
  const improvementAreas: string[] = [];

  if (relevance >= 70) strengths.push("Answer stayed relevant to the question");
  if (words >= 40) strengths.push("Gave enough detail in the response");
  if (fillers <= 2) strengths.push("Limited use of filler words");
  if (vocabulary >= 72) strengths.push("Used a reasonable range of vocabulary");
  if (fluency >= 75) strengths.push("Speaking pace was generally clear");
  if (grammar >= 85) strengths.push("Grammar was largely accurate");
  if (pronouns >= 85 && language.pronounUses > 0) strengths.push("Pronouns were used correctly");

  if (words < 25) improvementAreas.push("Give a longer, more complete answer");
  if (fillers >= 3) improvementAreas.push("Reduce filler words (um, like, actually)");
  if (relevance < 65) improvementAreas.push("Link your points more directly to the question");
  if (grammar < 75) improvementAreas.push("Improve grammar and sentence structure");
  if (pronouns < 75) improvementAreas.push("Check pronoun forms (I/me, he/him, they/them, their/there/they're)");
  if (fluency < 70) improvementAreas.push("Speak a bit more steadily and clearly");

  if (strengths.length === 0) strengths.push("Attempted the question");
  if (improvementAreas.length === 0) improvementAreas.push("Add one concrete example next time");

  const aiSummary =
    words < 8
      ? "Very little speech was captured. Please allow the microphone and speak clearly for at least 20–30 seconds."
      : `Based on your spoken answer (${words} words, ${fillers} filler words), overall score is ${overall}. ` +
        languageSummary(language) +
        " " +
        (relevance >= 70
          ? "Your content was reasonably aligned with the question. "
          : "Try to address the question more directly. ") +
        (fillers >= 3
          ? "Reducing fillers will improve communication score."
          : "Delivery was fairly clean.");

  return {
    scores: { ...scores, pronouns, overall },
    strengths,
    improvementAreas,
    aiSummary,
    topicCoverage: [
      { topic: "Question relevance", coverage: relevance },
      { topic: "Detail & substance", coverage: substance },
      { topic: "Fluency", coverage: fluency },
      { topic: "Vocabulary", coverage: vocabulary },
      { topic: "Grammar", coverage: grammar },
      { topic: "Pronouns", coverage: pronouns },
    ],
    grammarAnalysis: {
      score: grammar,
      pronounsScore: pronouns,
      totalSentences: language.sentences,
      errors: language.grammarErrors + language.pronounErrors,
      pronounErrors: language.pronounErrors,
      correctSentences: Math.max(0, language.sentences - language.grammarErrors - language.pronounErrors),
      mistakes: language.mistakes,
    },
    speakingDuration: formatDuration(duration),
    wordCount: words,
    fillerWords: fillers,
    usedRealVoice: true,
  };
}

export async function analyzeGDContribution(transcript: string, durationSeconds: number) {
  await delay(700);
  const words = wordCount(transcript);
  const fillers = countFillers(transcript);
  const language = analyzeLanguage(transcript);
  const communication = clamp(60 + Math.min(words, 80) * 0.35 - fillers * 4);
  const relevance = clamp(55 + Math.min(words, 60) * 0.4);
  const fluency = clamp(70 + (words > 20 ? 10 : -10) - fillers * 3);
  const grammar = language.grammarScore;
  const pronouns = language.pronounsScore;
  const topicUnderstanding = relevance;
  const teamInteraction = clamp(65 + (words > 15 ? 12 : 0));
  const scores = {
    communication,
    grammar,
    pronouns,
    fluency,
    relevance,
    topicUnderstanding,
    teamInteraction,
  };
  const overall = calculateGDOverall({
    communication,
    grammar: clamp((grammar + pronouns) / 2),
    fluency,
    relevance,
    topicUnderstanding,
    teamInteraction,
  });

  const strengths =
    words > 25
      ? ["Shared a clear spoken point", "Participated in the discussion"]
      : ["Joined the discussion"];
  if (grammar >= 85) strengths.push("Grammar was largely accurate");
  if (pronouns >= 85 && language.pronounUses > 0) strengths.push("Pronouns were used correctly");

  const improvementAreas: string[] =
    words < 20
      ? ["Speak longer on your turn", "Add one supporting example"]
      : fillers > 2
      ? ["Reduce filler words"]
      : ["Invite others and build on their points"];
  if (grammar < 75) improvementAreas.push("Improve grammar and sentence structure");
  if (pronouns < 75) improvementAreas.push("Check pronoun forms (I/me, he/him, they/them)");

  return {
    scores: { ...scores, overall },
    speakingTime: durationSeconds,
    turns: 1,
    relevantContributions: words > 20 ? 1 : 0,
    interruptions: 0,
    fillerWords: fillers,
    strengths,
    improvementAreas,
    keyContributions: [transcript.slice(0, 140) || "No clear contribution captured"],
    aiSummary:
      words < 8
        ? "Microphone speech was too short to evaluate well. Please speak clearly on your turn."
        : `Your spoken contribution (${words} words) was analysed. Overall score ${overall}. ${languageSummary(language)}`,
    grammarAnalysis: {
      score: grammar,
      pronounsScore: pronouns,
      totalSentences: language.sentences,
      errors: language.grammarErrors + language.pronounErrors,
      pronounErrors: language.pronounErrors,
      correctSentences: Math.max(0, language.sentences - language.grammarErrors - language.pronounErrors),
      mistakes: language.mistakes,
    },
  };
}

export async function runVoiceEvalSteps(
  onStep: (steps: EvaluationStep[]) => void
): Promise<void> {
  const steps: EvaluationStep[] = [
    { label: "Voice converted to text", done: false },
    { label: "Transcript analysed", done: false },
    { label: "Grammar checked", done: false },
    { label: "Pronouns checked", done: false },
    { label: "Relevance checked", done: false },
    { label: "Score calculated", done: false },
  ];
  onStep([...steps]);
  for (let i = 0; i < steps.length; i++) {
    await delay(450);
    steps[i] = { ...steps[i], done: true };
    onStep([...steps]);
  }
}
