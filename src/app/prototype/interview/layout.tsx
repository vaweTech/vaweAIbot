import type { Metadata } from "next";
import { pageMetadata } from "@/lib/site";

export const metadata: Metadata = pageMetadata({
  title: "AI Mock Interview – Practise Technical & HR Questions Online",
  description:
    "Take a free AI mock interview in your browser. An AI interviewer asks technical and HR questions aloud, you answer by speaking, and you get marks, grammar and fluency feedback and a PDF report.",
  path: "/prototype/interview",
});

export default function InterviewLayout({ children }: { children: React.ReactNode }) {
  return children;
}
