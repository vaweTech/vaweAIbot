"use client";

import { use, useEffect, useEffectEvent, useRef, useState } from "react";
import Link from "next/link";
import type { AnswerResult } from "@/components/interviews/AnswerFeedback";
import { InterviewReport, type SessionAnswer } from "@/components/interviews/InterviewReport";
import {
  INTERVIEWER_PERSONAS,
  InterviewRoom,
  PREP_SECONDS,
} from "@/components/interviews/InterviewRoom";
import { InterviewAgenda } from "@/components/interviews/InterviewAgenda";
import { LanguagePicker, voiceStyleLabel } from "@/components/interviews/LanguagePicker";
import { InterviewTips } from "@/components/interviews/InterviewTips";
import { RubricCard } from "@/components/interviews/RubricCard";
import { cn } from "@/lib/utils";
import {
  fetchPublishedTests,
  fetchTest,
  scoreAnswer,
} from "@/lib/sessionClient";
import { TEST_TYPE_LABELS, type InterviewTest, type TestSummary } from "@/types/interviewTest";
import { analyzeVoiceAnswer } from "@/lib/voiceAnalysis";
import {
  cleanupTranscript,
  isSpeechSupported,
  loadVoices,
  recognitionLangFor,
  requestMicPermission,
  speakAs,
  startVoiceCapture,
  type VoiceStyle,
} from "@/lib/speech";
import {
  PRACTICE_OPENER,
  PRACTICE_QUESTION_POOL,
  PROTOTYPE_INTERVIEW_QUESTIONS,
} from "@/data/prototype";
import {
  ArrowLeft,
  Bot,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Flag,
  ListChecks,
  Settings2,
  Volume2,
} from "lucide-react";
   
type Phase = "intro" | "question" | "listening" | "review" | "done";
type VoiceSession = NonNullable<ReturnType<typeof startVoiceCapture>>;

/** A bank question carries an id, so it can be graded against its answer key. */
type SessionItem = { id: string | null; text: string };

const SESSION_LENGTH = 5;
/** Below this many words an answer cannot be graded fairly, so the student is warned before submitting. */
const MIN_ANSWER_WORDS = 8;

/** Server grading for bank questions, offline analysis for practice questions or when the server fails. */
async function gradeAnswer(item: SessionItem, transcript: string, durationSeconds: number): Promise<AnswerResult> {
  if (item.id) {
    try {
      const graded = await scoreAnswer({ questionId: item.id, transcript, durationSeconds });
      return { ...graded, usedRealVoice: true };
    } catch {
      // Losing the answer would be worse than a rougher offline grade.
    }
  }
  return analyzeVoiceAnswer({ question: item.text, transcript, durationSeconds });
}
/** What the interviewer says between questions, so it sounds like a conversation. */
const TRANSITIONS = [
  "Thank you. Moving on.",
  "Okay, good. Next question.",
  "Alright, thank you. Let's continue.",
  "Thanks for that. Here is the next one.",
];
/** Rough time to hear, answer and review one question, for the estimate shown before starting. */
const MINUTES_PER_QUESTION = 2;

const FALLBACK_QUESTIONS: SessionItem[] = PROTOTYPE_INTERVIEW_QUESTIONS.map((text) => ({
  id: null,
  text,
}));

/** Quick practice: the opener plus random easy questions from the page's own pool. */
function pickPracticeQuestions(): SessionItem[] {
  const pool = [...PRACTICE_QUESTION_POOL];
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return [PRACTICE_OPENER, ...pool.slice(0, SESSION_LENGTH - 1)].map((text) => ({ id: null, text }));
}

export default function PrototypeInterviewPage({
  searchParams,
}: {
  searchParams: Promise<{ test?: string }>;
}) {
  const { test: testFromUrl } = use(searchParams);
  const [phase, setPhase] = useState<Phase>("intro");
  const [qIndex, setQIndex] = useState(0);
  const [liveText, setLiveText] = useState("");
  const [transcript, setTranscript] = useState("");
  const [elapsed, setElapsed] = useState(0);
  const [micOk, setMicOk] = useState(false);
  const [micError, setMicError] = useState("");
  const [voiceStyle, setVoiceStyle] = useState<VoiceStyle>("south-indian-male");
  const [showVoiceSettings, setShowVoiceSettings] = useState(false);
  const [interviewerSpeaking, setInterviewerSpeaking] = useState(false);
  const [prepCountdown, setPrepCountdown] = useState<number | null>(null);
  /** Only the latest utterance may clear the speaking indicator. */
  const speechTurnRef = useRef(0);
  /** Indexed like `questions`; grading finishes in the background while the interview continues. */
  const [answers, setAnswers] = useState<(SessionAnswer | undefined)[]>([]);
  const [questions, setQuestions] = useState<SessionItem[]>(FALLBACK_QUESTIONS);
  const [usingBank, setUsingBank] = useState(false);
  const [tests, setTests] = useState<TestSummary[]>([]);
  const [testsLoading, setTestsLoading] = useState(true);
  /** "" means quick practice with random bank questions. */
  const [selectedTestId, setSelectedTestId] = useState(testFromUrl ?? "");
  const [activeTest, setActiveTest] = useState<InterviewTest | null>(null);
  /** Which selection the current `questions` belong to; differs while a new one loads. */
  const [loadedTestId, setLoadedTestId] = useState<string | null>(null);
  const [testError, setTestError] = useState("");
  const questionsLoading = loadedTestId !== selectedTestId;
  const sessionRef = useRef<VoiceSession | null>(null);
  const elapsedRef = useRef(0);
  const micGrantedRef = useRef(false);

  const question = questions[qIndex]?.text ?? "";

  useEffect(() => {
    setMicOk(isSpeechSupported());
    loadVoices();
  }, []);

  useEffect(() => {
    void fetchPublishedTests().then(({ tests: list }) => {
      setTests(list);
      setTestsLoading(false);
    });
  }, []);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      if (selectedTestId) {
        try {
          const test = await fetchTest(selectedTestId);
          if (cancelled) return;
          setActiveTest(test);
          setQuestions(test.questions.map((q) => ({ id: q.id, text: q.question })));
          setUsingBank(true);
          setTestError("");
        } catch (error) {
          if (cancelled) return;
          setTestError(error instanceof Error ? error.message : "Could not load this test");
          setActiveTest(null);
          setQuestions(FALLBACK_QUESTIONS);
          setUsingBank(false);
        }
      } else {
        setActiveTest(null);
        setQuestions(pickPracticeQuestions());
        setUsingBank(false);
        setTestError("");
      }
      setLoadedTestId(selectedTestId);
    })();

    return () => {
      cancelled = true;
    };
  }, [selectedTestId]);

  const chooseTest = (id: string) => {
    setSelectedTestId(id);
    window.history.replaceState(null, "", id ? `?test=${encodeURIComponent(id)}` : window.location.pathname);
  };

  // An admin previewing a draft test opens it by link; it is not in the published list.
  const testOptions: TestSummary[] =
    activeTest && !tests.some((t) => t.id === activeTest.id) ? [activeTest, ...tests] : tests;

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
    micGrantedRef.current = true;
    setMicOk(true);
    return true;
  };

  const askQuestion = async (index: number = qIndex, options: { transition?: boolean } = {}) => {
    const nextQuestion = questions[index];
    if (!nextQuestion) return;

    // Re-opening the mic right before speaking can switch the audio device
    // (e.g. Bluetooth headsets) and swallow the question audio.
    if (!micGrantedRef.current) await enableMic();

    setQIndex(index);
    setPhase("question");
    setLiveText("");
    setTranscript("");
    setElapsed(0);
    setPrepCountdown(null);
    elapsedRef.current = 0;
    const lead = options.transition
      ? `${TRANSITIONS[index % TRANSITIONS.length]} `
      : index === 0
        ? `Hello, I am ${INTERVIEWER_PERSONAS[voiceStyle].name.split(" ")[0]}. Let's begin. `
        : "";
    await speakQuestion(lead + nextQuestion.text);
  };

  /** Speaks, then gives the student a short countdown before recording starts by itself. */
  const speakQuestion = async (text: string) => {
    const turn = ++speechTurnRef.current;
    setPrepCountdown(null);
    setInterviewerSpeaking(true);
    await speakAs("interviewer", text, { style: voiceStyle });
    if (speechTurnRef.current !== turn) return;
    setInterviewerSpeaking(false);
    setPrepCountdown(PREP_SECONDS);
  };

  const leaveInterview = () => {
    if (!window.confirm("Leave the interview? You will see a summary of the answers so far.")) return;
    speechTurnRef.current++;
    setInterviewerSpeaking(false);
    setPrepCountdown(null);
    window.speechSynthesis?.cancel();
    void sessionRef.current?.stop();
    sessionRef.current = null;
    setPhase("done");
  };

  const startAnswer = async () => {
    setMicError("");
    setPrepCountdown(null);
    const allowed = micGrantedRef.current || (await enableMic());
    if (!allowed) return;

    window.speechSynthesis?.cancel();
    speechTurnRef.current++;
    setInterviewerSpeaking(false);
    setPhase("listening");
    setElapsed(0);
    elapsedRef.current = 0;
    setLiveText("");

    const session = startVoiceCapture(
      (text) => setLiveText(text),
      (msg) => setMicError(msg),
      { lang: recognitionLangFor(voiceStyle) }
    );
    if (!session) {
      setMicError("Could not start voice capture. Use Chrome or Edge and allow the microphone.");
      setPhase("question");
      return;
    }
    sessionRef.current = session;
  };

  const onPrepFinished = useEffectEvent(() => {
    if (phase === "question") void startAnswer();
  });

  useEffect(() => {
    if (prepCountdown === null) return;
    const timer = setTimeout(() => {
      if (prepCountdown <= 1) {
        setPrepCountdown(null);
        onPrepFinished();
      } else {
        setPrepCountdown(prepCountdown - 1);
      }
    }, 1000);
    return () => clearTimeout(timer);
  }, [prepCountdown]);

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

  /**
   * Saves the answer and moves on straight away. Grading runs in the
   * background and the feedback is shown together in the final report, as in
   * a real interview where results come afterwards.
   */
  const submitAnswer = () => {
    const index = qIndex;
    const item = questions[index];
    const text = cleanupTranscript(transcript.trim());
    if (!text) {
      setMicError("Transcript is empty. Re-record your answer.");
      return;
    }

    const record = (answer: SessionAnswer) =>
      setAnswers((prev) => {
        const nextAnswers = [...prev];
        nextAnswers[index] = answer;
        return nextAnswers;
      });

    record({ question: item.text, transcript: text, status: "grading" });
    void gradeAnswer(item, text, elapsedRef.current || 1).then((result) =>
      record({ question: item.text, transcript: text, status: "done", result })
    );

    void next();
  };

  const next = async () => {
    if (qIndex >= questions.length - 1) {
      setPhase("done");
      speechTurnRef.current++;
      void speakAs(
        "interviewer",
        "Thank you for your time. That's the end of the interview. Your report is ready below.",
        { style: voiceStyle }
      );
      return;
    }
    await askQuestion(qIndex + 1, { transition: true });
  };

  const transcriptWords = transcript.trim().split(/\s+/).filter(Boolean).length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50/30 to-white">
      <header className="border-b border-slate-200/80 bg-white/80 backdrop-blur">
        <div
          className={cn(
            "mx-auto flex items-center justify-between px-4 py-4",
            phase === "done" ? "max-w-4xl" : "max-w-6xl"
          )}
        >
          <Link href="/" className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-800">
            <ArrowLeft className="h-4 w-4" /> Home
          </Link>
          <div className="text-center">
            <p className="text-sm font-bold text-slate-900">
              {activeTest?.title ?? "AI Interview"}
            </p>
            <p className="text-xs text-slate-500">
              {phase === "intro"
                ? "Choose a test to begin"
                : `Question ${Math.min(qIndex + 1, questions.length)} of ${questions.length}`}
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
              width: `${(answers.filter(Boolean).length / Math.max(1, questions.length)) * 100}%`,
            }}
          />
        </div>
      </header>

      <main
        className={cn(
          "mx-auto space-y-5 px-4 py-8",
          phase === "done" ? "max-w-4xl" : "max-w-6xl"
        )}
      >
        {phase === "intro" && (
          <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div className="space-y-5">
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-600 via-indigo-600 to-blue-600 p-6 text-white shadow-lg shadow-indigo-200 sm:p-8">
              <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/10" />
              <div className="absolute -bottom-16 right-20 h-32 w-32 rounded-full bg-white/5" />
              <div className="relative flex items-center gap-4">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white/15 ring-1 ring-white/30 backdrop-blur">
                  <Bot className="h-7 w-7" />
                </div>
                <div>
                  <p className="text-xs font-medium uppercase tracking-wider text-indigo-200">
                    AI mock interview
                  </p>
                  <h1 className="text-2xl font-bold sm:text-3xl">Meet your AI Interviewer</h1>
                </div>
              </div>
              <p className="relative mt-4 max-w-xl text-sm leading-relaxed text-indigo-100">
                Pick a test and answer each question out loud. An AI examiner marks your knowledge
                out of 10 and gives separate feedback on your English.
              </p>
            </div>

            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-600 text-xs font-bold text-white">
                  1
                </span>
                <h2 className="font-semibold text-slate-900">Choose a test</h2>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {testsLoading &&
                  [0, 1].map((i) => (
                    <div key={i} className="h-28 animate-pulse rounded-2xl bg-slate-100" />
                  ))}

                {testOptions.map((t) => {
                  const active = selectedTestId === t.id;
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => chooseTest(t.id)}
                      className={cn(
                        "relative rounded-2xl border p-4 text-left transition",
                        active
                          ? "border-indigo-400 bg-indigo-50/70 ring-2 ring-indigo-100"
                          : "border-slate-200 hover:border-indigo-200 hover:bg-slate-50"
                      )}
                    >
                      {active && (
                        <CheckCircle2 className="absolute right-3 top-3 h-5 w-5 text-indigo-600" />
                      )}
                      <p className="pr-7 font-semibold text-slate-900">{t.title}</p>
                      {t.description && (
                        <p className="mt-1 line-clamp-2 text-xs text-slate-500">{t.description}</p>
                      )}
                      <div className="mt-3 flex flex-wrap gap-1.5 text-[11px]">
                        <span className="rounded-full bg-white px-2 py-0.5 font-medium text-slate-600 ring-1 ring-slate-200">
                          {TEST_TYPE_LABELS[t.questionType]}
                        </span>
                        <span className="rounded-full bg-white px-2 py-0.5 font-medium text-slate-600 ring-1 ring-slate-200">
                          {t.questionCount} questions
                        </span>
                        {t.status !== "published" && (
                          <span className="rounded-full bg-amber-50 px-2 py-0.5 font-medium text-amber-700 ring-1 ring-amber-200">
                            Draft preview
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}

                <button
                  type="button"
                  onClick={() => chooseTest("")}
                  className={cn(
                    "relative rounded-2xl border border-dashed p-4 text-left transition",
                    selectedTestId === ""
                      ? "border-indigo-400 bg-indigo-50/70 ring-2 ring-indigo-100"
                      : "border-slate-300 hover:border-indigo-200 hover:bg-slate-50"
                  )}
                >
                  {selectedTestId === "" && (
                    <CheckCircle2 className="absolute right-3 top-3 h-5 w-5 text-indigo-600" />
                  )}
                  <p className="pr-7 font-semibold text-slate-900">Quick practice</p>
                  <p className="mt-1 text-xs text-slate-500">
                    {SESSION_LENGTH} easy warm-up questions, different each time.
                  </p>
                  <div className="mt-3 flex flex-wrap gap-1.5 text-[11px]">
                    <span className="rounded-full bg-emerald-50 px-2 py-0.5 font-medium text-emerald-700 ring-1 ring-emerald-200">
                      Easy
                    </span>
                    <span className="rounded-full bg-white px-2 py-0.5 font-medium text-slate-600 ring-1 ring-slate-200">
                      {SESSION_LENGTH} questions
                    </span>
                  </div>
                </button>
              </div>

              {!testsLoading && tests.length === 0 && (
                <p className="mt-3 text-xs text-slate-500">
                  No tests published yet. An admin can create one under Admin → Interview Tests.
                </p>
              )}
              {testError && (
                <p className="mt-3 rounded-xl bg-rose-50 px-3 py-2 text-xs text-rose-700">{testError}</p>
              )}
            </section>

            <InterviewTips />
          </div>

          <aside className="space-y-5 lg:sticky lg:top-6">
            <div className="rounded-3xl border border-indigo-100 bg-white p-5 shadow-sm">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-indigo-600">
                Your interview
              </p>
              <h2 className="mt-1 text-lg font-bold text-slate-900">
                {questionsLoading
                  ? "Loading questions…"
                  : activeTest
                    ? activeTest.title
                    : selectedTestId
                      ? "Sample questions"
                      : "Quick practice"}
              </h2>

              <dl className="mt-4 grid grid-cols-2 gap-2 text-xs">
                <div className="rounded-2xl bg-slate-50 p-3">
                  <dt className="flex items-center gap-1 text-slate-500">
                    <ListChecks className="h-3.5 w-3.5" /> Questions
                  </dt>
                  <dd className="mt-0.5 text-base font-semibold text-slate-900">
                    {questionsLoading ? "–" : questions.length}
                  </dd>
                </div>
                <div className="rounded-2xl bg-slate-50 p-3">
                  <dt className="flex items-center gap-1 text-slate-500">
                    <Clock3 className="h-3.5 w-3.5" /> About
                  </dt>
                  <dd className="mt-0.5 text-base font-semibold text-slate-900">
                    {questionsLoading ? "–" : `${questions.length * MINUTES_PER_QUESTION} min`}
                  </dd>
                </div>
                <div className="col-span-2 rounded-2xl bg-slate-50 p-3">
                  <dt className="text-slate-500">Type</dt>
                  <dd className="mt-0.5 font-semibold text-slate-900">
                    {activeTest ? TEST_TYPE_LABELS[activeTest.questionType] : "Easy warm-up · Technical + HR"}
                  </dd>
                </div>
              </dl>

              <div className="mt-3 rounded-2xl border border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowVoiceSettings((v) => !v)}
                  className="flex w-full items-center justify-between gap-2 p-3 text-left"
                >
                  <span className="flex min-w-0 items-center gap-2">
                    <Volume2 className="h-4 w-4 shrink-0 text-indigo-600" />
                    <span className="min-w-0">
                      <span className="block text-[11px] text-slate-500">Interviewer voice</span>
                      <span className="block truncate text-xs font-semibold text-slate-800">
                        {voiceStyleLabel(voiceStyle)}
                      </span>
                    </span>
                  </span>
                  <span className="inline-flex shrink-0 items-center gap-1 text-[11px] font-medium text-indigo-600">
                    <Settings2 className="h-3.5 w-3.5" />
                    {showVoiceSettings ? "Hide" : "Voice & mic"}
                  </span>
                </button>
                {showVoiceSettings && (
                  <div className="border-t border-slate-100 px-3 pb-3">
                    <LanguagePicker value={voiceStyle} onChange={setVoiceStyle} />
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={() => void askQuestion(0)}
                disabled={questionsLoading || questions.length === 0}
                className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-indigo-600 to-blue-600 px-6 py-3.5 text-sm font-semibold text-white shadow-lg shadow-indigo-200 transition hover:from-indigo-700 hover:to-blue-700 disabled:opacity-60"
              >
                Begin Interview <ChevronRight className="h-4 w-4" />
              </button>
              {micError && (
                <p className="mt-3 rounded-xl bg-rose-50 px-3 py-2 text-center text-xs text-rose-700">
                  {micError}
                </p>
              )}
              {!usingBank && !questionsLoading && (
                <p className="mt-3 text-center text-[11px] text-slate-400">
                  Practice answers get instant feedback on English and delivery. Pick a test for AI
                  marks out of 10.
                </p>
              )}
            </div>

            {activeTest && <RubricCard questionType={activeTest.questionType} />}
          </aside>
          </div>
        )}

        {phase !== "intro" && phase !== "done" && (
          <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_300px]">
          <div className="min-w-0 space-y-5">
            <InterviewRoom
              voiceStyle={voiceStyle}
              question={question}
              questionNumber={Math.min(qIndex + 1, questions.length)}
              totalQuestions={questions.length}
              phase={phase}
              interviewerSpeaking={interviewerSpeaking}
              liveText={liveText}
              elapsed={elapsed}
              micError={phase === "review" ? "" : micError}
              prepCountdown={prepCountdown}
              onCancelPrep={() => setPrepCountdown(null)}
              onStartAnswer={() => void startAnswer()}
              onStopAnswer={() => void stopAnswer()}
              onReplay={() => void speakQuestion(question)}
              onLeave={leaveInterview}
            />

            {phase === "review" && (
              <div className="rounded-3xl border border-amber-200 bg-amber-50/60 p-5 shadow-sm">
                <h3 className="text-sm font-semibold text-slate-900">Your answer</h3>
                <p className="mt-1 text-xs text-slate-500">
                  This is what the mic heard. If it is badly wrong, re-record your answer. Feedback for
                  every answer comes in the report at the end.
                </p>
                <p className="mt-3 max-h-48 overflow-y-auto whitespace-pre-wrap rounded-2xl border border-slate-200 bg-white p-3 text-sm leading-relaxed text-slate-800">
                  {transcript}
                </p>
                {transcriptWords > 0 && transcriptWords < MIN_ANSWER_WORDS && (
                  <p className="mt-2 rounded-xl bg-amber-100/70 px-3 py-2 text-xs text-amber-900">
                    This answer is very short ({transcriptWords} words) and will not get marks. Re-record
                    and speak for at least 30 seconds.
                  </p>
                )}
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
                    onClick={submitAnswer}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white"
                  >
                    {qIndex >= questions.length - 1 ? (
                      <>
                        <Flag className="h-4 w-4" /> Submit & finish interview
                      </>
                    ) : (
                      <>
                        Submit & next question <ChevronRight className="h-4 w-4" />
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>

          <aside className="lg:sticky lg:top-6">
            <InterviewAgenda
              questions={questions.map((q) => q.text)}
              currentIndex={qIndex}
              answered={questions.map((_, i) => Boolean(answers[i]))}
              interviewerName={INTERVIEWER_PERSONAS[voiceStyle].name.split(" ")[0]}
            />
          </aside>
          </div>
        )}

        {phase === "done" && (
          <InterviewReport
            title={activeTest?.title ?? "Quick practice"}
            questions={questions.map((q) => q.text)}
            answers={questions.map((_, i) => answers[i])}
            actions={
            <>
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="rounded-2xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white"
              >
                Try Again
              </button>
              <a
                href="/prototype/interview"
                className="rounded-2xl border border-indigo-200 px-5 py-2.5 text-sm font-semibold text-indigo-700"
              >
                Choose another test
              </a>
              <Link
                href="/prototype/gd"
                className="rounded-2xl border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-700"
              >
                Try Group Discussion
              </Link>
              <Link href="/" className="rounded-2xl px-5 py-2.5 text-sm font-medium text-slate-500">
                Home
              </Link>
            </>
            }
          />
        )}
      </main>
    </div>
  );
}
