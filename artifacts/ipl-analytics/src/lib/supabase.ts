import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Vite SPA: supabase-js manages browser sessions. @supabase/ssr is installed
// for a future server-rendered entry; no cookie/server client is needed here.
const url = import.meta.env.VITE_SUPABASE_URL?.trim();
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim();
export const supabaseConfigured = Boolean(url && key);
let client: SupabaseClient | null = null;
export async function getAuthProviders(signal?: AbortSignal): Promise<Record<string, boolean>> {
  getSupabase(); // Apply the same configuration and public-key validation as the singleton.
  const response = await fetch(`${url}/auth/v1/settings`, { headers: { apikey: key! }, signal });
  if (!response.ok) throw new Error("Could not check sign-in options.");
  const settings = await response.json();
  return settings.external ?? {};
}
export function getSupabase(): SupabaseClient {
  if (!url || !key) throw new Error("Account services are not configured yet.");
  if (!client) {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:" && !["localhost", "127.0.0.1"].includes(parsed.hostname)) throw new Error("Account services require HTTPS.");
    if (key.startsWith("eyJ")) {
      try { if (JSON.parse(atob(key.split(".")[1].replace(/-/g,"+").replace(/_/g,"/"))).role !== "anon") throw new Error("Use a publishable key or anon key."); } catch { throw new Error("Use a Supabase publishable key in the browser."); }
    }
    if (key.startsWith("sb_secret_")) throw new Error("Use a Supabase publishable key in the browser.");
    client = createClient(url, key, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } });
  }
  return client;
}
