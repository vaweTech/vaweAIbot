export type Difficulty = "Beginner" | "Intermediate" | "Advanced";
export type SpeakingStatus = "draft" | "active" | "completed";

export interface SpeakingTest {
  id: string;
  topic: string;
  category: string;
  duration: number;
  difficulty: Difficulty;
  evaluationCriteria: string[];
  attempts: number;
  averageScore: number;
  averageFluency: number;
  status: SpeakingStatus;
  createdAt: string;
}

export interface SpeakingResult {
  id: string;
  testId: string;
  topic: string;
  studentId: string;
  studentName: string;
  date: string;
  speakingDuration: string;
  wordCount: number;
  fillerWords: number;
  scores: {
    fluency: number;
    grammar: number;
    vocabulary: number;
    communication: number;
    topicRelevance: number;
    sentenceStructure: number;
    overall: number;
  };
  transcript: string;
  strengths: string[];
  improvementAreas: string[];
  aiSummary: string;
  status: "completed" | "in-progress";
}
