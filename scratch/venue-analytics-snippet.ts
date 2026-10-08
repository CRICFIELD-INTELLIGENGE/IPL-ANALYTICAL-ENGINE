
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
