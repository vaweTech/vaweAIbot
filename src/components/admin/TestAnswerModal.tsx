"use client";

import { useEffect, useRef, useState } from "react";
import { Modal } from "@/components/common/Modal";
import { AudioWaveform } from "@/components/interviews/AudioWaveform";
import { AnswerMarksPanel } from "@/components/interviews/AnswerMarksPanel";
import { KeyPointCoverage } from "@/components/interviews/KeyPointCoverage";
import { LanguageAnalysisPanel } from "@/components/interviews/LanguageAnalysisPanel";
import { ScoreCard } from "@/components/interviews/ScoreCard";
import type { AnswerEvaluation } from "@/lib/answerEvaluation";
import { scoreAnswer } from "@/lib/sessionClient";
import {
  cleanupTranscript,
  isSpeechSupported,
  requestMicPermission,
  startVoiceCapture,
  type SpeechLang,
} from "@/lib/speech";
import type { QuestionSummary } from "@/types/questionBank";
import { Mic, Square } from "lucide-react";

type VoiceSession = NonNullable<ReturnType<typeof startVoiceCapture>>;
type Phase = "ready" | "listening" | "review" | "scoring" | "result";

const TYPE_LABELS: Record<string, string> = {
  technical: "Technical",
  hr: "HR",
  gd: "Group Discussion",
};

export function TestAnswerModal({
  question,
  onClose,
}: {
  question: QuestionSummary;
  onClose: () => void;
}) {
  const [phase, setPhase] = useState<Phase>("ready");
  const [liveText, setLiveText] = useState("");
  const [transcript, setTranscript] = useState("");
  const [elapsed, setElapsed] = useState(0);
  const [error, setError] = useState("");
  const [lang, setLang] = useState<SpeechLang>("en-IN");
  const [result, setResult] = useState<AnswerEvaluation | null>(null);
  const sessionRef = useRef<VoiceSession | null>(null);
  const elapsedRef = useRef(0);

  useEffect(() => {
    return () => {
      void sessionRef.current?.stop();
    };
  }, []);

  useEffect(() => {
    if (phase !== "listening") return;
    const timer = setInterval(() => {
      setElapsed((value) => {
        elapsedRef.current = value + 1;
        return value + 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [phase]);

  const reset = () => {
    void sessionRef.current?.stop();
    sessionRef.current = null;
    setPhase("ready");
    setLiveText("");
    setTranscript("");
    setElapsed(0);
    elapsedRef.current = 0;
    setError("");
    setResult(null);
  };

  const startRecording = async () => {
    setError("");
    if (!isSpeechSupported()) {
      setError("Voice-to-text needs Chrome or Edge.");
      return;
    }
    const allowed = await requestMicPermission();
    if (!allowed) {
      setError("Microphone permission denied. Allow the mic, then try again.");
      return;
    }

    setPhase("listening");
    setElapsed(0);
    elapsedRef.current = 0;
    setLiveText("");
    setResult(null);

    const session = startVoiceCapture(
      (text) => setLiveText(text),
      (message) => setError(message),
      { lang }
    );
    if (!session) {
      setError("Could not start voice capture. Use Chrome or Edge and allow the microphone.");
      setPhase("ready");
      return;
    }
    sessionRef.current = session;
  };

  const stopRecording = async () => {
    let text = "";
    if (sessionRef.current) {
      text = (await sessionRef.current.stop()).trim();
      sessionRef.current = null;
    }
    if (!text) text = cleanupTranscript(liveText.trim());
    if (!text) {
      setError("No speech detected. Speak clearly and try again.");
      setPhase("ready");
      return;
    }
    setTranscript(cleanupTranscript(text));
    setLiveText(text);
    setPhase("review");
  };

  const score = async () => {
    const text = cleanupTranscript(transcript.trim());
    if (!text) {
      setError("Transcript is empty. Re-record or type your answer.");
      return;
    }
    setTranscript(text);
    setPhase("scoring");
    setError("");
    try {
      const graded = await scoreAnswer({
        questionId: question.id,
        transcript: text,
        durationSeconds: elapsedRef.current || 1,
        mode: question.type === "gd" ? "gd" : "interview",
      });
      setResult(graded);
      setPhase("result");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not score this answer");
      setPhase("review");
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      title="Test this question"
      size="xl"
      footer={
        <button
          type="button"
          onClick={onClose}
          className="rounded-xl border border-border px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
        >
          Close
        </button>
      }
    >
      <div className="space-y-4">
        <div className="rounded-2xl border border-indigo-100 bg-indigo-50/50 p-4">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-indigo-600">
            {TYPE_LABELS[question.type] ?? question.type} · {question.category} · {question.difficulty}
          </p>
          <p className="mt-1 text-base font-semibold text-slate-900">{question.question}</p>
          <p className="mt-1 text-xs text-slate-500">
            {question.keyPointCount} key points
            {question.mustHaveCount > 0 ? ` · ${question.mustHaveCount} essential` : ""}
            {question.status !== "approved" ? " · draft answers still score against the stored key" : ""}
          </p>
        </div>

        {phase !== "result" && (
          <label className="block text-xs text-slate-600">
            Speech language
            <select
              value={lang}
              onChange={(e) => setLang(e.target.value as SpeechLang)}
              disabled={phase === "listening" || phase === "scoring"}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-800"
            >
              <option value="en-IN">English (India)</option>
              <option value="en-US">English (US)</option>
              <option value="hi-IN">Hindi (India)</option>
            </select>
          </label>
        )}

        {(phase === "ready" || phase === "listening") && (
          <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-5 text-center">
            <div
              className={`mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full text-white ${
                phase === "listening" ? "bg-rose-500" : "bg-indigo-600"
              }`}
            >
              <Mic className="h-7 w-7" />
            </div>
            <p className="font-semibold text-slate-800">
              {phase === "listening" ? "Listening…" : "Speak your answer"}
            </p>
            {phase === "listening" && (
              <p className="mt-1 font-mono text-sm text-indigo-600">
                {Math.floor(elapsed / 60)}:{(elapsed % 60).toString().padStart(2, "0")}
              </p>
            )}
            <AudioWaveform active={phase === "listening"} className="mx-auto mt-3 max-w-sm" />
            {phase === "listening" && liveText && (
              <p className="mt-3 rounded-xl bg-white px-3 py-2 text-left text-xs text-slate-600">
                Hearing: {liveText}
              </p>
            )}
            <div className="mt-4">
              {phase === "ready" ? (
                <button
                  type="button"
                  onClick={() => void startRecording()}
                  className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700"
                >
                  <Mic className="h-4 w-4" /> Start microphone
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => void stopRecording()}
                  className="inline-flex items-center gap-2 rounded-xl bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-rose-700"
                >
                  <Square className="h-4 w-4" /> Stop & review
                </button>
              )}
            </div>
            <p className="mt-3 text-[11px] text-slate-400">
              You can also type an answer after recording, or skip the mic and paste text on the next step.
            </p>
            {phase === "ready" && (
              <button
                type="button"
                onClick={() => {
                  setTranscript("");
                  setPhase("review");
                }}
                className="mt-2 text-xs font-medium text-indigo-600 hover:underline"
              >
                Type an answer instead
              </button>
            )}
          </div>
        )}

        {(phase === "review" || phase === "scoring") && (
          <div className="space-y-3">
            <label className="block text-sm font-medium text-slate-700">
              Your answer (edit if speech-to-text misheard)
              <textarea
                value={transcript}
                onChange={(e) => setTranscript(e.target.value)}
                rows={6}
                disabled={phase === "scoring"}
                className="mt-1 w-full rounded-2xl border border-slate-200 p-3 text-sm leading-relaxed text-slate-800 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 disabled:bg-slate-50"
                placeholder="Speak or type the answer you want to test…"
              />
            </label>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={phase === "scoring"}
                onClick={() => void startRecording()}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 disabled:opacity-50"
              >
                Re-record
              </button>
              <button
                type="button"
                disabled={phase === "scoring" || !transcript.trim()}
                onClick={() => void score()}
                className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
              >
                {phase === "scoring" ? "Scoring…" : "Score this answer"}
              </button>
            </div>
            {phase === "scoring" && (
              <p className="text-xs text-slate-500">
                The AI examiner is grading your answer against the rubric and key points…
              </p>
            )}
          </div>
        )}

        {error && (
          <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
            {error}
          </p>
        )}

        {phase === "result" && result && (
          <div className="space-y-4">
            <p className="rounded-xl bg-emerald-50 px-3 py-2 text-center text-xs text-emerald-800">
              Scored from your answer · {result.wordCount} words · {result.fillerWords} fillers ·{" "}
              {result.speakingDuration}
            </p>
            <p className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-600">
              {result.aiSummary}
            </p>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              <ScoreCard label="Content" score={result.scores.technicalKnowledge} />
              <ScoreCard label="Relevance" score={result.scores.relevance} />
              <ScoreCard label="Communication" score={result.scores.communication} />
              <ScoreCard label="Grammar" score={result.scores.grammar} />
              <ScoreCard label="Pronouns" score={result.scores.pronouns} />
              <ScoreCard label="Fluency" score={result.scores.fluency} />
              <ScoreCard label="Vocabulary" score={result.scores.vocabulary} />
              <div className="col-span-2 flex items-center justify-center rounded-2xl bg-indigo-600 p-4 text-white sm:col-span-1">
                <div className="text-center">
                  <p className="text-xs opacity-80">Overall</p>
                  <p className="text-4xl font-bold">{result.scores.overall}</p>
                </div>
              </div>
            </div>
            <AnswerMarksPanel
              rubric={result.rubric}
              factualErrors={result.factualErrors}
              review={result.review}
              transcriptIssue={result.transcriptIssue}
              onRetry={reset}
            />
            {result.review?.models.length > 0 && (
              <p className="text-[11px] text-slate-400">
                Graded by {result.review.models.join(" + ")}
              </p>
            )}
            {result.semantic && (
              <KeyPointCoverage semantic={result.semantic} modelAnswer={result.modelAnswer} />
            )}
            <LanguageAnalysisPanel analysis={result.grammarAnalysis} />
            <button
              type="button"
              onClick={reset}
              className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
            >
              Test again
            </button>
          </div>
        )}
      </div>
    </Modal>
  );
}
