import { createClient } from "@supabase/supabase-js";

// ---------------------------------------------------------------------------
// Server-side only. Uses the SERVICE ROLE key (not the anon key) because this
// backend is the sole writer of a single shared dataset — there's no
// per-user auth model here, so Row Level Security isn't in play and the
// service role simply bypasses it. This key must NEVER be sent to the
// frontend or committed to source control; it only ever lives in the
// server's environment (server/.env, or the host's env var settings).
// ---------------------------------------------------------------------------

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

export function isSupabaseConfigured(): boolean {
  return Boolean(url && key);
}

export const supabase = createClient(url ?? "http://localhost", key ?? "placeholder", {
  auth: { persistSession: false },
});