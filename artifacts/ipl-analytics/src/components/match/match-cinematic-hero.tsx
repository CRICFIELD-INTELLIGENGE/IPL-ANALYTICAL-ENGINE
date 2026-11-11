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
import { MapPin, Trophy, Award, ArrowUpRight, ChevronRight, Zap } from "lucide-react";

export interface MatchCinematicHeroProps {
  match: import("@/lib/live").LiveMatch;
  card?: MatchScorecard;
}

const teamSlug = (team?: string | null): string =>
  (team || "").toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

// Franchise high-res cutouts available in public/
const FRANCHISE_CUTOUTS: Record<string, string> = {
  "virat kohli": "/virat-kohli-transparent.png",
  "v kohli": "/virat-kohli-transparent.png",
  "ms dhoni": "/msd-transparent.png",
  "ab de villiers": "/ab-devillers-transparent.png",
  "sanju samson": "/sanju-samson-transparent.png",
  "suresh raina": "/suresh-raina-transparent.png",
};

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

  // Best performer / featured player for Innings 1 (Team 1)
  const t1TopPerformer = useMemo(() => {
    if (!inn1) return null;
    const sortedBatters = [...inn1.batting].sort((a, b) => b.runs - a.runs);
    if (sortedBatters[0] && sortedBatters[0].runs > 0) {
      return {
        name: sortedBatters[0].name,
        role: "TOP PERFORMER",
        runs: sortedBatters[0].runs,
        balls: sortedBatters[0].balls,
        fours: sortedBatters[0].fours,
        sixes: sortedBatters[0].sixes,
        sr: sortedBatters[0].sr,
        notOut: sortedBatters[0].notOut,
      };
    }
    return null;
  }, [inn1]);

  // Best performer / POTM for Innings 2 (Team 2) or Match Winner
  const t2TopPerformer = useMemo(() => {
    const potmName = card?.playerOfMatch?.[0];
    if (potmName) {
      // Find POTM in batting or bowling
      for (const inn of card?.innings ?? []) {
        const b = inn.batting.find(x => x.name.toLowerCase() === potmName.toLowerCase());
        if (b) {
          return {
            name: b.name,
            role: "PLAYER OF THE MATCH",
            runs: b.runs,
            balls: b.balls,
            fours: b.fours,
            sixes: b.sixes,
            sr: b.sr,
            notOut: b.notOut,
          };
        }
      }
    }
    if (inn2) {
      const sortedBatters = [...inn2.batting].sort((a, b) => b.runs - a.runs);
      if (sortedBatters[0] && sortedBatters[0].runs > 0) {
        return {
          name: sortedBatters[0].name,
          role: card?.result?.winner?.includes(team2Name) ? "MATCH WINNER" : "TOP PERFORMER",
          runs: sortedBatters[0].runs,
          balls: sortedBatters[0].balls,
          fours: sortedBatters[0].fours,
          sixes: sortedBatters[0].sixes,
          sr: sortedBatters[0].sr,
          notOut: sortedBatters[0].notOut,
        };
      }
    }
    return null;
  }, [inn2, card, team2Name]);

  const matchDate = new Date(info.startDate);
  const formattedDate = isNaN(matchDate.getTime())
    ? info.seriesName
    : matchDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }).toUpperCase();
  const weekday = isNaN(matchDate.getTime())
    ? "IPL"
    : matchDate.toLocaleDateString("en-US", { weekday: "short" }).toUpperCase();

  const venueGround = info.venueInfo?.ground || card?.venue || "IPL Venue";
  const venueCity = info.venueInfo?.city || card?.city || "";
  const canonicalVenue = normalizeVenueName(venueGround);

  const t1ScoreStr = inn1 ? `${inn1.runs}/${inn1.wickets}` : `${match.matchScore?.team1Score?.inngs1?.runs ?? 0}/${match.matchScore?.team1Score?.inngs1?.wickets ?? 0}`;
  const t1OversStr = inn1 ? `(${inn1.overs} OV)` : `(${match.matchScore?.team1Score?.inngs1?.overs ?? 0} OV)`;

  const t2ScoreStr = inn2 ? `${inn2.runs}/${inn2.wickets}` : `${match.matchScore?.team2Score?.inngs1?.runs ?? 0}/${match.matchScore?.team2Score?.inngs1?.wickets ?? 0}`;
  const t2OversStr = inn2 ? `(${inn2.overs} OV)` : `(${match.matchScore?.team2Score?.inngs1?.overs ?? 0} OV)`;

  const resultText = card?.result?.winner
    ? `${teamShort(card.result.winner)} WON BY ${card.result.by || "MATCH MARGIN"}`
    : info.status;

  const isT1Winner = card?.result?.winner?.includes(team1Name);
  const isT2Winner = card?.result?.winner?.includes(team2Name);

  return (
    <div className="relative w-full rounded-[28px] md:rounded-[36px] bg-[#070b14] border border-white/10 shadow-2xl overflow-hidden min-h-[360px] md:min-h-[400px] flex flex-col justify-between p-4 sm:p-6 lg:p-8">
      {/* Volumetric Franchise Neon Flares */}
      <div
        className="absolute top-0 left-0 w-1/3 h-full blur-3xl opacity-20 pointer-events-none"
        style={{ background: `radial-gradient(circle at 10% 20%, ${t1Color}, transparent 70%)` }}
      />
      <div
        className="absolute top-0 right-0 w-1/3 h-full blur-3xl opacity-20 pointer-events-none"
        style={{ background: `radial-gradient(circle at 90% 20%, ${t2Color}, transparent 70%)` }}
      />

      {/* Grid Pattern Mesh */}
      <div className="absolute inset-0 bg-[radial-gradient(#ffffff08_1px,transparent_1px)] [background-size:24px_24px] pointer-events-none opacity-40" />

      {/* ─── 3-ZONE BROADCAST SHOWDOWN ─── */}
      <div className="relative z-10 grid grid-cols-1 lg:grid-cols-[1.1fr_1.2fr_1.1fr] gap-6 items-center w-full">
        
        {/* ═══════════════════════════════════════════════════════════
            ZONE 1: LEFT — TEAM A & TOP PERFORMER
            ═══════════════════════════════════════════════════════════ */}
        <div className="flex items-center gap-4 lg:gap-6 min-w-0">
          {/* Player Cutout / Portrait */}
          <div className="relative shrink-0 w-24 h-32 sm:w-28 sm:h-36 md:w-36 md:h-48 flex items-end justify-center">
            {t1TopPerformer && FRANCHISE_CUTOUTS[t1TopPerformer.name.toLowerCase()] ? (
              <img
                src={FRANCHISE_CUTOUTS[t1TopPerformer.name.toLowerCase()]}
                alt={t1TopPerformer.name}
                className="w-full h-full object-contain object-bottom drop-shadow-[0_10px_20px_rgba(0,0,0,0.8)] filter contrast-105"
              />
            ) : t1TopPerformer ? (
              <div className="w-20 h-20 sm:w-24 sm:h-24 md:w-28 md:h-28 rounded-2xl overflow-hidden border-2 shadow-2xl" style={{ borderColor: t1Color }}>
                <PlayerAvatar 
                  name={t1TopPerformer.name} 
                  teamId={team1Name}
                  season={card?.season}
                  strictHistoricalJersey={true}
                  className="w-full h-full object-cover" 
                />
              </div>
            ) : (
              <div className="w-20 h-20 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center">
                <TeamLogo team={team1Code} size="w-12 h-12" />
              </div>
            )}
          </div>

          {/* Player Stats & Team Summary */}
          <div className="flex flex-col min-w-0">
            {t1TopPerformer && (
              <div className="mb-2">
                <span className="text-[10px] font-mono font-bold tracking-widest text-cyan-400 uppercase flex items-center gap-1">
                  <Zap className="w-3 h-3 fill-cyan-400" /> {t1TopPerformer.role}
                </span>
                <Link
                  href={`/players/${playerSlug(t1TopPerformer.name)}`}
                  className="text-base sm:text-lg md:text-xl font-black text-white hover:text-cyan-300 uppercase tracking-tight block truncate mt-0.5"
                >
                  {t1TopPerformer.name}
                </Link>
                <div className="flex items-baseline gap-1.5 mt-0.5 font-mono">
                  <span className="text-xl sm:text-2xl font-black text-cyan-400 tabular-nums">
                    {t1TopPerformer.runs}{t1TopPerformer.notOut ? "*" : ""}
                  </span>
                  <span className="text-xs text-slate-400 font-medium">({t1TopPerformer.balls})</span>
                </div>
                <div className="text-[10px] font-mono text-slate-400 mt-0.5">
                  {t1TopPerformer.fours} FOURS · {t1TopPerformer.sixes} SIXES · SR {t1TopPerformer.sr}
                </div>
                <Link
                  href={`/players/${playerSlug(t1TopPerformer.name)}`}
                  className="inline-flex items-center gap-1 text-[10px] font-mono font-bold text-cyan-400 hover:text-white uppercase tracking-wider mt-2 group/btn"
                >
                  <span>VIEW PLAYER ANALYSIS</span>
                  <ArrowUpRight className="w-3 h-3 group-hover/btn:translate-x-0.5 group-hover/btn:-translate-y-0.5 transition-transform" />
                </Link>
              </div>
            )}

            {/* Team 1 Score Readout */}
            <div className="pt-2 border-t border-white/10 flex items-center gap-3">
              <Link href={`/teams/${teamSlug(team1Name)}`} className="shrink-0 hover:scale-105 transition-transform">
                <TeamLogo team={team1Code} size="w-8 h-8 sm:w-10 sm:h-10" />
              </Link>
              <div>
                <span className="text-xs font-mono font-bold text-white uppercase">{team1Code}</span>
                <div className="flex items-baseline gap-1.5 font-mono">
                  <span className="text-xl sm:text-2xl font-black text-white tabular-nums leading-none">
                    {t1ScoreStr}
                  </span>
                  <span className="text-[11px] text-slate-400">{t1OversStr}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════════
            ZONE 2: CENTER — MATCH INTELLIGENCE & CLASH
            ═══════════════════════════════════════════════════════════ */}
        <div className="flex flex-col items-center justify-center text-center px-2 py-4 lg:py-0 border-y lg:border-y-0 lg:border-x border-white/10 min-w-0">
          {/* Match Date & Timing */}
          <div className="font-mono text-xs uppercase tracking-widest text-slate-300 font-bold flex items-center gap-2">
            <span>{formattedDate}</span>
            <span className="text-slate-600">·</span>
            <span className="text-slate-400">{weekday}</span>
            <span className="text-slate-600">·</span>
            <span className="flex items-center gap-1 text-emerald-400">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              07:30 PM IST
            </span>
          </div>

          {/* Symmetrical Dual Logos & VS */}
          <div className="flex items-center justify-center gap-4 sm:gap-6 my-3">
            <Link href={`/teams/${teamSlug(team1Name)}`} className="hover:scale-105 transition-transform">
              <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-white/5 border border-white/10 p-2 flex items-center justify-center shadow-lg">
                <TeamLogo team={team1Code} size="w-10 h-10 sm:w-12 sm:h-12" />
              </div>
            </Link>

            <div className="flex flex-col items-center">
              <span className="text-xs font-mono font-black text-slate-400 tracking-widest uppercase">VS</span>
              <div className="w-6 h-[1px] bg-slate-700 mt-1" />
            </div>

            <Link href={`/teams/${teamSlug(team2Name)}`} className="hover:scale-105 transition-transform">
              <div
                className={`w-14 h-14 sm:w-16 sm:h-16 rounded-2xl p-2 flex items-center justify-center shadow-lg transition-all ${
                  isT2Winner ? "border-2 bg-slate-900/80" : "bg-white/5 border border-white/10"
                }`}
                style={isT2Winner ? { borderColor: t2Color, boxShadow: `0 0 20px ${t2Color}50` } : undefined}
              >
                <TeamLogo team={team2Code} size="w-10 h-10 sm:w-12 sm:h-12" />
              </div>
            </Link>
          </div>

          {/* Result Pill Badge */}
          <div className="my-1.5">
            <div className="px-4 py-1.5 rounded-full bg-gradient-to-r from-rose-950/80 via-rose-900/60 to-rose-950/80 border border-rose-500/40 text-white font-mono text-xs sm:text-sm font-black uppercase tracking-wider shadow-lg flex items-center gap-2">
              <Trophy className="w-4 h-4 text-amber-400 shrink-0" />
              <span>{resultText}</span>
            </div>
          </div>

          {/* Venue Profile Link */}
          <Link
            href={venueHref(venueGround)}
            className="inline-flex items-center gap-1.5 text-xs font-mono text-slate-400 hover:text-cyan-300 transition-colors mt-2 max-w-full truncate group/vlink"
            title={`Explore Venue: ${canonicalVenue}`}
          >
            <MapPin className="w-3.5 h-3.5 text-slate-500 group-hover/vlink:text-cyan-400 shrink-0" />
            <span className="truncate">{canonicalVenue}{venueCity ? `, ${venueCity}` : ""}</span>
          </Link>
        </div>

        {/* ═══════════════════════════════════════════════════════════
            ZONE 3: RIGHT — TEAM B & PLAYER OF THE MATCH
            ═══════════════════════════════════════════════════════════ */}
        <div className="flex items-center justify-end gap-4 lg:gap-6 min-w-0">
          {/* Player Stats & Team Summary (Mirrored Left to Right) */}
          <div className="flex flex-col items-end text-right min-w-0">
            {t2TopPerformer && (
              <div className="mb-2">
                <span className="text-[10px] font-mono font-bold tracking-widest text-amber-400 uppercase flex items-center justify-end gap-1">
                  <Award className="w-3.5 h-3.5 text-amber-400" /> {t2TopPerformer.role}
                </span>
                <Link
                  href={`/players/${playerSlug(t2TopPerformer.name)}`}
                  className="text-base sm:text-lg md:text-xl font-black text-white hover:text-rose-400 uppercase tracking-tight block truncate mt-0.5"
                >
                  {t2TopPerformer.name}
                </Link>
                <div className="flex items-baseline justify-end gap-1.5 mt-0.5 font-mono">
                  <span className="text-xl sm:text-2xl font-black text-rose-500 tabular-nums">
                    {t2TopPerformer.runs}{t2TopPerformer.notOut ? "*" : ""}
                  </span>
                  <span className="text-xs text-slate-400 font-medium">({t2TopPerformer.balls})</span>
                </div>
                <div className="text-[10px] font-mono text-slate-400 mt-0.5">
                  {t2TopPerformer.fours} FOURS · {t2TopPerformer.sixes} SIXES · SR {t2TopPerformer.sr}
                </div>
                <Link
                  href={`/players/${playerSlug(t2TopPerformer.name)}`}
                  className="inline-flex items-center gap-1 text-[10px] font-mono font-bold text-rose-400 hover:text-white uppercase tracking-wider mt-2 group/btn"
                >
                  <span>VIEW PERFORMANCE</span>
                  <ChevronRight className="w-3 h-3 group-hover/btn:translate-x-0.5 transition-transform" />
                </Link>
              </div>
            )}

            {/* Team 2 Score Readout */}
            <div className="pt-2 border-t border-white/10 flex items-center justify-end gap-3 w-full">
              <div>
                <span className="text-xs font-mono font-bold text-rose-500 uppercase">{team2Code}</span>
                <div className="flex items-baseline justify-end gap-1.5 font-mono">
                  <span className="text-xl sm:text-2xl font-black text-rose-500 tabular-nums leading-none">
                    {t2ScoreStr}
                  </span>
                  <span className="text-[11px] text-slate-400">{t2OversStr}</span>
                </div>
              </div>
              <Link href={`/teams/${teamSlug(team2Name)}`} className="shrink-0 hover:scale-105 transition-transform">
                <TeamLogo team={team2Code} size="w-8 h-8 sm:w-10 sm:h-10" />
              </Link>
            </div>
          </div>

          {/* Cutout Portrait / Silhouette */}
          <div className="relative shrink-0 w-24 h-32 sm:w-28 sm:h-36 md:w-36 md:h-48 flex items-end justify-center">
            {t2TopPerformer && FRANCHISE_CUTOUTS[t2TopPerformer.name.toLowerCase()] ? (
              <img
                src={FRANCHISE_CUTOUTS[t2TopPerformer.name.toLowerCase()]}
                alt={t2TopPerformer.name}
                className="w-full h-full object-contain object-bottom drop-shadow-[0_10px_20px_rgba(0,0,0,0.8)] filter contrast-105"
              />
            ) : t2TopPerformer ? (
              <div className="w-20 h-20 sm:w-24 sm:h-24 md:w-28 md:h-28 rounded-2xl overflow-hidden border-2 shadow-2xl" style={{ borderColor: t2Color }}>
                <PlayerAvatar 
                  name={t2TopPerformer.name} 
                  teamId={team2Name}
                  season={card?.season}
                  strictHistoricalJersey={true}
                  className="w-full h-full object-cover" 
                />
              </div>
            ) : (
              <div className="w-20 h-20 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center">
                <TeamLogo team={team2Code} size="w-12 h-12" />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
