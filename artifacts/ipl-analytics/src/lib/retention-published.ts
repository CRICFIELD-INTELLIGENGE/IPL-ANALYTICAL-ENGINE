import publishedRelease from "@/data/retention-2027-published.json";
import type { OfficialPlayer, OfficialRoom, RetentionSource } from "./retention-official-api";

interface PublishedRelease {
  version: string; season: number; announcedOn: string; reviewedAt: string;
  sources: Record<string, RetentionSource>;
  identities: Record<string, { canonicalId: string | null; role: string | null; country: string | null; overseas: boolean | null; bowlingStyle: string | null }>;
  teams: { team: string; retained: string[]; released: string[]; contracts: Record<string, number>; traded: string[]; purseLakh: number; capDebitLakh: number; overseas: number; notes: string[] }[];
  notes: string[];
}
const release = publishedRelease as unknown as PublishedRelease;

export const PUBLISHED_RETENTION_VERSION = release.version;
export const publishedRetentionSources = Object.values(release.sources) as RetentionSource[];

function roleGroup(role: string | null | undefined, style: string | null | undefined) {
  const r = (role ?? "").toLowerCase();
  if (/keeper|^wk$/.test(r)) return "wicketkeeper";
  if (/all/.test(r)) return "all-rounder";
  if (/bat/.test(r)) return "batter";
  if (/spin|break|orthodox|slow/i.test(style ?? "")) return "spin";
  if (/pace|fast|medium/i.test(style ?? "")) return "pace";
  return /bowl/.test(r) ? "bowler" : "unknown";
}

/** Published squad facts are available even if the historical analytics API is offline.
 * API records may enrich statistics, but cannot override the current official roster or salary.
 */
export function publishedOfficialRoom(team: string, previous?: OfficialRoom | null): OfficialRoom {
  const code = team.toUpperCase();
  const record = release.teams.find((item) => item.team === code);
  if (!record) throw new Error("Unknown franchise");
  const identities = release.identities as Record<string, { canonicalId: string | null; role: string | null; country: string | null; overseas: boolean | null; bowlingStyle: string | null }>;
  const contracts = record.contracts as Record<string, number>;
  const sources = publishedRetentionSources;
  const findPrior = (name: string) => previous?.players.find((p) =>
    p.name === name || Boolean(identities[name]?.canonicalId && p.canonicalId === identities[name].canonicalId));
  const makePlayer = (name: string, decision: "retained" | "released"): OfficialPlayer => {
    const identity = identities[name];
    const prior = findPrior(name);
    const traded = decision === "retained" && record.traded.includes(name);
    const status = traded ? "traded_in" : decision;
    return {
      id: identity?.canonicalId ?? prior?.id ?? `unresolved:${name}`,
      canonicalId: identity?.canonicalId ?? prior?.canonicalId ?? null,
      name, team: code, decision: status, verification: "verified",
      identityStatus: identity?.canonicalId ? "matched" : "unresolved",
      announcedOn: release.announcedOn,
      sources: decision === "released" ? [release.sources.releasedPdf] : [release.sources.iplt20, release.sources.retainedPdf],
      role: identity?.role ?? prior?.role ?? null,
      group: prior?.group && prior.group !== "unknown" ? prior.group : roleGroup(identity?.role, identity?.bowlingStyle),
      country: identity?.country ?? prior?.country ?? null,
      overseas: identity?.overseas ?? prior?.overseas ?? null,
      contractLakh: decision === "retained" ? contracts[name] ?? null : null,
      contractStatus: decision === "retained" && contracts[name] != null ? "official_retention" : "unavailable",
      historicalContractLakh: prior?.historicalContractLakh ?? null,
      trade: traded ? (prior?.trade ? { ...prior.trade, feeLakh: contracts[name] ?? prior.trade.feeLakh } : null) : null,
      availability: prior?.availability ?? { status: "unknown", note: "Retention does not guarantee match availability.", verification: "unavailable", sources: [] },
      performance: prior?.performance ?? null,
      scoutUrl: `/pressurelab?player=${encodeURIComponent(name)}`,
      auctionEligibility: decision === "retained" ? "retained" : prior?.auctionEligibility ?? "unverified",
    };
  };
  const players = [
    ...record.retained.map((name) => makePlayer(name, "retained")),
    ...record.released.map((name) => makePlayer(name, "released")),
    ...(previous?.players.filter((p) => p.decision === "traded_out" && !record.retained.includes(p.name) && !record.released.includes(p.name)) ?? []),
  ];
  const squad = players.filter((p) => ["retained", "traded_in"].includes(p.decision));
  const composition = ["batter", "wicketkeeper", "all-rounder", "pace", "spin", "bowler", "unknown"].map((key) => ({ key, count: squad.filter((p) => p.group === key).length }));
  const outgoing = players.filter((p) => ["released", "traded_out"].includes(p.decision));
  const needs = composition.filter((group) => outgoing.some((p) => p.group === group.key)).map((group) => {
    const lost = outgoing.filter((p) => p.group === group.key);
    return {
      role: group.key, remaining: group.count, departures: lost.length, priority: group.count === 0 ? "high" : "review",
      evidence: lost.map((p) => ({ name: p.name, decision: p.decision, verification: p.verification })),
      scoutUrl: `/pressurelab?team=${code}&role=${encodeURIComponent(group.key)}`,
      note: `${lost.length} departures; ${group.count} retained players in this role. Recruitment priority is CricField analysis.`,
    };
  });
  const purse: OfficialRoom["purse"] = {
    valueLakh: record.purseLakh, status: "verified",
    claims: [{ valueLakh: record.purseLakh, source: release.sources.iplt20 }], hasDisagreement: false,
  };
  return {
    season: release.season, team: code, version: release.version,
    announcedOn: release.announcedOn, reviewedAt: release.reviewedAt, status: "verified",
    players, composition,
    summary: {
      retained: record.retained.length, released: record.released.length,
      tradedIn: squad.filter((p) => p.decision === "traded_in").length,
      tradedOut: players.filter((p) => p.decision === "traded_out").length,
      indian: record.retained.length - record.overseas, overseas: record.overseas, unknownNationality: squad.filter((p) => p.overseas == null).length,
      slots: 25 - record.retained.length, overseasSlots: 8 - record.overseas, reportedOverseasSlots: 8 - record.overseas,
      slotBasis: "IPLT20 2027 published retention summary; squad cap 25, overseas cap 8.",
      verifiedDecisions: players.filter((p) => p.verification === "verified").length,
    },
    purse, needs, sources, notes: [...record.notes, ...release.notes],
    auction: {
      canInitialize: previous?.auction.canInitialize ?? false, purseLakh: record.purseLakh,
      retainedIds: squad.flatMap((p) => p.canonicalId ? [p.canonicalId] : []),
      registeredPool: previous?.auction.registeredPool ?? [],
      note: "Retention and auction registration are different records. Released players are not assumed registered.",
    },
  };
}

export function publishedOfficialLeague() {
  return {
    season: release.season, version: release.version,
    announcedOn: release.announcedOn, reviewedAt: release.reviewedAt,
    teams: release.teams.map(({ team }) => {
      const { status, summary, purse } = publishedOfficialRoom(team);
      return { team, status, summary, purse };
    }),
  };
}
