// Arcade Passport: XP, level, trophies and recent games from server-validated play. Used on /arcade and in Your Dugout.
import { useEffect, useState } from "react";
import { Link } from "wouter";
import { Trophy } from "lucide-react";
import { ACHIEVEMENTS, gameInfo, levelFor, xpForLevel } from "@workspace/arcade-rules";
import { api, gameTitle, localRecords, signedIn } from "@/lib/arcade/client";
import "./arcade-kit.css";

export interface PassportData {
  xp: number; level: number; gamesPlayed: number; bestStreak: number; dailyStreak: number; handle: string | null; showOnBoards: boolean; favouriteTeam: string | null;
  achievements: { code: string; at: number }[]; recent: { game: string; score: number; won: number; created: number }[]; bests: { game: string; best: number; plays: number }[];
  daily: { game: string; score: number; completed: number }[]; saves: { game: string; slot: string; updated: number }[];
}
export function usePassport(enabled = true) {
  const [data, setData] = useState<PassportData | null>(null);
  const [state, setState] = useState<"loading" | "signed-out" | "ready" | "error">("loading");
  useEffect(() => {
    if (!enabled) return;
    let alive = true;
    void signedIn().then((yes) => {
      if (!yes) { if (alive) setState("signed-out"); return; }
      api<PassportData>("/passport").then((d) => { if (alive) { setData(d); setState("ready"); } }).catch(() => alive && setState("error"));
    });
    return () => { alive = false; };
  }, [enabled]);
  return { data, state, setData };
}

export function ArcadePassport({ editable, source }: { editable?: boolean; source?: ReturnType<typeof usePassport> }) {
  const own = usePassport(!source);
  const { data, state, setData } = source ?? own;
  const [handle, setHandle] = useState("");
  const [msg, setMsg] = useState("");
  useEffect(() => { if (data) setHandle(data.handle ?? ""); }, [data]);
  const local = localRecords();
  if (state === "loading") return <section className="pav-passport"><p className="pav-small">Loading passport…</p></section>;
  if (state !== "ready" || !data) {
    return (
      <section className="pav-passport">
        <span className="pav-kicker">Arcade Passport</span>
        <h3>Play as a guest, or sign in to collect XP.</h3>
        <p className="pav-small">Signed-out scores stay in this browser{local.recent.length ? `: recently ${local.recent.slice(0, 3).map((r) => gameTitle(r.game)).join(", ")}` : ""}. Signing in uses your CRICFIELD account — XP, trophies and leaderboards come only from games the server has validated.</p>
        {state === "error" && <p className="pav-small">The passport service is unavailable right now.</p>}
        <Link href="/account" className="pav-btn pav-btn-gold">Sign in to Your Dugout</Link>
      </section>
    );
  }
  const next = xpForLevel(data.level + 1), cur = xpForLevel(data.level);
  async function saveProfile(patch: Record<string, unknown>) {
    try { setData(await api<PassportData>("/passport/profile", { body: patch })); setMsg("Saved."); } catch (e) { setMsg((e as Error).message); }
  }
  return (
    <section className="pav-passport">
      <span className="pav-kicker">Arcade Passport</span>
      <div className="pav-pass-top">
        <div className="pav-level" aria-label={`Level ${data.level}`}><small>Level</small><strong>{levelFor(data.xp)}</strong></div>
        <div className="pav-xp"><div className="pav-xp-bar"><span style={{ width: `${Math.round(((data.xp - cur) / Math.max(1, next - cur)) * 100)}%` }} /></div><small>{data.xp} XP · {next - data.xp} to level {data.level + 1}</small></div>
      </div>
      <div className="pav-stat-grid">
        <div className="pav-stat"><small>Games</small><strong>{data.gamesPlayed}</strong></div>
        <div className="pav-stat"><small>Best streak</small><strong>{data.bestStreak}</strong></div>
        <div className="pav-stat"><small>Daily streak</small><strong>{data.dailyStreak}</strong></div>
        <div className="pav-stat"><small>Trophies</small><strong>{data.achievements.length}/{ACHIEVEMENTS.length}</strong></div>
      </div>
      <ul className="pav-trophies">{ACHIEVEMENTS.map((a) => { const got = data.achievements.some((x) => x.code === a.code); return <li key={a.code} className={got ? "got" : ""} title={a.description}><Trophy size={14} aria-hidden="true" /> {a.name}<span className="pav-sr">{got ? " — earned" : " — not yet earned"}</span></li>; })}</ul>
      {data.recent.length > 0 && <p className="pav-small">Recently: {data.recent.slice(0, 4).map((r) => `${gameInfo(r.game)?.title ?? r.game} (${r.score})`).join(" · ")}</p>}
      {editable && (
        <form className="pav-pass-form" onSubmit={(e) => { e.preventDefault(); void saveProfile({ handle: handle.trim() || null }); }}>
          <label>Leaderboard handle <input value={handle} maxLength={20} pattern="[A-Za-z0-9 _\-]{3,20}" onChange={(e) => setHandle(e.target.value)} placeholder="Shown instead of a pseudonym" /></label>
          <label><input type="checkbox" checked={data.showOnBoards} onChange={(e) => void saveProfile({ showOnBoards: e.target.checked })} /> Show me on leaderboards</label>
          <label>Favourite franchise <select value={data.favouriteTeam ?? ""} onChange={(e) => void saveProfile({ favouriteTeam: e.target.value || null })}><option value="">None</option>{["CSK", "DC", "GT", "KKR", "LSG", "MI", "PBKS", "RCB", "RR", "SRH"].map((t) => <option key={t}>{t}</option>)}</select></label>
          <button className="pav-btn">Save handle</button>
          {msg && <span role="status" className="pav-small">{msg}</span>}
        </form>
      )}
    </section>
  );
}
