/**
 * Single Groq client instance for the entire app.
 *
 * Per AGENTS.md §6.2 — routes import this, never call fetch() to Groq directly.
 * Per AGENTS.md §4.1 — GROQ_API_KEY is server-only; never put it in NEXT_PUBLIC_*.
 *
 * This file is imported only from app/api/** route handlers (server-side).
 * Next.js will throw a build error if it is imported from a client component.
 */

import Groq from "groq-sdk";

/**
 * Lazily initialised — checked at request time, not at module load time.
 * This lets `next build` succeed even when .env.local is absent (CI, fresh clone).
 * The first actual API call will throw a clear error if the key is missing.
 */
let _groq: Groq | null = null;

export function getGroq(): Groq {
  if (!_groq) {
    if (!process.env.GROQ_API_KEY) {
      throw new Error("GROQ_API_KEY is not set. Add it to .env.local");
    }
    _groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
  }
  return _groq;
}

/** Convenience re-export — use getGroq() in route handlers */
export const groq = {
  get chat() {
    return getGroq().chat;
  },
};

/** The model used for all LLM calls. Change here to update everywhere. */
export const GROQ_MODEL = "meta-llama/llama-4-scout-17b-16e-instruct";
