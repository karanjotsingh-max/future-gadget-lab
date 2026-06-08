/**
 * Server-side Supabase client.
 *
 * Per AGENTS.md §4.1 — uses the service_role key for admin operations,
 * or the anon key for user-scoped operations with RLS enforced.
 *
 * Use this in:
 *   - app/api/** route handlers
 *   - Server Components that need DB access
 *
 * Never import in client components — it would expose the service_role key.
 */

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY must be set in .env.local"
  );
}

/**
 * Anon client — respects Row Level Security.
 * Use for user-facing queries (data the logged-in user is allowed to see).
 */
export const supabaseAnon = createClient(supabaseUrl, supabaseAnonKey);

/**
 * Admin client — bypasses Row Level Security.
 * Use ONLY for trusted server-side operations (migrations, seeding, admin tasks).
 * Never expose to the client.
 */
export const supabaseAdmin = supabaseServiceRoleKey
  ? createClient(supabaseUrl, supabaseServiceRoleKey)
  : null;
