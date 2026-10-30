"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  CheckCircle2,
  ClipboardList,
  Mic,
  Settings,
  Sparkles,
  Users,
  Volume2,
} from "lucide-react";
import { fetchPublishedTests } from "@/lib/sessionClient";
import { TEST_TYPE_LABELS, type TestSummary } from "@/types/interviewTest";

const STEPS = [
  {
    icon: Volume2,
    title: "AI asks the question",
    text: "Pick a voice — the interviewer reads each question aloud.",
  },
  {
    icon: Mic,
    title: "You answer out loud",
    text: "Your voice becomes text. Fix any misheard words before scoring.",
  },
  {
    icon: BarChart3,
    title: "Get scored instantly",
    text: "Graded on meaning, key points, grammar, fluency and confidence.",
  },
];

export default function HomePage() {
  const [tests, setTests] = useState<TestSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void fetchPublishedTests().then(({ tests: list }) => {
      setTests(list);
      setLoading(false);
    });
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50/40 to-blue-50">
      <header className="sticky top-0 z-20 border-b border-white/60 bg-white/70 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
          <Link href="/" className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-blue-600 text-white shadow-md shadow-indigo-200">
              <Sparkles className="h-5 w-5" />
            </span>
            <span className="font-bold text-slate-900">VAWE AI Assessment</span>
          </Link>
          <Link
            href="/admin/tests"
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
          >
            <Settings className="h-4 w-4" />
            Admin
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 pb-16 sm:px-6">
        <section className="pb-10 pt-14 text-center sm:pt-20">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-indigo-100 bg-white px-3 py-1 text-xs font-medium text-indigo-700 shadow-sm">
            <Sparkles className="h-3.5 w-3.5" />
            AI-powered interview practice
          </span>
          <h1 className="mx-auto mt-5 max-w-3xl text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">
            Practice interviews with an AI that{" "}
            <span className="bg-gradient-to-r from-indigo-600 to-blue-500 bg-clip-text text-transparent">
              listens and scores
            </span>
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-base text-slate-600 sm:text-lg">
            Take an interview test or join a group discussion with AI bots. Speak naturally and get
            instant feedback on what you said and how you said it.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <a
              href="#tests"
              className="inline-flex items-center gap-2 rounded-2xl bg-indigo-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-200 hover:bg-indigo-700"
            >
              Browse interview tests <ArrowRight className="h-4 w-4" />
            </a>
            <Link
              href="/prototype/gd"
              className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-6 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              <Users className="h-4 w-4" /> Join a group discussion
            </Link>
          </div>
        </section>

        <section className="grid gap-5 md:grid-cols-2">
          <Link
            href="/prototype/interview"
            className="group relative overflow-hidden rounded-3xl border border-indigo-100 bg-white p-7 shadow-sm transition hover:-translate-y-1 hover:border-indigo-300 hover:shadow-xl hover:shadow-indigo-100"
          >
            <div className="absolute -right-10 -top-10 h-36 w-36 rounded-full bg-indigo-100/60 blur-2xl transition group-hover:bg-indigo-200/70" />
            <div className="relative">
              <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-blue-600 text-white">
                <Mic className="h-6 w-6" />
              </div>
              <h2 className="text-xl font-bold text-slate-900">AI Interview</h2>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">
                One-on-one with an AI interviewer. Technical and HR questions from your tests.
              </p>
              <ul className="mt-4 space-y-1.5 text-sm text-slate-600">
                {["Voice-to-text answers", "Key-point coverage", "Grammar & fluency report"].map((f) => (
                  <li key={f} className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-indigo-500" />
                    {f}
                  </li>
                ))}
              </ul>
              <span className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-indigo-600 transition-all group-hover:gap-3">
                Start interview <ArrowRight className="h-4 w-4" />
              </span>
            </div>
          </Link>

          <Link
            href="/prototype/gd"
            className="group relative overflow-hidden rounded-3xl border border-violet-100 bg-white p-7 shadow-sm transition hover:-translate-y-1 hover:border-violet-300 hover:shadow-xl hover:shadow-violet-100"
          >
            <div className="absolute -right-10 -top-10 h-36 w-36 rounded-full bg-violet-100/60 blur-2xl transition group-hover:bg-violet-200/70" />
            <div className="relative">
              <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 text-white">
                <Users className="h-6 w-6" />
              </div>
              <h2 className="text-xl font-bold text-slate-900">Group Discussion</h2>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">
                You and 4 AI bots debate a topic. Speak your points and hold your ground.
              </p>
              <ul className="mt-4 space-y-1.5 text-sm text-slate-600">
                {["Live transcript", "For / against balance", "Leadership & clarity scores"].map((f) => (
                  <li key={f} className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-violet-500" />
                    {f}
                  </li>
                ))}
              </ul>
              <span className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-violet-600 transition-all group-hover:gap-3">
                Join GD room <ArrowRight className="h-4 w-4" />
              </span>
            </div>
          </Link>
        </section>

        <section id="tests" className="scroll-mt-20 pt-14">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-2xl font-bold text-slate-900">Interview tests</h2>
              <p className="mt-1 text-sm text-slate-600">
                Created by your trainers. Pick one and continue to the test.
              </p>
            </div>
            <Link
              href="/prototype/interview?test="
              className="text-sm font-semibold text-indigo-600 hover:text-indigo-700"
            >
              Or try quick practice →
            </Link>
          </div>

          <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {loading &&
              [0, 1, 2].map((i) => (
                <div key={i} className="h-44 animate-pulse rounded-3xl bg-white/70" />
              ))}

            {!loading && tests.length === 0 && (
              <div className="rounded-3xl border border-dashed border-slate-300 bg-white/60 p-8 text-center sm:col-span-2 lg:col-span-3">
                <ClipboardList className="mx-auto h-8 w-8 text-slate-400" />
                <p className="mt-3 font-semibold text-slate-800">No tests published yet</p>
                <p className="mt-1 text-sm text-slate-500">
                  Admins can build one from the question bank in a couple of minutes.
                </p>
                <Link
                  href="/admin/tests/new"
                  className="mt-4 inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
                >
                  Create a test
                </Link>
              </div>
            )}

            {tests.map((t) => (
              <Link
                key={t.id}
                href={`/prototype/interview?test=${t.id}`}
                className="group flex flex-col rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-indigo-300 hover:shadow-lg hover:shadow-indigo-100"
              >
                <div className="flex items-center justify-between">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                    <ClipboardList className="h-5 w-5" />
                  </span>
                  <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-medium text-slate-600">
                    {TEST_TYPE_LABELS[t.questionType]}
                  </span>
                </div>
                <h3 className="mt-4 font-semibold text-slate-900">{t.title}</h3>
                {t.description && (
                  <p className="mt-1 line-clamp-2 text-sm text-slate-500">{t.description}</p>
                )}
                <div className="mt-auto flex items-center justify-between pt-5">
                  <span className="text-xs text-slate-500">
                    {t.questionCount} questions · ~{Math.max(1, t.questionCount * 2)} min
                  </span>
                  <span className="inline-flex items-center gap-1 text-sm font-semibold text-indigo-600 transition-all group-hover:gap-2">
                    Start <ArrowRight className="h-4 w-4" />
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </section>

        <section className="pt-14">
          <h2 className="text-center text-2xl font-bold text-slate-900">How it works</h2>
          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            {STEPS.map((s, i) => (
              <div key={s.title} className="rounded-3xl border border-slate-200 bg-white/80 p-6 text-center">
                <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
                  <s.icon className="h-5 w-5" />
                </div>
                <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-indigo-500">
                  Step {i + 1}
                </p>
                <p className="mt-1 font-semibold text-slate-900">{s.title}</p>
                <p className="mt-1 text-sm text-slate-600">{s.text}</p>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
