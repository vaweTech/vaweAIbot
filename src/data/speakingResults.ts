import type { SpeakingResult } from "@/types/speaking";

export const speakingResults: SpeakingResult[] = [];

export function getSpeakingResultById(id: string): SpeakingResult | undefined {
  return speakingResults.find((result) => result.id === id);
}

export function getSpeakingResultsByStudentId(studentId: string): SpeakingResult[] {
  return speakingResults.filter((result) => result.studentId === studentId);
}
