/**
 * Server-side grading of a spoken answer against a stored question.
 *
 * Runs on the server only, because the model answer and its vectors live in a
 * Firestore subcollection students cannot read. The transcript comes in, a
 * graded breakdown goes out, and the model answer is revealed only afterwards
 * as feedback.
 *
 * Content is judged semantically; grammar, pronouns and delivery reuse the same
 * checks the offline prototype uses, so scores stay comparable across modes.
 */

import { analyzeLanguage, languageSummary, wordCount } from "@/lib/languageCheck";
import { calculateGDOverall, calculateInterviewScore, DEFAULT_WEIGHTS } from "@/lib/scoring";
import { scoreAnswerSemantically, type SemanticResult } from "@/lib/semanticScoring";
import { countFillers, formatDuration, type GrammarAnalysisResult } from "@/lib/voiceAnalysis";
import type { AnswerKey, QuestionSummary } from "@/types/questionBank";

export type EvaluationMode = "interview" | "gd";

/** Ceiling when the answer never addressed the question. */
const OFF_TOPIC_CAP = 30;
/** Ceiling when a point marked essential was never mentioned. */
const MISSED_ESSENTIAL_CAP = 60;

export type AnswerEvaluation = {
  questionId: string;
  question: string;
  mode: EvaluationMode;
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
  semantic: SemanticResult;
  /** Only present for GD, which is graded on two extra axes. */
  gdScores: { topicUnderstanding: number; teamInteraction: number } | null;
  /** The answer did not address the question at all. */
  offTopic: boolean;
  strengths: string[];
  improvementAreas: string[];
  aiSummary: string;
  topicCoverage: { topic: string; coverage: number }[];
  grammarAnalysis: GrammarAnalysisResult;
  speakingDuration: string;
  wordCount: number;
  fillerWords: number;
  /** Shown to the student after grading so they can compare. */
  modelAnswer: string;
  followUpQuestion: string;
};

function clamp(n: number, min = 0, max = 100) {
  return Math.max(min, Math.min(max, Math.round(n)));
}

export async function evaluateAnswer(options: {
  summary: QuestionSummary;
  answerKey: AnswerKey;
  transcript: string;
  durationSeconds: number;
  mode?: EvaluationMode;
}): Promise<AnswerEvaluation> {
  const { summary, answerKey } = options;
  const mode: EvaluationMode = options.mode ?? (summary.type === "gd" ? "gd" : "interview");
  const text = options.transcript.trim();
  const duration = Math.max(1, options.durationSeconds);

  const semantic = await scoreAnswerSemantically(text, answerKey, {
    includeSideBalance: mode === "gd",
  });

  const words = wordCount(text);
  const fillers = countFillers(text);
  const language = analyzeLanguage(text);

  // Content and relevance now come from meaning, not keyword overlap.
  const technicalKnowledge = semantic.contentScore;
  const relevance = semantic.answerSimilarity;

  const fillerRatio = words > 0 ? fillers / words : 0;
  const communication = clamp(
    88 - fillerRatio * 180 - (words < 15 ? 20 : 0) + (language.sentences >= 2 ? 5 : 0)
  );

  const wpm = (words / duration) * 60;
  let fluency: number;
  if (words < 10) fluency = 45;
  else if (wpm >= 90 && wpm <= 160) fluency = 88;
  else if (wpm >= 70 && wpm < 90) fluency = 78;
  else if (wpm > 160 && wpm < 200) fluency = 75;
  else fluency = 62;
  fluency = clamp(fluency - fillers * 3);

  const unique = new Set(text.toLowerCase().split(/\s+/).filter(Boolean));
  const variety = words > 0 ? unique.size / words : 0;
  const vocabulary = clamp(50 + variety * 55 + (words > 30 ? 8 : 0));

  const grammar = language.grammarScore;
  const pronouns = language.pronounsScore;
  const languageForOverall = clamp((grammar + pronouns) / 2);

  /**
   * A fluent, well-pronounced answer about the wrong subject would otherwise
   * score close to 50 on delivery alone, because grammar, vocabulary and
   * fluency know nothing about the question.
   */
  const offTopic = words >= 8 && semantic.contentScore < 15 && semantic.answerSimilarity < 30;

  const gdScores =
    mode === "gd"
      ? {
          topicUnderstanding: technicalKnowledge,
          // Covering more than one point suggests engaging with the discussion
          // rather than repeating a single prepared line.
          teamInteraction: clamp(
            60 + (words > 25 ? 15 : 0) + (semantic.coveredCount > 1 ? 10 : 0)
          ),
        }
      : null;

  const rawOverall =
    mode === "gd" && gdScores
      ? calculateGDOverall({
          communication,
          grammar: languageForOverall,
          fluency,
          relevance,
          ...gdScores,
        })
      : calculateInterviewScore(
          {
            technicalKnowledge,
            relevance,
            communication,
            grammar: languageForOverall,
            fluency,
            vocabulary,
          },
          DEFAULT_WEIGHTS
        );

  // An answer missing something the examiner marked essential cannot be a good
  // answer however well it is delivered, so delivery cannot carry it past
  // "average".
  let overall = rawOverall;
  if (offTopic) overall = Math.min(overall, OFF_TOPIC_CAP);
  else if (semantic.missedMustHave.length > 0) overall = Math.min(overall, MISSED_ESSENTIAL_CAP);

  const strengths: string[] = [];
  const improvementAreas: string[] = [];

  if (offTopic) {
    improvementAreas.push("This answer did not address the question — re-read it and try again");
  }

  const covered = semantic.keyPoints.filter((kp) => kp.status === "covered");
  if (covered.length > 0) {
    strengths.push(
      `Covered ${covered.length} of ${semantic.keyPoints.length} expected points, including "${covered[0].text}"`
    );
  }
  if (semantic.answerSimilarity >= 60) strengths.push("Answer matched the expected explanation closely");
  if (fillers <= 2 && words >= 20) strengths.push("Limited use of filler words");
  if (grammar >= 85) strengths.push("Grammar was largely accurate");
  if (pronouns >= 85 && language.pronounUses > 0) strengths.push("Pronouns were used correctly");
  if (fluency >= 80) strengths.push("Speaking pace was clear and steady");

  for (const missed of semantic.keyPoints.filter((kp) => kp.status === "missed").slice(0, 3)) {
    improvementAreas.push(
      missed.mustHave ? `Essential point not mentioned: ${missed.text}` : `Also mention: ${missed.text}`
    );
  }
  for (const partial of semantic.keyPoints.filter((kp) => kp.status === "partial").slice(0, 2)) {
    improvementAreas.push(`Touched on but not explained clearly: ${partial.text}`);
  }
  if (words < 25) improvementAreas.push("Give a longer, more complete answer");
  if (fillers >= 3) improvementAreas.push("Reduce filler words (um, like, actually)");
  if (grammar < 75) improvementAreas.push("Improve grammar and sentence structure");
  if (pronouns < 75) improvementAreas.push("Check pronoun forms (I/me, he/him, they/them, their/there/they're)");
  if (mode === "gd" && semantic.sideBalance) {
    const { for: forSide, against } = semantic.sideBalance;
    if (forSide >= 40 && against < 20) improvementAreas.push("Acknowledge the opposing view as well");
    if (against >= 40 && forSide < 20) improvementAreas.push("Acknowledge the supporting view as well");
  }

  if (strengths.length === 0) strengths.push("Attempted the question");
  if (improvementAreas.length === 0) improvementAreas.push("Add one concrete example next time");

  const aiSummary =
    words < 8
      ? "Very little speech was captured. Please allow the microphone and speak clearly for at least 20–30 seconds."
      : offTopic
      ? `This answer did not address the question. Your delivery was measured, but none of the ${semantic.keyPoints.length} expected points were covered, so the overall score is limited to ${overall}.`
      : `You covered ${semantic.coveredCount} of ${semantic.keyPoints.length} expected points` +
        (semantic.partialCount > 0 ? ` and partly covered ${semantic.partialCount} more` : "") +
        `, giving a content score of ${semantic.contentScore}. ` +
        (semantic.missedMustHave.length > 0
          ? `The score is limited because an essential point was never mentioned: ${semantic.missedMustHave[0]}. `
          : "") +
        `Overall score is ${overall}. ` +
        languageSummary(language);

  return {
    questionId: summary.id,
    question: summary.question,
    mode,
    scores: {
      technicalKnowledge,
      relevance,
      communication,
      grammar,
      pronouns,
      fluency,
      vocabulary,
      overall,
    },
    semantic,
    gdScores,
    offTopic,
    strengths,
    improvementAreas,
    aiSummary,
    topicCoverage: [
      { topic: "Key point coverage", coverage: semantic.contentScore },
      { topic: "Match with model answer", coverage: semantic.answerSimilarity },
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
      correctSentences: Math.max(
        0,
        language.sentences - language.grammarErrors - language.pronounErrors
      ),
      mistakes: language.mistakes,
    },
    speakingDuration: formatDuration(duration),
    wordCount: words,
    fillerWords: fillers,
    modelAnswer: answerKey.modelAnswer,
    followUpQuestion: summary.followUpQuestion,
  };
}
