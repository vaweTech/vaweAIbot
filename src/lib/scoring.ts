import type { EvaluationWeights } from "@/types/interview";

export const DEFAULT_WEIGHTS: EvaluationWeights = {
  technicalKnowledge: 30,
  relevance: 20,
  communication: 15,
  grammar: 15,
  fluency: 10,
  vocabulary: 10,
};

export function calculateInterviewScore(scores: {
  technicalKnowledge: number;
  relevance: number;
  communication: number;
  grammar: number;
  fluency: number;
  vocabulary: number;
}, weights: EvaluationWeights = DEFAULT_WEIGHTS): number {
  const totalWeight =
    weights.technicalKnowledge +
    weights.relevance +
    weights.communication +
    weights.grammar +
    weights.fluency +
    weights.vocabulary;

  if (totalWeight === 0) return 0;

  const weighted =
    (scores.technicalKnowledge * weights.technicalKnowledge +
      scores.relevance * weights.relevance +
      scores.communication * weights.communication +
      scores.grammar * weights.grammar +
      scores.fluency * weights.fluency +
      scores.vocabulary * weights.vocabulary) /
    totalWeight;

  return Math.round(weighted);
}

export function calculateWeightTotal(weights: EvaluationWeights): number {
  return (
    weights.technicalKnowledge +
    weights.relevance +
    weights.communication +
    weights.grammar +
    weights.fluency +
    weights.vocabulary
  );
}

export function calculateGDOverall(scores: {
  communication: number;
  grammar: number;
  fluency: number;
  relevance: number;
  topicUnderstanding: number;
  teamInteraction: number;
}): number {
  const values = Object.values(scores);
  return Math.round(values.reduce((a, b) => a + b, 0) / values.length);
}

export function calculateSpeakingOverall(scores: {
  fluency: number;
  grammar: number;
  vocabulary: number;
  communication: number;
  topicRelevance: number;
  sentenceStructure: number;
}): number {
  const values = Object.values(scores);
  return Math.round(values.reduce((a, b) => a + b, 0) / values.length);
}

export function getScoreLabel(score: number): string {
  if (score >= 85) return "Excellent";
  if (score >= 70) return "Good";
  if (score >= 55) return "Average";
  return "Needs Improvement";
}

export function getScoreColor(score: number): string {
  if (score >= 85) return "text-emerald-600";
  if (score >= 70) return "text-blue-600";
  if (score >= 55) return "text-amber-600";
  return "text-rose-600";
}
