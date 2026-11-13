"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, Bell, ShieldCheck } from "lucide-react";
import { currentUser } from "@/types/student";
import { cn, getInitials } from "@/lib/utils";

interface HeaderProps {
  title: string;
  subtitle?: string;
  onMenuClick: () => void;
  actions?: React.ReactNode;
}

export function Header({ title, subtitle, onMenuClick, actions }: HeaderProps) {
  const pathname = usePathname();
  const inAdmin = pathname.startsWith("/admin");

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-white/90 backdrop-blur-md">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3 px-4 py-3 sm:px-6 sm:py-4 lg:px-8 xl:flex-nowrap">
        <div className="flex min-w-0 flex-1 basis-0 items-center gap-3">
          <button
            onClick={onMenuClick}
            className="rounded-xl border border-border p-2 text-slate-600 hover:bg-slate-50 lg:hidden"
          >
            <Menu className="h-5 w-5" />
          </button>
          <div className="min-w-0">
            <h1 className="truncate text-xl font-bold text-slate-900 sm:text-2xl">{title}</h1>
            {subtitle && (
              <p className="mt-0.5 truncate text-sm text-muted">{subtitle}</p>
            )}
          </div>
        </div>
        {actions && (
          <div className="order-last flex w-full flex-wrap items-center gap-2 whitespace-nowrap xl:order-none xl:w-auto xl:flex-nowrap xl:gap-3">
            {actions}
          </div>
        )}
        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          <Link
            href="/admin/questions"
            title="Admin — AI training data"
            className={cn(
              "flex items-center gap-2 rounded-xl border px-2.5 py-2 text-sm font-medium transition",
              inAdmin
                ? "border-primary bg-primary-light text-primary"
                : "border-border text-slate-600 hover:bg-slate-50 hover:text-primary"
            )}
          >
            <ShieldCheck className="h-4.5 w-4.5" />
            <span className="hidden sm:inline">Admin</span>
          </Link>
          <button className="relative hidden rounded-xl border border-border p-2 text-slate-500 hover:bg-slate-50 sm:flex">
            <Bell className="h-5 w-5" />
            <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-rose-500" />
          </button>
          <div className="flex items-center gap-2.5 rounded-xl border border-border bg-white px-2.5 py-1.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-blue-600 text-xs font-semibold text-white">
              {getInitials(currentUser.name)}
            </div>
            <div className="hidden sm:block">
              <p className="text-sm font-medium text-slate-800">{currentUser.name}</p>
              <p className="text-[11px] capitalize text-muted">{currentUser.role}</p>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
