/**
 * LLM client — currently backed by Gemini 2.0 Flash via Google AI Studio's
 * OpenAI-compatible endpoint.  The Groq SDK accepts a custom baseURL, so the
 * route handlers don't need to change at all when we swap providers.
 *
 * Per AGENTS.md §6.2 — routes import this, never call fetch() to the LLM directly.
 * Per AGENTS.md §4.1 — GEMINI_API_KEY is server-only; never put it in NEXT_PUBLIC_*.
 *
 * This file is imported only from app/api/** route handlers (server-side).
 * Next.js will throw a build error if it is imported from a client component.
 *
 * Free tier: Gemini 2.0 Flash via AI Studio — 1 M TPD (10× Groq free tier).
 * Docs: https://ai.google.dev/gemini-api/docs/openai
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
    if (!process.env.GEMINI_API_KEY) {
      throw new Error("GEMINI_API_KEY is not set. Add it to .env.local");
    }
    _groq = new Groq({
      apiKey: process.env.GEMINI_API_KEY,
      baseURL: "https://generativelanguage.googleapis.com/v1beta/openai/",
    });
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
export const GROQ_MODEL = "gemini-2.0-flash";
