# Future Gadget Lab

> *"The universe has a beginning, but no end. — Worldline divergence: 1.048596β"*

A Steins;Gate themed web app that showcases AI engineering through three interconnected "gadgets":

1. **Amadeus** — Chat with an AI Kurisu Makise. Emotion-driven avatar, Edge TTS, CRT video-call UI.
2. **D-Mail Terminal** — Send a message to your past self; AI generates divergent timelines.
3. **Lab Radio** — Curated playlists for late-night lab work. Lofi, Steins;Gate OST, rainy Akihabara ambient.

> This is a fan project. Steins;Gate is the property of 5pb. and Nitroplus. No official assets are used.

---

## Tech Stack

- **Next.js 16** (App Router) + **TypeScript** (strict)
- **Tailwind CSS v4** + **Framer Motion** for the CRT/glitch aesthetic
- **React Three Fiber** for the 3D sprite avatar
- **Gemini 3.5 Flash** via Google AI Studio (OpenAI-compatible endpoint)
- **Edge TTS** (`edge-tts-universal`) for server-side voice synthesis
- **Supabase** for auth, Postgres, and pgvector
- **Vercel** for hosting

See [`AGENTS.md`](./AGENTS.md) for the full architecture and conventions.

---

## Quick Start

```bash
# 1. Clone
git clone https://github.com/YOUR_USERNAME/future-gadget-lab.git
cd future-gadget-lab

# 2. Install
npm install

# 3. Set up env
cp .env.example .env.local
# Then fill in your free keys (see "Getting Your Keys" below)

# 4. Run
npm run dev
```

Open <http://localhost:3000> and the lab is yours.

---

## Getting Your Keys (all free)

| Service | What you need | Where to get it |
|---|---|---|
| **Google AI Studio** | `GEMINI_API_KEY` | <https://aistudio.google.com/app/apikey> |
| **Supabase** | URL + anon key + service role key | <https://supabase.com> → New project |

Paste them into `.env.local`. The app will not start without `GEMINI_API_KEY`.

---

## Project Structure

```
app/         Next.js App Router pages + API routes
components/  Reusable React components (AmadeusAvatar, etc.)
lib/         LLM client, Supabase clients, prompts
constants/   Theme tokens (colors, fonts, motion)
styles/      Global CSS + CRT effects
supabase/    SQL migrations (versioned, forward-only)
scripts/     Dev scripts (sprite rename, emotion testing)
public/
  sprites/   Emotion sprite PNGs — gitignored, drop in locally
```

Full conventions: [`AGENTS.md`](./AGENTS.md)

---

## Roadmap

- **Phase 1** — Amadeus video-call chatbot ← *in progress*
- **Phase 2** — D-Mail Terminal + RAG over Steins;Gate lore
- **Phase 3** — Lab Radio + Lab Notes

See [`AGENTS.md`](./AGENTS.md) for phase discipline rules.

---

## License

[MIT](./LICENSE)

---

*El Psy Kongroo.*
