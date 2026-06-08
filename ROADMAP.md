# Future Gadget Lab — Roadmap

> The living build plan. For coding rules and conventions, see [`AGENTS.md`](./AGENTS.md).
> For the current session state (what we're on right now), see [`CLAUDE.md`](./CLAUDE.md).

---

## What Are We Building?

A fan-made web app themed around the anime **Steins;Gate**. Three AI-powered "gadgets" live on one site, all sharing the same retro CRT terminal look — green text on black, glitch effects, scanlines, the whole thing.

```
futuregadgetlab.app
├── /              → Home — world line meter + three gadget cards
├── /amadeus       → Video-call chatbot with AI Kurisu Makise   (Phase 1)
├── /d-mail        → Send a message to your past self           (Phase 2)
├── /lab-radio     → Steins;Gate themed music player            (Phase 3)
└── /lab-notes     → Your saved history + profile               (Phase 3)
```

---

## Tech Stack

| What | Tool | Why we chose it |
|---|---|---|
| Framework | Next.js 16 (App Router) | Handles both the frontend and backend in one repo |
| Language | TypeScript (strict mode) | Catches mistakes before the code runs |
| Styling | Tailwind CSS v4 | Write styles as class names directly in the HTML |
| Animation | Framer Motion | Clean animations with minimal code |
| Auth + Database | Supabase | Free, handles login + stores our data |
| Vector Search | Supabase pgvector | Same database — stores AI embeddings for RAG |
| AI / LLM | Groq API (Llama 3.3 70B) | Free tier, very fast, same interface as OpenAI |
| Validation | Zod | Makes sure data is the right shape at runtime |
| Hosting | Vercel | Free, made for Next.js, auto-deploys on git push |

Full rationale: [`AGENTS.md`](./AGENTS.md) §2.

---

## How It Works (Architecture)

```mermaid
flowchart LR
    Browser[Your Browser] --> Vercel[Next.js on Vercel]
    Vercel --> API["/api routes — server only"]
    API --> Groq[Groq LLM API]
    API --> Supabase[Supabase — Auth + DB + pgvector]
    Supabase --> RAG[Lore embeddings for RAG]
    RAG --> API
    Vercel --> Spotify[Spotify / YouTube embed]
```

**The key rule:** API keys (Groq, Supabase service role) live ONLY on the server inside `/api` routes. The browser never sees them. See [`AGENTS.md`](./AGENTS.md) §4.

---

## Progress at a Glance

| Phase | What | Status |
|---|---|---|
| 0 | Foundation — docs, scaffold, theme, landing page | ✅ Done |
| 1 | Amadeus — Kurisu video-call chatbot | 🔄 In progress |
| 2 | D-Mail Terminal + Amadeus RAG upgrade | ⬜ Not started |
| 3 | Lab Radio + Lab Notes polish + final deploy | ⬜ Not started |

---

## Phase 0: Foundation (Done — 2026-05-14)

Everything needed before writing a single feature.

| File | What it is |
|---|---|
| `AGENTS.md` | The rules file — every contributor (human or AI) follows this |
| `README.md` | The public-facing GitHub page |
| `CONTRIBUTING.md` | How to submit a PR |
| `LICENSE` | MIT open-source license |
| `.env.example` | Template showing which API keys are needed |
| `.gitignore` | Tells git to never commit secrets or build files |

---

## Phase 1: Amadeus — Kurisu Video-Call Chatbot

**The goal:** `/amadeus` opens like a video call. You see a stylized avatar of Kurisu Makise, a "CONNECTING..." animation, then a chat where she responds as she does in the show — streamed word by word, with her personality fully intact.

### Subphases

#### 1.1 — Scaffold + Theme + Landing ✅ Done (2026-05-15)

Built the skeleton of the entire site.

- Next.js 16.2.6 with TypeScript strict, Tailwind v4, ESLint, Turbopack
- `constants/theme.ts` — one place where all colours live (never hardcode hex in JSX)
- `styles/crt.css` — CRT scanlines, flicker, glitch text, phosphor glow
- Three fonts loaded via `next/font`: VT323 (terminal), Share Tech Mono (UI), Orbitron (headings)
- `app/layout.tsx` — the site shell: header with World Line Meter + "El Psy Kongroo" footer
- `app/page.tsx` — landing with three gadget cards
- `components/GadgetCard.tsx` + `WorldLineMeter.tsx`

Quality gates: `tsc` 0 errors · `eslint` 0 errors · `npm run dev` loads cleanly

---

#### 1.2 — Backend: Groq Client + Amadeus API Route + Kurisu Prompt ✅ Done (2026-06-08)

Built everything the server needs to talk to the AI.

- `lib/groq.ts` — single Groq client used everywhere (lazy init so build works without a key)
- `lib/prompts/amadeus.ts` — Kurisu's full personality prompt, Steins;Gate lore, canon spellings, versioned `1.0.0`
- `app/api/amadeus/chat/route.ts` — POST route that streams Kurisu's response back to the browser; Zod validates every incoming message
- `lib/supabase/server.ts` + `lib/supabase/client.ts` — Supabase clients (server and browser versions are separate for security)
- Dependencies installed: `groq-sdk`, `zod`, `framer-motion`, `@supabase/supabase-js`

Quality gates: `tsc` 0 errors · `eslint` 0 errors · `next build` succeeds without env keys

---

#### 1.3 — Frontend: Amadeus Video-Call UI ✅ Done (2026-06-08)

Built the page you actually see and interact with.

- `app/amadeus/page.tsx` — the full video-call interface:
  - Framer Motion entrance sequence: `CONNECTING...` → `AMADEUS SYSTEM ONLINE`
  - CSS geometric Kurisu avatar (no copyrighted art — rings + head/shoulder silhouette with purple glow)
  - Streaming chat with blinking cursor while Kurisu is "typing"
  - Send with Enter, Shift+Enter for newline
  - Conversation history auto-saved to `localStorage` (guest mode)
  - CLEAR SESSION button
- Landing page updated: Amadeus card is now **ONLINE** (clickable), D-Mail stays **IN DEVELOPMENT**

Quality gates: `tsc` 0 errors · `eslint` 0 errors · `next build` succeeds

---

#### 1.4 — Supabase Auth + Message Storage ⬜ Next

Hook up real logins so conversation history persists in the database.

What we'll build:
- Supabase project setup (create project on supabase.com, copy keys into `.env.local`)
- `supabase/migrations/001_messages.sql` — messages table with Row Level Security (RLS = users can only see their own messages)
- Magic link login (Supabase sends a login link to email — no password needed)
- When a guest signs in, migrate their `localStorage` history into the database
- "Save to Lab Notes" prompt after each conversation nudges the user to sign up

What you'll learn:
- **SQL migrations** — how we version database changes so they're reproducible
- **Row Level Security (RLS)** — Supabase's way of making sure users can't read each other's data
- **Magic link auth** — a passwordless login pattern common in modern apps

---

#### 1.5 — Deploy + LinkedIn Post #1 ⬜ After 1.4

Ship it.

- Deploy to Vercel: connect GitHub repo → auto-deploy on every push to `main`
- Add env vars in Vercel dashboard (Groq key, Supabase keys)
- Record a short demo GIF of the Amadeus video call for the README
- LinkedIn post: "I built a Steins;Gate Amadeus chatbot with streaming AI" + demo GIF + GitHub link

---

## Phase 2: D-Mail Terminal + Amadeus RAG Upgrade (Week 3-4)

Two things in one phase because they share the same infrastructure (Supabase pgvector).

### D-Mail Terminal

**The goal:** You type something you wish you could change about your past. You compose a 36-character "D-Mail" (like in the show). The AI generates 3 alternative timelines, each with a new world line divergence number.

What we'll build:
- `app/d-mail/page.tsx` — retro terminal UI with 36-char counter
- `app/api/d-mail/route.ts` — Groq call that returns **structured JSON** (not prose — three exact timeline objects)
- `lib/prompts/dmail.ts` — D-Mail system prompt + Zod schema for the 3-timeline response
- `components/DivergenceMeter.tsx` — animated divergence number display
- `supabase/migrations/002_timelines.sql` — stores saved timelines with RLS

What you'll learn:
- **Structured JSON output from an LLM** — using `response_format: { type: "json_object" }` to force the model to return exact data shapes
- **Zod output validation** — why we validate the LLM's response before sending it to the client (the model can lie)

### Amadeus RAG Upgrade

**The goal:** Right now Kurisu's knowledge is baked into the system prompt. That works but doesn't scale. RAG (Retrieval-Augmented Generation) lets us store the lore in a database and pull only what's relevant per question.

What we'll build:
- `supabase/migrations/003_lore_chunks.sql` — stores Steins;Gate lore as text chunks with embeddings
- `scripts/seed-lore.ts` — one-time script to embed and upload the lore corpus
- `lib/rag/embed.ts` — converts text to a vector embedding via Groq
- `lib/rag/retrieve.ts` — searches pgvector for the top 4 most relevant lore chunks
- Update `app/api/amadeus/chat/route.ts` — inject retrieved chunks into each Kurisu response

What you'll learn:
- **Embeddings** — a way of turning text into numbers so a computer can measure how "similar" two pieces of text are
- **Vector search (pgvector)** — how Supabase finds the most relevant lore chunks for a given question
- **RAG pattern** — why this beats a huge system prompt (cheaper, more accurate, scalable)

---

## Phase 3: Lab Radio + Lab Notes + Final Polish (Week 5)

### Lab Radio

Curated music player themed around the show — zero copyright risk because we use embeds.

Playlists:
- "Lab Work" — lofi beats
- "El Psy Kongroo Focus" — Steins;Gate OST
- "Rainy Akihabara" — city pop / ambient

What we'll build:
- `app/lab-radio/page.tsx` — playlist selector + Spotify/YouTube embed in a CRT frame
- `components/PersistentAudio.tsx` — React context that keeps music playing as you navigate pages

### Lab Notes

The user's profile and saved history — pulls everything together.

- `app/lab-notes/page.tsx` — shows saved D-Mail timelines and Amadeus conversations
- Final aesthetic pass across all three gadgets

### Final Ship

- Full integration test across all features
- Demo video (longer than the Phase 1 GIF)
- LinkedIn post #3: "Future Gadget Lab is live — here's everything I built and learned"
- 2-3 technical deep-dive posts as bonus content:
  - How RAG works (with the actual code)
  - How streaming LLM responses work in Next.js
  - The CRT aesthetic system from scratch

---

## LinkedIn Plan

Each phase ships a LinkedIn post. Don't wait until the end — sustained posting builds more reach.

| After | Post idea |
|---|---|
| Phase 1 | "I built an AI Kurisu Makise video-call chatbot (Steins;Gate Amadeus)" + streaming demo GIF |
| Phase 2 | "Added D-Mail: send a message to your past self, AI generates 3 alternate timelines" + RAG breakdown |
| Phase 3 | "Future Gadget Lab is live — all 3 gadgets, full-stack, open source" + Vercel link |
| Bonus | 2-3 deep-dives on RAG, streaming, and the CRT design system |

Total: ~6 posts from one project.

---

## Deliberately Not Included

- Mobile app (web first; React Native port later if it makes sense)
- Real-time multiplayer / shared timelines (scope creep)
- Paid tiers (free side project, period)
- Custom music hosting (legal risk)
- AI image generation for timelines (interesting but adds cost; maybe Phase 4)

---

## Risks

| Risk | How we handle it |
|---|---|
| Groq rate limits | 14,400 free requests/day is plenty; per-IP rate limiter on every route |
| Supabase free tier | 500MB — text only, will last years |
| Steins;Gate copyright | Fan project, no monetization, no official art — standard fan-project posture |
| Scope creep | Phase discipline: finish current phase before starting the next |
| LLM returns bad JSON | Zod validates every structured response before it reaches the client |
| Prompt changes break things | Every system prompt has a `VERSION` constant — bump it on any change |

---

*Update this file whenever a subphase ships. Never let it drift from reality.*

*El Psy Kongroo.*
