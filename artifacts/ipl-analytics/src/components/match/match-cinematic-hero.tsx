import React, { useMemo } from "react";
import { Link } from "wouter";
import { TeamLogo } from "@/components/team-logo";
import { PlayerAvatar } from "@/components/player-avatar";
import {
  teamShort,
  teamColor,
  venueHref,
  normalizeVenueName,
  playerSlug,
  type MatchScorecard,
} from "@/lib/aggregates";
import {
  MapPin,
  Trophy,
  Award,
  ArrowUpRight,
  Zap,
  Target,
  Clock,
  TrendingUp,
  Sparkles,
  Shield,
} from "lucide-react";

export interface MatchCinematicHeroProps {
  match: import("@/lib/live").LiveMatch;
  card?: MatchScorecard;
}

const teamSlug = (team?: string | null): string =>
  (team || "").toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

// High-res transparent cutouts available in public/
const FRANCHISE_CUTOUTS: Record<string, string> = {
  "virat kohli": "/virat-kohli-transparent.png",
  "v kohli": "/virat-kohli-transparent.png",
  "ms dhoni": "/msd-transparent.png",
  "ab de villiers": "/ab-devillers-transparent.png",
  "sanju samson": "/sanju-samson-transparent.png",
  "suresh raina": "/suresh-raina-transparent.png",
};

// Normalized name expansions for abbreviated POTM/MOM records
const KNOWN_NAME_EXPANSIONS: Record<string, string> = {
  "v kohli": "Virat Kohli",
  "ms dhoni": "MS Dhoni",
  "rg sharma": "Rohit Sharma",
  "s gill": "Shubman Gill",
  "sa yadav": "Suryakumar Yadav",
  "rashid khan": "Rashid Khan",
  "jj bumrah": "Jasprit Bumrah",
  "da warner": "David Warner",
  "ab de villiers": "AB de Villiers",
  "kl rahul": "KL Rahul",
  "sv samson": "Sanju Samson",
  "rr pant": "Rishabh Pant",
  "hh pandya": "Hardik Pandya",
  "ra jadeja": "Ravindra Jadeja",
  "s raina": "Suresh Raina",
  "ch gayle": "Chris Gayle",
  "sp narine": "Sunil Narine",
  "pa patel": "Parthiv Patel",
  "am rahane": "Ajinkya Rahane",
  "sk raina": "Suresh Raina",
  "rv uthappa": "Robin Uthappa",
  "shikhar dhawan": "Shikhar Dhawan",
  "s dhawan": "Shikhar Dhawan",
  "b kumar": "Bhuvneshwar Kumar",
  "ys chahal": "Yuzvendra Chahal",
  "ka pollard": "Kieron Pollard",
  "ad russell": "Andre Russell",
  "shubman gill": "Shubman Gill",
  "pat cummins": "Pat Cummins",
};

function expandPlayerName(name: string): string {
  const clean = name.trim();
  const lower = clean.toLowerCase();
  return KNOWN_NAME_EXPANSIONS[lower] || clean;
}

// Key marquee leaders and franchise icons when ball-by-ball scorecard is unavailable
const FRANCHISE_KEY_PLAYERS: Record<string, { name: string; role: string; desc: string }> = {
  GT: { name: "Shubman Gill", role: "CAPTAIN & OPENER", desc: "Top-order anchor & tactical skipper" },
  RCB: { name: "Virat Kohli", role: "CHAMPIONSHIP ANCHOR", desc: "All-time leading IPL run scorer" },
  CSK: { name: "MS Dhoni", role: "FINISHER & MENTOR", desc: "5x IPL championship captain" },
  MI: { name: "Rohit Sharma", role: "OPENER & TACTICIAN", desc: "5x IPL title winning skipper" },
  KKR: { name: "Sunil Narine", role: "MYSTERY ALL-ROUNDER", desc: "MVP impact with bat and ball" },
  SRH: { name: "Pat Cummins", role: "CAPTAIN & PACER", desc: "High-pace spearhead & skipper" },
  RR: { name: "Sanju Samson", role: "CAPTAIN & WICKETKEEPER", desc: "Explosive stroke maker & leader" },
  DC: { name: "Rishabh Pant", role: "CAPTAIN & WICKETKEEPER", desc: "Match-winning left-hand dynamo" },
  PBKS: { name: "Shikhar Dhawan", role: "TOP-ORDER ANCHOR", desc: "Consistent boundary accumulator" },
  LSG: { name: "KL Rahul", role: "CAPTAIN & ANCHOR", desc: "Precision top-order technician" },
};

function calculateRunRate(runs: number, oversVal: number | string): string {
  const oversNum = parseFloat(String(oversVal));
  if (!oversNum || isNaN(oversNum) || oversNum <= 0) return "0.00";
  const completedOvers = Math.floor(oversNum);
  const balls = Math.round((oversNum % 1) * 10);
  const totalBalls = completedOvers * 6 + balls;
  if (totalBalls <= 0) return "0.00";
  return ((runs / totalBalls) * 6).toFixed(2);
}

function calculateBallsRemaining(oversVal: number | string, maxOvers = 20): number {
  const oversNum = parseFloat(String(oversVal));
  if (isNaN(oversNum) || oversNum <= 0) return 0;
  const completedOvers = Math.floor(oversNum);
  const balls = Math.round((oversNum % 1) * 10);
  const totalBalls = completedOvers * 6 + balls;
  return Math.max(0, maxOvers * 6 - totalBalls);
}

export function MatchCinematicHero({ match, card }: MatchCinematicHeroProps) {
  const info = match.matchInfo;
  const team1Name = info.team1.teamName;
  const team2Name = info.team2.teamName;
  const team1Code = info.team1.teamSName || teamShort(team1Name);
  const team2Code = info.team2.teamSName || teamShort(team2Name);

  const t1Color = teamColor(team1Name);
  const t2Color = teamColor(team2Name);

  const inn1 = card?.innings?.[0];
  const inn2 = card?.innings?.[1];

  // Innings 1 score & overs
  const t1Runs = inn1 ? inn1.runs : (match.matchScore?.team1Score?.inngs1?.runs ?? 0);
  const t1Wkts = inn1 ? inn1.wickets : (match.matchScore?.team1Score?.inngs1?.wickets ?? 0);
  const t1Overs = inn1 ? inn1.overs : (match.matchScore?.team1Score?.inngs1?.overs ?? 20);

  // Innings 2 score & overs
  const t2Runs = inn2 ? inn2.runs : (match.matchScore?.team2Score?.inngs1?.runs ?? 0);
  const t2Wkts = inn2 ? inn2.wickets : (match.matchScore?.team2Score?.inngs1?.wickets ?? 0);
  const t2Overs = inn2 ? inn2.overs : (match.matchScore?.team2Score?.inngs1?.overs ?? 20);

  // Run rates
  const t1RunRate = calculateRunRate(t1Runs, t1Overs);
  const t2RunRate = calculateRunRate(t2Runs, t2Overs);
  const ballsLeft = calculateBallsRemaining(t2Overs, 20);

  // Winner & Result derivation
  const winnerName =
    card?.result?.winner ||
    info.winner ||
    (t2Runs > t1Runs ? team2Name : t1Runs > t2Runs ? team1Name : "");
  const isT1Winner = Boolean(winnerName && winnerName.toLowerCase().includes(team1Name.toLowerCase()));
  const isT2Winner = Boolean(winnerName && winnerName.toLowerCase().includes(team2Name.toLowerCase()));

  const marginRaw = card?.result?.by || info.margin || "";
  const resultBannerText = winnerName
    ? `${teamShort(winnerName) || winnerName} WON BY ${marginRaw ? marginRaw.toUpperCase() : "MATCH MARGIN"}`
    : info.status || "MATCH COMPLETE";

  // Target and chase equation
  const targetRuns = t1Runs > 0 ? t1Runs + 1 : 0;
  const targetRequiredRR = targetRuns > 0 ? (targetRuns / 20).toFixed(2) : null;

  // Player of the Match resolution
  const potmRaw = card?.playerOfMatch?.[0] || info.mom || "";
  const potmExpanded = potmRaw ? expandPlayerName(potmRaw) : "";

  // Team 1 featured performer (Innings 1)
  const t1TopPerformer = useMemo(() => {
    if (inn1?.batting && inn1.batting.length > 0) {
      const sortedBatters = [...inn1.batting].sort((a, b) => b.runs - a.runs);
      if (sortedBatters[0] && sortedBatters[0].runs > 0) {
        return {
          name: sortedBatters[0].name,
          role: isT1Winner ? "MATCH WINNER" : "TOP PERFORMER",
          runs: sortedBatters[0].runs,
          balls: sortedBatters[0].balls,
          fours: sortedBatters[0].fours,
          sixes: sortedBatters[0].sixes,
          sr: sortedBatters[0].sr,
          notOut: sortedBatters[0].notOut,
          isCapOrIcon: false,
        };
      }
    }
    // Check if POTM belongs to Team 1
    if (potmExpanded && isT1Winner) {
      return {
        name: potmExpanded,
        role: "PLAYER OF THE MATCH",
        runs: 0,
        balls: 0,
        fours: 0,
        sixes: 0,
        sr: 0,
        notOut: false,
        desc: "Match-winning performance",
        isCapOrIcon: true,
      };
    }
    // Fallback to franchise marquee icon
    const icon = FRANCHISE_KEY_PLAYERS[team1Code] || {
      name: `${team1Code} Captain`,
      role: "FRANCHISE CAPTAIN",
      desc: "Tactical on-field leader",
    };
    return {
      name: icon.name,
      role: icon.role,
      runs: 0,
      balls: 0,
      fours: 0,
      sixes: 0,
      sr: 0,
      notOut: false,
      desc: icon.desc,
      isCapOrIcon: true,
    };
  }, [inn1, isT1Winner, potmExpanded, team1Code]);

  // Team 2 featured performer (Innings 2 / POTM)
  const t2TopPerformer = useMemo(() => {
    // Priority 1: POTM if on Team 2
    if (potmExpanded && (isT2Winner || !isT1Winner)) {
      if (inn2?.batting) {
        const found = inn2.batting.find(
          (b) => b.name.toLowerCase() === potmExpanded.toLowerCase() || b.name.toLowerCase() === potmRaw.toLowerCase()
        );
        if (found) {
          return {
            name: expandPlayerName(found.name),
            role: "PLAYER OF THE MATCH",
            runs: found.runs,
            balls: found.balls,
            fours: found.fours,
            sixes: found.sixes,
            sr: found.sr,
            notOut: found.notOut,
            isCapOrIcon: false,
          };
        }
      }
      return {
        name: potmExpanded,
        role: "PLAYER OF THE MATCH",
        runs: 0,
        balls: 0,
        fours: 0,
        sixes: 0,
        sr: 0,
        notOut: false,
        desc: isT2Winner ? "Championship Chase Hero" : "Outstanding Match Impact",
        isCapOrIcon: true,
      };
    }
    // Priority 2: Top run scorer from Innings 2
    if (inn2?.batting && inn2.batting.length > 0) {
      const sortedBatters = [...inn2.batting].sort((a, b) => b.runs - a.runs);
      if (sortedBatters[0] && sortedBatters[0].runs > 0) {
        return {
          name: sortedBatters[0].name,
          role: isT2Winner ? "MATCH WINNER" : "TOP PERFORMER",
          runs: sortedBatters[0].runs,
          balls: sortedBatters[0].balls,
          fours: sortedBatters[0].fours,
          sixes: sortedBatters[0].sixes,
          sr: sortedBatters[0].sr,
          notOut: sortedBatters[0].notOut,
          isCapOrIcon: false,
        };
      }
    }
    // Fallback: Franchise marquee icon
    const icon = FRANCHISE_KEY_PLAYERS[team2Code] || {
      name: `${team2Code} Captain`,
      role: "FRANCHISE CAPTAIN",
      desc: "Tactical on-field leader",
    };
    return {
      name: icon.name,
      role: icon.role,
      runs: 0,
      balls: 0,
      fours: 0,
      sixes: 0,
      sr: 0,
      notOut: false,
      desc: icon.desc,
      isCapOrIcon: true,
    };
  }, [inn2, isT1Winner, isT2Winner, potmExpanded, potmRaw, team2Code]);

  // Date and Venue Formatting
  const matchDate = new Date(info.startDate);
  const formattedDate = isNaN(matchDate.getTime())
    ? info.seriesName || "IPL CHAMPIONSHIP"
    : matchDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }).toUpperCase();
  const weekday = isNaN(matchDate.getTime())
    ? "MATCH"
    : matchDate.toLocaleDateString("en-US", { weekday: "short" }).toUpperCase();

  const venueGround = info.venueInfo?.ground || card?.venue || "IPL Stadium";
  const venueCity = info.venueInfo?.city || card?.city || "";
  const canonicalVenue = normalizeVenueName(venueGround);

  // Progress bar calculation (percentages)
  const totalBothRuns = Math.max(1, t1Runs + t2Runs);
  const t1Percent = Math.min(85, Math.max(15, Math.round((t1Runs / totalBothRuns) * 100)));
  const t2Percent = 100 - t1Percent;

  return (
    <div className="relative w-full rounded-[28px] md:rounded-[36px] bg-[#070b14] border border-white/10 shadow-2xl overflow-hidden p-5 sm:p-7 lg:p-8 flex flex-col gap-6">
      {/* Volumetric Franchise Neon Flares */}
      <div
        className="absolute top-0 left-0 w-2/5 h-full blur-3xl opacity-20 pointer-events-none"
        style={{ background: `radial-gradient(circle at 10% 20%, ${t1Color}, transparent 70%)` }}
      />
      <div
        className="absolute top-0 right-0 w-2/5 h-full blur-3xl opacity-20 pointer-events-none"
        style={{ background: `radial-gradient(circle at 90% 20%, ${t2Color}, transparent 70%)` }}
      />

      {/* Grid Pattern Mesh */}
      <div className="absolute inset-0 bg-[radial-gradient(#ffffff08_1px,transparent_1px)] [background-size:24px_24px] pointer-events-none opacity-40" />

      {/* ─── HEADER BAR: TOURNAMENT & TIMING ─── */}
      <div className="relative z-10 flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-white/10">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-[11px] font-mono font-black uppercase tracking-[0.2em] text-white/70">
            {info.seriesName || "IPL CHAMPIONSHIP"} • MATCH CENTER
          </span>
        </div>

        <div className="flex items-center gap-2 text-xs font-mono font-bold text-slate-300">
          <span>{formattedDate}</span>
          <span className="text-slate-600">·</span>
          <span className="text-amber-400">{weekday}</span>
          <span className="text-slate-600">·</span>
          <span className="text-emerald-400">07:30 PM IST</span>
        </div>

        <Link
          href={venueHref(venueGround)}
          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-[11px] font-mono text-slate-300 hover:text-cyan-300 transition-colors group/vlink"
        >
          <MapPin className="w-3 h-3 text-cyan-400 shrink-0" />
          <span className="truncate max-w-[220px]">{canonicalVenue}{venueCity ? `, ${venueCity}` : ""}</span>
        </Link>
      </div>

      {/* ─── 3-COLUMN SHOWDOWN GRID ─── */}
      <div className="relative z-10 grid grid-cols-1 lg:grid-cols-[1.15fr_1.1fr_1.15fr] gap-6 items-stretch">
        
        {/* ═══════════════════════════════════════════════════════════
            COLUMN 1: TEAM 1 (GUJARAT TITANS)
            ═══════════════════════════════════════════════════════════ */}
        <div
          className={`flex flex-col justify-between rounded-2xl p-5 border transition-all ${
            isT1Winner
              ? "bg-slate-900/60 border-amber-500/40 shadow-[0_0_24px_rgba(245,158,11,0.15)]"
              : "bg-white/[0.03] border-white/10"
          }`}
        >
          {/* Top: Team Identity */}
          <div className="flex items-center justify-between gap-2">
            <Link
              href={`/teams/${teamSlug(team1Name)}`}
              className="flex items-center gap-2.5 group/team min-w-0"
            >
              <div
                className="w-12 h-12 rounded-xl p-2 bg-white/5 border border-white/10 flex items-center justify-center shrink-0 group-hover/team:scale-105 transition-transform"
                style={{ borderColor: `${t1Color}60` }}
              >
                <TeamLogo team={team1Code} size="w-8 h-8" />
              </div>
              <div className="min-w-0">
                <span className="text-[10px] font-mono font-bold tracking-widest text-slate-400 uppercase block">
                  1ST INNINGS
                </span>
                <h3 className="text-xs sm:text-sm md:text-base font-black uppercase text-white tracking-tight group-hover/team:text-cyan-300 transition-colors">
                  {team1Name}
                </h3>
              </div>
            </Link>

            {isT1Winner && (
              <span className="px-2.5 py-1 rounded-full bg-amber-400/20 border border-amber-400/40 text-amber-300 font-mono text-[10px] font-black uppercase tracking-wider shrink-0 flex items-center gap-1">
                <Trophy className="w-3 h-3" /> WINNER
              </span>
            )}
          </div>

          {/* Middle: Innings Score Readout */}
          <div className="my-5 flex items-baseline justify-between gap-4 border-y border-white/10 py-3">
            <div className="flex items-baseline gap-2 font-mono">
              <span className="text-4xl sm:text-5xl font-black text-white tracking-tight tabular-nums">
                {t1Runs}/{t1Wkts}
              </span>
              <span className="text-sm sm:text-base font-bold text-slate-400">
                ({t1Overs} OV)
              </span>
            </div>
            <div className="text-right font-mono">
              <span className="text-[10px] uppercase text-slate-400 font-bold block">Run Rate</span>
              <span className="text-base sm:text-lg font-black text-cyan-400 tabular-nums">
                {t1RunRate} <span className="text-xs font-normal text-slate-400">rpo</span>
              </span>
            </div>
          </div>

          {/* Bottom: Player Feature Tile */}
          <div className="rounded-xl bg-black/40 border border-white/10 p-3.5 flex items-center gap-3.5">
            <div className="relative shrink-0 w-14 h-14 sm:w-16 sm:h-16 rounded-xl overflow-hidden border border-white/15 bg-white/5 flex items-center justify-center">
              {t1TopPerformer && FRANCHISE_CUTOUTS[t1TopPerformer.name.toLowerCase()] ? (
                <img
                  src={FRANCHISE_CUTOUTS[t1TopPerformer.name.toLowerCase()]}
                  alt={t1TopPerformer.name}
                  className="w-full h-full object-contain object-bottom drop-shadow-md"
                />
              ) : (
                <PlayerAvatar
                  name={t1TopPerformer?.name || team1Name}
                  teamId={team1Name}
                  season={card?.season}
                  strictHistoricalJersey={true}
                  className="w-full h-full object-cover"
                />
              )}
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <span className="text-[9px] font-mono font-bold tracking-widest text-cyan-400 uppercase flex items-center gap-1">
                  <Zap className="w-2.5 h-2.5 fill-cyan-400" /> {t1TopPerformer?.role}
                </span>
              </div>
              <Link
                href={`/players/${playerSlug(t1TopPerformer?.name || "")}`}
                className="text-sm sm:text-base font-black text-white hover:text-cyan-300 uppercase tracking-tight block truncate mt-0.5"
              >
                {t1TopPerformer?.name}
              </Link>
              {t1TopPerformer?.runs && t1TopPerformer.runs > 0 ? (
                <div className="text-xs font-mono text-slate-300 mt-0.5 flex items-center gap-2">
                  <span className="font-black text-cyan-400">
                    {t1TopPerformer.runs}{t1TopPerformer.notOut ? "*" : ""} ({t1TopPerformer.balls}b)
                  </span>
                  <span className="text-[10px] text-slate-500">•</span>
                  <span className="text-[11px] text-slate-400">
                    {t1TopPerformer.fours} 4s · {t1TopPerformer.sixes} 6s · SR {t1TopPerformer.sr}
                  </span>
                </div>
              ) : (
                <div className="text-[11px] font-mono text-slate-400 mt-0.5 truncate">
                  {t1TopPerformer?.desc || "Franchise Key Contributor"}
                </div>
              )}
            </div>

            <Link
              href={`/players/${playerSlug(t1TopPerformer?.name || "")}`}
              className="shrink-0 p-2 rounded-lg bg-white/5 hover:bg-cyan-500/20 text-slate-400 hover:text-cyan-300 transition-colors"
              title="View Player Profile"
            >
              <ArrowUpRight className="w-4 h-4" />
            </Link>
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════════
            COLUMN 2: CENTER CLASH & DECISIVE RESULT
            ═══════════════════════════════════════════════════════════ */}
        <div className="flex flex-col items-center justify-between rounded-2xl p-5 bg-white/[0.02] border border-white/10 text-center">
          {/* Duel Header with Franchise Colors Arc */}
          <div className="w-full flex items-center justify-center gap-4">
            <div
              className="h-1 flex-1 rounded-full opacity-60"
              style={{ background: `linear-gradient(90deg, transparent, ${t1Color})` }}
            />
            <span className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-[10px] font-mono font-black text-slate-300 tracking-widest uppercase">
              SHOWDOWN
            </span>
            <div
              className="h-1 flex-1 rounded-full opacity-60"
              style={{ background: `linear-gradient(90deg, ${t2Color}, transparent)` }}
            />
          </div>

          {/* Symmetrical Dual Duel Logos */}
          <div className="my-3 flex items-center justify-center gap-6">
            <Link href={`/teams/${teamSlug(team1Name)}`} className="hover:scale-105 transition-transform">
              <div
                className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl p-2.5 bg-black/40 border flex items-center justify-center shadow-lg"
                style={{ borderColor: `${t1Color}80` }}
              >
                <TeamLogo team={team1Code} size="w-10 h-10" />
              </div>
            </Link>

            <div className="flex flex-col items-center">
              <div className="w-8 h-8 rounded-full bg-white/10 border border-white/20 flex items-center justify-center font-mono font-black text-xs text-white shadow-inner">
                VS
              </div>
            </div>

            <Link href={`/teams/${teamSlug(team2Name)}`} className="hover:scale-105 transition-transform">
              <div
                className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl p-2.5 bg-black/40 border flex items-center justify-center shadow-lg"
                style={{ borderColor: `${t2Color}80` }}
              >
                <TeamLogo team={team2Code} size="w-10 h-10" />
              </div>
            </Link>
          </div>

          {/* Championship Result Ribbon */}
          <div className="w-full my-2">
            <div className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-rose-950/80 via-rose-900/60 to-rose-950/80 border border-rose-500/40 text-white font-mono shadow-xl flex items-center justify-center gap-2">
              <Trophy className="w-4 h-4 text-amber-400 shrink-0 animate-bounce" />
              <span className="text-xs sm:text-sm font-black uppercase tracking-wider truncate">
                {resultBannerText}
              </span>
            </div>
          </div>

          {/* Target & Chase Equation */}
          <div className="w-full rounded-xl bg-black/30 border border-white/5 p-3 flex flex-col gap-1.5 text-xs font-mono">
            {targetRuns > 0 && (
              <div className="flex items-center justify-between text-slate-300">
                <span className="flex items-center gap-1 text-[11px] text-slate-400">
                  <Target className="w-3.5 h-3.5 text-rose-400" /> Target Set
                </span>
                <span className="font-bold text-white">
                  {targetRuns} runs {targetRequiredRR && <span className="text-slate-400 font-normal">(Req. {targetRequiredRR} rpo)</span>}
                </span>
              </div>
            )}
            <div className="flex items-center justify-between text-slate-300">
              <span className="flex items-center gap-1 text-[11px] text-slate-400">
                <Clock className="w-3.5 h-3.5 text-emerald-400" /> Remainder
              </span>
              <span className="font-bold text-emerald-400">
                {ballsLeft > 0 ? `${ballsLeft} balls remaining` : "Innings completed"}
              </span>
            </div>
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════════
            COLUMN 3: TEAM 2 (ROYAL CHALLENGERS BENGALURU)
            ═══════════════════════════════════════════════════════════ */}
        <div
          className={`flex flex-col justify-between rounded-2xl p-5 border transition-all ${
            isT2Winner
              ? "bg-slate-900/60 border-rose-500/40 shadow-[0_0_24px_rgba(244,63,94,0.15)]"
              : "bg-white/[0.03] border-white/10"
          }`}
        >
          {/* Top: Team Identity */}
          <div className="flex items-center justify-between gap-2">
            {isT2Winner ? (
              <span className="px-2.5 py-1 rounded-full bg-gradient-to-r from-amber-400/20 to-rose-400/20 border border-amber-400/40 text-amber-300 font-mono text-[10px] font-black uppercase tracking-wider shrink-0 flex items-center gap-1 shadow-sm">
                <Trophy className="w-3 h-3 text-amber-400" /> WINNER
              </span>
            ) : (
              <span className="text-[10px] font-mono font-bold tracking-widest text-slate-400 uppercase">
                2ND INNINGS
              </span>
            )}

            <Link
              href={`/teams/${teamSlug(team2Name)}`}
              className="flex items-center gap-2.5 group/team min-w-0 text-right justify-end"
            >
              <div className="min-w-0">
                <span className="text-[10px] font-mono font-bold tracking-widest text-slate-400 uppercase block">
                  CHASE SQUAD
                </span>
                <h3 className="text-xs sm:text-sm md:text-base font-black uppercase text-white tracking-tight group-hover/team:text-rose-400 transition-colors">
                  {team2Name}
                </h3>
              </div>
              <div
                className="w-12 h-12 rounded-xl p-2 bg-white/5 border border-white/10 flex items-center justify-center shrink-0 group-hover/team:scale-105 transition-transform"
                style={{ borderColor: `${t2Color}60` }}
              >
                <TeamLogo team={team2Code} size="w-8 h-8" />
              </div>
            </Link>
          </div>

          {/* Middle: Innings Score Readout */}
          <div className="my-5 flex items-baseline justify-between gap-4 border-y border-white/10 py-3">
            <div className="font-mono">
              <span className="text-[10px] uppercase text-slate-400 font-bold block">Chase Rate</span>
              <span className="text-base sm:text-lg font-black text-rose-400 tabular-nums">
                {t2RunRate} <span className="text-xs font-normal text-slate-400">rpo</span>
              </span>
            </div>
            <div className="flex items-baseline gap-2 font-mono text-right">
              <span className="text-4xl sm:text-5xl font-black text-rose-400 tracking-tight tabular-nums">
                {t2Runs}/{t2Wkts}
              </span>
              <span className="text-sm sm:text-base font-bold text-slate-400">
                ({t2Overs} OV)
              </span>
            </div>
          </div>

          {/* Bottom: Player Feature Tile (Mirrored or Spotlight) */}
          <div className="rounded-xl bg-black/40 border border-white/10 p-3.5 flex items-center gap-3.5">
            <Link
              href={`/players/${playerSlug(t2TopPerformer?.name || "")}`}
              className="shrink-0 p-2 rounded-lg bg-white/5 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 transition-colors"
              title="View Player Profile"
            >
              <ArrowUpRight className="w-4 h-4" />
            </Link>

            <div className="min-w-0 flex-1 text-right">
              <div className="flex items-center justify-end gap-1.5">
                <span className="text-[9px] font-mono font-bold tracking-widest text-amber-400 uppercase flex items-center gap-1">
                  <Award className="w-2.5 h-2.5 fill-amber-400" /> {t2TopPerformer?.role}
                </span>
              </div>
              <Link
                href={`/players/${playerSlug(t2TopPerformer?.name || "")}`}
                className="text-sm sm:text-base font-black text-white hover:text-rose-400 uppercase tracking-tight block truncate mt-0.5"
              >
                {t2TopPerformer?.name}
              </Link>
              {t2TopPerformer?.runs && t2TopPerformer.runs > 0 ? (
                <div className="text-xs font-mono text-slate-300 mt-0.5 flex items-center justify-end gap-2">
                  <span className="text-[11px] text-slate-400">
                    {t2TopPerformer.fours} 4s · {t2TopPerformer.sixes} 6s · SR {t2TopPerformer.sr}
                  </span>
                  <span className="text-[10px] text-slate-500">•</span>
                  <span className="font-black text-rose-400">
                    {t2TopPerformer.runs}{t2TopPerformer.notOut ? "*" : ""} ({t2TopPerformer.balls}b)
                  </span>
                </div>
              ) : (
                <div className="text-[11px] font-mono text-slate-400 mt-0.5 truncate">
                  {t2TopPerformer?.desc || "Player of the Match"}
                </div>
              )}
            </div>

            <div className="relative shrink-0 w-14 h-14 sm:w-16 sm:h-16 rounded-xl overflow-hidden border border-white/15 bg-white/5 flex items-center justify-center">
              {t2TopPerformer && FRANCHISE_CUTOUTS[t2TopPerformer.name.toLowerCase()] ? (
                <img
                  src={FRANCHISE_CUTOUTS[t2TopPerformer.name.toLowerCase()]}
                  alt={t2TopPerformer.name}
                  className="w-full h-full object-contain object-bottom drop-shadow-md"
                />
              ) : (
                <PlayerAvatar
                  name={t2TopPerformer?.name || team2Name}
                  teamId={team2Name}
                  season={card?.season}
                  strictHistoricalJersey={true}
                  className="w-full h-full object-cover"
                />
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ─── BOTTOM TELEMETRY RIBBON & COMPARISON METER ─── */}
      <div className="relative z-10 pt-4 border-t border-white/10 flex flex-col gap-4">
        {/* Dual-Innings Score Comparison Bar */}
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between text-[11px] font-mono font-bold text-slate-300">
            <span className="text-cyan-400 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: t1Color }} />
              {team1Code} {t1Runs}/{t1Wkts} ({t1Overs} ov)
            </span>
            {targetRuns > 0 && (
              <span className="text-slate-400 px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-[10px]">
                TARGET {targetRuns}
              </span>
            )}
            <span className="text-rose-400 flex items-center gap-1.5">
              {team2Code} {t2Runs}/{t2Wkts} ({t2Overs} ov)
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: t2Color }} />
            </span>
          </div>

          {/* Symmetrical Dual Bar */}
          <div className="relative w-full h-2.5 rounded-full bg-slate-800/80 overflow-hidden flex">
            <div
              className="h-full transition-all duration-700"
              style={{
                width: `${t1Percent}%`,
                background: `linear-gradient(90deg, ${t1Color}, #06b6d4)`,
              }}
            />
            <div
              className="h-full transition-all duration-700"
              style={{
                width: `${t2Percent}%`,
                background: `linear-gradient(90deg, #f43f5e, ${t2Color})`,
              }}
            />
          </div>
        </div>

        {/* 4-Metric Broadcast Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
          <div className="rounded-xl bg-white/[0.02] border border-white/5 p-3 flex flex-col gap-0.5">
            <span className="text-[9px] font-mono font-bold uppercase tracking-widest text-slate-400">
              1st Innings Rate
            </span>
            <div className="text-sm sm:text-base font-black font-mono text-cyan-400 tabular-nums">
              {t1RunRate} <span className="text-[10px] font-normal text-slate-400">RPO</span>
            </div>
            <span className="text-[10px] text-slate-500 font-mono truncate">{team1Name}</span>
          </div>

          <div className="rounded-xl bg-white/[0.02] border border-white/5 p-3 flex flex-col gap-0.5">
            <span className="text-[9px] font-mono font-bold uppercase tracking-widest text-slate-400">
              Chase Run Rate
            </span>
            <div className="text-sm sm:text-base font-black font-mono text-rose-400 tabular-nums">
              {t2RunRate} <span className="text-[10px] font-normal text-slate-400">RPO</span>
            </div>
            <span className="text-[10px] text-slate-500 font-mono truncate">{team2Name}</span>
          </div>

          <div className="rounded-xl bg-white/[0.02] border border-white/5 p-3 flex flex-col gap-0.5">
            <span className="text-[9px] font-mono font-bold uppercase tracking-widest text-slate-400">
              Decisive Margin
            </span>
            <div className="text-sm sm:text-base font-black font-mono text-amber-400 tabular-nums truncate">
              {marginRaw ? marginRaw.toUpperCase() : "VICTORY"}
            </div>
            <span className="text-[10px] text-slate-500 font-mono truncate">
              {ballsLeft > 0 ? `${ballsLeft} Balls Left` : "Final Over"}
            </span>
          </div>

          <div className="rounded-xl bg-white/[0.02] border border-white/5 p-3 flex flex-col gap-0.5">
            <span className="text-[9px] font-mono font-bold uppercase tracking-widest text-slate-400">
              Venue Telemetry
            </span>
            <div className="text-sm sm:text-base font-black font-mono text-emerald-400 tabular-nums truncate">
              {venueCity || "Stadium"}
            </div>
            <span className="text-[10px] text-slate-500 font-mono truncate">
              {canonicalVenue}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
