// lib/supabase.ts
// ─── Single shared Supabase client for the entire app ────────────────────────
// Import THIS everywhere instead of calling createClient() directly in each file.
// Creating multiple clients causes auth token conflicts and breaks Realtime.

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY!;

// Use a module-level singleton so hot reload doesn't create extra instances
const globalForSupabase = globalThis as unknown as {
  _supabase: ReturnType<typeof createClient> | undefined;
};

export const supabase =
  globalForSupabase._supabase ??
  createClient(supabaseUrl, supabaseKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    },
  });

if (process.env.NODE_ENV !== "production") {
  globalForSupabase._supabase = supabase;
}