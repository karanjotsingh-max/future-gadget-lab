---
name: fgl-new-migration
description: Template and checklist for writing a new Supabase SQL migration in Future Gadget Lab. Use whenever adding a new table, column, or index.
---

# FGL New Migration

Every database change is a forward-only SQL file in `supabase/migrations/`.
Never edit a committed migration — create a new one instead.

## File naming

```
supabase/migrations/
  001_messages.sql        ← Phase 1.4
  002_timelines.sql       ← Phase 2
  003_lore_chunks.sql     ← Phase 2 RAG
```

Format: `NNN_<table_name>.sql` — zero-padded three-digit sequence.

## Template

```sql
-- supabase/migrations/NNN_<table>.sql

-- 1. Create the table
create table public.<table> (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references auth.users(id) on delete cascade not null,
  -- add your columns here
  created_at  timestamptz default now() not null
);

-- 2. Enable Row Level Security (REQUIRED on every table)
alter table public.<table> enable row level security;

-- 3. RLS policies — default deny is already enforced by enabling RLS.
--    Only add explicit ALLOW rules.

-- Users can only read their own rows
create policy "<table>_select_own"
  on public.<table>
  for select
  using (auth.uid() = user_id);

-- Users can only insert their own rows
create policy "<table>_insert_own"
  on public.<table>
  for insert
  with check (auth.uid() = user_id);

-- Users can only delete their own rows
create policy "<table>_delete_own"
  on public.<table>
  for delete
  using (auth.uid() = user_id);

-- 4. Index on user_id for fast per-user queries (always add this)
create index <table>_user_id_idx on public.<table>(user_id);
```

## Checklist before committing

- [ ] File is in `supabase/migrations/` with the next sequential number
- [ ] Table has `enable row level security`
- [ ] Every policy uses `auth.uid()` — never hardcode a user ID
- [ ] Default deny is in effect (no `for all using (true)` unless it's a public read table)
- [ ] Index on `user_id` (and `created_at` if you'll sort by it)
- [ ] `on delete cascade` on the `user_id` foreign key (clean up when user is deleted)
- [ ] Migration runs cleanly: `supabase db reset` or `supabase migration up`

## Concepts to explain (first time)

**Why RLS?** Supabase lets any authenticated user call the database directly from the browser.
Without RLS, user A could query user B's rows by changing a query parameter.
RLS enforces ownership at the database level — the app can't accidentally bypass it.

**Why forward-only?** Once a migration is committed and run on production, it has changed real data.
Editing the file wouldn't undo what already ran. A new migration is the safe, auditable way to correct it.
