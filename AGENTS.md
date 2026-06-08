# AGENTS.md — Future Gadget Lab

> Read this BEFORE making any code changes. This is the contract every contributor (human or AI) follows. If a rule here conflicts with a user request, ask for clarification rather than violating the rule.

---

## 1. Project Identity

- **Name**: Future Gadget Lab
- **Type**: Fan-made, non-commercial, open-source web app
- **Theme**: Steins;Gate universe (D-Mail, Amadeus, Future Gadget Lab)
- **Goal**: Showcase AI engineering (LLM, RAG, structured outputs) through anime-themed gadgets
- **Status**: Pre-MVP; building in 3 phases
- **License**: MIT

---

## 2. Tech Stack (locked)

| Layer | Tool | Why |
|---|---|---|
| Framework | Next.js 16 App Router | RSC + route handlers in one repo |
| Language | TypeScript (strict) | Type safety, AI-friendly |
| Styling | Tailwind CSS v4 | Utility-first, themeable |
| Animation | Framer Motion | Declarative, scoped to client |
| Auth + DB | Supabase (`@supabase/supabase-js`) | Free tier covers everything |
| Vector DB | Supabase pgvector | Same DB, one less service |
| LLM | Groq API (`groq-sdk`, Llama 3.3 70B) | Free, fast, OpenAI-compatible |
| Validation | Zod | Runtime schema validation for LLM output + API input |
| Hosting | Vercel | Free tier, Next.js native |

Do NOT introduce new dependencies without updating this table. If you must, justify in the PR description.

---

## 3. Folder Structure

The project root is `future-gadget-lab/` (inside the `Steins Gate` workspace folder). All paths below are from the project root.

```
future-gadget-lab/
├── AGENTS.md, PLAN.md, README.md   # Project docs (this file is here)
├── CONTRIBUTING.md, LICENSE
├── .env.example, .gitignore
├── package.json, tsconfig.json
├── app/
│   ├── (marketing)/         # Landing page route group
│   ├── amadeus/             # Phase 1 feature — Kurisu video-call chatbot
│   ├── d-mail/              # Phase 2 feature — timeline simulator
│   ├── lab-radio/           # Phase 3 feature
│   ├── lab-notes/           # User profile / history
│   └── api/                 # Route handlers (server-only)
│       ├── amadeus/
│       └── d-mail/
├── components/              # Reusable UI (PascalCase)
├── lib/
│   ├── groq.ts              # Single Groq client wrapper
│   ├── supabase/            # server.ts + client.ts
│   ├── prompts/             # ALL LLM prompts live here
│   └── rag/                 # Embedding + retrieval helpers (Phase 2)
├── constants/
│   └── theme.ts             # Color tokens, fonts, motion
├── styles/
│   └── crt.css              # CRT scanlines + glitch
├── supabase/
│   └── migrations/          # Versioned SQL
└── scripts/                 # One-off scripts (seeding, etc.)
```

---

## 4. Critical Security Rules (non-negotiable)

1. **API keys are SERVER-ONLY**. Groq key and Supabase `service_role` key live only in `process.env` accessed from `app/api/**` or server components.
2. **Use `NEXT_PUBLIC_` prefix ONLY** for: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`. Never for Groq, never for service_role.
3. **All LLM calls go through `app/api/**` route handlers**. A client component must never call `fetch("https://api.groq.com/...")`.
4. **Rate-limit every route under `app/api/**`** by IP. Use Upstash Ratelimit or Vercel KV in production — in-memory limiters are forbidden because they reset on every serverless cold start. A local-dev fallback is fine, but it must be gated behind `process.env.NODE_ENV !== "production"`.
5. **Validate every structured LLM output** (`response_format: { type: "json_object" }`) with Zod before sending to the client. Never trust the model. Streaming text responses (see §6.7) are exempt from Zod, but the route must still wrap the stream in a try/catch and never leak raw provider errors to the client.
6. **RLS on every Supabase table**. Default deny, explicit allow.
7. **`.env.local` is gitignored**. `.env.example` is committed with empty values.

---

## 5. Code Conventions

### TypeScript
- `"strict": true` always
- No `any` — use `unknown` + narrowing
- Prefer `type` over `interface` unless extending
- Zod schemas for any external data (LLM responses, form inputs, API params)

### React / Next.js
- **Server Components by default**. Only add `"use client"` if you need state, effects, or browser APIs.
- Components: PascalCase file + default export
- Route handlers: `app/api/<feature>/route.ts`, export named `GET` / `POST`
- No data fetching in client components — pass props from server or use server actions

### Naming
- Files: `kebab-case` for routes, `PascalCase` for components, `camelCase` for utils
- Components: PascalCase (`DivergenceMeter.tsx`)
- Hooks: `useXxx`
- Server actions: verb-first (`saveTimeline`, `sendDMail`)

### Imports
- Absolute imports via `@/` (configured in `tsconfig.json`)
- Order: react/next → external → `@/lib` → `@/components` → relative → types

---

## 6. AI / LLM Conventions

1. **All prompts live in `lib/prompts/<feature>.ts`** as exported constants. Never inline a prompt in a route or component.
2. **One Groq client wrapper** in `lib/groq.ts`. Routes import this, never call `fetch` directly.
3. **Force structured output** via Groq's `response_format: { type: "json_object" }` whenever you need data, not prose.
4. **Validate model output with Zod** immediately after parsing JSON.
5. **System prompts are versioned**: when you change one, bump a `VERSION` constant and note it in the commit.
6. **RAG retrieval**: top-k = 4 unless justified, similarity threshold = 0.75, always include retrieved chunks in the prompt with clear delimiters.
7. **Streaming**: use a native `ReadableStream` for Amadeus, never block. The Vercel AI SDK (`ai` package) is not in the locked stack — if you want it, add it to §2 in the same PR with justification.
8. **Canon-spelling guard for LLM output**: every system prompt that produces user-facing text must include the canon spellings list from §7.5 verbatim, with an instruction to use those exact forms. Add a unit test or Zod refinement for terms that appear in structured outputs.

Template every prompt file follows:

```ts
// lib/prompts/dmail.ts
import { z } from "zod";

export const DMAIL_PROMPT_VERSION = "1.0.0";

export const DMAIL_SYSTEM_PROMPT = `You are the Steins;Gate worldline computer...`;

export const DMailResponseSchema = z.object({
  timelines: z
    .array(
      z.object({
        divergence: z.number(),
        summary: z.string(),
        fullStory: z.string(),
        readingSteinerNote: z.string(),
      })
    )
    .length(3),
});

export type DMailResponse = z.infer<typeof DMailResponseSchema>;
```

---

## 7. Theme & UI Rules

1. **No hex codes inline**. Use tokens from `constants/theme.ts`:
   ```ts
   export const theme = {
     bg: "#0A0A0F",
     terminalGreen: "#00FF41",
     amadeusPurple: "#7B2FBE",
     alertRed: "#FF003C",
     textCold: "#E8EAFF",
   } as const;
   ```
2. **CRT effects only via `styles/crt.css`** classes (`.crt-frame`, `.crt-scanlines`, `.crt-flicker`, `.glitch-text`).
3. **Fonts**: `VT323` for terminal output, `Share Tech Mono` for UI, `Orbitron` for headings. Loaded via `next/font`.
4. **Animation**: only Framer Motion, kept short (150-400ms) except for "level up" / "world line shift" dramatic moments.
5. **Canon spellings — non-negotiable**:
   - Reading Steiner (NOT Reading Stainer)
   - El Psy Kongroo (NOT El Psy Congroo)
   - world line (two words, lowercase unless in a title)
   - Hououin Kyouma (NOT Houoin)
   - Future Gadget Lab (capitalized)
   - D-Mail (hyphenated, capital D and M)
6. **No emojis in UI text**. The aesthetic is monospace symbols (`>`, `█`, `▓`, `░`, `■`).

---

## 8. Anti-Patterns (will reject in review)

- Inline LLM prompts in components or routes
- `fetch` calls from client components to external APIs
- Hardcoded colors / fonts / spacing in JSX
- `any` types
- `useEffect` for data fetching — use server components or server actions. No client-side query library (React Query / SWR / etc.) until one is added to §2.
- Direct Supabase client calls that bypass RLS
- Copyrighted assets (official Steins;Gate art, music files, character sprites)
- Emoji in UI
- New top-level dependencies without updating the stack table
- Feature work in Phase N+1 while Phase N is unshipped

---

## 9. Workflow Rules

1. **Phase discipline**: complete the current phase before starting the next. Each phase ends with a deploy + LinkedIn post.
2. **One feature, one PR**: keep commits scoped. PR title format: `[Phase N] feature: short description`.
3. **Tests** (when added in Phase 2+): colocate as `*.test.ts` next to source.
4. **Migrations are forward-only**. Never edit a committed migration; create a new one.
5. **Commit message style**: imperative mood, lowercase prefix (`feat:`, `fix:`, `chore:`, `docs:`, `refactor:`).

---

## 10. When in Doubt

- If a user request conflicts with a rule here → flag it, don't silently violate
- If a rule here is unclear → ask before guessing
- If you're about to add a dependency → check section 2 first
- If you're about to inline a prompt → put it in `lib/prompts/` instead
- If you're about to use `any` → use `unknown` and narrow

---

*This file is the contract. Update it when the architecture evolves, but never bypass it.*

*El Psy Kongroo.*
