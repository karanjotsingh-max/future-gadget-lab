/**
 * Browser-side Supabase client.
 *
 * Per AGENTS.md §4.2 — uses only NEXT_PUBLIC_ keys (safe to expose in browser).
 *
 * Use this in:
 *   - Client components ("use client") that need auth state
 *   - Client-side auth helpers (sign in, sign out)
 *
 * Never use the service_role key here.
 */

"use client";

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
