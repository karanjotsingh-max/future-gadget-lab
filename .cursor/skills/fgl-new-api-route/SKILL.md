---
name: fgl-new-api-route
description: Template and checklist for creating a new Next.js API route handler in Future Gadget Lab. Use whenever adding a new server-side endpoint.
---

# FGL New API Route

All route handlers live in `app/api/<feature>/route.ts`.
Export named functions: `GET`, `POST` — never a default export.

## Decision: streaming or JSON?

| Use case | Response type |
|---|---|
| Amadeus chat (prose, word by word) | `ReadableStream` (streaming) |
| D-Mail, any structured data | `Response.json()` with Zod-validated object |

## Template — streaming (Amadeus-style)

```ts
// app/api/<feature>/route.ts
import { NextRequest } from "next/server";
import { z } from "zod";
import { groq } from "@/lib/groq";
import { FEATURE_SYSTEM_PROMPT } from "@/lib/prompts/<feature>";

const RequestSchema = z.object({
  message: z.string().min(1).max(2000),
});

export async function POST(req: NextRequest) {
  // 1. Rate limit (add Upstash in production; see AGENTS.md §4)
  // const ip = req.headers.get("x-forwarded-for") ?? "unknown";

  // 2. Validate input
  const body = await req.json().catch(() => null);
  const parsed = RequestSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: "Invalid request" }, { status: 400 });
  }

  // 3. Call Groq — streaming
  try {
    const stream = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        { role: "system", content: FEATURE_SYSTEM_PROMPT },
        { role: "user", content: parsed.data.message },
      ],
      stream: true,
    });

    // 4. Pipe Groq stream to the client
    const readable = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            const text = chunk.choices[0]?.delta?.content ?? "";
            if (text) controller.enqueue(new TextEncoder().encode(text));
          }
        } catch {
          controller.error("Stream error");
        } finally {
          controller.close();
        }
      },
    });

    return new Response(readable, {
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  } catch {
    return Response.json({ error: "Service unavailable" }, { status: 503 });
  }
}
```

## Template — structured JSON (D-Mail-style)

```ts
// app/api/<feature>/route.ts
import { NextRequest } from "next/server";
import { z } from "zod";
import { groq } from "@/lib/groq";
import { FEATURE_SYSTEM_PROMPT, FeatureResponseSchema } from "@/lib/prompts/<feature>";

const RequestSchema = z.object({
  input: z.string().min(1).max(500),
});

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = RequestSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: "Invalid request" }, { status: 400 });
  }

  try {
    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        { role: "system", content: FEATURE_SYSTEM_PROMPT },
        { role: "user", content: parsed.data.input },
      ],
      response_format: { type: "json_object" },
    });

    const raw = JSON.parse(completion.choices[0]?.message?.content ?? "{}");
    const result = FeatureResponseSchema.safeParse(raw);
    if (!result.success) {
      return Response.json({ error: "Unexpected model output" }, { status: 502 });
    }

    return Response.json(result.data);
  } catch {
    return Response.json({ error: "Service unavailable" }, { status: 503 });
  }
}
```

## Checklist before committing

- [ ] Route is at `app/api/<feature>/route.ts`, exported as `POST` or `GET` (named, not default)
- [ ] Zod validates every incoming field before any logic runs
- [ ] No API keys in this file — Groq client imported from `@/lib/groq`
- [ ] Structured output validated with Zod before returning to client
- [ ] All errors return generic messages — never leak provider error details to client
- [ ] Streaming routes use `ReadableStream`, never `await` the full response first
- [ ] Rate limiting noted (in-memory stub for dev is fine, must be replaced before prod deploy)
- [ ] `NEXT_PUBLIC_` env vars not accessed here (they are for client only)

## Concepts to explain (first time)

**Why not fetch Groq from the client?** The browser would need the Groq API key in the JavaScript bundle.
Anyone who opens DevTools → Network could copy it and use your quota. The route handler runs on the server
where `process.env` is never sent to the browser.

**Why Zod on input?** TypeScript types disappear at runtime. The request body is `unknown` JSON — without Zod,
a malformed request would crash deep inside your logic. Validate at the boundary, fail fast with a 400.
