import type { GDSession } from "@/types/gd";

export const gdSessions: GDSession[] = [];

export function getGDSessionById(id: string): GDSession | undefined {
  return gdSessions.find((session) => session.id === id);
}
