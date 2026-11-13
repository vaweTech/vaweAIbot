import { PRIVATE_PAGE_METADATA } from "@/lib/site";

export const metadata = { ...PRIVATE_PAGE_METADATA, title: "Admin" };

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return children;
}
