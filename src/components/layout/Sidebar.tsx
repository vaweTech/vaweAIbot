"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Mic,
  Users,
  MessageSquare,
  HelpCircle,
  Lightbulb,
  Volume2,
  BarChart3,
  UserCircle,
  LineChart,
  PieChart,
  Languages,
  SpellCheck,
  FileText,
  ChevronDown,
  X,
  Sparkles,
  Database,
  Upload,
} from "lucide-react";
import { useState } from "react";

type NavItem = {
  label: string;
  href?: string;
  icon: React.ElementType;
  children?: { label: string; href: string; icon: React.ElementType }[];
};

const navigation: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  {
    label: "AI Assessments",
    icon: Sparkles,
    children: [
      { label: "AI Interviews", href: "/interviews", icon: Mic },
      { label: "Group Discussions", href: "/gd", icon: Users },
      { label: "Speaking Assessments", href: "/speaking", icon: MessageSquare },
    ],
  },
  {
    label: "Question Bank",
    icon: HelpCircle,
    children: [
      { label: "Interview Questions", href: "/questions/interview", icon: HelpCircle },
      { label: "GD Topics", href: "/questions/gd", icon: Lightbulb },
      { label: "Speaking Topics", href: "/questions/speaking", icon: Volume2 },
    ],
  },
  {
    label: "AI Training Data",
    icon: Database,
    children: [
      { label: "Question Bank", href: "/admin/questions", icon: Database },
      { label: "Bulk Import", href: "/admin/import", icon: Upload },
    ],
  },
  {
    label: "Analytics",
    icon: BarChart3,
    children: [
      { label: "Student Performance", href: "/analytics/students", icon: UserCircle },
      { label: "Interview Analytics", href: "/analytics/interviews", icon: LineChart },
      { label: "GD Analytics", href: "/analytics/gd", icon: PieChart },
      { label: "Communication Analytics", href: "/analytics/communication", icon: Languages },
      { label: "Grammar Analytics", href: "/analytics/grammar", icon: SpellCheck },
    ],
  },
  { label: "Reports", href: "/reports", icon: FileText },
];

interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

export function Sidebar({ open, onClose }: SidebarProps) {
  const pathname = usePathname();
  const [expanded, setExpanded] = useState<string[]>([
    "AI Assessments",
    "Question Bank",
    "AI Training Data",
    "Analytics",
  ]);

  const toggle = (label: string) => {
    setExpanded((prev) =>
      prev.includes(label) ? prev.filter((l) => l !== label) : [...prev, label]
    );
  };

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(href + "/");

  const content = (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-border px-5 py-5">
        <Link href="/dashboard" className="flex items-center gap-3" onClick={onClose}>
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-blue-600 text-white shadow-md shadow-indigo-200">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-bold text-slate-900">VAWE AI</p>
            <p className="text-[11px] text-muted">Assessment Platform</p>
          </div>
        </Link>
        <button
          onClick={onClose}
          className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 lg:hidden"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4 scrollbar-thin">
        <ul className="space-y-1">
          {navigation.map((item) => {
            if (item.href) {
              const Icon = item.icon;
              const active = isActive(item.href);
              return (
                <li key={item.label}>
                  <Link
                    href={item.href}
                    onClick={onClose}
                    className={cn(
                      "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition",
                      active
                        ? "bg-primary text-white shadow-sm shadow-indigo-200"
                        : "text-slate-600 hover:bg-slate-100"
                    )}
                  >
                    <Icon className="h-4.5 w-4.5" />
                    {item.label}
                  </Link>
                </li>
              );
            }

            const Icon = item.icon;
            const isOpen = expanded.includes(item.label);
            const childActive = item.children?.some((c) => isActive(c.href));

            return (
              <li key={item.label}>
                <button
                  onClick={() => toggle(item.label)}
                  className={cn(
                    "flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-sm font-medium transition",
                    childActive ? "text-primary" : "text-slate-600 hover:bg-slate-100"
                  )}
                >
                  <span className="flex items-center gap-3">
                    <Icon className="h-4.5 w-4.5" />
                    {item.label}
                  </span>
                  <ChevronDown
                    className={cn("h-4 w-4 transition", isOpen && "rotate-180")}
                  />
                </button>
                {isOpen && item.children && (
                  <ul className="ml-3 mt-1 space-y-0.5 border-l border-border pl-3">
                    {item.children.map((child) => {
                      const ChildIcon = child.icon;
                      const active = isActive(child.href);
                      return (
                        <li key={child.href}>
                          <Link
                            href={child.href}
                            onClick={onClose}
                            className={cn(
                              "flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] font-medium transition",
                              active
                                ? "bg-primary-light text-primary"
                                : "text-slate-500 hover:bg-slate-50 hover:text-slate-700"
                            )}
                          >
                            <ChildIcon className="h-3.5 w-3.5" />
                            {child.label}
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="border-t border-border p-4">
        <div className="rounded-xl bg-gradient-to-br from-indigo-50 to-blue-50 p-3">
          <p className="text-xs font-semibold text-indigo-700">VAWE AI Assessment</p>
          <p className="mt-0.5 text-[11px] text-indigo-500">
            Frontend prototype · Mock AI
          </p>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/40 lg:hidden"
          onClick={onClose}
        />
      )}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-72 border-r border-border bg-white transition-transform duration-300 lg:static lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {content}
      </aside>
    </>
  );
}
