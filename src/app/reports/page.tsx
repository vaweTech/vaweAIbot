"use client";

import { useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { Modal } from "@/components/common/Modal";
import { analyticsData } from "@/data/analytics";
import { students } from "@/data/students";
import {
  Mic,
  MessagesSquare,
  Languages,
  SpellCheck,
  TrendingUp,
  Users,
  FileText,
  Download,
  Eye,
  X,
} from "lucide-react";

interface ReportCard {
  id: string;
  title: string;
  description: string;
  icon: typeof Mic;
  accent: string;
  summary: string;
}

const NO_DATA = "No student results yet. This report fills in once students complete assessments.";

const { interviewAnalytics, gdAnalytics, communicationAverages, grammarAverages, performanceDistribution } =
  analyticsData;
const topStudent = [...students].sort((a, b) => b.averageScore - a.averageScore)[0];
const excellentShare = performanceDistribution.find((d) => d.label === "Excellent")?.value;
const commonError = grammarAverages.mostCommonErrors[0];

const reports: ReportCard[] = [
  {
    id: "interview",
    title: "Interview Report",
    description: "Mock interview scores, skill breakdown, and trends.",
    icon: Mic,
    accent: "from-indigo-500 to-blue-600",
    summary:
      interviewAnalytics.completed === 0
        ? NO_DATA
        : `${interviewAnalytics.completed} interviews completed with an average score of ${interviewAnalytics.averageScore}%. Technical average: ${interviewAnalytics.technical}%.` +
          (excellentShare !== undefined ? ` ${excellentShare}% of students rated Excellent.` : ""),
  },
  {
    id: "gd",
    title: "GD Report",
    description: "Group discussion participation and skill metrics.",
    icon: MessagesSquare,
    accent: "from-violet-500 to-indigo-500",
    summary:
      gdAnalytics.totalSessions === 0
        ? NO_DATA
        : `${gdAnalytics.totalSessions} GD sessions conducted with ${gdAnalytics.participants} total participants. Average score: ${gdAnalytics.averageScore}%. Average speaking time: ${gdAnalytics.averageSpeakingTime}.`,
  },
  {
    id: "communication",
    title: "Communication Report",
    description: "Fluency, vocabulary, and speaking duration analysis.",
    icon: Languages,
    accent: "from-sky-500 to-blue-500",
    summary:
      communicationAverages.communication === 0
        ? NO_DATA
        : `Platform average communication score: ${communicationAverages.communication}%. Average speaking duration: ${communicationAverages.speakingDuration}. Average filler words per response: ${communicationAverages.fillerWords}.`,
  },
  {
    id: "grammar",
    title: "Grammar Report",
    description: "Error categories, frequency, and student breakdown.",
    icon: SpellCheck,
    accent: "from-amber-500 to-orange-500",
    summary: !commonError
      ? NO_DATA
      : `Average grammar score: ${grammarAverages.averageScore}%. Total errors detected: ${grammarAverages.totalErrors.toLocaleString()}. Most common: ${commonError.category} (${commonError.count} occurrences).`,
  },
  {
    id: "student-progress",
    title: "Student Progress Report",
    description: "Individual student growth and assessment history.",
    icon: TrendingUp,
    accent: "from-emerald-500 to-teal-500",
    summary: !topStudent
      ? NO_DATA
      : `${students.length} students tracked. Top performer: ${topStudent.name} (${topStudent.averageScore}%). ${students.filter((s) => s.status === "at-risk").length} students flagged at-risk.`,
  },
  {
    id: "batch-performance",
    title: "Batch Performance Report",
    description: "Comparative batch-wise assessment performance.",
    icon: Users,
    accent: "from-blue-500 to-indigo-500",
    summary:
      students.length === 0
        ? NO_DATA
        : `${new Set(students.map((s) => s.batch)).size} active batches. Total assessments across batches: ${students.reduce((sum, s) => sum + s.interviewsCompleted + s.gdSessionsCompleted + s.speakingTestsCompleted, 0)}.`,
  },
];

export default function ReportsPage() {
  const [viewReport, setViewReport] = useState<ReportCard | null>(null);
  const [downloadMessage, setDownloadMessage] = useState<string | null>(null);

  const handleDownload = (title: string) => {
    setDownloadMessage(`Report generation started: ${title}`);
    setTimeout(() => setDownloadMessage(null), 4000);
  };

  return (
    <AppShell
      title="Reports"
      subtitle="Generate and download assessment reports."
    >
      {downloadMessage && (
        <div className="mb-4 flex items-center justify-between rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-3 text-sm text-indigo-800 animate-fade-in">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            {downloadMessage}
          </div>
          <button
            type="button"
            onClick={() => setDownloadMessage(null)}
            className="rounded-lg p-1 hover:bg-indigo-100"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 animate-fade-in">
        {reports.map((report) => (
          <div
            key={report.id}
            className="flex flex-col rounded-2xl border border-border bg-white p-5 shadow-sm transition hover:shadow-md"
          >
            <div className="flex items-start gap-4">
              <div
                className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br text-white ${report.accent}`}
              >
                <report.icon className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-slate-900">{report.title}</h3>
                <p className="mt-1 text-sm text-muted">{report.description}</p>
              </div>
            </div>
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={() => setViewReport(report)}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-border px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                <Eye className="h-4 w-4" />
                View Report
              </button>
              <button
                type="button"
                onClick={() => handleDownload(report.title)}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-primary px-3 py-2 text-sm font-medium text-white hover:bg-primary-dark"
              >
                <Download className="h-4 w-4" />
                Download
              </button>
            </div>
          </div>
        ))}
      </div>

      <Modal
        open={!!viewReport}
        onClose={() => setViewReport(null)}
        title={viewReport?.title ?? "Report"}
        size="lg"
        footer={
          <>
            <button
              type="button"
              onClick={() => setViewReport(null)}
              className="rounded-xl border border-border px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
            >
              Close
            </button>
            <button
              type="button"
              onClick={() => {
                if (viewReport) handleDownload(viewReport.title);
                setViewReport(null);
              }}
              className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-dark"
            >
              <Download className="h-4 w-4" />
              Download
            </button>
          </>
        }
      >
        {viewReport && (
          <div className="space-y-4">
            <p className="text-sm leading-relaxed text-slate-700">{viewReport.summary}</p>
            <div className="rounded-xl bg-slate-50 p-4">
              <h4 className="text-sm font-semibold text-slate-900">Report Details</h4>
              <ul className="mt-2 space-y-1 text-sm text-slate-600">
                <li>Report ID: RPT-{viewReport.id.toUpperCase()}</li>
                <li>Status: {viewReport.summary === NO_DATA ? "No data yet" : "Ready for export"}</li>
              </ul>
            </div>
          </div>
        )}
      </Modal>
    </AppShell>
  );
}
