import { queryAll } from "./db";
import {
  playerAttributes, primaryMetricId, ratePlayers, type Discipline, type PhaseKey, type Rating,
} from "./scout-service";
import { recruitmentAvailability } from "./recruitment-availability";

export const scoutingNeeds = {
  opener: { discipline: "batting", phase: "powerplay", roles: ["opener", "top_order"] },
  middle_order: { discipline: "batting", phase: "middle", roles: ["middle_order"] },
  finisher: { discipline: "batting", phase: "death", roles: ["finisher", "middle_order"] },
  powerplay_bowler: { discipline: "bowling", phase: "powerplay" },
  middle_overs_bowler: { discipline: "bowling", phase: "middle" },
  death_bowler: { discipline: "bowling", phase: "death" },
} satisfies Record<string, { discipline: Discipline; phase: PhaseKey; roles?: string[] }>;

export function t20Coverage() {
  return queryAll<{ code: string; name: string; format: string; matches: number; through: string }>(
    `SELECT c.code, c.name, c.format, COUNT(m.match_id) matches, MAX(m.start_date) through
     FROM competitions c JOIN matches m USING (competition_id)
     WHERE c.format IN ('T20', 'T20I')
     GROUP BY c.competition_id ORDER BY c.format DESC, c.name`,
  );
}

export function latestIplTeams() {
  return queryAll<{ id: number; name: string; season: string }>(
    `SELECT DISTINCT t.team_id id, t.name, a.season_label season
     FROM agg_appearances a JOIN teams t USING (team_id) JOIN competitions c ON c.competition_id = a.competition_id
     WHERE c.code = 'ipl' AND a.season_label = (
       SELECT season_label FROM seasons WHERE competition_id = c.competition_id
       ORDER BY season_year DESC, start_date DESC LIMIT 1
     )
     ORDER BY t.name`,
  );
}

function phaseEvidence(row: Rating) {
  const metric = row.metrics[primaryMetricId(row.discipline)];
  return {
    competition: row.competition, seasons: row.seasons, phase: row.phase, discipline: row.discipline,
    balls: row.balls, matches: row.matches,
    count: row.discipline === "batting" ? row.counts.runs : row.counts.wickets,
    value: metric?.value ?? null, baseline: metric?.league ?? null,
    index: metric?.shrunk ?? null, partialSeasons: row.partialSeasons,
  };
}

export function playerT20Evidence(playerKey: number) {
  const competitions = t20Coverage();
  const rows = (["batting", "bowling"] as const).flatMap(discipline =>
    (["all", "powerplay", "middle", "death"] as const).flatMap(phase =>
      ratePlayers({ discipline, phase, competitions: competitions.map(c => c.code),
        playerKeys: [playerKey], percentiles: false }),
    ),
  );
  return { competitions, evidence: rows.filter(row => row.balls > 0).map(phaseEvidence) };
}

export function teamT20Suggestions(
  team: ReturnType<typeof latestIplTeams>[number],
  need: keyof typeof scoutingNeeds,
  competitions: string[],
  recentSeasons: number,
  retentions: Parameters<typeof recruitmentAvailability>[1],
) {
  const target: (typeof scoutingNeeds)[keyof typeof scoutingNeeds] & { roles?: string[] } = scoutingNeeds[need];
  const teamPlayers = new Set(queryAll<{ player_key: number }>(
    "SELECT player_key FROM agg_appearances WHERE team_id = ? AND season_label = ?", team.id, team.season,
  ).map(row => row.player_key));
  const { discipline, phase, roles } = target;
  const ratings = ratePlayers({ competitions, discipline, phase, roles, recentSeasons, minBalls: 120, percentiles: false });
  const grouped = new Map<number, { name: string; id: string; score: number; balls: number; evidence: ReturnType<typeof phaseEvidence>[] }>();
  for (const row of ratings) {
    if (!row.cricsheet_id || teamPlayers.has(row.player_key) || row.balls <= 0) continue;
    const evidence = phaseEvidence(row);
    if (evidence.index == null || !Number.isFinite(evidence.index)) continue;
    // Shrunk rates already pull smaller samples toward 100 within each competition.
    const adjustment = discipline === "batting" ? evidence.index - 100 : 100 - evidence.index;
    const candidate = grouped.get(row.player_key) ?? {
      name: row.name, id: row.cricsheet_id, score: 0, balls: 0, evidence: [],
    };
    candidate.score += adjustment * row.balls;
    candidate.balls += row.balls;
    candidate.evidence.push(evidence);
    grouped.set(row.player_key, candidate);
  }

  const ranked = [...grouped.entries()]
    .filter(([, candidate]) => candidate.balls >= 120)
    .map(([playerKey, candidate]) => ({ playerKey, ...candidate, score: candidate.score / candidate.balls }))
    .filter(candidate => candidate.score > 0)
    .sort((a, b) => b.score - a.score || b.balls - a.balls || a.name.localeCompare(b.name));

  const shortlist: typeof ranked = [];
  for (const candidate of ranked) {
    const availability = recruitmentAvailability({
      name: candidate.name,
      teams: [],
      verifiedAttributes: playerAttributes(candidate.playerKey),
    }, retentions);
    if (availability.excluded) continue;
    shortlist.push({ ...candidate, evidence: candidate.evidence.sort((a, b) => b.balls - a.balls) });
    if (shortlist.length === 10) break;
  }
  return shortlist;
}
