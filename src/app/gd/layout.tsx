import { PRIVATE_PAGE_METADATA } from "@/lib/site";

export const metadata = { ...PRIVATE_PAGE_METADATA, title: "Group Discussions" };

export default function GdLayout({ children }: { children: React.ReactNode }) {
  return children;
}
