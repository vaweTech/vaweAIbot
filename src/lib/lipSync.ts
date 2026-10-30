/**
 * Text-driven lip sync for browser speech synthesis, which gives no audio
 * stream to analyse. Each syllable becomes a mouth shape on an estimated
 * timeline; word-boundary events (when the voice sends them) re-anchor it.
 */

export type MouthShape = { open: number; width: number };

type Syllable = { start: number; end: number; shape: MouthShape };
type WordMark = { charIndex: number; start: number; end: number };

export type LipTimeline = { syllables: Syllable[]; words: WordMark[]; duration: number };

export const MOUTH_REST: MouthShape = { open: 0.04, width: 1 };

/** Roughly how long one syllable takes at rate 1 for the browser voices. */
const SYLLABLE_MS = 205;
const WORD_GAP_MS = 35;
const COMMA_PAUSE_MS = 200;
const STOP_PAUSE_MS = 380;

function shapeFor(vowels: string): MouthShape {
  const v = vowels.toLowerCase();
  if (v.includes("a")) return { open: 1, width: 1.05 };
  if (v.includes("o")) return { open: 0.8, width: 0.72 };
  if (v.includes("u") || v.includes("w")) return { open: 0.5, width: 0.62 };
  return { open: 0.55, width: 1.2 };
}

export function buildLipTimeline(text: string, rate: number): LipTimeline {
  const speed = Math.max(rate, 0.5);
  const syllableMs = SYLLABLE_MS / speed;
  const syllables: Syllable[] = [];
  const words: WordMark[] = [];
  let t = 0;

  for (const match of text.matchAll(/[A-Za-z0-9']+|[.,!?;:]/g)) {
    const token = match[0];
    if (/^[,;:]$/.test(token)) {
      t += COMMA_PAUSE_MS / speed;
      continue;
    }
    if (/^[.!?]$/.test(token)) {
      t += STOP_PAUSE_MS / speed;
      continue;
    }

    const groups = token.match(/[aeiouy]+/gi) ?? [];
    const vowelGroups = groups.length > 0 ? groups : Array.from({ length: Math.max(1, Math.ceil(token.length / 3)) }, () => "e");
    // A silent final "e" ("make", "time") is not its own syllable.
    if (vowelGroups.length > 1 && /[^aeiouy]e$/i.test(token)) vowelGroups.pop();

    const wordStart = t;
    for (const group of vowelGroups) {
      syllables.push({ start: t, end: t + syllableMs, shape: shapeFor(group) });
      t += syllableMs;
    }
    words.push({ charIndex: match.index ?? 0, start: wordStart, end: t });
    t += WORD_GAP_MS / speed;
  }

  return { syllables, words, duration: t };
}

/** Where on the timeline the voice is now, trusting word boundaries over the estimate. */
export function timelinePosition(
  timeline: LipTimeline,
  now: number,
  startedAt: number,
  lastWord: { charIndex: number; at: number } | null
): number {
  if (!lastWord) return now - startedAt;
  let word: WordMark | undefined;
  for (const w of timeline.words) {
    if (w.charIndex > lastWord.charIndex) break;
    word = w;
  }
  if (!word) return now - startedAt;
  // Hold the mouth closed at the end of the word until the voice reports the next one.
  return Math.min(word.start + (now - lastWord.at), word.end);
}

export function mouthAt(timeline: LipTimeline, position: number): MouthShape {
  const syllable = timeline.syllables.find((s) => position >= s.start && position < s.end);
  if (!syllable) return MOUTH_REST;
  const progress = (position - syllable.start) / (syllable.end - syllable.start);
  const envelope = Math.sin(Math.PI * progress);
  return {
    open: MOUTH_REST.open + (syllable.shape.open - MOUTH_REST.open) * envelope,
    width: 1 + (syllable.shape.width - 1) * envelope,
  };
}
