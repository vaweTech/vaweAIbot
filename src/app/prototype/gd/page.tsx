"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { AudioWaveform } from "@/components/interviews/AudioWaveform";
import { ScoreCard } from "@/components/interviews/ScoreCard";
import { LanguageAnalysisPanel } from "@/components/interviews/LanguageAnalysisPanel";
import { KeyPointCoverage } from "@/components/interviews/KeyPointCoverage";
import { getInitials } from "@/lib/utils";
import type { SemanticResult } from "@/lib/semanticScoring";
import { fetchSessionQuestions, scoreAnswer } from "@/lib/sessionClient";
import { analyzeGDContribution } from "@/lib/voiceAnalysis";
import { getVoiceLabel, isSpeechSupported, loadVoices, requestMicPermission, speakAs, startVoiceCapture } from "@/lib/speech";
import { PROTOTYPE_AI_BOTS, PROTOTYPE_GD_TOPIC } from "@/data/prototype";
import { ArrowLeft, Bot, CheckCircle2, Mic, Square, Users, Volume2 } from "lucide-react";

type ChatLine = { id: string; speaker: string; text: string; isYou?: boolean };
type Phase = "lobby" | "bots" | "your-turn" | "listening" | "ended";
type VoiceSession = NonNullable<ReturnType<typeof startVoiceCapture>>;

const YOU = { id: "you", name: "You (Ravi)", color: "from-indigo-500 to-blue-600" };

/** A bank topic carries an id, so the contribution can be graded on meaning. */
type Topic = { id: string | null; text: string; botLines: string[] };

const FALLBACK_TOPIC: Topic = { id: null, text: PROTOTYPE_GD_TOPIC, botLines: [] };

/** Both grading paths normalise to this shape. */
type GDResult = Awaited<ReturnType<typeof analyzeGDContribution>> & {
  semantic?: SemanticResult;
  modelAnswer?: string;
};

export default function PrototypeGDPage() {
  const [phase, setPhase] = useState<Phase>("lobby");
  const [activeId, setActiveId] = useState<string | null>(null);
  const [chat, setChat] = useState<ChatLine[]>([]);
  const [liveText, setLiveText] = useState("");
  const [elapsed, setElapsed] = useState(0);
  const [micOk, setMicOk] = useState(false);
  const [micError, setMicError] = useState("");
  const [round, setRound] = useState(0);
  const [mySpeechSeconds, setMySpeechSeconds] = useState(0);
  const [myTranscripts, setMyTranscripts] = useState<string[]>([]);
  const [scores, setScores] = useState<GDResult | null>(null);
  const [topic, setTopic] = useState<Topic>(FALLBACK_TOPIC);
  const [voiceNames, setVoiceNames] = useState<Record<string, string>>({});
  const sessionRef = useRef<VoiceSession | null>(null);
  const turnStartRef = useRef(0);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const cancelledRef = useRef(false);
  const startedRef = useRef(false);

  useEffect(() => {
    setMicOk(isSpeechSupported());
    loadVoices().then(async () => {
      const labels: Record<string, string> = {};
      for (const bot of PROTOTYPE_AI_BOTS) {
        labels[bot.id] = await getVoiceLabel(bot.voiceId);
      }
      labels.moderator = await getVoiceLabel("moderator");
      setVoiceNames(labels);
    });
  }, []);

  useEffect(() => {
    let cancelled = false;
    void fetchSessionQuestions({ type: "gd", count: 1 }).then(({ questions }) => {
      const picked = questions[0];
      if (cancelled || !picked) return;
      setTopic({ id: picked.id, text: picked.question, botLines: picked.botLines });
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chat, liveText]);

  useEffect(() => {
    if (phase === "lobby" || phase === "ended") return;
    const t = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(t);
  }, [phase]);

  useEffect(() => {
    return () => {
      cancelledRef.current = true;
      void sessionRef.current?.stop();
      window.speechSynthesis?.cancel();
    };
  }, []);

  const runBotRound = useCallback(
    async (roundNum: number) => {
    setPhase("bots");
    // Two bots speak per round
    const first = PROTOTYPE_AI_BOTS[roundNum % PROTOTYPE_AI_BOTS.length];
    const second = PROTOTYPE_AI_BOTS[(roundNum + 1) % PROTOTYPE_AI_BOTS.length];
    // Bank topics bring their own lines so bots argue about the real topic.
    const pool = topic.botLines;
    const firstLine =
      pool.length > 0 ? pool[(roundNum * 2) % pool.length] : first.lines[roundNum % first.lines.length];
    const secondLine =
      pool.length > 0
        ? pool[(roundNum * 2 + 1) % pool.length]
        : second.lines[(roundNum + 1) % second.lines.length];

    for (const turn of [
      { bot: first, line: firstLine },
      { bot: second, line: secondLine },
    ]) {
      if (cancelledRef.current) return;
      setActiveId(turn.bot.id);
      await speakAs(turn.bot.voiceId, turn.line);
      if (cancelledRef.current) return;
      setChat((c) => [
        ...c,
        {
          id: `${turn.bot.id}-${Date.now()}-${Math.random()}`,
          speaker: turn.bot.name,
          text: turn.line,
        },
      ]);
      setActiveId(null);
      await new Promise((r) => setTimeout(r, 500));
    }

    if (!cancelledRef.current) {
      setActiveId(YOU.id);
      setPhase("your-turn");
    }
    },
    [topic.botLines]
  );

  const startGD = async () => {
    if (startedRef.current) return;
    startedRef.current = true;
    cancelledRef.current = false;
    setMicError("");
    setMyTranscripts([]);
    setMySpeechSeconds(0);
    setElapsed(0);
    setRound(0);
    setScores(null);
    setLiveText("");

    const intro = `Welcome to today's group discussion. Our topic is: ${topic.text} Please share your views clearly. Let us begin.`;
    setChat([
      {
        id: "mod",
        speaker: "Moderator",
        text: intro,
      },
    ]);
    setActiveId("moderator");
    setPhase("bots");

    void requestMicPermission().then((ok) => {
      setMicOk(ok && isSpeechSupported());
    });

    await speakAs("moderator", intro);
    if (cancelledRef.current) return;
    setActiveId(null);
    await runBotRound(0);
  };

  const startMyTurn = async () => {
    setMicError("");
    const allowed = await requestMicPermission();
    if (!allowed || !isSpeechSupported()) {
      setMicError("Allow microphone in Chrome/Edge to speak your turn.");
      return;
    }
    setMicOk(true);
    window.speechSynthesis?.cancel();
    setPhase("listening");
    setLiveText("");
    setActiveId(YOU.id);
    turnStartRef.current = Date.now();

    const session = startVoiceCapture(
      (t) => setLiveText(t),
      (msg) => setMicError(msg)
    );
    if (!session) {
      setMicError("Could not start voice capture.");
      setPhase("your-turn");
      return;
    }
    sessionRef.current = session;
  };

  const stopMyTurn = async () => {
    let text = "";
    if (sessionRef.current) {
      text = (await sessionRef.current.stop()).trim();
      sessionRef.current = null;
    }
    if (!text) text = liveText.trim();

    const spokeFor = Math.max(1, Math.round((Date.now() - turnStartRef.current) / 1000));
    setMySpeechSeconds((s) => s + spokeFor);

    if (!text) {
      setMicError("No speech detected. Try again and speak clearly.");
      setPhase("your-turn");
      return;
    }

    setMyTranscripts((prev) => [...prev, text]);
    setChat((c) => [
      ...c,
      { id: `you-${Date.now()}`, speaker: YOU.name, text, isYou: true },
    ]);
    setLiveText("");
    setActiveId(null);

    const nextRound = round + 1;
    setRound(nextRound);

    if (nextRound >= 3) {
      setPhase("bots");
      const closer = PROTOTYPE_AI_BOTS[2];
      const line = "To conclude, AI will reshape jobs. Adaptation and continuous learning are essential.";
      setActiveId(closer.id);
      await speakAs(closer.voiceId, line);
      setChat((c) => [...c, { id: `close-${Date.now()}`, speaker: closer.name, text: line }]);
      setActiveId(null);
      await endGD([...myTranscripts, text], mySpeechSeconds + spokeFor);
      return;
    }

    await runBotRound(nextRound);
  };

  const endGD = async (transcripts?: string[], speechSecs?: number) => {
    cancelledRef.current = true;
    void sessionRef.current?.stop();
    sessionRef.current = null;
    window.speechSynthesis?.cancel();
    setPhase("ended");
    setActiveId(null);
    const allText = (transcripts ?? myTranscripts).join(" ");
    const secs = speechSecs ?? mySpeechSeconds;
    const text = allText || liveText;

    const offline = await analyzeGDContribution(text, secs || 30);
    if (!topic.id || !text.trim()) {
      setScores(offline);
      return;
    }

    try {
      const graded = await scoreAnswer({
        questionId: topic.id,
        transcript: text,
        durationSeconds: secs || 30,
        mode: "gd",
      });
      setScores({
        ...offline,
        // Keep the offline participation metrics, replace the judgement of
        // content with the semantic grading against the stored answer key.
        scores: {
          ...offline.scores,
          communication: graded.scores.communication,
          grammar: graded.scores.grammar,
          pronouns: graded.scores.pronouns,
          fluency: graded.scores.fluency,
          relevance: graded.scores.relevance,
          topicUnderstanding: graded.gdScores?.topicUnderstanding ?? offline.scores.topicUnderstanding,
          teamInteraction: graded.gdScores?.teamInteraction ?? offline.scores.teamInteraction,
          overall: graded.scores.overall,
        },
        aiSummary: graded.aiSummary,
        strengths: graded.strengths,
        improvementAreas: graded.improvementAreas,
        grammarAnalysis: graded.grammarAnalysis,
        semantic: graded.semantic,
        modelAnswer: graded.modelAnswer,
      });
    } catch {
      // Network or embedding failure must not lose the student's session.
      setScores(offline);
    }
  };

  const participants = [
    { ...YOU, isYou: true },
    ...PROTOTYPE_AI_BOTS.map((b) => ({ id: b.id, name: b.name, color: b.color, isYou: false })),
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50/50 via-white to-indigo-50/40">
      <header className="border-b border-slate-200/80 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-4">
          <Link href="/" className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-800">
            <ArrowLeft className="h-4 w-4" /> Home
          </Link>
          <div className="text-center">
            <p className="text-sm font-bold text-slate-900">AI Group Discussion</p>
            <p className="max-w-md truncate text-xs text-slate-500">{topic.text}</p>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span className="rounded-full bg-violet-50 px-2.5 py-1 font-medium text-violet-700">
              {micOk ? "Mic ready" : "Simulated"}
            </span>
            {phase !== "lobby" && phase !== "ended" && (
              <span className="font-mono text-slate-600">
                {Math.floor(elapsed / 60)}:{(elapsed % 60).toString().padStart(2, "0")}
              </span>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6">
        {phase === "lobby" && (
          <div className="mx-auto max-w-lg rounded-3xl border border-violet-100 bg-white p-8 text-center shadow-sm">
            <Users className="mx-auto h-12 w-12 text-violet-600" />
            <h1 className="mt-3 text-2xl font-bold text-slate-900">Join GD Room</h1>
            <p className="mt-2 text-sm text-slate-600">
              You discuss with <strong>4 AI bots</strong>, each with a different Indian-style voice.
              Bots speak first, then it is your turn.
            </p>
            <div className="mt-5 space-y-2 text-left">
              {PROTOTYPE_AI_BOTS.map((b) => (
                <div
                  key={b.id}
                  className="flex items-center justify-between gap-2 rounded-xl border border-slate-100 bg-slate-50 px-3 py-2"
                >
                  <span className={`rounded-full bg-gradient-to-r ${b.color} px-2.5 py-0.5 text-xs font-medium text-white`}>
                    {b.name}
                  </span>
                  <span className="flex items-center gap-1 text-[11px] text-slate-500">
                    <Volume2 className="h-3 w-3" />
                    {voiceNames[b.id] || b.voiceLabel}
                  </span>
                </div>
              ))}
            </div>
            <button
              onClick={startGD}
              className="mt-6 rounded-2xl bg-violet-600 px-6 py-3 text-sm font-semibold text-white hover:bg-violet-700"
            >
              Start Discussion
            </button>
          </div>
        )}

        {phase !== "lobby" && (
          <div className="grid gap-5 lg:grid-cols-5">
            <div className="space-y-3 lg:col-span-2">
              <h2 className="text-sm font-semibold text-slate-800">Participants (You + 4 AI)</h2>
              {participants.map((p) => {
                const speaking = activeId === p.id;
                return (
                  <div
                    key={p.id}
                    className={`flex items-center gap-3 rounded-2xl border p-3 transition ${
                      speaking ? "border-violet-300 bg-violet-50 shadow-sm" : "border-slate-200 bg-white"
                    }`}
                  >
                    <div
                      className={`flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br text-sm font-bold text-white ${p.color}`}
                    >
                      {p.isYou ? getInitials("Ravi Kumar") : <Bot className="h-5 w-5" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-slate-900">{p.name}</p>
                      <p className="text-xs text-slate-500">
                        {speaking
                          ? p.isYou && phase === "listening"
                            ? "Recording..."
                            : "Speaking"
                          : "Listening"}
                      </p>
                      {!p.isYou && (
                        <p className="mt-0.5 truncate text-[10px] text-violet-600">
                          {voiceNames[p.id] ||
                            PROTOTYPE_AI_BOTS.find((b) => b.id === p.id)?.voiceLabel}
                        </p>
                      )}
                    </div>
                    {speaking && <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-rose-500" />}
                  </div>
                );
              })}

              {(phase === "your-turn" || phase === "listening") && (
                <div className="rounded-2xl border border-indigo-200 bg-indigo-50 p-4 text-center">
                  <p className="text-sm font-semibold text-indigo-800">Your turn to speak</p>
                  <AudioWaveform active={phase === "listening"} className="mt-3" bars={16} />
                  {phase === "your-turn" ? (
                    <button
                      type="button"
                      onClick={() => void startMyTurn()}
                      className="mt-3 inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white"
                    >
                      <Mic className="h-4 w-4" /> Start Speaking
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => void stopMyTurn()}
                      className="mt-3 inline-flex items-center gap-2 rounded-xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white"
                    >
                      <Square className="h-4 w-4" /> Stop & Capture
                    </button>
                  )}
                  {micError && (
                    <p className="mt-2 text-xs text-rose-600">{micError}</p>
                  )}
                  {liveText && (
                    <p className="mt-3 rounded-xl bg-white p-2 text-left text-xs text-slate-600">
                      {liveText}
                    </p>
                  )}
                </div>
              )}

              {phase === "bots" && (
                <p className="rounded-xl bg-slate-50 px-3 py-2 text-center text-xs text-slate-500">
                  AI bots are speaking...
                </p>
              )}

              {phase !== "ended" && (
                <button
                  type="button"
                  onClick={() => void endGD()}
                  className="w-full rounded-xl border border-slate-200 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
                >
                  End GD & See Score
                </button>
              )}
            </div>

            <div className="lg:col-span-3">
              <div className="flex h-[520px] flex-col rounded-3xl border border-slate-200 bg-white shadow-sm">
                <div className="border-b border-slate-100 px-4 py-3 text-sm font-semibold text-slate-800">
                  Live transcript
                </div>
                <div className="flex-1 space-y-3 overflow-y-auto p-4 scrollbar-thin">
                  {chat.map((line) => (
                    <div
                      key={line.id}
                      className={`rounded-2xl px-3 py-2 text-sm ${
                        line.isYou
                          ? "ml-6 bg-indigo-50 text-indigo-900"
                          : line.speaker === "Moderator"
                          ? "bg-amber-50 text-amber-900"
                          : "mr-6 bg-slate-50 text-slate-800"
                      }`}
                    >
                      <p className="text-[11px] font-semibold opacity-70">{line.speaker}</p>
                      <p className="mt-0.5 leading-relaxed">{line.text}</p>
                    </div>
                  ))}
                  <div ref={chatEndRef} />
                </div>
              </div>

              {phase === "ended" && scores && (
                <div className="mt-5 space-y-4 rounded-3xl border border-emerald-100 bg-white p-5 shadow-sm">
                  <div className="flex items-center gap-2 text-emerald-700">
                    <CheckCircle2 className="h-5 w-5" />
                    <h3 className="font-semibold">Your GD Assessment</h3>
                  </div>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                    <ScoreCard label="Communication" score={scores.scores.communication} />
                    <ScoreCard label="Grammar" score={scores.scores.grammar} />
                    <ScoreCard label="Pronouns" score={scores.scores.pronouns} />
                    <ScoreCard label="Fluency" score={scores.scores.fluency} />
                    <ScoreCard label="Relevance" score={scores.scores.relevance} />
                    <ScoreCard label="Topic Understanding" score={scores.scores.topicUnderstanding} />
                    <ScoreCard label="Team Interaction" score={scores.scores.teamInteraction} />
                  </div>
                  <div className="rounded-2xl bg-violet-600 py-4 text-center text-white">
                    <p className="text-xs opacity-80">Overall</p>
                    <p className="text-3xl font-bold">{scores.scores.overall}</p>
                  </div>
                  <p className="text-sm text-slate-600">{scores.aiSummary}</p>
                  {scores.semantic && (
                    <KeyPointCoverage semantic={scores.semantic} modelAnswer={scores.modelAnswer} />
                  )}
                  <LanguageAnalysisPanel analysis={scores.grammarAnalysis} />
                  <div className="flex flex-wrap gap-3">
                    <button
                      onClick={() => window.location.reload()}
                      className="rounded-xl bg-violet-600 px-4 py-2 text-sm font-semibold text-white"
                    >
                      Try Again
                    </button>
                    <Link
                      href="/prototype/interview"
                      className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700"
                    >
                      Try Interview
                    </Link>
                    <Link href="/" className="rounded-xl px-4 py-2 text-sm text-slate-500">
                      Home
                    </Link>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
