"use client";

const CODE_KEY = "vawe-admin-code";

export function getAdminCode(): string {
  if (typeof window === "undefined") return "";
  return window.sessionStorage.getItem(CODE_KEY) ?? "";
}

export function setAdminCode(code: string): void {
  if (typeof window === "undefined") return;
  if (code) window.sessionStorage.setItem(CODE_KEY, code);
  else window.sessionStorage.removeItem(CODE_KEY);
}

/** Fetch wrapper that attaches the admin code and surfaces server error text. */
export async function adminFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      "x-admin-code": getAdminCode(),
      ...(init?.headers ?? {}),
    },
  });

  const text = await response.text();
  const data = text ? JSON.parse(text) : {};

  if (!response.ok && response.status !== 409) {
    throw new Error(data?.error || `Request failed (${response.status})`);
  }

  return { ...data, __status: response.status } as T;
}

export type AdminStatus = {
  firebase: boolean;
  embeddings: boolean;
  embeddingModel: string;
  requiresCode: boolean;
  counts: Record<string, number> | null;
  error: string | null;
};
