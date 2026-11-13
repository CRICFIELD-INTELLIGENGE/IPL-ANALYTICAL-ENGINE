import type {
  PlayerBio,
  PlayerSeasonStats,
  SquadPlayer,
  SquadsBySeason,
} from "./aggregates";

export const HUB_TEAMS = [
  "RCB",
  "CSK",
  "MI",
  "KKR",
  "SRH",
  "RR",
  "DC",
  "PBKS",
  "GT",
  "LSG",
] as const;
export type HubTeam = (typeof HUB_TEAMS)[number];
export type Decision = "undecided" | "retain" | "release" | "trade";
export type Role =
  | "batter"
  | "bowler"
  | "all-rounder"
  | "wicketkeeper"
  | "unknown";
export interface OfficialPlayer {
  name: string;
  role: string | null;
  country: string | null;
  overseas: boolean;
  keeper: boolean;
}
export interface OfficialSquads {
  source: string;
  retrievedAt: string;
  seasons: Record<string, Record<string, OfficialPlayer[]>>;
}
export interface HubPlayer {
  id: string;
  name: string;
  statsName: string | null;
  role: Role;
  country: string | null;
  overseas: boolean | null;
  batStyle: string | null;
  bowlStyle: string | null;
  historicalFee: string | null;
}
export interface HubEvent {
  id: string;
  title: string;
  date: string | null;
  status: "confirmed" | "reported" | "provisional";
  sourceUrl: string | null;
  lastVerified: string;
  note: string;
}
const REPORT =
  "https://www.business-standard.com/amp/sports/business/ipl-2027-auction-december-16-goa-retention-deadline-november-15-126102601223_1.html";
export const HUB_EVENTS: HubEvent[] = [
  {
    id: "retention",
    title: "Retention deadline",
    date: "2026-11-17",
    status: "reported",
    sourceUrl: "https://www.cricinfo.com/story/ipl-2027-retention-deadline-moved-to-november-17-1561149",
    lastVerified: "2026-11-04",
    note: "Reported as moved from 15 to 17 November; no confirming IPL/BCCI announcement located in this verification.",
  },
  {
    id: "announcements",
    title: "Official retention announcements",
    date: null,
    status: "provisional",
    sourceUrl: null,
    lastVerified: "2026-10-27",
    note: "Awaiting a verified announcement and franchise lists.",
  },
  {
    id: "registration",
    title: "Auction registration updates",
    date: null,
    status: "provisional",
    sourceUrl: null,
    lastVerified: "2026-10-27",
    note: "No verified 2027 registration list loaded.",
  },
  {
    id: "auction",
    title: "Auction",
    date: "2026-12-16",
    status: "reported",
    sourceUrl: REPORT,
    lastVerified: "2026-10-27",
    note: "Reported date; not displayed as an officially confirmed schedule.",
  },
  {
    id: "results",
    title: "Auction results",
    date: null,
    status: "provisional",
    sourceUrl: null,
    lastVerified: "2026-10-27",
    note: "Results unavailable. Scenario decisions are not transactions.",
  },
  {
    id: "completion",
    title: "Squad completion",
    date: null,
    status: "provisional",
    sourceUrl: null,
    lastVerified: "2026-10-27",
    note: "Cannot verify completion before official 2027 squads and rules are loaded.",
  },
];
export const keyOf = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
export function roleOf(role?: string | null): Role {
  const r = (role ?? "").toLowerCase();
  if (/keeper/.test(r)) return "wicketkeeper";
  if (/all.?round/.test(r)) return "all-rounder";
  if (/bowl/.test(r)) return "bowler";
  if (/bat/.test(r)) return "batter";
  return "unknown";
}

/** Exact recorded aliases only. Never merge two players using a surname initial. */
export function buildRoster(
  team: string,
  squads: SquadsBySeason,
  official: OfficialSquads | undefined,
  bios: Record<string, PlayerBio>,
  season = "2026",
): HubPlayer[] {
  const base = squads[season]?.[team] ?? [];
  const listed = official?.seasons[season]?.[team];
  const bioIndex = new Map<string, PlayerBio>();
  for (const [id, bio] of Object.entries(bios))
    for (const alias of [id, bio.playerName, bio.fullName])
      if (alias) bioIndex.set(keyOf(alias), bio);
  const squadIndex = new Map<string, SquadPlayer>();
  for (const p of base)
    for (const alias of [p.name, p.cricsheetName])
      if (alias) squadIndex.set(keyOf(alias), p);
  const seen = new Set<string>();
  return (listed ?? base).flatMap((p) => {
    const row = squadIndex.get(keyOf(p.name));
    const bio =
      bioIndex.get(keyOf(row?.cricsheetName ?? "")) ??
      bioIndex.get(keyOf(p.name));
    const statsName = row?.cricsheetName ?? bio?.playerName ?? null;
    const id = keyOf(statsName ?? p.name);
    if (seen.has(id)) return [];
    seen.add(id);
    const country = p.country ?? bio?.country ?? null;
    return [
      {
        id,
        name: p.name,
        statsName,
        role:
          "keeper" in p && p.keeper
            ? "wicketkeeper"
            : roleOf(p.role ?? bio?.role),
        country,
        overseas: country ? country.toLowerCase() !== "india" : null,
        batStyle: bio?.batStyle || null,
        bowlStyle: bio?.bowlStyle || null,
        historicalFee: row?.priceDisplay ?? null,
      },
    ];
  });
}

export const DEFAULT_TARGETS = {
  batter: 5,
  bowler: 6,
  "all-rounder": 3,
  wicketkeeper: 2,
};
export type RoleTargets = typeof DEFAULT_TARGETS;
export function squadGaps(
  players: HubPlayer[],
  targets: RoleTargets = DEFAULT_TARGETS,
) {
  return (Object.keys(targets) as Array<keyof RoleTargets>)
    .map((role) => {
      const count = players.filter((p) => p.role === role).length;
      return {
        role,
        count,
        target: targets[role],
        missing: Math.max(0, targets[role] - count),
        reason: `${count} listed ${role} options against a planning target of ${targets[role]}. These are editable analytical targets, not IPL rules.`,
      };
    })
    .sort(
      (a, b) =>
        b.missing - a.missing || a.count / a.target - b.count / b.target,
    );
}
const historyIndexes = new WeakMap<
  PlayerSeasonStats,
  {
    batting: Map<string, PlayerSeasonStats["batters"]>;
    bowling: Map<string, PlayerSeasonStats["bowlers"]>;
  }
>();
export function playerHistory(player: HubPlayer, stats: PlayerSeasonStats) {
  let index = historyIndexes.get(stats);
  if (!index) {
    index = { batting: new Map(), bowling: new Map() };
    for (const row of stats.batters) {
      const key = keyOf(row.player);
      if (!index.batting.has(key)) index.batting.set(key, []);
      index.batting.get(key)!.push(row);
    }
    for (const row of stats.bowlers) {
      const key = keyOf(row.player);
      if (!index.bowling.has(key)) index.bowling.set(key, []);
      index.bowling.get(key)!.push(row);
    }
    historyIndexes.set(stats, index);
  }
  const aliases = new Set([
    keyOf(player.statsName ?? ""),
    keyOf(player.name),
    player.id,
  ]);
  return {
    batting: [
      ...new Set([...aliases].flatMap((a) => index!.batting.get(a) ?? [])),
    ].sort((a, b) => Number(b.season) - Number(a.season)),
    bowling: [
      ...new Set([...aliases].flatMap((a) => index!.bowling.get(a) ?? [])),
    ].sort((a, b) => Number(b.season) - Number(a.season)),
  };
}
export interface ModelConfig {
  minBatBalls: number;
  minBowlBalls: number;
  performance: number;
  consistency: number;
  scarcity: number;
  replacement: number;
}
export const DEFAULT_MODEL: ModelConfig = {
  minBatBalls: 120,
  minBowlBalls: 60,
  performance: 50,
  consistency: 20,
  scarcity: 20,
  replacement: 10,
};
const mean = (a: number[]) =>
  a.length ? a.reduce((s, v) => s + v, 0) / a.length : 0;
const percentile = (v: number, cohort: number[], higher: boolean) =>
  cohort.length < 3
    ? null
    : (100 * cohort.filter((x) => (higher ? x <= v : x >= v)).length) /
      cohort.length;
export function retentionModel(
  player: HubPlayer,
  roster: HubPlayer[],
  stats: PlayerSeasonStats,
  alternatives: HubPlayer[],
  config = DEFAULT_MODEL,
  targets = DEFAULT_TARGETS,
) {
  const history = playerHistory(player, stats);
  const bat = history.batting.filter(
    (p) =>
      Number(p.season) >= 2024 &&
      Number(p.season) <= 2026 &&
      p.balls >= config.minBatBalls,
  );
  const bowl = history.bowling.filter(
    (p) =>
      Number(p.season) >= 2024 &&
      Number(p.season) <= 2026 &&
      p.balls >= config.minBowlBalls,
  );
  const discipline = player.role === "bowler" ? "bowling" : "batting";
  const batCohort = stats.batters.filter(
    (p) => p.season === bat[0]?.season && p.balls >= config.minBatBalls,
  );
  const bowlCohort = stats.bowlers.filter(
    (p) => p.season === bowl[0]?.season && p.balls >= config.minBowlBalls,
  );
  const battingRank = bat[0]
    ? percentile(
        bat[0].sr,
        batCohort.map((p) => p.sr),
        true,
      )
    : null;
  const bowlingRank = bowl[0]
    ? percentile(
        bowl[0].econ,
        bowlCohort.map((p) => p.econ),
        false,
      )
    : null;
  const contributions =
    player.role === "all-rounder"
      ? [battingRank, bowlingRank].filter((v): v is number => v != null)
      : [discipline === "bowling" ? bowlingRank : battingRank].filter(
          (v): v is number => v != null,
        );
  const performance = contributions.length ? mean(contributions) : null;
  const series =
    discipline === "bowling" ? bowl.map((p) => p.econ) : bat.map((p) => p.sr);
  const consistency =
    series.length >= 2 && mean(series) > 0
      ? Math.max(
          0,
          100 *
            (1 -
              Math.sqrt(mean(series.map((v) => (v - mean(series)) ** 2))) /
                mean(series)),
        )
      : null;
  const count = roster.filter((p) => p.role === player.role).length;
  const target = targets[player.role as keyof RoleTargets];
  const scarcity = target
    ? Math.min(100, (100 * target) / Math.max(1, count))
    : null;
  const replacements = alternatives
    .filter(
      (p) =>
        p.role === player.role &&
        p.id !== player.id &&
        !roster.some((r) => r.id === p.id),
    )
    .filter((p) => {
      const h = playerHistory(p, stats);
      return player.role === "bowler"
        ? h.bowling.some(
            (r) => Number(r.season) >= 2024 && r.balls >= config.minBowlBalls,
          )
        : h.batting.some(
            (r) => Number(r.season) >= 2024 && r.balls >= config.minBatBalls,
          );
    });
  const factors = [
    {
      label: "Recent performance",
      value: performance,
      weight: config.performance,
      note: "Latest qualifying 2024–2026 season: SR percentile for batters, inverse economy percentile for bowlers; all-rounders average the available disciplines. Cohort: IPL player-season records in that season.",
    },
    {
      label: "Historical consistency",
      value: consistency,
      weight: config.consistency,
      note: "100 × (1 − coefficient of variation), clamped at zero; at least two qualifying seasons. Measures stable rates, not quality.",
    },
    {
      label: "Role scarcity",
      value: scarcity,
      weight: config.scarcity,
      note: "100 × min(1, planning target / options in this role). Unknown roles excluded.",
    },
    {
      label: "Replacement scarcity",
      value: 100 / (1 + replacements.length),
      weight: config.replacement,
      note: "100 / (1 + qualifying same-role players outside this squad). Historical comparison options, not confirmed auction entrants.",
    },
  ];
  const available = factors.filter((f) => f.value != null && f.weight > 0);
  const denominator = available.reduce((s, f) => s + f.weight, 0);
  const score =
    performance == null || !denominator
      ? null
      : Math.round(
          available.reduce((s, f) => s + f.value! * f.weight, 0) / denominator,
        );
  return {
    score,
    factors,
    replacements,
    history,
    recommendation:
      score == null
        ? "Insufficient performance sample"
        : score >= 65
          ? "Review for retention"
          : score >= 40
            ? "Compare alternatives"
            : "Review release scenario",
  };
}

export interface RetentionScenario {
  version: 1;
  team: HubTeam;
  savedAt: string;
  decisions: Record<string, Decision>;
}
export function parseScenario(
  raw: string | null,
  team: HubTeam,
  roster: HubPlayer[],
): RetentionScenario | null {
  try {
    const s = JSON.parse(raw ?? "null");
    if (
      !s ||
      s.version !== 1 ||
      s.team !== team ||
      typeof s.savedAt !== "string" ||
      !Number.isFinite(Date.parse(s.savedAt)) ||
      !s.decisions ||
      typeof s.decisions !== "object" ||
      Array.isArray(s.decisions)
    )
      return null;
    const decisions: Record<string, Decision> = {};
    for (const [id, value] of Object.entries(s.decisions)) {
      if (
        !roster.some((p) => p.id === id) ||
        !["retain", "release", "trade", "undecided"].includes(String(value))
      )
        continue;
      decisions[id] = value as Decision;
    }
    return { version: 1, team, savedAt: s.savedAt, decisions };
  } catch {
    return null;
  }
}
