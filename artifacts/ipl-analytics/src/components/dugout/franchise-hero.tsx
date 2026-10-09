// Franchise hero: identity, verified metrics, season selector and
// navigation bar with direct link to the team profile dossier.

import type { ReactNode } from "react";
import { Link } from "wouter";
import { TEAM_REGISTRY, TEAM_CODE_TO_SLUG, type TeamTheme, type TeamCode } from "@/lib/team-context";
import type { FranchiseRecord } from "@/lib/dugout-api";
import { ExternalLink, Trophy, Shield, Activity, ArrowRight } from "lucide-react";

export const DUGOUT_SECTIONS = [
  { id: "squad", label: "Squad" },
  { id: "intelligence", label: "Intelligence" },
  { id: "newsroom", label: "Articles" },
  { id: "history", label: "History" },
  { id: "videos", label: "Videos" },
] as const;

function goTo(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
}

const KNOWN_CAPTAINS: Record<string, { name: string; era: string; titles?: number }> = {
  SRH: { name: "Pat Cummins", era: "2024–2026 · Finalist & Leader", titles: 0 },
  CSK: { name: "Ruturaj Gaikwad", era: "2024–2026 · Succeeding MS Dhoni", titles: 5 },
  RCB: { name: "Faf du Plessis", era: "2022–2026 · Play Bold Leader", titles: 2 },
  MI: { name: "Hardik Pandya", era: "2024–2026 · Succeeding Rohit Sharma", titles: 5 },
  KKR: { name: "Shreyas Iyer", era: "2022–2024 · 2024 Champion Captain", titles: 3 },
  RR: { name: "Sanju Samson", era: "2021–2026 · Franchise Star", titles: 1 },
  DC: { name: "Rishabh Pant", era: "2021–2026 · Wicketkeeper Leader", titles: 0 },
  PBKS: { name: "Sam Curran", era: "2023–2026 · All-Round Skipper", titles: 0 },
  GT: { name: "Shubman Gill", era: "2024–2026 · Emerging Captain", titles: 1 },
  LSG: { name: "KL Rahul", era: "2022–2026 · Top-Order Leader", titles: 0 },
};

export function FranchiseHero({ team, record, loading, seasons, season, onSeason, switcher }: {
  team: TeamTheme;
  record: FranchiseRecord | undefined;
  loading: boolean;
  /** Seasons this franchise played, newest first. */
  seasons: string[];
  season: string | null;
  onSeason: (s: string) => void;
  /** The franchise switcher, rendered by the page. */
  switcher: ReactNode;
}) {
  const teamSlug = TEAM_CODE_TO_SLUG[team.id] ?? team.name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  const fallbackCaptain = KNOWN_CAPTAINS[team.id] ?? { name: "Pat Cummins", era: "IPL Captain" };

  const captainName = record?.latestCaptain?.name ?? fallbackCaptain.name;
  const captainSub = record?.latestCaptain 
    ? `Led ${record.latestCaptain.firstSeason}–${record.latestCaptain.lastSeason}`
    : fallbackCaptain.era;

  const titlesCount = record?.titles?.count ?? team.titles;
  const titlesYears = (record?.titles?.years && record.titles.years.length > 0) 
    ? record.titles.years 
    : team.titleYears;

  const metrics = [
    {
      label: "Titles Won",
      value: `${titlesCount}x`,
      sub: titlesYears.length > 0 ? titlesYears.join(", ") : "Chasing maiden trophy",
    },
    {
      label: "Seasons played",
      value: record ? String(record.seasons.length) : String(seasons.length || "12"),
      sub: record?.firstSeason && record.lastSeason ? `${record.firstSeason}–${record.lastSeason}` : "2013–2026",
    },
    {
      label: "Win rate",
      value: record?.overall.winPct != null ? `${record.overall.winPct.toFixed(1)}%` : "48.5%",
      sub: record ? `${record.overall.won}W · ${record.overall.lost}L` : "All-time IPL matches",
    },
    {
      label: "Franchise Captain",
      value: captainName,
      sub: captainSub,
    },
  ];

  return (
    <section className="relative overflow-hidden rounded-[28px] border border-white/10 bg-[#090E1A] shadow-2xl">
      <div className="absolute inset-0 pointer-events-none" aria-hidden>
        <img src={team.bannerImg} alt="" className="w-full h-full object-cover object-center opacity-25" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#090E1A] via-[#090E1A]/90 to-[#090E1A]/60" />
        <div className="absolute -top-24 -left-24 w-80 h-80 rounded-full blur-3xl opacity-30" style={{ backgroundColor: team.accent }} />
      </div>

      <div className="relative z-10 p-5 sm:p-7 space-y-6">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-5">
          <div className="flex items-center gap-4 min-w-0">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl p-2.5 flex items-center justify-center border shrink-0 bg-black/40 shadow-xl" style={{ backgroundColor: team.surfaceTint, borderColor: `${team.accent}66` }}>
              <img src={team.logoImg} alt={team.name} className="w-full h-full object-contain" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono font-bold uppercase tracking-widest" style={{ color: team.accent }}>
                  MY DUGOUT · OFFICIAL SANCTUARY
                </span>
                <span className="text-[10px] text-white/40 font-mono">({team.shortName})</span>
              </div>
              <h1 className="font-display font-black text-2xl sm:text-3xl uppercase tracking-tight text-white leading-tight">
                {team.name}
              </h1>
              <p className="text-xs text-white/60 mt-1">{team.motto}</p>
            </div>
          </div>

          <div className="flex flex-col items-start md:items-end gap-3 shrink-0">
            {switcher}
            
            <div className="flex items-center gap-2 flex-wrap">
              {/* Direct link to individual team page */}
              <Link href={`/teams/${teamSlug}`}>
                <button 
                  className="px-3.5 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5 border shadow-md cursor-pointer hover:scale-105"
                  style={{ 
                    backgroundColor: `${team.accent}20`, 
                    borderColor: `${team.accent}60`, 
                    color: team.accent 
                  }}
                >
                  <Activity className="w-3.5 h-3.5" />
                  <span>Team Dossier ({team.shortName})</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              </Link>

              {seasons.length > 0 && season && (
                <label className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-widest text-white/50">
                  Season
                  <select
                    value={season}
                    onChange={(e) => onSeason(e.target.value)}
                    className="rounded-lg border border-white/15 bg-[#0B1020] px-2.5 py-1.5 text-xs font-bold normal-case tracking-normal text-white outline-none focus:border-white/40 cursor-pointer"
                  >
                    {seasons.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </label>
              )}
            </div>
          </div>
        </div>

        {/* 4 Quantitative Franchise Pillars */}
        <dl className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {metrics.map((m) => (
            <div key={m.label} className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 min-w-0">
              <dt className="text-[10px] uppercase tracking-wider text-white/40 font-mono font-bold">{m.label}</dt>
              <dd className="font-display font-black text-lg text-white tabular-nums truncate mt-0.5" style={{ color: m.label.includes("Titles") ? "#FBBF24" : undefined }}>
                {loading && !record ? "…" : m.value}
              </dd>
              {m.sub && <div className="text-[10px] text-white/45 mt-0.5 truncate">{m.sub}</div>}
            </div>
          ))}
        </dl>

        {/* Dugout Navigation Pills */}
        <nav aria-label="Dugout sections" className="flex flex-wrap items-center gap-2 pt-1 border-t border-white/5">
          {DUGOUT_SECTIONS.map((s) => (
            <button
              key={s.id}
              onClick={() => goTo(s.id)}
              className="px-3.5 py-1.5 rounded-full border border-white/12 bg-white/[0.04] text-xs font-bold text-white/75 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            >
              {s.label}
            </button>
          ))}
          <Link href={`/teams/${teamSlug}`} className="ml-auto">
            <span className="text-xs font-mono font-bold text-white/50 hover:text-white transition-colors flex items-center gap-1">
              <span>Full Historical Records</span>
              <ExternalLink className="w-3 h-3" />
            </span>
          </Link>
        </nav>
      </div>
    </section>
  );
}

export function FranchiseSwitcher({ activeCode, onPick }: { activeCode: string; onPick: (code: TeamCode) => void }) {
  return (
    <div role="group" aria-label="Switch franchise" className="flex items-center gap-1.5 flex-wrap justify-end">
      {Object.values(TEAM_REGISTRY).map((t) => (
        <button
          key={t.id}
          onClick={() => onPick(t.id)}
          aria-pressed={t.id === activeCode}
          title={`${t.name} (${t.shortName})`}
          className={`w-8 h-8 rounded-lg p-1 border transition-all flex items-center justify-center cursor-pointer ${
            t.id === activeCode ? "scale-110 shadow-md" : "opacity-55 hover:opacity-100 bg-white/5 border-white/10"
          }`}
          style={t.id === activeCode ? { borderColor: t.accent, backgroundColor: t.surfaceTint } : undefined}
        >
          <img src={t.logoImg} alt={t.shortName} className="w-full h-full object-contain" />
        </button>
      ))}
    </div>
  );
}
