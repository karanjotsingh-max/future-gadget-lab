# Future Gadget Lab — Project Plan

> The build roadmap. For conventions and rules, see [`AGENTS.md`](./AGENTS.md).

---

## Concept

A unified "Future Gadget Lab" web experience hosting three interconnected anime-themed AI features. The entire site shares one cohesive aesthetic (CRT terminal, retro green-on-black, glitch effects, world line divergence meter in the header) so every feature reinforces the brand instead of feeling like three separate apps stitched together.

```
futuregadgetlab.app
├── /                  → Lab landing, world line meter, gadget cards
├── /amadeus           → Amadeus video-call chatbot (Phase 1)
├── /d-mail            → D-Mail Terminal (Phase 2)
├── /lab-radio         → Themed playlists player (Phase 3)
└── /lab-notes         → "Lab Member" profile + saved history
```

---

## Tech Stack

- **Framework**: Next.js 15 (App Router) + TypeScript (strict)
- **Styling**: Tailwind CSS v4 + custom CRT/glitch theme + Framer Motion
- **Backend**: Next.js Route Handlers (no separate backend needed)
- **Auth + DB**: Supabase (auth, Postgres, pgvector for RAG)
- **LLM**: Groq API (Llama 3.3 70B) — free tier
- **Music**: Spotify Embed API or YouTube IFrame API (no copyright issues)
- **Hosting**: Vercel (free tier)
- **Repo**: GitHub public (open source for LinkedIn proof)

Full stack table with rationale: [`AGENTS.md`](./AGENTS.md) section 2.

---

## Architecture

```mermaid
flowchart LR
    User[User Browser] --> Next[Next.js App on Vercel]
    Next --> Routes["/api routes (server-only)"]
    Routes --> Groq[Groq LLM API]
    Routes --> Supa[Supabase: Auth + DB + pgvector]
    Supa --> Embed[Embeddings for RAG]
    Embed --> Routes
    Next --> Spotify[Spotify Embed iframe]
```

API keys live ONLY in Next.js server routes — the browser never sees them. See [`AGENTS.md`](./AGENTS.md) section 4 for security rules.

---

## Phases at a Glance

| Phase | What | Timeline | Ships |
|---|---|---|---|
| 0 | Foundation (`AGENTS.md`, README, license, env, gitignore) | Done | This commit |
| 1 | Amadeus video-call chatbot (Kurisu AI) | Week 1-2 | MVP demo + LinkedIn post #1 |
| 2 | D-Mail Terminal + RAG upgrade for Amadeus | Week 3-4 | Deploy + LinkedIn post #2 |
| 3 | Lab Radio + Lab Notes | Week 5 | Final deploy + LinkedIn post #3 |

---

## Progress Log

| Phase | Status | Date | Notes |
|---|---|---|---|
| 0 — Foundation docs | Complete | 2026-05-14 | AGENTS.md, README, CONTRIBUTING, LICENSE, .env.example, .gitignore |
| 1.1 — Next.js scaffold + theme + landing | Complete | 2026-05-15 | See Phase 1.1 recap below |
| 1.2 — Phase swap docs + Groq client + Amadeus API + prompt | Complete | 2026-06-08 | lib/groq.ts, lib/prompts/amadeus.ts, app/api/amadeus/chat/route.ts |
| 1.3 — Amadeus video-call UI + Supabase clients | Complete | 2026-06-08 | app/amadeus/page.tsx, lib/supabase/server.ts + client.ts |
| 1.4 — Supabase auth + message persistence | Not started | — | Guest localStorage done; Supabase DB next |
| 1.5 — Ship: deploy + LinkedIn post #1 | Not started | — | |

---

## Phase 0: Foundation Docs (Complete — 2026-05-14)

- [`AGENTS.md`](./AGENTS.md) — project contract for AI agents and humans
- [`README.md`](./README.md) — GitHub-facing overview
- [`CONTRIBUTING.md`](./CONTRIBUTING.md) — PR checklist + conventions
- [`LICENSE`](./LICENSE) — MIT + fan-project disclaimer
- [`.env.example`](./.env.example) — env template (Groq + Supabase)
- [`.gitignore`](./.gitignore) — secrets and build output excluded

## Phase 1.1: Scaffold + Theme + Landing (Complete — 2026-05-15)

### What was built

**Next.js scaffold:**
- Next.js 16.2.6 (latest stable) — App Router, TypeScript strict, Tailwind v4, ESLint, Turbopack
- Import alias `@/*` configured in `tsconfig.json`
- Project root `future-gadget-lab/` (npm-compliant lowercase name)

**Theme system:**
- [`constants/theme.ts`](./constants/theme.ts) — color tokens, motion config, canon worldline values
- [`styles/crt.css`](./styles/crt.css) — CRT frame, scanlines, flicker, glitch text, terminal cursor, phosphor glow
- [`app/globals.css`](./app/globals.css) — Tailwind v4 `@theme` mapping our tokens to utilities

**Fonts (via `next/font`):**
- VT323 → `--font-terminal` (D-Mail terminal output)
- Share Tech Mono → `--font-ui` (general UI)
- Orbitron → `--font-display` (headings)

**Layout & landing:**
- [`app/layout.tsx`](./app/layout.tsx) — root layout with FGL header + World Line Meter (`1.048596`) + "El Psy Kongroo" footer
- [`app/page.tsx`](./app/page.tsx) — landing page with glitchy "WELCOME TO THE LAB" heading
- [`components/WorldLineMeter.tsx`](./components/WorldLineMeter.tsx) — divergence readout
- [`components/GadgetCard.tsx`](./components/GadgetCard.tsx) — reusable card with CRT frame, status badges

### Quality gates passed
- `tsc --noEmit` — 0 errors
- `npm run lint` — 0 errors
- `npm run dev` — ready in 6s

### Status of the three gadget cards
- Card #001 — D-Mail Terminal: **IN DEVELOPMENT** (locked, Phase 2)
- Card #002 — Amadeus: **IN DEVELOPMENT** → will become **ONLINE** in Phase 1.4
- Card #003 — Lab Radio: **OFFLINE** (locked, Phase 3)

---

## Phase 1: Amadeus — Kurisu Video-Call Chatbot (Ship First — Week 1-2)

The flagship feature. A video-call style interface to chat with an AI Kurisu Makise (Amadeus system). Streaming responses, Steins;Gate lore baked into the system prompt, CRT aesthetic.

### User Flow
1. User opens `/amadeus` — sees "CONNECTING..." animation, then "AMADEUS SYSTEM ONLINE"
2. A CRT-framed screen shows a stylized geometric Kurisu avatar (CSS only, no copyrighted art)
3. User types a message, AI responds as Kurisu in streaming text with a blinking cursor
4. Conversation history saved to `localStorage` (guest); Supabase when logged in
5. "El Psy Kongroo" sign-off closes each session

### Key Files
- `app/amadeus/page.tsx` — video-call UI, streaming chat, Framer Motion connection sequence
- `app/api/amadeus/chat/route.ts` — streaming POST, Zod-validated input, in-memory rate limit
- `lib/groq.ts` — Groq client wrapper
- `lib/prompts/amadeus.ts` — versioned Kurisu system prompt with baked-in lore
- `lib/supabase/server.ts` + `client.ts` — Supabase SSR clients

### LLM Strategy
Streaming text via `groq.chat.completions.create({ stream: true })`. No structured JSON needed — Kurisu speaks in prose. RAG will be added in Phase 2 once pgvector is set up.

### Phase 1 Todos
- [x] **1.1** Next.js + TS + Tailwind scaffold, theme tokens, CRT styling, base layout with world line meter — *2026-05-15*
- [x] **1.2** Phase order swap: Amadeus → Phase 1, D-Mail → Phase 2 — *2026-06-08*
- [ ] **1.3** Groq client wrapper, Amadeus streaming API route, Kurisu system prompt
- [ ] **1.4** Amadeus video-call page, Framer Motion connection sequence, streaming chat UI
- [ ] **1.5** Supabase project setup, magic link auth, messages table, guest-to-user migration
- [ ] **1.6** Vercel deploy, README with demo GIF, LinkedIn post #1

---

## Phase 2: D-Mail Terminal + Amadeus RAG Upgrade (Week 3-4)

D-Mail timeline simulator plus a RAG upgrade for Amadeus (lore-aware responses via pgvector).

### D-Mail Features
- User types a "past event" they want to change
- Composes a "D-Mail" (max 36 chars, like the show)
- AI generates 3 divergent timelines with World Line Divergence Meter values
- Save to "Lab Notes" if logged in; `localStorage` if guest

### Amadeus RAG Upgrade
- Curated Steins;Gate lore corpus (characters, world lines, key events)
- Embedded into Supabase pgvector, retrieved at query time
- Replaces the baked-in lore in the system prompt with dynamic retrieval

### Key Files
- `app/d-mail/page.tsx` — terminal-style UI
- `app/api/d-mail/route.ts` — Groq call with structured JSON output
- `components/DivergenceMeter.tsx` — animated number display
- `lib/prompts/dmail.ts` — system prompt + Zod schema
- `lib/rag/embed.ts` — embedding helper
- `lib/rag/retrieve.ts` — pgvector similarity search
- `supabase/migrations/001_timelines.sql` — timeline storage table
- `supabase/migrations/002_lore_chunks.sql` — RAG lore corpus table
- `scripts/seed-lore.ts` — one-time lore embedding script

### Phase 2 Todos
- [ ] D-Mail terminal page + API route with structured JSON output + Zod schema
- [ ] DivergenceMeter animated component + timeline result cards
- [ ] Lore corpus curation, embedding script, pgvector setup, retrieval helper
- [ ] Amadeus RAG upgrade: swap baked-in lore for dynamic retrieval
- [ ] Deploy + technical writeup + LinkedIn post #2

---

## Phase 3: Lab Radio + Polish (Week 5)

Thematic music section — fits the universe, zero copyright risk.

### Features
- 3-4 curated playlists embedded from Spotify/YouTube:
  - "Lab Work" (lofi)
  - "El Psy Kongroo Focus" (Steins;Gate OST)
  - "Rainy Akihabara" (city pop / ambient)
- CRT monitor-styled player frame around the embed
- Persistent audio while navigating other gadgets (React context)

### Key Files
- `app/lab-radio/page.tsx` — playlist selector + embed
- `components/CrtFrame.tsx` — reusable CRT styling wrapper
- `components/PersistentAudio.tsx` — context provider
- `app/lab-notes/page.tsx` — user profile + saved history (integration pass)

### Phase 3 Todos
- [ ] Lab Radio page with curated Spotify/YouTube embeds, CRT frame, persistent audio context
- [ ] Lab Notes profile page, all-feature integration check, final aesthetic pass
- [ ] Final deploy + demo video + LinkedIn post #3 + technical deep-dives

---

## Cross-Cutting Concerns

### Aesthetic System (defined once, used everywhere)
- `constants/theme.ts` — colors (`#00FF41` terminal green, `#0A0A0F` black, `#FF003C` red alerts)
- `styles/crt.css` — scanline overlay, CRT flicker animation, glitch text
- Fonts: "VT323", "Share Tech Mono", "Orbitron" from Google Fonts via `next/font`

### Auth Flow (guest-first)
- Supabase Auth with magic link + Google OAuth
- Guest mode = full functionality, data in `localStorage`
- "Save to Lab Notes" CTA after each interaction nudges signup
- On signup, migrate `localStorage` data to Supabase

### Open-Source Readiness
- `.env.example` listing all required keys (already done)
- `README.md` with screenshots, demo GIF, 5-minute setup section (already done)
- `CONTRIBUTING.md` (already done)
- MIT License (already done)
- GitHub Actions for lint + typecheck (Phase 1)

---

## LinkedIn Posting Plan (the "2nd arrow")

Each phase = a separate LinkedIn post. Don't post once at the end — sustain reach across weeks.

- **After Phase 1**: "I built a Steins;Gate D-Mail simulator with AI" + demo GIF + GitHub link
- **After Phase 2**: "Added Amadeus — a Kurisu chatbot with RAG over the show's lore" + technical breakdown
- **After Phase 3**: "Final cut: Future Gadget Lab is live" + Vercel link + lessons learned
- **Bonus**: 2-3 technical deep-dive posts (RAG implementation, structured outputs, CRT styling)

Total: ~6 LinkedIn posts from one project.

---

## Deliberately NOT Including

- Mobile app version (web first, RN port later if it makes sense)
- Real-time multiplayer / shared timelines (scope creep)
- Payment / pro tiers (free side project, period)
- Custom music hosting (legal nightmare)
- Image generation for timelines (Phase 4 maybe; adds API cost)

---

## Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Groq rate limits | 14,400 req/day is plenty; add per-IP rate limiting at the route handler |
| Supabase free tier limits | 500MB DB — text-only data, will last months/years |
| Copyright on Steins;Gate name/likeness | Clearly fan project, no monetization, no official assets — standard fan-project posture |
| Scope creep | Enforce 3-phase ship discipline ([`AGENTS.md`](./AGENTS.md) §9); resist mid-phase feature additions |
| Prompt drift across versions | Version every system prompt (`VERSION` const) per [`AGENTS.md`](./AGENTS.md) §6.5 |
| LLM hallucinated JSON | Zod validation on every response per [`AGENTS.md`](./AGENTS.md) §6.4 |

---

*This plan is a living document. Update it when you ship a phase. Never let it drift from reality.*

*El Psy Kongroo.*
