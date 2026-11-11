// Mobile Play — the arcade lobby: a lit marquee for today's featured game, the daily challenges, a shelf of game
// covers, continue-playing, the Arcade Passport and per-game leaderboards. Games themselves are the existing
// game pages (same engines), shown full-width inside the mobile shell.
import { useEffect, useMemo, useState } from "react";
import { Link } from "wouter";
import { Play } from "lucide-react";
import { GAMES, dailyKey, hashString, type GameId } from "@workspace/arcade-rules";
import { GameArt } from "@/components/arcade/game-art";
import { ArcadePassport } from "@/components/arcade/passport";
import { Leaderboard } from "@/components/arcade/kit";
import { gameTitle, listSaves, localRecords } from "@/lib/arcade/client";
import { SectionHead } from "../shell";
import "@/components/arcade/arcade-kit.css";

import { LIVE_GAMES as LIVE, featuredGame } from "../usage";
const DAILY: GameId[] = ["cricket-grid", "guess-cricketer"];

export default function MobilePlay() {
  const games = useMemo(() => GAMES.filter((g) => LIVE.includes(g.id)), []);
  const today = dailyKey();
  const featured = featuredGame();
  const local = useMemo(() => localRecords(), []);
  const [resume, setResume] = useState<string | null>(null);
  const [board, setBoard] = useState<GameId>("cup-chase");
  useEffect(() => { void listSaves<unknown>("auction-room").then((s) => s.length && setResume(new Date(s[0].updated).toLocaleDateString())); }, []);
  const recent = local.recent.filter((r) => LIVE.includes(r.game as GameId)).slice(0, 3);
  return (
    <div>
      <section className="mp-marquee" aria-labelledby="mp-featured">
        <GameArt id={featured.id} className="art" />
        <span className="mp-bulbs" aria-hidden="true" />
        <span className="cfm-kicker">Today's featured game</span>
        <h2 id="mp-featured">{featured.title}</h2>
        <p>{featured.tagline}</p>
        <Link href={`/arcade/${featured.id}`} className="cfm-btn cfm-btn-orange" style={{ alignSelf: "flex-start" }}><Play size={16} aria-hidden="true" />Play now · ≈ {featured.minutes} min</Link>
      </section>

      <section className="cfm-section">
        <SectionHead kicker={`Daily arena · ${today}`} title="Today's challenges" />
        <div className="mp-daily">
          {DAILY.map((id) => { const done = Boolean(local.daily[`${id}:${today}`]); return (
            <Link key={id} href={`/arcade/${id}`} className={done ? "done" : ""}><strong>{gameTitle(id)}</strong><span>{done ? "Completed today" : "New puzzle · resets 00:00 IST"}</span></Link>
          ); })}
        </div>
      </section>

      {(recent.length > 0 || resume) && (
        <section className="cfm-section">
          <SectionHead title="Continue playing" />
          <div className="cfm-strip">
            {resume && <Link href="/arcade/auction-room" className="cfm-chip" style={{ borderColor: "var(--m-gold)" }}>Resume auction · {resume}</Link>}
            {recent.map((r) => <Link key={r.game} href={`/arcade/${r.game}`} className="cfm-chip">{gameTitle(r.game)} again</Link>)}
          </div>
        </section>
      )}

      <section className="cfm-section">
        <SectionHead kicker="Six games" title="The shelf" />
        <div className="mp-shelf">
          {games.map((g) => (
            <Link key={g.id} href={`/arcade/${g.id}`} className="mp-cover">
              <GameArt id={g.id} />
              <span><strong>{g.title}</strong><small>{g.tagline}</small><em>{g.genre} · {g.difficulty} · ≈ {g.minutes} min{local.bests[g.id] != null ? ` · best ${local.bests[g.id]}` : ""}</em></span>
            </Link>
          ))}
        </div>
      </section>

      <section className="cfm-section pavilion" style={{ background: "transparent" }}>
        <ArcadePassport />
      </section>

      <section className="cfm-section pavilion" style={{ background: "transparent" }}>
        <label className="cfm-small" style={{ display: "grid", gap: 6 }}>Leaderboard for
          <select value={board} onChange={(e) => setBoard(e.target.value as GameId)} style={{ minHeight: 44, borderRadius: 10, background: "var(--m-navy)", color: "var(--m-ivory)", border: "1px solid var(--m-line)", padding: "0 10px", fontSize: 15 }}>
            {games.map((g) => <option key={g.id} value={g.id}>{g.title}</option>)}
          </select>
        </label>
        <Leaderboard game={board} compact />
      </section>
      <p className="cfm-provenance">Games are free to play; rewards are cosmetic only. Simulated games are labelled as simulations inside each game.</p>
    </div>
  );
}
