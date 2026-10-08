// Decision Intelligence OS — Phase 2: AI Insight Feed.
//
// Five discoveries a day, one per category, found by scanning the warehouse —
// no hand-written facts:
//
//   player_rise          biggest season-on-season jumps and breakout debuts
//   venue_pattern        grounds whose latest scoring moved beyond the league-wide trend
//   matchup_anomaly      bowler–batter pairs with far more dismissals than chance predicts
//   auction_opportunity  2025–26 auction buys with the most (or least) impact per crore
//   tactical_trend       league habits that shifted most in the latest season
//
// Each category keeps a ranked pool of candidates. A given date picks one of
// the top five per category deterministically, so the feed changes daily but
// any day's feed can be reproduced (and browsed back to).

import fs from "fs";
import path from "path";
import { getProjectRoot, normalizeSeason, queryAll } from "./db";
import { estimateImpact, round } from "./impact-model";
import { getHistoryOverview } from "./history";
import { getPlayerMeta, getRoster, getSeasonLines, getSeasons } from "./player-profiles";
import { getVenueRefs } from "./stats-engine";

export type InsightCategory = "player_rise" | "venue_pattern" | "matchup_anomaly" | "auction_opportunity" | "tactical_trend";

export type InsightLink =
  | { kind: "ask"; question: string }
  | { kind: "weakness"; playerId: number; window: "recent" | "career" }
  | { kind: "pressure"; playerId: number; window: "recent" | "career" };

export interface Insight {
  id: string;
  category: InsightCategory;
  categoryLabel: string;
  headline: string;
  stat: { value: string; label: string };
  evidence: string[];
  implication: string;
  confidence: "high" | "medium";
  links: { label: string; link: InsightLink }[];
  /** Strength of the signal used to rank candidates (higher = stronger). */
  score: number;
}

export interface DailyFeed {
  date: string;
  dataThrough: string | null;
  latestSeason: string;
  insights: Insight[];
  poolSizes: Record<InsightCategory, number>;
}

const CATEGORY_LABEL: Record<InsightCategory, string> = {
  player_rise: "Unexpected rise",
  venue_pattern: "Venue pattern",
  matchup_anomaly: "Matchup anomaly",
  auction_opportunity: "Auction opportunity",
  tactical_trend: "Tactical trend",
};
const CATEGORIES = Object.keys(CATEGORY_LABEL) as InsightCategory[];
const ROTATE_TOP = 5;

const f1 = (n: number) => n.toFixed(1);
const f0 = (n: number) => Math.round(n).toLocaleString("en-US");
const signed = (n: number, dp = 1) => `${n >= 0 ? "+" : ""}${n.toFixed(dp)}`;

/* ─── 1. Player rise ─────────────────────────────────────────────────────── */

function playerRise(latest: string): Insight[] {
  const meta = getPlayerMeta();
  const L = Number(latest);
  const out: Insight[] = [];
  for (const [pid, lines] of getSeasonLines()) {
    const name = meta.get(pid)?.name ?? `#${pid}`;
    const cur = lines.find((l) => l.season === latest);
    if (!cur) continue;
    const prior = lines.filter((l) => Number(l.season) >= L - 2 && Number(l.season) < L);
    const pBalls = prior.reduce((s, l) => s + l.batBalls, 0);
    const pRuns = prior.reduce((s, l) => s + l.batRuns, 0);
    const pOuts = prior.reduce((s, l) => s + l.batOuts, 0);
    const earlier = lines.filter((l) => Number(l.season) < L);

    // Batting: strike-rate jump with volume in both periods.
    if (cur.batBalls >= 150 && pBalls >= 150) {
      const srNow = (cur.batRuns / cur.batBalls) * 100;
      const srThen = (pRuns / pBalls) * 100;
      const avgNow = cur.batOuts ? cur.batRuns / cur.batOuts : cur.batRuns;
      const avgThen = pOuts ? pRuns / pOuts : pRuns;
      const delta = srNow - srThen;
      // Approximate SE of a strike rate from per-ball run variance (~2.6 runs²).
      const se = 100 * Math.sqrt(2.6 / cur.batBalls + 2.6 / pBalls);
      const z = delta / se;
      if (z >= 2 && avgNow >= avgThen * 0.8) {
        out.push({
          id: `rise-bat-${pid}`, category: "player_rise", categoryLabel: CATEGORY_LABEL.player_rise,
          headline: `${name}'s strike rate jumped from ${f1(srThen)} to ${f1(srNow)} in IPL ${latest}`,
          stat: { value: signed(delta), label: "strike-rate points" },
          evidence: [
            `IPL ${latest}: ${f0(cur.batRuns)} runs off ${f0(cur.batBalls)} balls, average ${f1(avgNow)}.`,
            `IPL ${L - 2}–${L - 1}: ${f0(pRuns)} runs off ${f0(pBalls)} balls, average ${f1(avgThen)}.`,
            `A jump this size over these samples is ${f1(z)} standard errors — unlikely to be noise.`,
          ],
          implication: `Plan and price for the IPL ${latest} version: the scoring rate moved without the average collapsing, so this looks like a changed method rather than a hot streak.`,
          confidence: z >= 3 ? "high" : "medium",
          links: [
            { label: "Season by season", link: { kind: "ask", question: `${name} runs by season` } },
            { label: "Pressure genome", link: { kind: "pressure", playerId: pid, window: "recent" } },
          ],
          score: z,
        });
      }
    }

    // Batting breakout: first IPL season with real volume.
    if (!earlier.some((l) => l.batBalls > 0) && cur.batBalls >= 200) {
      const sr = (cur.batRuns / cur.batBalls) * 100;
      if (sr >= 150) {
        out.push({
          id: `rise-debut-${pid}`, category: "player_rise", categoryLabel: CATEGORY_LABEL.player_rise,
          headline: `Breakout: ${name} made ${f0(cur.batRuns)} runs at a strike rate of ${f1(sr)} in a first IPL season`,
          stat: { value: f0(cur.batRuns), label: `debut-season runs` },
          evidence: [
            `${f0(cur.batBalls)} balls faced across ${cur.matches} matches in IPL ${latest}, dismissed ${cur.batOuts} times.`,
            `No IPL balls faced before ${latest}.`,
          ],
          implication: "Debut seasons this strong are rare; opponents now have a full season of footage, so the second season is the real test.",
          confidence: cur.batBalls >= 300 ? "high" : "medium",
          links: [{ label: "Weakness scan", link: { kind: "weakness", playerId: pid, window: "recent" } }],
          score: (cur.batRuns / 100) * (sr / 150),
        });
      }
    }

    // Bowling: economy drop.
    const pbBalls = prior.reduce((s, l) => s + l.bowlBalls, 0);
    if (cur.bowlBalls >= 120 && pbBalls >= 120) {
      const pbRuns = prior.reduce((s, l) => s + l.bowlRuns, 0);
      const ecoNow = (cur.bowlRuns / cur.bowlBalls) * 6;
      const ecoThen = (pbRuns / pbBalls) * 6;
      const delta = ecoThen - ecoNow;
      const se = 6 * Math.sqrt(2.9 / cur.bowlBalls + 2.9 / pbBalls);
      const z = delta / se;
      if (z >= 2) {
        out.push({
          id: `rise-bowl-${pid}`, category: "player_rise", categoryLabel: CATEGORY_LABEL.player_rise,
          headline: `${name}'s economy fell from ${ecoThen.toFixed(2)} to ${ecoNow.toFixed(2)} in IPL ${latest}`,
          stat: { value: `−${delta.toFixed(2)}`, label: "runs per over" },
          evidence: [
            `IPL ${latest}: ${cur.wickets} wickets in ${Math.floor(cur.bowlBalls / 6)} overs.`,
            `IPL ${L - 2}–${L - 1}: ${prior.reduce((s, l) => s + l.wickets, 0)} wickets in ${Math.floor(pbBalls / 6)} overs.`,
            `${f1(z)} standard errors — a real shift, not a few good games.`,
          ],
          implication: "Re-rate this bowler for the tough overs: the improvement came over a full season's sample.",
          confidence: z >= 3 ? "high" : "medium",
          links: [
            { label: "Season by season", link: { kind: "ask", question: `${name} economy by season` } },
            { label: "Pressure genome", link: { kind: "pressure", playerId: pid, window: "recent" } },
          ],
          score: z,
        });
      }
    }
  }
  return out;
}

/* ─── 2. Venue pattern ───────────────────────────────────────────────────── */

function venuePattern(latest: string): Insight[] {
  const refs = getVenueRefs();
  const venueOf = new Map<number, (typeof refs)[number]>();
  for (const v of refs) for (const id of v.venueIds) venueOf.set(id, v);
  const rows = queryAll<{ venue: number; season: string; runs: number }>(`
    SELECT m.venue_id venue, m.season_id season, SUM(d.total_runs) runs
    FROM deliveries d JOIN innings i ON i.innings_id = d.innings_id JOIN matches m ON m.match_id = d.match_id
    WHERE i.innings_number = 1 GROUP BY d.innings_id`);
  const L = Number(latest);
  const league = { now: [] as number[], before: [] as number[] };
  const byVenue = new Map<string, { ref: (typeof refs)[number]; now: number[]; before: number[] }>();
  for (const r of rows) {
    const s = Number(normalizeSeason(r.season));
    const ref = venueOf.get(r.venue);
    if (!ref || s < L - 5) continue;
    const bucket = s === L ? "now" : "before";
    league[bucket].push(r.runs);
    const v = byVenue.get(ref.key) ?? { ref, now: [], before: [] };
    v[bucket].push(r.runs);
    byVenue.set(ref.key, v);
  }
  const mean = (a: number[]) => a.reduce((s, x) => s + x, 0) / a.length;
  const sd = (a: number[]) => { const m = mean(a); return Math.sqrt(a.reduce((s, x) => s + (x - m) ** 2, 0) / Math.max(1, a.length - 1)); };
  const leagueShift = mean(league.now) - mean(league.before);
  const out: Insight[] = [];
  for (const v of byVenue.values()) {
    if (v.now.length < 4 || v.before.length < 8) continue;
    const shift = mean(v.now) - mean(v.before);
    const beyond = shift - leagueShift;
    const z = beyond / (sd([...v.now, ...v.before]) * Math.sqrt(1 / v.now.length + 1 / v.before.length));
    if (Math.abs(z) < 1.5) continue;
    const up = beyond > 0;
    out.push({
      id: `venue-${v.ref.key}`, category: "venue_pattern", categoryLabel: CATEGORY_LABEL.venue_pattern,
      headline: `${v.ref.name}: first-innings scores ${up ? "rose" : "fell"} ${f0(Math.abs(beyond))} runs ${up ? "more" : "further"} than the league trend in IPL ${latest}`,
      stat: { value: f0(mean(v.now)), label: `avg 1st-innings score, ${latest}` },
      evidence: [
        `IPL ${latest}: ${f1(mean(v.now))} average first-innings score over ${v.now.length} matches.`,
        `IPL ${L - 5}–${L - 1}: ${f1(mean(v.before))} over ${v.before.length} matches.`,
        `League-wide, first-innings scores moved ${signed(leagueShift)} over the same period, so ${signed(beyond)} is specific to this ground (${f1(Math.abs(z))} standard errors).`,
      ],
      implication: up
        ? `Par at ${v.ref.name} has reset upward — totals that were defendable here before ${latest} are now below average.`
        : `${v.ref.name} has become harder to bat on than the league trend suggests — batting-first targets from earlier seasons are now too high.`,
      confidence: Math.abs(z) >= 2.5 ? "high" : "medium",
      links: [{ label: "Average score by season", link: { kind: "ask", question: `average score at ${v.ref.name} by season` } }],
      score: Math.abs(z),
    });
  }
  return out;
}

/* ─── 3. Matchup anomaly ─────────────────────────────────────────────────── */

// P(X ≥ k) for X ~ Poisson(λ).
function poissonTail(k: number, lambda: number): number {
  let term = Math.exp(-lambda), cdf = 0;
  for (let i = 0; i < k; i++) { cdf += term; term *= lambda / (i + 1); }
  return Math.max(0, 1 - cdf);
}

function matchupAnomaly(latest: string): Insight[] {
  const active = new Set(getRoster(latest).map((r) => r.playerId));
  const meta = getPlayerMeta();
  // Join on delivery_id alone and filter inside the aggregate: with the extra
  // join conditions SQLite probes the player_out index per ball (17s vs <1s).
  const OUT = `CASE WHEN x.player_out_id = d.batter_id AND x.kind IN ('bowled','caught','caught and bowled','lbw','stumped','hit wicket') THEN 1 ELSE 0 END`;
  const pairs = queryAll<{ bat: number; bowl: number; balls: number; runs: number; outs: number }>(`
    SELECT d.batter_id bat, d.bowler_id bowl, SUM(1 - d.is_wide) balls, SUM(d.batter_runs) runs, SUM(${OUT}) outs
    FROM deliveries d JOIN innings i ON i.innings_id = d.innings_id
    LEFT JOIN dismissals x ON x.delivery_id = d.delivery_id
    WHERE i.innings_number IN (1, 2)
    GROUP BY bat, bowl HAVING balls >= 18`);
  // Each batter's bowler-credited dismissal rate across everyone they faced.
  const batRate = new Map<number, { balls: number; outs: number; runs: number }>();
  for (const r of queryAll<{ bat: number; balls: number; outs: number; runs: number }>(`
    SELECT d.batter_id bat, SUM(1 - d.is_wide) balls, SUM(d.batter_runs) runs, SUM(${OUT}) outs
    FROM deliveries d JOIN innings i ON i.innings_id = d.innings_id
    LEFT JOIN dismissals x ON x.delivery_id = d.delivery_id
    WHERE i.innings_number IN (1, 2) GROUP BY bat`)) batRate.set(r.bat, r);

  const out: Insight[] = [];
  for (const p of pairs) {
    if (!active.has(p.bat) || !active.has(p.bowl)) continue;
    const base = batRate.get(p.bat);
    if (!base || base.balls < 300) continue;
    const bName = meta.get(p.bat)?.name ?? `#${p.bat}`;
    const wName = meta.get(p.bowl)?.name ?? `#${p.bowl}`;
    const rate = base.outs / base.balls;
    const expected = p.balls * rate;
    if (p.outs >= 3 && p.outs >= 2 * expected) {
      const pValue = poissonTail(p.outs, expected);
      if (pValue > 0.02) continue;
      out.push({
        id: `bunny-${p.bat}-${p.bowl}`, category: "matchup_anomaly", categoryLabel: CATEGORY_LABEL.matchup_anomaly,
        headline: `${wName} has dismissed ${bName} ${p.outs} times in ${p.balls} balls — ${f1(p.outs / expected)}× the usual rate`,
        stat: { value: `${p.outs} in ${p.balls}`, label: "dismissals in balls" },
        evidence: [
          `${bName} is normally out to a bowler once every ${f0(1 / rate)} balls (${f0(base.balls)} career balls).`,
          `At that rate ${f1(expected)} dismissals would be expected against ${wName}; ${p.outs} happened. Chance of that by luck: ${(pValue * 100).toFixed(pValue < 0.001 ? 2 : 1)}%.`,
          `${bName} scores at ${f1((p.runs / p.balls) * 100)} against ${wName} (${f1((base.runs / base.balls) * 100)} overall).`,
        ],
        implication: `When ${bName} walks in, ${wName} is the matchup to reach for.`,
        confidence: pValue < 0.005 ? "high" : "medium",
        links: [
          { label: "Head to head", link: { kind: "ask", question: `${bName} vs ${wName}` } },
          { label: `${bName} weakness scan`, link: { kind: "weakness", playerId: p.bat, window: "career" } },
        ],
        score: -Math.log10(Math.max(pValue, 1e-9)),
      });
    }
  }
  return out;
}

/* ─── 4. Auction opportunity ─────────────────────────────────────────────── */

function auctionOpportunity(latest: string): Insight[] {
  const fp = path.join(getProjectRoot(), "artifacts", "api-server", "data", "player-auctions.json");
  if (!fs.existsSync(fp)) return [];
  const L = Number(latest);
  const sales = (JSON.parse(fs.readFileSync(fp, "utf8")) as { season: number; player: string; team: string; soldLakh: number | null }[])
    .filter((s) => s.soldLakh && s.season >= L - 1);
  const meta = getPlayerMeta();
  const roster = getRoster(latest);
  const rosterIds = new Set(roster.map((r) => r.playerId));
  const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z ]/g, " ").replace(/\s+/g, " ").trim();
  // Match auction names (full names) to current players: full name, first+last, or initial+surname.
  const keys = new Map<string, number[]>();
  const addKey = (k: string, id: number) => { if (!k) return; keys.set(k, [...(keys.get(k) ?? []), id]); };
  for (const id of rosterIds) {
    const m = meta.get(id);
    if (!m) continue;
    addKey(norm(m.name), id);
    if (m.fullName) {
      const t = norm(m.fullName).split(" ");
      addKey(t.join(" "), id);
      addKey(`${t[0]} ${t[t.length - 1]}`, id);
    }
    const ct = norm(m.name).split(" ");
    addKey(`${ct[0][0]}|${ct[ct.length - 1]}`, id);
  }
  const lookup = (player: string) => {
    const t = norm(player).split(" ");
    for (const k of [t.join(" "), `${t[0]} ${t[t.length - 1]}`, `${t[0][0]}|${t[t.length - 1]}`]) {
      const ids = [...new Set(keys.get(k) ?? [])];
      if (ids.length === 1) return ids[0];
    }
    return null;
  };

  const latestSale = new Map<number, { season: number; team: string; lakh: number; player: string }>();
  for (const s of sales) {
    const id = lookup(s.player);
    if (id === null) continue;
    const prev = latestSale.get(id);
    if (!prev || s.season > prev.season) latestSale.set(id, { season: s.season, team: s.team, lakh: s.soldLakh!, player: s.player });
  }
  const rows = [...latestSale.entries()].map(([id, sale]) => {
    const imp = estimateImpact(id, latest);
    const matches = roster.filter((r) => r.playerId === id).reduce((s, r) => s + r.matches, 0);
    return { id, sale, impact: imp.total, matches, crore: sale.lakh / 100 };
  }).filter((r) => r.matches >= 6);
  if (rows.length < 5) return [];
  const medianPerCrore = (() => {
    const v = rows.filter((r) => r.impact > 0).map((r) => r.impact / r.crore).sort((a, b) => a - b);
    return v[Math.floor(v.length / 2)] ?? 0;
  })();

  const out: Insight[] = [];
  for (const r of rows) {
    const name = meta.get(r.id)?.name ?? r.sale.player;
    if (r.impact >= 2) {
      const perCrore = r.impact / r.crore;
      out.push({
        id: `auction-value-${r.id}`, category: "auction_opportunity", categoryLabel: CATEGORY_LABEL.auction_opportunity,
        headline: `Best value: ${name} cost ₹${r.crore.toFixed(2)} Cr and added ${signed(r.impact)} runs a match in IPL ${latest}`,
        stat: { value: `${f1(perCrore)}`, label: "runs/match per ₹1 Cr" },
        evidence: [
          `Bought by ${r.sale.team} for ₹${r.crore.toFixed(2)} Cr at the ${r.sale.season} auction.`,
          `Impact model: ${signed(r.impact)} runs per match above an average IPL player (${r.matches} matches in ${latest}).`,
          `Median among 2025–26 auction buys with positive impact: ${f1(medianPerCrore)} runs/match per crore — this is ${f1(perCrore / Math.max(medianPerCrore, 0.01))}× that.`,
        ],
        implication: `Retain at that price if possible; at a re-auction, comparable output usually costs several times more.`,
        confidence: r.matches >= 10 ? "high" : "medium",
        links: [{ label: "Season by season", link: { kind: "ask", question: `${name}` } }],
        score: perCrore / Math.max(medianPerCrore, 0.01),
      });
    } else if (r.crore >= 8 && r.impact <= 0) {
      out.push({
        id: `auction-avoid-${r.id}`, category: "auction_opportunity", categoryLabel: CATEGORY_LABEL.auction_opportunity,
        headline: `Overpriced: ${name} cost ₹${r.crore.toFixed(2)} Cr but rated ${signed(r.impact)} runs a match in IPL ${latest}`,
        stat: { value: `₹${r.crore.toFixed(1)} Cr`, label: "auction price" },
        evidence: [
          `Bought by ${r.sale.team} at the ${r.sale.season} auction.`,
          `Impact model: ${signed(r.impact)} runs per match versus an average IPL player across ${r.matches} matches in ${latest}.`,
        ],
        implication: "A release-and-rebuy candidate: the price assumes output this player has not recently delivered.",
        confidence: r.matches >= 10 ? "high" : "medium",
        links: [{ label: "Season by season", link: { kind: "ask", question: `${name}` } }],
        score: r.crore / 4,
      });
    }
  }
  return out;
}

/* ─── 5. Tactical trend ──────────────────────────────────────────────────── */

interface TrendMetric { key: string; label: string; unit: string; dp: number; values: Map<string, number>; implication: (up: boolean) => string; question: string }

function tacticalTrend(latest: string): Insight[] {
  const meta = getPlayerMeta();
  const metrics: TrendMetric[] = [];
  const phaseRR = new Map<string, Map<string, number>>();
  for (const r of queryAll<{ s: string; phase: string; runs: number; legal: number }>(`
    SELECT m.season_id s, d.phase phase, SUM(d.total_runs) runs, SUM(CASE WHEN d.is_wide = 0 AND d.is_noball = 0 THEN 1 ELSE 0 END) legal
    FROM deliveries d JOIN innings i ON i.innings_id = d.innings_id JOIN matches m ON m.match_id = d.match_id
    WHERE i.innings_number IN (1, 2) GROUP BY s, phase`)) {
    const m = phaseRR.get(r.phase) ?? new Map<string, number>();
    m.set(normalizeSeason(r.s), (r.runs / r.legal) * 6);
    phaseRR.set(r.phase, m);
  }
  const phaseLabel: Record<string, string> = { Powerplay: "powerplay", Middle: "middle-overs", Death: "death-overs" };
  for (const [phase, values] of phaseRR) {
    metrics.push({
      key: `rr-${phase}`, label: `${phaseLabel[phase] ?? phase} run rate`, unit: "runs per over", dp: 2, values,
      implication: (up) => up
        ? `Defensive plans for the ${phaseLabel[phase]} built on older seasons concede more than they used to; par for this phase has moved.`
        : `Bowling sides are winning the ${phaseLabel[phase]} back — batting plans that front-load risk here are now worse bets.`,
      question: `run rate in the ${phase === "Middle" ? "middle overs" : phase === "Death" ? "death overs" : "powerplay"} by season`,
    });
  }

  const ov = getHistoryOverview();
  metrics.push({
    key: "sixes", label: "sixes per match", unit: "sixes", dp: 1,
    values: new Map(ov.seasons.map((s) => [s.season, s.sixes / Math.max(1, s.matches)])),
    implication: (up) => up ? "Boundary-riding and death-over yorker skills are worth more than ever; six-hitting is now a baseline expectation, not a bonus." : "Six-hitting is drying up — power hitters' price premium deserves a second look.",
    question: "sixes by season",
  });
  metrics.push({
    key: "first-innings", label: "average first-innings score", unit: "runs", dp: 1,
    values: new Map(ov.seasons.filter((s) => s.avgFirstInnings !== null).map((s) => [s.season, s.avgFirstInnings!])),
    implication: (up) => up ? "Targets that won matches two seasons ago now lose them; set first-innings ambitions off the current par." : "Scoring has come down — conservative first-innings totals are more defendable than recent seasons suggest.",
    question: "average score by season",
  });

  // Share of overs bowled by spin.
  const spin = new Map<string, { spin: number; all: number }>();
  for (const r of queryAll<{ s: string; bowl: number; legal: number }>(`
    SELECT m.season_id s, d.bowler_id bowl, SUM(CASE WHEN d.is_wide = 0 AND d.is_noball = 0 THEN 1 ELSE 0 END) legal
    FROM deliveries d JOIN innings i ON i.innings_id = d.innings_id JOIN matches m ON m.match_id = d.match_id
    WHERE i.innings_number IN (1, 2) GROUP BY s, bowl`)) {
    const s = normalizeSeason(r.s);
    const t = spin.get(s) ?? { spin: 0, all: 0 };
    const type = meta.get(r.bowl)?.bowlingType;
    if (type === "spin") t.spin += r.legal;
    if (type === "spin" || type === "pace") t.all += r.legal;
    spin.set(s, t);
  }
  metrics.push({
    key: "spin-share", label: "share of overs bowled by spinners", unit: "%", dp: 1,
    values: new Map([...spin].map(([s, t]) => [s, (t.spin / t.all) * 100])),
    implication: (up) => up ? "Captains are trusting spin with more of the innings — squads light on quality spin are now exposed." : "Spin is being squeezed out of the attack; a fourth pacer is becoming the default.",
    question: "most wickets by spinners by season",
  });

  // Chasing win %.
  const chase = new Map<string, { w: number; n: number }>();
  for (const r of queryAll<{ s: string; winner: number | null; bat1: number }>(`
    SELECT m.season_id s, m.winner_id winner, i.batting_team_id bat1 FROM matches m
    JOIN innings i ON i.match_id = m.match_id AND i.innings_number = 1`)) {
    if (r.winner === null) continue;
    const s = normalizeSeason(r.s);
    const t = chase.get(s) ?? { w: 0, n: 0 };
    t.n++;
    if (r.winner !== r.bat1) t.w++;
    chase.set(s, t);
  }
  metrics.push({
    key: "chase-win", label: "chasing win rate", unit: "%", dp: 1,
    values: new Map([...chase].map(([s, t]) => [s, (t.w / t.n) * 100])),
    implication: (up) => up ? "Bowling first is paying off more than before — the toss call should lean toward chasing." : "Setting a total has become the stronger option; chasing's old advantage has faded.",
    question: "chasing win % by season",
  });

  const L = Number(latest);
  const out: Insight[] = [];
  for (const m of metrics) {
    const now = m.values.get(latest);
    const prior = [L - 3, L - 2, L - 1].map((s) => m.values.get(String(s))).filter((v): v is number => v !== undefined);
    const history = [...Array(8)].map((_, i) => m.values.get(String(L - 8 + i))).filter((v): v is number => v !== undefined);
    if (now === undefined || prior.length < 3 || history.length < 5) continue;
    const base = prior.reduce((s, v) => s + v, 0) / prior.length;
    const diffs = history.slice(1).map((v, i) => v - history[i]);
    const sdDiff = Math.sqrt(diffs.reduce((s, d) => s + d * d, 0) / diffs.length) || 1;
    const z = (now - base) / sdDiff;
    const up = now > base;
    const series = [...Array(5)].map((_, i) => String(L - 4 + i)).map((s) => `${s}: ${m.values.get(s)?.toFixed(m.dp) ?? "—"}`).join(" · ");
    out.push({
      id: `trend-${m.key}`, category: "tactical_trend", categoryLabel: CATEGORY_LABEL.tactical_trend,
      headline: `The league's ${m.label} ${up ? "rose" : "fell"} to ${now.toFixed(m.dp)}${m.unit === "%" ? "%" : ""} in IPL ${latest} (${base.toFixed(m.dp)}${m.unit === "%" ? "%" : ""} across ${L - 3}–${L - 1})`,
      stat: { value: signed(now - base, m.dp), label: m.unit === "%" ? "percentage points" : m.unit },
      evidence: [
        `Last five seasons — ${series}.`,
        `The change is ${f1(Math.abs(z))}× the typical season-to-season swing in this number.`,
      ],
      implication: m.implication(up),
      confidence: Math.abs(z) >= 2 ? "high" : "medium",
      links: [{ label: "See the trend", link: { kind: "ask", question: m.question } }],
      score: Math.abs(z),
    });
  }
  return out;
}

/* ─── Feed assembly ──────────────────────────────────────────────────────── */

let pools: Record<InsightCategory, Insight[]> | null = null;
export const buildMs: Partial<Record<InsightCategory, number>> = {};

function getPools(): Record<InsightCategory, Insight[]> {
  if (pools) return pools;
  const latest = getSeasons().at(-1) ?? "2026";
  const build = (fn: (l: string) => Insight[], c: InsightCategory) => {
    const t0 = Date.now();
    const list = fn(latest).sort((x, y) => y.score - x.score);
    buildMs[c] = Date.now() - t0;
    return list;
  };
  pools = {
    player_rise: build(playerRise, "player_rise"),
    venue_pattern: build(venuePattern, "venue_pattern"),
    matchup_anomaly: build(matchupAnomaly, "matchup_anomaly"),
    auction_opportunity: build(auctionOpportunity, "auction_opportunity"),
    tactical_trend: build(tacticalTrend, "tactical_trend"),
  };
  return pools;
}

const dayNumber = (date: string) => Math.floor(Date.parse(`${date}T00:00:00Z`) / 86_400_000);

export function getDailyFeed(date: string): DailyFeed {
  const p = getPools();
  const day = dayNumber(date);
  const insights: Insight[] = [];
  CATEGORIES.forEach((c, i) => {
    const pool = p[c];
    if (!pool.length) return;
    // Rotate through the strongest few so each day differs but stays among real signals.
    const k = Math.min(ROTATE_TOP, pool.length);
    insights.push(pool[(((day + i * 2) % k) + k) % k]);
  });
  const lastMatch = getHistoryOverview().coverage.lastMatch;
  return {
    date,
    dataThrough: lastMatch,
    latestSeason: getSeasons().at(-1) ?? "",
    insights,
    poolSizes: Object.fromEntries(CATEGORIES.map((c) => [c, p[c].length])) as Record<InsightCategory, number>,
  };
}

/** Every candidate in one category, strongest first (the feed's "more like this"). */
export function getInsightPool(category: InsightCategory, limit = 20): Insight[] {
  return getPools()[category].slice(0, limit);
}

export function warmInsightFeed(): void {
  getPools();
}
