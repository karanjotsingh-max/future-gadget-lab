# CLAUDE.md — Session State

> Snapshot of where we are right now. Update this file before clearing context.
> For full build history see [`ROADMAP.md`](./ROADMAP.md). For rules see [`AGENTS.md`](./AGENTS.md).

---

## Current Position

**Phase 1 — Amadeus chatbot**
**Last completed step: 1.3d** — Full emotion-driven sprite avatar (VN sprites + mouth toggle + body animation)
**Next step: 1.4** — Supabase auth + messages table

---

## What Was Built This Session

| Commit | What |
|---|---|
| `feat: step 1.3d` | Prompt v1.2.0 + API emotion extraction + page emotion state + avatar EMOTION_CONFIGS |
| `refactor: prompt v1.3.0` | Slim system prompt (~50% shorter); replace speech-pattern rules with 5 few-shot pairs in `AMADEUS_FEW_SHOT`; inject in API route |
| `fix: scale up avatar animation amplitudes` | Idle float/sway now visible (was ±4px, now ±13px) |
| `feat: sprite-swap avatar system + rename script` | AmadeusAvatar loads emotion-specific PNGs; 5Hz mouth toggle during TTS |
| `fix: handle CRS_JLF Back sprite naming` | scripts/rename-sprites.mjs correctly maps Back sprite |
| `fix: correct sprite cropping, remove pendulum rotation, fix CRT scanline overlap and sRGB colors` | Camera z=3, correct aspect ratio (852×1411), z-rotation removed, SRGBColorSpace on textures, zIndex:10 lifts avatar above `.crt-frame::after` |
| `chore: ignore non-sprite files in public/sprites` | .gitignore updated for .gif/.wav/_nul from Drive pack |

---

## Current State of `components/AmadeusAvatar.tsx`

- **Sprite system**: `useEffect` loads `kurisu-{slug}.png` + `kurisu-{slug}-open.png` via `THREE.TextureLoader` per emotion. Falls back to `/kurisu.png` on 404.
- **Mouth toggle**: During `isSpeaking`, alternates base ↔ open texture at 5 Hz (`Math.sin(t * Math.PI * 10) > 0`)
- **Body animation**: Y-float only (no Z rotation — looks wrong on flat sprites). X-shake for `Angry`. `swayAmp` only for `Embrassed` head-wiggle.
- **Canvas**: `gl={{ alpha: true }}`, camera at `[0, 0, 3]`, fov 60
- **Plane**: `3.0 × 1.81` (852/1411 aspect ratio — matches actual CRS_JL sprite dimensions)
- **Color fix**: `t.colorSpace = THREE.SRGBColorSpace` on all loaded textures
- **CRT fix**: Avatar div has `zIndex: 10` to sit above `.crt-frame::after` scanline overlay
- Dynamically imported in `amadeus/page.tsx` with `ssr: false`

## Sprite Setup

- Files live in `public/sprites/` (gitignored)
- Rename script: `node scripts/rename-sprites.mjs <path>` maps `CRS_JL*.png` → `kurisu-{slug}.png`
- Source: Google Drive pack (Large distance sprites, mouth variants 00=closed, 02=open)
- All 20 emotions covered; 19 have mouth-open variants (Back has one file only)
- `public/sprites/.gitkeep` is committed; all PNGs/GIFs/WAVs are gitignored

---

## Existing File Map

```
app/
  (marketing)/page.tsx      ← Landing — world line meter + 3 gadget cards
  amadeus/page.tsx          ← Video-call UI ("use client"), messages state, TTS, emotion state
  api/amadeus/chat/route.ts ← Streaming Groq route; buffers first chunks to extract [Emotion];
                               sends X-Amadeus-Emotion header before streaming clean text
  layout.tsx                ← Site shell: nav header + footer

components/
  AmadeusAvatar.tsx         ← Sprite avatar: emotion slug → texture swap + 5Hz mouth toggle
  GadgetCard.tsx            ← Landing page gadget card
  WorldLineMeter.tsx        ← Animated divergence meter in the nav

lib/
  groq.ts                   ← Single Groq client (lazy init)
  prompts/amadeus.ts        ← Prompt v1.2.0 + CANONICAL_EMOTIONS + AmadeusEmotion type
  supabase/
    server.ts               ← Server-side Supabase client (reads cookies)
    client.ts               ← Browser-side Supabase client (public anon key)

public/
  kurisu.png                ← Fallback avatar (used when sprites not found)
  kurisu.vrm                ← VRM1 placeholder (not used — kept for future upgrade)
  sprites/                  ← Gitignored PNGs; .gitkeep committed
    kurisu-{slug}.png       ← Closed-mouth expression per emotion (20 files)
    kurisu-{slug}-open.png  ← Open-mouth talking variant (19 files)

scripts/
  rename-sprites.mjs        ← Maps CRS_JL*.png from Drive pack → kurisu-{slug}.png

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
- Sprites are loaded per-emotion via `THREE.TextureLoader` in `useEffect`. On slow connections there's a brief flash of the fallback `kurisu.png` between emotion changes until the new sprite loads. Can fix with preloading if needed.
- Dev server on port 3000 with Turbopack (`npm run dev`).
- `THREE.Clock` deprecation warning in browser console — from R3F internals, harmless.
- The `alphaTest={0.1}` on `meshBasicMaterial` cuts out semi-transparent pixels. VN sprites have transparent backgrounds — should work correctly.

---

## Step 1.4 Plan (next)

| Sub-task | File(s) |
|---|---|
| SQL migration — `amadeus_messages` table + RLS | `supabase/migrations/0001_amadeus_messages.sql` |
| Server Supabase client plumbing | `lib/supabase/server.ts` (already exists) |
| Auth UI (sign-in modal or page) | `components/AuthModal.tsx` or `app/auth/` |
| Swap `localStorage` → Supabase on sign-in | `app/amadeus/page.tsx` — conditional persist |
| Guest mode stays | `localStorage` still used when not signed in |

Use `fgl-new-migration` skill before writing any SQL.

---

*El Psy Kongroo.*
