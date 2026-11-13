import type { Metadata } from "next";
import { pageMetadata } from "@/lib/site";

export const metadata: Metadata = pageMetadata({
  title: "AI Group Discussion Practice – GD Round Simulator",
  description:
    "Practise group discussion (GD) rounds with four AI participants. Speak your points on a topic and get scored on relevance, clarity, balance of arguments and leadership.",
  path: "/prototype/gd",
});

export default function GroupDiscussionLayout({ children }: { children: React.ReactNode }) {
  return children;
}
