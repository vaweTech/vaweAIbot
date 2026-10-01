import type { GDResult } from "@/types/gd";

export const gdResults: GDResult[] = [];

export function getGDResultById(id: string): GDResult | undefined {
  return gdResults.find((result) => result.id === id);
}

export function getGDResultsByStudentId(studentId: string): GDResult[] {
  return gdResults.filter((result) => result.studentId === studentId);
}
