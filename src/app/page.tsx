"use client";

import Link from "next/link";
import { Mic, Users, Sparkles, ArrowRight } from "lucide-react";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50/40 to-blue-50">
      <div className="mx-auto flex min-h-screen max-w-5xl flex-col justify-center px-4 py-12 sm:px-6">
        <div className="mb-10 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-blue-600 text-white shadow-lg shadow-indigo-200">
            <Sparkles className="h-7 w-7" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
            VAWE AI Assessment
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-base text-slate-600">
            Prototype: talk to an AI interviewer, or join a group discussion with AI bots.
          </p>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <Link
            href="/prototype/interview"
            className="group rounded-3xl border border-indigo-100 bg-white p-8 shadow-sm transition hover:-translate-y-1 hover:border-indigo-300 hover:shadow-xl hover:shadow-indigo-100"
          >
            <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-blue-600 text-white">
              <Mic className="h-7 w-7" />
            </div>
            <h2 className="text-xl font-bold text-slate-900">AI Interview</h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">
              AI asks questions. You speak into the mic. Your voice becomes text. You get a score.
            </p>
            <span className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-indigo-600 group-hover:gap-3">
              Start Interview <ArrowRight className="h-4 w-4" />
            </span>
          </Link>

          <Link
            href="/prototype/gd"
            className="group rounded-3xl border border-violet-100 bg-white p-8 shadow-sm transition hover:-translate-y-1 hover:border-violet-300 hover:shadow-xl hover:shadow-violet-100"
          >
            <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 text-white">
              <Users className="h-7 w-7" />
            </div>
            <h2 className="text-xl font-bold text-slate-900">Group Discussion</h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">
              You + 4 AI bots discuss a topic. Speak your points, see live transcript, get scores.
            </p>
            <span className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-violet-600 group-hover:gap-3">
              Join GD Room <ArrowRight className="h-4 w-4" />
            </span>
          </Link>
        </div>
      </div>
    </div>
  );
}
