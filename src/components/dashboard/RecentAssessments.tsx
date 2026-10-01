"use client";

import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { StatusBadge } from "@/components/common/StatusBadge";
import { getScoreColor } from "@/lib/scoring";
import { cn, formatDate } from "@/lib/utils";
import type { AssessmentType, RecentAssessment } from "@/types/assessment";

interface RecentAssessmentsProps {
  assessments: RecentAssessment[];
  className?: string;
}

function getAssessmentHref(type: AssessmentType, _id: string): string {
  if (type === "Interview") return "/interviews/result/INT001";
  if (type === "GD") return "/gd/result/GDS001";
  return "/speaking/result/SPK001";
}

export function RecentAssessments({ assessments, className }: RecentAssessmentsProps) {
  return (
    <div className={cn("rounded-2xl border border-border bg-white shadow-sm", className)}>
      <div className="border-b border-border px-5 py-4">
        <h3 className="text-sm font-semibold text-slate-900">Recent Assessments</h3>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead>
            <tr className="border-b border-border bg-slate-50/80">
              <th className="px-5 py-3 font-medium text-muted">Student</th>
              <th className="px-5 py-3 font-medium text-muted">Assessment</th>
              <th className="px-5 py-3 font-medium text-muted">Type</th>
              <th className="px-5 py-3 font-medium text-muted">Score</th>
              <th className="px-5 py-3 font-medium text-muted">Date</th>
              <th className="px-5 py-3 font-medium text-muted">Status</th>
              <th className="px-5 py-3 font-medium text-muted">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {assessments.map((item) => (
              <tr key={item.id} className="transition hover:bg-slate-50/50">
                <td className="px-5 py-3 font-medium text-slate-900">{item.student}</td>
                <td className="max-w-[200px] truncate px-5 py-3 text-slate-700">
                  {item.assessment}
                </td>
                <td className="px-5 py-3">
                  <span className="rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-medium text-indigo-700">
                    {item.type}
                  </span>
                </td>
                <td className={cn("px-5 py-3 font-semibold", getScoreColor(item.score))}>
                  {item.score}%
                </td>
                <td className="px-5 py-3 text-muted">{formatDate(item.date)}</td>
                <td className="px-5 py-3">
                  <StatusBadge status={item.status} />
                </td>
                <td className="px-5 py-3">
                  <Link
                    href={getAssessmentHref(item.type, item.id)}
                    className="inline-flex items-center gap-1 text-xs font-medium text-indigo-600 hover:text-indigo-800"
                  >
                    View
                    <ExternalLink className="h-3 w-3" />
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {assessments.length === 0 && (
        <p className="px-5 py-8 text-center text-sm text-muted">No recent assessments found.</p>
      )}
    </div>
  );
}
