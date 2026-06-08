# CLAUDE.md — Session State

> Snapshot of where we are right now. Update this file before clearing context.
> For full build history see [`ROADMAP.md`](./ROADMAP.md). For rules see [`AGENTS.md`](./AGENTS.md).

---

## Current Position

**Phase 1 — Amadeus chatbot**
**Last completed step: 1.3e** — Edge TTS + prompt v1.4.0 + avatar pendulum fix
**Next step: 1.4** — Supabase auth + messages table

---

## What Was Built (all sessions)

| Commit | What |
|---|---|
| `feat: step 1.3d` | Prompt v1.2.0 + API emotion extraction + page emotion state + avatar EMOTION_CONFIGS |
| `fix: scale up avatar animation amplitudes` | Idle float/sway now visible (was ±4px, now ±13px) |
| `feat: sprite-swap avatar system + rename script` | AmadeusAvatar loads emotion-specific PNGs; 5Hz mouth toggle during TTS |
| `fix: handle CRS_JLF Back sprite naming` | scripts/rename-sprites.mjs correctly maps Back sprite |
| `fix: correct sprite cropping, remove pendulum rotation, fix CRT scanline overlap and sRGB colors` | Camera z=3, correct aspect ratio (852×1411), z-rotation removed, SRGBColorSpace on textures, zIndex:10 lifts avatar above `.crt-frame::after` |
| `chore: ignore non-sprite files in public/sprites` | .gitignore updated for .gif/.wav/_nul from Drive pack |
| `refactor: prompt v1.3.0` | Slim system prompt (~50% shorter); replace speech-pattern rules with 6 few-shot pairs; fix character: Amadeus (SG0 AI) not real Kurisu |
| `fix: prompt v1.3.1` | Cut max_tokens 600→220; terse 1-2 sentence replies; shorten few-shot examples; add `scripts/test-emotions.mjs` |
| `fix: in-world error message + switch model to qwen3-32b` | Replace `[CONNECTION ERROR: ...]` bubble with `...[ TRANSMISSION INTERRUPTED ]`; API 500 returns plain text |
| `chore: switch model to llama-4-scout` | qwen3-32b abandoned (slow — thinking mode); switched to `meta-llama/llama-4-scout-17b-16e-instruct` |
| `feat: step 1.3e -- Edge TTS, prompt v1.4.0, avatar pendulum fix` | Replace Web Speech API with `edge-tts-universal`; new `/api/amadeus/tts` route; prompt v1.4.0 with 10 few-shot pairs; fix Embrassed Z-rotation pendulum → slow X-sway; emotion accuracy 9→14-15/20 |

---

## Current LLM Setup

| Key | Value |
|---|---|
| Provider | Groq API |
| Model | `meta-llama/llama-4-scout-17b-16e-instruct` (Llama 4, MoE, fast) |
| `max_tokens` | 220 |
| `temperature` | 0.85 |
| Free tier limit | 100k TPD per model (separate bucket from llama-3.3-70b) |
| Prompt version | v1.4.0 |
| Few-shot pairs | 10 (in `AMADEUS_FEW_SHOT`, injected between system + user messages) |

**Tested emotion accuracy (automated):** 14-15/20 (70-75%) on `test-emotions.mjs`.
Known hard ceiling: `Calm` vs `Tired` on same topic needs conversation history. `Very Serious` vs `Serious` near-identical. Remaining misfires acceptable for real usage.

### Gemini migration (future option)
If Groq limits become a problem: Gemini 2.0 Flash via AI Studio free tier gives **1M TPD** (10×).
Can be done via the OpenAI-compatible endpoint — no new npm package needed:
```ts
// lib/groq.ts — swap to Gemini without changing route code
new Groq({
  apiKey: process.env.GEMINI_API_KEY,
  baseURL: "https://generativelanguage.googleapis.com/v1beta/openai/",
})
// GROQ_MODEL = "gemini-2.0-flash"
```
Add `GEMINI_API_KEY` to `.env.local` and `.env.example`. Update `AGENTS.md` stack table.

---

## Current State of `components/AmadeusAvatar.tsx`

- **Sprite system**: `useEffect` loads `kurisu-{slug}.png` + `kurisu-{slug}-open.png` via `THREE.TextureLoader` per emotion. Falls back to `/kurisu.png` on 404.
- **Mouth toggle**: During `isSpeaking`, alternates base ↔ open texture at 5 Hz (`Math.sin(t * Math.PI * 10) > 0`)
- **Body animation**: Y-float only. X-shake for `Angry` (fast, 9 Hz). Slow X-sway for `Embrassed`/`Very Embrassed` (1.8/2.5 Hz — nervous shift). No Z rotation on any emotion (flat sprites tilt like a pendulum).
- **Canvas**: `gl={{ alpha: true }}`, camera at `[0, 0, 3]`, fov 60
- **Plane**: `3.0 × 1.81` (852/1411 aspect ratio — matches actual CRS_JL sprite dimensions)
- **Color fix**: `t.colorSpace = THREE.SRGBColorSpace` on all loaded textures
- **CRT fix**: Avatar div has `zIndex: 10` to sit above `.crt-frame::after` scanline overlay
- Dynamically imported in `amadeus/page.tsx` with `ssr: false`

## Current State of `app/amadeus/page.tsx`

- **TTS**: `speakEdgeTTS()` — POST to `/api/amadeus/tts`, receive `audio/mpeg` blob, play via `new Audio(url)`. `audioRef` tracks active audio element for clean stop/cancel.
- **isSpeaking**: Set on `audio.play()` start, cleared on `audio.onended` — accurately tracks actual playback (not fetch start).
- **Voice toggle**: `stopAudio()` pauses current audio and revokes blob URL. No memory leaks.
- **History**: `localStorage` (key `amadeus_history_v1`, last 40 messages). Supabase persistence wired in step 1.4.

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
  amadeus/page.tsx          ← Video-call UI ("use client"); Edge TTS, emotion state, localStorage history
  api/amadeus/chat/route.ts ← Streaming route; buffers first chunks to extract [Emotion];
                               sends X-Amadeus-Emotion header before streaming clean text
  api/amadeus/tts/route.ts  ← POST { text } → audio/mpeg via edge-tts-universal (en-US-JennyNeural)
  layout.tsx                ← Site shell: nav header + footer

components/
  AmadeusAvatar.tsx         ← Sprite avatar: emotion slug → texture swap + 5Hz mouth toggle
  GadgetCard.tsx            ← Landing page gadget card
  WorldLineMeter.tsx        ← Animated divergence meter in the nav

lib/
  groq.ts                   ← Single Groq client (lazy init); GROQ_MODEL constant here
  prompts/amadeus.ts        ← Prompt v1.4.0 + AMADEUS_FEW_SHOT (10 pairs) + CANONICAL_EMOTIONS + Zod schemas
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
  test-emotions.mjs         ← Fires 20 trigger messages at local API; checks X-Amadeus-Emotion header

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
- `alphaTest={0.1}` on `meshBasicMaterial` cuts out semi-transparent pixels. VN sprites have transparent backgrounds — works correctly.
- Groq free tier: 100k TPD. Running `test-emotions.mjs` (20 requests) burns ~1,500 tokens — run sparingly.
- **Do not use `Invoke-WebRequest` to test the API** — it hangs on chunked streaming responses. Use `node -e "fetch(...)"` instead.
- Edge TTS (`edge-tts-universal`) adds ~1s latency before audio starts (TTS round-trip to Microsoft's servers). `isSpeaking` triggers on playback start, not fetch start — avatar mouth stays accurate.
- TTS Phase 2 upgrade: `Loke-60000/christina-TTS` (Qwen3-TTS 0.9B fine-tuned on Kurisu's English voice). Requires Python sidecar + CUDA. `/api/amadeus/tts` should proxy to `CHRISTINA_TTS_URL` env var when set, falling back to Edge TTS.

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
Use `fgl-new-component` skill before building `AuthModal`.

---

*El Psy Kongroo.*
