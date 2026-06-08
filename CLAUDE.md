# CLAUDE.md — Session State

> Snapshot of where we are right now. Update this file before clearing context.
> For full build history see [`ROADMAP.md`](./ROADMAP.md). For rules see [`AGENTS.md`](./AGENTS.md).

---

## Current Position

**Phase 1 — Amadeus chatbot**
**Last completed step: 1.3d** (emotion-driven avatar — `[Emotion]` tag parsed from LLM stream; 20-state animation configs drive `useFrame`)
**Next step: 1.4** — Supabase auth + messages table

---

## What Was Built This Session

| Commit | What |
|---|---|
| `feat: step 1.3c` | R3F Canvas added; `AmadeusAvatar.tsx` created; VRM loaded initially |
| `fix: camera aim + hydration` | Camera was pointing at empty air above model; `loadHistory` hydration mismatch fixed |
| `feat: paper-cutout avatar` | Switched from VRM to `kurisu.png` as R3F texture on a 3D plane — idle float + speaking sway |
| `docs: emotion system in AGENTS.md` | Step 1.3d added to phase table; 20-emotion canonical list documented; `mio/amadeus` TTS noted |
| `feat: step 1.3d` | Prompt v1.2.0 + API route emotion extraction + page emotion state + avatar EMOTION_CONFIGS |

### Current state of `components/AmadeusAvatar.tsx`
- `PNGScene` component: loads `/kurisu.png` via `useTexture` (drei), renders on a `2.02 × 2.8` plane
- `useFrame` drives: idle float (sin 0.6 Hz), side sway (sin 0.4 Hz), speaking micro-sway (~11 Hz) + Y scale pulse
- Canvas: `gl={{ alpha: true }}`, camera at `[0, 0, 2]`, fov 60 — plane centred at origin
- CRT vignette overlay + speaking glow ring (Framer Motion) unchanged
- Dynamically imported in `amadeus/page.tsx` with `ssr: false`

---

## What Step 1.3d Needs to Build

**Goal:** Kurisu prepends `[Emotion]` to every reply. The API strips it and sends it as a separate signal. The avatar plays a different animation variant per emotion.

### Sub-tasks

| # | Task | File(s) |
|---|---|---|
| A | Prompt update v1.2.0 | `lib/prompts/amadeus.ts` — add emotion instruction + 20-emotion list |
| B | API route: strip tag | `app/api/amadeus/chat/route.ts` — parse `[Emotion]` from first chunk, send as `X-Amadeus-Emotion` response header before stream starts |
| C | Page: receive emotion | `app/amadeus/page.tsx` — read header after fetch, store in `emotion` state |
| D | Avatar: react to emotion | `components/AmadeusAvatar.tsx` — map emotion string → animation params (speed, amplitude, tilt direction) |

### 20-emotion canonical list (from AGENTS.md)
```
Default · Very Default · Calm · Serious · Very Serious · Interest · Very Not Interest
Not Interest · Fun · Angry · Sad · Disappoint · Tired · Embrassed · Very Embrassed
Surprise · Wink · Sleep · Closed Sleep · Back
```

### Emotion → animation mapping (suggested)
| Emotion | Avatar behaviour |
|---|---|
| `Default` / `Very Default` | Standard idle float |
| `Calm` / `Serious` / `Very Serious` | Slower sway, reduced amplitude |
| `Interest` | Slight lean forward (negative Z tilt) |
| `Fun` | Faster bounce, +Y offset |
| `Angry` | Fast sharp side-shake on X |
| `Sad` / `Disappoint` | Slow downward drift, dim filter |
| `Tired` | Very slow sway, slight droop |
| `Embrassed` / `Very Embrassed` | Quick head-turn wiggle |
| `Surprise` | Sharp scale pop then settle |
| `Wink` | Gentle forward tilt |
| `Sleep` / `Closed Sleep` | Near-still, dim opacity |
| `Back` | Flip plane 180° (turn away) |

---

## Existing File Map

```
app/
  (marketing)/page.tsx      ← Landing — world line meter + 3 gadget cards
  amadeus/page.tsx          ← Video-call UI ("use client"), messages state, TTS
  api/amadeus/chat/route.ts ← Streaming Groq route (server only)
  layout.tsx                ← Site shell: nav header + footer

components/
  AmadeusAvatar.tsx         ← R3F paper-cutout avatar (dynamic import, ssr:false)
  GadgetCard.tsx            ← Landing page gadget card
  WorldLineMeter.tsx        ← Animated divergence meter in the nav

lib/
  groq.ts                   ← Single Groq client (lazy init)
  prompts/amadeus.ts        ← Kurisu system prompt v1.1.0 + ChatMessage type
  supabase/
    server.ts               ← Server-side Supabase client (reads cookies)
    client.ts               ← Browser-side Supabase client (public anon key)

public/
  kurisu.png                ← AI-generated Kurisu avatar (used as 3D plane texture)
  kurisu.vrm                ← VRM1 placeholder (not currently used — kept for VRM upgrade path)

constants/theme.ts          ← Color tokens, font variables, motion presets
styles/crt.css              ← .crt-frame .crt-scanlines .crt-flicker .glitch-text
supabase/migrations/        ← (empty — first migration in step 1.4)
```

---

## Key env vars

```
GROQ_API_KEY=                         # set in .env.local
NEXT_PUBLIC_SUPABASE_URL=             # needed for 1.4
NEXT_PUBLIC_SUPABASE_ANON_KEY=        # needed for 1.4
SUPABASE_SERVICE_ROLE_KEY=            # needed for 1.4 (server only, never NEXT_PUBLIC_)
```

---

## Known Issues / Watch-outs

- `public/kurisu.vrm` is 10.7 MB committed to git — add to `.gitignore` if size becomes a problem.
- `kurisu.png` background is not transparent — the R3F `alphaTest={0.1}` cuts out near-white pixels. If the PNG has a white background around Kurisu it will show a box. Fix: use a PNG with an actual transparent background.
- Dev server on port 3000 with Turbopack (`npm run dev` already running in terminal 3).
- `THREE.Clock` deprecation warning in browser console — comes from R3F internals, not our code. Harmless.

---

*El Psy Kongroo.*
