# LinkedIn Post Brief — Amadeus AI (Kurisu Makise)

> Feed this file to Claude.ai and say:
> "Write me a LinkedIn hook post based on this brief. One interesting technical problem I solved, honest about what's still in progress. Tone: builder sharing progress, not a finished product launch."

---

## What I Built (Current State — Work In Progress)

A fan-made AI version of Kurisu Makise from the anime Steins;Gate, styled as the in-universe **Amadeus system** — a video-call interface where you talk to a digital reconstruction of her personality.

**Not complete yet. Openly in progress. What still needs work:**
- LLM prompt refinement (emotion accuracy ~70-75%, needs improvement)
- More automated testing of the emotion system
- Proper lip sync (mouth animation is currently a 5Hz toggle — open/close — not real phoneme sync)
- Original voice TTS (currently using Microsoft Edge TTS as placeholder; want to fine-tune a model on Kurisu's actual English voice)

---

## The One Problem Worth Posting About

**How do you make an LLM express emotions without structured JSON output?**

The naive approach: ask the model to return `{ "emotion": "Angry", "text": "..." }` and parse it.

The problem: JSON output adds latency (the model thinks about structure), breaks streaming (you can't stream partial JSON and display it), and wastes tokens on brackets and quotes.

**My solution — prefix tags + stream splitting:**

The system prompt instructs Kurisu to begin every reply with exactly one emotion tag on its own line:
```
[Angry]
Don't call me Christina!
```

The API route (`/api/amadeus/chat`) buffers only the **first 80 characters** of the stream, extracts the `[Emotion]` tag with a regex, then:
1. Sends the emotion as an **HTTP response header** (`X-Amadeus-Emotion`) immediately
2. Streams the clean text body with zero added latency

The frontend reads the header before the stream body arrives, swaps to the correct sprite, then displays the words as they flow in.

**Result:** Emotion arrives ~instantly. Text streams at full speed. No JSON parsing overhead. No extra API call.

---

## What the Emotion System Does

- 20 canonical emotions from the original Amadeus system (Default, Angry, Embrassed, Serious, Wink, Sleep, etc.)
- LLM picks the right one based on conversation context
- Each emotion maps to a specific visual novel sprite (closed-mouth + open-mouth variant)
- Avatar swaps texture in React Three Fiber (Three.js plane with PNG sprite)
- Body animations per emotion: fast X-shake for Angry, slow nervous sway for Embrassed, etc.
- Mouth toggles at 5Hz during TTS playback to simulate speaking
- Tested accuracy: 14-15/20 correct on automated 20-message test suite

---

## Tech Stack

| Layer | Tool |
|---|---|
| Framework | Next.js 16 App Router |
| Language | TypeScript (strict) |
| Styling | Tailwind CSS v4 + custom CRT scanline CSS |
| 3D Avatar | React Three Fiber (Three.js plane, PNG sprites) |
| Animation | Framer Motion |
| LLM | Gemini 3.5 Flash via Google AI Studio (OpenAI-compat endpoint) |
| TTS | Edge TTS (Microsoft, server-side, free — placeholder) |
| Auth + DB | Supabase (coming in next phase) |
| Hosting | Vercel |

---

## What's Next (Roadmap to share)

- **Immediately:** All 20 sprites triggered (not just by LLM — also by UI events: loading, error, idle, wakeup)
- **Phase 1.4:** Supabase auth + persistent conversation history
- **Phase 1.5:** Deploy + this LinkedIn post
- **Phase 2:** D-Mail system with RAG over Steins;Gate lore (pgvector)
- **Long-term:** Fine-tuned TTS on Kurisu's actual voice, proper phoneme lip sync

---

## Honest framing for the post

- This is a **work in progress**, not a finished product
- The interesting part is the engineering problem solved, not the end result
- Being honest that "mouth animation is a toggle, not real lip sync" and "TTS is a placeholder" is more credible and relatable than overselling
- The hook should be: "here's a specific problem and how I solved it" — not "I built X, check it out"

---

## Visual assets you can use

- Screen recording of: Kurisu's sprite changing from Default → Angry when called "Christina"
- Screen recording of: mouth toggling while TTS plays
- Screenshot of: the CRT video-call UI with HUD corners and scanlines
- The emotion tag trick explained as a diagram (streamed text vs. header)

---

*El Psy Kongroo.*
