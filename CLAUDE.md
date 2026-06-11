# CLAUDE.md — Session State

> Update this file before clearing context. Rules → [`AGENTS.md`](./AGENTS.md). History → [`ROADMAP.md`](./ROADMAP.md).

---

## Current Position

**Phase 1 — Amadeus chatbot**
**Last completed:** 1.3f — Remove VRM artifacts, unused deps, default Next.js assets
**Next:** 1.3g — Full sprite usage (frontend-driven emotions for all UI/system events)

---

## LLM Setup

| Key | Value |
|---|---|
| Provider | Google AI Studio — OpenAI-compat endpoint |
| Model | `gemini-3.5-flash` |
| SDK | `groq-sdk` pointed at Gemini `baseURL` (`lib/llm.ts`) |
| `max_tokens` | 220 · `temperature` 0.85 |
| Prompt | v1.4.0, 10 few-shot pairs (`lib/prompts/amadeus.ts`) |
| Emotion accuracy | 14-15/20 (70-75%) — re-run `scripts/test-emotions.mjs` to confirm with Gemini |

---

## Next Step Detail — 1.3g Full Sprite Usage

All 20 emotions reachable via two sources feeding the same `setEmotion()`:

| Trigger | Sprite | Where in code |
|---|---|---|
| Request starts | `Calm` | `sendMessage()` before fetch |
| LLM reply | LLM-chosen | `X-Amadeus-Emotion` header (existing) |
| API error | `Closed Sleep` | `catch` block |
| Rate limit 429 | `Tired` | `res.status === 429` check |
| Page connects | `Wink` → reverts after 1.5s | `status === "online"` |
| Idle 3 min | `Tired` | `setTimeout`, reset on keystroke |
| Idle 8 min | `Sleep` | second `setTimeout` |
| User wakes | `Surprise` → reverts after 2s | clear timers on input |
| Clear history | `Back` → reverts after 2s | `clearHistory()` |

Implementation: two `useRef<ReturnType<typeof setTimeout>>` idle timers; clear in cleanup `useEffect`.

---

## File Map

```
app/
  (marketing)/page.tsx       ← Landing page
  amadeus/page.tsx           ← Video-call UI (emotion state, TTS, localStorage history)
  api/amadeus/chat/route.ts  ← Streaming route; extracts [Emotion] tag → X-Amadeus-Emotion header
  api/amadeus/tts/route.ts   ← Edge TTS → audio/mpeg

components/
  AmadeusAvatar.tsx          ← R3F sprite avatar (20 emotions, 5Hz mouth toggle, per-emotion body anim)

lib/
  llm.ts                     ← Gemini client (lazy init); LLM_MODEL = "gemini-3.5-flash"
  prompts/amadeus.ts         ← Prompt v1.4.0 + few-shot pairs + CANONICAL_EMOTIONS
  supabase/server.ts         ← Server Supabase client
  supabase/client.ts         ← Browser Supabase client

public/
  kurisu.png                 ← Fallback avatar
  sprites/                   ← Gitignored; kurisu-{slug}.png + kurisu-{slug}-open.png (20 emotions)

scripts/
  rename-sprites.mjs         ← Maps CRS_JL*.png → kurisu-{slug}.png
  test-emotions.mjs          ← Automated 20-message emotion accuracy test
```

---

## Env Vars

```
GEMINI_API_KEY=               # Google AI Studio
NEXT_PUBLIC_SUPABASE_URL=     # step 1.4
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=    # server only
```

---

## Watch-outs

- Sprites flash briefly on emotion change (TextureLoader per emotion, no preload)
- `THREE.Clock` deprecation warning in console — R3F internals, harmless
- **Don't use `Invoke-WebRequest`** for API testing — hangs on chunked streams. Use `node -e "fetch(...)"`.
- Edge TTS adds ~1s latency. `isSpeaking` fires on `audio.play()`, not fetch start.
- Sprites in `public/sprites/` must be set up locally: `node scripts/rename-sprites.mjs <path>`

---

## Step 1.4 Plan (after 1.3g)

- SQL migration: `amadeus_messages` table + RLS → use `fgl-new-migration` skill
- Auth modal: `components/AuthModal.tsx` → use `fgl-new-component` skill
- Swap `localStorage` → Supabase when signed in; guest mode stays on localStorage

---

*El Psy Kongroo.*
