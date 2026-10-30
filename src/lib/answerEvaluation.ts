/**
 * Server-side grading of a spoken answer against a stored question.
 *
 * Runs on the server only, because the model answer and its vectors live in a
 * Firestore subcollection students cannot read. The transcript comes in, a
 * graded breakdown goes out, and the model answer is revealed only afterwards
 * as feedback.
 *
 * Pipeline, cheapest first:
 * 1. Local checks on the transcript. Answers too short to grade never reach a
 *    paid API.
 * 2. One structured examiner call grades content against the question's
 *    rubric (see answerJudge), with a second opinion only when uncertain.
 * 3. Embedding similarity runs only if the examiner is unavailable.
 * Answer marks come from the rubric alone (technical knowledge for technical
 * questions, answer quality for HR); grammar, pronouns and delivery are
 * separate scores and never reduce them.
 */

import {
  judgeAnswer,
  type FactualError,
  type JudgeConfidence,
  type JudgeFlag,
  type JudgeOutcome,
} from "@/lib/answerJudge";
import {
  analyzeLanguage,
  languageSummary,
  mergeJudgedMistakes,
  wordCount,
} from "@/lib/languageCheck";
import { OVERALL_WEIGHTS, scoreRubric, type RubricScore } from "@/lib/rubric";
import { calculateGDOverall, calculateInterviewScore, DEFAULT_WEIGHTS } from "@/lib/scoring";
import {
  emptySemantic,
  scoreAnswerSemantically,
  semanticFromVerdicts,
  type SemanticResult,
} from "@/lib/semanticScoring";
import { countFillers, formatDuration, type GrammarAnalysisResult } from "@/lib/voiceAnalysis";
import {
  EMPTY_REPETITION,
  detectRepetition,
  repetitionAdvice,
  repetitionPenalty,
  type RepetitionReport,
} from "@/lib/repetition";
import type { AnswerKey, BankQuestionType, QuestionSummary } from "@/types/questionBank";

export type EvaluationMode = "interview" | "gd";

/** Ceiling when the answer never addressed the question. */
const OFF_TOPIC_CAP = 30;
/**
 * Similarity fallback only: ceiling when a point marked essential was never
 * mentioned. The examiner's rubric handles this itself.
 */
const MISSED_ESSENTIAL_CAP = 60;
/** Below this there is nothing meaningful to grade, so no API is called. */
const MIN_GRADABLE_WORDS = 8;

/** Why the transcript itself cannot be graded fairly; the student should re-record. */
export type TranscriptIssue = "too-short" | "unclear";

export type EvaluationReview = {
  /** "ai" examiner, "similarity" fallback, or "none" when nothing was gradable. */
  gradedBy: "ai" | "similarity" | "none";
  models: string[];
  confidence: JudgeConfidence | null;
  flags: JudgeFlag[];
  secondOpinion: boolean;
  /** A trainer should double-check this grade. */
  needsReview: boolean;
  reasons: string[];
};

export type AnswerEvaluation = {
  questionId: string;
  question: string;
  /** Decides what the content score means: technical knowledge, or HR answer quality. */
  questionType: BankQuestionType;
  mode: EvaluationMode;
  scores: {
    /** Answer marks as 0-100. For HR questions this is answer quality, not technical knowledge. */
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
  repetition: RepetitionReport;
  /** Shown to the student after grading so they can compare. */
  modelAnswer: string;
  followUpQuestion: string;
  /** Marks out of 10; null when the examiner did not grade the answer. */
  rubric: RubricScore | null;
  factualErrors: FactualError[];
  review: EvaluationReview;
  transcriptIssue: TranscriptIssue | null;
};

function clamp(n: number, min = 0, max = 100) {
  return Math.max(min, Math.min(max, Math.round(n)));
}

/** Speech recognition stuck in a loop repeats one word; that text is not the student's answer. */
function localTranscriptIssue(text: string, words: number): TranscriptIssue | null {
  if (words < MIN_GRADABLE_WORDS) return "too-short";
  const tokens = text.toLowerCase().split(/\s+/).filter(Boolean);
  let run = 1;
  for (let i = 1; i < tokens.length; i++) {
    run = tokens[i] === tokens[i - 1] ? run + 1 : 1;
    if (run >= 4) return "unclear";
  }
  if (words >= 20 && new Set(tokens).size / tokens.length < 0.3) return "unclear";
  return null;
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

  const words = wordCount(text);

  const includeSideBalance = mode === "gd";
  const localIssue = localTranscriptIssue(text, words);

  let outcome: JudgeOutcome | null = null;
  let semantic: SemanticResult;
  if (localIssue === "too-short") {
    semantic = emptySemantic(answerKey, includeSideBalance);
  } else {
    outcome = await judgeAnswer({
      question: summary.question,
      questionType: summary.type,
      answerKey,
      transcript: text,
    });
    semantic = outcome
      ? semanticFromVerdicts(answerKey, outcome.result.keyPoints, {
          includeSideBalance,
          onTopic: outcome.result.onTopic,
        })
      : await scoreAnswerSemantically(text, answerKey, { includeSideBalance });
  }
  const judge = outcome?.result ?? null;
  const transcriptIssue: TranscriptIssue | null =
    localIssue ?? (judge?.flags.includes("transcript_unclear") ? "unclear" : null);

  const fillers = countFillers(text);
  const ruleLanguage = analyzeLanguage(text);
  const language = judge ? mergeJudgedMistakes(ruleLanguage, judge.mistakes) : ruleLanguage;

  // Concepts come from uncapped key-point coverage; the other dimensions from the examiner.
  const rubric = judge ? scoreRubric(summary.type, judge.rubric, semantic.contentScore / 100) : null;
  const technicalKnowledge = rubric ? rubric.percent : semantic.contentScore;
  const relevance = semantic.answerSimilarity;

  // A recognition loop is already flagged as unclear; it is not the student repeating themselves.
  const repetition =
    localIssue === null ? detectRepetition(text, summary.question) : EMPTY_REPETITION;
  const repeatPenalty = repetitionPenalty(repetition);

  const fillerRatio = words > 0 ? fillers / words : 0;
  const communication = clamp(
    88 -
      fillerRatio * 180 -
      (words < 15 ? 20 : 0) +
      (language.sentences >= 2 ? 5 : 0) -
      repeatPenalty.communication
  );

  const wpm = (words / duration) * 60;
  let fluency: number;
  if (words < 10) fluency = 45;
  else if (wpm >= 90 && wpm <= 160) fluency = 88;
  else if (wpm >= 70 && wpm < 90) fluency = 78;
  else if (wpm > 160 && wpm < 200) fluency = 75;
  else fluency = 62;
  fluency = clamp(fluency - fillers * 3 - repeatPenalty.fluency);

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
  const offTopic = words >= 8 && semantic.contentScore < 15 && relevance < 30;

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
          rubric ? OVERALL_WEIGHTS[summary.type] : DEFAULT_WEIGHTS
        );

  // Similarity cannot tell a weak answer from a related one, so without the
  // examiner a missing essential point keeps delivery from carrying the score.
  let overall = rawOverall;
  if (localIssue === "too-short") overall = 0;
  else if (offTopic) overall = Math.min(overall, OFF_TOPIC_CAP);
  else if (!judge && semantic.missedMustHave.length > 0) {
    overall = Math.min(overall, MISSED_ESSENTIAL_CAP);
  }

  const review: EvaluationReview = {
    gradedBy: judge ? "ai" : localIssue === "too-short" ? "none" : "similarity",
    models: outcome?.models ?? [],
    confidence: judge?.confidence ?? null,
    flags: judge?.flags ?? [],
    secondOpinion: outcome?.secondOpinion ?? false,
    needsReview: false,
    reasons: [...(outcome?.reviewReasons ?? [])],
  };
  if (outcome?.needsReview) review.needsReview = true;
  if (!judge && localIssue !== "too-short") {
    review.needsReview = true;
    review.reasons.push("The AI examiner was unavailable, so this was graded by meaning similarity only");
  }
  if (transcriptIssue === "unclear") {
    review.needsReview = true;
    review.reasons.push("Speech recognition did not capture the answer clearly");
  }

  const strengths: string[] = [];
  const improvementAreas: string[] = [];

  if (transcriptIssue) {
    improvementAreas.push(
      transcriptIssue === "too-short"
        ? "Record a fuller answer — speak for at least 20–30 seconds"
        : "Your speech was not captured clearly — re-record in a quieter place, closer to the mic"
    );
  }
  if (offTopic) {
    improvementAreas.push("This answer did not address the question — re-read it and try again");
  }
  const isHr = summary.type === "hr";
  for (const error of judge?.factualErrors.slice(0, 2) ?? []) {
    improvementAreas.push(`${isHr ? "Avoid" : "Incorrect"}: "${error.quote}" — ${error.issue}`);
  }
  if (rubric) {
    const reasoning = rubric.items.find((item) => item.key === "reasoning");
    if (reasoning && reasoning.awarded < reasoning.marks / 2 && !offTopic) {
      improvementAreas.push(
        isHr
          ? "Add a real example: the situation, what you did and the result"
          : "Explain why or how, and give an example — not just the definition"
      );
    }
  }

  const covered = semantic.keyPoints.filter((kp) => kp.status === "covered");
  if (covered.length > 0) {
    strengths.push(
      `Covered ${covered.length} of ${semantic.keyPoints.length} expected points, including "${covered[0].text}"`
    );
  }
  if (rubric) {
    const correctness = rubric.items.find((item) => item.key === "correctness");
    if (correctness && judge?.factualErrors.length === 0 && correctness.awarded >= correctness.marks * 0.75) {
      strengths.push(isHr ? "Answered the question directly and genuinely" : "What you said was accurate");
    }
    const reasoning = rubric.items.find((item) => item.key === "reasoning");
    if (reasoning && reasoning.awarded >= reasoning.marks * 0.75) {
      strengths.push(isHr ? "Backed it up with a real example and its result" : "Backed the answer with reasoning or examples");
    }
    const clarity = rubric.items.find((item) => item.key === "clarity");
    if (isHr && clarity && clarity.awarded < clarity.marks / 2) {
      improvementAreas.push("Structure it: a one-line answer, a short example, then what you learned");
    }
  } else if (semantic.answerSimilarity >= 60 && semantic.contentScore >= 50) {
    strengths.push("Answer matched the expected explanation closely");
  }
  if (fillers <= 2 && words >= 20) strengths.push("Limited use of filler words");
  if (repetition.total === 0 && words >= 40) strengths.push("No repeated words or lines");
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
  if (words < 25 && transcriptIssue !== "too-short") {
    improvementAreas.push("Give a longer, more complete answer");
  }
  if (fillers >= 3) improvementAreas.push("Reduce filler words (um, like, actually)");
  improvementAreas.push(...repetitionAdvice(repetition));
  // A few words say nothing reliable about someone's grammar.
  if (transcriptIssue !== "too-short") {
    if (grammar < 75) improvementAreas.push("Improve grammar and sentence structure");
    if (pronouns < 75) improvementAreas.push("Check pronoun forms (I/me, he/him, they/them, their/there/they're)");
  }
  if (mode === "gd" && semantic.sideBalance) {
    const { for: forSide, against } = semantic.sideBalance;
    if (forSide >= 40 && against < 20) improvementAreas.push("Acknowledge the opposing view as well");
    if (against >= 40 && forSide < 20) improvementAreas.push("Acknowledge the supporting view as well");
  }

  if (strengths.length === 0) strengths.push("Attempted the question");
  if (improvementAreas.length === 0) {
    improvementAreas.push(
      rubric && rubric.total >= 8
        ? "Keep this level: practise saying it confidently in 60–90 seconds"
        : "Add one concrete example next time"
    );
  }

  const coverageSentence =
    `You covered ${semantic.coveredCount} of ${semantic.keyPoints.length} expected points` +
    (semantic.partialCount > 0 ? ` and partly covered ${semantic.partialCount} more` : "");

  let aiSummary: string;
  if (transcriptIssue === "too-short") {
    aiSummary =
      "Very little speech was captured, so this answer was not graded. Please allow the microphone and speak clearly for at least 20–30 seconds.";
  } else if (offTopic) {
    aiSummary = `This answer did not address the question. Your delivery was measured, but none of the ${semantic.keyPoints.length} expected points were covered, so the overall score is limited to ${overall}.`;
  } else if (rubric) {
    aiSummary =
      `Answer marks: ${rubric.total}/10. ${coverageSentence}. ` +
      (judge && judge.factualErrors.length > 0
        ? isHr
          ? `${judge.factualErrors.length === 1 ? "One remark" : `${judge.factualErrors.length} remarks`} could worry an interviewer. `
          : `${judge.factualErrors.length === 1 ? "One statement was" : `${judge.factualErrors.length} statements were`} technically incorrect. `
        : "") +
      `Overall score is ${overall}. ` +
      languageSummary(language) +
      (transcriptIssue === "unclear"
        ? " Parts of your speech were not captured clearly — re-record for a fairer grade."
        : "");
  } else {
    aiSummary =
      `${coverageSentence}, giving a content score of ${semantic.contentScore}. ` +
      (semantic.missedMustHave.length > 0
        ? `The score is limited because an essential point was never mentioned: ${semantic.missedMustHave[0]}. `
        : "") +
      `Overall score is ${overall}. ` +
      languageSummary(language);
  }

  return {
    questionId: summary.id,
    question: summary.question,
    questionType: summary.type,
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
      {
        topic: judge ? "Relevance to the question" : "Match with model answer",
        coverage: semantic.answerSimilarity,
      },
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
      // A rewrite of an off-topic answer would only polish the wrong content.
      improvedAnswer: (!offTopic && judge?.improvedAnswer) || undefined,
    },
    speakingDuration: formatDuration(duration),
    wordCount: words,
    fillerWords: fillers,
    repetition,
    modelAnswer: answerKey.modelAnswer,
    followUpQuestion: summary.followUpQuestion,
    rubric,
    factualErrors: judge?.factualErrors ?? [],
    review,
    transcriptIssue,
  };
}
