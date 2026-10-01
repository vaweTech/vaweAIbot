export type Difficulty = "Beginner" | "Intermediate" | "Advanced";
export type AssessmentStatus = "draft" | "active" | "completed" | "archived";
export type QuestionSelectionMode = "Manual" | "Question Bank" | "AI Generated";

export interface EvaluationWeights {
  technicalKnowledge: number;
  relevance: number;
  communication: number;
  grammar: number;
  fluency: number;
  vocabulary: number;
}

export interface Interview {
  id: string;
  name: string;
  jobRole: string;
  course: string;
  batch: string;
  difficulty: Difficulty;
  duration: number;
  questionCount: number;
  questionIds: string[];
  questionSelection: QuestionSelectionMode;
  weights: EvaluationWeights;
  attempts: number;
  averageScore: number;
  status: AssessmentStatus;
  createdAt: string;
}

export interface InterviewQuestion {
  id: string;
  question: string;
  category: string;
  jobRole: string;
  difficulty: Difficulty;
  expectedTopics: string[];
  expectedAnswerPoints: string[];
  keywords: string[];
  status: "active" | "inactive";
}

export interface GrammarError {
  id: string;
  category: string;
  original: string;
  correction: string;
  explanation: string;
}

export interface InterviewResult {
  id: string;
  interviewId: string;
  interviewName: string;
  studentId: string;
  studentName: string;
  jobRole: string;
  date: string;
  duration: number;
  scores: {
    technicalKnowledge: number;
    relevance: number;
    communication: number;
    grammar: number;
    fluency: number;
    vocabulary: number;
    overall: number;
  };
  strengths: string[];
  improvementAreas: string[];
  aiSummary: string;
  topicCoverage: { topic: string; coverage: number }[];
  transcript: string;
  speakingDuration: string;
  wordCount: number;
  fillerWords: number;
  grammarAnalysis: {
    score: number;
    pronounsScore?: number;
    totalSentences: number;
    errors: number;
    pronounErrors?: number;
    correctSentences: number;
    mistakes: GrammarError[];
  };
  status: "completed" | "in-progress" | "abandoned";
}
