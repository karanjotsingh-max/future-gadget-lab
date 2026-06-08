@AGENTS.md

---

# Working Context — Future Gadget Lab

> Live session state. AGENTS.md is the immutable contract; this file tracks where we are right now.

---

## Collaboration Style

- Building together, one subtask at a time. Karan is learning — explain every non-obvious decision before writing code.
- Use the `fgl-step-by-step` skill when starting a new task.

---

## Current Phase

**Phase 1 — Amadeus video-call chatbot**

| Step | Task | Status |
|---|---|---|
| 1.1 | Scaffold + theme + landing | Done |
| 1.2 | Phase swap docs, Groq client, Amadeus API + prompt | Done |
| 1.3 | Amadeus video-call UI + Supabase clients | Done |
| 1.4 | Supabase auth + messages table | **Next** |
| 1.5 | Vercel deploy + LinkedIn post #1 | After 1.4 |

---

## Phase Order

| Phase | Feature | Status |
|---|---|---|
| 0 | Foundation | Done |
| 1 | Amadeus — Kurisu video-call chatbot | **In progress** |
| 2 | D-Mail terminal + Amadeus RAG upgrade | Not started |
| 3 | Lab Radio + Lab Notes | Not started |

---

## Key Decisions

- **Amadeus before D-Mail** — more visually striking for LinkedIn post #1
- **No RAG in Phase 1** — Steins;Gate lore baked into system prompt; pgvector RAG added in Phase 2
- **CSS-only avatar** — no official art (copyright rule in AGENTS.md §8)
- **Streaming prose** for Amadeus; **structured JSON + Zod** for D-Mail
- **Guest-first** — full functionality without login; `localStorage` now, Supabase on sign-up
