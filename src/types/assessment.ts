export type AssessmentType = "Interview" | "GD" | "Speaking";

export interface RecentAssessment {
  id: string;
  student: string;
  studentId: string;
  assessment: string;
  type: AssessmentType;
  score: number;
  date: string;
  status: "completed" | "in-progress" | "pending";
}

export interface DashboardKPIs {
  totalStudents: number;
  totalInterviews: number;
  completedInterviews: number;
  gdSessions: number;
  speakingAssessments: number;
  averageInterviewScore: number;
  averageCommunication: number;
  averageGrammar: number;
}

export interface ActivityPoint {
  month: string;
  interviews: number;
  gdSessions: number;
  speakingTests: number;
}

export interface SkillPerformance {
  skill: string;
  score: number;
}

export interface PerformanceDistribution {
  label: string;
  value: number;
  color: string;
}

export interface StudentPerformancePoint {
  month: string;
  interview: number;
  gd: number;
  communication: number;
  grammar: number;
  fluency: number;
  technical: number;
}

export interface GrammarErrorCategory {
  category: string;
  count: number;
}

export interface AnalyticsData {
  kpis: DashboardKPIs;
  activity: ActivityPoint[];
  skillPerformance: SkillPerformance[];
  performanceDistribution: PerformanceDistribution[];
  recentAssessments: RecentAssessment[];
  communicationAverages: {
    communication: number;
    grammar: number;
    fluency: number;
    vocabulary: number;
    sentenceStructure: number;
    speakingDuration: string;
    fillerWords: number;
  };
  communicationTrend: { month: string; communication: number; fluency: number; vocabulary: number }[];
  grammarAverages: {
    averageScore: number;
    totalErrors: number;
    mostCommonErrors: GrammarErrorCategory[];
  };
  interviewAnalytics: {
    total: number;
    completed: number;
    averageScore: number;
    technical: number;
    communication: number;
    grammar: number;
    fluency: number;
    trend: { month: string; score: number }[];
    distribution: PerformanceDistribution[];
  };
  gdAnalytics: {
    totalSessions: number;
    participants: number;
    averageScore: number;
    averageParticipation: number;
    averageSpeakingTime: string;
    skills: SkillPerformance[];
  };
}
