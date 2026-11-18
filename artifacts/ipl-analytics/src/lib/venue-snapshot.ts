import type { VenueAnalytics } from "./aggregates";

export interface VenueSnapshot {
  version: 1;
  venue: string;
  city: string | null;
  source: string;
  matches: Array<{
    id: string; season: number; time: "evening" | "afternoon" | null;
    innings: Array<[number, number, number]>;
    phases: Array<[string, number, number, number, number, number]>;
    surface: Array<[string, number, number, number, number]>;
    batters: Array<[string, number, number]>;
    bowlers: Array<[string, number, number, number]>;
    overs: Array<[number, number]>;
  }>;
}
export interface VenueFilters {
  from?: number | null; to?: number | null;
  timeOfDay?: "all" | "evening" | "afternoon";
}
const mean = (values: number[]) => values.length ? values.reduce((a, b) => a + b, 0) / values.length : null;
const divide = (a: number, b: number, multiplier = 1) => b ? a / b * multiplier : null;

/** Filter match-level sufficient statistics, then calculate rates from summed counts. */
export function aggregateVenueSnapshot(snapshot: VenueSnapshot, opts: VenueFilters = {}): VenueAnalytics {
  if (snapshot.version !== 1 || !Array.isArray(snapshot.matches)) throw new Error("Unsupported venue snapshot");
  const time = opts.timeOfDay ?? "all";
  const games = snapshot.matches.filter(m =>
    (opts.from == null || m.season >= opts.from) &&
    (opts.to == null || m.season <= opts.to) &&
    (time === "all" || m.time === time));
  const innings = (n: number) => games.flatMap(m => m.innings.filter(i => i[0] === n));
  const first = innings(1), second = innings(2);
  const phases = new Map<string, number[]>(), surface = new Map<string, number[]>();
  const bats = new Map<string, { runs: number; balls: number; matches: number }>();
  const bowls = new Map<string, { wickets: number; balls: number; runs: number; matches: number }>();
  const overs = new Map<number, number[]>();
  const sum = (map: Map<string, number[]>, key: string, values: number[]) => {
    const total = map.get(key) ?? values.map(() => 0);
    values.forEach((v, i) => total[i] += v); map.set(key, total);
  };
  for (const m of games) {
    m.phases.forEach(([key, ...values]) => sum(phases, key, values));
    m.surface.forEach(([key, ...values]) => sum(surface, key, values));
    for (const [player, runs, balls] of m.batters) {
      const p = bats.get(player) ?? { runs: 0, balls: 0, matches: 0 };
      p.runs += runs; p.balls += balls; p.matches++; bats.set(player, p);
    }
    for (const [player, wickets, balls, runs] of m.bowlers) {
      const p = bowls.get(player) ?? { wickets: 0, balls: 0, runs: 0, matches: 0 };
      p.wickets += wickets; p.balls += balls; p.runs += runs; p.matches++; bowls.set(player, p);
    }
    for (const [over, runs] of m.overs) {
      const values = overs.get(over) ?? []; values.push(runs); overs.set(over, values);
    }
  }
  const shift = (slot: "evening" | "afternoon") => {
    // Only paired innings with a known start time contribute to this comparison.
    const pairs = games.filter(m => m.time === slot).flatMap(m => {
      const a = m.innings.find(i => i[0] === 1), b = m.innings.find(i => i[0] === 2);
      return a && b ? [[a[1], b[1]]] : [];
    });
    return { first: mean(pairs.map(p => p[0])), second: mean(pairs.map(p => p[1])), matches: pairs.length };
  };
  const evening = shift("evening"), afternoon = shift("afternoon");
  const swing = (s: typeof evening) => s.first == null || s.second == null ? null : s.second - s.first;
  const order = ["powerplay", "middle", "death"];
  return {
    venue: snapshot.venue, seasonRange: { from: opts.from ?? null, to: opts.to ?? null }, timeOfDay: time,
    matches: games.length, seasons: new Set(games.map(m => m.season)).size,
    innings: { firstAvg: mean(first.map(i => i[1])), firstWkts: mean(first.map(i => i[2])),
      secondAvg: mean(second.map(i => i[1])), secondWkts: mean(second.map(i => i[2])) },
    phases: [...phases].filter(([, v]) => v[0] > 0).sort(([a], [b]) => order.indexOf(a.toLowerCase()) - order.indexOf(b.toLowerCase()))
      .map(([phase, [balls, runs, boundaries, dots, wickets]]) => ({
        phase, balls, runs, wickets, runRate: runs / balls * 6, boundaryPct: boundaries / balls * 100, dotPct: dots / balls * 100,
      })),
    surface: [...surface].filter(([, v]) => v[0] > 0).map(([kind, [balls, runs, wickets, dots]]) => ({
      kind, balls, wickets, economy: runs / balls * 6, average: divide(runs, wickets), strikeRate: divide(balls, wickets), dotPct: dots / balls * 100,
    })),
    dew: { evening, afternoon, eveningSwing: swing(evening), afternoonSwing: swing(afternoon) },
    topBatters: [...bats].filter(([, p]) => p.balls > 0).map(([player, p]) => ({
      player, ...p, strikeRate: p.runs / p.balls * 100,
    })).sort((a, b) => b.runs - a.runs || a.player.localeCompare(b.player)),
    topBowlers: [...bowls].filter(([, p]) => p.balls > 0).map(([player, p]) => ({
      player, wickets: p.wickets, matches: p.matches, economy: p.runs / p.balls * 6, average: divide(p.runs, p.wickets),
    })).sort((a, b) => b.wickets - a.wickets || a.player.localeCompare(b.player)),
    parByOver: [...overs].sort(([a], [b]) => a - b).map(([over, values]) => ({ over, par: mean(values)! })),
  };
}
