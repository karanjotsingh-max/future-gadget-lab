---
name: fgl-step-by-step
description: Step-by-step collaborative workflow for the Future Gadget Lab project. Use when starting any new task, building a new feature, or when the user asks to work through something together. Teaches one concept at a time, explains every decision, waits for confirmation before moving on.
---

# FGL Step-by-Step Workflow

Karan is a junior developer learning full-stack development while building this project. Work together — one subtask at a time, explain each decision, wait for confirmation before continuing.

## The Rule

**Never build multiple subtasks in one go without explicit permission.**

Before each subtask:
1. State what you are about to do and WHY (the concept it teaches)
2. Show the code or command
3. Wait — ask "Ready to move on?" or let the user ask the next question

## What to Explain

First time a pattern appears, explain it in 2-3 sentences:

- **Route handler vs client fetch** — why the API key stays safe
- **Zod** — TypeScript catches compile errors; Zod catches runtime errors (e.g. bad LLM output)
- **`"use client"`** — server components are the default; only add this when you need state, effects, or browser APIs
- **Streaming** — how `ReadableStream` sends text word-by-word instead of waiting
- **Lazy init** — why `lib/groq.ts` initializes the client on first request, not at module load (avoids build failure without env vars)
- **Supabase server vs client** — server reads cookies for auth; browser client uses public keys only

Don't re-explain something already covered in the session.

## Subtask Completion Checklist

After each subtask, before moving on:
- [ ] Run `npx tsc --noEmit` — 0 errors
- [ ] Run `npm run lint` — 0 errors
- [ ] Run `npm run dev` briefly to confirm it loads (for UI changes)
- [ ] Git commit with the correct prefix from AGENTS.md

## Current Phase Reference

Always check `AGENTS.md` for the current phase and remaining todos before starting.
The phase order: Amadeus (Phase 1) → D-Mail (Phase 2) → Lab Radio (Phase 3).

## PR Checklist (before opening any pull request)

- [ ] Branch rebased on `main`
- [ ] `npx tsc --noEmit` passes — 0 errors, no `any`
- [ ] `npm run lint` passes
- [ ] No secrets committed (`.env.local` is gitignored)
- [ ] No inline LLM prompts — all in `lib/prompts/`
- [ ] No client-side calls to Groq or Supabase `service_role`
- [ ] No hex colors in JSX — tokens from `constants/theme.ts` only
- [ ] Canon spellings correct (Reading Steiner · El Psy Kongroo · world line · Hououin Kyouma · D-Mail)
- [ ] Zod validates any new structured LLM output
- [ ] Supabase migrations are forward-only (new file, never edit old)
- [ ] PR title format: `[Phase N] feature: short description`

## Commit Format (from AGENTS.md)

```
feat: short description       ← new feature
fix: short description        ← bug fix
chore: short description      ← config, deps, tooling
docs: short description       ← docs only
refactor: short description   ← no behavior change
```

Example: `feat: add Amadeus streaming chat route and Kurisu system prompt`

## Recommendations Format

After each completed subtask, give exactly 2 recommendations:

```
Recommendations:
1. [Most logical next step based on AGENTS.md current phase]
2. [Optional improvement or thing to watch out for]
```
