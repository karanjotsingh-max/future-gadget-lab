# CLAUDE.md — Session State

> Snapshot of where we are right now. Update this file before clearing context.
> For full build history see [`ROADMAP.md`](./ROADMAP.md). For rules see [`AGENTS.md`](./AGENTS.md).

---

## Current Position

**Phase 1 — Amadeus chatbot**
**Last completed step: 1.3c** (3D talking avatar — React Three Fiber + VRM)
**Next step: 1.4** — Supabase auth + messages table

---

## What Was Just Built (1.3c)

| File | What changed |
|---|---|
| `components/AmadeusAvatar.tsx` | New R3F Canvas component — loads `public/kurisu.vrm`, drives mouth + blink animations, transparent bg, CRT vignette |
| `app/amadeus/page.tsx` | Replaced `KurisuAvatar` PNG with `AmadeusAvatar` (dynamic import, `ssr: false`); fixed `loadHistory` lazy init |
| `public/kurisu.vrm` | VRM1_Constraint_Twist_Sample.vrm — CC BY 4.0 from Pixiv/three-vrm (10.7 MB) |
| `package.json` | Added `three`, `@react-three/fiber`, `@react-three/drei`, `@pixiv/three-vrm` |
| `AGENTS.md` | Stack table updated; Key Decisions updated; 1.3c marked Done; 1.4 marked Next |

Last commit: `feat: step 1.3c - 3D talking avatar with React Three Fiber + VRM` on `main`

---

## What Step 1.4 Needs to Build

**Goal:** Replace `localStorage` guest mode with real Supabase auth + persistent message history.

| Sub-task | Detail |
|---|---|
| Supabase project | Create project at supabase.com, add keys to `.env.local` and `.env.example` |
| Migration `001_messages.sql` | `messages` table: `id`, `user_id` (FK to auth.users), `role` (user/assistant), `content`, `created_at`. RLS: users read/write only their own rows. |
| Magic link auth | `lib/supabase/client.ts` already exists. Add sign-in UI (minimal — email input + "Send link" button). |
| Guest migration | On first sign-in, bulk-insert `localStorage` history into the DB, then clear localStorage. |
| Swap history source | After auth, load messages from Supabase instead of localStorage. `saveHistory` writes to Supabase. |

**Skills to use:**
- `fgl-new-migration` — for `001_messages.sql`
- `fgl-step-by-step` — follow one subtask at a time

---

## Existing File Map (Phase 1 so far)

```
app/
  (marketing)/page.tsx      ← Landing — world line meter + 3 gadget cards
  amadeus/page.tsx          ← Video-call UI (client component, "use client")
  api/amadeus/chat/route.ts ← Streaming Groq route (server only)
  layout.tsx                ← Site shell: nav header + footer

components/
  AmadeusAvatar.tsx         ← R3F 3D avatar (dynamic import, ssr:false)
  GadgetCard.tsx            ← Landing page gadget card
  WorldLineMeter.tsx        ← Animated divergence meter in the nav

lib/
  groq.ts                   ← Single Groq client (lazy init)
  prompts/amadeus.ts        ← Kurisu system prompt v1.1.0 + ChatMessage type
  supabase/
    server.ts               ← Server-side Supabase client (reads cookies)
    client.ts               ← Browser-side Supabase client (public anon key)

public/
  kurisu.png                ← AI-generated Kurisu avatar (kept as fallback)
  kurisu.vrm                ← VRM1 3D model (CC BY 4.0, Pixiv, 10.7 MB)

constants/theme.ts          ← Color tokens, font variables, motion presets
styles/crt.css              ← .crt-frame .crt-scanlines .crt-flicker .glitch-text
supabase/migrations/        ← (empty — first migration in step 1.4)
```

---

## Key env vars needed

```
GROQ_API_KEY=                         # already set in .env.local
NEXT_PUBLIC_SUPABASE_URL=             # needed for 1.4
NEXT_PUBLIC_SUPABASE_ANON_KEY=        # needed for 1.4
SUPABASE_SERVICE_ROLE_KEY=            # needed for 1.4 (server only, never NEXT_PUBLIC_)
```

---

## Known Issues / Watch-outs

- `public/kurisu.vrm` is committed to git (10.7 MB). Add to `.gitignore` if repo size becomes a problem; load from CDN instead and update the URL in `AmadeusAvatar.tsx`.
- The VRM model is `VRM1_Constraint_Twist_Sample.vrm` — a neutral anime character, not Kurisu. Replace `public/kurisu.vrm` with a VRoid Studio export whenever a custom model is ready.
- Camera position `[0, 1.45, 0.7]` + model offset `y = -1.45` assumes the VRM model is ~1.7 m tall. Different models may need tweaking.
- Dev server (`npm run dev`) running on port 3000 with Turbopack.

---

*El Psy Kongroo.*
