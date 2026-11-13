import { PRIVATE_PAGE_METADATA } from "@/lib/site";

export const metadata = { ...PRIVATE_PAGE_METADATA, title: "Dashboard" };

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return children;
}
