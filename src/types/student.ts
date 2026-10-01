export type StudentStatus = "active" | "inactive" | "at-risk";

export interface Student {
  id: string;
  name: string;
  course: string;
  batch: string;
  email: string;
  avatar?: string;
  status: StudentStatus;
  interviewsCompleted: number;
  gdSessionsCompleted: number;
  speakingTestsCompleted: number;
  averageScore: number;
  communicationScore: number;
  grammarScore: number;
}

export const currentUser = {
  id: "STU001",
  name: "Ravi Kumar",
  role: "admin" as const,
  title: "Admin",
};
