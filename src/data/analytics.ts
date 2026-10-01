import type { AnalyticsData } from "@/types/assessment";

export const analyticsData: AnalyticsData = {
  kpis: {
    totalStudents: 0,
    totalInterviews: 0,
    completedInterviews: 0,
    gdSessions: 0,
    speakingAssessments: 0,
    averageInterviewScore: 0,
    averageCommunication: 0,
    averageGrammar: 0,
  },
  activity: [],
  skillPerformance: [],
  performanceDistribution: [],
  recentAssessments: [],
  communicationAverages: {
    communication: 0,
    grammar: 0,
    fluency: 0,
    vocabulary: 0,
    sentenceStructure: 0,
    speakingDuration: "0:00",
    fillerWords: 0,
  },
  communicationTrend: [],
  grammarAverages: {
    averageScore: 0,
    totalErrors: 0,
    mostCommonErrors: [],
  },
  interviewAnalytics: {
    total: 0,
    completed: 0,
    averageScore: 0,
    technical: 0,
    communication: 0,
    grammar: 0,
    fluency: 0,
    trend: [],
    distribution: [],
  },
  gdAnalytics: {
    totalSessions: 0,
    participants: 0,
    averageScore: 0,
    averageParticipation: 0,
    averageSpeakingTime: "0:00",
    skills: [],
  },
};

export function getRecentAssessments(limit = 8) {
  return analyticsData.recentAssessments.slice(0, limit);
}
