/**
 * LLM client — Gemini 2.0 Flash via Google AI Studio's OpenAI-compatible endpoint.
 *
 * We use the `groq-sdk` package (which wraps the OpenAI SDK) pointed at Google's
 * OpenAI-compat baseURL. This means no new npm package is needed and all route
 * handlers work unchanged — only this file knows about the provider.
 *
 * Per AGENTS.md §6.2 — routes import this, never call fetch() to the LLM directly.
 * Per AGENTS.md §4.1 — GEMINI_API_KEY is server-only; never put it in NEXT_PUBLIC_*.
 *
 * This file is imported only from app/api/** route handlers (server-side).
 * Next.js will throw a build error if it is imported from a client component.
 *
 * Free tier: 1 M tokens/day via AI Studio.
 * Docs: https://ai.google.dev/gemini-api/docs/openai
 */

import Groq from "groq-sdk";

/**
 * Lazily initialised — checked at request time, not at module load time.
 * This lets `next build` succeed even when .env.local is absent (CI, fresh clone).
 * The first actual API call will throw a clear error if the key is missing.
 */
let _client: Groq | null = null;

export function getLLMClient(): Groq {
  if (!_client) {
    if (!process.env.GEMINI_API_KEY) {
      throw new Error("GEMINI_API_KEY is not set. Add it to .env.local");
    }
    _client = new Groq({
      apiKey: process.env.GEMINI_API_KEY,
      baseURL: "https://generativelanguage.googleapis.com/v1beta/openai/",
    });
  }
  return _client;
}

/** Convenience re-export — use llm.chat.completions.create() in route handlers */
export const llm = {
  get chat() {
    return getLLMClient().chat;
  },
};

/** The model used for all LLM calls. Change here to update everywhere. */
export const LLM_MODEL = "gemini-2.0-flash";
