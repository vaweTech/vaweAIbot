"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import type { FaceLandmarker, FaceLandmarkerResult } from "@mediapipe/tasks-vision";

export type FaceStatus =
  | "loading"
  | "ok"
  | "no-face"
  | "partial"
  | "multiple"
  | "too-far"
  | "too-close"
  | "looking-away"
  | "unavailable";

export const FACE_MESSAGES: Record<FaceStatus, string> = {
  loading: "Starting face check…",
  ok: "Face in view",
  "no-face": "We can't see your face. Sit in front of the camera.",
  partial: "Your face is not fully visible. Move to the centre of the camera.",
  multiple: "Another person is in the camera. Only you should be visible.",
  "too-far": "You are too far from the camera. Move a little closer.",
  "too-close": "You are too close to the camera. Move back a little.",
  "looking-away": "Please look at the screen while answering.",
  unavailable: "Face check could not start in this browser.",
};

/** Must match the installed @mediapipe/tasks-vision so the wasm and JS agree. */
const MEDIAPIPE_VERSION = "1.1.0";
const WASM_URL = `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${MEDIAPIPE_VERSION}/wasm`;
const MODEL_URL =
  "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task";

const CHECK_EVERY_MS = 200;
/** How long a problem must last before it is shown; a blink or quick glance should not warn. */
const HOLD_MS: Partial<Record<FaceStatus, number>> = {
  ok: 500,
  "looking-away": 1500,
};
const DEFAULT_HOLD_MS = 1000;

/** Fraction of the frame a landmark may come within before the face counts as cut off. */
const EDGE_MARGIN = 0.01;
const MIN_FACE_WIDTH = 0.14;
const MAX_FACE_HEIGHT = 0.95;
/** Nose position between the cheeks: 0.5 is facing the camera. */
const MAX_HEAD_TURN = 0.2;
const EYE_SIDE_LIMIT = 0.55;
const EYE_VERTICAL_LIMIT = 0.6;

const NOSE_TIP = 1;
const LEFT_CHEEK = 234;
const RIGHT_CHEEK = 454;

function classify(result: FaceLandmarkerResult): FaceStatus {
  const faces = result.faceLandmarks;
  if (faces.length === 0) return "no-face";
  if (faces.length > 1) return "multiple";

  const points = faces[0];
  let minX = 1;
  let maxX = 0;
  let minY = 1;
  let maxY = 0;
  for (const p of points) {
    minX = Math.min(minX, p.x);
    maxX = Math.max(maxX, p.x);
    minY = Math.min(minY, p.y);
    maxY = Math.max(maxY, p.y);
  }
  if (minX < EDGE_MARGIN || maxX > 1 - EDGE_MARGIN || minY < EDGE_MARGIN || maxY > 1 - EDGE_MARGIN) {
    return maxY - minY > MAX_FACE_HEIGHT ? "too-close" : "partial";
  }
  if (maxX - minX < MIN_FACE_WIDTH) return "too-far";

  const nose = points[NOSE_TIP];
  const left = points[LEFT_CHEEK];
  const right = points[RIGHT_CHEEK];
  const span = right.x - left.x;
  if (span !== 0) {
    const turn = (nose.x - left.x) / span;
    if (Math.abs(turn - 0.5) > MAX_HEAD_TURN) return "looking-away";
  }

  const scores = new Map(
    (result.faceBlendshapes[0]?.categories ?? []).map((c) => [c.categoryName, c.score])
  );
  const s = (name: string) => scores.get(name) ?? 0;
  const lookingOneSide = (s("eyeLookOutLeft") + s("eyeLookInRight")) / 2;
  const lookingOtherSide = (s("eyeLookInLeft") + s("eyeLookOutRight")) / 2;
  const lookingDown = (s("eyeLookDownLeft") + s("eyeLookDownRight")) / 2;
  const lookingUp = (s("eyeLookUpLeft") + s("eyeLookUpRight")) / 2;
  const eyesClosed = (s("eyeBlinkLeft") + s("eyeBlinkRight")) / 2 > 0.5;
  if (!eyesClosed) {
    if (Math.max(lookingOneSide, lookingOtherSide) > EYE_SIDE_LIMIT) return "looking-away";
    if (Math.max(lookingDown, lookingUp) > EYE_VERTICAL_LIMIT) return "looking-away";
  }

  return "ok";
}

/** MediaPipe's wasm prints routine INFO/WARNING lines via console.error, which Next.js shows as errors. */
const MEDIAPIPE_NOISE = /^(INFO:|WARNING:|[IW]\d{4} )|TensorFlow Lite|XNNPACK|gl_context|OpenGL error checking/;

function isMediapipeNoise(args: unknown[]) {
  return typeof args[0] === "string" && MEDIAPIPE_NOISE.test(args[0]);
}

/** Drops MediaPipe log noise until the returned function is called; real errors still reach the console. */
function muteMediapipeLogs(): () => void {
  const { error, warn, info, log } = console;
  const filter =
    (original: (...args: unknown[]) => void) =>
    (...args: unknown[]) => {
      if (!isMediapipeNoise(args)) original(...args);
    };
  console.error = filter(error);
  console.warn = filter(warn);
  console.info = filter(info);
  console.log = filter(log);
  return () => {
    console.error = error;
    console.warn = warn;
    console.info = info;
    console.log = log;
  };
}

async function createLandmarker(): Promise<FaceLandmarker> {
  const { FaceLandmarker, FilesetResolver } = await import("@mediapipe/tasks-vision");
  const fileset = await FilesetResolver.forVisionTasks(WASM_URL);
  const options = (delegate: "GPU" | "CPU") => ({
    baseOptions: { modelAssetPath: MODEL_URL, delegate },
    runningMode: "VIDEO" as const,
    numFaces: 2,
    outputFaceBlendshapes: true,
  });
  const restore = muteMediapipeLogs();
  try {
    let landmarker: FaceLandmarker;
    try {
      landmarker = await FaceLandmarker.createFromOptions(fileset, options("GPU"));
    } catch {
      landmarker = await FaceLandmarker.createFromOptions(fileset, options("CPU"));
    }
    return landmarker;
  } finally {
    restore();
  }
}

/**
 * Watches the student's webcam for proctoring-style warnings: face missing or
 * cut off, another person in view, or looking away from the screen.
 * Everything runs in the browser; no video leaves the device.
 */
export function useFaceMonitor(videoRef: RefObject<HTMLVideoElement | null>, enabled: boolean) {
  const [status, setStatus] = useState<FaceStatus>("loading");
  const [lookAwayCount, setLookAwayCount] = useState(0);
  const shownRef = useRef<FaceStatus>("loading");

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    let timer: ReturnType<typeof setInterval> | null = null;
    let landmarker: FaceLandmarker | null = null;
    let candidate: FaceStatus = "loading";
    let candidateSince = 0;
    let lastTimestamp = 0;

    const show = (next: FaceStatus) => {
      if (shownRef.current === next) return;
      shownRef.current = next;
      setStatus(next);
      if (next === "looking-away") setLookAwayCount((n) => n + 1);
    };

    const check = () => {
      const video = videoRef.current;
      if (!landmarker || !video || video.readyState < 2 || video.videoWidth === 0) return;
      const now = performance.now();
      if (now <= lastTimestamp) return;
      lastTimestamp = now;

      let raw: FaceStatus;
      const restore = muteMediapipeLogs();
      try {
        raw = classify(landmarker.detectForVideo(video, now));
      } catch {
        return;
      } finally {
        restore();
      }
      if (raw !== candidate) {
        candidate = raw;
        candidateSince = now;
      }
      if (now - candidateSince >= (HOLD_MS[raw] ?? DEFAULT_HOLD_MS)) show(raw);
    };

    shownRef.current = "loading";
    createLandmarker()
      .then((instance) => {
        if (cancelled) {
          instance.close();
          return;
        }
        landmarker = instance;
        timer = setInterval(check, CHECK_EVERY_MS);
      })
      .catch(() => {
        if (!cancelled) show("unavailable");
      });

    return () => {
      cancelled = true;
      if (timer) clearInterval(timer);
      landmarker?.close();
      landmarker = null;
      shownRef.current = "loading";
      setStatus("loading");
    };
  }, [enabled, videoRef]);

  return { status: enabled ? status : "loading", lookAwayCount };
}
