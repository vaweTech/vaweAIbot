"use client";

import { useState } from "react";
import { Check, Copy, RefreshCw, Settings } from "lucide-react";
import { cn } from "@/lib/utils";

type Browser = "edge" | "chrome" | "firefox" | "other";

function detectBrowser(): Browser {
  const ua = navigator.userAgent;
  if (/Edg\//.test(ua)) return "edge";
  if (/Firefox\//.test(ua)) return "firefox";
  if (/Chrome\//.test(ua)) return "chrome";
  return "other";
}

/** The browser's own settings page for this site's permissions. */
function siteSettingsUrl(browser: Browser): string | null {
  const site = encodeURIComponent(window.location.origin);
  if (browser === "edge") return `edge://settings/content/siteDetails?site=${site}`;
  if (browser === "chrome") return `chrome://settings/content/siteDetails?site=${site}`;
  if (browser === "firefox") return "about:preferences#privacy";
  return null;
}

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

/**
 * Browsers do not let a web page open their settings pages, so this copies the
 * exact settings address and tells the student to paste it into a new tab.
 */
export function MicSettingsButton({
  onRetry,
  checking,
  tone = "rose",
  className,
}: {
  /** Re-asks for the mic after the student changes the setting. */
  onRetry?: () => void;
  checking?: boolean;
  tone?: "rose" | "indigo";
  className?: string;
}) {
  const [help, setHelp] = useState<{ url: string | null; copied: boolean } | null>(null);

  const openSettings = async () => {
    const url = siteSettingsUrl(detectBrowser());
    setHelp({ url, copied: url ? await copyText(url) : false });
  };

  const primary =
    tone === "rose" ? "bg-rose-600 hover:bg-rose-700 text-white" : "bg-indigo-600 hover:bg-indigo-700 text-white";
  const secondary =
    tone === "rose"
      ? "border-rose-200 bg-white text-rose-700 hover:bg-rose-100"
      : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50";

  return (
    <div className={cn("flex flex-wrap items-center gap-1.5", className)}>
      <button
        type="button"
        onClick={() => void openSettings()}
        className={cn("inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-semibold", primary)}
      >
        <Settings className="h-3 w-3" /> Open mic settings
      </button>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          disabled={checking}
          className={cn(
            "inline-flex items-center gap-1 rounded-lg border px-2.5 py-1 text-xs font-semibold disabled:opacity-60",
            secondary
          )}
        >
          <RefreshCw className={cn("h-3 w-3", checking && "animate-spin")} /> Check again
        </button>
      )}

      {help && (
        <p className="basis-full text-[11px] text-slate-600">
          {help.url && help.copied ? (
            <>
              <Check className="mr-1 inline h-3 w-3 text-emerald-600" />
              Link copied. Open a new tab (Ctrl+T), paste (Ctrl+V), press Enter and set Microphone to Allow.
            </>
          ) : help.url ? (
            <>
              <Copy className="mr-1 inline h-3 w-3" />
              Paste this in a new tab:{" "}
              <input
                readOnly
                value={help.url}
                onFocus={(e) => e.currentTarget.select()}
                className="w-64 max-w-full rounded border border-slate-200 bg-white px-1.5 py-0.5 font-mono text-[10px]"
              />
            </>
          ) : (
            "Click the lock icon in the address bar and set Microphone to Allow."
          )}
        </p>
      )}
    </div>
  );
}
