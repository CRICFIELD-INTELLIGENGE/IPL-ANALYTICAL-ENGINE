import { RETENTION_INDEX_VERSION } from "@/lib/retention-version";
/**
 * CRICFIELD RETENTION ROOM — Who Stays. Who Goes. Who Should Stay.
 * The earlier /feed/squad room's layout, filled with live data. Three outputs are
 * never mixed: CRICFIELD Picks (a recommendation), the Retention Forecast (a gated
 * model) and Fan Picks (votes). Every value comes from /api/retention; this page
 * formats them and calculates none.
 */

import { Fragment, useEffect, useRef, useState } from "react";
import { Link, useLocation, useRoute } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Activity, ArrowRight, ArrowUp, Bookmark, ChevronDown, ChevronRight, ChevronUp, Search, Shield, Shirt, Sparkles, Users, Vote, Zap } from "lucide-react";
import { AdSlot } from "@/components/ad-slot";
import { Layout } from "@/components/layout";
import { PlayerAvatar } from "@/components/player-avatar";
import { CategoryTag, LIVE_SEASON, ScenarioTable } from "@/components/retention/retention-widgets";
import { FranchiseSquadInsights } from "@/components/retention/rr-squad-insights";
import { SwipeCard } from "@/components/retention/swipe-card";
import { errorText } from "@/lib/discovery-api";
import { HUB_TEAMS } from "@/lib/ipl-2027";
import {
  CATEGORIES, checkBallot, fetchDilemmas, fetchFanResults, fetchForecast, fetchMyBallot, fetchPicks, fetchReplacementsFor, fetchRoom, fetchSeasons, fetchTrades, postEditorial, simulateRetention, submitBallot,
  type Choice, type Choices, type Dilemma, type DilemmaSide, type FanRow, type FranchiseRoom, type PickRow, type TeamPicks,
} from "@/lib/retention-api";
import { money } from "@/lib/sim-api";
import { signed } from "@/components/decision/module-shell";
import { isTeamCode, TEAM_REGISTRY, useTeamTheme, type TeamCode } from "@/lib/team-context";
import { CALL, PLAIN, PLAN, RELEASE_TIERS, TIER_RANK, TOP_TIERS, callOf, coreFive, firstSentence, genuineDoubt, isCore, likelyReleases, meter, plainAgainst, strongOn } from "@/lib/retention-summary";
import { readSaved, retentionKey, type RetentionSnapshot } from "@/lib/auction-plan";

type Tab = "picks" | "forecast" | "fans" | "impact" | "trades";
const TABS: [Tab, string][] = [["picks", "CRICFIELD Picks"], ["forecast", "Retention Forecast"], ["fans", "Fan Picks"], ["impact", "Squad Impact"], ["trades", "Trade Intelligence"]];
const EDITOR = import.meta.env.DEV || import.meta.env.VITE_ENABLE_ADMIN_PAGES === "true";
// min-w-0 lets a grid cell shrink, so wide tables scroll inside it instead of widening the page.
const card = "rounded-2xl border border-white/10 bg-[#0B1226]/80 p-5 backdrop-blur-xl min-w-0";
const ROLE_COLOURS: Record<string, string> = { batter: "#38BDF8", wicketkeeper: "#06B6D4", "all-rounder": "#A855F7", bowler: "#EC4899" };
const label = (role: string) => ({ batter: "Batters", wicketkeeper: "Wicketkeepers", "all-rounder": "All-rounders", bowler: "Bowlers" }[role] ?? role);
const day = (iso: string | null) => (iso ? new Date(`${iso}T00:00:00`).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "To be confirmed");

export default function RetentionRoomPage() {
  const [, params] = useRoute("/retention-room/:team");
  const [, go] = useLocation();
  const requested = params?.team?.toUpperCase() ?? "";
  const { selectedTeam, setSelectedTeam } = useTeamTheme();
  const team = isTeamCode(requested) ? requested : selectedTeam ?? "RCB";
  // The room sets the site's franchise colours, as the earlier /feed/squad room did.
  useEffect(() => { if (selectedTeam !== team) setSelectedTeam(team); }, [team]); // eslint-disable-line react-hooks/exhaustive-deps
  const [season, setSeason] = useState(LIVE_SEASON);
  const [tab, setTab] = useState<Tab>(new URLSearchParams(window.location.search).get("tab") === "fans" ? "fans" : "picks");
  const [choices, setChoices] = useState<Choices>({});
  useEffect(() => setChoices({}), [team]);
  const seasons = useQuery({ queryKey: ["retention-seasons"], queryFn: fetchSeasons, staleTime: 3_600_000 });
  const live = season === LIVE_SEASON;
  const room = useQuery({ queryKey: ["retention-room", season, team, RETENTION_INDEX_VERSION], queryFn: () => fetchRoom(season, team), enabled: live, retry: false });
  const picks = useQuery({ queryKey: ["retention-picks", team, RETENTION_INDEX_VERSION], queryFn: () => fetchPicks(LIVE_SEASON, team), enabled: live, retry: false });
  const theme = TEAM_REGISTRY[team];
  const d = room.data;
  const active = tab;
  const openTab = (t: Tab) => { setTab(t); document.getElementById("room-tabs")?.scrollIntoView({ behavior: "smooth", block: "start" }); };
  return (
    <Layout hideRightPanel>
      <div className="space-y-6 p-4 sm:p-6 bg-[#040814] min-h-screen text-white font-sans" style={{ "--team-accent": theme.accent } as React.CSSProperties}>
        <Header d={d} season={season} setSeason={setSeason} seasons={seasons.data?.seasons.filter(s => s.live)} />

        <nav aria-label="Franchise selector" className="-mx-4 overflow-x-auto px-4 py-1 no-scrollbar">
          <div className="flex items-center gap-2 w-max">
            {HUB_TEAMS.map((t) => (
              <button key={t} type="button" aria-pressed={team === t} onClick={() => go(`/retention-room/${t}`)}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl border text-xs font-black transition-all ${team === t ? "bg-[#0B1226] border-[var(--team-accent)] text-white ring-2 ring-[var(--team-accent)]/30 shadow-lg" : "bg-white/[0.03] border-white/10 text-white/70 hover:border-white/30 hover:text-white"}`}>
                <img src={TEAM_REGISTRY[t].logoImg} alt="" className="w-5 h-5 object-contain" /><span>{t}</span>
              </button>
            ))}
          </div>
        </nav>

        {room.isError && <p className="text-xs text-rose-300">{errorText(room.error)}</p>}
        {live && <Stage team={team} d={d} picks={picks.data} openTab={openTab} />}
        {live && picks.data && <SquadDna team={team} picks={picks.data} />}

        <div id="room-tabs" className="scroll-mt-20 flex flex-wrap gap-1.5" role="tablist">
          {TABS.map(([id, text]) => (
            <button key={id} role="tab" type="button" aria-selected={active === id} disabled={!live} onClick={() => setTab(id)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all disabled:opacity-40 ${active === id ? "bg-violet-600 text-white shadow" : "bg-white/[0.04] text-white/60 hover:text-white border border-white/5"}`}>{text}</button>
          ))}
        </div>
        {active === "picks" && <PicksTab team={team} q={picks} />}
        {active === "forecast" && <ForecastTab team={team} />}
        {active === "fans" && <FansTab team={team} choices={choices} setChoices={setChoices} />}
        {active === "impact" && <ImpactTab team={team} choices={choices} />}
        {active === "trades" && <TradesTab team={team} />}

        {live && (
          <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr] items-start">
            <Dilemmas team={team} picks={picks.data} />
            <div className="space-y-6">
              <RelatedTools team={team} />
              <RetentionAdBox team={team} picks={picks.data} />
            </div>
          </div>
        )}

        {d && (
          <footer className="text-[11px] text-white/45 space-y-1">
            <p>Model {d.modelVersion}, index {d.indexVersion}, data to {d.dataCutoff}. {d.provenance}</p>
            <details><summary className="cursor-pointer text-white/60">Rules assumptions and sources</summary><ul className="list-disc pl-5 mt-1">{d.rules.assumptions.map((a) => <li key={a}>{a}</li>)}</ul><ul className="list-disc pl-5 mt-1">{d.rules.sources.map((s) => <li key={s.url}><a href={s.url} target="_blank" rel="noreferrer" className="text-violet-300 hover:underline">{s.label}</a></li>)}</ul></details>
          </footer>
        )}
      </div>
    </Layout>
  );
}

function Header({ d, season, setSeason, seasons }: { d?: FranchiseRoom; season: number; setSeason: (s: number) => void; seasons?: { season: number; cycle: string }[] }) {
  const rules = d?.rules;
  const deadline = rules?.retentionDeadline.date ?? null;
  const past = (iso: string | null) => Boolean(iso) && Date.now() >= Date.parse(`${iso}T23:59:59+05:30`);
  const steps = [
    { title: "Pre-Retention", sub: "Picks, forecast and votes", when: d ? `Data to ${day(d.dataCutoff)}` : "", done: true },
    { title: "Retention Deadline", sub: rules?.retentionDeadline.status === "reported" ? "Reported date" : "Deadline", when: day(deadline), done: past(deadline) },
    { title: "Official Lists", sub: "Announcement", when: "After the deadline", done: false },
    { title: "Auction", sub: rules?.cycle === "mega" ? "Mega auction" : "Mini-auction", when: day(rules?.auction.date ?? null), done: past(rules?.auction.date ?? null) },
  ];
  return (
    <div className="grid gap-6 lg:grid-cols-[1.1fr_1fr] items-start">
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-xs text-white/50">
          <Link href="/feed" className="hover:text-white transition-colors">Feed</Link><span>›</span><span className="franchise-eyebrow font-medium">Squad Building</span>
        </div>
        <div className="inline-block px-2.5 py-0.5 rounded-md bg-[var(--team-accent)]/15 border border-[var(--team-accent)]/30 text-[10px] font-mono uppercase tracking-widest text-[var(--team-accent)] font-bold">
          IPL {season} · {rules?.cycle === "mega" ? "Mega auction" : "Mini-auction"}
        </div>
        <h1 className="text-3xl sm:text-5xl font-black uppercase tracking-tight text-white leading-none">The Retention <span className="text-[var(--team-accent)]">Room</span></h1>
        <p className="text-sm sm:text-base font-bold text-white/90">Who Stays. Who Goes. Who Should Stay.</p>
        <p className="text-xs sm:text-sm text-white/60 max-w-xl leading-relaxed">
          CRICFIELD's recommendation, the franchise forecast and the fans' vote, side by side and never mixed, with what each decision does to the squad.
        </p>
      </div>
      <div className="rounded-2xl border border-white/10 bg-[#0B1226]/80 p-5 backdrop-blur-xl space-y-4">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[11px] font-black uppercase tracking-widest text-white/80">IPL {season} Journey</span>
          <select aria-label="Season" value={season} onChange={(e) => setSeason(Number(e.target.value))} className="px-2 py-1 bg-black/40 border border-white/10 rounded-lg text-[11px] text-white">
            {(seasons ?? [{ season: LIVE_SEASON, cycle: "mini" }]).map((s) => <option key={s.season} value={s.season}>IPL {s.season} · {s.cycle}</option>)}
          </select>
        </div>
        <div className="relative pt-2 pb-1">
          <div className="absolute top-[18px] left-3 right-3 h-[2px] bg-white/10" />
          <ol className="relative z-10 grid grid-cols-4 gap-2 text-center">
            {steps.map((s, i) => (
              <li key={s.title} className="flex flex-col items-center">
                <div className={`w-5 h-5 rounded-full flex items-center justify-center ${s.done ? "bg-[var(--team-accent)] ring-4 ring-[var(--team-accent)]/20" : "bg-[#0B1226] border-2 border-white/30"}`}>
                  <div className={`rounded-full ${s.done ? "w-2 h-2 bg-black" : "w-1.5 h-1.5 bg-white/30"}`} />
                </div>
                <span className={`mt-2 text-[10px] leading-tight ${i === 0 || s.done ? "font-black text-[var(--team-accent)]" : "font-bold text-white/70"}`}>{s.title}</span>
                <span className="text-[9px] text-white/40">{s.sub}</span>
                <span className="text-[9px] font-mono text-white/30">{s.when}</span>
              </li>
            ))}
          </ol>
        </div>
        <div className="flex items-start gap-2 rounded-xl bg-white/[0.04] p-2.5 text-[11px] text-white/60 border border-white/5">
          <Vote className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
          <span>{rules ? `${rules.votingOpen ? `Fan voting is open until ${new Date(rules.votingLocksAt ?? "").toLocaleString()}.` : "Fan voting is closed."} Auction purse ${rules.auctionPurseLakh ? money(rules.auctionPurseLakh) : "not verified"}.` : "Reading this season's rules…"}</span>
        </div>
      </div>
    </div>
  );
}

function Avatars({ list, ring, team }: { list: { id: string; name: string }[]; ring: string; team: TeamCode }) {
  return (
    <div className="my-4 flex items-center justify-center gap-2 min-h-[58px]">
      {list.map((p) => (
        <div key={p.id} className="flex flex-col items-center">
          <PlayerAvatar name={p.name} teamId={team} className={`w-11 h-11 rounded-full ring-2 ${ring} shadow`} disableHover />
          <span className="mt-1 text-[9px] text-white/70 font-semibold truncate max-w-[54px] text-center">{p.name.split(" ").at(-1)}</span>
        </div>
      ))}
    </div>
  );
}

function Stage({ team, d, picks, openTab }: { team: TeamCode; d?: FranchiseRoom; picks?: TeamPicks; openTab: (t: Tab) => void }) {
  const theme = TEAM_REGISTRY[team];
  const rows = picks?.rows ?? [];
  const weakest = [...rows].reverse().find((p) => RELEASE_TIERS.has(p.category));
  const alt = useQuery({ queryKey: ["retention-replacements", weakest?.id, team], queryFn: () => fetchReplacementsFor(weakest!.id, team), enabled: Boolean(weakest), retry: false, staleTime: 300_000 });
  const overseas = rows.filter((p) => p.overseas).length;
  const glance: [React.ReactNode, string, React.ReactNode][] = [
    [<Users className="w-3.5 h-3.5 text-emerald-400" />, "Squad size", rows.length || "—"],
    [<span className="text-xs">🇮🇳</span>, "Indian players", rows.length ? rows.length - overseas : "—"],
    [<span className="text-xs">✈️</span>, "Overseas players", rows.length ? overseas : "—"],
    [<Activity className="w-3.5 h-3.5 text-sky-400" />, "Evidence coverage", d ? `${d.evidenceCoverage}%` : "—"],
    [<Vote className="w-3.5 h-3.5 text-amber-300" />, "Fan ballots", d ? d.ballots : "—"],
  ];
  const pod = "rounded-2xl p-4 flex flex-col justify-between shadow-lg relative transition-all";
  return (
    <section className="relative rounded-[28px] border border-white/15 bg-gradient-to-b from-[#0B1536] via-[#070D22] to-[#040817] p-6 lg:p-8 overflow-hidden shadow-2xl">
      <div className="absolute top-0 left-1/4 w-96 h-48 bg-sky-500/10 blur-[100px] pointer-events-none" />
      <div className="absolute top-0 right-1/4 w-96 h-48 bg-purple-500/10 blur-[100px] pointer-events-none" />
      <div className="absolute inset-0 opacity-15 pointer-events-none" style={{ backgroundImage: "radial-gradient(ellipse at 50% 100%, rgba(184, 243, 107, 0.25) 0%, transparent 60%)" }} />
      <div className="relative z-10 grid gap-6 lg:grid-cols-[200px_1fr_220px] items-center">
        <div className="flex flex-col items-center lg:items-start text-center lg:text-left space-y-3">
          <div className="relative w-32 h-32 flex items-center justify-center">
            <div className="absolute inset-0 rounded-full blur-2xl opacity-40" style={{ backgroundColor: theme.accent }} />
            <img src={theme.logoImg} alt={theme.name} className="relative z-10 w-28 h-28 object-contain drop-shadow-2xl" />
          </div>
          <div className="text-sm font-black uppercase text-white tracking-wide">{theme.shortName}</div>
          <Link href={`/dugout/${team.toLowerCase()}`} className="px-3.5 py-1.5 rounded-full bg-[var(--team-accent)] hover:brightness-110 text-black text-xs font-black transition-all shadow-md">Team Dugout</Link>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div className={`${pod} border border-amber-400/40 bg-gradient-to-b from-amber-500/15 via-[#0C142C]/90 to-[#070D1E] hover:border-amber-400`}>
            <div className="flex items-center justify-between"><span className="text-[11px] font-mono font-black text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded border border-amber-400/30">01</span><Users className="w-4 h-4 text-amber-300" /></div>
            <div className="mt-3"><h2 className="text-sm font-black uppercase tracking-wide text-white">Pick Your Retentions</h2><p className="text-[11px] text-white/60 mt-1 leading-snug">Choose who stays and who goes. Signed-in picks count as a fan vote.</p></div>
            <Avatars list={rows.slice(0, 3)} ring="ring-amber-400/60" team={team} />
            <button type="button" onClick={() => openTab("fans")} className="w-full py-2 rounded-xl bg-[#FACC15] hover:bg-[#FDE047] text-black text-center text-xs font-black transition-all shadow flex items-center justify-center gap-1.5">Make Your Picks <ArrowRight className="w-3.5 h-3.5" /></button>
          </div>

          <div className={`${pod} border border-cyan-400/50 bg-gradient-to-b from-cyan-500/20 via-[#0C142C]/90 to-[#070D1E] shadow-xl hover:border-cyan-400 sm:-translate-y-2`}>
            <div className="flex items-center justify-between"><span className="text-[11px] font-mono font-black text-cyan-300 bg-cyan-400/10 px-2 py-0.5 rounded border border-cyan-400/30">02</span><Shirt className="w-4 h-4 text-cyan-300" /></div>
            <div className="mt-3"><h2 className="text-sm font-black uppercase tracking-wide text-white">Squad Impact</h2><p className="text-[11px] text-white/60 mt-1 leading-snug">See the best XII, salary and role gaps your choices leave.</p></div>
            <div className="my-3 py-2 px-3 rounded-xl bg-black/40 border border-white/5 flex flex-col items-center gap-1.5" aria-hidden>
              {[2, 3, 2, 4].map((n, r) => <div key={r} className="flex gap-4">{Array.from({ length: n }, (_, i) => <div key={i} className="w-2.5 h-2.5 rounded-full bg-[#FACC15] ring-2 ring-white/30" />)}</div>)}
            </div>
            <button type="button" onClick={() => openTab("impact")} className="w-full py-2 rounded-xl bg-sky-500/20 border border-sky-400 text-sky-300 hover:bg-sky-500/30 text-center text-xs font-black transition-all flex items-center justify-center gap-1.5">Compare Squads <ArrowRight className="w-3.5 h-3.5" /></button>
          </div>

          <div className={`${pod} border border-purple-400/40 bg-gradient-to-b from-purple-500/15 via-[#0C142C]/90 to-[#070D1E] hover:border-purple-400`}>
            <div className="flex items-center justify-between"><span className="text-[11px] font-mono font-black text-purple-300 bg-purple-400/10 px-2 py-0.5 rounded border border-purple-400/30">03</span><Search className="w-4 h-4 text-purple-300" /></div>
            <div className="mt-3"><h2 className="text-sm font-black uppercase tracking-wide text-white">Explore Replacements</h2><p className="text-[11px] text-white/60 mt-1 leading-snug">{weakest ? `Who could fill the gap if ${weakest.name} goes.` : "Find players who could fill the gaps if key names leave."}</p></div>
            <Avatars list={alt.data?.options.slice(0, 3) ?? []} ring="ring-purple-400/60" team={team} />
            <button type="button" onClick={() => openTab("picks")} className="w-full py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-center text-xs font-black transition-all shadow flex items-center justify-center gap-1.5">Find Replacements <ArrowRight className="w-3.5 h-3.5" /></button>
          </div>
        </div>

        <div className="flex flex-col items-center lg:items-end space-y-3">
          <div className="relative w-24 h-24 flex items-center justify-center">
            <div className="absolute inset-0 bg-amber-400/20 blur-xl rounded-full" />
            <img src="/ipl-trophy-cup.jpg" alt="" className="relative z-10 w-20 h-20 object-contain drop-shadow" />
          </div>
          <div className="w-full rounded-2xl border border-white/10 bg-[#090E20]/90 p-3.5 space-y-2 text-xs backdrop-blur-md">
            <div className="text-[10px] font-black uppercase tracking-wider text-amber-300 mb-2">{theme.shortName} at a glance</div>
            {glance.map(([icon, name, value]) => (
              <div key={name} className="flex items-center justify-between text-white/70"><span className="flex items-center gap-1.5">{icon} {name}</span><span className="font-mono font-bold text-white">{value}</span></div>
            ))}
          </div>
        </div>
      </div>
      <div className="mt-6 pt-4 border-t border-white/10 text-center"><span className="text-xs sm:text-sm font-black uppercase tracking-[0.35em] text-white/20 select-none">{theme.name}</span></div>
    </section>
  );
}

function SquadDna({ team, picks }: { team: TeamCode; picks: TeamPicks }) {
  const theme = TEAM_REGISTRY[team];
  const rows = picks.rows;
  const roles = ["batter", "wicketkeeper", "all-rounder", "bowler"].map((r) => ({ role: r, n: rows.filter((p) => p.role === r).length }));
  const C = 2 * Math.PI * 38;
  let offset = 0;
  const arcs = roles.map((r) => { const len = (r.n / Math.max(1, rows.length)) * C; const a = { ...r, len, offset }; offset += len; return a; });
  const cats = CATEGORIES;
  const strengths = coreFive(picks);
  const concerns = likelyReleases(picks);
  return (
    <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
      <div className={card}>
        <div className="flex items-center justify-between mb-4 gap-2">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${theme.accent}30` }}><img src={theme.logoImg} alt="" className="w-4 h-4 object-contain" /></div>
            <div><h3 className="text-xs font-black uppercase tracking-wider text-white">Squad DNA</h3><p className="text-[11px] text-white/50">The IPL 2026 squad {theme.shortName} decides from</p></div>
          </div>
          <Link href={`/ai-analyst/squad-dna?team=${team}&season=2027`} className="text-[11px] font-bold text-violet-300 hover:text-white flex items-center gap-1 transition-colors">Full squad analysis <ChevronRight className="w-3.5 h-3.5" /></Link>
        </div>
        <div className="grid sm:grid-cols-2 gap-6 items-center">
          <div className="space-y-3">
            <span className="text-[10px] font-black uppercase tracking-wider text-white/60 block">Squad composition ({rows.length} players)</span>
            <div className="flex items-center gap-4">
              <div className="relative w-28 h-28 shrink-0 flex items-center justify-center">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100" aria-hidden>
                  <circle cx="50" cy="50" r="38" fill="none" stroke="#1E293B" strokeWidth="14" />
                  {arcs.map((a) => <circle key={a.role} cx="50" cy="50" r="38" fill="none" stroke={ROLE_COLOURS[a.role]} strokeWidth="14" strokeDasharray={`${a.len} ${C - a.len}`} strokeDashoffset={-a.offset} />)}
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center"><span className="text-lg font-black text-white leading-none">{rows.length}</span><span className="text-[8px] uppercase tracking-wider text-white/50">Players</span></div>
              </div>
              <div className="space-y-1 text-[11px] flex-1">
                {roles.map((r) => <div key={r.role} className="flex items-center justify-between text-white/80"><span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full" style={{ backgroundColor: ROLE_COLOURS[r.role] }} /> {label(r.role)}</span><span className="font-mono font-bold">{r.n}</span></div>)}
              </div>
            </div>
            <div className="pt-2 border-t border-white/5 flex items-center justify-between text-[11px] text-white/60">
              <span>Indian: <strong className="text-white font-mono">{rows.filter((p) => !p.overseas).length}</strong></span>
              <span>Overseas: <strong className="text-white font-mono">{rows.filter((p) => p.overseas).length}</strong></span>
            </div>
          </div>
          <div className="space-y-2">
            <span className="text-[10px] font-black uppercase tracking-wider text-white/60 block">CRICFIELD Picks across the squad</span>
            {cats.map((c) => { const n = rows.filter((p) => p.category === c).length; return (
              <div key={c} className="space-y-1">
                <div className="flex items-center justify-between text-[11px] text-white/80"><span>{c}</span><span className="font-mono text-white/50">{n}</span></div>
                <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden"><div className="h-full bg-[var(--team-accent)] transition-all duration-300" style={{ width: `${(n / Math.max(1, rows.length)) * 100}%` }} /></div>
              </div>
            ); })}
            <p className="text-[10px] text-white/40">"Strategy CRR tiers include franchise retention planning, master squad intelligence, role security and declared franchise policy."</p>
          </div>
        </div>
      </div>
      <SwipeCard className={card} slides={[
        { key: "strengths", label: "Key strengths", tone: "text-emerald-400", body: <>
          <p className="text-[10px] text-white/45 mb-2.5">Franchise core: top {strengths.length || 5} to build around, through the 2028 mega-auction cycle</p>
          <ul className="space-y-2">{strengths.map((p) => (
            <li key={p.id} className="flex items-start gap-2 text-xs text-white/85">
              <PlayerAvatar name={p.name} teamId={team} className="w-7 h-7 rounded-full shrink-0" disableHover />
              <span className="min-w-0"><b className="text-white">{p.name}</b>{isCore(picks, p.id) && <span className="ml-1.5 text-[9px] font-black text-emerald-300">🔒 CORE</span>}
                <span className="block text-[10px] text-white/45">{p.granularRole}{p.horizon.age !== null ? ` · age ${p.horizon.age}` : ""}{p.contractLakh ? ` · ${money(p.contractLakh)}` : ""}</span>
                <span className="block text-[11px] text-white/70">{firstSentence(p.reason)}</span></span>
            </li>))}</ul>
          {!strengths.length && <p className="text-xs text-white/50">No player reaches Priority Retain or above.</p>}
        </> },
        { key: "concerns", label: "Key concerns", tone: "text-rose-400", body: <>
          <p className="text-[10px] text-white/45 mb-2.5">Most likely released: weakest cases to keep, most likely to go first</p>
          <ul className="space-y-2">{concerns.map((p) => (
            <li key={p.id} className="flex items-start gap-2 text-xs text-white/85">
              <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-rose-500/20 text-rose-400 mt-0.5">!</span>
              <span className="min-w-0"><b className="text-white">{p.name}</b> <CategoryTag category={p.category} />
                <span className="block text-[11px] text-white/70">{plainAgainst(p)}.{p.contractLakh ? ` Releasing frees ${money(p.contractLakh)}.` : ""}</span></span>
            </li>))}</ul>
          {!concerns.length && <p className="text-xs text-white/50">No player is in a release tier.</p>}
        </> },
      ]} />
    </div>
  );
}

type SortKey = "prestige" | "index" | "salary" | "experience" | "performance" | "scarcity" | "economics" | "fit" | "horizon" | "name" | "change";
const SORTS: [SortKey, string][] = [
  ["prestige", "Hype & Prestige"],
  ["salary", "Salary (High-Low)"],
  ["experience", "Seniority & Experience"],
  ["index", "Score"],
  ["performance", "Form"],
  ["fit", "XI fit"],
  ["horizon", "Age"],
  ["name", "Name"]
];
const part = (p: PickRow, key: string) => p.metrics.find((m) => m.key === key)?.fraction ?? null;
const sortValue = (p: PickRow, k: SortKey): number | string | null => {
  if (k === "prestige") {
    const tierWeight = (7 - (TIER_ORDER_MAP[getTierKey(p)] ?? 7)) * 100000;
    const salaryWeight = (p.contractLakh ?? 0) * 10;
    const ageWeight = (p.horizon?.age ?? 20) * 5;
    const matchesWeight = (p.seasons?.reduce((acc, s) => acc + s.matches, 0) || 0) * 2;
    return tierWeight + salaryWeight + ageWeight + matchesWeight + p.index;
  }
  if (k === "index") return p.index;
  if (k === "salary") return p.contractLakh ?? 0;
  if (k === "experience") {
    const age = p.horizon?.age ?? 0;
    const matches = p.seasons?.reduce((acc, s) => acc + s.matches, 0) || 0;
    return age * 10 + matches;
  }
  if (k === "name") return p.name;
  if (k === "change") return p.previous ? p.index - p.previous.index : null;
  return part(p, k);
};
const pct = (f: number | null) => (f === null ? "—" : Math.round(f * 100));


/** Franchise Retention Board: every squad player, sortable by the rating or any component. */
export function getTierKey(p: PickRow, _data?: TeamPicks): "icons" | "core" | "priority" | "strong" | "retain" | "dilemma" | "release" | "other" {
  if (p.category === "Icons" || (p as any).isIcon) {
    return "icons";
  }
  if (p.category === "Franchise Cornerstone" || p.category === "Franchise Core") {
    return "core";
  }
  if (p.category === "Priority Retain") return "priority";
  if (p.category === "Strong Retain" || p.category === "Strong retain") return "strong";
  if (p.category === "Retain") return "retain";
  if (p.category === "Retention Dilemma") return "dilemma";
  if (p.category === "Release Candidate" || p.category === "Release / Buyback Review" || p.recommendation === "release") {
    return "release";
  }
  return "other";
}

const TIER_ORDER_MAP: Record<string, number> = {
  icons: 0,
  core: 1,
  priority: 2,
  strong: 3,
  retain: 4,
  dilemma: 5,
  release: 6,
  other: 7,
};

const TIER_FILTERS: { id: string; label: string; hint?: string; activeStyle: string; idleStyle: string; badge: string }[] = [
  {
    id: "all",
    label: "All Players (All)",
    activeStyle: "bg-white/20 border-white/40 text-white shadow font-black ring-1 ring-white/30",
    idleStyle: "bg-white/[0.04] border-white/10 text-white/70 hover:text-white hover:border-white/25",
    badge: "bg-white/20 text-white",
  },
  {
    id: "icons",
    label: "Icons",
    hint: "Franchise-defining legends whose identity and leadership transcend sporting metrics",
    activeStyle: "bg-amber-400/25 border-amber-300 text-amber-200 shadow font-black ring-1 ring-amber-300/60",
    idleStyle: "bg-amber-400/10 border-amber-400/30 text-amber-300/80 hover:text-amber-100 hover:border-amber-300/50",
    badge: "bg-amber-400/30 text-amber-200 border border-amber-400/50",
  },
  {
    id: "core",
    label: "Franchise Core",
    hint: "Indispensable cornerstone anchors through 2028",
    activeStyle: "bg-emerald-500/25 border-emerald-400 text-emerald-300 shadow font-black ring-1 ring-emerald-400/40",
    idleStyle: "bg-emerald-500/10 border-emerald-500/25 text-emerald-300/80 hover:text-emerald-200 hover:border-emerald-400/40",
    badge: "bg-emerald-500/30 text-emerald-200",
  },
  {
    id: "priority",
    label: "Priority Retain",
    hint: "Match-winning locks and regular starters",
    activeStyle: "bg-teal-500/25 border-teal-400 text-teal-300 shadow font-black ring-1 ring-teal-400/40",
    idleStyle: "bg-teal-500/10 border-teal-500/25 text-teal-300/80 hover:text-teal-200 hover:border-teal-400/40",
    badge: "bg-teal-500/30 text-teal-200",
  },
  {
    id: "strong",
    label: "Strong Retain",
    hint: "High-value proven assets with positive replacement differential",
    activeStyle: "bg-sky-500/25 border-sky-400 text-sky-300 shadow font-black ring-1 ring-sky-400/40",
    idleStyle: "bg-sky-500/10 border-sky-500/25 text-sky-300/80 hover:text-sky-200 hover:border-sky-400/40",
    badge: "bg-sky-500/30 text-sky-200",
  },
  {
    id: "retain",
    label: "Retain",
    hint: "60/40 more chance of keeping; has potential but yet to prove",
    activeStyle: "bg-indigo-500/25 border-indigo-400 text-indigo-300 shadow font-black ring-1 ring-indigo-400/40",
    idleStyle: "bg-indigo-500/10 border-indigo-500/25 text-indigo-300/80 hover:text-indigo-200 hover:border-indigo-400/40",
    badge: "bg-indigo-500/30 text-indigo-200",
  },
  {
    id: "dilemma",
    label: "Retention Dilemma",
    hint: "Borderline decision: salary vs auction valuation",
    activeStyle: "bg-amber-500/25 border-amber-400 text-amber-300 shadow font-black ring-1 ring-amber-400/40",
    idleStyle: "bg-amber-500/10 border-amber-500/25 text-amber-300/80 hover:text-amber-200 hover:border-amber-400/40",
    badge: "bg-amber-500/30 text-amber-200",
  },
  {
    id: "release",
    label: "Release Candidate",
    hint: "Releases to free auction purse, includes Buyback Review",
    activeStyle: "bg-rose-500/25 border-rose-400 text-rose-300 shadow font-black ring-1 ring-rose-400/40",
    idleStyle: "bg-rose-500/10 border-rose-500/25 text-rose-300/80 hover:text-rose-200 hover:border-rose-400/40",
    badge: "bg-rose-500/30 text-rose-200",
  },
];

const TIER_ROW_STYLES: Record<string, string> = {
  icons: "border-l-4 border-l-amber-300 bg-amber-500/[0.08] hover:bg-amber-500/[0.14]",
  core: "border-l-4 border-l-emerald-400 bg-emerald-500/[0.04] hover:bg-emerald-500/[0.08]",
  priority: "border-l-4 border-l-teal-400 bg-teal-500/[0.04] hover:bg-teal-500/[0.08]",
  strong: "border-l-4 border-l-sky-400 bg-sky-500/[0.04] hover:bg-sky-500/[0.08]",
  retain: "border-l-4 border-l-indigo-400 bg-indigo-500/[0.04] hover:bg-indigo-500/[0.08]",
  dilemma: "border-l-4 border-l-amber-400 bg-amber-500/[0.04] hover:bg-amber-500/[0.08]",
  release: "border-l-4 border-l-rose-400 bg-rose-500/[0.04] hover:bg-rose-500/[0.08]",
  other: "border-l-4 border-l-white/20 bg-white/[0.01] hover:bg-white/[0.03]",
};

function PicksTab({ team, q }: { team: TeamCode; q: ReturnType<typeof useQuery<TeamPicks>> }) {
  const [open, setOpen] = useState<string | null>(null);
  const [sort, setSort] = useState<{ key: SortKey; desc: boolean }>({ key: "prestige", desc: true });
  const [filterTier, setFilterTier] = useState<string>("all");
  const [viewDensity, setViewDensity] = useState<"compact" | "detailed">("compact");
  const [limitCount, setLimitCount] = useState<number | null>(10);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isScrolled, setIsScrolled] = useState(false);

  if (q.isError) return <p className="text-xs text-rose-300">{errorText(q.error)}</p>;
  if (!q.data) return <p className="text-xs text-white/60">Reading the squad…</p>;
  
  const getCount = (id: string) => {
    if (id === "all") return q.data?.rows.length ?? 0;
    return q.data?.rows.filter((p) => getTierKey(p, q.data) === id).length ?? 0;
  };

  // Deduplicate rows by canonical ID and normalized name
  const seenIds = new Set<string>();
  const seenNames = new Set<string>();
  const uniqueRows = q.data.rows.filter((p) => {
    const norm = p.name.toLowerCase().replace(/[^a-z]/g, "");
    if (seenIds.has(p.id) || seenNames.has(norm)) return false;
    seenIds.add(p.id);
    seenNames.add(norm);
    return true;
  });

  const rows = [...uniqueRows]
    .filter((p) => {
      if (filterTier === "all") return true;
      return getTierKey(p, q.data) === filterTier;
    })
    .sort((a, b) => {
      if (sort.key === "prestige") {
        const tA = TIER_ORDER_MAP[getTierKey(a, q.data)] ?? 99;
        const tB = TIER_ORDER_MAP[getTierKey(b, q.data)] ?? 99;
        if (tA !== tB) return sort.desc ? tA - tB : tB - tA;
        // Within same tier: higher salary first
        const salA = a.contractLakh ?? 0;
        const salB = b.contractLakh ?? 0;
        if (salA !== salB) return sort.desc ? salB - salA : salA - salB;
        // Seniority/experience
        const expA = ((a.horizon?.age ?? 0) * 10) + (a.seasons?.reduce((acc, s) => acc + s.matches, 0) || 0);
        const expB = ((b.horizon?.age ?? 0) * 10) + (b.seasons?.reduce((acc, s) => acc + s.matches, 0) || 0);
        if (expA !== expB) return sort.desc ? expB - expA : expA - expB;
        return sort.desc ? b.index - a.index : a.index - b.index;
      }
      if (sort.key === "index") {
        const tA = TIER_ORDER_MAP[getTierKey(a, q.data)] ?? 99;
        const tB = TIER_ORDER_MAP[getTierKey(b, q.data)] ?? 99;
        if (tA !== tB) return sort.desc ? tA - tB : tB - tA;
        return sort.desc ? b.index - a.index : a.index - b.index;
      }
      const x = sortValue(a, sort.key), y = sortValue(b, sort.key);
      if (x === null || y === null) return x === null ? (y === null ? 0 : 1) : -1;
      const c = typeof x === "string" ? x.localeCompare(String(y)) : x - (y as number);
      return sort.desc ? -c : c;
    });

  const visibleRows = limitCount && filterTier === "all" ? rows.slice(0, limitCount) : rows;

  const th = "p-3 cursor-pointer select-none hover:text-white";
  const head = (k: SortKey, text: string, extra = "") => (
    <th className={`${th} ${extra}`} aria-sort={sort.key === k ? (sort.desc ? "descending" : "ascending") : "none"}>
      <button type="button" onClick={() => setSort({ key: k, desc: sort.key === k ? !sort.desc : k !== "name" })} className="uppercase font-black tracking-wider">{text}{sort.key === k ? (sort.desc ? " ↓" : " ↑") : ""}</button>
    </th>
  );

  return (
    <section className={`${card} space-y-4`} aria-label="Franchise Retention Board">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-black uppercase tracking-wider text-white">Franchise Retention Board</h3>
          <p className="text-[11px] text-white/55 mt-0.5">Score out of 100: how strong the case is to keep each player. Sequenced by retention tiers.</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-mono text-white/40">{q.data.rows.length} players · {q.data.evidenceCoverage}% evidence</span>
        </div>
      </div>
      
      <div className="flex flex-wrap items-center gap-3 text-[10px] text-white/60" aria-label="Colour key">
        <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full bg-emerald-400" /> Strong</span>
        <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full bg-amber-400" /> Average</span>
        <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full bg-rose-400" /> Weak</span>
        <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full bg-white/15" /> Not measured</span>
        <span className="text-white/40">Form = last three seasons · Role need = how hard to replace · Value = salary vs auction price</span>
      </div>

      {/* Tier Filter Pills in exact sequence with distinct color palettes */}
      <div className="flex flex-wrap items-center gap-1.5 pt-1">
        <span className="text-[10px] uppercase font-bold text-white/50 mr-1">Filter tier:</span>
        {TIER_FILTERS.map((f) => {
          const active = filterTier === f.id;
          const count = getCount(f.id);
          return (
            <button
              key={f.id}
              type="button"
              title={f.hint}
              onClick={() => setFilterTier(f.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${
                active ? f.activeStyle : f.idleStyle
              }`}
            >
              <span>{f.label}</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-black ${
                active ? f.badge : "bg-white/10 text-white/60"
              }`}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Little Scrolling & Density Control Bar with Hype, Fame, Seniority & Salary Sort */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-2.5 rounded-xl bg-white/[0.03] border border-white/10">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[10px] uppercase font-bold text-white/50">Sort by:</span>
          <div className="flex flex-wrap gap-1">
            {SORTS.map(([k, t]) => (
              <button
                key={k}
                type="button"
                onClick={() => setSort({ key: k, desc: sort.key === k ? !sort.desc : (k !== "name") })}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all ${
                  sort.key === k
                    ? "bg-violet-600 text-white shadow-sm ring-1 ring-violet-400"
                    : "bg-white/[0.05] text-white/70 hover:text-white hover:bg-white/10"
                }`}
              >
                {t}{sort.key === k ? (sort.desc ? " ↓" : " ↑") : ""}
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] uppercase font-bold text-white/50">Density:</span>
          <div className="inline-flex items-center rounded-lg bg-black/40 p-0.5 border border-white/10 text-xs">
            <button
              type="button"
              onClick={() => setViewDensity("compact")}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-bold transition-all ${
                viewDensity === "compact"
                  ? "bg-violet-600 text-white shadow-sm"
                  : "text-white/60 hover:text-white"
              }`}
              title="Compact scan mode: shorter rows, fast scanning for short attention spans"
            >
              <Zap className="w-3 h-3 text-amber-300" />
              <span>Compact (Fast Scan)</span>
            </button>
            <button
              type="button"
              onClick={() => setViewDensity("detailed")}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-bold transition-all ${
                viewDensity === "detailed"
                  ? "bg-violet-600 text-white shadow-sm"
                  : "text-white/60 hover:text-white"
              }`}
              title="Detailed mode: statistical evidence & phase reports visible on every row"
            >
              <span>Detailed Breakdown</span>
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[11px] font-mono text-white/60">
            Showing <b className="text-white">{visibleRows.length}</b> of <b className="text-white">{rows.length}</b> {filterTier !== "all" ? `(${filterTier})` : "players"}
          </span>
          {filterTier === "all" && rows.length > 10 && (
            <button
              type="button"
              onClick={() => setLimitCount(limitCount ? null : 10)}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-white/[0.06] hover:bg-white/[0.12] text-violet-300 border border-violet-400/20 transition-all shadow-sm"
            >
              {limitCount ? (
                <>
                  <ChevronDown className="w-3.5 h-3.5" />
                  <span>Show all {rows.length}</span>
                </>
              ) : (
                <>
                  <ChevronUp className="w-3.5 h-3.5" />
                  <span>Show Top 10 (Quick scan)</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5 sm:hidden" aria-label="Sort by">
        {SORTS.map(([k, t]) => <button key={k} type="button" onClick={() => setSort({ key: k, desc: sort.key === k ? !sort.desc : k !== "name" })} className={`px-2.5 py-1 rounded-lg text-[10px] font-bold ${sort.key === k ? "bg-violet-600 text-white" : "bg-white/[0.04] text-white/60"}`}>{t}{sort.key === k ? (sort.desc ? " ↓" : " ↑") : ""}</button>)}
      </div>

      {/* Contained Scrollable Viewport with Sticky Header (Little Scrolling Feature) */}
      <div
        ref={scrollRef}
        onScroll={(e) => setIsScrolled(e.currentTarget.scrollTop > 120)}
        className="overflow-x-auto overflow-y-auto max-h-[580px] rounded-xl border border-white/10 relative bg-[#070c18] shadow-inner scroll-smooth"
      >
        <table className="w-full text-left text-xs">
          <thead className="bg-[#0c1427] sticky top-0 z-20 shadow-md border-b border-white/10 text-[10px] text-white/60 backdrop-blur-md">
            <tr>
              <th className="p-3">#</th>{head("name", "Player")}{head("salary", "Salary")}<th className="p-3 uppercase font-black tracking-wider">Verdict</th>{head("index", "Score", "text-right")}
              {head("performance", "Form", "text-center")}{head("scarcity", "Role need", "text-center")}{head("economics", "Value", "text-center")}{head("fit", "XI fit", "text-center")}{head("horizon", "Age", "text-center")}<th className="p-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5 font-medium">
            {visibleRows.map((p, i) => {
              const tierKey = getTierKey(p, q.data);
              const rowStyle = TIER_ROW_STYLES[tierKey] || TIER_ROW_STYLES.other;
              return (
                <Fragment key={p.id}>
                  <tr className={`${rowStyle} transition-colors align-top`}>
                    <td className="p-3 font-mono text-white/40">{i + 1}</td>
                    <td className="p-3">
                      <div className="flex items-center gap-2.5">
                        <PlayerAvatar name={p.name} teamId={team} className="w-8 h-8 rounded-full shrink-0" disableHover />
                        <div>
                          <div className="font-bold text-white">
                            {p.warehouseId ? <Link href={`/players/${encodeURIComponent(p.name)}`} className="hover:underline">{p.name}</Link> : p.name}
                            {p.tradedIn && <span className="ml-1.5 text-[9px] font-black text-emerald-300">TRADED IN</span>}
                          </div>
                          <div className="text-[10px] text-white/45">{p.granularRole}</div>
                        </div>
                      </div>
                    </td>
                    <td className="p-3 text-white/70 font-mono whitespace-nowrap">{p.contractLakh ? money(p.contractLakh) : p.editorial?.salary ? p.editorial.salary : "n/a"}</td>
                    <td className="p-3 max-w-[17rem]">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <CategoryTag category={p.category} />
                        {isCore(q.data, p.id) && <span className="text-[9px] font-black text-emerald-300">🔒 CORE</span>}
                        {(p.inPlayingXI || p.editorial?.inPlayingXI) && <span className="px-1.5 py-0.5 rounded text-[9px] font-black bg-sky-500/20 text-sky-300 border border-sky-400/30">XI</span>}
                        {(p.impactSub || p.editorial?.impactSub) && <span className="px-1.5 py-0.5 rounded text-[9px] font-black bg-amber-500/20 text-amber-300 border border-amber-400/30">SUB</span>}
                      </div>
                      <p className={`text-[11px] text-white/90 mt-1.5 leading-snug font-medium ${viewDensity === "compact" ? "line-clamp-1" : ""}`}>
                        {p.reason.includes("Performance evidence:") ? p.reason.split("Performance evidence:")[0].trim().replace(/\.*$/, "") + "." : firstSentence(p.reason) + "."}
                      </p>
                      
                      {/* Attached Stats & Performance Report below reason (visible in Detailed mode or expand) */}
                      {viewDensity === "detailed" && (
                        <div className="mt-2 pt-1.5 border-t border-white/5 space-y-1">
                          {p.reason.includes("Performance evidence:") && (
                            <p className="text-[10px] text-violet-300 font-medium leading-tight">
                              <span className="font-bold uppercase tracking-wider text-[9px] text-violet-400 mr-1">📊 Stats Report:</span>
                              {p.reason.split("Performance evidence:")[1]?.trim()}
                            </p>
                          )}
                          {p.projection && (
                            <div className="flex flex-wrap items-center gap-1.5 text-[9px] font-mono text-white/60">
                              <span className="px-1.5 py-0.5 rounded bg-violet-500/20 text-violet-300 font-bold">
                                {signed(p.projection.rar)} RAR/m
                              </span>
                              <span>·</span>
                              <span>Seasons: {p.projection.seasonsUsed.join(", ")}</span>
                              {p.fitIncrement !== null && (
                                <>
                                  <span>·</span>
                                  <span className={p.fitIncrement >= 0 ? "text-emerald-400" : "text-amber-400"}>
                                    Best XI {signed(p.fitIncrement)}
                                  </span>
                                </>
                              )}
                            </div>
                          )}
                          {(p.strengths || p.editorial?.strengths) && (
                            <p className="text-[10px] text-emerald-400/90 line-clamp-1">
                              <span className="font-bold uppercase text-[9px] text-emerald-500 mr-1">Strength:</span>
                              {p.strengths || p.editorial?.strengths}
                            </p>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="p-3 text-right">
                      <div className="text-base font-black text-white font-mono">{p.coverage ? p.index.toFixed(0) : "—"}</div>
                      <div className="ml-auto mt-1 h-1.5 w-14 bg-white/10 rounded-full overflow-hidden">
                        <div className={`h-full ${meter(p.coverage ? p.index / 100 : null)}`} style={{ width: `${p.coverage ? p.index : 0}%` }} />
                      </div>
                    </td>
                    {(["performance", "scarcity", "economics", "fit", "horizon"] as const).map((k) => {
                      const f = part(p, k);
                      return (
                        <td key={k} className="p-3 text-center">
                          <span title={f === null ? "Not measured" : `${pct(f)} / 100`} className={`inline-block h-3 w-3 rounded-full ${meter(f)}`} />
                        </td>
                      );
                    })}
                    <td className="p-3 text-right">
                      <button
                        type="button"
                        aria-expanded={open === p.id}
                        onClick={() => setOpen(open === p.id ? null : p.id)}
                        className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-white/[0.04] text-violet-300 hover:bg-white/10 whitespace-nowrap"
                      >
                        {open === p.id ? "Hide" : "Why?"}
                      </button>
                    </td>
                  </tr>
                  {open === p.id && (
                    <tr>
                      <td colSpan={11} className="p-0">
                        <PickDetail p={p} team={team} picks={q.data} onSaved={() => void q.refetch()} />
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>

        {/* View all remaining players in squad prompt */}
        {limitCount && rows.length > limitCount && filterTier === "all" && (
          <div className="p-3 text-center border-t border-white/5 bg-white/[0.02]">
            <button
              type="button"
              onClick={() => setLimitCount(null)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-violet-600/30 hover:bg-violet-600/50 text-violet-200 border border-violet-400/30 transition-all shadow-sm"
            >
              <ChevronDown className="w-4 h-4" />
              <span>Load remaining {rows.length - limitCount} players ({team} squad)</span>
            </button>
          </div>
        )}

        {/* Floating Quick Return to Top of Board */}
        {isScrolled && (
          <div className="sticky bottom-3 right-3 flex justify-end pointer-events-none pr-3 pb-1 z-30">
            <button
              type="button"
              onClick={() => scrollRef.current?.scrollTo({ top: 0, behavior: "smooth" })}
              className="pointer-events-auto flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-violet-600/90 text-white text-xs font-bold shadow-xl hover:bg-violet-500 transition-all border border-violet-300/30 backdrop-blur-md"
            >
              <ArrowUp className="w-3.5 h-3.5" />
              <span>Top of Board</span>
            </button>
          </div>
        )}
      </div>
    </section>
  );
}

/** Player Decision Breakdown: components, three seasons by phase, decision scenarios, sensitivity and limits. */
function PickDetail({ p, team, picks, onSaved }: { p: PickRow; team: TeamCode; picks: TeamPicks; onSaved: () => void }) {
  const alt = useQuery({ queryKey: ["retention-replacements", p.id, team], queryFn: () => fetchReplacementsFor(p.id, team), retry: false, staleTime: 300_000 });
  const h4 = "text-[10px] font-black uppercase tracking-wider text-[var(--team-accent)] mt-3 mb-1";
  const cell = "py-1 pr-3 font-mono text-white/75 whitespace-nowrap";
  const lakh = (n: number | null) => (n === null ? "—" : `${n >= 0 ? "+" : "−"}${money(Math.abs(n))}`);
  const name = (m: { key: string; label: string }) => PLAIN[m.key] ?? m.label;
  const good = p.metrics.filter((m) => m.fraction !== null && m.fraction >= 0.7).map(name);
  const weak = p.metrics.filter((m) => m.fraction !== null && m.fraction < 0.4).map(name);
  const box = "rounded-xl border border-white/10 bg-black/20 p-3 min-w-0";
  return (
    <div className="bg-white/[0.03] border-y border-white/10 p-4 space-y-4 text-xs">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className={box}><span className="text-[10px] font-black uppercase text-white/50">Verdict</span><div className="mt-1"><CategoryTag category={p.category} /></div><p className="mt-1.5 text-white/80">{PLAN[p.category]}.</p></div>
        <div className={box}><span className="text-[10px] font-black uppercase text-emerald-400">Why keep</span>{(p.strengths || p.editorial?.strengths) ? <p className="mt-1 text-emerald-300 font-medium">{p.strengths || p.editorial?.strengths}</p> : <ul className="mt-1 space-y-0.5 text-white/80">{good.length ? good.map((g) => <li key={g}>✓ {g}</li>) : <li className="text-white/50">No standout strength measured</li>}</ul>}</div>
        <div className={box}><span className="text-[10px] font-black uppercase text-rose-400">Why worry</span>{(p.weaknesses || p.editorial?.weaknesses) ? <p className="mt-1 text-rose-300 font-medium">{p.weaknesses || p.editorial?.weaknesses}</p> : <ul className="mt-1 space-y-0.5 text-white/80">{weak.map((w) => <li key={w}>! {w}</li>)}{!weak.length && p.against && !/Declared franchise policy/i.test(p.against) && <li>! {firstSentence(p.against.replace(/^[^:]{3,40}:\s*/, ""))}</li>}{!weak.length && !p.against && <li className="text-white/50">No clear weakness</li>}</ul>}</div>
        <div className={box}><span className="text-[10px] font-black uppercase text-amber-300">Money</span><p className="mt-1 text-white/80">Salary <b className="text-white">{p.contractLakh ? money(p.contractLakh) : "n/a"}</b></p><p className="text-white/80">Auction value about <b className="text-white">{money(p.financial.predictedLakh)}</b></p><p className="text-[10px] text-white/45">Likely range {money(p.financial.predictedRange.low)}–{money(p.financial.predictedRange.high)}</p></div>
      </div>
      <div className="grid gap-x-6 gap-y-1.5 sm:grid-cols-2">{p.metrics.map((m) => (
        <div key={m.key}><div className="flex justify-between text-[11px] text-white/75"><span>{name(m)}</span><span className="font-mono text-white/45">{m.fraction === null ? "not measured" : Math.round(m.fraction * 100)}</span></div>
          <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden"><div className={`h-full ${meter(m.fraction)}`} style={{ width: `${(m.fraction ?? 0) * 100}%` }} /></div></div>))}</div>
      <details className="group"><summary className="cursor-pointer text-[11px] font-bold text-violet-300 hover:text-violet-200 flex items-center gap-1.5 py-1"><span>📑 10-Point CricField Analyst Dossier & Scouting Breakdown</span><span className="text-[10px] text-white/40 group-open:rotate-180 transition-transform">▼</span></summary>
    <div className="mt-3 grid lg:grid-cols-[1.3fr_1fr] gap-5">
      <div className="min-w-0">
        <h4 className={h4}>Why CRICFIELD would {p.recommendation === "release" ? "move on" : p.recommendation === "retain" ? "retain this player" : "weigh this up"}</h4>
        <p className="text-white/70">{p.reason}.{p.against ? ` Against: ${p.against}.` : ""}</p>
        <h4 className={h4}>Eight CRR components</h4>{p.strategy && <p className="text-xs text-amber-200 mb-3">Evidence and strategy base: {p.strategy.baseIndex.toFixed(1)}. Declared {p.strategy.policyCategory} policy band: {p.strategy.scoreRange.join("-")}. Final Strategy CRR: {p.index.toFixed(1)}. {p.strategy.basis}</p>}
        {p.metrics.map((m) => (
          <div key={m.key} className="mb-1.5">
            <div className="flex items-center justify-between text-[11px] text-white/80"><span>{m.label} <span className="text-white/40">· weight {m.max}</span></span><span className="font-mono text-white/50">{m.fraction === null ? "Left out" : `${Math.round(m.fraction * 100)} / 100`}</span></div>
            <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden"><div className="h-full bg-[var(--team-accent)]" style={{ width: `${(m.fraction ?? 0) * 100}%` }} /></div>
            <div className="text-[10px] text-white/45 mt-0.5">{m.evidence}</div>
          </div>
        ))}
        <h4 className={h4}>Three seasons, runs above replacement per match</h4>
        {p.seasons.length ? (
          <div className="overflow-x-auto"><table className="text-[11px]"><thead className="text-[9px] uppercase text-white/40"><tr><th className="pr-3 text-left">Season</th><th className="pr-3">M</th><th className="pr-3">Bat</th><th className="pr-3">Bowl</th><th className="pr-3">PP</th><th className="pr-3">Middle</th><th className="pr-3">Death</th></tr></thead>
            <tbody>{p.seasons.map((s) => <tr key={s.season}><td className={cell}>{s.season}</td><td className={cell}>{s.matches}</td><td className={cell}>{signed(s.batPerMatch)}</td><td className={cell}>{signed(s.bowlPerMatch)}</td>{[0, 1, 2].map((i) => <td key={i} className={cell}>{signed(s.batPhase[i] + s.bowlPhase[i])}</td>)}</tr>)}</tbody>
          </table></div>
        ) : <p className="text-white/50">No IPL record in the window.</p>}
        {p.projection && <p className="text-[10px] text-white/45 mt-1">Projection {signed(p.projection.rar)} ± {p.projection.sd.toFixed(1)} from {p.projection.seasonsUsed.join(", ")}, shrunk toward the league prior. A season without matches adds nothing.</p>}
        <h4 className={h4}>Scenario simulator</h4>
        <div className="overflow-x-auto"><table className="w-full text-[11px]"><thead className="text-[9px] uppercase text-white/40"><tr><th className="pr-3 text-left">Choice</th><th className="pr-3 text-right">Runs/match</th><th className="pr-3 text-right">Purse</th><th className="text-left">What it means</th></tr></thead>
          <tbody className="divide-y divide-white/5">{p.scenarios.map((s) => (
            <tr key={s.label} className={s.available ? "" : "opacity-50"}>
              <td className="py-1.5 pr-3 font-bold text-white whitespace-nowrap">{s.label}</td>
              <td className={`${cell} text-right`}>{s.rarChange === null ? "—" : signed(s.rarChange)}</td>
              <td className={`${cell} text-right`}>{lakh(s.purseChangeLakh)}</td>
              <td className="py-1.5 text-white/60">{s.detail}{s.probability && <span className="block text-white/45">{Math.round(s.probability.value * 100)}%: {s.probability.meaning}</span>}{s.sources && <span className="block">{s.sources.map((x) => <a key={x.url} href={x.url} target="_blank" rel="noreferrer" className="mr-2 text-violet-300 hover:underline">{x.publisher}</a>)}</span>}</td>
            </tr>
          ))}</tbody>
        </table></div>
        <p className="text-[10px] text-white/40 mt-1">Purse is the change against keeping the player. Retain counts the contract as spent.</p>
      </div>
      <div className="min-w-0">
        <h4 className={h4}>Confidence and sensitivity</h4>
        <p className="text-white/70">{p.strategy && "The decision band is held by the declared policy; tier stability is not independent validation. "}{p.confidence[0].toUpperCase() + p.confidence.slice(1)} confidence, {p.coverage}% of the weight measured. Under {p.sensitivity.byWeights.length} other weightings the rating runs {p.sensitivity.range[0]}–{p.sensitivity.range[1]} and the tier holds in {Math.round(p.sensitivity.tierStability * 100)}% of them.</p>
        <ul className="text-[10px] text-white/50 mt-1">{p.sensitivity.byWeights.map((b) => <li key={b.set}>{b.set}: {b.index} · {b.category}</li>)}</ul>
        {p.previous && <p className="text-[10px] text-white/45 mt-1">Previous model ({p.previous.version}): {p.previous.index} · {p.previous.category}.</p>}
        <h4 className={h4}>Age and cycle</h4>
        <p className="text-white/70">{p.horizon.age === null ? "Age not verified." : `Age ${p.horizon.age} in ${picks.season}. Next season ${signed(p.horizon.oneYear ?? 0)}, three seasons ${signed(p.horizon.threeYear ?? 0)} runs per match from age alone.`} {p.horizon.megaNote}</p>
        <h4 className={h4}>Financial implications</h4>
        <p className="text-white/70">{p.financial.note} 80% range {money(p.financial.predictedRange.low)} to {money(p.financial.predictedRange.high)}.</p>
        <h4 className={h4}>Replacement alternatives</h4>
        {alt.data ? alt.data.options.slice(0, 4).map((o) => <p key={o.id} className="text-white/70">{o.name}{o.team ? ` (${o.team})` : ""}: {signed(o.increment)} runs/match, expected {money(o.priceLakh)}</p>) : <p className="text-white/50">Solving…</p>}
        <h4 className={h4}>Model limitations</h4>
        <ul className="list-disc pl-4 text-white/55">{p.limitations.map((l) => <li key={l}>{l}</li>)}</ul>
        {p.editorial && <><h4 className={h4}>Editorial view, kept apart from the score</h4><p className="border-l-2 border-amber-300 pl-2 text-white/80">{p.editorial.category}: {p.editorial.rationale}</p></>}
        {EDITOR && <DeskForm season={picks.season} fields={{ kind: "override", team, player: p.id }} label="Rationale" category onSaved={onSaved} />}
      </div>
    </div>
      </details>
    </div>
  );
}

const STATUS_TONE: Record<string, string> = {
  Completed: "bg-emerald-500/20 text-emerald-300", "Officially Confirmed": "bg-emerald-500/20 text-emerald-300", "Negotiations Reported": "bg-amber-500/20 text-amber-200",
  "Reported Interest": "bg-amber-500/15 text-amber-200", Rumour: "bg-white/10 text-white/70", Denied: "bg-rose-500/20 text-rose-300", Stalled: "bg-white/10 text-white/60", Superseded: "bg-white/10 text-white/50",
};

/** Trade Intelligence Panel: the sourced ledger. Only completed entries change a squad. */
function TradesTab({ team }: { team: TeamCode }) {
  const q = useQuery({ queryKey: ["retention-trades", team], queryFn: () => fetchTrades(team), retry: false, staleTime: 300_000 });
  if (q.isError) return <p className="text-xs text-rose-300">{errorText(q.error)}</p>;
  if (!q.data) return <p className="text-xs text-white/60">Reading the ledger…</p>;
  return (
    <section className={`${card} space-y-4`} aria-label="Trade Intelligence">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-black uppercase tracking-wider text-white">Trade intelligence</h3>
        <span className="text-[11px] font-mono text-white/40">Ledger updated {q.data.updatedAt ?? "—"}</span>
      </div>
      <p className="text-[11px] text-white/55">{q.data.note} Reports are never turned into facts by CRICFIELD.</p>
      {!q.data.entries.length && <p className="text-xs text-white/50">No reported trade involves {team}.</p>}
      <div className="grid gap-3 md:grid-cols-2">
        {q.data.entries.map((e) => (
          <article key={e.id} className="rounded-xl border border-white/10 bg-white/[0.02] p-4 space-y-2 min-w-0">
            <div className="flex flex-wrap items-center gap-2"><span className={`px-2 py-0.5 rounded-md text-[10px] font-black ${STATUS_TONE[e.status] ?? "bg-white/10"}`}>{e.status}</span><span className="text-[10px] text-white/50">{e.label}</span></div>
            <ul className="space-y-1">{e.moves.map((m) => (
              <li key={m.player} className="text-xs text-white/85"><b className="text-white">{m.player}</b> {m.from} → {m.to}{m.feeLakh ? ` · ${money(m.feeLakh)}` : ""}
                <span className="block text-[10px] text-white/45">{m.rar === null ? "Unrated" : `${signed(m.rar)} runs/match`}{m.crr ? ` · CRR ${m.crr.index} ${m.crr.category}` : ""}{m.canonicalId ? "" : " · name not matched to one player"}</span></li>
            ))}</ul>
            <details className="text-[11px]"><summary className="cursor-pointer text-white/50">Sources and history</summary>
              <ul className="mt-1 space-y-0.5">{e.sources.map((s) => <li key={s.url}><a href={s.url} target="_blank" rel="noreferrer" className="text-violet-300 hover:underline">{s.publisher}</a>{s.official ? " · official" : ""} · {s.publishedOn}{s.note ? ` · ${s.note}` : ""}</li>)}</ul>
              <ul className="mt-1 text-white/50">{e.history.map((h) => <li key={h.on + h.status}>{h.on}: {h.status}</li>)}</ul>
              <p className="text-white/40 mt-1">Last checked {e.lastChecked}.</p>
            </details>
          </article>
        ))}
      </div>
    </section>
  );
}

function DeskForm({ season, fields, label: field, category, onSaved }: { season: number; fields: Record<string, string>; label: string; category?: boolean; onSaved: () => void }) {
  const [token, setToken] = useState(""), [text, setText] = useState(""), [cat, setCat] = useState("Retention Dilemma"), [note, setNote] = useState("");
  const input = "px-2 py-1.5 bg-black/40 border border-white/10 rounded-lg text-xs text-white";
  const save = async () => {
    const ok = await postEditorial(season, token, { ...fields, ...(category ? { category: cat, rationale: text } : { opinion: text }) });
    setNote(ok ? "Saved." : "Not saved. Check the token, and write at least 40 characters.");
    if (ok) { setText(""); onSaved(); }
  };
  return (
    <details className="mt-3 grid gap-1.5"><summary className="cursor-pointer text-[11px] text-white/50">Editorial desk</summary>
      {category && <select aria-label="Editorial category" value={cat} onChange={(e) => setCat(e.target.value)} className={input}>{CATEGORIES.filter((c) => c !== "Insufficient Evidence").map((c) => <option key={c}>{c}</option>)}</select>}
      <textarea aria-label={field} rows={3} placeholder={field} value={text} onChange={(e) => setText(e.target.value)} className={input} />
      <input aria-label="Admin token" type="password" placeholder="Admin token" value={token} onChange={(e) => setToken(e.target.value)} autoComplete="off" className={input} />
      <button type="button" disabled={!token || text.trim().length < 40} onClick={() => void save()} className="px-3 py-1.5 rounded-lg bg-white/10 text-xs font-bold disabled:opacity-40">Save</button>
      {note && <span className="text-[11px] text-white/60">{note}</span>}
    </details>
  );
}

function Side({ s, team }: { s: DilemmaSide; team: TeamCode }) {
  return (
    <div className="flex items-start gap-2.5 p-2 rounded-xl bg-white/[0.02] border border-white/5 min-w-0">
      <PlayerAvatar name={s.name} teamId={team} className="w-10 h-10 rounded-full shrink-0" disableHover />
      <div className="min-w-0"><div className="text-xs font-bold text-white">{s.name} <span className="font-normal text-white/45">{s.role}</span></div><p className="text-[10px] text-white/55">Index {s.index.toFixed(1)} · {s.contractLakh ? money(s.contractLakh) : "salary n/a"} · expected {money(s.predictedLakh)}{s.fit !== null ? ` · ${signed(s.fit)} to the XII` : ""}</p></div>
    </div>
  );
}

function Dilemmas({ team, picks }: { team: TeamCode; picks?: TeamPicks }) {
  const q = useQuery({ queryKey: ["retention-dilemmas", team], queryFn: () => fetchDilemmas(LIVE_SEASON, team), retry: false });
  const doubt = picks ? genuineDoubt(picks) : [];
  const doubtIds = new Set(doubt.map((p) => p.id));
  // A head-to-head only counts when one side is itself a genuine doubt; two locked keepers are not a dilemma.
  const list: Dilemma[] = (q.data?.dilemmas ?? []).filter((d) => doubtIds.has(d.a.id) || doubtIds.has(d.b.id));
  return (
    <section className={`${card} space-y-4`} aria-label="The Retention Dilemmas">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-black uppercase tracking-wider text-white">The Retention Dilemmas → Scout Room</h3>
          <p className="text-[11px] text-white/55">Borderline decisions: examine uncertainty factors, auction dynamics & scout replacements</p>
        </div>
        <span className="text-[10px] text-amber-300 bg-amber-400/15 border border-amber-400/30 px-2.5 py-1 rounded-full font-bold">
          {doubt.length} active dilemmas
        </span>
      </div>
      {doubt.map((p) => (
        <article key={p.id} className="rounded-2xl border border-amber-400/25 bg-amber-500/[0.05] p-4 space-y-3.5 transition-all hover:border-amber-400/40">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <PlayerAvatar name={p.name} teamId={team} className="w-10 h-10 rounded-full shrink-0" disableHover />
              <div className="min-w-0">
                <div className="text-sm font-bold text-white flex items-center gap-1.5">
                  {p.name} <CategoryTag category={p.category} />
                </div>
                <p className="text-[10px] text-white/55">
                  {p.granularRole} · Salary {p.contractLakh ? money(p.contractLakh) : p.editorial?.salary ? p.editorial.salary : "n/a"} · Auction Valuation {money(p.predictedLakh)}
                </p>
              </div>
            </div>
            <Link
              href={`/scout?player=${encodeURIComponent(p.name)}&role=${encodeURIComponent(p.role)}&team=${team}`}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-amber-400/20 hover:bg-amber-400/30 text-amber-200 border border-amber-400/40 text-xs font-black transition-all shadow-sm"
            >
              Scout Room Intel <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="grid sm:grid-cols-2 gap-2.5 text-xs">
            <div className="rounded-xl bg-emerald-500/[0.08] border border-emerald-400/25 p-3 space-y-1">
              <b className="block text-[10px] uppercase font-black tracking-wider text-emerald-300">Case to Retain</b>
              <p className="text-white/85 text-[11px] leading-relaxed">
                {strongOn(p).length ? `Strong on ${strongOn(p).join(", ")}. Proven upside in specialized match phases.` : `${firstSentence(p.reason)}.`}
              </p>
            </div>
            <div className="rounded-xl bg-rose-500/[0.08] border border-rose-400/25 p-3 space-y-1">
              <b className="block text-[10px] uppercase font-black tracking-wider text-rose-300">Case to Release / Auction Buyback</b>
              <p className="text-white/85 text-[11px] leading-relaxed">
                {p.contractLakh && p.contractLakh > p.predictedLakh
                  ? `Contract salary (${money(p.contractLakh)}) exceeds estimated open-auction price (${money(p.predictedLakh)}). Releasing frees purse flexibility.`
                  : "Role overlap with other core squad options; replacement candidates available at equivalent or lower auction spend."}
              </p>
            </div>
          </div>

          <div className="pt-2 border-t border-white/5 flex flex-wrap items-center justify-between text-[11px] text-white/50 gap-2">
            <span>
              Analyst confidence: <strong className="text-white font-mono">{p.confidence}</strong> · Tier stability: <strong className="text-white font-mono">{Math.round(p.sensitivity.tierStability * 100)}%</strong>
            </span>
            <span className="text-amber-200/80 font-medium">
              Recommendation: {p.recommendation === "retain" ? "Hold for final auction slot" : "Evaluate RTM or buyback review"}
            </span>
          </div>
        </article>
      ))}
      {!doubt.length && !list.length && q.data && <p className="text-xs text-white/50">No genuine retention doubt for {team}: every call is clear.</p>}
      {list.map((d) => (
        <article key={d.id} className="rounded-2xl border border-white/10 bg-white/[0.02] p-4 space-y-2">
          <span className="px-2 py-0.5 rounded bg-violet-600 text-white text-[9px] font-black uppercase tracking-wider">Dilemma</span>
          <h4 className="font-bold text-sm text-white leading-snug">{d.title}</h4>
          <p className="text-[11px] text-white/55">{d.question}</p>
          <div className="grid sm:grid-cols-[1fr_auto_1fr] gap-2 items-center"><Side s={d.a} team={team} /><span className="text-center text-[10px] font-black text-[var(--team-accent)]">OR</span><Side s={d.b} team={team} /></div>
          <ul className="list-disc pl-4 text-[11px] text-white/60">{d.evidence.map((e) => <li key={e}>{e}</li>)}</ul>
          {d.opinion && <blockquote className="border-l-2 border-amber-300 pl-2 text-xs text-white/80">Editorial opinion: {d.opinion.text}</blockquote>}
          {EDITOR && <DeskForm season={LIVE_SEASON} fields={{ kind: "dilemma", team, dilemmaId: d.id }} label="Opinion" onSaved={() => void q.refetch()} />}
        </article>
      ))}
    </section>
  );
}

function RelatedTools({ team }: { team: TeamCode }) {
  const theme = TEAM_REGISTRY[team];
  const tools: [string, string, string, React.ReactNode, string][] = [
    [`/dugout/${team.toLowerCase()}`, `${theme.shortName} Team Dugout`, "Full squad, stats and history", <Shield className="w-4 h-4" />, "bg-amber-500/20 text-amber-300"],
    [`/ai-analyst/auction-war-room?team=${team}`, "Auction War Room", "Expected prices and franchise fit", <Activity className="w-4 h-4" />, "bg-emerald-500/20 text-emerald-300"],
    [`/arcade/build-your-xi?team=${team}`, "Build Playing XI", "Recommended combinations and role alternatives", <Shirt className="w-4 h-4" />, "bg-cyan-500/20 text-cyan-300"],
    [`/ai-analyst/squad-dna?team=${team}&season=2027`, "Squad DNA", "Player roles, strengths and recruitment gaps", <Users className="w-4 h-4" />, "bg-pink-500/20 text-pink-300"],
    ["/scout", "Global Scout Engine", "Find and compare targets", <Search className="w-4 h-4" />, "bg-sky-500/20 text-sky-300"],
    ["/feed/ipl-2027/retentions", "Official retentions", "Confirmed lists, with sources", <Users className="w-4 h-4" />, "bg-purple-500/20 text-purple-300"],
  ];
  return (
    <div className={`${card} flex flex-col space-y-3`}>
      <h3 className="text-xs font-black uppercase tracking-wider text-white mb-1">Related tools</h3>
      <div className="space-y-2.5">
        {tools.map(([href, name, sub, icon, tone]) => (
          <Link key={href} href={href} className="flex items-center justify-between p-3 rounded-xl bg-white/[0.03] border border-white/5 hover:border-white/20 hover:bg-white/[0.06] transition-all group">
            <div className="flex items-center gap-2.5"><div className={`w-8 h-8 rounded-lg flex items-center justify-center ${tone}`}>{icon}</div><div><span className="text-xs font-bold text-white block">{name}</span><span className="text-[10px] text-white/45">{sub}</span></div></div>
            <ArrowRight className="w-3.5 h-3.5 text-white/40 group-hover:text-white" />
          </Link>
        ))}
      </div>
    </div>
  );
}

function RetentionAdBox({ team, picks }: { team: TeamCode; picks?: TeamPicks }) {
  const theme = TEAM_REGISTRY[team];
  const dilemmasCount = picks ? genuineDoubt(picks).length : 0;
  return (
    <aside className={`${card} space-y-4 border border-white/10 bg-gradient-to-b from-[#0B1536]/90 via-[#070D22]/95 to-[#040813] shadow-xl relative overflow-hidden`} aria-label="Partner Sponsorship & Ad Box">
      <div className="flex items-center justify-between border-b border-white/10 pb-3">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[var(--team-accent)] animate-ping" />
          <span className="text-[10px] font-black uppercase tracking-widest text-white/60">Sponsor Spotlight</span>
        </div>
        <span className="text-[9px] font-mono px-2 py-0.5 rounded bg-white/5 text-white/40 border border-white/5 uppercase">Advertisement</span>
      </div>
      <AdSlot slot="cricfield-retention-dilemma-sidebar" minHeight={dilemmasCount >= 3 ? 280 : 200} label={false} />
      <div className="rounded-xl border border-white/10 bg-gradient-to-br from-white/[0.04] to-transparent p-4 text-center space-y-3 relative group hover:border-[var(--team-accent)]/40 transition-all">
        <div className="inline-flex items-center justify-center w-11 h-11 rounded-2xl bg-[var(--team-accent)]/15 border border-[var(--team-accent)]/30 text-[var(--team-accent)] shadow-lg mx-auto">
          <Sparkles className="w-5 h-5" />
        </div>
        <div>
          <h4 className="text-xs font-black uppercase tracking-wider text-white">{theme.shortName} Strategic Intelligence Partner</h4>
          <p className="text-[11px] text-white/65 mt-1 leading-relaxed">Target high-intent cricket managers, auction bidders, and mega-retention analysts throughout the 2027 IPL cycle.</p>
        </div>
        <div className="p-3 rounded-lg bg-black/40 border border-white/5 text-[11px] space-y-1.5 text-left">
          <div className="flex items-center justify-between text-white/70">
            <span className="text-[10px] uppercase font-bold text-white/40">Dilemma Pool</span>
            <span className="font-mono font-bold text-amber-300">{dilemmasCount} Active Decisions</span>
          </div>
          <div className="flex items-center justify-between text-white/70">
            <span className="text-[10px] uppercase font-bold text-white/40">Placement</span>
            <span className="text-white/80 font-mono text-[10px]">Prime Board Sidebar</span>
          </div>
        </div>
        <div className="pt-1 flex flex-col sm:flex-row items-center justify-center gap-2">
          <a href="mailto:partnerships@cricfield.com?subject=Retention%20Room%20Sidebar%20Sponsorship" className="w-full sm:w-auto px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-[11px] font-black transition-all shadow-md flex items-center justify-center gap-1.5">Partner with CricField <ArrowRight className="w-3.5 h-3.5" /></a>
          <Link href={`/dugout/${team.toLowerCase()}`} className="w-full sm:w-auto px-3.5 py-2 rounded-xl bg-white/[0.05] hover:bg-white/10 text-white/80 text-[11px] font-bold border border-white/10 transition-all text-center">{theme.shortName} Dugout</Link>
        </div>
      </div>
      {dilemmasCount >= 2 && (
        <div className="rounded-xl border border-white/5 bg-white/[0.02] p-3 text-[10px] text-white/45 flex items-center justify-between">
          <span>High-traffic decision zone</span>
          <span className="font-mono text-[var(--team-accent)] font-bold">100% Verified Evidence</span>
        </div>
      )}
    </aside>
  );
}

function ForecastTab({ team }: { team: TeamCode }) {
  const q = useQuery({ queryKey: ["retention-forecast", team], queryFn: () => fetchForecast(LIVE_SEASON, team), retry: false });
  const picks = useQuery({ queryKey: ["retention-picks", team, RETENTION_INDEX_VERSION], queryFn: () => fetchPicks(LIVE_SEASON, team), retry: false });
  const [filterTier, setFilterTier] = useState<string>("all");
  const [limitCount, setLimitCount] = useState<number | null>(8);
  const d = q.data;
  if (q.isError) return <p className="text-xs text-rose-300">{errorText(q.error)}</p>;
  if (!d) return <p className="text-xs text-white/60">Reading the forecast…</p>;
  const v = d.validation, h = v.classification.holdout;
  if (picks.isError) return <p className="text-xs text-rose-300">{errorText(picks.error)}</p>;
  if (!picks.data) return <p className="text-xs text-white/60">Reading the squad…</p>;

  const forecastOf = new Map(d.rows.map((r) => [r.id, r]));

  const TIER_ORDER: Record<string, number> = {
    "Icons": 0,
    "Franchise Cornerstone": 1,
    "Franchise Core": 1,
    "Priority Retain": 2,
    "Strong Retain": 3,
    "Retain": 4,
    "Retention Dilemma": 5,
    "Release / Buyback Review": 6,
    "Release Candidate": 7,
    "Insufficient Evidence": 8,
  };

  // Deduplicate rows in ForecastTab
  const seenForecastIds = new Set<string>();
  const seenForecastNames = new Set<string>();
  const uniqueForecastRows = picks.data.rows.filter((p) => {
    const norm = p.name.toLowerCase().replace(/[^a-z]/g, "");
    if (seenForecastIds.has(p.id) || seenForecastNames.has(norm)) return false;
    seenForecastIds.add(p.id);
    seenForecastNames.add(norm);
    return true;
  });

  const rows = [...uniqueForecastRows]
    .filter((p) => {
      if (filterTier === "all") return true;
      if (filterTier === "icons") return p.category === "Icons" || (p as any).isIcon;
      if (filterTier === "core") return p.category === "Franchise Cornerstone" || p.category === "Franchise Core";
      if (filterTier === "priority") return p.category === "Priority Retain";
      if (filterTier === "strong") return p.category === "Strong Retain" || p.category === "Strong retain";
      if (filterTier === "retain") return p.category === "Retain";
      if (filterTier === "dilemma") return p.category === "Retention Dilemma";
      if (filterTier === "release") return p.category === "Release Candidate" || p.category === "Release / Buyback Review" || p.recommendation === "release";
      return true;
    })
    .sort((a, b) => {
      const oA = TIER_ORDER[a.category] ?? 99;
      const oB = TIER_ORDER[b.category] ?? 99;
      if (oA !== oB) return oA - oB;
      // Secondary: Salary tiebreaker (highest contract first)
      const salA = a.contractLakh ?? 0;
      const salB = b.contractLakh ?? 0;
      if (salA !== salB) return salB - salA;
      // Tertiary: Seniority & matches
      const expA = ((a.horizon?.age ?? 0) * 10) + (a.seasons?.reduce((acc, s) => acc + s.matches, 0) || 0);
      const expB = ((b.horizon?.age ?? 0) * 10) + (b.seasons?.reduce((acc, s) => acc + s.matches, 0) || 0);
      if (expA !== expB) return expB - expA;
      return b.index - a.index;
    });

  const visibleRows = limitCount && filterTier === "all" ? rows.slice(0, limitCount) : rows;

  return (
    <div className="space-y-6">
      <FranchiseSquadInsights team={team} />
      <section className={`${card} space-y-4`} aria-label="Retention Forecast">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-black uppercase tracking-wider text-white">What {team} should do, player by player</h3>
            <p className="text-[11px] text-white/55 mt-0.5">Matched with CRICFIELD Picks verdict. Sequenced by retention tiers.</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-mono text-white/60">
              Showing <b className="text-white">{visibleRows.length}</b> of <b className="text-white">{rows.length}</b> players
            </span>
            {filterTier === "all" && rows.length > 8 && (
              <button
                type="button"
                onClick={() => setLimitCount(limitCount ? null : 8)}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-white/[0.06] hover:bg-white/[0.12] text-violet-300 border border-violet-400/20 transition-all shadow-sm"
              >
                {limitCount ? (
                  <>
                    <ChevronDown className="w-3.5 h-3.5" />
                    <span>Show all {rows.length}</span>
                  </>
                ) : (
                  <>
                    <ChevronUp className="w-3.5 h-3.5" />
                    <span>Show Top 8 (Quick scan)</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[10px] uppercase font-bold text-white/50 mr-1">Filter tier:</span>
          {[
            { id: "all", label: "All" },
            { id: "core", label: "Franchise Core" },
            { id: "priority", label: "Priority Retain" },
            { id: "strong", label: "Strong Retain" },
            { id: "retain", label: "Retain" },
            { id: "dilemma", label: "Retention Dilemma" },
            { id: "release", label: "Release Candidate" },
          ].map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setFilterTier(f.id)}
              className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all border ${
                filterTier === f.id
                  ? "bg-violet-600 border-violet-400 text-white shadow font-black"
                  : "bg-white/[0.03] border-white/5 text-white/60 hover:text-white hover:border-white/20"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-2 text-[10px]">{(["retain", "doubt", "release", "unclear"] as const).map((k) => <span key={k} className={`px-2 py-0.5 rounded-md font-black ${CALL[k].tone}`}>{CALL[k].label} · {rows.filter((p) => callOf(p) === k).length}</span>)}</div>
      
      {/* Contained Scrollable Cards Grid for Low-Scroll UX */}
      <div className="overflow-y-auto max-h-[640px] pr-1 rounded-xl scroll-smooth">
        <div className="grid gap-3 md:grid-cols-2">
          {visibleRows.map((p) => {
            const r = forecastOf.get(p.id);
            const up = (r?.factors ?? []).filter((f) => f.detail === "raises the score").map((f) => f.label);
            const down = (r?.factors ?? []).filter((f) => f.detail === "lowers the score" && !(p.contractLakh && /no contract/i.test(f.label))).map((f) => f.label);
            const call = CALL[callOf(p)];
            const strong = strongOn(p);
            return (
              <article key={p.id} className="rounded-xl border border-white/10 bg-white/[0.02] p-3.5 space-y-2 min-w-0">
                <div className="flex items-center gap-2.5">
                  <PlayerAvatar name={p.name} teamId={team} className="w-9 h-9 rounded-full shrink-0" disableHover />
                  <div className="min-w-0 flex-1"><div className="font-bold text-white text-sm">{p.name}{isCore(picks.data, p.id) && <span className="ml-1.5 text-[9px] font-black text-emerald-300">🔒 CORE</span>}</div><div className="text-[10px] text-white/45">{p.granularRole}{p.contractLakh ? ` · ${money(p.contractLakh)}` : p.editorial?.salary ? ` · ${p.editorial.salary}` : ""}</div></div>
                  {r?.confirmed ? <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-emerald-500/20 text-emerald-300">Confirmed: {r.confirmed.decision}</span> : <span className={`px-2 py-0.5 rounded-md text-[10px] font-black ${call.tone}`}>{call.label}</span>}
                </div>
                <div className="flex items-center gap-1.5"><CategoryTag category={p.category} /><span className="text-[10px] text-white/45">score {p.index.toFixed(0)}/100</span></div>
                <div className="text-[11px]"><b className={callOf(p) === "release" ? "text-rose-300" : "text-emerald-300"}>{callOf(p) === "release" ? "Why let go: " : "Why hold: "}</b><span className="text-white/80">{callOf(p) === "release" ? plainAgainst(p) : [firstSentence(p.reason), strong.length ? `strong on ${strong.join(", ")}` : ""].filter(Boolean).join("; ")}.</span></div>
                {callOf(p) !== "release" && (down.length > 0 || up.length > 0) && <div className="text-[11px] text-white/55">{up.length > 0 && <>Helps: {up.join(", ")}. </>}{down.length > 0 && <>Watch-outs: {down.join(", ")}.</>}</div>}
                <div className="text-[11px] rounded-lg bg-black/20 p-2"><b className="text-amber-300">Strategy: </b><span className="text-white/80">{PLAN[p.category]}.</span> <span className="text-white/50">Auction value about {money(p.predictedLakh)}{p.contractLakh ? ` vs salary ${money(p.contractLakh)}` : p.editorial?.salary ? ` vs salary ${p.editorial.salary}` : ""}.</span></div>
              </article>
            );
          })}
        </div>
        {limitCount && rows.length > limitCount && filterTier === "all" && (
          <div className="p-3 mt-3 text-center border-t border-white/5 bg-white/[0.02] rounded-xl">
            <button
              type="button"
              onClick={() => setLimitCount(null)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-violet-600/30 hover:bg-violet-600/50 text-violet-200 border border-violet-400/30 transition-all shadow-sm"
            >
              <ChevronDown className="w-4 h-4" />
              <span>Load remaining {rows.length - limitCount} player cards</span>
            </button>
          </div>
        )}
      </div>
      {!d.forecastStatus.available && <p className="text-[10px] text-white/40">No percentage chances are shown: CricField's probability model has not yet passed its accuracy test.</p>}
      <details className="text-[10px] text-white/40"><summary className="cursor-pointer">How the probability model has tested</summary><p className="mt-1">{d.forecastStatus.reason} {v.method}. On the {v.holdout.seasons.join(", ")} holdout: accuracy {Math.round(h.accuracy * 100)}%, precision {Math.round(h.precision * 100)}%, recall {Math.round(h.recall * 100)}%, Brier {v.holdout.brier} (base rate {v.holdout.baseRateBrier}), log loss {v.holdout.logLoss}, calibration error {v.holdout.ece}. Model {d.modelVersion}, data to {d.dataCutoff}.</p></details>
      </section>
    </div>
  );
}

const squash = (s: string) => s.toLowerCase().replace(/[^a-z]/g, "");

function FansTab({ team, choices, setChoices }: { team: TeamCode; choices: Choices; setChoices: React.Dispatch<React.SetStateAction<Choices>> }) {
  const theme = TEAM_REGISTRY[team];
  const picks = useQuery({ queryKey: ["retention-picks", team, RETENTION_INDEX_VERSION], queryFn: () => fetchPicks(LIVE_SEASON, team), retry: false });
  const fans = useQuery({ queryKey: ["retention-fans", team], queryFn: () => fetchFanResults(LIVE_SEASON, team), retry: false });
  const mine = useQuery({ queryKey: ["retention-mine", team], queryFn: () => fetchMyBallot(LIVE_SEASON, team), retry: false });
  const [status, setStatus] = useState<{ text: string; signIn?: boolean } | null>(null);
  const [text, setText] = useState(""), [role, setRole] = useState(""), [nation, setNation] = useState(""), [state, setState] = useState("");
  useEffect(() => {
    if (Object.keys(choices).length || mine.isLoading || !picks.data) return;
    if (mine.data) { setChoices(mine.data.choices); return; }
    // Picks saved on this device by the earlier /feed/squad room, which stored display names.
    const saved = readSaved<RetentionSnapshot | null>(retentionKey(team), null);
    if (!saved?.players.length) return;
    const names = new Set(saved.players.map((p) => squash(p.name)));
    const found = picks.data.rows.filter((p) => [p.name, ...p.aliases].some((n) => names.has(squash(n))));
    if (!found.length) return;
    setChoices(Object.fromEntries(found.map((p) => [p.id, "retain" as const])));
    setStatus({ text: `Loaded ${found.length} retained picks saved on this device. Choose the rest, then submit to count as a vote.` });
  }, [mine.data, mine.isLoading, picks.data]); // eslint-disable-line react-hooks/exhaustive-deps
  const key = JSON.stringify(choices);
  const check = useQuery({ queryKey: ["retention-check", team, key], queryFn: () => checkBallot(LIVE_SEASON, team, choices), enabled: Object.keys(choices).length > 0, placeholderData: (x) => x, retry: false });
  const sim = useQuery({ queryKey: ["retention-sim", team, key], queryFn: () => simulateRetention(LIVE_SEASON, team, Object.keys(choices).length ? choices : undefined), placeholderData: (x) => x, retry: false });
  const rows = picks.data?.rows ?? [];
  const open = fans.data?.votingOpen ?? false;
  const set = (id: string, c: Choice | null) => setChoices((now) => {
    const { [id]: _was, ...rest } = now;
    return c === null ? rest : { ...now, [id]: c };
  });
  // Auction Intelligence and Star Watch import this snapshot.
  const saveOnDevice = () => {
    const players = rows.filter((p) => choices[p.id] === "retain").map((p) => ({ name: p.name, role: p.role, overseas: Boolean(p.overseas) }));
    try { localStorage.setItem(retentionKey(team), JSON.stringify({ team, savedAt: new Date().toISOString(), players })); return players.length; } catch { return null; }
  };
  const roleList = [...new Set(rows.map((p) => p.role))];
  const shown = rows.filter((p) => (!role || p.role === role) && (!nation || (nation === "overseas") === Boolean(p.overseas)) && (!state || (choices[p.id] ?? "undecided") === state) && (!text.trim() || [p.name, ...p.aliases].some((n) => n.toLowerCase().includes(text.trim().toLowerCase()))));
  const submit = async () => {
    const r = await submitBallot(LIVE_SEASON, team, choices);
    setStatus(r.ok ? { text: "Vote saved. You can edit it until voting locks." } : { text: r.message ?? "Not saved.", signIn: r.status === 401 });
    if (r.ok) { saveOnDevice(); void fans.refetch(); }
  };
  const retained = Object.values(choices).filter((c) => c === "retain").length;
  const released = Object.values(choices).filter((c) => c === "release").length;
  const keptOverseas = rows.filter((p) => p.overseas && choices[p.id] === "retain").length;
  const violations = check.data?.violations ?? [];
  const mineScenario = sim.data?.scenarios.at(-1);
  const select = "px-3 py-1.5 bg-black/40 border border-white/10 rounded-xl text-xs text-white focus:outline-none";
  const callBtn = (on: boolean, tone: string) => `px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all disabled:opacity-40 ${on ? tone : "bg-white/[0.04] text-white/60 hover:text-white hover:bg-white/10"}`;
  const fanList = (title: string, list: FanRow[]) => list.length > 0 && <div><h4 className="text-[10px] font-black uppercase tracking-wider text-white/60 mt-3">{title}</h4><ul className="text-xs text-white/70 mt-1 space-y-0.5">{list.map((r) => <li key={r.id}>{r.name}: {r.retainPct}% retain (CRICFIELD: {r.cricfield})</li>)}</ul></div>;
  return (
    <>
      <div id="squad-table" className="grid gap-6 lg:grid-cols-[1.5fr_1fr] items-start scroll-mt-20" aria-label="Fan Picks">
        <div className={`${card} space-y-4`}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <h3 className="text-sm font-black uppercase tracking-wider text-white">{theme.shortName} squad (IPL 2026)</h3>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[var(--team-accent)]/20 text-[var(--team-accent)] border border-[var(--team-accent)]/30">2026</span>
            </div>
            <span className="text-[11px] font-mono text-white/40">Showing {shown.length} of {rows.length}</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {["", ...roleList].map((r) => (
              <button key={r || "all"} type="button" onClick={() => setRole(r)} className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${role === r ? "bg-violet-600 text-white shadow" : "bg-white/[0.04] text-white/60 hover:text-white border border-white/5"}`}>
                {r ? label(r) : "All"} <span className="font-mono text-[10px] opacity-75">{r ? rows.filter((p) => p.role === r).length : rows.length}</span>
              </button>
            ))}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <div className="relative"><Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-white/40" /><input type="text" aria-label="Search squad" placeholder="Search players..." value={text} onChange={(e) => setText(e.target.value)} className="w-full pl-8 pr-3 py-1.5 bg-black/40 border border-white/10 rounded-xl text-xs text-white placeholder-white/40 focus:outline-none focus:border-white/30" /></div>
            <select aria-label="Nationality" value={nation} onChange={(e) => setNation(e.target.value)} className={select}><option value="">All nationalities</option><option value="indian">Indian only</option><option value="overseas">Overseas only</option></select>
            <select aria-label="Your call" value={state} onChange={(e) => setState(e.target.value)} className={select}><option value="">All statuses</option><option value="retain">Retained only</option><option value="release">Released only</option><option value="undecided">Undecided only</option></select>
          </div>
          <div className="overflow-x-auto rounded-xl border border-white/5">
            <table className="w-full text-left text-xs">
              <thead className="bg-white/[0.03] text-[10px] font-black uppercase text-white/50 tracking-wider"><tr><th className="p-3">Player</th><th className="p-3">Role</th><th className="p-3 text-center">Nat</th><th className="p-3">CRICFIELD Pick</th><th className="p-3 text-right">Your call</th></tr></thead>
              <tbody className="divide-y divide-white/5 font-medium">
                {shown.map((p) => {
                  const call = choices[p.id];
                  return (
                    <tr key={p.id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="p-3"><div className="flex items-center gap-2.5"><PlayerAvatar name={p.name} teamId={team} className="w-8 h-8 rounded-full shrink-0" disableHover /><div><div className="font-bold text-white">{p.name}</div><div className="text-[10px] text-white/45 font-mono">{p.contractLakh ? money(p.contractLakh) : "salary n/a"}</div></div></div></td>
                      <td className="p-3 text-white/70">{p.role}</td>
                      <td className="p-3 text-center text-sm" title={p.overseas ? "Overseas" : "Indian"}>{p.overseas ? "✈️" : "🇮🇳"}</td>
                      <td className="p-3"><div className="flex flex-col items-start gap-0.5"><CategoryTag category={p.category} />{picks.data?.planning?.coreLocks.some(lock=>lock.id===p.id) && <span className="block text-[10px] text-emerald-300 mt-1">CRICFIELD CORE LOCK</span>}<p className="text-[10px] text-white/70 mt-2 max-w-xs">{p.reason || p.editorial?.rationale}</p>
                        {(p.strengths || p.editorial?.strengths) && (
                          <p className="text-[10px] text-emerald-400 mt-1 max-w-xs"><b>Strength:</b> {p.strengths || p.editorial?.strengths}</p>
                        )}
                        {(p.weaknesses || p.editorial?.weaknesses) && (
                          <p className="text-[10px] text-rose-300 mt-0.5 max-w-xs"><b>Weakness:</b> {p.weaknesses || p.editorial?.weaknesses}</p>
                        )}<span className="text-[10px] text-white/40 font-mono">{p.index.toFixed(0)}/100</span></div></td>
                      <td className="p-3 text-right">
                        <div className="inline-flex items-center gap-1" role="group" aria-label={`Decision for ${p.name}`}>
                          <button type="button" aria-pressed={call === "retain"} disabled={!open} onClick={() => set(p.id, call === "retain" ? null : "retain")} className={callBtn(call === "retain", "bg-[var(--team-accent)] text-black font-black shadow")}>Retain</button>
                          <button type="button" aria-pressed={call === "release"} disabled={!open} onClick={() => set(p.id, call === "release" ? null : "release")} className={callBtn(call === "release", "bg-rose-600 text-white font-black shadow")}>Release</button>
                          <button type="button" aria-pressed={!call} disabled={!open} onClick={() => set(p.id, null)} className={callBtn(!call, "bg-white/20 text-white")}>Unsure</button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        <div className={`${card} sticky top-24 self-start space-y-4 shadow-xl`}>
          <div>
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black uppercase tracking-wider text-white flex items-center gap-2"><Activity className="w-3.5 h-3.5 text-[var(--team-accent)]" /> Your squad impact</h3>
              <span className="text-[10px] font-mono font-bold text-violet-300 bg-violet-500/10 px-2 py-0.5 rounded border border-violet-500/20">LIVE</span>
            </div>
            <p className="text-[11px] text-white/50 mt-1">Recalculated by the squad optimizer as you choose.</p>
            <div className="grid grid-cols-3 gap-2 mt-4 text-center">
              {([["Retained", retained, "sky"], ["Released", released, "rose"], ["Undecided", rows.length - retained - released, "amber"]] as const).map(([name, n, c]) => (
                <div key={name} className={`rounded-xl border p-2.5 ${c === "sky" ? "border-sky-400/30 bg-sky-500/10" : c === "rose" ? "border-rose-400/30 bg-rose-500/10" : "border-amber-400/30 bg-amber-500/10"}`}>
                  <span className={`text-[9px] uppercase font-bold block ${c === "sky" ? "text-sky-300" : c === "rose" ? "text-rose-300" : "text-amber-300"}`}>{name}</span>
                  <span className="text-xl font-black text-white font-mono">{n}</span>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-2 mt-3 text-xs">
              <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/5 flex items-center justify-between gap-2"><span className="text-white/50 text-[10px] uppercase font-semibold">Retention cap</span><span className="font-mono font-black text-emerald-400">{picks.data?.rules.maxRetained ?? "None"}</span></div>
              <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/5 flex items-center justify-between gap-2"><span className="text-white/50 text-[10px] uppercase font-semibold">Overseas kept</span><span className="font-mono font-black text-amber-300">{keptOverseas}/{picks.data?.rules.maxOverseas ?? 8}</span></div>
              <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/5 flex items-center justify-between gap-2"><span className="text-white/50 text-[10px] uppercase font-semibold">Committed</span><span className="font-mono font-black text-white">{mineScenario ? (mineScenario.committedLakh === null ? `${money(mineScenario.salaryKnownLakh)}+` : money(mineScenario.committedLakh)) : "—"}</span></div>
              <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/5 flex items-center justify-between gap-2"><span className="text-white/50 text-[10px] uppercase font-semibold">Purse left</span><span className="font-mono font-black text-amber-200" title={mineScenario?.purseNote ?? undefined}>{mineScenario?.remainingPurseLakh != null ? money(mineScenario.remainingPurseLakh) : "Unavailable"}</span></div>
            </div>
            <div className="mt-4 space-y-2">
              <span className="text-[10px] font-black uppercase tracking-wider text-white/60 block">Role coverage (kept of squad)</span>
              {roleList.map((r) => {
                const total = rows.filter((p) => p.role === r).length, kept = rows.filter((p) => p.role === r && choices[p.id] === "retain").length;
                return (
                  <div key={r} className="space-y-1">
                    <div className="flex items-center justify-between text-[11px] text-white/80"><span>{label(r)}</span><span className="font-mono text-white/50">{kept}/{total}</span></div>
                    <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden"><div className="h-full transition-all duration-300" style={{ width: `${(kept / Math.max(1, total)) * 100}%`, backgroundColor: ROLE_COLOURS[r] }} /></div>
                  </div>
                );
              })}
              <div className="flex items-center justify-between text-[11px] text-white/80 pt-1"><span>Best XII strength</span><span className="font-mono text-white">{mineScenario?.strength != null ? mineScenario.strength.toFixed(2) : "Not enough players"}</span></div>
            </div>
          </div>
          <div className="space-y-3 pt-3 border-t border-white/5">
            {violations.map((v) => <p key={v.code} className="text-[11px] text-rose-300">{v.message}</p>)}
            {check.data?.notes.map((n) => <p key={n} className="text-[11px] text-white/50">{n}</p>)}
            {!retained && !released && <div className="flex items-center gap-2 p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-200"><Sparkles className="w-4 h-4 text-amber-300 shrink-0" /><span>Start picking players to see how your choices change the squad.</span></div>}
            {status && <div className="text-center text-xs font-bold text-emerald-400 py-1">{status.text} {status.signIn && <Link href="/account" className="underline">Sign in</Link>}</div>}
            <button type="button" disabled={!open || !Object.keys(choices).length || violations.length > 0} onClick={() => void submit()} className="w-full py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg transition-all disabled:opacity-40"><Vote className="w-4 h-4" /> Submit fan picks</button>
            <button type="button" disabled={!retained} onClick={() => { const n = saveOnDevice(); setStatus({ text: n === null ? "Could not save: browser storage is unavailable." : `Saved ${n} retained on this device for Auction Intelligence. This is not a vote.` }); }} className="w-full py-2 rounded-xl border border-white/10 text-white/80 hover:bg-white/5 font-bold text-xs flex items-center justify-center gap-2 transition-all disabled:opacity-40"><Bookmark className="w-4 h-4" /> Save on this device</button>
            <p className="text-[10px] text-white/40">{open ? `Voting locks ${new Date(picks.data?.rules.votingLocksAt ?? "").toLocaleString()}. Every player needs a call before a vote can be submitted.` : "Voting is closed."}</p>
          </div>
        </div>
      </div>
      {fans.data && (
        <section className={`${card} space-y-2`} aria-label="Community results">
          <h3 className="text-xs font-black uppercase tracking-wider text-white">Community results</h3>
          <p className="text-[11px] text-white/55">{fans.data.label} {fans.data.totalBallots} valid ballot{fans.data.totalBallots === 1 ? "" : "s"}.</p>
          {fans.data.totalBallots > 0 && (
            <>
              <div className="overflow-x-auto rounded-xl border border-white/5"><table className="w-full text-left text-xs"><thead className="bg-white/[0.03] text-[10px] font-black uppercase text-white/50 tracking-wider"><tr><th className="p-3">Player</th><th className="p-3">Retain votes</th><th className="p-3">Release votes</th><th className="p-3">CRICFIELD</th></tr></thead>
                <tbody className="divide-y divide-white/5">{fans.data.rows.map((r) => <tr key={r.id}><td className="p-3 text-white">{r.name}</td><td className="p-3">{r.retainPct ?? "—"}%</td><td className="p-3">{r.releasePct ?? "—"}%</td><td className="p-3 text-white/60">{r.cricfield}</td></tr>)}</tbody></table></div>
              {fans.data.rankingsNote && <p className="text-[11px] text-white/50">{fans.data.rankingsNote}</p>}
              {fanList("Most controversial", fans.data.controversial)}
              {fanList("Biggest disagreements with CRICFIELD", fans.data.disagreements)}
              <p className="text-[11px] text-white/60">Fan consensus squad: {fans.data.consensusSquad.map((p) => p.name).join(", ") || "None yet"}.</p>
            </>
          )}
        </section>
      )}
    </>
  );
}

function ImpactTab({ team, choices }: { team: TeamCode; choices: Choices }) {
  const has = Object.keys(choices).length > 0;
  const q = useQuery({ queryKey: ["retention-sim", team, JSON.stringify(choices)], queryFn: () => simulateRetention(LIVE_SEASON, team, has ? choices : undefined), placeholderData: (x) => x, retry: false });
  if (q.isError) return <p className="text-xs text-rose-300">{errorText(q.error)}</p>;
  if (!q.data) return <p className="text-xs text-white/60">Solving the best XII…</p>;
  const pick = q.data.scenarios[1];
  return (
    <section className={`${card} space-y-3`} aria-label="Squad Impact">
      <h3 className="text-sm font-black uppercase tracking-wider text-white">What each decision does to the squad</h3>
      <p className="text-[11px] text-white/55">{q.data.fanScenario === "available" ? "" : `${q.data.fanScenario} `}{has ? "" : "Make your calls under Fan Picks to add your own column. "}{q.data.caveat}</p>
      <ScenarioTable sim={q.data} />
      {pick?.note && <p className="text-[11px] text-white/55">{pick.note}</p>}
      {pick?.releasedPlayers.length > 0 && <p className="text-[11px] text-white/55">CRICFIELD Picks would release: {pick.releasedPlayers.map((p) => p.name).join(", ")}.</p>}
      {pick?.purseNote && <p className="text-[11px] text-amber-200/80">{pick.purseNote}</p>}
    </section>
  );
}
