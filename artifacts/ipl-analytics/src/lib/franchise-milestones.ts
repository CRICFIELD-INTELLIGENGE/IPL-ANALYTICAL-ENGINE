import { resolveTeamCode, type TeamCode } from "./team-context";
import type { MatchSummary } from "./aggregates";
import type { FranchiseRecord } from "./dugout-api";

export type MilestoneKind = "champion" | "finalist" | "record" | "first";
export interface FranchiseMilestone {
  id: string;
  kind: MilestoneKind;
  value: string;
  label: string;
  title: string;
  description: string;
  season?: string;
  match?: MatchSummary;
  stats: { label: string; value: string }[];
}

/** Derive milestones from recorded results, without treating missing seasons as played. */
export function buildFranchiseMilestones(code: TeamCode, record: FranchiseRecord | undefined, matches: MatchSummary[]): FranchiseMilestone[] {
  const own = matches.filter(m => resolveTeamCode(m.team1) === code || resolveTeamCode(m.team2) === code)
    .sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id));
  const seasons = [...(record?.seasons ?? [])].filter(s => s.played > 0).sort((a, b) => Number(a.season) - Number(b.season));
  const moments: FranchiseMilestone[] = [];
  const first = own[0];
  const debut = seasons[0]?.season ?? first?.season;
  if (debut) moments.push({ id: "debut", kind: "first", value: debut, label: "THE FIRST CHAPTER", title: "A new name. A new beginning.", description: `The franchise’s first IPL campaign on record began in ${debut}. Every season, rivalry and landmark that followed starts with this chapter.`, season: debut, match: own.find(m => m.season === debut), stats: [{ label: "First recorded season", value: debut }, ...(seasons[0] ? [{ label: "Matches that season", value: String(seasons[0].played) }] : [])] });

  for (const s of seasons.filter(s => s.champion || s.runnerUp)) {
    const match = own.filter(m => m.season === s.season).at(-1);
    const opponent = match ? resolveTeamCode(match.team1) === code ? match.team2 : match.team1 : null;
    moments.push({ id: `final-${s.season}`, kind: s.champion ? "champion" : "finalist", value: s.season,
      label: s.champion ? "CHAMPIONSHIP CHAPTER" : "THE ROAD TO THE FINAL",
      title: s.champion ? `${s.season} IPL Champions` : `${s.season} IPL Finalists`,
      description: s.champion ? `A campaign that ended with the trophy. ${s.won} wins from ${s.played} matches carried ${record?.franchise.name ?? code} to the ${s.season} IPL title.${opponent ? ` The campaign concluded against ${opponent}.` : ""}` : `${record?.franchise.name ?? code} reached the ${s.season} IPL final after a campaign of ${s.won} wins from ${s.played} matches.${opponent ? ` The final chapter came against ${opponent}.` : ""}`,
      season: s.season, match, stats: [{ label: "Season wins", value: String(s.won) }, { label: "Matches", value: String(s.played) }, { label: "Finish", value: s.champion ? "Champions" : "Runners-up" }],
    });
  }

  const firstWin = own.find(m => resolveTeamCode(m.winner) === code);
  if (firstWin) moments.push({ id: "first-win", kind: "first", value: firstWin.season, label: "THE FIRST VICTORY", title: "The first win on record.", description: `The first recorded IPL victory for ${record?.franchise.name ?? code} came on ${new Date(firstWin.date).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Calcutta" })}.${firstWin.margin ? ` Winning margin: ${firstWin.margin}.` : ""}`, season: firstWin.season, match: firstWin, stats: [{ label: "Result", value: "Victory" }, { label: "Season", value: firstWin.season }] });

  const totals = own.flatMap(m => {
    const score = resolveTeamCode(m.team1) === code ? m.team1Score : m.team2Score;
    const parsed = score?.match(/^\s*(\d+)\s*\/\s*(\d+)/);
    return parsed ? [{ match: m, runs: Number(parsed[1]), wickets: Number(parsed[2]), score: `${parsed[1]}/${parsed[2]}` }] : [];
  }).sort((a, b) => b.runs - a.runs || a.match.date.localeCompare(b.match.date));
  const high = totals[0];
  if (high) {
    const opponent = resolveTeamCode(high.match.team1) === code ? high.match.team2 : high.match.team1;
    moments.push({ id: "highest-total", kind: "record", value: high.score, label: "THE BATTING HIGH-WATER MARK", title: "The highest team total on record.", description: `${high.score} against ${opponent} in ${high.match.season}: the franchise’s highest team total in the available match archive. Open the scorecard to relive the innings.`, season: high.match.season, match: high.match, stats: [{ label: "Runs", value: String(high.runs) }, { label: "Wickets", value: String(high.wickets) }, { label: "Season", value: high.match.season }] });
  }

  const best = [...seasons].sort((a, b) => b.won - a.won || Number(a.season) - Number(b.season))[0];
  if (best) moments.push({ id: "most-season-wins", kind: "record", value: String(best.won), label: "A SEASON OF WINNING", title: "Most wins in a recorded campaign.", description: `${best.won} victories from ${best.played} matches in ${best.season}. This is the franchise’s highest win count in a single recorded IPL season.${seasons.filter(s => s.won === best.won).length > 1 ? " This mark is shared by more than one campaign; the earliest is shown." : ""}`, season: best.season, match: own.filter(m => m.season === best.season).at(-1), stats: [{ label: "Season", value: best.season }, { label: "Wins", value: String(best.won) }, { label: "Played", value: String(best.played) }] });

  if (record?.overall.played) moments.push({ id: "legacy", kind: "record", value: String(record.overall.won), label: "THE LEGACY SO FAR", title: "Every victory adds another chapter.", description: `${record.overall.won} wins across ${record.overall.played} recorded IPL appearances, from ${record.firstSeason} to ${record.lastSeason}. A story built one match at a time.`, season: record.lastSeason ?? undefined, stats: [{ label: "Recorded wins", value: String(record.overall.won) }, { label: "Matches", value: String(record.overall.played) }, { label: "IPL titles", value: String(record.titles.count) }] });
  return moments;
}
