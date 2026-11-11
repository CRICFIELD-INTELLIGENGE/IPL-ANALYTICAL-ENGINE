// Home-Ground Advantage — what makes Chinnaswamy different (revises art-rcb-05).
import { Evidence, LEGAL, RCB_IDS, REGULATION, YEAR, binomialP, dp, fmt, inRange, reconcile, sampleFloor, wilson } from "../lib";

export default function build(ev: Evidence) {
  const DS = "CricField warehouse: matches ⨝ innings ⨝ deliveries ⨝ venues (Cricsheet, IPL 2008–2026)";
  const CHINNA = "(SELECT venue_id FROM venues WHERE name LIKE '%Chinnaswamy%')";

  // ── Venue profile: Chinnaswamy vs every other IPL venue ──
  const profSql = (era: string) => `
    SELECT CASE WHEN m.venue_id IN ${CHINNA} THEN 'chinnaswamy' ELSE 'other' END venue,
      COUNT(DISTINCT m.match_id) matches,
      SUM(d.total_runs) * 6.0 / SUM(CASE WHEN ${LEGAL} THEN 1 END) rr,
      SUM(CASE WHEN d.batter_runs = 6 THEN 1 ELSE 0 END) * 1.0 / COUNT(DISTINCT m.match_id) sixes_pm,
      SUM(CASE WHEN ${LEGAL} THEN 1 ELSE 0 END) balls
    FROM deliveries d JOIN innings i ON i.innings_id = d.innings_id JOIN matches m ON m.match_id = d.match_id
    WHERE ${REGULATION} ${era} GROUP BY venue`;
  const firstSql = (era: string) => `
    SELECT CASE WHEN m.venue_id IN ${CHINNA} THEN 'chinnaswamy' ELSE 'other' END venue,
      AVG(i.runs) avg_first, COUNT(*) n,
      SUM(CASE WHEN m.winner_id IS NOT NULL AND m.winner_id <> i.batting_team_id THEN 1 ELSE 0 END) chase_wins,
      SUM(CASE WHEN m.winner_id IS NOT NULL THEN 1 ELSE 0 END) decided
    FROM innings i JOIN matches m ON m.match_id = i.match_id
    WHERE i.innings_number = 1 ${era} GROUP BY venue`;
  const eras = [
    { id: "all", label: "2008–2026", where: "" },
    { id: "recent", label: "2023–2026", where: `AND ${YEAR()} BETWEEN 2023 AND 2026` },
  ];
  const profileRows: Record<string, string | number>[] = [];
  for (const era of eras) {
    const prof = ev.rows<{ venue: string; matches: number; rr: number; sixes_pm: number; balls: number }>(profSql(era.where));
    const first = ev.rows<{ venue: string; avg_first: number; n: number; chase_wins: number; decided: number }>(firstSql(era.where));
    for (const v of ["chinnaswamy", "other"]) {
      const p = prof.find((r) => r.venue === v)!;
      const f = first.find((r) => r.venue === v)!;
      const tag = `${v === "chinnaswamy" ? "chin" : "other"}-${era.id}`;
      ev.metric(`rr-${tag}`, { value: dp(p.rr, 2), display: fmt(p.rr, 2), label: `Run rate, ${v === "chinnaswamy" ? "Chinnaswamy" : "all other venues"}, ${era.label}`, unit: "runs per over", dataset: DS, filters: `Regulation innings, ${era.label}`, n: p.balls, nUnit: "legal balls", query: profSql(era.where), validate: inRange(p.rr, 6.5, 11.5, "match run rate") });
      ev.metric(`sixes-${tag}`, { value: dp(p.sixes_pm, 1), display: fmt(p.sixes_pm, 1), label: `Sixes per match, ${v === "chinnaswamy" ? "Chinnaswamy" : "all other venues"}, ${era.label}`, unit: "sixes per match", dataset: DS, filters: `Regulation innings, ${era.label}`, n: p.matches, nUnit: "matches", query: profSql(era.where), validate: sampleFloor(p.matches, 20, "matches") });
      ev.metric(`first-${tag}`, { value: dp(f.avg_first, 0), display: fmt(f.avg_first, 0), label: `Average first-innings score, ${v === "chinnaswamy" ? "Chinnaswamy" : "all other venues"}, ${era.label}`, unit: "runs", dataset: DS, filters: `First innings, ${era.label}`, n: f.n, nUnit: "innings", query: firstSql(era.where), validate: sampleFloor(f.n, 20, "innings") });
      ev.metric(`chase-${tag}`, { value: dp((f.chase_wins / f.decided) * 100), display: `${fmt((f.chase_wins / f.decided) * 100)}%`, label: `Chasing side's win rate, ${v === "chinnaswamy" ? "Chinnaswamy" : "all other venues"}, ${era.label}`, unit: "%", dataset: DS, filters: `Matches with a result, ${era.label}`, n: f.decided, nUnit: "matches", query: firstSql(era.where), validate: sampleFloor(f.decided, 20, "matches") });
      if (era.id === "all") ev.metric(`matches-${tag}`, { value: p.matches, display: String(p.matches), label: `Matches at ${v === "chinnaswamy" ? "Chinnaswamy" : "other venues"} in the warehouse`, dataset: DS, filters: "2008–2026; fixtures abandoned without a ball are absent from the source", n: p.matches, nUnit: "matches", query: profSql(""), validate: reconcile(p.matches, f.n, 0, "match count vs first-innings count") });
      profileRows.push({ venue: v === "chinnaswamy" ? "Chinnaswamy" : "Other venues", era: era.label, runRate: dp(p.rr, 2), sixesPerMatch: dp(p.sixes_pm, 1), avgFirstInnings: dp(f.avg_first, 0), chaseWinPct: dp((f.chase_wins / f.decided) * 100) });
    }
  }
  ev.table("venue-profile", { label: "Chinnaswamy vs all other IPL venues", dataset: DS, filters: "Regulation innings; 2008–2026 and 2023–2026", n: profileRows.length, nUnit: "rows", query: profSql("") + " ;; " + firstSql(""), rows: profileRows });

  // ── Season series: first-innings average at Chinnaswamy vs the league ──
  const seasonSql = `
    SELECT ${YEAR()} year,
      AVG(CASE WHEN m.venue_id IN ${CHINNA} THEN i.runs END) chin,
      AVG(i.runs) league,
      SUM(CASE WHEN m.venue_id IN ${CHINNA} THEN 1 ELSE 0 END) chin_n
    FROM innings i JOIN matches m ON m.match_id = i.match_id
    WHERE i.innings_number = 1 GROUP BY year HAVING chin_n > 0 ORDER BY year`;
  const seasons = ev.rows<{ year: number; chin: number; league: number; chin_n: number }>(seasonSql);
  ev.table("first-innings-by-season", { label: "Average first-innings score: Chinnaswamy vs IPL", dataset: DS, filters: "First innings; seasons in which Chinnaswamy hosted (none in 2009, 2020–2022)", n: seasons.reduce((a, r) => a + r.chin_n, 0), nUnit: "Chinnaswamy first innings", query: seasonSql, rows: seasons.map((r) => ({ season: String(r.year), chinnaswamy: dp(r.chin, 0), league: dp(r.league, 0), matches: r.chin_n })) });
  const above = seasons.filter((r) => r.chin > r.league).length;
  ev.metric("seasons-above", { value: above, display: String(above), label: "Seasons with a higher first-innings average at Chinnaswamy than the league", dataset: DS, filters: "Seasons Chinnaswamy hosted", n: seasons.length, nUnit: "seasons", query: seasonSql, validate: sampleFloor(seasons.length, 12, "seasons") });
  ev.metric("seasons-hosted", { value: seasons.length, display: String(seasons.length), label: "IPL seasons with matches at Chinnaswamy in the warehouse", dataset: DS, filters: "2008–2026", n: seasons.length, nUnit: "seasons", query: seasonSql, validate: inRange(seasons.length, 10, 19, "seasons hosted") });

  // ── RCB at home vs away ──
  const haSql = `
    SELECT CASE WHEN m.venue_id IN ${CHINNA} THEN 'home' ELSE 'away' END loc,
      CASE WHEN ${YEAR()} >= 2023 THEN 'recent' ELSE 'early' END era,
      SUM(CASE WHEN m.winner_id IN ${RCB_IDS} THEN 1 ELSE 0 END) won, COUNT(*) n
    FROM matches m WHERE (m.team1_id IN ${RCB_IDS} OR m.team2_id IN ${RCB_IDS}) AND m.winner_id IS NOT NULL
    GROUP BY loc, era`;
  const ha = ev.rows<{ loc: string; era: string; won: number; n: number }>(haSql);
  const agg = (loc: string, era?: string) => ha.filter((r) => r.loc === loc && (!era || r.era === era)).reduce((a, r) => ({ won: a.won + r.won, n: a.n + r.n }), { won: 0, n: 0 });
  const rows: Record<string, string | number>[] = [];
  for (const [era, label] of [[undefined, "2008–2026"], ["early", "2008–2022"], ["recent", "2023–2026"]] as const) {
    const h = agg("home", era), a = agg("away", era);
    rows.push({ period: label, home: dp((h.won / h.n) * 100), away: dp((a.won / a.n) * 100), homeMatches: h.n, awayMatches: a.n });
    const tag = era ?? "all";
    ev.metric(`rcb-home-${tag}`, { value: dp((h.won / h.n) * 100), display: `${fmt((h.won / h.n) * 100)}%`, label: `RCB win rate at Chinnaswamy, ${label}`, unit: "%", dataset: DS, filters: `RCB matches with a result at Chinnaswamy, ${label}`, n: h.n, nUnit: "matches", query: haSql, validate: sampleFloor(h.n, 20, "matches") });
    ev.metric(`rcb-away-${tag}`, { value: dp((a.won / a.n) * 100), display: `${fmt((a.won / a.n) * 100)}%`, label: `RCB win rate away from Chinnaswamy, ${label}`, unit: "%", dataset: DS, filters: `RCB matches with a result elsewhere, ${label}`, n: a.n, nUnit: "matches", query: haSql, validate: sampleFloor(a.n, 20, "matches") });
    ev.metric(`rcb-home-n-${tag}`, { value: h.n, display: String(h.n), label: `RCB decided matches at Chinnaswamy, ${label}`, dataset: DS, filters: label, n: h.n, nUnit: "matches", query: haSql, validate: sampleFloor(h.n, 20, "matches") });
    if (!era) {
      const [lo, hi] = wilson(h.won, h.n);
      ev.metric("rcb-home-ci", { value: `${dp(lo * 100)}–${dp(hi * 100)}`, display: `${fmt(lo * 100, 0)}–${fmt(hi * 100, 0)}%`, label: "95% interval for RCB's home win rate", unit: "%", dataset: DS, filters: "Wilson score interval", n: h.n, nUnit: "matches", query: haSql, validate: { method: "interval contains point estimate", passed: lo <= h.won / h.n && h.won / h.n <= hi } });
      const p = binomialP(h.won, h.n);
      ev.metric("rcb-home-p", { value: dp(p, 2), display: fmt(p, 2), label: "Probability of a home record this far from 50/50 by chance (two-sided binomial)", dataset: DS, filters: "H0: win probability 0.5", n: h.n, nUnit: "matches", query: haSql, validate: inRange(p, 0, 1, "p-value") });
    }
  }
  ev.table("rcb-home-away", { label: "RCB win rate at Chinnaswamy vs elsewhere", dataset: DS, filters: "RCB matches with a result (no-results excluded)", n: agg("home").n + agg("away").n, nUnit: "matches", query: haSql, rows });

  // ── Toss behaviour at Chinnaswamy ──
  const tossSql = `
    SELECT SUM(CASE WHEN toss_decision = 'field' THEN 1 ELSE 0 END) field, COUNT(*) n
    FROM matches m WHERE m.venue_id IN ${CHINNA} AND ${YEAR()} >= 2023`;
  const toss = ev.one<{ field: number; n: number }>(tossSql);
  ev.metric("toss-field-recent", { value: dp((toss.field / toss.n) * 100), display: `${fmt((toss.field / toss.n) * 100, 0)}%`, label: "Toss winners choosing to bowl first at Chinnaswamy, 2023–2026", unit: "%", dataset: DS, filters: "Chinnaswamy matches, 2023–2026", n: toss.n, nUnit: "matches", query: tossSql, validate: sampleFloor(toss.n, 20, "matches") });
}
