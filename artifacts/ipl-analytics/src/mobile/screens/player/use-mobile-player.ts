// Shared state & verified data hook for the Mobile Player Dossier.
// Preserves exact identity/slug resolution and deterministic analytics from desktop CRICFIELD.
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  displayPlayerName,
  isMatchingTeam,
  isSamePlayerName,
  normalizePlayerName,
  normalizeVenueName,
  resolvePlayerImage,
  selectPlayerRows,
  teamColor,
  teamShort,
  useCaptains,
  useMatches,
  usePlayerBios,
  usePlayerCareerStats,
  usePlayerDisplayNames,
  usePlayerImages,
  usePlayerLatestTeamResolver,
  usePlayerSeasonStats,
  useSquadsBySeason,
  useTeams,
  useTopBatters,
  useTopBowlers,
  type BatterRow,
  type BowlerRow,
} from "@/lib/aggregates";
import { resolvePlayerKey, resolveProfileName } from "@/lib/player-key";
import { usePlayerIdentityIndex, usePlayerRecentMatches } from "@/lib/player-recent-matches";
import { useLensPlayer } from "@/lib/batter-lens-data";
import { getV2Index } from "@/lib/editorial-v2";
import type { IndexEntry } from "@/data/editorial/schema";
import { PUBLIC_MANIFEST, isLocalPreviewable, isPublishable } from "@/lib/editorial-images";
import { computePressureReliability, type Snapshot } from "../../../../../api-server/src/services/pressure/engine";
import type { EditorialImage } from "@/data/editorial-images/types";

export type SeasonTimelineRow = {
  season: string;
  bat?: BatterRow & { season: string };
  bowl?: BowlerRow & { season: string };
};

export type PlayerMilestone = {
  id: string;
  season: string;
  callout: string;
  title: string;
  kicker: string;
  description: string;
  category: "records" | "matches" | "chapters";
  matchId?: string;
  opponent?: string;
  venue?: string;
  photo?: EditorialImage;
  stats: { label: string; value: string }[];
};

let hubPressureSnapshotPromise: Promise<Snapshot> | null = null;
function loadHubPressureSnapshot(): Promise<Snapshot> {
  hubPressureSnapshotPromise ??= fetch(`${import.meta.env.BASE_URL}data/pressure-reliability.json`).then((r) => {
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return r.json() as Promise<Snapshot>;
  });
  hubPressureSnapshotPromise.catch(() => {
    hubPressureSnapshotPromise = null;
  });
  return hubPressureSnapshotPromise;
}

const FRANCHISE_LABELS: Record<string, string> = {
  CSK: "Chennai Super Kings",
  MI: "Mumbai Indians",
  KKR: "Kolkata Knight Riders",
  RCB: "Royal Challengers Bengaluru",
  RR: "Rajasthan Royals",
  DC: "Delhi Capitals",
  PBKS: "Punjab Kings",
  SRH: "Sunrisers Hyderabad",
  DEC: "Deccan Chargers",
  GT: "Gujarat Titans",
  GL: "Gujarat Lions",
  LSG: "Lucknow Super Giants",
  RPS: "Rising Pune Supergiant",
  PW: "Pune Warriors",
  KTK: "Kochi Tuskers Kerala",
};

const normClean = (v?: string | null) => (v || "").toLowerCase().replace(/[^a-z0-9]/g, "");

export function useMobilePlayer(slug: string) {
  const bios = usePlayerBios();
  const identity = usePlayerIdentityIndex();
  const career = usePlayerCareerStats();
  const seasons = usePlayerSeasonStats();
  const images = usePlayerImages();
  const displayNames = usePlayerDisplayNames();
  const latestTeamResolver = usePlayerLatestTeamResolver();
  const captainsData = useCaptains();
  const squadsBySeason = useSquadsBySeason();
  const topBatters = useTopBatters();
  const topBowlers = useTopBowlers();
  const teamsData = useTeams();
  const matchesQuery = useMatches();

  const jerseysQuery = useQuery<Record<string, string>>({
    queryKey: ["player-jerseys-map"],
    queryFn: async () => {
      const res = await fetch(`${import.meta.env.BASE_URL}data/player-jerseys.json`);
      if (!res.ok) return {};
      return res.json();
    },
    staleTime: 1000 * 60 * 60,
  });

  const key = useMemo(
    () => (bios.data && !identity.isLoading ? resolvePlayerKey(bios.data, slug, identity.data) : null),
    [bios.data, slug, identity.isLoading, identity.data],
  );
  const bio = key ? bios.data?.[key] : undefined;
  const displayName = useMemo(
    () => (bio ? resolveProfileName(bio, key, displayNames, identity.data) : ""),
    [bio, key, displayNames, identity.data],
  );

  const rawRecentMatches = usePlayerRecentMatches(key);
  // Resolve historical franchise rename mismatches (e.g. "Royal Challengers Bangalore" vs "Royal Challengers Bengaluru")
  // using canonical matches.json winners + isMatchingTeam()
  const recentMatches = useMemo(() => {
    if (!rawRecentMatches.length) return rawRecentMatches;
    const byId = new Map<string, any>();
    for (const gm of matchesQuery.data ?? []) {
      byId.set(String(gm.id), gm);
    }
    if (byId.size === 0) return rawRecentMatches;
    return rawRecentMatches.map((m) => {
      const gm = byId.get(String(m.matchId));
      if (!gm) return m;
      const resolvedResult = !gm.winner
        ? m.result
        : isMatchingTeam(gm.winner, m.team)
          ? "Won"
          : "Lost";
      return resolvedResult === m.result ? m : { ...m, result: resolvedResult };
    });
  }, [rawRecentMatches, matchesQuery.data]);

  const bat = useMemo(() => {
    if (!bio || !career.data) return undefined;
    const careerHit = selectPlayerRows(career.data.batters, bio.playerName, bio.fullName)[0];
    const topHit = topBatters.data ? selectPlayerRows(topBatters.data.runs, bio.playerName, bio.fullName)[0] : undefined;
    if (!careerHit && !topHit) return undefined;
    return { ...(topHit ?? {}), ...(careerHit ?? {}) } as BatterRow;
  }, [bio, career.data, topBatters.data]);

  const bowl = useMemo(() => {
    if (!bio || !career.data) return undefined;
    const careerHit = selectPlayerRows(career.data.bowlers, bio.playerName, bio.fullName)[0];
    const topHit = topBowlers.data ? selectPlayerRows(topBowlers.data.wickets, bio.playerName, bio.fullName)[0] : undefined;
    if (!careerHit && !topHit) return undefined;
    return { ...(topHit ?? {}), ...(careerHit ?? {}) } as BowlerRow;
  }, [bio, career.data, topBowlers.data]);

  const timeline = useMemo<SeasonTimelineRow[]>(() => {
    if (!bio || !seasons.data) return [];
    const b = selectPlayerRows(seasons.data.batters as (BatterRow & { season: string })[], bio.playerName, bio.fullName);
    const w = selectPlayerRows(seasons.data.bowlers as (BowlerRow & { season: string })[], bio.playerName, bio.fullName);
    const yrs = [...new Set([...b, ...w].map((r) => String(r.season)))].sort();
    return yrs.map((y) => ({
      season: y,
      bat: b.find((r) => String(r.season) === y),
      bowl: w.find((r) => String(r.season) === y),
    }));
  }, [bio, seasons.data]);

  const squadHistory = useMemo(() => {
    if (!bio || !squadsBySeason.data) return [];
    const rows: {
      season: string;
      team: string;
      priceLakh: number | null;
      priceDisplay: string | null;
      acquisition: string | null;
      country: string | null;
    }[] = [];
    for (const [season, teams] of Object.entries(squadsBySeason.data)) {
      for (const [team, players] of Object.entries(teams)) {
        for (const p of players) {
          const matched = [p.cricsheetName, p.name]
            .filter(Boolean)
            .some((n) => [bio.playerName, bio.fullName].filter(Boolean).some((k) => isSamePlayerName(n!, k!)));
          if (!matched) continue;
          rows.push({
            season,
            team,
            priceLakh: p.priceLakh ?? null,
            priceDisplay: p.priceDisplay ?? null,
            acquisition: p.acquisition ?? null,
            country: p.country ?? null,
          });
        }
      }
    }
    return rows.sort((a, b) => a.season.localeCompare(b.season));
  }, [bio, squadsBySeason.data]);

  // Verified team identity for the Hero & Collectible Card (independent of global navbar theme)
  const primaryTeam = useMemo(() => {
    if (recentMatches.length > 0 && recentMatches[0]?.team) return String(recentMatches[0].team);
    if (squadHistory.length > 0) return squadHistory[squadHistory.length - 1].team;
    if (bio) {
      const fromResolver = latestTeamResolver(bio.playerName) ?? latestTeamResolver(displayName);
      if (fromResolver) return fromResolver;
    }
    return "IPL";
  }, [recentMatches, squadHistory, bio, latestTeamResolver, displayName]);

  const teamAccent = teamColor(primaryTeam);
  const teamCode = teamShort(primaryTeam);
  const photo = bio ? resolvePlayerImage(bio.playerName, images.data, bio) : undefined;

  const isBowler = Boolean(bowl && (!bat || bowl.wickets * 20 > bat.runs));
  const isAllRounder = Boolean(bat && bowl && bat.runs >= 300 && bowl.wickets >= 15);

  const resolvedCountry = useMemo(() => {
    if (bio?.country?.trim()) return bio.country;
    const fromSquad = squadHistory.find((r) => r.country?.trim())?.country;
    return fromSquad || null;
  }, [bio, squadHistory]);

  const iplDebut = useMemo(() => {
    const yrs = timeline.map((t) => parseInt(t.season.replace(/\D/g, ""), 10)).filter(Number.isFinite);
    return yrs.length ? String(Math.min(...yrs)) : null;
  }, [timeline]);

  const jerseyNo = useMemo(() => {
    if (!bio) return "04";
    const map = jerseysQuery.data || {};
    const keys = [bio.playerName, bio.fullName, slug]
      .filter(Boolean)
      .map((s) => String(s).toLowerCase().trim());
    for (const k of keys) {
      if (map[k]) return map[k];
    }
    const idDigits = parseInt(String(bio.playerId || "").replace(/\D/g, ""), 10);
    return idDigits > 0 && idDigits < 100 ? String(idDigits).padStart(2, "0") : "07";
  }, [bio, jerseysQuery.data, slug]);

  const captaincy = useMemo(() => {
    if (!bio || !captainsData.data?.captains) return null;
    const wanted = [displayName, bio.playerName, bio.fullName].map(normalizePlayerName).filter(Boolean);
    return captainsData.data.captains.find((c) => wanted.includes(normalizePlayerName(c.player))) ?? null;
  }, [bio, displayName, captainsData.data]);

  // BatterLens ball-by-ball dataset
  const lens = useLensPlayer([bio?.playerName, bio?.fullName, displayName]);

  // Pressure Reliability telemetry (API -> static warehouse snapshot)
  const roleKey = isBowler ? "bowling" : "batting";
  const pressureQuery = useQuery({
    queryKey: ["mobile-player-pressure", roleKey],
    enabled: Boolean(bio),
    staleTime: 1000 * 60 * 15,
    retry: false,
    queryFn: async () => {
      const qs = new URLSearchParams({
        comps: "ipl",
        role: roleKey,
        definition: "rules",
        lens: "all",
        minBalls: "40",
        minMatches: "5",
        sort: "adjusted",
        t20iScope: "full-members",
        estimator: "pressure",
        limit: "400",
        seasonFrom: "2008",
        seasonTo: "2026",
      });
      try {
        const res = await fetch(`/api/stats/pressure-reliability?${qs}`);
        if (res.ok && (res.headers.get("content-type") || "").includes("application/json")) {
          return (await res.json()) as { players: any[]; cohort?: any };
        }
      } catch {
        // Static deployment fallback
      }
      const snap = await loadHubPressureSnapshot();
      return computePressureReliability(snap, {
        comps: ["ipl"],
        role: roleKey,
        definition: "rules",
        lens: "all",
        minBalls: 40,
        minMatches: 5,
        sort: "adjusted",
        t20iScope: "full-members",
        estimator: "pressure",
        limit: 400,
        from: 2008,
        to: 2026,
      });
    },
  });

  const pressureRow = useMemo(() => {
    const rows = pressureQuery.data?.players;
    if (!rows?.length || !bio) return null;
    const candidates = [bio.playerName, bio.fullName, displayName]
      .filter(Boolean)
      .map((s) => normalizePlayerName(String(s)));
    const exact = rows.find((r) => candidates.includes(normalizePlayerName(r.player)));
    if (exact) return exact;
    const last = normalizePlayerName(bio.playerName).split(" ").slice(-1)[0];
    const init = normalizePlayerName(bio.fullName || bio.playerName)[0];
    return (
      rows.find((r) => {
        const np = normalizePlayerName(r.player);
        return last && init && np.endsWith(` ${last}`) && np.startsWith(init);
      }) ?? null
    );
  }, [pressureQuery.data, bio, displayName]);

  // Recent-matches derived aggregates: Chase vs Defend, Venues, Oppositions
  const matchAgg = useMemo(() => {
    const venueMap = new Map<
      string,
      { venue: string; matches: number; wins: number; runs: number; balls: number; outs: number; wickets: number; bowlRuns: number; bowlBalls: number }
    >();
    const oppMap = new Map<
      string,
      { team: string; matches: number; wins: number; runs: number; balls: number; outs: number; wickets: number; bowlRuns: number; bowlBalls: number }
    >();

    let chaseMatches = 0,
      chaseRuns = 0,
      chaseBalls = 0,
      chaseWins = 0,
      chaseWkts = 0,
      chaseBowlRuns = 0,
      chaseBowlBalls = 0;
    let defendMatches = 0,
      defendRuns = 0,
      defendBalls = 0,
      defendWins = 0,
      defendWkts = 0,
      defendBowlRuns = 0,
      defendBowlBalls = 0;

    const toBalls = (ov: any) => {
      const n = Number(ov);
      if (!Number.isFinite(n) || n <= 0) return 0;
      const whole = Math.floor(n);
      const frac = Math.round((n - whole) * 10);
      return whole * 6 + frac;
    };

    for (const m of recentMatches) {
      const isWin = m?.result === "Won";
      const isLoss = m?.result === "Lost";
      const margin = String(m?.margin || "").toLowerCase();
      // If Won by wkts or Lost by runs => team chased; if Won by runs or Lost by wkts => team defended
      const isChasing = (isWin && margin.includes("wkt")) || (isLoss && margin.includes("run"));
      const isDefending = (isWin && margin.includes("run")) || (isLoss && margin.includes("wkt"));

      const rawVenue = String(m?.venue || "").trim();
      const venue = normalizeVenueName(rawVenue) || rawVenue.split(",")[0].trim() || "Unknown Ground";
      const opp = String(m?.vsTeam || "").trim();

      const b = m?.batting;
      const w = m?.bowling;
      const br = Number(b?.runs ?? 0);
      const bb = Number(b?.balls ?? 0);
      const bo = b && !b.notOut ? 1 : 0;
      const wk = Number(w?.wickets ?? 0);
      const wr = Number(w?.runs ?? 0);
      const wb = toBalls(w?.overs);

      if (isChasing) {
        chaseMatches++;
        if (isWin) chaseWins++;
        if (b) {
          chaseRuns += br;
          chaseBalls += bb;
        }
        if (w) {
          chaseWkts += wk;
          chaseBowlRuns += wr;
          chaseBowlBalls += wb;
        }
      } else if (isDefending) {
        defendMatches++;
        if (isWin) defendWins++;
        if (b) {
          defendRuns += br;
          defendBalls += bb;
        }
        if (w) {
          defendWkts += wk;
          defendBowlRuns += wr;
          defendBowlBalls += wb;
        }
      }

      if (venue !== "Unknown Ground") {
        const ve = venueMap.get(venue) ?? { venue, matches: 0, wins: 0, runs: 0, balls: 0, outs: 0, wickets: 0, bowlRuns: 0, bowlBalls: 0 };
        ve.matches++;
        if (isWin) ve.wins++;
        if (b) {
          ve.runs += br;
          ve.balls += bb;
          ve.outs += bo;
        }
        if (w) {
          ve.wickets += wk;
          ve.bowlRuns += wr;
          ve.bowlBalls += wb;
        }
        venueMap.set(venue, ve);
      }

      if (opp) {
        const oe = oppMap.get(opp) ?? { team: opp, matches: 0, wins: 0, runs: 0, balls: 0, outs: 0, wickets: 0, bowlRuns: 0, bowlBalls: 0 };
        oe.matches++;
        if (isWin) oe.wins++;
        if (b) {
          oe.runs += br;
          oe.balls += bb;
          oe.outs += bo;
        }
        if (w) {
          oe.wickets += wk;
          oe.bowlRuns += wr;
          oe.bowlBalls += wb;
        }
        oppMap.set(opp, oe);
      }
    }

    const venues = Array.from(venueMap.values())
      .map((v) => ({
        ...v,
        sr: v.balls > 0 ? (v.runs / v.balls) * 100 : 0,
        econ: v.bowlBalls > 0 ? (v.bowlRuns * 6) / v.bowlBalls : 0,
        winPct: v.matches > 0 ? Math.round((v.wins / v.matches) * 100) : 0,
      }))
      .sort((a, b) => b.matches - a.matches || b.runs - a.runs);

    const oppositions = Array.from(oppMap.values())
      .map((o) => ({
        ...o,
        sr: o.balls > 0 ? (o.runs / o.balls) * 100 : 0,
        econ: o.bowlBalls > 0 ? (o.bowlRuns * 6) / o.bowlBalls : 0,
        winPct: o.matches > 0 ? Math.round((o.wins / o.matches) * 100) : 0,
      }))
      .sort((a, b) => b.matches - a.matches || b.runs - a.runs);

    return {
      venues,
      oppositions,
      chase: {
        matches: chaseMatches,
        winPct: chaseMatches > 0 ? Math.round((chaseWins / chaseMatches) * 100) : null,
        sr: chaseBalls > 0 ? (chaseRuns / chaseBalls) * 100 : null,
        econ: chaseBowlBalls > 0 ? (chaseBowlRuns * 6) / chaseBowlBalls : null,
        runs: chaseRuns,
        wickets: chaseWkts,
      },
      defend: {
        matches: defendMatches,
        winPct: defendMatches > 0 ? Math.round((defendWins / defendMatches) * 100) : null,
        sr: defendBalls > 0 ? (defendRuns / defendBalls) * 100 : null,
        econ: defendBowlBalls > 0 ? (defendBowlRuns * 6) / defendBowlBalls : null,
        runs: defendRuns,
        wickets: defendWkts,
      },
    };
  }, [recentMatches]);

  // Career Milestones (with verified Getty/editorial image lookup when publishable)
  const milestones = useMemo<PlayerMilestone[]>(() => {
    if (!bio) return [];
    const name = displayName || bio.fullName || bio.playerName;
    const aliases = [name, bio.playerName, bio.fullName].filter(Boolean).map((n) => normClean(n));
    const manifestImgs = Array.isArray(PUBLIC_MANIFEST?.images) ? PUBLIC_MANIFEST.images : [];
    const findEditorialPhoto = (season?: string, date?: string): EditorialImage | undefined => {
      const matchesPlayer = (img: any) => {
        if (!img || img.source !== "getty" || !img.discovery?.captionVerified) return false;
        if (!isPublishable(img) && !isLocalPreviewable(img)) return false;
        const cap = String(img.caption || "").toLowerCase();
        const depHit = Array.isArray(img.depicts) && img.depicts.some((p: string) => aliases.includes(normClean(p)));
        const capHit = [name, bio.playerName, bio.fullName]
          .filter((n): n is string => Boolean(n && n.trim().split(/\s+/).every((p) => p.length > 1)))
          .some((n) => cap.includes(n.toLowerCase()));
        return depHit || capHit;
      };
      if (date) {
        const hit = manifestImgs.find((i) => matchesPlayer(i) && i.matchDate === date);
        if (hit) return hit;
      }
      if (season) {
        const hit = manifestImgs.find((i) => matchesPlayer(i) && i.matchDate?.startsWith(`${season}-`));
        if (hit) return hit;
      }
      return manifestImgs.find(matchesPlayer);
    };

    const items: PlayerMilestone[] = [];
    const numericTimeline = timeline.filter((t) => Number.isFinite(Number(t.season)));

    // Peak Season milestone
    const peak = [...numericTimeline].sort((a, b) =>
      isBowler ? Number(b.bowl?.wickets ?? 0) - Number(a.bowl?.wickets ?? 0) : Number(b.bat?.runs ?? 0) - Number(a.bat?.runs ?? 0),
    )[0];
    if (peak) {
      const val = isBowler ? peak.bowl?.wickets ?? 0 : peak.bat?.runs ?? 0;
      if (val > 0) {
        items.push({
          id: "peak-season",
          season: peak.season,
          callout: isBowler ? `${val} Wkts` : `${val.toLocaleString("en-IN")}`,
          title: `Peak Campaign · IPL ${peak.season}`,
          kicker: isBowler ? "WICKET BENCHMARK" : val >= 600 ? "ORANGE CAP CONTENDER" : "PEAK SEASON",
          description: isBowler
            ? `Captured ${val} wickets at ${peak.bowl?.econ.toFixed(2) ?? "—"} economy across IPL ${peak.season}.`
            : `Compiled ${val.toLocaleString("en-IN")} runs at ${peak.bat?.sr.toFixed(1) ?? "—"} SR with high ${peak.bat?.highest ?? "—"} in IPL ${peak.season}.`,
          category: "records",
          photo: findEditorialPhoto(peak.season),
          stats: isBowler
            ? [
                { label: "Wickets", value: String(val) },
                { label: "Econ", value: peak.bowl?.econ.toFixed(2) ?? "—" },
              ]
            : [
                { label: "Runs", value: val.toLocaleString("en-IN") },
                { label: "SR", value: peak.bat?.sr.toFixed(1) ?? "—" },
              ],
        });
      }
    }

    // Cumulative career milestone
    if (!isBowler && bat && bat.runs >= 1000) {
      let cum = 0;
      let hitSeason = numericTimeline[numericTimeline.length - 1]?.season ?? "";
      const target = bat.runs >= 9000 ? 9000 : bat.runs >= 7000 ? 7000 : bat.runs >= 5000 ? 5000 : bat.runs >= 3000 ? 3000 : 1000;
      for (const row of numericTimeline) {
        cum += row.bat?.runs ?? 0;
        if (cum >= target) {
          hitSeason = row.season;
          break;
        }
      }
      items.push({
        id: `cum-${target}`,
        season: hitSeason,
        callout: `${target.toLocaleString("en-IN")}+`,
        title: `${target.toLocaleString("en-IN")}+ IPL Runs Landmark`,
        kicker: "CAREER MILESTONE",
        description: `Surpassed ${target.toLocaleString("en-IN")} career IPL runs (${bat.fifties}×50s, ${bat.hundreds}×100s) for ${teamCode}.`,
        category: "records",
        photo: findEditorialPhoto(hitSeason),
        stats: [
          { label: "50+ Scores", value: String(bat.fifties + bat.hundreds) },
          { label: "Average", value: bat.avg.toFixed(1) },
        ],
      });
    } else if (isBowler && bowl && bowl.wickets >= 50) {
      const target = bowl.wickets >= 200 ? 200 : bowl.wickets >= 150 ? 150 : bowl.wickets >= 100 ? 100 : 50;
      items.push({
        id: `bowl-${target}`,
        season: numericTimeline[numericTimeline.length - 1]?.season ?? "IPL",
        callout: `${target}+ W`,
        title: `${target}+ Career Wickets`,
        kicker: "BOWLING MILESTONE",
        description: `Claimed ${bowl.wickets} IPL wickets in ${bowl.innings} innings at ${bowl.econ.toFixed(2)} economy (best ${bowl.best}).`,
        category: "records",
        photo: findEditorialPhoto(numericTimeline[numericTimeline.length - 1]?.season),
        stats: [
          { label: "Wickets", value: String(bowl.wickets) },
          { label: "Best", value: bowl.best },
        ],
      });
    }

    // Standout Match Moments (Centuries / 50+ / 4-Wkt spells)
    const standout = [...recentMatches]
      .filter((m) => (m?.batting?.runs ?? 0) >= 85 || (m?.bowling?.wickets ?? 0) >= 4)
      .slice(0, 3);
    for (const m of standout) {
      const cent = (m.batting?.runs ?? 0) >= 100;
      const spell = (m.bowling?.wickets ?? 0) >= 4;
      items.push({
        id: `match-${m.matchId}`,
        season: String(m.season),
        callout: cent || !spell ? `${m.batting?.runs ?? 0}${m.batting?.notOut ? "*" : ""}` : `${m.bowling?.wickets}W`,
        title: cent
          ? `Century vs ${teamShort(m.vsTeam || "OPP")}`
          : spell
            ? `${m.bowling.wickets}-Wicket Haul vs ${teamShort(m.vsTeam || "OPP")}`
            : `Match Knock vs ${teamShort(m.vsTeam || "OPP")}`,
        kicker: cent ? "CENTURY ARCHIVE" : spell ? "ELITE SPELL" : "STANDOUT KNOCK",
        description: `${m.date} at ${(m.venue || "IPL Venue").split(",")[0]} · ${m.result || "Fixture"} (${m.margin || ""}).`,
        category: "matches",
        matchId: m.matchId,
        opponent: m.vsTeam,
        venue: m.venue,
        photo: findEditorialPhoto(String(m.season), String(m.date || "")),
        stats: [
          ...(m.batting ? [{ label: "Score", value: `${m.batting.runs} (${m.batting.balls}b)` }] : []),
          ...(m.bowling ? [{ label: "Figures", value: `${m.bowling.wickets}/${m.bowling.runs}` }] : []),
        ],
      });
    }

    // Captaincy / Longevity
    if (captaincy?.firstSeason) {
      items.push({
        id: "captaincy",
        season: String(captaincy.firstSeason),
        callout: `${captaincy.matches} Cap`,
        title: `Captaincy Chapter (${captaincy.firstSeason}–${captaincy.lastSeason})`,
        kicker: captaincy.titles ? "TITLE CAPTAIN" : "LEADERSHIP",
        description: `Led in ${captaincy.matches} IPL fixtures (${captaincy.won} wins)${captaincy.titles ? ` including ${captaincy.titles} title(s)` : ""}.`,
        category: "chapters",
        photo: findEditorialPhoto(String(captaincy.firstSeason)),
        stats: [
          { label: "Win %", value: `${captaincy.matches > 0 ? Math.round((captaincy.won / captaincy.matches) * 100) : 0}%` },
          { label: "Titles", value: String(captaincy.titles || 0) },
        ],
      });
    } else if (numericTimeline.length >= 8) {
      items.push({
        id: "longevity",
        season: numericTimeline[0].season,
        callout: `${numericTimeline.length} Yrs`,
        title: `${numericTimeline.length} IPL Editions`,
        kicker: "TOURNAMENT LONGEVITY",
        description: `Active across ${numericTimeline.length} seasons from ${numericTimeline[0].season} to ${numericTimeline[numericTimeline.length - 1].season}.`,
        category: "chapters",
        photo: findEditorialPhoto(numericTimeline[0].season),
        stats: [
          { label: "Debut", value: numericTimeline[0].season },
          { label: "Latest", value: numericTimeline[numericTimeline.length - 1].season },
        ],
      });
    }

    return items;
  }, [bio, displayName, timeline, bat, bowl, isBowler, recentMatches, captaincy, teamCode]);

  // Editorial Intelligence Reports (centralized in Recent Form + Reports)
  const playerArticles = useMemo<IndexEntry[]>(() => {
    if (!bio) return [];
    const all = getV2Index();
    const pName = (bio.playerName || "").toLowerCase().trim();
    const fName = (bio.fullName || displayName || "").toLowerCase().trim();
    const parts = (bio.fullName || bio.playerName || "").trim().split(/\s+/);
    const last = parts.length > 1 ? parts[parts.length - 1].toLowerCase() : "";
    const matched = all.filter((art) => {
      if (art.players?.some((raw) => {
        const p = raw.toLowerCase().trim();
        return p === pName || (fName && p === fName) || (last.length > 3 && p.endsWith(last));
      })) return true;
      const t = (art.title || "").toLowerCase();
      return t.includes(pName) || (fName && t.includes(fName)) || (last.length > 3 && t.includes(last));
    });
    if (matched.length >= 3) return matched.slice(0, 8);
    const seen = new Set(matched.map((m) => m.id));
    const res = [...matched];
    for (const a of all.filter((x) => x.franchise.toUpperCase() === teamCode.toUpperCase())) {
      if (!seen.has(a.id)) {
        res.push(a);
        seen.add(a.id);
      }
      if (res.length >= 6) break;
    }
    return res;
  }, [bio, displayName, teamCode]);

  return {
    loading: bios.isLoading || identity.isLoading,
    error: bios.isError,
    refetchBios: () => void bios.refetch(),
    careerLoading: career.isLoading,
    bio,
    displayName: displayName || bio?.fullName || bio?.playerName || "",
    primaryTeam,
    teamAccent,
    teamCode,
    photo,
    resolvedCountry,
    iplDebut,
    jerseyNo,
    bat,
    bowl,
    isBowler,
    isAllRounder,
    timeline,
    squadHistory,
    captaincy,
    recentMatches,
    lens,
    pressureRow,
    matchAgg,
    milestones,
    playerArticles,
    allTeams: teamsData.data ?? [],
    playerImages: images.data ?? {},
    displayNames,
    formatPlayerName: (n: string) => displayPlayerName(n, displayNames),
  };
}

export type MobilePlayerData = ReturnType<typeof useMobilePlayer>;
