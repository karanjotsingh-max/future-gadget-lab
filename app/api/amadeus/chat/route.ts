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
  ChatRequestSchema,
  AMADEUS_PROMPT_VERSION,
} from "@/lib/prompts/amadeus";

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
    const stream = await groq.chat.completions.create({
      model: GROQ_MODEL,
      messages: [
        { role: "system", content: AMADEUS_SYSTEM_PROMPT },
        ...messages,
      ],
      stream: true,
      temperature: 0.85,
      max_tokens: 600,
    });

    // Convert Groq's async iterable into a native ReadableStream
    const readable = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();
        try {
          for await (const chunk of stream) {
            const delta = chunk.choices[0]?.delta?.content;
            if (delta) {
              controller.enqueue(encoder.encode(delta));
            }
          }
        } catch (err) {
          // Log server-side; send a generic error token to the client
          console.error(
            `[amadeus/chat] stream error (prompt v${AMADEUS_PROMPT_VERSION}):`,
            err
          );
          controller.enqueue(
            encoder.encode("\n\n[TRANSMISSION INTERRUPTED]")
          );
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
