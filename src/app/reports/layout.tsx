import { PRIVATE_PAGE_METADATA } from "@/lib/site";

export const metadata = { ...PRIVATE_PAGE_METADATA, title: "Reports" };

export default function ReportsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
