/**
 * Franchise analyst dashboard aggregates.
 *
 * Everything here is computed from the ball-by-ball and match tables. Where a
 * dimension the brief asked for has no source in this dataset it is absent
 * rather than approximated — see NOT_SUPPORTED at the bottom of this file for
 * the list and the reason for each.
 */

import { db, hasDb } from "@workspace/db";
import { sql } from "drizzle-orm";
import { resolveTeamIdsFor, bowlerTypeIdSets, normalizeVenueName, teamShort, readDataJson } from "./stats-aggregator.js";

export interface TeamAnalyticsParams {
  team: string;
  fromSeason?: string | null;
  toSeason?: string | null;
}

const num = (v: any) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};
const pct = (part: number, whole: number) =>
  whole > 0 ? Math.round((part / whole) * 1000) / 10 : 0;
const round2 = (n: number) => Math.round(n * 100) / 100;

/**
 * Current display name for a franchise short code, taken from teams.json so a
 * rival reads as "Punjab Kings" rather than the retired "Kings XI Punjab".
 */
/**
 * Identity key for a franchise.
 *
 * The shared teamShort() folds Deccan Chargers into SRH and every "Gujarat"
 * side into GT, which is right for filtering fixtures by a modern team but
 * wrong here: Deccan was sold and dissolved in 2012 and Sunrisers is a separate
 * franchise, as are Gujarat Lions and Gujarat Titans. Only genuine renames are
 * merged. That function is left alone because team filtering depends on it.
 */
function franchiseKey(name: string): string {
  const t = (name || "").toLowerCase().trim();
  if (t.includes("deccan") || t.includes("chargers")) return "DECCAN";
  if (t.includes("sunrisers") || t.includes("hyderabad")) return "SRH";
  if (t.includes("lions")) return "GL";
  if (t.includes("titans")) return "GT";
  if (t.includes("rising pune") || t.includes("supergiant")) return "RPS";
  if (t.includes("pune warriors")) return "PW";
  if (t.includes("kochi") || t.includes("tuskers")) return "KTK";
  if (t.includes("delhi") || t.includes("daredevils")) return "DC";
  if (t.includes("punjab") || t.includes("kings xi")) return "PBKS";
  if (t.includes("bangalore") || t.includes("bengaluru") || t.includes("challengers")) return "RCB";
  if (t.includes("chennai")) return "CSK";
  if (t.includes("mumbai")) return "MI";
  if (t.includes("kolkata")) return "KKR";
  if (t.includes("rajasthan")) return "RR";
  if (t.includes("lucknow")) return "LSG";
  return t.toUpperCase();
}

let canonicalNameCache: Map<string, string> | null = null;
function canonicalTeamName(code: string, fallback: string): string {
  if (!canonicalNameCache) {
    canonicalNameCache = new Map();
    const rows = readDataJson("teams.json");
    for (const r of (Array.isArray(rows) ? rows : [])) {
      const name = String((r as any)?.team ?? "");
      if (name) canonicalNameCache.set(franchiseKey(name), name);
    }
  }
  return canonicalNameCache.get(code) ?? fallback;
}

/** Inline id list; ids come from our own tables, never from user input. */
const idList = (ids: number[]) => ids.map(n => Number(n)).filter(Number.isFinite).join(",");

export async function getTeamAnalytics(params: TeamAnalyticsParams) {
  if (!hasDb()) return null;

  const teamIds = await resolveTeamIdsFor(params.team);
  if (teamIds.length === 0) return null;
  const ids = idList(teamIds);

  // Season bounds are compared as integers so a slider range behaves naturally.
  const from = params.fromSeason ? parseInt(String(params.fromSeason).replace(/[^0-9]/g, ""), 10) : null;
  const to = params.toSeason ? parseInt(String(params.toSeason).replace(/[^0-9]/g, ""), 10) : null;
  const seasonWhere =
    (Number.isFinite(from as number) ? ` AND CAST(m.season_id AS INTEGER) >= ${from}` : "") +
    (Number.isFinite(to as number) ? ` AND CAST(m.season_id AS INTEGER) <= ${to}` : "");

  const involved = `(m.team1_id IN (${ids}) OR m.team2_id IN (${ids}))${seasonWhere}`;

  /* ---------------- headline record ---------------- */

  const record = (await db.execute(sql.raw(`
    SELECT
      count(*) AS played,
      sum(CASE WHEN m.winner_id IN (${ids}) THEN 1 ELSE 0 END) AS wins,
      sum(CASE WHEN m.winner_id IS NOT NULL AND m.winner_id NOT IN (${ids}) THEN 1 ELSE 0 END) AS losses,
      sum(CASE WHEN m.winner_id IS NULL THEN 1 ELSE 0 END) AS noResult
    FROM matches m WHERE ${involved}
  `))).rows?.[0] as any;

  /* ---------------- toss ---------------- */

  // toss_decision is fully populated (418 bat / 825 field across the league),
  // so this split is real rather than inferred from what happened next.
  const toss = (await db.execute(sql.raw(`
    SELECT
      sum(CASE WHEN m.toss_winner_id IN (${ids}) THEN 1 ELSE 0 END) AS tossWon,
      sum(CASE WHEN m.toss_winner_id IN (${ids}) AND m.winner_id IN (${ids}) THEN 1 ELSE 0 END) AS tossWonMatchWon,
      sum(CASE WHEN m.toss_winner_id NOT IN (${ids}) THEN 1 ELSE 0 END) AS tossLost,
      sum(CASE WHEN m.toss_winner_id NOT IN (${ids}) AND m.winner_id IN (${ids}) THEN 1 ELSE 0 END) AS tossLostMatchWon,
      sum(CASE WHEN m.toss_winner_id IN (${ids}) AND m.toss_decision = 'bat' THEN 1 ELSE 0 END) AS choseBat,
      sum(CASE WHEN m.toss_winner_id IN (${ids}) AND m.toss_decision = 'field' THEN 1 ELSE 0 END) AS choseField
    FROM matches m WHERE ${involved}
  `))).rows?.[0] as any;

  /* ---------------- batting first vs chasing ---------------- */

  const battingOrder = (await db.execute(sql.raw(`
    SELECT
      sum(CASE WHEN i.innings_number = 1 THEN 1 ELSE 0 END) AS batFirst,
      sum(CASE WHEN i.innings_number = 1 AND m.winner_id IN (${ids}) THEN 1 ELSE 0 END) AS batFirstWon,
      sum(CASE WHEN i.innings_number = 2 THEN 1 ELSE 0 END) AS chased,
      sum(CASE WHEN i.innings_number = 2 AND m.winner_id IN (${ids}) THEN 1 ELSE 0 END) AS chasedWon
    FROM innings i
    JOIN matches m ON m.match_id = i.match_id
    WHERE i.batting_team_id IN (${ids}) AND ${involved}
  `))).rows?.[0] as any;

  /* ---------------- phase splits ---------------- */

  // Phase comes from the over number (Powerplay 0-5, Middle 6-14, Death 15-19),
  // which is a real property of the delivery. The delivery_type / scoring_area /
  // pressure_state columns in this table are synthetic and are never read here.
  //
  // Wickets join the dismissals table rather than reading deliveries.wicket_seq
  // or wickets_left: both of those are unpopulated (every row NULL and 10
  // respectively), so counting on them silently returned zero for every phase.
  const phaseSql = (side: "batting" | "bowling") => `
    SELECT
      d.phase AS phase,
      count(*) AS balls,
      sum(d.total_runs) AS runs,
      sum(CASE WHEN d.is_boundary = 1 THEN 1 ELSE 0 END) AS boundaries,
      sum(CASE WHEN d.is_dot_ball = 1 THEN 1 ELSE 0 END) AS dots,
      count(dm.dismissal_id) AS wickets,
      sum(CASE WHEN d.is_wide = 0 AND d.is_noball = 0 THEN 1 ELSE 0 END) AS legalBalls
    FROM deliveries d
    LEFT JOIN dismissals dm ON dm.delivery_id = d.delivery_id
    JOIN innings i ON i.innings_id = d.innings_id
    JOIN matches m ON m.match_id = d.match_id
    WHERE i.${side === "batting" ? "batting_team_id" : "bowling_team_id"} IN (${ids}) AND ${involved}
    GROUP BY d.phase
  `;

  const phaseRow = (rows: any[], phase: string) => {
    const r = rows.find((x: any) => x.phase === phase) ?? {};
    const legal = num(r.legalBalls) || num(r.balls);
    return {
      phase,
      balls: legal,
      runs: num(r.runs),
      runRate: legal > 0 ? round2((num(r.runs) / legal) * 6) : 0,
      boundaryPct: pct(num(r.boundaries), legal),
      dotPct: pct(num(r.dots), legal),
      wickets: num(r.wickets),
    };
  };

  const battingPhaseRows = (await db.execute(sql.raw(phaseSql("batting")))).rows as any[];
  const bowlingPhaseRows = (await db.execute(sql.raw(phaseSql("bowling")))).rows as any[];
  const PHASES = ["Powerplay", "Middle", "Death"];

  /* ---------------- pace vs spin ---------------- */

  // players.bowling_style is empty for every row in this database, so the
  // pace/spin split is driven by the same bio-backed classifier the rest of the
  // app uses rather than by a column that would silently match nothing.
  //
  // The alias is bowler_kind, not kind: dismissals has its own `kind` column,
  // and GROUP BY kind bound to that instead — grouping by dismissal type and
  // reporting pace with zero wickets and spin at a 100% dot rate.
  const { pacerIds, spinnerIds } = await bowlerTypeIdSets();
  const paceList = idList(pacerIds);
  const spinList = idList(spinnerIds);

  const bowlerSplit = paceList && spinList
    ? (await db.execute(sql.raw(`
        SELECT
          CASE WHEN d.bowler_id IN (${spinList}) THEN 'Spin' ELSE 'Pace' END AS bowler_kind,
          sum(CASE WHEN d.is_wide = 0 AND d.is_noball = 0 THEN 1 ELSE 0 END) AS balls,
          sum(d.total_runs) AS runs,
          count(dm.dismissal_id) AS wickets,
          sum(CASE WHEN d.is_dot_ball = 1 THEN 1 ELSE 0 END) AS dots
        FROM deliveries d
        LEFT JOIN dismissals dm ON dm.delivery_id = d.delivery_id
        JOIN innings i ON i.innings_id = d.innings_id
        JOIN matches m ON m.match_id = d.match_id
        WHERE i.bowling_team_id IN (${ids}) AND ${involved}
        GROUP BY bowler_kind
      `))).rows as any[]
    : [];

  /* ---------------- home / away ---------------- */

  // Cricsheet designates team1 as the home side; verified against Chennai,
  // whose team1 fixtures sit overwhelmingly at Chepauk.
  const homeAway = (await db.execute(sql.raw(`
    SELECT
      sum(CASE WHEN m.team1_id IN (${ids}) THEN 1 ELSE 0 END) AS homePlayed,
      sum(CASE WHEN m.team1_id IN (${ids}) AND m.winner_id IN (${ids}) THEN 1 ELSE 0 END) AS homeWon,
      sum(CASE WHEN m.team2_id IN (${ids}) THEN 1 ELSE 0 END) AS awayPlayed,
      sum(CASE WHEN m.team2_id IN (${ids}) AND m.winner_id IN (${ids}) THEN 1 ELSE 0 END) AS awayWon
    FROM matches m WHERE ${involved}
  `))).rows?.[0] as any;

  /* ---------------- day vs night ---------------- */

  // Start times are not in this database; they come from the Wikipedia season
  // pages (scratch/parse-match-times.mjs), which cover 1099 of 1243 fixtures --
  // 2010 publishes no times at all. Matches without a time are left out of this
  // split rather than assumed, and the coverage is reported alongside it.
  const conditions: Record<string, { time: string; isNight: boolean }> =
    readDataJson("match-conditions.json") ?? {};

  const playedRows = (await db.execute(sql.raw(`
    SELECT m.match_id AS matchId,
           CASE WHEN m.winner_id IN (${ids}) THEN 1 ELSE 0 END AS won,
           CASE WHEN m.winner_id IS NULL THEN 1 ELSE 0 END AS noResult
    FROM matches m WHERE ${involved}
  `))).rows as any[];

  const slot = { night: { played: 0, wins: 0 }, day: { played: 0, wins: 0 }, unknown: 0 };
  for (const r of playedRows) {
    const c = conditions[String(r.matchId)];
    if (!c) { slot.unknown++; continue; }
    const bucket = c.isNight ? slot.night : slot.day;
    bucket.played++;
    if (num(r.won) === 1) bucket.wins++;
  }

  /* ---------------- venues ---------------- */

  const venues = (await db.execute(sql.raw(`
    SELECT v.name AS venue,
      count(*) AS played,
      sum(CASE WHEN m.winner_id IN (${ids}) THEN 1 ELSE 0 END) AS wins
    FROM matches m
    JOIN venues v ON v.venue_id = m.venue_id
    WHERE ${involved}
    GROUP BY v.name
    ORDER BY played DESC
  `))).rows as any[];

  /* ---------------- head to head ---------------- */

  const h2h = (await db.execute(sql.raw(`
    SELECT
      CASE WHEN m.team1_id IN (${ids}) THEN t2.name ELSE t1.name END AS opponent,
      count(*) AS played,
      sum(CASE WHEN m.winner_id IN (${ids}) THEN 1 ELSE 0 END) AS wins,
      sum(CASE WHEN m.winner_id IS NOT NULL AND m.winner_id NOT IN (${ids}) THEN 1 ELSE 0 END) AS losses
    FROM matches m
    JOIN teams t1 ON t1.team_id = m.team1_id
    JOIN teams t2 ON t2.team_id = m.team2_id
    WHERE ${involved}
    GROUP BY opponent
    ORDER BY played DESC
  `))).rows as any[];

  /* ---------------- collapses ---------------- */

  // A cluster of three wickets inside fifteen legal deliveries. Computed by
  // walking each innings' wicket balls, so it reflects actual sequences rather
  // than a rate assumed from totals.
  const wicketBalls = (await db.execute(sql.raw(`
    SELECT d.innings_id AS inningsId, d.over_num AS overNum, d.ball_num AS ballNum
    FROM deliveries d
    JOIN dismissals dm ON dm.delivery_id = d.delivery_id
    JOIN innings i ON i.innings_id = d.innings_id
    JOIN matches m ON m.match_id = d.match_id
    WHERE i.batting_team_id IN (${ids}) AND ${involved}
    ORDER BY d.innings_id, d.over_num, d.ball_num
  `))).rows as any[];

  const byInnings = new Map<number, number[]>();
  for (const r of wicketBalls) {
    const abs = num(r.overNum) * 6 + num(r.ballNum);
    const key = num(r.inningsId);
    if (!byInnings.has(key)) byInnings.set(key, []);
    byInnings.get(key)!.push(abs);
  }
  let collapseInnings = 0;
  for (const balls of byInnings.values()) {
    for (let i = 0; i + 2 < balls.length; i++) {
      if (balls[i + 2] - balls[i] <= 15) { collapseInnings++; break; }
    }
  }
  const inningsBatted = num(battingOrder?.batFirst) + num(battingOrder?.chased);

  /* ---------------- captains ---------------- */

  // From "List of Indian Premier League captains". That page is a career-level
  // table -- one row per captain -- so it can say who led a franchise and with
  // what record, but not who captained any individual match. Nothing else here
  // is sliced by captain as a result.
  const captainsFile: any = readDataJson("captains.json") ?? {};
  const canonical = canonicalTeamName(franchiseKey(params.team), params.team);
  const captains = (captainsFile.byFranchise?.[canonical] ?? []).map((c: any) => ({
    player: c.player,
    country: c.country ?? null,
    firstSeason: c.firstSeason ?? null,
    lastSeason: c.lastSeason ?? null,
    matches: num(c.matches),
    won: num(c.won),
    winPct: num(c.winPct),
    titles: num(c.titles),
    // False when the captain also led another club: the source only publishes
    // a combined total, so it is shown as career-wide rather than split.
    exact: c.exact !== false,
    alsoLed: Array.isArray(c.alsoLed) ? c.alsoLed : [],
  })).filter((c: any) => {
    if (from == null && to == null) return true;
    const first = c.firstSeason ?? 0;
    const last = c.lastSeason ?? 9999;
    return !(last < (from ?? 0) || first > (to ?? 9999));
  });

  /* ---------------- assemble ---------------- */

  const played = num(record?.played);
  const wins = num(record?.wins);

  return {
    team: params.team,
    seasonRange: { from: Number.isFinite(from as number) ? from : null, to: Number.isFinite(to as number) ? to : null },
    record: {
      played,
      wins,
      losses: num(record?.losses),
      noResult: num(record?.noResult),
      winPct: pct(wins, played),
    },
    toss: {
      tossWon: num(toss?.tossWon),
      tossWonWinPct: pct(num(toss?.tossWonMatchWon), num(toss?.tossWon)),
      tossLost: num(toss?.tossLost),
      tossLostWinPct: pct(num(toss?.tossLostMatchWon), num(toss?.tossLost)),
      choseBat: num(toss?.choseBat),
      choseField: num(toss?.choseField),
    },
    battingOrder: {
      batFirst: num(battingOrder?.batFirst),
      batFirstWinPct: pct(num(battingOrder?.batFirstWon), num(battingOrder?.batFirst)),
      chased: num(battingOrder?.chased),
      chasedWinPct: pct(num(battingOrder?.chasedWon), num(battingOrder?.chased)),
    },
    battingPhases: PHASES.map(p => phaseRow(battingPhaseRows, p)),
    bowlingPhases: PHASES.map(p => phaseRow(bowlingPhaseRows, p)),
    bowlerSplit: ["Pace", "Spin"].map(kind => {
      const r = bowlerSplit.find((x: any) => x.bowler_kind === kind) ?? {};
      const balls = num(r.balls);
      return {
        kind,
        balls,
        wickets: num(r.wickets),
        economy: balls > 0 ? round2((num(r.runs) / balls) * 6) : 0,
        dotPct: pct(num(r.dots), balls),
      };
    }),
    homeAway: {
      homePlayed: num(homeAway?.homePlayed),
      homeWinPct: pct(num(homeAway?.homeWon), num(homeAway?.homePlayed)),
      awayPlayed: num(homeAway?.awayPlayed),
      awayWinPct: pct(num(homeAway?.awayWon), num(homeAway?.awayPlayed)),
    },
    // One physical ground appears under several spellings (Chepauk is stored
    // both with and without ", Chennai"), so rows are folded onto the canonical
    // name before the win rate is worked out.
    venues: (() => {
      const byName = new Map<string, { venue: string; played: number; wins: number }>();
      for (const v of venues) {
        const name = normalizeVenueName(String(v.venue ?? ""));
        if (!name) continue;
        const acc = byName.get(name) ?? { venue: name, played: 0, wins: 0 };
        acc.played += num(v.played);
        acc.wins += num(v.wins);
        byName.set(name, acc);
      }
      return Array.from(byName.values())
        .map(v => ({ ...v, winPct: pct(v.wins, v.played) }))
        .sort((a, b) => b.played - a.played);
    })(),
    // Renamed franchises share a short code, so Delhi Daredevils and Delhi
    // Capitals fold into one rival instead of appearing as two. The label comes
    // from teams.json — the current franchise list — because picking the
    // longest spelling seen in the fixtures chose the retired names
    // ("Kings XI Punjab" over "Punjab Kings").
    headToHead: (() => {
      const byCode = new Map<string, { opponent: string; played: number; wins: number; losses: number }>();
      for (const h of h2h) {
        const name = String(h.opponent ?? "");
        if (!name) continue;
        const code = franchiseKey(name);
        const acc = byCode.get(code) ?? { opponent: canonicalTeamName(code, name), played: 0, wins: 0, losses: 0 };
        acc.played += num(h.played);
        acc.wins += num(h.wins);
        acc.losses += num(h.losses);
        byCode.set(code, acc);
      }
      return Array.from(byCode.values())
        .map(h => ({ ...h, winPct: pct(h.wins, h.played) }))
        .sort((a, b) => b.played - a.played);
    })(),
    dayNight: {
      nightPlayed: slot.night.played,
      nightWinPct: pct(slot.night.wins, slot.night.played),
      dayPlayed: slot.day.played,
      dayWinPct: pct(slot.day.wins, slot.day.played),
      unknownStartTime: slot.unknown,
    },
    captains,
    collapses: {
      inningsBatted,
      collapseInnings,
      collapsePct: pct(collapseInnings, inningsBatted),
    },
  };
}

/**
 * Dimensions the brief asked for that this dataset cannot support. They are
 * reported to the client so the UI can say so plainly instead of showing a
 * plausible-looking number that is not real.
 */
export const NOT_SUPPORTED = [
  {
    feature: "Per-captain match splits",
    reason: "Captains are published as career totals, not per match, so phase and toss numbers cannot be sliced by who was leading.",
  },
  { feature: "Delivery type / line & length", reason: "Cricsheet does not publish it; the column present here is synthetic." },
];

/**
 * The opponents a player has actually faced, ordered by how much they have met.
 *
 * The matchup tab previously listed every leading batter or bowler in the
 * league, so a reader could pick someone the player had never bowled to and get
 * a screen of zeros — and when a filter emptied the list it fell back to a
 * hardcoded "Jasprit Bumrah". This returns only real pairings, with the volume
 * behind each one so the biggest duels sort to the top.
 *
 * `role` describes the player being viewed: a batter's opponents are bowlers.
 */
export async function getMatchupOpponents(player: string, role: "batter" | "bowler") {
  if (!hasDb()) return null;
  const viewedCol = role === "batter" ? "d.batter_id" : "d.bowler_id";
  const otherCol = role === "batter" ? "d.bowler_id" : "d.batter_id";

  const rows = (await db.execute(sql`
    SELECT
      other.name AS opponent,
      count(*) AS balls,
      sum(d.batter_runs) AS runs,
      count(dm.dismissal_id) AS dismissals
    FROM deliveries d
    JOIN players self ON self.player_id = ${sql.raw(viewedCol)}
    JOIN players other ON other.player_id = ${sql.raw(otherCol)}
    LEFT JOIN dismissals dm
      ON dm.delivery_id = d.delivery_id AND dm.player_out_id = d.batter_id
    WHERE self.name = ${player}
    GROUP BY other.name
    ORDER BY balls DESC
  `)).rows as any[];

  return rows.map(r => {
    const balls = Number(r.balls) || 0;
    const runs = Number(r.runs) || 0;
    return {
      opponent: String(r.opponent),
      balls,
      runs,
      dismissals: Number(r.dismissals) || 0,
      // Strike rate from the batter's point of view either way, so the number
      // means the same thing on both sides of the duel.
      strikeRate: balls > 0 ? Math.round((runs / balls) * 1000) / 10 : 0,
    };
  });
}

/**
 * Ground-level analyst aggregates.
 *
 * Dimensions the brief asked for that have no source here are absent rather
 * than approximated: boundary lengths and a wagon wheel of where shots land
 * (Cricsheet publishes neither, and this table's scoring_area column is
 * synthetic), and the red-vs-black soil track, which is recorded nowhere. Dew
 * is reported as the proxy the data does support -- how second-innings scoring
 * differs between evening and afternoon starts -- and labelled as such.
 */
export async function getVenueAnalytics(params: {
  venue: string;
  fromSeason?: string | null;
  toSeason?: string | null;
  timeOfDay?: "all" | "evening" | "afternoon";
}) {
  if (!hasDb()) return null;

  // A ground is stored under several spellings, so every row that canonicalises
  // to the requested name counts as the same venue.
  const wanted = normalizeVenueName(params.venue).toLowerCase();
  const venueRows = (await db.execute(sql`SELECT venue_id, name FROM venues`)).rows as any[];
  const venueIds = venueRows
    .filter(v => normalizeVenueName(String(v.name ?? "")).toLowerCase() === wanted)
    .map(v => Number(v.venue_id));
  if (venueIds.length === 0) return null;
  const vids = idList(venueIds);

  const from = params.fromSeason ? parseInt(String(params.fromSeason).replace(/[^0-9]/g, ""), 10) : null;
  const to = params.toSeason ? parseInt(String(params.toSeason).replace(/[^0-9]/g, ""), 10) : null;
  const seasonWhere =
    (Number.isFinite(from as number) ? ` AND CAST(m.season_id AS INTEGER) >= ${from}` : "") +
    (Number.isFinite(to as number) ? ` AND CAST(m.season_id AS INTEGER) <= ${to}` : "");

  const conditions: Record<string, { time: string; isNight: boolean }> =
    readDataJson("match-conditions.json") ?? {};
  const slot = params.timeOfDay ?? "all";
  let timeWhere = "";
  if (slot !== "all") {
    const wantNight = slot === "evening";
    const ids = Object.entries(conditions)
      .filter(([, c]) => c.isNight === wantNight)
      .map(([id]) => Number(id))
      .filter(Number.isFinite);
    timeWhere = ids.length > 0 ? ` AND m.match_id IN (${idList(ids)})` : " AND 1 = 0";
  }

  const atVenue = `m.venue_id IN (${vids})${seasonWhere}${timeWhere}`;

  const head = (await db.execute(sql.raw(`
    SELECT count(DISTINCT m.match_id) AS matches, count(DISTINCT m.season_id) AS seasons
    FROM matches m WHERE ${atVenue}
  `))).rows?.[0] as any;

  const inningsRows = (await db.execute(sql.raw(`
    SELECT i.innings_number AS inn, avg(i.runs) AS avgRuns, avg(i.wickets) AS avgWkts
    FROM innings i JOIN matches m ON m.match_id = i.match_id
    WHERE ${atVenue} GROUP BY i.innings_number
  `))).rows as any[];
  const inn = (n: number) => (inningsRows.find((r: any) => Number(r.inn) === n) ?? {}) as any;

  const phaseRows = (await db.execute(sql.raw(`
    SELECT d.phase AS phase,
      sum(CASE WHEN d.is_wide = 0 AND d.is_noball = 0 THEN 1 ELSE 0 END) AS balls,
      sum(d.total_runs) AS runs,
      sum(CASE WHEN d.is_boundary = 1 THEN 1 ELSE 0 END) AS boundaries,
      sum(CASE WHEN d.is_dot_ball = 1 THEN 1 ELSE 0 END) AS dots,
      count(dm.dismissal_id) AS wickets
    FROM deliveries d
    LEFT JOIN dismissals dm ON dm.delivery_id = d.delivery_id
    JOIN matches m ON m.match_id = d.match_id
    WHERE ${atVenue} GROUP BY d.phase
  `))).rows as any[];

  const phaseOf = (name: string) => {
    const r = (phaseRows.find((x: any) => x.phase === name) ?? {}) as any;
    const balls = num(r.balls);
    return {
      phase: name,
      balls,
      runs: num(r.runs),
      runRate: balls > 0 ? round2((num(r.runs) / balls) * 6) : 0,
      boundaryPct: pct(num(r.boundaries), balls),
      dotPct: pct(num(r.dots), balls),
      wickets: num(r.wickets),
    };
  };

  const { spinnerIds } = await bowlerTypeIdSets();
  const spinList = idList(spinnerIds);
  const surfaceRows = spinList
    ? (await db.execute(sql.raw(`
        SELECT CASE WHEN d.bowler_id IN (${spinList}) THEN 'Spin' ELSE 'Pace' END AS bowler_kind,
          sum(CASE WHEN d.is_wide = 0 AND d.is_noball = 0 THEN 1 ELSE 0 END) AS balls,
          sum(d.total_runs) AS runs,
          count(dm.dismissal_id) AS wickets,
          sum(CASE WHEN d.is_dot_ball = 1 THEN 1 ELSE 0 END) AS dots
        FROM deliveries d
        LEFT JOIN dismissals dm ON dm.delivery_id = d.delivery_id
        JOIN matches m ON m.match_id = d.match_id
        WHERE ${atVenue} GROUP BY bowler_kind
      `))).rows as any[]
    : [];

  const splitFor = async (ids: number[]) => {
    if (ids.length === 0) return { first: 0, second: 0, matches: 0 };
    const r = (await db.execute(sql.raw(`
      SELECT avg(CASE WHEN i.innings_number = 1 THEN i.runs END) AS a,
             avg(CASE WHEN i.innings_number = 2 THEN i.runs END) AS b,
             count(DISTINCT m.match_id) AS n
      FROM innings i JOIN matches m ON m.match_id = i.match_id
      WHERE ${atVenue} AND m.match_id IN (${idList(ids)})
    `))).rows?.[0] as any;
    return { first: round2(num(r?.a)), second: round2(num(r?.b)), matches: num(r?.n) };
  };
  const nightIds = Object.entries(conditions).filter(([, c]) => c.isNight).map(([id]) => Number(id));
  const dayIds = Object.entries(conditions).filter(([, c]) => !c.isNight).map(([id]) => Number(id));
  const [evening, afternoon] = await Promise.all([splitFor(nightIds), splitFor(dayIds)]);

  const battersRows = (await db.execute(sql.raw(`
    SELECT p.name AS player, sum(d.batter_runs) AS runs,
      sum(CASE WHEN d.is_wide = 0 AND d.is_noball = 0 THEN 1 ELSE 0 END) AS balls,
      count(DISTINCT m.match_id) AS matches
    FROM deliveries d
    JOIN players p ON p.player_id = d.batter_id
    JOIN matches m ON m.match_id = d.match_id
    WHERE ${atVenue} GROUP BY p.name ORDER BY runs DESC LIMIT 5
  `))).rows as any[];

  const bowlersRows = (await db.execute(sql.raw(`
    SELECT p.name AS player, count(dm.dismissal_id) AS wickets,
      sum(CASE WHEN d.is_wide = 0 AND d.is_noball = 0 THEN 1 ELSE 0 END) AS balls,
      sum(d.total_runs) AS runs, count(DISTINCT m.match_id) AS matches
    FROM deliveries d
    LEFT JOIN dismissals dm ON dm.delivery_id = d.delivery_id
    JOIN players p ON p.player_id = d.bowler_id
    JOIN matches m ON m.match_id = d.match_id
    WHERE ${atVenue} GROUP BY p.name ORDER BY wickets DESC LIMIT 5
  `))).rows as any[];

  // Mean first-innings total at the end of each over, across every first
  // innings played here -- the basis for reading par at a given stage.
  const parRows = (await db.execute(sql.raw(`
    SELECT d.over_num AS overNum, sum(d.total_runs) AS runs,
           count(DISTINCT i.innings_id) AS n
    FROM deliveries d
    JOIN innings i ON i.innings_id = d.innings_id
    JOIN matches m ON m.match_id = d.match_id
    WHERE ${atVenue} AND i.innings_number = 1
    GROUP BY d.over_num ORDER BY d.over_num
  `))).rows as any[];
  let running = 0;
  const parByOver = parRows.map((r: any) => {
    running += num(r.runs) / (num(r.n) || 1);
    return { over: num(r.overNum) + 1, par: Math.round(running) };
  });

  return {
    venue: normalizeVenueName(params.venue),
    seasonRange: { from: Number.isFinite(from as number) ? from : null, to: Number.isFinite(to as number) ? to : null },
    timeOfDay: slot,
    matches: num(head?.matches),
    seasons: num(head?.seasons),
    innings: {
      firstAvg: round2(num(inn(1).avgRuns)),
      firstWkts: round2(num(inn(1).avgWkts)),
      secondAvg: round2(num(inn(2).avgRuns)),
      secondWkts: round2(num(inn(2).avgWkts)),
    },
    phases: ["Powerplay", "Middle", "Death"].map(phaseOf),
    surface: ["Pace", "Spin"].map(kind => {
      const r = (surfaceRows.find((x: any) => x.bowler_kind === kind) ?? {}) as any;
      const balls = num(r.balls);
      const wickets = num(r.wickets);
      return {
        kind,
        balls,
        wickets,
        economy: balls > 0 ? round2((num(r.runs) / balls) * 6) : 0,
        average: wickets > 0 ? round2(num(r.runs) / wickets) : 0,
        strikeRate: wickets > 0 ? round2(balls / wickets) : 0,
        dotPct: pct(num(r.dots), balls),
      };
    }),
    dew: {
      evening,
      afternoon,
      eveningSwing: round2(evening.second - evening.first),
      afternoonSwing: round2(afternoon.second - afternoon.first),
    },
    topBatters: battersRows.map((r: any) => {
      const balls = num(r.balls);
      return {
        player: String(r.player),
        runs: num(r.runs),
        balls,
        matches: num(r.matches),
        strikeRate: balls > 0 ? round2((num(r.runs) / balls) * 100) : 0,
      };
    }),
    topBowlers: bowlersRows.map((r: any) => {
      const balls = num(r.balls);
      const wickets = num(r.wickets);
      return {
        player: String(r.player),
        wickets,
        matches: num(r.matches),
        economy: balls > 0 ? round2((num(r.runs) / balls) * 6) : 0,
        average: wickets > 0 ? round2(num(r.runs) / wickets) : 0,
      };
    }),
    parByOver,
  };
}
