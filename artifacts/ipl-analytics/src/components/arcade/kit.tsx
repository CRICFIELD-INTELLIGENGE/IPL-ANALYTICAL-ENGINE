import { MultiplayerGate } from "./multiplayer-gate";
// CRICFIELD Arcade shared UI: game shell, settings, results with share card, leaderboards, player search.
import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { Link } from "wouter";
import { ArrowLeft, Download, Settings2, Share2, Trophy, Volume2, VolumeX } from "lucide-react";
import { Layout } from "@/components/layout";
import { ACHIEVEMENTS, gameInfo, type GameId } from "@workspace/arcade-rules";
import { api, recordLocal, touchRecent, type Provenance, type ResultOutcome } from "@/lib/arcade/client";
import { play, setFeel, useFeel } from "@/lib/arcade/feel";
import "./arcade-kit.css";

export function GameShell({ game, theme, children, wide }: { game: GameId; theme: string; children: ReactNode; wide?: boolean }) {
  const info = gameInfo(game)!;
  useEffect(() => { touchRecent(game); document.title = `${info.title} · CRICFIELD Arcade`; }, [game, info.title]);
  return (
    <Layout hideRightPanel>
      <div className={`pav-game ${theme}${wide ? " pav-wide" : ""}`}>
        <div className="pav-game-bar">
          <Link href="/arcade" className="pav-back"><ArrowLeft size={15} aria-hidden="true" /> The Pavilion</Link>
          <span className="pav-game-crumb">{info.category} · {info.genre}</span>
          <FeelMenu />
        </div>
        {game === "auction-room" ? children : <MultiplayerGate game={game}>{children}</MultiplayerGate>}
      </div>
    </Layout>
  );
}

export function FeelMenu() {
  const feel = useFeel();
  const [open, setOpen] = useState(false);
  const id = useId();
  return (
    <div className="pav-feel">
      <button type="button" className="pav-icon-btn" aria-label={feel.sound ? "Mute sound" : "Turn sound on"} onClick={() => { setFeel({ sound: !feel.sound }); if (!feel.sound) setTimeout(() => play("click"), 0); }}>{feel.sound ? <Volume2 size={16} /> : <VolumeX size={16} />}</button>
      <button type="button" className="pav-icon-btn" aria-expanded={open} aria-controls={id} aria-label="Game settings" onClick={() => setOpen(!open)}><Settings2 size={16} /></button>
      {open && (
        <div className="pav-feel-panel" id={id} role="group" aria-label="Game settings">
          <label>Volume<input type="range" min={0} max={1} step={0.05} value={feel.volume} onChange={(e) => setFeel({ volume: Number(e.target.value) })} /></label>
          <label>Reduced motion
            <select value={feel.reducedMotion} onChange={(e) => setFeel({ reducedMotion: e.target.value as "system" | "on" | "off" })}>
              <option value="system">Follow device</option><option value="on">On</option><option value="off">Off</option>
            </select>
          </label>
          <small>Sounds are generated in your browser and only play after you interact.</small>
        </div>
      )}
    </div>
  );
}

export function GameHeader({ kicker, title, intro }: { kicker: string; title: string; intro: string }) {
  return <header className="pav-game-head"><span className="pav-kicker">{kicker}</span><h1>{title}</h1><p>{intro}</p></header>;
}

export function DataNote({ data, extra }: { data?: Provenance | null; extra?: string }) {
  if (!data && !extra) return null;
  return <p className="pav-datanote">{data ? <>Verified data: {data.source}. Seasons through {data.lastSeason}; data cut-off {data.dataCutoff}. </> : null}{extra}</p>;
}

export function ErrorNote({ error, onRetry }: { error: string | null; onRetry?: () => void }) {
  if (!error) return null;
  return <div className="pav-error" role="alert">{error}{onRetry && <button type="button" onClick={onRetry}>Retry</button>}</div>;
}

/** Results with XP, achievements, personal best and a share card. Scores are recorded locally for everyone. */
export function ResultPanel({ game, score, headline, lines, outcome, share, onReplay, replayLabel = "Play again", children, dailyKey }: {
  game: GameId; score: number; headline: string; lines?: string[]; outcome?: ResultOutcome | null; share: string; onReplay?: () => void; replayLabel?: string; children?: ReactNode; dailyKey?: string;
}) {
  const [best, setBest] = useState(false);
  const [copied, setCopied] = useState("");
  const recorded = useRef(false);
  useEffect(() => {
    if (recorded.current) return;
    recorded.current = true;
    setBest(recordLocal(game, score, dailyKey));
    play(outcome?.newAchievements.length ? "achievement" : "reveal");
  }, [game, score, dailyKey, outcome]);
  const info = gameInfo(game)!;
  const text = `CRICFIELD Arcade · ${info.title}\n${share}\ncricfield — Beyond the Boundary`;
  async function doShare() {
    try {
      if (navigator.share) { await navigator.share({ title: `${info.title} — CRICFIELD Arcade`, text }); return; }
      await navigator.clipboard.writeText(text);
      setCopied("Result copied to the clipboard.");
    } catch { setCopied("Sharing was cancelled."); }
  }
  return (
    <section className="pav-result" aria-live="polite">
      <span className="pav-kicker">FULL TIME</span>
      <h2>{headline}</h2>
      {lines?.map((l) => <p key={l}>{l}</p>)}
      <div className="pav-result-meta">
        <span><strong>{score}</strong> {info.scoreLabel.toLowerCase()}</span>
        {best && <span className="pav-chip pav-chip-gold">Personal best</span>}
        {outcome?.recorded && <span className="pav-chip">+{outcome.xp} XP{outcome.capped ? " (daily cap reached)" : ""} · Level {outcome.level}</span>}
        {outcome === null && <span className="pav-chip pav-chip-muted"><Link href="/account">Sign in</Link> to earn XP and appear on leaderboards</span>}
      </div>
      {outcome?.newAchievements.map((code) => { const a = ACHIEVEMENTS.find((x) => x.code === code); return a ? <div key={code} className="pav-achievement" role="status"><Trophy size={18} aria-hidden="true" /> Achievement unlocked: <strong>{a.name}</strong> — {a.description}</div> : null; })}
      {children}
      <div className="pav-result-actions">
        {onReplay && <button type="button" className="pav-btn pav-btn-gold" onClick={onReplay}>{replayLabel}</button>}
        <button type="button" className="pav-btn" onClick={() => void doShare()}><Share2 size={15} aria-hidden="true" /> Share</button>
        <button type="button" className="pav-btn" onClick={() => downloadCard(info.title, headline, share)}><Download size={15} aria-hidden="true" /> Result card</button>
        <Link href="/arcade" className="pav-btn pav-btn-ghost">Back to the Pavilion</Link>
      </div>
      {copied && <p role="status" className="pav-small">{copied}</p>}
    </section>
  );
}

/** A 1080×1080 PNG result card drawn on a canvas — no answers, just game, score line and branding. */
function downloadCard(title: string, headline: string, share: string) {
  const c = document.createElement("canvas");
  c.width = 1080; c.height = 1080;
  const g = c.getContext("2d");
  if (!g) return;
  const grad = g.createLinearGradient(0, 0, 0, 1080);
  grad.addColorStop(0, "#0b1424"); grad.addColorStop(1, "#123a2c");
  g.fillStyle = grad; g.fillRect(0, 0, 1080, 1080);
  g.strokeStyle = "#d9b25f"; g.lineWidth = 6; g.strokeRect(48, 48, 984, 984);
  g.fillStyle = "#d9b25f"; g.font = "600 34px 'Space Grotesk', sans-serif"; g.fillText("CRICFIELD ARCADE · THE PAVILION", 96, 140);
  g.fillStyle = "#f5f1e6"; g.font = "italic 700 96px Georgia, serif"; g.fillText(title, 96, 300);
  g.font = "600 52px 'Space Grotesk', sans-serif";
  wrap(g, headline, 96, 420, 880, 64);
  g.fillStyle = "#c9d6cf"; g.font = "40px 'Space Grotesk', sans-serif";
  wrap(g, share, 96, 620, 880, 54);
  g.fillStyle = "#d9b25f"; g.font = "32px 'Space Grotesk', sans-serif"; g.fillText("Beyond the Boundary. Into the Game.", 96, 980);
  const a = document.createElement("a");
  a.download = `cricfield-${title.toLowerCase().replace(/\W+/g, "-")}.png`;
  a.href = c.toDataURL("image/png");
  a.click();
}
function wrap(g: CanvasRenderingContext2D, text: string, x: number, y: number, max: number, lh: number) {
  let line = "";
  for (const w of text.split(/\s+/)) {
    if (g.measureText(`${line}${w} `).width > max && line) { g.fillText(line, x, y); line = ""; y += lh; }
    line += `${w} `;
  }
  g.fillText(line, x, y);
}

interface BoardRow { rank: number; name: string; score: number; plays: number; you: boolean }
export function Leaderboard({ game, compact }: { game: GameId; compact?: boolean }) {
  const [period, setPeriod] = useState<"daily" | "weekly" | "all">("weekly");
  const [team, setTeam] = useState("");
  const [data, setData] = useState<{ top: BoardRow[]; you: BoardRow | null; entrants: number; scoreLabel: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    const ctl = new AbortController();
    setError(null);
    api<typeof data>(`/leaderboard/${game}?period=${period}${team ? `&team=${team}` : ""}`, { signal: ctl.signal }).then(setData).catch((e) => { if (e.name !== "AbortError") setError(e.message); });
    return () => ctl.abort();
  }, [game, period, team]);
  return (
    <section className={`pav-board${compact ? " pav-board-compact" : ""}`} aria-label={`${gameInfo(game)?.title} leaderboard`}>
      <div className="pav-board-head">
        <h3>Leaderboard</h3>
        <div role="group" aria-label="Period">{(["daily", "weekly", "all"] as const).map((p) => <button key={p} type="button" aria-pressed={period === p} onClick={() => setPeriod(p)}>{p === "all" ? "All time" : p[0].toUpperCase() + p.slice(1)}</button>)}</div>
        {!compact && <select aria-label="Filter by favourite franchise" value={team} onChange={(e) => setTeam(e.target.value)}><option value="">All fans</option>{["CSK", "DC", "GT", "KKR", "LSG", "MI", "PBKS", "RCB", "RR", "SRH"].map((t) => <option key={t}>{t}</option>)}</select>}
      </div>
      <p className="pav-small">Ranks {data?.scoreLabel?.toLowerCase() ?? "scores"} from server-validated games by signed-in players. Names are chosen handles or pseudonyms.</p>
      <ErrorNote error={error} />
      {data && (data.top.length ? <ol className="pav-board-list">{data.top.slice(0, compact ? 5 : 20).map((r) => <li key={r.rank} className={r.you ? "you" : ""}><span>{r.rank}</span><span>{r.name}{r.you ? " (you)" : ""}</span><strong>{r.score}</strong></li>)}</ol> : <p className="pav-small">No ranked games yet for this period. Be the first.</p>)}
      {data?.you && !data.top.some((r) => r.you) && <p className="pav-small">Your rank: {data.you.rank} of {data.entrants}</p>}
    </section>
  );
}

/** Accessible combobox over the canonical player registry. */
export function PlayerSearch({ onPick, disabled, label = "Search for a player", exclude = [] }: { onPick: (p: { id: string; name: string }) => void; disabled?: boolean; label?: string; exclude?: string[] }) {
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<{ id: string; name: string; detail: string }[]>([]);
  const [active, setActive] = useState(0);
  const id = useId();
  useEffect(() => {
    if (q.trim().length < 2) { setHits([]); return; }
    if(disabled){setHits([]);return;}
    const ctl = new AbortController();
    const t = setTimeout(() => { api<typeof hits>(`/players/search?q=${encodeURIComponent(q.trim())}`, { signal: ctl.signal }).then((h) => { setHits(h.filter((x) => !exclude.includes(x.id))); setActive(0); }).catch(() => undefined); }, 160);
    return () => { clearTimeout(t); ctl.abort(); };
  }, [q, exclude.join(","),disabled]); // eslint-disable-line react-hooks/exhaustive-deps
  const choose = (h: { id: string; name: string }) => { if(disabled)return;onPick(h); setQ(""); setHits([]); };
  return (
    <div className="pav-search">
      <label htmlFor={id} className="pav-sr">{label}</label>
      <input id={id} role="combobox" aria-expanded={hits.length > 0} aria-controls={`${id}-list`} aria-activedescendant={hits[active] ? `${id}-${active}` : undefined} autoComplete="off" placeholder={label} value={q} disabled={disabled}
        onChange={(e) => setQ(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") { e.preventDefault(); setActive((a) => Math.min(hits.length - 1, a + 1)); }
          if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => Math.max(0, a - 1)); }
          if (e.key === "Enter" && hits[active]) { e.preventDefault(); choose(hits[active]); }
          if (e.key === "Escape") setHits([]);
        }} />
      {hits.length > 0 && <ul id={`${id}-list`} role="listbox" className="pav-search-list">{hits.map((h, i) => <li key={h.id} id={`${id}-${i}`} role="option" aria-selected={i === active} onMouseDown={(e) => { e.preventDefault(); choose(h); }}><strong>{h.name}</strong><small>{h.detail}</small></li>)}</ul>}
    </div>
  );
}

export function Countdown({ ms }: { ms: number }) {
  const [left, setLeft] = useState(ms);
  useEffect(() => { const start = Date.now(); const t = setInterval(() => setLeft(Math.max(0, ms - (Date.now() - start))), 30_000); return () => clearInterval(t); }, [ms]);
  const h = Math.floor(left / 3_600_000), m = Math.floor((left % 3_600_000) / 60_000);
  return <span>{h}h {m}m</span>;
}
