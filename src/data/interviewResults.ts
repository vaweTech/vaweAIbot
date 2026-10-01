import type { InterviewResult } from "@/types/interview";

export const interviewResults: InterviewResult[] = [];

export function getInterviewResultById(id: string): InterviewResult | undefined {
  return interviewResults.find((result) => result.id === id);
}

export function getInterviewResultsByStudentId(studentId: string): InterviewResult[] {
  return interviewResults.filter((result) => result.studentId === studentId);
}

export function getInterviewResultsByInterviewId(interviewId: string): InterviewResult[] {
  return interviewResults.filter((result) => result.interviewId === interviewId);
}
