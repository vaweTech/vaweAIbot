"use client";

import { highlightFillers } from "@/lib/utils";

interface TranscriptPanelProps {
  transcript: string;
  speakingDuration?: string;
  wordCount?: number;
  fillerWords?: number;
  title?: string;
}

export function TranscriptPanel({
  transcript,
  speakingDuration,
  wordCount,
  fillerWords,
  title = "Your Answer",
}: TranscriptPanelProps) {
  const parts = highlightFillers(transcript);

  return (
    <div className="rounded-2xl border border-border bg-white p-5">
      <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
      <div className="mt-3 rounded-xl bg-slate-50 p-4 text-sm leading-relaxed text-slate-700">
        {parts.map((part, i) =>
          part.isFiller ? (
            <mark
              key={i}
              className="rounded bg-amber-200/80 px-0.5 font-medium text-amber-900"
            >
              {part.word}
            </mark>
          ) : (
            <span key={i}>{part.word}</span>
          )
        )}
      </div>
      {(speakingDuration || wordCount !== undefined || fillerWords !== undefined) && (
        <div className="mt-4 grid grid-cols-3 gap-3">
          {speakingDuration && (
            <div className="rounded-xl bg-indigo-50 px-3 py-2 text-center">
              <p className="text-[11px] text-indigo-500">Speaking Duration</p>
              <p className="text-sm font-semibold text-indigo-700">{speakingDuration}</p>
            </div>
          )}
          {wordCount !== undefined && (
            <div className="rounded-xl bg-blue-50 px-3 py-2 text-center">
              <p className="text-[11px] text-blue-500">Word Count</p>
              <p className="text-sm font-semibold text-blue-700">{wordCount}</p>
            </div>
          )}
          {fillerWords !== undefined && (
            <div className="rounded-xl bg-amber-50 px-3 py-2 text-center">
              <p className="text-[11px] text-amber-500">Filler Words</p>
              <p className="text-sm font-semibold text-amber-700">{fillerWords}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
