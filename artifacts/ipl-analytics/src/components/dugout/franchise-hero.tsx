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
    { id: "milestones", label: "Milestones" },
    { id: "history", label: "History" },
] as const;

function goTo(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
}

const KNOWN_CAPTAINS: Record<string, { name: string; era: string; titles?: number }> = {
  SRH: { name: "Pat Cummins", era: "2024–2026 · Finalist & Leader", titles: 0 },
  CSK: { name: "Ruturaj Gaikwad", era: "2024–2026 · Succeeding MS Dhoni", titles: 5 },
  RCB: { name: "Rajat Patidar", era: "2025–2026 · Champion Captain", titles: 2 },
  MI: { name: "Hardik Pandya", era: "2024–2026 · Succeeding Rohit Sharma", titles: 5 },
  KKR: { name: "Ajinkya Rahane", era: "2025–2026 · Franchise Captain", titles: 3 },
  RR: { name: "Riyan Parag", era: "2026 · Franchise Captain", titles: 1 },
  DC: { name: "Axar Patel", era: "2025–2026 · Franchise Captain", titles: 0 },
  PBKS: { name: "Shreyas Iyer", era: "2025–2026 · Franchise Captain", titles: 0 },
  GT: { name: "Shubman Gill", era: "2024–2026 · Emerging Captain", titles: 1 },
  LSG: { name: "Rishabh Pant", era: "2025–2026 · Franchise Captain", titles: 0 },
};

export interface SeasonCaptainInfo {
  name: string;
  sub: string;
}

export const FRANCHISE_SEASON_CAPTAINS: Record<string, Record<string, SeasonCaptainInfo>> = {
  RCB: {
    "2026": { name: "Rajat Patidar", sub: "2026 Title Defending Skipper" },
    "2025": { name: "Rajat Patidar", sub: "2025 IPL Champion Captain" },
    "2024": { name: "Faf du Plessis", sub: "Playoffs Eliminator Leader" },
    "2023": { name: "Faf du Plessis", sub: "Orange Cap Contender & Skipper" },
    "2022": { name: "Faf du Plessis", sub: "Playoffs Qualifier 2 Leader" },
    "2021": { name: "Virat Kohli", sub: "Playoffs Eliminator Skipper" },
    "2020": { name: "Virat Kohli", sub: "Playoffs Eliminator Skipper" },
    "2019": { name: "Virat Kohli", sub: "Franchise Icon & Skipper" },
    "2018": { name: "Virat Kohli", sub: "Franchise Icon & Skipper" },
    "2017": { name: "Virat Kohli", sub: "Franchise Icon & Skipper" },
    "2016": { name: "Virat Kohli", sub: "973 Runs Record & Finalist Skipper" },
    "2015": { name: "Virat Kohli", sub: "Playoffs Qualifier 2 Leader" },
    "2014": { name: "Virat Kohli", sub: "Full-time Franchise Captain" },
    "2013": { name: "Virat Kohli", sub: "Full-time Captaincy Debut" },
    "2012": { name: "Daniel Vettori", sub: "Led alongside Virat Kohli" },
    "2011": { name: "Daniel Vettori", sub: "Runners-up Finalist Skipper" },
    "2010": { name: "Anil Kumble", sub: "Semi-finalist 3rd Place" },
    "2009": { name: "Anil Kumble", sub: "Finalist & Turnaround Leader" },
    "2008": { name: "Rahul Dravid", sub: "Inaugural Icon Captain" },
  },
  CSK: {
    "2026": { name: "Ruturaj Gaikwad", sub: "Franchise Captain" },
    "2025": { name: "Ruturaj Gaikwad", sub: "Franchise Captain" },
    "2024": { name: "Ruturaj Gaikwad", sub: "New Era Franchise Captain" },
    "2023": { name: "MS Dhoni", sub: "5th Title Champion Captain" },
    "2022": { name: "MS Dhoni", sub: "Led alongside Ravindra Jadeja" },
    "2021": { name: "MS Dhoni", sub: "4th Title Champion Captain" },
    "2020": { name: "MS Dhoni", sub: "Franchise Icon Captain" },
    "2019": { name: "MS Dhoni", sub: "Finalist Skipper" },
    "2018": { name: "MS Dhoni", sub: "3rd Title Champion Captain" },
    "2015": { name: "MS Dhoni", sub: "Finalist Skipper" },
    "2014": { name: "MS Dhoni", sub: "Playoffs Qualifier 2" },
    "2013": { name: "MS Dhoni", sub: "Finalist Skipper" },
    "2012": { name: "MS Dhoni", sub: "Finalist Skipper" },
    "2011": { name: "MS Dhoni", sub: "2nd Title Champion Captain" },
    "2010": { name: "MS Dhoni", sub: "Maiden Title Champion Captain" },
    "2009": { name: "MS Dhoni", sub: "Semi-Finalist Leader" },
    "2008": { name: "MS Dhoni", sub: "Inaugural Finalist Skipper" },
  },
  MI: {
    "2026": { name: "Hardik Pandya", sub: "Franchise Captain" },
    "2025": { name: "Hardik Pandya", sub: "Franchise Captain" },
    "2024": { name: "Hardik Pandya", sub: "Franchise Captain" },
    "2023": { name: "Rohit Sharma", sub: "Playoffs Qualifier 2" },
    "2022": { name: "Rohit Sharma", sub: "Franchise Icon Skipper" },
    "2021": { name: "Rohit Sharma", sub: "Franchise Icon Skipper" },
    "2020": { name: "Rohit Sharma", sub: "5th Title Champion Captain" },
    "2019": { name: "Rohit Sharma", sub: "4th Title Champion Captain" },
    "2018": { name: "Rohit Sharma", sub: "Franchise Icon Skipper" },
    "2017": { name: "Rohit Sharma", sub: "3rd Title Champion Captain" },
    "2016": { name: "Rohit Sharma", sub: "Franchise Icon Skipper" },
    "2015": { name: "Rohit Sharma", sub: "2nd Title Champion Captain" },
    "2014": { name: "Rohit Sharma", sub: "Playoffs Eliminator" },
    "2013": { name: "Rohit Sharma", sub: "Maiden Title Champion Captain" },
    "2012": { name: "Harbhajan Singh", sub: "Playoffs Eliminator" },
    "2011": { name: "Sachin Tendulkar", sub: "Playoffs Qualifier 2" },
    "2010": { name: "Sachin Tendulkar", sub: "Finalist Skipper & Orange Cap" },
    "2009": { name: "Sachin Tendulkar", sub: "Franchise Icon Captain" },
    "2008": { name: "Sachin Tendulkar", sub: "Inaugural Icon Captain" },
  },
  SRH: {
    "2026": { name: "Pat Cummins", sub: "Franchise Captain" },
    "2025": { name: "Pat Cummins", sub: "Franchise Captain" },
    "2024": { name: "Pat Cummins", sub: "Finalist Captain" },
    "2023": { name: "Aiden Markram", sub: "Franchise Captain" },
    "2022": { name: "Kane Williamson", sub: "Franchise Captain" },
    "2021": { name: "Kane Williamson", sub: "Led alongside David Warner" },
    "2020": { name: "David Warner", sub: "Playoffs Qualifier 2" },
    "2019": { name: "Kane Williamson", sub: "Playoffs Eliminator" },
    "2018": { name: "Kane Williamson", sub: "Finalist Skipper & Orange Cap" },
    "2017": { name: "David Warner", sub: "Playoffs Eliminator" },
    "2016": { name: "David Warner", sub: "Maiden Title Champion Captain" },
    "2015": { name: "David Warner", sub: "Orange Cap & Captain" },
    "2014": { name: "Shikhar Dhawan", sub: "Led alongside Daren Sammy" },
    "2013": { name: "Kumar Sangakkara", sub: "Led alongside Cameron White" },
  },
  KKR: {
    "2026": { name: "Ajinkya Rahane", sub: "Franchise Captain" },
    "2025": { name: "Ajinkya Rahane", sub: "Franchise Captain" },
    "2024": { name: "Shreyas Iyer", sub: "3rd Title Champion Captain" },
    "2023": { name: "Nitish Rana", sub: "Stand-in Franchise Skipper" },
    "2022": { name: "Shreyas Iyer", sub: "Franchise Captain" },
    "2021": { name: "Eoin Morgan", sub: "Finalist Skipper" },
    "2020": { name: "Eoin Morgan", sub: "Led alongside Dinesh Karthik" },
    "2019": { name: "Dinesh Karthik", sub: "Franchise Captain" },
    "2018": { name: "Dinesh Karthik", sub: "Playoffs Qualifier 2" },
    "2017": { name: "Gautam Gambhir", sub: "Playoffs Qualifier 2" },
    "2016": { name: "Gautam Gambhir", sub: "Playoffs Eliminator" },
    "2015": { name: "Gautam Gambhir", sub: "Franchise Leader" },
    "2014": { name: "Gautam Gambhir", sub: "2nd Title Champion Captain" },
    "2013": { name: "Gautam Gambhir", sub: "Franchise Leader" },
    "2012": { name: "Gautam Gambhir", sub: "Maiden Title Champion Captain" },
    "2011": { name: "Gautam Gambhir", sub: "Playoffs Eliminator" },
    "2010": { name: "Sourav Ganguly", sub: "Franchise Icon Captain" },
    "2009": { name: "Brendon McCullum", sub: "Franchise Captain" },
    "2008": { name: "Sourav Ganguly", sub: "Inaugural Icon Captain" },
  },
  RR: {
    "2026": { name: "Riyan Parag", sub: "Franchise Captain" },
    "2025": { name: "Sanju Samson", sub: "Led alongside Riyan Parag" },
    "2024": { name: "Sanju Samson", sub: "Playoffs Qualifier 2" },
    "2023": { name: "Sanju Samson", sub: "Franchise Captain" },
    "2022": { name: "Sanju Samson", sub: "Finalist Skipper" },
    "2021": { name: "Sanju Samson", sub: "Franchise Captain" },
    "2020": { name: "Steve Smith", sub: "Franchise Captain" },
    "2019": { name: "Steve Smith", sub: "Led alongside Ajinkya Rahane" },
    "2018": { name: "Ajinkya Rahane", sub: "Playoffs Eliminator" },
    "2015": { name: "Shane Watson", sub: "Playoffs Eliminator" },
    "2014": { name: "Shane Watson", sub: "Franchise Captain" },
    "2013": { name: "Rahul Dravid", sub: "Playoffs Qualifier 2" },
    "2012": { name: "Rahul Dravid", sub: "Franchise Leader" },
    "2011": { name: "Shane Warne", sub: "Final Season as Captain" },
    "2010": { name: "Shane Warne", sub: "Franchise Icon Captain" },
    "2009": { name: "Shane Warne", sub: "Franchise Icon Captain" },
    "2008": { name: "Shane Warne", sub: "Inaugural Champion Captain" },
  },
  DC: {
    "2026": { name: "Axar Patel", sub: "Franchise Captain" },
    "2025": { name: "Axar Patel", sub: "Franchise Captain" },
    "2024": { name: "Rishabh Pant", sub: "Franchise Captain" },
    "2023": { name: "David Warner", sub: "Stand-in Captain" },
    "2022": { name: "Rishabh Pant", sub: "Franchise Captain" },
    "2021": { name: "Rishabh Pant", sub: "Playoffs Qualifier 2" },
    "2020": { name: "Shreyas Iyer", sub: "Finalist Skipper" },
    "2019": { name: "Shreyas Iyer", sub: "Playoffs Qualifier 2" },
    "2018": { name: "Shreyas Iyer", sub: "Took over from Gautam Gambhir" },
    "2017": { name: "Zaheer Khan", sub: "Franchise Captain" },
    "2016": { name: "Zaheer Khan", sub: "Franchise Captain" },
    "2015": { name: "JP Duminy", sub: "Franchise Captain" },
    "2014": { name: "Kevin Pietersen", sub: "Franchise Captain" },
    "2013": { name: "Mahela Jayawardene", sub: "Franchise Captain" },
    "2012": { name: "Virender Sehwag", sub: "Playoffs Qualifier 2" },
    "2011": { name: "Virender Sehwag", sub: "Franchise Icon Captain" },
    "2010": { name: "Gautam Gambhir", sub: "Led alongside Dinesh Karthik" },
    "2009": { name: "Gautam Gambhir", sub: "Semi-finalist Leader" },
    "2008": { name: "Virender Sehwag", sub: "Inaugural Semi-finalist Captain" },
  },
  PBKS: {
    "2026": { name: "Shreyas Iyer", sub: "Franchise Captain" },
    "2025": { name: "Shreyas Iyer", sub: "Franchise Captain" },
    "2024": { name: "Sam Curran", sub: "Led alongside Shikhar Dhawan" },
    "2023": { name: "Shikhar Dhawan", sub: "Franchise Captain" },
    "2022": { name: "Mayank Agarwal", sub: "Franchise Captain" },
    "2021": { name: "KL Rahul", sub: "Franchise Captain" },
    "2020": { name: "KL Rahul", sub: "Orange Cap & Captain" },
    "2019": { name: "Ravichandran Ashwin", sub: "Franchise Captain" },
    "2018": { name: "Ravichandran Ashwin", sub: "Franchise Captain" },
    "2017": { name: "Glenn Maxwell", sub: "Franchise Captain" },
    "2016": { name: "Murali Vijay", sub: "Led alongside David Miller" },
    "2015": { name: "George Bailey", sub: "Franchise Captain" },
    "2014": { name: "George Bailey", sub: "Finalist Skipper" },
    "2013": { name: "Adam Gilchrist", sub: "Franchise Captain" },
    "2012": { name: "Adam Gilchrist", sub: "Franchise Captain" },
    "2011": { name: "Adam Gilchrist", sub: "Franchise Captain" },
    "2010": { name: "Kumar Sangakkara", sub: "Franchise Captain" },
    "2009": { name: "Yuvraj Singh", sub: "Franchise Icon Captain" },
    "2008": { name: "Yuvraj Singh", sub: "Inaugural Semi-finalist Captain" },
  },
  GT: {
    "2026": { name: "Shubman Gill", sub: "Franchise Captain" },
    "2025": { name: "Shubman Gill", sub: "Franchise Captain" },
    "2024": { name: "Shubman Gill", sub: "Franchise Captain" },
    "2023": { name: "Hardik Pandya", sub: "Finalist Skipper" },
    "2022": { name: "Hardik Pandya", sub: "Debut Season Champion Captain" },
  },
  LSG: {
    "2026": { name: "Rishabh Pant", sub: "Franchise Captain" },
    "2025": { name: "Rishabh Pant", sub: "Franchise Captain" },
    "2024": { name: "KL Rahul", sub: "Franchise Captain" },
    "2023": { name: "KL Rahul", sub: "Playoffs Eliminator Leader" },
    "2022": { name: "KL Rahul", sub: "Debut Season Playoffs Leader" },
  },
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

  // Context-aware seasonal captain lookup
  const seasonalCaptain = (season && FRANCHISE_SEASON_CAPTAINS[team.id]?.[season])
    ? FRANCHISE_SEASON_CAPTAINS[team.id][season]
    : null;

  const captainName = seasonalCaptain?.name ?? record?.latestCaptain?.name ?? fallbackCaptain.name;
  const captainSub = seasonalCaptain?.sub 
    ?? (record?.latestCaptain 
        ? `Led ${record.latestCaptain.firstSeason}–${record.latestCaptain.lastSeason}`
        : fallbackCaptain.era);

  const titlesCount = record?.titles?.count ?? team.titles;
  const titlesYears = (record?.titles?.years && record.titles.years.length > 0) 
    ? record.titles.years 
    : team.titleYears;

  // Context-aware seasonal win percentage & record lookup
  const selectedSeasonStat = season
    ? record?.seasons?.find((s) => String(s.season) === String(season))
    : null;

  const winRateLabel = season ? `${season} Win rate` : "Win rate";
  const winRateValue = selectedSeasonStat
    ? selectedSeasonStat.played > 0
      ? `${((selectedSeasonStat.won / selectedSeasonStat.played) * 100).toFixed(1)}%`
      : "0.0%"
    : record?.overall.winPct != null
    ? `${record.overall.winPct.toFixed(1)}%`
    : "48.5%";

  const winRateSub = selectedSeasonStat
    ? selectedSeasonStat.champion
      ? `${selectedSeasonStat.won}W · ${selectedSeasonStat.lost}L · Champions 🏆`
      : selectedSeasonStat.runnerUp
      ? `${selectedSeasonStat.won}W · ${selectedSeasonStat.lost}L · Runners-up 🥈`
      : selectedSeasonStat.madePlayoffs
      ? `${selectedSeasonStat.won}W · ${selectedSeasonStat.lost}L · Playoffs Qualified`
      : `${selectedSeasonStat.won}W · ${selectedSeasonStat.lost}L${selectedSeasonStat.noResult > 0 ? ` · ${selectedSeasonStat.noResult}NR` : ""} (${season} Season)`
    : record
    ? `${record.overall.won}W · ${record.overall.lost}L`
    : "All-time IPL matches";

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
      label: winRateLabel,
      value: winRateValue,
      sub: winRateSub,
    },
    {
      label: season ? `${season} Captain` : "Franchise Captain",
      value: captainName,
      sub: captainSub,
    },
  ];

  return (
    <section className="relative overflow-hidden rounded-[28px] border border-slate-200 dark:border-white/10 bg-white dark:bg-[#090E1A] shadow-xl dark:shadow-2xl">
      <div className="absolute inset-0 pointer-events-none" aria-hidden>
        <img src={team.bannerImg} alt="" className="w-full h-full object-cover object-center opacity-15 dark:opacity-25" />
        <div className="absolute inset-0 bg-gradient-to-r from-white via-white/90 to-white/60 dark:from-[#090E1A] dark:via-[#090E1A]/90 dark:to-[#090E1A]/60" />
        <div className="absolute -top-24 -left-24 w-80 h-80 rounded-full blur-3xl opacity-20 dark:opacity-30" style={{ backgroundColor: team.accent }} />
      </div>

      <div className="relative z-10 p-5 sm:p-7 space-y-6">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-5">
          <div className="flex items-center gap-4 min-w-0">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl p-2.5 flex items-center justify-center border shrink-0 bg-slate-100 dark:bg-black/40 shadow-md dark:shadow-xl" style={{ backgroundColor: team.surfaceTint, borderColor: `${team.accent}66` }}>
              <img src={team.logoImg} alt={team.name} className="w-full h-full object-contain" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span 
                  className="text-[9.5px] font-mono font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full border shadow-sm"
                  style={{ 
                    backgroundColor: `${team.accent}22`, 
                    borderColor: `${team.accent}55`,
                    color: team.accent 
                  }}
                >
                  FRANCHISE SANCTUARY
                </span>
                <span className="text-[10px] text-slate-500 dark:text-white/50 font-mono font-bold">({team.shortName})</span>
              </div>
              <h1 className="font-display font-black text-2xl sm:text-3xl lg:text-4xl uppercase tracking-tight text-slate-900 dark:text-white leading-tight">
                {team.name}
              </h1>
              <p className="text-xs text-slate-600 dark:text-white/70 font-medium mt-1">{team.motto}</p>
            </div>
          </div>

          <div className="flex flex-col items-start md:items-end gap-3 shrink-0">
            {switcher}
            
            <div className="flex items-center gap-2 flex-wrap">
              {seasons.length > 0 && season && (
                <label className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-widest text-slate-500 dark:text-white/50">
                  Season
                  <select
                    value={season}
                    onChange={(e) => onSeason(e.target.value)}
                    className="rounded-lg border border-slate-300 dark:border-white/20 bg-slate-50 dark:bg-[#0B1020] px-3 py-1.5 text-xs font-bold normal-case tracking-normal text-slate-900 dark:text-white outline-none focus:border-slate-500 dark:focus:border-white/50 cursor-pointer shadow-inner"
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
            <div 
              key={m.label} 
              className="rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50/80 dark:bg-white/[0.03] hover:bg-slate-100 dark:hover:bg-white/[0.05] hover:border-slate-300 dark:hover:border-white/20 transition-all px-4 py-3 min-w-0 shadow-sm"
            >
              <dt className="text-[10px] uppercase tracking-wider text-slate-500 dark:text-white/50 font-mono font-bold">{m.label}</dt>
              <dd className="font-display font-black text-lg sm:text-xl text-slate-900 dark:text-white tabular-nums truncate mt-0.5" style={{ color: m.label.includes("Titles") ? "#F59E0B" : undefined }}>
                {loading && !record ? "…" : m.value}
              </dd>
              {m.sub && <div className="text-[10.5px] text-slate-600 dark:text-white/60 font-medium mt-0.5 truncate">{m.sub}</div>}
            </div>
          ))}
        </dl>

        {/* Dugout Navigation Pills */}
        <nav aria-label="Dugout sections" className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-200 dark:border-white/10">
          {DUGOUT_SECTIONS.map((s) => (
            <button
              key={s.id}
              onClick={() => goTo(s.id)}
              className="px-3.5 py-1.5 rounded-full border border-slate-200 dark:border-white/15 bg-slate-100 dark:bg-white/[0.04] text-xs font-bold text-slate-700 dark:text-white/80 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-white/10 hover:border-slate-300 dark:hover:border-white/30 transition-all cursor-pointer active:scale-95 shadow-sm"
            >
              {s.label}
            </button>
          ))}
          <Link href={`/teams/${teamSlug}`} className="ml-auto">
            <span className="text-xs font-mono font-bold text-slate-500 dark:text-white/60 hover:text-slate-900 dark:hover:text-white transition-colors flex items-center gap-1.5 hover:underline">
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
