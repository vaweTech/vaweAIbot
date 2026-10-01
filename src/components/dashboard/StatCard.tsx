import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  trend?: string;
  accent?: string;
}

export function StatCard({ title, value, icon: Icon, trend, accent = "from-indigo-500 to-blue-600" }: StatCardProps) {
  return (
    <div className="rounded-2xl border border-border bg-white p-5 shadow-sm transition hover:shadow-md">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-muted">{title}</p>
          <p className="mt-2 text-2xl font-bold text-slate-900">{value}</p>
          {trend && <p className="mt-1 text-xs text-emerald-600">{trend}</p>}
        </div>
        <div className={cn("flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br text-white shadow-sm", accent)}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}
