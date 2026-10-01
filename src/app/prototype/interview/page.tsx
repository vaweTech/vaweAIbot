"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { AudioWaveform } from "@/components/interviews/AudioWaveform";
import { ScoreCard } from "@/components/interviews/ScoreCard";
import { LanguageAnalysisPanel } from "@/components/interviews/LanguageAnalysisPanel";
import { KeyPointCoverage } from "@/components/interviews/KeyPointCoverage";
import { highlightFillers } from "@/lib/utils";
import type { EvaluationStep } from "@/lib/mockAI";
import type { SemanticResult } from "@/lib/semanticScoring";
import { fetchSessionQuestions, scoreAnswer } from "@/lib/sessionClient";
import { analyzeVoiceAnswer, runVoiceEvalSteps } from "@/lib/voiceAnalysis";
import {
  cleanupTranscript,
  isSpeechSupported,
  loadVoices,
  requestMicPermission,
  speakAs,
  startVoiceCapture,
  type SpeechLang,
} from "@/lib/speech";
import { PROTOTYPE_INTERVIEW_QUESTIONS } from "@/data/prototype";
import {
  ArrowLeft,
  Bot,
  CheckCircle2,
  ChevronRight,
  Flag,
  Mic,
  Square,
  Volume2,
} from "lucide-react";

type Phase = "intro" | "question" | "listening" | "review" | "processing" | "scored" | "done";
type VoiceSession = NonNullable<ReturnType<typeof startVoiceCapture>>;

/** A bank question carries an id, so it can be graded against its answer key. */
type SessionItem = { id: string | null; text: string };

/** Both grading paths produce this; only the bank path fills in `semantic`. */
type Result = Awaited<ReturnType<typeof analyzeVoiceAnswer>> & {
  semantic?: SemanticResult;
  modelAnswer?: string;
};

const FALLBACK_QUESTIONS: SessionItem[] = PROTOTYPE_INTERVIEW_QUESTIONS.map((text) => ({
  id: null,
  text,
}));

export default function PrototypeInterviewPage() {
  const [phase, setPhase] = useState<Phase>("intro");
  const [qIndex, setQIndex] = useState(0);
  const [liveText, setLiveText] = useState("");
  const [transcript, setTranscript] = useState("");
  const [elapsed, setElapsed] = useState(0);
  const [micOk, setMicOk] = useState(false);
  const [micError, setMicError] = useState("");
  const [speechLang, setSpeechLang] = useState<SpeechLang>("en-IN");
  const [evalSteps, setEvalSteps] = useState<EvaluationStep[]>([]);
  const [scores, setScores] = useState<Result | null>(null);
  const [answers, setAnswers] = useState<{ q: string; a: string; score: number }[]>([]);
  const [questions, setQuestions] = useState<SessionItem[]>(FALLBACK_QUESTIONS);
  const [usingBank, setUsingBank] = useState(false);
  const sessionRef = useRef<VoiceSession | null>(null);
  const elapsedRef = useRef(0);

  const question = questions[qIndex]?.text ?? "";

  useEffect(() => {
    setMicOk(isSpeechSupported());
    loadVoices();
  }, []);

  useEffect(() => {
    let cancelled = false;
    void fetchSessionQuestions({ type: "technical", count: 5 }).then(({ questions: fetched }) => {
      if (cancelled || fetched.length === 0) return;
      setQuestions(fetched.map((q) => ({ id: q.id, text: q.question })));
      setUsingBank(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (phase !== "listening") return;
    const t = setInterval(() => {
      setElapsed((e) => {
        elapsedRef.current = e + 1;
        return e + 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [phase]);

  useEffect(() => {
    return () => {
      void sessionRef.current?.stop();
      if (typeof window !== "undefined") window.speechSynthesis?.cancel();
    };
  }, []);

  const enableMic = async () => {
    setMicError("");
    const ok = await requestMicPermission();
    if (!ok) {
      setMicError("Microphone permission denied. Allow mic in Chrome/Edge, then try again.");
      setMicOk(false);
      return false;
    }
    if (!isSpeechSupported()) {
      setMicError("Voice-to-text needs Chrome or Edge.");
      setMicOk(false);
      return false;
    }
    setMicOk(true);
    return true;
  };

  const askQuestion = async (index: number = qIndex) => {
    const nextQuestion = questions[index];
    if (!nextQuestion) return;

    await enableMic();

    setQIndex(index);
    setPhase("question");
    setLiveText("");
    setTranscript("");
    setScores(null);
    setEvalSteps([]);
    setElapsed(0);
    elapsedRef.current = 0;
    await speakAs("interviewer", nextQuestion.text);
  };

  const startAnswer = async () => {
    setMicError("");
    const allowed = await enableMic();
    if (!allowed) return;

    window.speechSynthesis?.cancel();
    setPhase("listening");
    setElapsed(0);
    elapsedRef.current = 0;
    setLiveText("");

    const session = startVoiceCapture(
      (text) => setLiveText(text),
      (msg) => setMicError(msg),
      { lang: speechLang }
    );
    if (!session) {
      setMicError("Could not start voice capture. Use Chrome or Edge and allow the microphone.");
      setPhase("question");
      return;
    }
    sessionRef.current = session;
  };

  const stopAnswer = async () => {
    let text = "";
    if (sessionRef.current) {
      text = (await sessionRef.current.stop()).trim();
      sessionRef.current = null;
    }
    if (!text) text = cleanupTranscript(liveText.trim());

    if (!text) {
      setMicError("No speech detected. Speak clearly and try again.");
      setPhase("question");
      return;
    }

    setTranscript(text);
    setLiveText(text);
    setMicError("");
    // Let user fix wrong words before scoring
    setPhase("review");
  };

  const confirmAndScore = async () => {
    const currentQuestion = questions[qIndex];
    const text = cleanupTranscript(transcript.trim());
    if (!text) {
      setMicError("Transcript is empty. Re-record your answer.");
      return;
    }

    setTranscript(text);
    setPhase("processing");
    const duration = elapsedRef.current;

    await runVoiceEvalSteps(setEvalSteps);

    let result: Result;
    if (currentQuestion.id) {
      try {
        const graded = await scoreAnswer({
          questionId: currentQuestion.id,
          transcript: text,
          durationSeconds: duration || 1,
        });
        result = { ...graded, usedRealVoice: true };
      } catch (error) {
        // Grading needs the network and the embedding API; if either is down,
        // fall back to offline analysis rather than losing the answer.
        setMicError(
          `Scored offline — ${error instanceof Error ? error.message : "server scoring unavailable"}`
        );
        result = await analyzeVoiceAnswer({
          question: currentQuestion.text,
          transcript: text,
          durationSeconds: duration || 1,
        });
      }
    } else {
      result = await analyzeVoiceAnswer({
        question: currentQuestion.text,
        transcript: text,
        durationSeconds: duration || 1,
      });
    }

    setScores(result);
    setAnswers((prev) => [
      ...prev,
      { q: currentQuestion.text, a: text, score: result.scores.overall },
    ]);
    setPhase("scored");
  };

  const next = async () => {
    if (qIndex >= questions.length - 1) {
      setPhase("done");
      return;
    }
    await askQuestion(qIndex + 1);
  };

  const parts = highlightFillers(transcript || liveText);
  const avgScore =
    answers.length > 0
      ? Math.round(answers.reduce((s, a) => s + a.score, 0) / answers.length)
      : scores?.scores.overall;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50/30 to-white">
      <header className="border-b border-slate-200/80 bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-4">
          <Link href="/" className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-800">
            <ArrowLeft className="h-4 w-4" /> Home
          </Link>
          <div className="text-center">
            <p className="text-sm font-bold text-slate-900">AI Interview Prototype</p>
            <p className="text-xs text-slate-500">
              Question {Math.min(qIndex + 1, questions.length)} of {questions.length}
            </p>
          </div>
          <span className="rounded-full bg-indigo-50 px-2.5 py-1 text-[11px] font-medium text-indigo-700">
            {micOk ? "Mic enabled" : "Allow mic"}
          </span>
        </div>
        <div className="h-1 bg-slate-100">
          <div
            className="h-full bg-gradient-to-r from-indigo-500 to-blue-500 transition-all"
            style={{
              width: `${((qIndex + (phase === "done" || phase === "scored" ? 1 : 0)) / questions.length) * 100}%`,
            }}
          />
        </div>
      </header>

      <main className="mx-auto max-w-4xl space-y-5 px-4 py-8">
        {phase === "intro" && (
          <div className="rounded-3xl border border-indigo-100 bg-white p-8 text-center shadow-sm">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-blue-600 text-white">
              <Bot className="h-8 w-8" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900">Meet your AI Interviewer</h1>
            <p className="mx-auto mt-2 max-w-md text-sm text-slate-600">
              Allow your microphone. Speak clearly. After speaking, you can edit any wrong words
              before scoring.
            </p>
            <p className="mx-auto mt-3 max-w-md rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-500">
              {usingBank
                ? `${questions.length} questions loaded from your question bank. Answers are graded on meaning against the stored answer key.`
                : "Using the built-in sample questions. Add approved questions in the admin console to grade against your own answer keys."}
            </p>
            <label className="mx-auto mt-4 flex max-w-xs flex-col gap-1 text-left text-xs text-slate-600">
              Speech language (helps accuracy)
              <select
                value={speechLang}
                onChange={(e) => setSpeechLang(e.target.value as SpeechLang)}
                className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-800"
              >
                <option value="en-IN">English (India) — best for most</option>
                <option value="en-US">English (US) — if en-IN mishears</option>
                <option value="hi-IN">Hindi (India)</option>
              </select>
            </label>
            {micError && (
              <p className="mx-auto mt-3 max-w-md rounded-xl bg-rose-50 px-3 py-2 text-xs text-rose-700">
                {micError}
              </p>
            )}
            <button
              type="button"
              onClick={() => void askQuestion(0)}
              className="mt-6 rounded-2xl bg-indigo-600 px-6 py-3 text-sm font-semibold text-white hover:bg-indigo-700"
            >
              Begin Interview
            </button>
            <p className="mt-3 text-[11px] text-slate-400">
              Tip: quiet room, mic close, speak a bit slower
            </p>
          </div>
        )}

        {phase !== "intro" && phase !== "done" && (
          <>
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-blue-600 text-white">
                  <Bot className="h-6 w-6" />
                </div>
                <div>
                  <p className="font-semibold text-slate-900">AI Interviewer</p>
                  <p className="text-xs text-slate-500">Speaking & evaluating</p>
                </div>
                {phase === "question" && (
                  <button
                    onClick={() => speakAs("interviewer", question)}
                    className="ml-auto inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600"
                  >
                    <Volume2 className="h-3.5 w-3.5" /> Replay
                  </button>
                )}
              </div>
              <p className="text-lg font-medium leading-relaxed text-slate-800">{question}</p>
            </div>

            <div className="rounded-3xl border border-indigo-100 bg-gradient-to-br from-indigo-50/80 to-white p-6 text-center">
              {(phase === "listening" || phase === "question") && (
                <>
                  <div
                    className={`mx-auto mb-3 flex h-20 w-20 items-center justify-center rounded-full text-white shadow-lg ${
                      phase === "listening" ? "bg-rose-500" : "bg-indigo-600"
                    }`}
                  >
                    <Mic className="h-8 w-8" />
                  </div>
                  <p className="font-semibold text-slate-800">
                    {phase === "listening" ? "Listening to you..." : "Ready when you are"}
                  </p>
                  {phase === "listening" && (
                    <p className="mt-1 font-mono text-indigo-600">
                      {Math.floor(elapsed / 60)}:{(elapsed % 60).toString().padStart(2, "0")}
                    </p>
                  )}
                  <AudioWaveform active={phase === "listening"} className="mx-auto mt-4 max-w-sm" />
                  {micError && (
                    <p className="mt-3 rounded-xl bg-rose-50 px-3 py-2 text-xs text-rose-700">{micError}</p>
                  )}
                  {phase === "listening" && liveText && (
                    <p className="mt-3 rounded-xl bg-white/80 px-3 py-2 text-left text-xs text-slate-600">
                      Hearing: {liveText}
                    </p>
                  )}
                  <div className="mt-5">
                    {phase === "question" ? (
                      <button
                        type="button"
                        onClick={() => void startAnswer()}
                        className="inline-flex items-center gap-2 rounded-2xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white"
                      >
                        <Mic className="h-4 w-4" /> Start Speaking
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => void stopAnswer()}
                        className="inline-flex items-center gap-2 rounded-2xl bg-rose-600 px-5 py-2.5 text-sm font-semibold text-white"
                      >
                        <Square className="h-4 w-4" /> Stop & Analyse Score
                      </button>
                    )}
                  </div>
                </>
              )}

              {phase === "processing" && (
                <div>
                  <div className="mx-auto mb-3 h-10 w-10 animate-spin rounded-full border-4 border-indigo-200 border-t-indigo-600" />
                  <p className="font-semibold text-slate-800">Analysing your answer...</p>
                  <ul className="mx-auto mt-4 max-w-xs space-y-2 text-left text-sm">
                    {evalSteps.map((s) => (
                      <li key={s.label} className="flex items-center gap-2 text-slate-600">
                        {s.done ? (
                          <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                        ) : (
                          <span className="h-4 w-4 rounded-full border border-slate-300" />
                        )}
                        {s.label}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {phase === "review" && (
              <div className="rounded-3xl border border-amber-200 bg-amber-50/60 p-5 shadow-sm">
                <h3 className="text-sm font-semibold text-slate-900">
                  Check your words (edit if wrong)
                </h3>
                <p className="mt-1 text-xs text-slate-500">
                  Speech-to-text sometimes mishears. Fix the text, then score.
                </p>
                <textarea
                  value={transcript}
                  onChange={(e) => setTranscript(e.target.value)}
                  rows={5}
                  className="mt-3 w-full rounded-2xl border border-slate-200 bg-white p-3 text-sm leading-relaxed text-slate-800 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                />
                {micError && (
                  <p className="mt-2 text-xs text-rose-600">{micError}</p>
                )}
                <div className="mt-4 flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() => void startAnswer()}
                    className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700"
                  >
                    Re-record
                  </button>
                  <button
                    type="button"
                    onClick={() => void confirmAndScore()}
                    className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white"
                  >
                    Looks good — Score this answer
                  </button>
                </div>
              </div>
            )}

            {(liveText || transcript) && phase !== "review" && (
              <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                <h3 className="text-sm font-semibold text-slate-900">
                  {phase === "listening" ? "Live transcript" : "Your answer (voice → text)"}
                </h3>
                <p className="mt-3 rounded-2xl bg-slate-50 p-4 text-sm leading-relaxed text-slate-700">
                  {parts.map((p, i) =>
                    p.isFiller ? (
                      <mark key={i} className="rounded bg-amber-200 px-0.5">
                        {p.word}
                      </mark>
                    ) : (
                      <span key={i}>{p.word}</span>
                    )
                  )}
                </p>
              </div>
            )}

            {phase === "scored" && scores && (
              <div className="space-y-4">
                <p className="rounded-xl bg-emerald-50 px-3 py-2 text-center text-xs text-emerald-800">
                  Scored from your voice transcript · {scores.wordCount} words · {scores.fillerWords} fillers ·{" "}
                  {scores.speakingDuration}
                </p>
                {scores.aiSummary && (
                  <p className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-600">
                    {scores.aiSummary}
                  </p>
                )}
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                  <ScoreCard label="Technical" score={scores.scores.technicalKnowledge} />
                  <ScoreCard label="Relevance" score={scores.scores.relevance} />
                  <ScoreCard label="Communication" score={scores.scores.communication} />
                  <ScoreCard label="Grammar" score={scores.scores.grammar} />
                  <ScoreCard label="Pronouns" score={scores.scores.pronouns} />
                  <ScoreCard label="Fluency" score={scores.scores.fluency} />
                  <ScoreCard label="Vocabulary" score={scores.scores.vocabulary} />
                  <div className="col-span-2 flex items-center justify-center rounded-2xl bg-indigo-600 p-4 text-white sm:col-span-1 lg:col-span-1">
                    <div className="text-center">
                      <p className="text-xs opacity-80">Overall Score</p>
                      <p className="text-4xl font-bold">{scores.scores.overall}</p>
                    </div>
                  </div>
                </div>
                {scores.semantic && (
                  <KeyPointCoverage semantic={scores.semantic} modelAnswer={scores.modelAnswer} />
                )}
                <LanguageAnalysisPanel analysis={scores.grammarAnalysis} />
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl border border-emerald-100 bg-white p-4">
                    <p className="text-xs font-semibold text-emerald-700">Strengths</p>
                    <ul className="mt-2 space-y-1 text-sm text-slate-600">
                      {scores.strengths.map((s) => (
                        <li key={s}>✓ {s}</li>
                      ))}
                    </ul>
                  </div>
                  <div className="rounded-2xl border border-amber-100 bg-white p-4">
                    <p className="text-xs font-semibold text-amber-700">Improve</p>
                    <ul className="mt-2 space-y-1 text-sm text-slate-600">
                      {scores.improvementAreas.map((s) => (
                        <li key={s}>• {s}</li>
                      ))}
                    </ul>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => void next()}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-indigo-600 py-3 text-sm font-semibold text-white sm:w-auto sm:px-6"
                >
                  {qIndex >= questions.length - 1 ? (
                    <>
                      <Flag className="h-4 w-4" /> Finish Interview
                    </>
                  ) : (
                    <>
                      Next Question <ChevronRight className="h-4 w-4" />
                    </>
                  )}
                </button>
              </div>
            )}
          </>
        )}

        {phase === "done" && (
          <div className="rounded-3xl border border-emerald-100 bg-white p-8 text-center shadow-sm">
            <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-500" />
            <h2 className="mt-3 text-2xl font-bold text-slate-900">Interview Complete</h2>
            <p className="mt-2 text-sm text-slate-600">
              You answered {answers.length} questions. Average score:{" "}
              <strong>{avgScore ?? "—"}</strong>
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <Link
                href="/prototype/interview"
                onClick={() => window.location.reload()}
                className="rounded-2xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white"
              >
                Try Again
              </Link>
              <Link
                href="/prototype/gd"
                className="rounded-2xl border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-700"
              >
                Try Group Discussion
              </Link>
              <Link href="/" className="rounded-2xl px-5 py-2.5 text-sm font-medium text-slate-500">
                Home
              </Link>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
