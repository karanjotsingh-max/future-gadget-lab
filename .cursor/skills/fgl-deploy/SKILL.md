---
name: fgl-deploy
description: Deploy checklist for shipping a phase to Vercel. Use at the end of each phase (1.5, 2.5, 3.5).
---

# FGL Deploy

Run this checklist at the end of every phase before posting to LinkedIn.

## Step 1 — Local build gate

The build must pass locally before pushing. Vercel will fail the same way.

```bash
npx tsc --noEmit      # 0 TypeScript errors
npm run lint          # 0 ESLint errors
npm run build         # must complete without errors
```

If `npm run build` fails without env vars (Groq key, Supabase keys), that's a bug.
All clients must use lazy init so the build succeeds without secrets.
Check `lib/groq.ts` — the client should initialize on first call, not at module load.

## Step 2 — First-time Vercel setup (do once)

1. Push your branch to GitHub
2. Go to [vercel.com](https://vercel.com) → New Project → Import from GitHub
3. Select the `future-gadget-lab` repo
4. Framework: Next.js (auto-detected)
5. Root directory: `future-gadget-lab` (if the repo root is the parent `Steins Gate` folder)
6. Click Deploy — it will fail because env vars are missing. That's expected.

## Step 3 — Add env vars in Vercel dashboard

Go to Project → Settings → Environment Variables. Add all of these:

| Variable | Where to find it |
|---|---|
| `GROQ_API_KEY` | [console.groq.com](https://console.groq.com) → API Keys |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project → Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase project → Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase project → Settings → API → service_role (keep secret) |

Set all to: Environment = Production + Preview + Development.

## Step 4 — Redeploy

After adding env vars: Deployments → select the latest → Redeploy.
Watch the build log — it should complete with "Build Successful".

## Step 5 — Smoke test the live URL

Open the Vercel URL and test manually:

- [ ] Landing page loads — World Line Meter visible, gadget cards render
- [ ] Amadeus page loads — connecting animation plays
- [ ] Send a message — Kurisu responds (streaming works)
- [ ] No console errors in DevTools
- [ ] Network tab: `/api/amadeus/chat` returns 200, not 401 or 500

## Step 6 — Custom domain (optional, do once)

Vercel → Project → Settings → Domains → Add `futuregadgetlab.app`.
Follow the DNS instructions (add CNAME/A record at your registrar).

## Step 7 — Record the demo

- Use [ScreenToGif](https://www.screentogif.com/) (Windows) or QuickTime (Mac) to record a 15-30s GIF
- Show: landing page → click Amadeus → connecting animation → send a message → Kurisu streams a reply
- Keep the file under 5MB for GitHub README embedding
- Save as `docs/demo-phase-N.gif`

## Step 8 — LinkedIn post

Post immediately after recording. Don't wait.

Phase 1 template:
> I built an AI Kurisu Makise video-call chatbot — fully themed around Steins;Gate.
> Streaming LLM responses, Groq + Next.js + Supabase, open source.
> [Live demo link] · [GitHub link]
> #buildinpublic #nextjs #ai

## Checklist summary

- [ ] `npx tsc --noEmit` — 0 errors
- [ ] `npm run build` — passes locally
- [ ] All env vars added in Vercel dashboard
- [ ] Live URL smoke-tested (landing + feature page + API call)
- [ ] Demo GIF recorded and saved to `docs/`
- [ ] README updated with live URL and demo GIF
- [ ] LinkedIn post published
- [ ] `AGENTS.md` current phase table updated to mark this phase Done
