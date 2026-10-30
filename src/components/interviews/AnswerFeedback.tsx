import { AnswerMarksPanel } from "@/components/interviews/AnswerMarksPanel";
import { KeyPointCoverage } from "@/components/interviews/KeyPointCoverage";
import { LanguageAnalysisPanel } from "@/components/interviews/LanguageAnalysisPanel";
import { RepetitionPanel } from "@/components/interviews/RepetitionPanel";
import { ScoreCard } from "@/components/interviews/ScoreCard";
import type { AnswerEvaluation } from "@/lib/answerEvaluation";
import { CONTENT_SCORE_LABEL } from "@/lib/rubric";
import type { RepetitionReport } from "@/lib/repetition";
import type { SemanticResult } from "@/lib/semanticScoring";
import type { analyzeVoiceAnswer } from "@/lib/voiceAnalysis";

/** Both grading paths produce this; only the bank path fills in the AI fields. */
export type AnswerResult = Omit<Awaited<ReturnType<typeof analyzeVoiceAnswer>>, "repetition"> & {
  /** Missing on results saved before repetition was checked. */
  repetition?: RepetitionReport;
  semantic?: SemanticResult;
  modelAnswer?: string;
} & Partial<Pick<AnswerEvaluation, "rubric" | "factualErrors" | "review" | "transcriptIssue" | "questionType">>;

/** Full feedback for one answer, shown in the end-of-interview report. */
export function AnswerFeedback({ result, transcript }: { result: AnswerResult; transcript: string }) {
  return (
    <div className="space-y-4">
      <div className="rounded-2xl bg-slate-50 p-4">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Your answer</p>
        <p className="mt-1.5 text-sm leading-relaxed text-slate-700">{transcript}</p>
        <p className="mt-2 text-[11px] text-slate-400">
          {result.wordCount} words · {result.fillerWords} fillers
          {result.repetition ? ` · ${result.repetition.total} repeats` : ""} · {result.speakingDuration}
        </p>
      </div>

      {result.aiSummary && <p className="text-sm leading-relaxed text-slate-600">{result.aiSummary}</p>}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <ScoreCard
          label={CONTENT_SCORE_LABEL[result.questionType ?? "technical"]}
          score={result.scores.technicalKnowledge}
        />
        <ScoreCard label="Relevance" score={result.scores.relevance} />
        <ScoreCard label="Communication" score={result.scores.communication} />
        <ScoreCard label="Grammar" score={result.scores.grammar} />
        <ScoreCard label="Pronouns" score={result.scores.pronouns} />
        <ScoreCard label="Fluency" score={result.scores.fluency} />
        <ScoreCard label="Vocabulary" score={result.scores.vocabulary} />
        <div className="flex items-center justify-center rounded-2xl bg-indigo-600 p-4 text-white">
          <div className="text-center">
            <p className="text-xs opacity-80">Overall</p>
            <p className="text-3xl font-bold">{result.scores.overall}</p>
          </div>
        </div>
      </div>

      <AnswerMarksPanel
        rubric={result.rubric}
        factualErrors={result.factualErrors}
        review={result.review}
        transcriptIssue={result.transcriptIssue}
      />
      {result.semantic && <KeyPointCoverage semantic={result.semantic} modelAnswer={result.modelAnswer} />}
      <LanguageAnalysisPanel analysis={result.grammarAnalysis} />
      <RepetitionPanel report={result.repetition} />

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl border border-emerald-100 bg-white p-4">
          <p className="text-xs font-semibold text-emerald-700">Strengths</p>
          <ul className="mt-2 space-y-1 text-sm text-slate-600">
            {result.strengths.map((s) => (
              <li key={s}>✓ {s}</li>
            ))}
          </ul>
        </div>
        <div className="rounded-2xl border border-amber-100 bg-white p-4">
          <p className="text-xs font-semibold text-amber-700">Improve</p>
          <ul className="mt-2 space-y-1 text-sm text-slate-600">
            {result.improvementAreas.map((s) => (
              <li key={s}>• {s}</li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
