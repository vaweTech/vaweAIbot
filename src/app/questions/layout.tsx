import { PRIVATE_PAGE_METADATA } from "@/lib/site";

export const metadata = { ...PRIVATE_PAGE_METADATA, title: "Questions" };

export default function QuestionsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
