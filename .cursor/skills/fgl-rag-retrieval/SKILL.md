---
name: fgl-rag-retrieval
description: Step-by-step guide for adding RAG (Retrieval-Augmented Generation) to a route in Future Gadget Lab. Use when building Phase 2 Amadeus RAG upgrade and lore seeding.
---

# FGL RAG Retrieval

RAG = store knowledge in a vector database → at query time, fetch only the relevant pieces → inject them into the prompt.

Why bother? A huge system prompt costs tokens on every request and hits the context limit fast.
RAG fetches only the top 4 most relevant lore chunks for the specific question being asked.

## The flow

```
User message
  → embed message (text → float[])
  → pgvector cosine search on lore_chunks table
  → get top-4 chunks above 0.75 similarity
  → inject chunks into system prompt as <context> block
  → Groq generates response grounded in retrieved lore
```

## Step 1 — Migration: lore_chunks table

Run after `fgl-new-migration` skill. The lore chunks table is special because it needs pgvector.

```sql
-- supabase/migrations/003_lore_chunks.sql

-- Enable the pgvector extension (one-time, per project)
create extension if not exists vector;

create table public.lore_chunks (
  id         uuid primary key default gen_random_uuid(),
  content    text not null,
  embedding  vector(1536),          -- dimension must match embedding model output
  source     text,                  -- e.g. 'steins-gate-wiki', 'episode-12'
  created_at timestamptz default now() not null
);

-- This table is read-only for authenticated users (public lore, not user-specific)
alter table public.lore_chunks enable row level security;

create policy "lore_chunks_select_all"
  on public.lore_chunks
  for select
  using (true);   -- public read is intentional here

-- Index for fast cosine similarity search
create index lore_chunks_embedding_idx
  on public.lore_chunks
  using ivfflat (embedding vector_cosine_ops)
  with (lists = 100);
```

## Step 2 — Embed helper (`lib/rag/embed.ts`)

```ts
// lib/rag/embed.ts
import { groq } from "@/lib/groq";

export async function embedText(text: string): Promise<number[]> {
  const response = await groq.embeddings.create({
    model: "text-embedding-ada-002",   // update if Groq changes embedding models
    input: text,
  });
  return response.data[0].embedding;
}
```

## Step 3 — Retrieve helper (`lib/rag/retrieve.ts`)

```ts
// lib/rag/retrieve.ts
import { createServerClient } from "@/lib/supabase/server";
import { embedText } from "./embed";

const TOP_K = 4;
const SIMILARITY_THRESHOLD = 0.75;

export async function retrieveLoreChunks(query: string): Promise<string[]> {
  const supabase = await createServerClient();
  const embedding = await embedText(query);

  const { data, error } = await supabase.rpc("match_lore_chunks", {
    query_embedding: embedding,
    match_threshold: SIMILARITY_THRESHOLD,
    match_count: TOP_K,
  });

  if (error || !data) return [];
  return (data as { content: string }[]).map((row) => row.content);
}
```

## Step 4 — Supabase RPC function (add to a migration)

```sql
-- Add this to 003_lore_chunks.sql or a new 004_ migration
create or replace function match_lore_chunks(
  query_embedding vector(1536),
  match_threshold float,
  match_count int
)
returns table (content text, similarity float)
language sql stable
as $$
  select content, 1 - (embedding <=> query_embedding) as similarity
  from public.lore_chunks
  where 1 - (embedding <=> query_embedding) > match_threshold
  order by similarity desc
  limit match_count;
$$;
```

## Step 5 — Inject into route (`app/api/amadeus/chat/route.ts`)

```ts
import { retrieveLoreChunks } from "@/lib/rag/retrieve";

// Inside the POST handler, before calling Groq:
const chunks = await retrieveLoreChunks(parsed.data.message);
const context = chunks.length > 0
  ? `\n\n<retrieved_lore>\n${chunks.join("\n---\n")}\n</retrieved_lore>`
  : "";

// Prepend context to the system prompt:
{ role: "system", content: AMADEUS_SYSTEM_PROMPT + context }
```

## Step 6 — Seed script (`scripts/seed-lore.ts`)

Run once to populate the table. Never run in production automatically.

```ts
// scripts/seed-lore.ts
// Usage: npx ts-node scripts/seed-lore.ts
import { createClient } from "@supabase/supabase-js";
import { embedText } from "../lib/rag/embed";

const LORE_CHUNKS = [
  "The divergence meter measures the difference between world lines as a percentage.",
  // ... add more lore chunks
];

async function seed() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!  // service role for write access
  );

  for (const content of LORE_CHUNKS) {
    const embedding = await embedText(content);
    await supabase.from("lore_chunks").insert({ content, embedding, source: "seed" });
    console.log("Seeded:", content.slice(0, 60));
  }
}

seed();
```

## Checklist

- [ ] `003_lore_chunks.sql` migration created and run
- [ ] `match_lore_chunks` RPC function in the migration
- [ ] `lib/rag/embed.ts` created
- [ ] `lib/rag/retrieve.ts` created with TOP_K = 4 and threshold = 0.75
- [ ] `scripts/seed-lore.ts` created — test locally before running
- [ ] Route injects retrieved chunks with `<retrieved_lore>` delimiters
- [ ] Seed script uses `service_role` key (never `anon` key for writes)
- [ ] Seed script is gitignored or has no hardcoded keys
