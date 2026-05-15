# Future Gadget Lab

> *"The universe has a beginning, but no end. — Worldline divergence: 1.048596β"*

A Steins;Gate themed web app that showcases AI engineering through three interconnected "gadgets":

1. **D-Mail Terminal** — Send a message to your past self; AI generates three divergent timelines with a Worldline Divergence Meter.
2. **Amadeus** — Chat with an AI Kurisu Makise. Personality-locked LLM with persistent memory and RAG over Steins;Gate lore.
3. **Lab Radio** — Curated playlists for late-night lab work. Lofi, Steins;Gate OST, rainy Akihabara ambient.

> This is a fan project. Steins;Gate is the property of 5pb. and Nitroplus. No official assets are used.

---

## Tech Stack

- **Next.js 15** (App Router) + **TypeScript** (strict)
- **Tailwind CSS** + **Framer Motion** for the CRT/glitch aesthetic
- **Supabase** for auth, Postgres, and pgvector
- **Groq API** (Llama 3.3 70B) for fast, free LLM inference
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

## Getting Your Keys (all free, all 5 minutes)

| Service | What you need | Where to get it |
|---|---|---|
| **Groq** | API key | <https://console.groq.com> → API Keys |
| **Supabase** | Project URL + anon key + service role key | <https://supabase.com> → New project |

Paste them into `.env.local`. The app will not start without these.

---

## Project Structure

```
app/         Next.js App Router pages + API routes
components/  Reusable React components
lib/         Groq client, Supabase clients, prompts, RAG helpers
constants/   Theme tokens (colors, fonts, motion)
styles/      Global CSS + CRT effects
supabase/    SQL migrations (versioned, forward-only)
scripts/     One-off scripts (lore seeding, etc.)
```

Full conventions: [`AGENTS.md`](./AGENTS.md)

---

## Roadmap

- **Phase 1** — D-Mail Terminal (MVP)
- **Phase 2** — Amadeus chatbot with RAG
- **Phase 3** — Lab Radio + Lab Notes profile

See [`AGENTS.md`](./AGENTS.md) section 9 for phase discipline rules.

---

## Contributing

PRs welcome. Please read [`AGENTS.md`](./AGENTS.md) and [`CONTRIBUTING.md`](./CONTRIBUTING.md) before starting.

---

## License

[MIT](./LICENSE)

---

*Built by a hunter who refuses to leave the lab. El Psy Kongroo.*
