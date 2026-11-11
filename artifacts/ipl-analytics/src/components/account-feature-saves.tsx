import { useEffect, useState } from "react";
import { Link } from "wouter";
import { getSupabase } from "@/lib/supabase";
import { restoreFeature, type SavedFeature } from "@/lib/feature-saves";
type Save = {feature: SavedFeature; payload: Record<string, unknown>; updated_at: string};
export function AccountFeatureSaves({ userId }: { userId: string }) {
  const [saves, setSaves] = useState<Save[]>([]), [status, setStatus] = useState("Loading account saves…");
  const [confirm, setConfirm] = useState<SavedFeature | null>(null);
  useEffect(() => {
    let alive = true;
    void Promise.resolve(getSupabase().from("saved_feature_data").select("feature,payload,updated_at").eq("user_id",userId)).then(({data,error}) => { if (alive) { setSaves(data ?? []); setStatus(error ? "Could not load account saves. Reload to retry." : ""); } }).catch(() => { if (alive) setStatus("Could not load account saves. Reload to retry."); });
    return () => { alive = false; };
  }, [userId]);
  return <section className="account-workspace"><h2>Your saved feature data</h2><p className="account-helper">Save from Scout Lab, Stats or Arcade, then restore here on another device. Each save replaces that feature’s previous account save.</p>{saves.map(save => <div key={save.feature} className="account-identity"><strong>{save.feature}</strong><p>Saved {new Date(save.updated_at).toLocaleString()}</p>{confirm === save.feature ? <><p>Restore replaces this browser’s {save.feature} data. Other tabs may need a reload.</p><button type="button" className="account-signout" onClick={() => { try { restoreFeature(save.feature,save.payload); setStatus(`${save.feature} restored to this browser.`); } catch { setStatus("Could not restore this save. Browser data may be unchanged; please retry."); } setConfirm(null); }}>Confirm restore</button><button type="button" onClick={() => setConfirm(null)}>Cancel</button></> : <button type="button" className="account-signout" onClick={() => setConfirm(save.feature)}>Restore {save.feature}</button>}<Link href={save.feature === "scout" ? "/scout" : save.feature === "stats" ? "/stats" : "/arcade"}>Open {save.feature}</Link></div>)}{!saves.length && !status && <p className="account-helper">No feature saves yet.</p>}{status && <p role="status" className="account-helper">{status}</p>}<p className="account-helper">Arcade saves Higher or Lower best streak and recently opened games. Active auction rooms and server game sessions are not resumable from this save. Scores are personal records, not verified leaderboard results.</p></section>;
}
