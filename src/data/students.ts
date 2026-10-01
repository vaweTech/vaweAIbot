import type { Student } from "@/types/student";

export const students: Student[] = [];

export function getStudentById(id: string): Student | undefined {
  return students.find((s) => s.id === id);
}
