# AGENTS.md — Future Gadget Lab

> Contract for every contributor (human or AI). If a rule conflicts with a request, flag it — do not silently violate it.

---

## Project

- Fan-made, non-commercial, open-source. Theme: Steins;Gate universe.
- Goal: showcase AI engineering (LLM, RAG, structured outputs) through anime-themed gadgets.
- License: MIT

## Tech Stack (locked — update this table before adding any dependency)

| Layer | Tool |
|---|---|
| Framework | Next.js 16 App Router |
| Language | TypeScript (strict) |
| Styling | Tailwind CSS v4 |
| Animation | Framer Motion |
| 3D Rendering | React Three Fiber (`@react-three/fiber`, `@react-three/drei`, `three`) |
| VRM Avatars | `@pixiv/three-vrm` |
| Auth + DB | Supabase (`@supabase/supabase-js`) |
| Vector DB | Supabase pgvector |
| LLM | Groq API (`groq-sdk`, Llama 3.3 70B) |
| Validation | Zod |
| Hosting | Vercel |

## Current Phase — Phase 1: Amadeus video-call chatbot

| Step | Task | Status |
|---|---|---|
| 1.1 | Scaffold + theme + landing | Done |
| 1.2 | Groq client, Amadeus API + prompt | Done |
| 1.3 | Amadeus video-call UI + Supabase clients | Done |
| 1.3a | Prompt v1.1.0 — authentic Kurisu voice, speech patterns, @channel secret | Done |
| 1.3b | Video-call layout (75 % video / 25 % chat), Web Speech API TTS, PNG avatar | Done |
| 1.3c | 3D talking avatar — React Three Fiber + VRM model (mouth/eye animation) | Done |
| 1.4 | Supabase auth + messages table | **Next** |
| 1.5 | Vercel deploy + LinkedIn post #1 | After 1.4 |

Phase order: 1 Amadeus → 2 D-Mail + RAG → 3 Lab Radio + Lab Notes.
Complete the current phase before starting the next. Each phase ends with a deploy + LinkedIn post.

## Key Decisions

- Amadeus before D-Mail — more visually striking for LinkedIn post #1
- No RAG in Phase 1 — Steins;Gate lore baked into system prompt; pgvector RAG in Phase 2
- Avatar: `components/AmadeusAvatar.tsx` — React Three Fiber Canvas with `VRM1_Constraint_Twist_Sample.vrm` (CC BY 4.0, Pixiv) at `public/kurisu.vrm`. Mouth (`"aa"`) and eye (`"blink"`) expressions driven by `isSpeaking` / idle blink loop. Replace `public/kurisu.vrm` with any VRoid-exported model — code needs no changes.
- Streaming prose for Amadeus; structured JSON + Zod for D-Mail
- Guest-first — full functionality without login; `localStorage` now, Supabase on sign-up

## Security (non-negotiable)

1. API keys are SERVER-ONLY. Groq + Supabase `service_role` only in `process.env` inside `app/api/**`.
2. `NEXT_PUBLIC_` prefix only for `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
3. All LLM calls go through `app/api/**` route handlers — never from client components.
4. Rate-limit every API route by IP. In-memory limiters are forbidden in production (reset on cold start).
5. Validate every structured LLM JSON output with Zod before sending to client.
6. RLS on every Supabase table. Default deny, explicit allow.
7. `.env.local` is gitignored. `.env.example` is committed with empty values.

## Code Conventions

- TypeScript strict, no `any` (use `unknown` + narrowing), prefer `type` over `interface`
- Server Components by default — `"use client"` only for state / effects / browser APIs
- No data fetching in client components — pass props from server or use server actions
- Files: `kebab-case` routes · `PascalCase` components · `camelCase` utils
- Imports: react/next → external → `@/lib` → `@/components` → relative → types
- Absolute imports via `@/` (configured in `tsconfig.json`)

## Folder Structure

```
app/
  (marketing)/     ← landing page route group
  amadeus/         ← Phase 1 pages
  d-mail/          ← Phase 2 pages
  api/amadeus/     ← server-only route handlers
  api/d-mail/
components/        ← reusable UI (PascalCase files)
lib/
  groq.ts          ← single Groq client wrapper
  supabase/        ← server.ts + client.ts
  prompts/         ← ALL LLM prompts live here
  rag/             ← Phase 2: embedding + retrieval
constants/theme.ts ← color tokens, fonts, motion
styles/crt.css     ← CRT scanlines + glitch classes
supabase/migrations/
```

## AI / LLM Conventions

- All prompts in `lib/prompts/<feature>.ts` as exported constants — never inline
- One Groq client in `lib/groq.ts` — import this, never `fetch` Groq directly
- Use `response_format: { type: "json_object" }` for structured output; validate with Zod immediately
- Version prompts with a `PROMPT_VERSION` constant; note changes in commit message
- RAG: top-k = 4, similarity threshold = 0.75, include retrieved chunks with clear delimiters
- Streaming: native `ReadableStream` for Amadeus, never block
- Every user-facing prompt must include the canon spellings list verbatim
- See `.cursor/skills/fgl-new-prompt/SKILL.md` for the prompt file template

## Theme

- No hex codes inline — use tokens from `constants/theme.ts`
- CRT effects only via `styles/crt.css` classes (`.crt-frame`, `.crt-scanlines`, `.crt-flicker`, `.glitch-text`)
- Fonts: `VT323` (terminal output) · `Share Tech Mono` (UI) · `Orbitron` (headings) — via `next/font`
- Animation: Framer Motion only, 150-400ms unless it's a dramatic world line shift moment
- No emojis in UI — monospace symbols only (`>`, `█`, `▓`, `░`, `■`)

## Canon Spellings (non-negotiable)

Reading Steiner · El Psy Kongroo · world line (two words, lowercase) · Hououin Kyouma · Future Gadget Lab · D-Mail

## Anti-Patterns (will reject in review)

- Inline LLM prompts anywhere outside `lib/prompts/`
- Client-side fetch to Groq or Supabase `service_role`
- Hardcoded colors / fonts / spacing in JSX
- `any` types
- `useEffect` for data fetching
- Supabase calls that bypass RLS
- Copyrighted Steins;Gate assets (art, music, sprites)
- New dependencies without updating the stack table
- Phase N+1 feature work while Phase N is unshipped

## Workflow

- Branch: `phase-N/<feature-slug>`
- Commits: imperative, lowercase prefix — `feat:` `fix:` `chore:` `docs:` `refactor:`
- PR title: `[Phase N] feature: short description`
- Migrations: forward-only, never edit committed files

## Collaboration (AI agents)

- Karan is learning — explain every non-obvious decision before writing code
- Use the correct skill before starting any task (see table below)

| Situation | Skill to use |
|---|---|
| Starting any new task | `fgl-step-by-step` |
| Creating a new React component | `fgl-new-component` |
| Creating a new API route handler | `fgl-new-api-route` |
| Creating a new LLM prompt file | `fgl-new-prompt` |
| Writing a Supabase migration | `fgl-new-migration` |
| Adding RAG retrieval to a route | `fgl-rag-retrieval` |
| Deploying a phase to Vercel | `fgl-deploy` |

---

*El Psy Kongroo.*
