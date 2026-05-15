# Contributing to Future Gadget Lab

Thank you for considering a contribution. Read this first to keep merges smooth.

---

## Before You Code

1. **Read [`AGENTS.md`](./AGENTS.md)**. It is the project contract — security, conventions, anti-patterns. Anything that violates it will be rejected in review.
2. Open an issue describing your change before writing code (unless it's a tiny fix).
3. Check the current phase. We finish phases in order:
   - Phase 1 — D-Mail Terminal
   - Phase 2 — Amadeus chatbot
   - Phase 3 — Lab Radio + Lab Notes
   Feature work for a later phase is not accepted until the current one ships.

---

## Local Setup

```bash
git clone https://github.com/YOUR_USERNAME/future-gadget-lab.git
cd future-gadget-lab
npm install
cp .env.example .env.local   # fill in your own keys
npm run dev
```

You'll need free accounts on Groq and Supabase. See the [README](./README.md) for links.

---

## Branch & Commit Style

- Branch name: `phase-N/<short-feature-slug>` (example: `phase-1/divergence-meter`)
- Commit messages: imperative mood, lowercase prefix
  - `feat: add divergence meter component`
  - `fix: prevent dmail from leaking groq key`
  - `chore: bump tailwind to 4.0.1`
  - `docs: clarify rag retrieval threshold`
  - `refactor: extract prompt to lib/prompts`

---

## Pull Request Checklist

Before opening a PR, confirm:

- [ ] Branch is rebased on `main`
- [ ] `npm run typecheck` passes (no `any`, no errors)
- [ ] `npm run lint` passes
- [ ] No secrets committed (re-check `.env.local` is ignored)
- [ ] No inline LLM prompts — they live in `lib/prompts/`
- [ ] No client-side calls to external LLM APIs
- [ ] No hex colors in JSX — use tokens from `constants/theme.ts`
- [ ] Steins;Gate terms use canon spelling (see `AGENTS.md` §7.5)
- [ ] Zod validates any new LLM JSON output
- [ ] Supabase migrations are forward-only (new file, never edit old)

PR title format: `[Phase N] feature: short description`

---

## What Makes a Great Contribution

- Small, focused PRs (one feature or fix)
- Screenshots / GIFs for UI changes
- Updated `AGENTS.md` if the architecture changes
- Tests for non-trivial logic (Phase 2+)
- A short note in the PR body about *why*, not just *what*

---

## What Will Get Rejected

- Adding commercial / monetization features
- Including copyrighted Steins;Gate assets (official art, music, audio)
- Bypassing security rules in `AGENTS.md` §4
- Adding heavyweight dependencies without justification
- Drive-by stylistic rewrites unrelated to the change

---

## Communication

- Open an issue for bugs or feature ideas
- Use GitHub Discussions for general questions
- Be kind. This is a side project people work on in their free time.

---

*El Psy Kongroo.*
