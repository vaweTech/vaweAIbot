import { PRIVATE_PAGE_METADATA } from "@/lib/site";

export const metadata = { ...PRIVATE_PAGE_METADATA, title: "Speaking" };

export default function SpeakingLayout({ children }: { children: React.ReactNode }) {
  return children;
}
