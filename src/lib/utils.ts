export function cn(...classes: (string | false | null | undefined)[]): string {
  return classes.filter(Boolean).join(" ");
}

export function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}m ${s.toString().padStart(2, "0")}s`;
}

export function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good Morning";
  if (hour < 17) return "Good Afternoon";
  return "Good Evening";
}

export function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export function highlightFillers(text: string): { word: string; isFiller: boolean }[] {
  const fillers = ["basically", "actually", "you know", "like", "um", "uh", "sort of", "kind of"];
  const parts: { word: string; isFiller: boolean }[] = [];
  let remaining = text;
  const pattern = new RegExp(`\\b(${fillers.join("|")})\\b`, "gi");

  let lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push({ word: text.slice(lastIndex, match.index), isFiller: false });
    }
    parts.push({ word: match[0], isFiller: true });
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < text.length) {
    parts.push({ word: text.slice(lastIndex), isFiller: false });
  }
  if (parts.length === 0) {
    parts.push({ word: remaining, isFiller: false });
  }
  return parts;
}

export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export const COURSES = [
  "Java Full Stack",
  "Python Full Stack",
  "Data Science",
  "Web Development",
  "Digital Marketing",
  "Cloud Computing",
] as const;

export const BATCHES = [
  "JFS-2026-A",
  "JFS-2026-B",
  "PFS-2026-A",
  "PFS-2026-B",
  "DS-2026-A",
  "DS-2026-B",
  "WD-2026-A",
  "WD-2026-B",
  "CC-2026-A",
  "DM-2026-A",
] as const;

export const JOB_ROLES = [
  "Frontend Developer",
  "Backend Developer",
  "Full Stack Developer",
  "Java Developer",
  "Python Developer",
  "Data Analyst",
  "DevOps Engineer",
] as const;

export const INTERVIEW_CATEGORIES = [
  "Java",
  "JavaScript",
  "React",
  "Node.js",
  "SQL",
  "DBMS",
  "HTML/CSS",
  "Python",
  "Data Science",
  "HR",
  "Communication",
] as const;

export const GD_CATEGORIES = [
  "Technology",
  "Education",
  "Business",
  "Society",
  "Career",
  "Current Affairs",
  "Abstract",
] as const;

export const DIFFICULTIES = ["Beginner", "Intermediate", "Advanced"] as const;
