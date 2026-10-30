"use client";

import { useEffect, useRef } from "react";
import { buildLipTimeline, mouthAt, MOUTH_REST, timelinePosition, type LipTimeline } from "@/lib/lipSync";
import { getActiveSpeech } from "@/lib/speech";
import { cn } from "@/lib/utils";

const MOUTH_RX = 8;
const MOUTH_MAX_RY = 6;
/** Fraction of the gap to the target shape closed each frame; keeps lips smooth, not jumpy. */
const MOUTH_EASE = 0.45;

/** Moves the mouth in step with whatever the speech synthesizer is saying right now. */
function useLipSync(active: boolean) {
  const mouthRef = useRef<SVGEllipseElement>(null);

  useEffect(() => {
    if (!active) return;
    let frame = 0;
    let cached: { key: string; timeline: LipTimeline } | null = null;
    let open = MOUTH_REST.open;
    let width = MOUTH_REST.width;

    const tick = (now: number) => {
      const speech = getActiveSpeech();
      let target = MOUTH_REST;
      if (speech) {
        const key = `${speech.token}:${speech.startedAt}`;
        if (cached?.key !== key) cached = { key, timeline: buildLipTimeline(speech.text, speech.rate) };
        const position = timelinePosition(cached.timeline, now, speech.startedAt, speech.lastWord);
        target = mouthAt(cached.timeline, position);
      }
      open += (target.open - open) * MOUTH_EASE;
      width += (target.width - width) * MOUTH_EASE;
      const mouth = mouthRef.current;
      if (mouth) {
        mouth.setAttribute("rx", (MOUTH_RX * width).toFixed(2));
        mouth.setAttribute("ry", (0.6 + MOUTH_MAX_RY * open).toFixed(2));
      }
      frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [active]);

  return mouthRef;
}

export type AvatarLook = {
  skin: string;
  skinShade: string;
  hair: string;
  hairStyle: "short" | "long";
  suit: string;
  shirt: string;
  mustache?: boolean;
  glasses?: boolean;
  tie?: string;
};

/** A head-and-shoulders interviewer that blinks, breathes and lip-syncs to the speech synthesizer. */
export function InterviewerAvatar({
  look,
  speaking,
  className,
}: {
  look: AvatarLook;
  speaking: boolean;
  className?: string;
}) {
  const mouthRef = useLipSync(speaking);

  return (
    <svg viewBox="0 0 200 220" className={cn("animate-breathe", className)} aria-hidden>
      {look.hairStyle === "long" && (
        <path d="M46,100 C40,40 160,40 154,100 L160,175 C130,190 70,190 40,175 Z" fill={look.hair} />
      )}

      {/* Shoulders and suit */}
      <path d="M8,220 C12,186 40,168 72,162 L128,162 C160,168 188,186 192,220 Z" fill={look.suit} />
      <path d="M80,162 L100,204 L120,162 Z" fill={look.shirt} />
      {look.tie && <path d="M96,170 L104,170 L107,206 L100,214 L93,206 Z" fill={look.tie} />}
      <path d="M72,162 L100,214 L86,214 L60,168 Z" fill="#000" opacity="0.12" />
      <path d="M128,162 L100,214 L114,214 L140,168 Z" fill="#000" opacity="0.12" />

      {/* Neck */}
      <path d="M84,128 L116,128 L118,166 C108,174 92,174 82,166 Z" fill={look.skinShade} />

      {/* Ears */}
      <ellipse cx="59" cy="98" rx="7" ry="11" fill={look.skinShade} />
      <ellipse cx="141" cy="98" rx="7" ry="11" fill={look.skinShade} />

      {/* Face */}
      <path
        d="M60,88 C60,52 140,52 140,88 L140,104 C140,132 120,150 100,150 C80,150 60,132 60,104 Z"
        fill={look.skin}
      />

      {/* Hair */}
      {look.hairStyle === "short" ? (
        <path d="M57,94 C52,42 148,38 143,94 C139,74 128,64 108,62 C92,60 76,64 66,74 C61,80 58,86 57,94 Z" fill={look.hair} />
      ) : (
        <path d="M58,96 C54,44 146,40 142,96 C136,72 118,60 100,62 C90,72 72,80 58,96 Z" fill={look.hair} />
      )}

      {/* Brows */}
      <rect x="74" y="84" width="18" height="3.5" rx="1.75" fill={look.hair} opacity="0.9" />
      <rect x="108" y="84" width="18" height="3.5" rx="1.75" fill={look.hair} opacity="0.9" />

      {/* Eyes */}
      <g className="animate-blink">
        <ellipse cx="83" cy="98" rx="5.5" ry="4" fill="#fff" />
        <ellipse cx="117" cy="98" rx="5.5" ry="4" fill="#fff" />
        <circle cx="83" cy="98" r="3" fill="#2b1d14" />
        <circle cx="117" cy="98" r="3" fill="#2b1d14" />
      </g>

      {look.glasses && (
        <g fill="none" stroke="#1f2937" strokeWidth="2.2">
          <rect x="71" y="89" width="24" height="17" rx="6" />
          <rect x="105" y="89" width="24" height="17" rx="6" />
          <path d="M95,96 L105,96" />
        </g>
      )}

      {/* Nose */}
      <path d="M100,100 C98,110 96,114 100,116 C103,117 105,115 104,114" fill="none" stroke={look.skinShade} strokeWidth="2.2" strokeLinecap="round" />

      {look.mustache && (
        <path d="M84,124 C90,118 97,119 100,122 C103,119 110,118 116,124 C110,126 104,125 100,125 C96,125 90,126 84,124 Z" fill={look.hair} />
      )}

      {/* Mouth */}
      {speaking ? (
        <ellipse
          ref={mouthRef}
          cx="100"
          cy="132"
          rx={MOUTH_RX}
          ry={0.6 + MOUTH_MAX_RY * MOUTH_REST.open}
          fill="#5b1f1f"
          stroke="#7a3b2e"
          strokeWidth="1.5"
        />
      ) : (
        <path d="M90,131 C95,136 105,136 110,131" fill="none" stroke="#7a3b2e" strokeWidth="2.5" strokeLinecap="round" />
      )}
    </svg>
  );
}
