@AGENTS.md

---

# Working Context — Future Gadget Lab

> This file is the live session state. Update it whenever a phase ships or the approach changes. AGENTS.md is the immutable contract; this file is the mutable "where we are right now."

---

## Collaboration Style

- **We are building this together.** Karan is learning full-stack development as we go.
- Every non-trivial decision gets a short "why" explanation — not in code comments, but talked through in chat before writing code.
- Key concepts are explained the first time they appear (e.g. why a route handler is safer than a client fetch, what Zod does, how streaming differs from a blocking response).
- When in doubt, write simpler code and explain the trade-off rather than writing clever code silently.

---

## Current Phase

**Phase 1 — Amadeus video-call chatbot (IN PROGRESS)**

We swapped phases on 2026-06-08. Amadeus ships first because it's the most visually impressive feature for a LinkedIn post.

### What we're building in Phase 1

A video-call style interface to chat with an AI Kurisu Makise (the Amadeus system from Steins;Gate). Key details:

- CRT-framed "screen" with a CSS geometric Kurisu avatar (no copyrighted art)
- Framer Motion entrance: `CONNECTING...` → `AMADEUS SYSTEM ONLINE`
- Streaming chat responses via Groq (Llama 3.3 70B)
- Kurisu's personality + Steins;Gate lore baked into the system prompt (RAG comes in Phase 2)
- Guest mode: conversation in `localStorage`. Auth + Supabase persistence later.

### Remaining todos for Phase 1

| Step | Task | Status |
|---|---|---|
| 1.3 | Groq client wrapper + Amadeus streaming API route + Kurisu prompt | Next |
| 1.4 | Amadeus video-call page (UI) | After 1.3 |
| 1.5 | Supabase auth + messages table | After 1.4 |
| 1.6 | Vercel deploy + LinkedIn post #1 | Last |

---

## Phase Order

| Phase | Feature | Status |
|---|---|---|
| 0 | Foundation (docs, scaffold, theme, landing) | Complete |
| 1 | Amadeus — Kurisu video-call chatbot | **In progress** |
| 2 | D-Mail terminal + Amadeus RAG upgrade | Not started |
| 3 | Lab Radio + Lab Notes polish | Not started |

---

## Key Decisions Made

- **Amadeus before D-Mail** — swapped because Amadeus is more visually striking and better for social proof
- **No RAG in Phase 1** — bake Steins;Gate lore into the system prompt for MVP; add pgvector RAG in Phase 2
- **CSS-only avatar** — no official Steins;Gate art (copyright); use `clip-path` geometry + `phosphor-purple` glow
- **Streaming, not JSON** — Amadeus responses are streamed prose via `ReadableStream`; D-Mail will use structured JSON
- **Guest-first auth** — full functionality without login; `localStorage` for guests; Supabase on sign-up

---

## Things to Learn Along the Way

These concepts come up in Phase 1 — ask about any of them:

- **Server Components vs Client Components** — why most pages are server-only, and when `"use client"` is required
- **Route handlers (`app/api/`)** — why LLM calls live here, never in the browser
- **Zod** — runtime validation (TypeScript only checks at compile time; Zod checks when code actually runs)
- **Streaming with `ReadableStream`** — how text appears word-by-word instead of waiting for the full response
- **Supabase SSR** — why there are two Supabase client files (server reads cookies; browser client doesn't)
- **Environment variables** — why `GROQ_API_KEY` is server-only and `NEXT_PUBLIC_SUPABASE_URL` is public-safe
