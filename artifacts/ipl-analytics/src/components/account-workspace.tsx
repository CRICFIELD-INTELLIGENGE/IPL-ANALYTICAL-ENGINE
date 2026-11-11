import { useEffect, useState } from "react";
import { getSupabase } from "@/lib/supabase";

export function AccountWorkspace({ userId }: { userId: string }) {
  const [follows, setFollows] = useState("");
  const [research, setResearch] = useState("");
  const [query, setQuery] = useState("");
  const [arcade, setArcade] = useState("");
  const [status, setStatus] = useState("Loading saved workspace…");
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    let alive = true;
    void Promise.resolve(getSupabase().from("user_workspace").select("follows,research,stats_query,arcade_notes").eq("user_id", userId).maybeSingle()).then(({ data, error }) => {
      if (!alive) return;
      if (error) { setStatus("Could not load your workspace. Reload to retry."); return; }
      setFollows((data?.follows ?? []).join(", ")); setResearch(data?.research ?? ""); setQuery(data?.stats_query ?? ""); setArcade(data?.arcade_notes ?? ""); setReady(true); setStatus("");
    }).catch(() => { if (alive) setStatus("Could not load your workspace. Reload to retry."); });
    return () => { alive = false; };
  }, [userId]);
  return <section className="account-workspace"><h2>Your cricket workspace</h2><p className="account-helper">Save your interests and research to your account.</p><form className="account-form" onSubmit={async event => {
    event.preventDefault(); setBusy(true);
    try {
      const { error } = await getSupabase().from("user_workspace").upsert({ user_id: userId, follows: follows.split(",").map(value => value.trim()).filter(Boolean).slice(0,100), research, stats_query: query, arcade_notes: arcade });
      if (error) throw error;
      setStatus("Workspace saved.");
    } catch { setStatus("Could not save. Your edits are still here; please retry."); } finally { setBusy(false); }
  }}>
    <label htmlFor="workspace-follows">Franchises, players and leagues to follow</label><input id="workspace-follows" maxLength={4000} placeholder="Mumbai Indians, Jasprit Bumrah, IPL" value={follows} onChange={event => setFollows(event.target.value)} disabled={!ready}/>
    <label htmlFor="workspace-research">Scout Lab research</label><textarea id="workspace-research" maxLength={20000} value={research} onChange={event => setResearch(event.target.value)} disabled={!ready}/>
    <label htmlFor="workspace-query">Saved Stats query</label><textarea id="workspace-query" maxLength={10000} value={query} onChange={event => setQuery(event.target.value)} disabled={!ready}/>
    <label htmlFor="workspace-arcade">Arcade progress notes</label><textarea id="workspace-arcade" maxLength={10000} value={arcade} onChange={event => setArcade(event.target.value)} disabled={!ready}/>
    <p className="account-helper">Notes are saved here manually. Game state and existing browser research are not imported automatically.</p>
    <button className="account-primary" disabled={!ready || busy}>{busy ? "Saving…" : "Save workspace"}</button>
  </form>{status && <p role="status" className="account-helper">{status}</p>}</section>;
}
