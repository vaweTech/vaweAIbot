export type Difficulty = "Beginner" | "Intermediate" | "Advanced";
export type GDStatus = "draft" | "scheduled" | "active" | "completed";
export type ParticipationLevel = "High" | "Medium" | "Low";

export interface GDTopic {
  id: string;
  topic: string;
  description: string;
  category: string;
  difficulty: Difficulty;
  duration: number;
  maxParticipants: number;
  timesUsed: number;
  averageScore: number;
  evaluationCriteria: string[];
}

export interface GDParticipant {
  studentId: string;
  studentName: string;
  speakingTime: number;
  turns: number;
  status: "speaking" | "listening";
  participation: ParticipationLevel;
}

export interface GDTranscriptEntry {
  time: string;
  speaker: string;
  text: string;
}

export interface GDSession {
  id: string;
  topicId: string;
  topic: string;
  category: string;
  duration: number;
  participants: GDParticipant[];
  averageScore: number;
  status: GDStatus;
  date: string;
  transcript: GDTranscriptEntry[];
}

export interface GDResult {
  id: string;
  sessionId: string;
  topic: string;
  studentId: string;
  studentName: string;
  date: string;
  duration: number;
  speakingTime: number;
  turns: number;
  relevantContributions: number;
  interruptions: number;
  fillerWords: number;
  scores: {
    communication: number;
    grammar: number;
    pronouns?: number;
    fluency: number;
    relevance: number;
    topicUnderstanding: number;
    teamInteraction: number;
    overall: number;
  };
  participation: ParticipationLevel;
  strengths: string[];
  improvementAreas: string[];
  keyContributions: string[];
  aiSummary: string;
}
