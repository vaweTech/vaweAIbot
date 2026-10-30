import { Clock3, Lightbulb, Mic, PencilLine, ShieldCheck } from "lucide-react";

const TIPS = [
  {
    icon: Mic,
    title: "Quiet room, mic close",
    text: "Background noise makes speech-to-text mishear you. Speak at a steady, slightly slower pace.",
  },
  {
    icon: Clock3,
    title: "Speak for 30–60 seconds",
    text: "Very short answers cannot be graded. Aim for 3–5 sentences per question.",
  },
  {
    icon: Lightbulb,
    title: "Explain why, give an example",
    text: "Definitions alone earn part marks. Add how it works, a use case or a real situation you faced.",
  },
  {
    icon: PencilLine,
    title: "Fix misheard words",
    text: "Before scoring you can edit the transcript. Correct only what the mic got wrong.",
  },
  {
    icon: ShieldCheck,
    title: "Your accent is fine",
    text: "Knowledge and English are scored separately. If speech is unclear you will be asked to re-record.",
  },
];

export function InterviewTips() {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="font-semibold text-slate-900">Before you start</h2>
      <p className="mt-0.5 text-xs text-slate-500">A few things that make a big difference to your score</p>
      <ul className="mt-4 grid gap-3 sm:grid-cols-2">
        {TIPS.map(({ icon: Icon, title, text }) => (
          <li key={title} className="flex gap-3 rounded-2xl bg-slate-50/80 p-3">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white text-indigo-600 shadow-sm ring-1 ring-slate-100">
              <Icon className="h-4 w-4" />
            </span>
            <div>
              <p className="text-sm font-semibold text-slate-800">{title}</p>
              <p className="mt-0.5 text-xs leading-relaxed text-slate-500">{text}</p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
