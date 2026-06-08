/**
 * POST /api/amadeus/tts
 *
 * Converts text to speech using Microsoft Edge TTS (edge-tts-universal).
 * Returns audio/mpeg binary. Client plays it via the Web Audio API.
 *
 * Security:
 * - Server-only — no API key required (Edge TTS is free, server-side only)
 * - AGENTS.md §4.4 — in-memory rate limiter for dev; swap to Upstash in production
 * - AGENTS.md §5   — Zod validation on all incoming data
 */

import { NextRequest } from "next/server";
import { z } from "zod";
import { EdgeTTS } from "edge-tts-universal";

const TTS_VOICE = "en-US-JennyNeural";

const RequestSchema = z.object({
  text: z.string().min(1).max(1000),
});

// ─────────────────────────────────────────────────────────────
// In-memory rate limiter (dev only — resets on cold start)
// Per AGENTS.md §4.4 — replace with Upstash Ratelimit in production
// ─────────────────────────────────────────────────────────────
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_MAX = 30;
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
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";

  if (process.env.NODE_ENV === "production" && !checkRateLimit(ip)) {
    return new Response(
      JSON.stringify({ error: "Too many requests. Try again in a minute." }),
      { status: 429, headers: { "Content-Type": "application/json" } }
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body." }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const parsed = RequestSchema.safeParse(body);
  if (!parsed.success) {
    return new Response(
      JSON.stringify({ error: "Invalid request." }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  try {
    const tts = new EdgeTTS(parsed.data.text, TTS_VOICE);
    const result = await tts.synthesize();
    const audioBuffer = Buffer.from(await result.audio.arrayBuffer());

    return new Response(audioBuffer, {
      headers: {
        "Content-Type": "audio/mpeg",
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    console.error("[amadeus/tts] synthesis error:", err);
    return new Response(
      JSON.stringify({ error: "TTS unavailable." }),
      { status: 503, headers: { "Content-Type": "application/json" } }
    );
  }
}
