import React from "react";
import { Link } from "wouter";
import { TeamLogo } from "@/components/team-logo";
import {
  teamShort,
  venueSlug,
  normalizeVenueName,
  playerSlug,
  type MatchSummary,
} from "@/lib/aggregates";
import { MapPin, Trophy, Award, Play, Users, ChevronRight } from "lucide-react";

export interface TeamTheme {
  primary: string;
  accent: string;
  glow: string;
  border: string;
  badgeBg: string;
  button: string;
}

export const TEAM_THEMES: Record<string, TeamTheme> = {
  SRH: {
    primary: "#f95700", // Sunrisers Orange
    accent: "#ff8a00",
    glow: "rgba(249, 87, 0, 0.35)",
    border: "border-orange-500/40",
    badgeBg: "bg-orange-500/20 text-orange-400",
    button: "bg-gradient-to-r from-orange-500 to-amber-500 text-white",
  },
  CSK: {
    primary: "#facc15", // Super Kings Canary Yellow
    accent: "#f59e0b",
    glow: "rgba(250, 204, 21, 0.35)",
    border: "border-yellow-400/40",
    badgeBg: "bg-yellow-400/20 text-yellow-300",
    button: "bg-gradient-to-r from-yellow-400 to-amber-500 text-black",
  },
  RCB: {
    primary: "#f43f5e", // Royal Challengers Crimson
    accent: "#fb7185",
    glow: "rgba(244, 63, 94, 0.4)",
    border: "border-rose-500/40",
    badgeBg: "bg-rose-500/20 text-rose-400",
    button: "bg-gradient-to-r from-[#ff0055] via-[#ff2244] to-[#ff6600] text-white",
  },
  MI: {
    primary: "#0ea5e9", // Mumbai Sky/Electric Blue
    accent: "#38bdf8",
    glow: "rgba(14, 165, 233, 0.35)",
    border: "border-sky-500/40",
    badgeBg: "bg-sky-500/20 text-sky-400",
    button: "bg-gradient-to-r from-sky-500 to-blue-600 text-white",
  },
  KKR: {
    primary: "#8b5cf6", // Knight Riders Royal Purple
    accent: "#f59e0b",
    glow: "rgba(139, 92, 246, 0.35)",
    border: "border-purple-500/40",
    badgeBg: "bg-purple-500/20 text-purple-300",
    button: "bg-gradient-to-r from-purple-600 to-indigo-600 text-white",
  },
  RR: {
    primary: "#ec4899", // Royals Pink
    accent: "#2563eb",
    glow: "rgba(236, 72, 153, 0.35)",
    border: "border-pink-500/40",
    badgeBg: "bg-pink-500/20 text-pink-400",
    button: "bg-gradient-to-r from-pink-500 to-rose-600 text-white",
  },
  GT: {
    primary: "#14b8a6", // Titans Teal
    accent: "#0f766e",
    glow: "rgba(20, 184, 166, 0.35)",
    border: "border-teal-500/40",
    badgeBg: "bg-teal-500/20 text-teal-300",
    button: "bg-gradient-to-r from-teal-500 to-emerald-600 text-white",
  },
  LSG: {
    primary: "#06b6d4", // Super Giants Cyan
    accent: "#f97316",
    glow: "rgba(6, 182, 212, 0.35)",
    border: "border-cyan-500/40",
    badgeBg: "bg-cyan-500/20 text-cyan-300",
    button: "bg-gradient-to-r from-cyan-500 to-blue-600 text-white",
  },
  PBKS: {
    primary: "#ef4444", // Kings Red & Silver
    accent: "#cbd5e1",
    glow: "rgba(239, 68, 68, 0.35)",
    border: "border-red-500/40",
    badgeBg: "bg-red-500/20 text-red-400",
    button: "bg-gradient-to-r from-red-600 to-rose-600 text-white",
  },
  DC: {
    primary: "#3b82f6", // Capitals Royal Blue & Red
    accent: "#ef4444",
    glow: "rgba(59, 130, 246, 0.35)",
    border: "border-blue-500/40",
    badgeBg: "bg-blue-500/20 text-blue-300",
    button: "bg-gradient-to-r from-blue-600 to-cyan-600 text-white",
  },
};

/** Helper to generate standard URL slug for a team */
const teamSlug = (team?: string | null): string =>
  (team || "").toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

export interface FixtureTicketCardProps {
  match: MatchSummary;
}

/** Formats score lines into clean score (runs/wkts) and overs e.g. "155/8" and "(20.0)" */
function parseScore(scoreStr?: string | null): { runsWkts: string | null; overs: string | null } {
  if (!scoreStr) return { runsWkts: null, overs: null };
  const str = scoreStr.trim();
  const m = str.match(/^([0-9]+\/?[0-9]*)\s*(\([0-9.]+\))?$/);
  if (m) {
    return {
      runsWkts: m[1],
      overs: m[2] || null,
    };
  }
  return { runsWkts: str, overs: null };
}

export function FixtureTicketCard({ match }: FixtureTicketCardProps) {
  const homeCode = teamShort(match.team1);
  const awayCode = teamShort(match.team2);
  const winnerCode = match.winner ? teamShort(match.winner) : null;

  // Active theme driven by winner (if completed) or home team
  const activeCode = winnerCode || homeCode;
  const theme = TEAM_THEMES[activeCode] || TEAM_THEMES[homeCode] || TEAM_THEMES.SRH;

  const t1Slug = teamSlug(match.team1);
  const t2Slug = teamSlug(match.team2);
  const vSlug = venueSlug(match.venue);
  const canonicalVenue = normalizeVenueName(match.venue);

  const matchDate = new Date(match.date);
  const month = isNaN(matchDate.getTime())
    ? "IPL"
    : matchDate.toLocaleDateString("en-IN", { month: "short" }).toUpperCase();
  const day = isNaN(matchDate.getTime())
    ? `#${match.id}`
    : matchDate.toLocaleDateString("en-IN", { day: "2-digit" });
  const weekday = isNaN(matchDate.getTime())
    ? match.season
    : matchDate.toLocaleDateString("en-IN", { weekday: "short" }).toUpperCase();

  const isT1Winner = !!match.winner && (match.winner === match.team1 || match.winner.includes(match.team1));
  const isT2Winner = !!match.winner && (match.winner === match.team2 || match.winner.includes(match.team2));

  const t1Theme = TEAM_THEMES[homeCode] || theme;
  const t2Theme = TEAM_THEMES[awayCode] || theme;

  const t1ScoreParsed = parseScore(match.team1Score);
  const t2ScoreParsed = parseScore(match.team2Score);

  return (
    <div className="relative w-full max-w-4xl mx-auto my-2 group">
      {/* Outer franchise ambient glow ring */}
      <div
        className="absolute -inset-1 rounded-3xl blur-xl opacity-20 pointer-events-none transition-opacity duration-300 group-hover:opacity-35"
        style={{ backgroundColor: theme.primary }}
      />

      {/* 
        Ticket Shell with Perforated Fish-Tail Cutout Notches:
        - Symmetrical circular ticket notch cutouts on top and bottom border boundaries
        - Sleek compact padding and structured depth 
      */}
      <div
        className="relative w-full rounded-2xl bg-[#090d16]/95 border border-white/10 backdrop-blur-xl shadow-2xl p-4 sm:p-5 grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_minmax(0,1.7fr)_minmax(0,1.15fr)] gap-4 md:gap-0 items-center transition-all duration-300 hover:border-white/20"
        style={{
          boxShadow: `0 8px 32px -8px rgba(0,0,0,0.8), 0 0 20px -6px ${theme.glow}`,
        }}
      >
        {/* ─── TICKET PERFORATION FISH/NOTCH CUTOUTS (Desktop & Mobile) ─── */}
        {/* Notch at Divider 1 (Top & Bottom) */}
        <div className="hidden md:block absolute top-0 left-[30.5%] -translate-x-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-[#050816] border-b border-white/15 z-20 pointer-events-none" />
        <div className="hidden md:block absolute bottom-0 left-[30.5%] -translate-x-1/2 translate-y-1/2 w-5 h-5 rounded-full bg-[#050816] border-t border-white/15 z-20 pointer-events-none" />

        {/* Notch at Divider 2 (Top & Bottom) */}
        <div className="hidden md:block absolute top-0 left-[73.5%] -translate-x-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-[#050816] border-b border-white/15 z-20 pointer-events-none" />
        <div className="hidden md:block absolute bottom-0 left-[73.5%] -translate-x-1/2 translate-y-1/2 w-5 h-5 rounded-full bg-[#050816] border-t border-white/15 z-20 pointer-events-none" />

        {/* Left & Right Edge Ticket Crimp/Fish-tails */}
        <div className="hidden md:block absolute left-0 top-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-7 rounded-r-full bg-[#050816] border-r border-y border-white/15 z-20 pointer-events-none" />
        <div className="hidden md:block absolute right-0 top-1/2 translate-x-1/2 -translate-y-1/2 w-4 h-7 rounded-l-full bg-[#050816] border-l border-y border-white/15 z-20 pointer-events-none" />

        {/* ═══════════════════════════════════════════════════════════
            LEFT SECTION: Date Stub & Team 1
            ═══════════════════════════════════════════════════════════ */}
        <div className="flex flex-col items-start justify-center min-w-0 pr-0 md:pr-4 md:border-r border-white/10 relative">
          {/* Month */}
          <span className="font-mono text-[11px] uppercase tracking-widest text-slate-400 font-bold leading-tight">
            {month}
          </span>

          {/* Large Day Number & Weekday */}
          <div className="flex items-baseline gap-1.5 mt-0.5">
            <span className="text-3xl sm:text-4xl font-black text-white tracking-tight leading-none tabular-nums">
              {day}
            </span>
            <span className="font-mono text-[11px] uppercase tracking-wider text-slate-400 font-semibold">
              {weekday}
            </span>
          </div>

          {/* Team 1 Full Name */}
          <Link
            href={`/teams/${t1Slug}`}
            className="text-xs sm:text-sm font-semibold text-slate-200 mt-2 truncate max-w-full hover:text-white transition-colors"
            title={`View ${match.team1} profile`}
          >
            {match.team1}
          </Link>

          {/* Team 1 Score (Cyan) & Overs */}
          <div className="flex items-baseline gap-1 mt-0.5 flex-nowrap min-w-0">
            {t1ScoreParsed.runsWkts ? (
              <>
                <span className="font-mono text-lg sm:text-xl font-black text-cyan-400 tabular-nums leading-none tracking-tight">
                  {t1ScoreParsed.runsWkts}
                </span>
                {t1ScoreParsed.overs && (
                  <span className="font-mono text-[11px] sm:text-xs text-slate-400 font-normal leading-none tabular-nums">
                    {t1ScoreParsed.overs}
                  </span>
                )}
              </>
            ) : (
              <span className="font-mono text-[10px] text-slate-500 font-semibold uppercase tracking-wider">
                Upcoming
              </span>
            )}
          </div>

          {/* Match # Pill Chip */}
          <div className="mt-2.5">
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[9px] font-mono font-bold tracking-wider uppercase border border-rose-500/30 bg-rose-500/10 text-rose-300">
              MATCH #{match.id}
            </span>
          </div>

          {/* Match Time & Green Status Dot */}
          <div className="flex items-center gap-1.5 mt-2 font-mono text-[11px] text-slate-300">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.9)] animate-pulse shrink-0" />
            <span className="tabular-nums font-semibold">07:30 PM IST</span>
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════════
            CENTER SECTION: Clash, Result, POTM & Venue
            ═══════════════════════════════════════════════════════════ */}
        <div className="flex flex-col items-center justify-center min-w-0 px-0 md:px-4 pt-3 md:pt-0 border-t md:border-t-0 border-white/10 md:border-r relative">
          {/* Matchup Clash Tiles */}
          <div className="flex items-center justify-center gap-3 sm:gap-4 w-full">
            {/* Team 1 Code & Logo */}
            <div className="flex flex-col items-center min-w-0">
              <span
                className={`font-mono text-xs sm:text-sm font-black tracking-wider uppercase mb-1.5 ${
                  isT1Winner ? "" : "text-white"
                }`}
                style={isT1Winner ? { color: t1Theme.primary } : undefined}
              >
                {homeCode}
              </span>
              <Link
                href={`/teams/${t1Slug}`}
                className={`w-14 h-14 sm:w-16 sm:h-16 rounded-xl flex items-center justify-center p-1.5 transition-all duration-300 hover:scale-105 shrink-0 ${
                  isT1Winner
                    ? "border-2 bg-slate-900/80"
                    : "border border-white/10 bg-[#0d1424]/80 shadow-md"
                }`}
                style={
                  isT1Winner
                    ? {
                        borderColor: t1Theme.primary,
                        boxShadow: `0 0 16px ${t1Theme.glow}`,
                      }
                    : undefined
                }
                title={match.team1}
              >
                <TeamLogo team={match.team1} size="w-10 h-10 sm:w-11 sm:h-11" />
              </Link>
            </div>

            {/* Symmetrical VS Divider */}
            <div className="flex flex-col items-center justify-center px-1 shrink-0 mt-5">
              <span className="text-[10px] font-mono font-bold text-slate-400 tracking-widest uppercase">
                VS
              </span>
              <div className="w-5 h-[1px] bg-slate-700/80 mt-1" />
            </div>

            {/* Team 2 Code & Logo */}
            <div className="flex flex-col items-center min-w-0">
              <span
                className={`font-mono text-xs sm:text-sm font-black tracking-wider uppercase mb-1.5 ${
                  isT2Winner ? "" : "text-white"
                }`}
                style={isT2Winner ? { color: t2Theme.primary } : undefined}
              >
                {awayCode}
              </span>
              <Link
                href={`/teams/${t2Slug}`}
                className={`w-14 h-14 sm:w-16 sm:h-16 rounded-xl flex items-center justify-center p-1.5 transition-all duration-300 hover:scale-105 shrink-0 ${
                  isT2Winner
                    ? "border-2 bg-slate-900/80"
                    : "border border-white/10 bg-[#0d1424]/80 shadow-md"
                }`}
                style={
                  isT2Winner
                    ? {
                        borderColor: t2Theme.primary,
                        boxShadow: `0 0 16px ${t2Theme.glow}`,
                      }
                    : undefined
                }
                title={match.team2}
              >
                <TeamLogo team={match.team2} size="w-10 h-10 sm:w-11 sm:h-11" />
              </Link>
            </div>
          </div>

          {/* Outcome / Result Banner */}
          <div className="w-full mt-3 pt-2.5 border-t border-white/5 flex flex-col items-center gap-1.5">
            {match.winner || match.margin ? (
              <div className="flex items-center justify-center gap-1.5 text-xs font-black uppercase tracking-tight text-center max-w-full">
                <Trophy
                  className="w-3.5 h-3.5 shrink-0"
                  style={{ color: theme.primary }}
                />
                <span className="truncate">
                  {match.winner ? (
                    <>
                      <span style={{ color: theme.primary }}>{teamShort(match.winner)}</span>{" "}
                      <span className="text-white">WON BY {match.margin}</span>
                    </>
                  ) : match.margin === "tie" ? (
                    <span className="text-amber-400">MATCH TIED · SUPER OVER</span>
                  ) : (
                    <span className="text-slate-300">{match.margin}</span>
                  )}
                </span>
              </div>
            ) : (
              <div className="text-[11px] font-mono font-bold uppercase tracking-wider text-slate-400">
                SCHEDULED MATCH
              </div>
            )}

            {/* POTM */}
            {match.mom ? (
              <div className="flex items-center justify-center gap-1.5 font-mono text-[11px] text-slate-300 max-w-full truncate">
                <Award className="w-3 h-3 text-cyan-400 shrink-0" />
                <span className="text-slate-400 font-medium">POTM:</span>
                <Link
                  href={`/players/${playerSlug(match.mom)}`}
                  className="font-bold text-cyan-400 hover:text-cyan-300 hover:underline truncate transition-colors"
                  title={`View ${match.mom} profile`}
                >
                  {match.mom}
                </Link>
              </div>
            ) : null}

            {/* Venue */}
            <Link
              href={`/venues/${vSlug}`}
              className="flex items-center justify-center gap-1.5 text-[11px] text-slate-400 hover:text-cyan-300 transition-colors max-w-full group/vlink text-center"
              title={`View Venue Profile: ${canonicalVenue}`}
            >
              <MapPin className="w-3 h-3 text-slate-500 group-hover/vlink:text-cyan-400 transition-colors shrink-0" />
              <span className="truncate font-medium">{canonicalVenue}</span>
            </Link>
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════════
            RIGHT SECTION: Team 2 Stub & Actions
            ═══════════════════════════════════════════════════════════ */}
        <div className="flex flex-col items-start md:items-start justify-center min-w-0 pl-0 md:pl-4 pt-3 md:pt-0 border-t md:border-t-0 border-white/10 relative">
          {/* Team 2 Code */}
          <Link
            href={`/teams/${t2Slug}`}
            className="font-mono text-xl sm:text-2xl font-black uppercase tracking-tight leading-none hover:opacity-90 transition-opacity"
            style={{ color: isT2Winner ? t2Theme.primary : "#ffffff" }}
            title={`View ${match.team2} profile`}
          >
            {awayCode}
          </Link>

          {/* Team 2 Full Name */}
          <Link
            href={`/teams/${t2Slug}`}
            className="text-xs sm:text-sm text-slate-300 font-medium truncate max-w-full mt-1 hover:text-white transition-colors"
            title={`View ${match.team2} profile`}
          >
            {match.team2}
          </Link>

          {/* Team 2 Score (Emerald if won/available) & Overs */}
          <div className="flex items-baseline gap-1 mt-0.5 flex-nowrap min-w-0">
            {t2ScoreParsed.runsWkts ? (
              <>
                <span
                  className={`font-mono text-lg sm:text-xl font-black tabular-nums leading-none tracking-tight ${
                    isT2Winner ? "text-emerald-400" : "text-slate-200"
                  }`}
                >
                  {t2ScoreParsed.runsWkts}
                </span>
                {t2ScoreParsed.overs && (
                  <span className="font-mono text-[11px] sm:text-xs text-slate-400 font-normal leading-none tabular-nums">
                    {t2ScoreParsed.overs}
                  </span>
                )}
              </>
            ) : (
              <span className="font-mono text-[10px] text-slate-500 font-semibold uppercase tracking-wider">
                Upcoming
              </span>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col gap-2 w-full mt-3">
            {/* Primary Action Button: MATCH CENTER > */}
            <Link
              href={`/match/${match.id}`}
              className={`w-full py-2 px-3 rounded-xl text-[11px] font-mono font-black uppercase tracking-wider shadow-md transition-all duration-200 hover:brightness-110 active:scale-[0.98] flex items-center justify-center gap-1.5 ${
                theme.button
              }`}
            >
              <Play className="w-3 h-3 fill-current shrink-0" />
              <span>MATCH CENTER</span>
              <ChevronRight className="w-3 h-3 stroke-[3] shrink-0" />
            </Link>

            {/* Secondary Action Button: Dossier & Squads > */}
            <Link
              href={`/match/${match.id}`}
              className="w-full py-1.5 px-3 rounded-xl text-[11px] font-mono font-bold text-slate-200 bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 hover:border-white/20 transition-all active:scale-[0.98] flex items-center justify-center gap-1.5"
            >
              <Users className="w-3 h-3 text-slate-400 shrink-0" />
              <span>Dossier & Squads</span>
              <ChevronRight className="w-3 h-3 text-slate-400 shrink-0" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
