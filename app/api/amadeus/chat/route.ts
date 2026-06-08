/**
 * POST /api/amadeus/chat
 *
 * Streams a Kurisu (Amadeus) response for a given conversation history.
 *
 * Security:
 * - AGENTS.md §4.3 — all LLM calls are server-only (route handler, not client)
 * - AGENTS.md §4.4 — in-memory rate limiter for dev; swap to Upstash in production
 * - AGENTS.md §5   — Zod validation on all incoming data
 * - AGENTS.md §6.5 — streaming text response; exempt from Zod output validation,
 *                    but wrapped in try/catch so provider errors never reach the client
 */

import { NextRequest } from "next/server";
import { groq, GROQ_MODEL } from "@/lib/groq";
import {
  AMADEUS_SYSTEM_PROMPT,
  AMADEUS_FEW_SHOT,
  ChatRequestSchema,
  AMADEUS_PROMPT_VERSION,
  CANONICAL_EMOTIONS,
} from "@/lib/prompts/amadeus";

// Emotion tag regex — matches "[Emotion]\n" at the very start of the response.
const EMOTION_TAG_RE = /^\[([A-Za-z ]+)\]\r?\n?/;
const VALID_EMOTIONS = new Set<string>(CANONICAL_EMOTIONS);

// ─────────────────────────────────────────────────────────────
// In-memory rate limiter (dev only — resets on cold start)
// Per AGENTS.md §4.4 — replace with Upstash Ratelimit in production
// ─────────────────────────────────────────────────────────────
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_MAX = 20;
const RATE_LIMIT_WINDOW_MS = 60_000; // 1 minute

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return true;
  }

  if (entry.count >= RATE_LIMIT_MAX) return false;

  entry.count += 1;
  return true;
}

// ─────────────────────────────────────────────────────────────
// Route handler
// ─────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  // Rate limit by IP
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";

  if (process.env.NODE_ENV === "production" && !checkRateLimit(ip)) {
    return new Response(
      JSON.stringify({ error: "Too many requests. Try again in a minute." }),
      { status: 429, headers: { "Content-Type": "application/json" } }
    );
  }

  // Parse + validate request body
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body." }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const parsed = ChatRequestSchema.safeParse(body);
  if (!parsed.success) {
    return new Response(
      JSON.stringify({ error: "Invalid request.", details: parsed.error.flatten() }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  const { messages } = parsed.data;

  // Stream Kurisu's response
  try {
    const groqStream = await groq.chat.completions.create({
      model: GROQ_MODEL,
      messages: [
        { role: "system", content: AMADEUS_SYSTEM_PROMPT },
        ...AMADEUS_FEW_SHOT,
        ...messages,
      ],
      stream: true,
      temperature: 0.85,
      max_tokens: 220,
    });

    // ── Phase 1: buffer first chunks until [Emotion] tag is found ────────────
    // We use the iterator directly (not for…of) so that a while-loop break does
    // NOT call iterator.return(), keeping the Groq HTTP connection alive.
    const iter = groqStream[Symbol.asyncIterator]();
    let bufferedText = "";
    let emotion = "Default";
    let iterDone = false;

    while (bufferedText.length < 80) {
      const result = await iter.next();
      if (result.done) { iterDone = true; break; }
      bufferedText += result.value.choices[0]?.delta?.content ?? "";

      const match = EMOTION_TAG_RE.exec(bufferedText);
      if (match) {
        const candidate = match[1];
        emotion = VALID_EMOTIONS.has(candidate) ? candidate : "Default";
        bufferedText = bufferedText.slice(match[0].length);
        break; // while-loop break — does NOT close the iterator
      }
    }

    // ── Phase 2: stream remaining text (buffered tail + rest of iterator) ────
    const textAfterTag = bufferedText;
    const readable = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();
        try {
          if (textAfterTag) controller.enqueue(encoder.encode(textAfterTag));
          if (!iterDone) {
            // Resume the iterator from where we left off.
            while (true) {
              const result = await iter.next();
              if (result.done) break;
              const delta = result.value.choices[0]?.delta?.content;
              if (delta) controller.enqueue(encoder.encode(delta));
            }
          }
        } catch (err) {
          console.error(
            `[amadeus/chat] stream error (prompt v${AMADEUS_PROMPT_VERSION}):`,
            err
          );
          controller.enqueue(encoder.encode("\n\n[TRANSMISSION INTERRUPTED]"));
        } finally {
          controller.close();
        }
      },
    });

    return new Response(readable, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Transfer-Encoding": "chunked",
        "X-Amadeus-Prompt-Version": AMADEUS_PROMPT_VERSION,
        "X-Amadeus-Emotion": emotion,
      },
    });
  } catch (err) {
    console.error(
      `[amadeus/chat] fatal error (prompt v${AMADEUS_PROMPT_VERSION}):`,
      err
    );
    return new Response(
      JSON.stringify({ error: "Amadeus system error. Try again." }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
