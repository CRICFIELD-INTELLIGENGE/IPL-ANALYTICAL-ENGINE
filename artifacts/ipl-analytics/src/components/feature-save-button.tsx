import { useState } from "react";
import { Link } from "wouter";
import { saveFeature, type SavedFeature } from "@/lib/feature-saves";
import { supabaseConfigured } from "@/lib/supabase";
export function FeatureSaveButton({ feature }: { feature: SavedFeature }) {
  const [busy, setBusy] = useState(false), [message, setMessage] = useState("");
  if (!supabaseConfigured) return null;
  return <div className="flex flex-wrap items-center gap-3 p-3 text-xs border-b border-white/10"><button type="button" disabled={busy} className="rounded border border-white/30 px-3 py-2 disabled:opacity-50" onClick={async () => { setBusy(true); try { await saveFeature(feature); setMessage("Saved to your account."); } catch (error) { setMessage(error instanceof Error ? error.message : "Could not save."); } finally { setBusy(false); } }}>{busy ? "Saving…" : `Save ${feature === "stats" ? "Stats filters" : feature === "scout" ? "Scout shortlist" : "Arcade progress"} to account`}</button><Link href="/account">Manage saved data</Link>{message && <span role="status">{message}</span>}</div>;
}
