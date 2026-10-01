"use client";

import { MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";
import type { GDTranscriptEntry } from "@/types/gd";

interface GDTranscriptProps {
  entries: GDTranscriptEntry[];
  className?: string;
}

export function GDTranscript({ entries, className }: GDTranscriptProps) {
  return (
    <div className={cn("flex flex-col rounded-2xl border border-border bg-white shadow-sm", className)}>
      <div className="flex items-center gap-2 border-b border-border px-5 py-4">
        <MessageSquare className="h-4 w-4 text-indigo-600" />
        <h3 className="text-sm font-semibold text-slate-900">Live Transcript</h3>
        <span className="ml-auto text-xs text-muted">{entries.length} entries</span>
      </div>

      <div className="scrollbar-thin max-h-80 overflow-y-auto px-5 py-4">
        {entries.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted">
            Transcript will appear here as participants speak.
          </p>
        ) : (
          <div className="space-y-4">
            {entries.map((entry, index) => (
              <div key={`${entry.time}-${index}`} className="animate-fade-in">
                <div className="flex items-baseline gap-2">
                  <span className="shrink-0 font-mono text-[11px] text-indigo-500">
                    {entry.time}
                  </span>
                  <span className="text-xs font-semibold text-slate-800">{entry.speaker}</span>
                </div>
                <p className="mt-1 pl-12 text-sm leading-relaxed text-slate-600">{entry.text}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
