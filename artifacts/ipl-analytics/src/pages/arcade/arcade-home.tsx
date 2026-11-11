import { HOME_ARCADE_GAMES, ARCADE_ART as ART } from "@/lib/arcade-catalog";
import { FeatureSaveButton } from "@/components/feature-save-button";
import { useEffect, useMemo, useState } from "react";
import { Link } from "wouter";
import { ArrowRight, Play, Trophy, Zap, Award, Gamepad2 } from "lucide-react";
import { Layout } from "@/components/layout";
import { ACHIEVEMENTS, GAMES, dailyKey, type Category, type GameId } from "@workspace/arcade-rules";
import { ArcadePassport, usePassport } from "@/components/arcade/passport";
import { Leaderboard } from "@/components/arcade/kit";
import { localRecords } from "@/lib/arcade/client";
import { useTeamTheme } from "@/lib/team-context";
import "@/components/arcade/arcade-kit.css";
import "./arcade-home.css";

const ACTIVE_GAMES = HOME_ARCADE_GAMES;
const CATEGORIES = [...new Set(ACTIVE_GAMES.map(g => g.category))];
const route = (id: GameId) => `/arcade/${id}`;
const PLAYERS: Record<string, string> = { RCB: "virat-kohli-transparent.png", CSK: "msd-transparent.png", MI: "rohit sharma.jpg", KKR: "s narine.jpg", SRH: "abhisek sharma.jpg", RR: "sanju-samson-transparent.png", DC: "kl rahul.jpg", PBKS: "shikhar dhawan.jpg", GT: "rashid khan.jpg", LSG: "kl rahul.jpg" };

export default function ArcadeHomePage() {
  const [category, setCategory] = useState<Category | "All">("All");
  const [board, setBoard] = useState<GameId>("cup-chase");
  const local = useMemo(() => localRecords(), []);
  const passport = usePassport();
  const { selectedTeam, theme } = useTeamTheme();
  const featured = GAMES[0];
  const today = dailyKey();
  useEffect(() => {
    document.title = "CRICFIELD Arcade - The Pavilion";
  }, []);
  const best = (id: GameId) => passport.data?.bests.find(b => b.game === id)?.best ?? local.bests[id];
  const completed = passport.data?.daily.some(d => d.game === "guess-cricketer" && d.completed) || Boolean(local.daily[`guess-cricketer:${today}`]);
  const earned = passport.data?.achievements ?? [];
  return <Layout hideRightPanel>
    <FeatureSaveButton feature="arcade" />
    <div className="pavilion">
      <div className="pv-top-grid">
        <section className="pv-hero pv-image-panel">
          <img className="pv-scene" src={theme?.bannerImg ?? "/venue-images/wankhede stadium.webp"} alt="" />
          <img key={selectedTeam ?? "neutral"} className="pv-hero-player" src={`/${PLAYERS[selectedTeam ?? "RCB"]}`} alt="" />
          <div className="pv-orbit" aria-hidden="true" />
          <div className="pv-hero-copy"><span className="pav-kicker">CRICFIELD ARCADE — THE PAVILION</span>
            <h1>Beyond the<br />Boundary.<br /><em>Into the Game.</em></h1>
            <p>Six cricket games built on real CRICFIELD data and honest simulations. Free to play, cosmetic rewards only.</p>
            <a href="#arcade-library" className="pav-btn pav-btn-gold">Explore Games <ArrowRight size={16} /></a>
          </div>
        </section>
        <div className="pv-passport-wrap"><ArcadePassport source={passport} /></div>
        <section className="pv-featured pv-image-panel">
          <img className="pv-scene" src={ART[featured.id]} alt="" />
          <div className="pv-feature-copy"><span className="pv-tag">FEATURED GAME</span><h2>{featured.title}</h2><p>Read the ball, time your swing, and chase three targets in a stadium batting challenge.</p>
            <Link href={route(featured.id)} className="pav-btn pav-btn-gold"><Play size={16} fill="currentColor" /> Play Now</Link>
          </div>
        </section>
        <section className="pv-challenge pv-image-panel"><img className="pv-scene" src={ART["guess-cricketer"]} alt="" /><div className="pv-challenge-copy"><h2><Zap size={22} /> Daily Challenge</h2><h3>Guess the Cricketer</h3><p>A mystery player is waiting. How many clues will you need?</p><Link href={route("guess-cricketer")} className="pav-btn pav-btn-gold">{completed ? "View Today’s Result" : "Play Today"} <ArrowRight size={16} /></Link></div></section>
      </div>
      <nav className="pv-filters" aria-label="Game categories"><button aria-pressed={category === "All"} onClick={() => setCategory("All")}><Gamepad2 size={17} /> All Games ({ACTIVE_GAMES.length})</button>{CATEGORIES.map(c => <button key={c} aria-pressed={category === c} onClick={() => setCategory(c)}>{c} <span>({ACTIVE_GAMES.filter(g => g.category === c).length})</span></button>)}</nav>
      <div className="pv-library-layout" id="arcade-library">
        <main className="pv-library" aria-label="Arcade games"><section className="pv-shelf"><header><h2>{category === "All" ? "All Games" : category}</h2><p>{ACTIVE_GAMES.filter(g => category === "All" || g.category === category).length} games to explore</p></header><div className="pv-grid">{ACTIVE_GAMES.filter(g => category === "All" || g.category === category).map(g => <Link key={g.id} href={route(g.id)} className={`pv-card pv-art-${g.id}`}><img src={ART[g.id]} alt="" loading="lazy" decoding="async" /><div className="pv-card-body"><h3>{g.title}</h3>{best(g.id) != null && <small className="pv-best">Best: {best(g.id)}</small>}</div><span className="pv-card-play" aria-hidden="true"><Play size={14} fill="currentColor" /></span></Link>)}</div></section></main>
        <aside className="pv-sidebar"><section className="pv-boards"><h2><Trophy size={22} /> Leaderboard</h2><select aria-label="Leaderboard game" value={board} onChange={e => setBoard(e.target.value as GameId)}>{ACTIVE_GAMES.map(g => <option key={g.id} value={g.id}>{g.title}</option>)}</select><Leaderboard game={board} compact /></section><section className="pv-achievements"><h2>Recent Achievements</h2><p className="pav-small">{earned.length ? `${earned.length} badges earned. Keep the streak going.` : "Your next great cricket moment starts here."}</p><div className="pv-badges">{ACHIEVEMENTS.slice(0, 4).map(a => <div key={a.code} className={earned.some(e => e.code === a.code) ? "earned" : ""} title={a.description}><Award size={30} /><span>{a.name}</span><small>{earned.some(e => e.code === a.code) ? "Earned" : "Locked"}</small></div>)}</div></section><Link href={route("auction-room")} className="pv-reward pv-image-panel"><img className="pv-scene" src="/ipl-trophy-cup.jpg" alt="" /><strong>Build your legacy.</strong><p>Complete challenges to earn XP, trophies and exclusive badges.</p><span>Start your season <ArrowRight size={16} /></span></Link></aside>
      </div>
      <p className="pav-datanote">Factual games use the CRICFIELD warehouse and canonical player registry. Simulations are labelled. Rewards are cosmetic and have no cash value.</p>
    </div>
  </Layout>;
}
