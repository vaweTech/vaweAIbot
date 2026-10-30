"use client";

import type { jsPDF } from "jspdf";
import { REPETITION_LABELS } from "@/lib/repetition";
import { CONTENT_SCORE_LABEL } from "@/lib/rubric";
import { getScoreLabel } from "@/lib/scoring";
import type { InterviewSummary } from "@/lib/interviewSummary";
import type { InterviewResultDraft } from "@/types/interviewResult";

const PAGE_MARGIN = 16;
const LINE_HEIGHT = 5;
const INDIGO: [number, number, number] = [79, 70, 229];
const SLATE: [number, number, number] = [71, 85, 105];
const DARK: [number, number, number] = [15, 23, 42];

/** jsPDF's built-in fonts only cover Latin-1, so typographic characters would print as junk. */
function ascii(value: string): string {
  return value
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2013\u2014]/g, "-")
    .replace(/\u2026/g, "...")
    .replace(/[\u2022\u00B7]/g, "-")
    .replace(/\u2192/g, "->")
    .replace(/[\u2713\u2714]/g, "OK")
    .replace(/[^\x20-\x7E\u00A0-\u00FF\n]/g, "");
}

class PdfWriter {
  private y = PAGE_MARGIN;
  private readonly width: number;
  private readonly height: number;

  constructor(private readonly doc: jsPDF) {
    this.width = doc.internal.pageSize.getWidth();
    this.height = doc.internal.pageSize.getHeight();
  }

  private ensure(space: number) {
    if (this.y + space > this.height - PAGE_MARGIN) {
      this.doc.addPage();
      this.y = PAGE_MARGIN;
    }
  }

  gap(mm = 3) {
    this.y += mm;
  }

  text(
    value: string,
    { size = 10, bold = false, color = DARK, indent = 0 }: { size?: number; bold?: boolean; color?: [number, number, number]; indent?: number } = {}
  ) {
    const clean = ascii(value).trim();
    if (!clean) return;
    this.doc.setFont("helvetica", bold ? "bold" : "normal");
    this.doc.setFontSize(size);
    this.doc.setTextColor(...color);
    const lines = this.doc.splitTextToSize(clean, this.width - PAGE_MARGIN * 2 - indent) as string[];
    const lineHeight = Math.max(LINE_HEIGHT, size * 0.45);
    for (const line of lines) {
      this.ensure(lineHeight);
      this.doc.text(line, PAGE_MARGIN + indent, this.y + lineHeight * 0.75);
      this.y += lineHeight;
    }
  }

  bullets(items: string[], color: [number, number, number] = SLATE) {
    for (const item of items) this.text(`- ${item}`, { size: 9.5, color, indent: 3 });
  }

  rule() {
    this.ensure(4);
    this.doc.setDrawColor(226, 232, 240);
    this.doc.line(PAGE_MARGIN, this.y + 1.5, this.width - PAGE_MARGIN, this.y + 1.5);
    this.y += 4;
  }

  header(title: string, subtitle: string, score: string, label: string) {
    this.doc.setFillColor(...INDIGO);
    this.doc.rect(0, 0, this.width, 36, "F");
    this.doc.setTextColor(255, 255, 255);
    this.doc.setFont("helvetica", "normal");
    this.doc.setFontSize(9);
    this.doc.text("INTERVIEW REPORT", PAGE_MARGIN, 11);
    this.doc.setFont("helvetica", "bold");
    this.doc.setFontSize(17);
    this.doc.text(ascii(title).slice(0, 60), PAGE_MARGIN, 20);
    this.doc.setFont("helvetica", "normal");
    this.doc.setFontSize(9.5);
    this.doc.text(ascii(subtitle), PAGE_MARGIN, 28);
    this.doc.setFont("helvetica", "bold");
    this.doc.setFontSize(26);
    this.doc.text(score, this.width - PAGE_MARGIN, 21, { align: "right" });
    this.doc.setFont("helvetica", "normal");
    this.doc.setFontSize(9);
    this.doc.text(label, this.width - PAGE_MARGIN, 28, { align: "right" });
    this.y = 44;
  }

  stats(entries: [string, number | null][]) {
    this.ensure(18);
    const boxWidth = (this.width - PAGE_MARGIN * 2 - (entries.length - 1) * 4) / entries.length;
    entries.forEach(([label, value], i) => {
      const x = PAGE_MARGIN + i * (boxWidth + 4);
      this.doc.setFillColor(241, 245, 249);
      this.doc.roundedRect(x, this.y, boxWidth, 16, 2, 2, "F");
      this.doc.setTextColor(...SLATE);
      this.doc.setFont("helvetica", "normal");
      this.doc.setFontSize(8.5);
      this.doc.text(label, x + boxWidth / 2, this.y + 5.5, { align: "center" });
      this.doc.setTextColor(...DARK);
      this.doc.setFont("helvetica", "bold");
      this.doc.setFontSize(14);
      this.doc.text(value === null ? "-" : String(value), x + boxWidth / 2, this.y + 12.5, { align: "center" });
    });
    this.y += 20;
  }

  footer(note: string) {
    const pages = this.doc.getNumberOfPages();
    for (let page = 1; page <= pages; page++) {
      this.doc.setPage(page);
      this.doc.setFont("helvetica", "normal");
      this.doc.setFontSize(8);
      this.doc.setTextColor(148, 163, 184);
      this.doc.text(ascii(note), PAGE_MARGIN, this.height - 8);
      this.doc.text(`Page ${page} of ${pages}`, this.width - PAGE_MARGIN, this.height - 8, { align: "right" });
    }
  }
}

function fileSafe(value: string) {
  return value.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").toLowerCase() || "interview";
}

/** Builds the end-of-interview report as a PDF and starts the download. */
export async function downloadReportPdf(
  draft: InterviewResultDraft,
  summary: InterviewSummary,
  resultId: string | null
): Promise<void> {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pdf = new PdfWriter(doc);
  const finished = new Date(draft.finishedAt);

  pdf.header(
    draft.testTitle,
    `${draft.candidateName} - ${finished.toLocaleString()} - ${summary.answered} of ${draft.answers.length} questions answered`,
    summary.overall === null ? "-" : String(summary.overall),
    summary.overall === null ? "Overall" : `Overall - ${getScoreLabel(summary.overall)}`
  );

  pdf.stats([
    ...(summary.knowledge !== null || summary.answerQuality === null
      ? [["Technical", summary.knowledge] as [string, number | null]]
      : []),
    ...(summary.answerQuality !== null ? [["Answer quality", summary.answerQuality] as [string, number | null]] : []),
    ["English", summary.english],
    ["Fluency", summary.fluency],
    ["Repeats", summary.repeats ?? null],
    ["Looked away", draft.lookAwayCount],
  ]);

  if (summary.focus.length > 0) {
    pdf.text("Focus on these next time", { size: 11, bold: true });
    pdf.gap(1);
    pdf.bullets(summary.focus);
    pdf.gap(3);
  }

  draft.answers.forEach((answer, index) => {
    pdf.rule();
    const result = answer.result;
    pdf.text(`Q${index + 1}. ${answer.question}`, { size: 11, bold: true });
    if (!answer.transcript) {
      pdf.text("Not answered.", { size: 9.5, color: SLATE });
      return;
    }
    if (result) {
      const s = result.scores;
      const marks = result.rubric ? `Marks ${result.rubric.total}/10  |  ` : "";
      pdf.text(
        `${marks}Overall ${s.overall}  |  ${CONTENT_SCORE_LABEL[result.questionType ?? "technical"]} ${s.technicalKnowledge}  |  Grammar ${s.grammar}  |  Fluency ${s.fluency}  |  Vocabulary ${s.vocabulary}`,
        { size: 9, bold: true, color: INDIGO }
      );
    }
    pdf.gap(1);
    pdf.text("Your answer", { size: 9, bold: true, color: SLATE });
    pdf.text(answer.transcript, { size: 9.5 });

    if (!result) {
      pdf.text("This answer could not be graded.", { size: 9.5, color: SLATE });
      return;
    }
    if (result.aiSummary) {
      pdf.gap(1);
      pdf.text(result.aiSummary, { size: 9.5, color: SLATE });
    }
    if (result.rubric) {
      pdf.gap(1);
      pdf.text("Marks", { size: 9, bold: true, color: SLATE });
      pdf.bullets(result.rubric.items.map((item) => `${item.label}: ${item.awarded}/${item.marks}`));
    }
    const missed = result.semantic?.keyPoints.filter((p) => p.status !== "covered") ?? [];
    if (missed.length > 0) {
      pdf.gap(1);
      pdf.text("Points to cover", { size: 9, bold: true, color: SLATE });
      pdf.bullets(missed.map((p) => `${p.text}${p.status === "partial" ? " (partly covered)" : ""}`));
    }
    if (result.factualErrors && result.factualErrors.length > 0) {
      pdf.gap(1);
      pdf.text(result.questionType === "hr" ? "Remarks to avoid" : "Incorrect statements", {
        size: 9,
        bold: true,
        color: [190, 18, 60],
      });
      pdf.bullets(result.factualErrors.map((e) => `"${e.quote}" - ${e.issue}`), [190, 18, 60]);
    }
    if (result.repetition && result.repetition.total > 0) {
      pdf.gap(1);
      pdf.text(`Repetition - ${result.repetition.total} ${result.repetition.total === 1 ? "mistake" : "mistakes"}`, {
        size: 9,
        bold: true,
        color: [180, 83, 9],
      });
      pdf.bullets(
        result.repetition.issues.map((i) => `${REPETITION_LABELS[i.kind]}: "${i.text}" (${i.count} times)`),
        [180, 83, 9]
      );
    }
    if (result.strengths.length > 0) {
      pdf.gap(1);
      pdf.text("Strengths", { size: 9, bold: true, color: [4, 120, 87] });
      pdf.bullets(result.strengths);
    }
    if (result.improvementAreas.length > 0) {
      pdf.gap(1);
      pdf.text("To improve", { size: 9, bold: true, color: [180, 83, 9] });
      pdf.bullets(result.improvementAreas);
    }
  });

  pdf.footer(resultId ? `Result ID: ${resultId}` : "Not saved online");
  const date = finished.toISOString().slice(0, 10);
  doc.save(`${fileSafe(draft.candidateName)}-${fileSafe(draft.testTitle)}-${date}.pdf`);
}
