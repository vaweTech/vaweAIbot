import { PRIVATE_PAGE_METADATA } from "@/lib/site";

export const metadata = { ...PRIVATE_PAGE_METADATA, title: "Analytics" };

export default function AnalyticsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
