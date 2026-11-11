// Salary Versus Contribution — a transparent auction ROI model for RCB.
// Contribution = tempo runs above average (tRAA): batting runs above what an average batter would
// score from the same balls in the same season and phase, plus bowling runs saved against the
// average bowler in the same season and phase. Wickets and dismissals are deliberately left out
// of this first model and discussed in the article as its main limitation.
import { BOWLER_RUNS, Evidence, LEGAL, RCB_IDS, REGULATION, YEAR, dp, fmt, inRange, pearson, rcbSquad, sampleFloor } from "../lib";

export default function build(ev: Evidence) {
  const DS = "CricField warehouse (deliveries ⨝ innings ⨝ matches) + CricField squads-by-season.json (auction/retention prices)";
  const YEARS = [2022, 2023, 2024, 2025, 2026];

  const baseSql = `
    SELECT ${YEAR()} year, d.phase,
      SUM(d.batter_runs) * 1.0 / SUM(CASE WHEN d.is_wide = 0 THEN 1 ELSE 0 END) bat_rpb,
      SUM(${BOWLER_RUNS}) * 1.0 / SUM(CASE WHEN ${LEGAL} THEN 1 ELSE 0 END) bowl_rpb
    FROM deliveries d JOIN innings i ON i.innings_id = d.innings_id JOIN matches m ON m.match_id = d.match_id
    WHERE ${REGULATION} AND ${YEAR()} BETWEEN 2022 AND 2026 GROUP BY year, d.phase`;
  const base = new Map(ev.rows<{ year: number; phase: string; bat_rpb: number; bowl_rpb: number }>(baseSql).map((r) => [`${r.year}|${r.phase}`, r]));

  const batSql = `
    SELECT ${YEAR()} year, p.name, d.phase, SUM(d.batter_runs) runs, SUM(CASE WHEN d.is_wide = 0 THEN 1 ELSE 0 END) balls
    FROM deliveries d JOIN innings i ON i.innings_id = d.innings_id JOIN matches m ON m.match_id = d.match_id JOIN players p ON p.player_id = d.batter_id
    WHERE ${REGULATION} AND i.batting_team_id IN ${RCB_IDS} AND ${YEAR()} BETWEEN 2022 AND 2026 GROUP BY year, p.name, d.phase`;
  const bowlSql = `
    SELECT ${YEAR()} year, p.name, d.phase, SUM(${BOWLER_RUNS}) runs, SUM(CASE WHEN ${LEGAL} THEN 1 ELSE 0 END) balls
    FROM deliveries d JOIN innings i ON i.innings_id = d.innings_id JOIN matches m ON m.match_id = d.match_id JOIN players p ON p.player_id = d.bowler_id
    WHERE ${REGULATION} AND i.bowling_team_id IN ${RCB_IDS} AND ${YEAR()} BETWEEN 2022 AND 2026 GROUP BY year, p.name, d.phase`;
  const contrib = new Map<string, { bat: number; bowl: number; balls: number }>();
  const add = (k: string, f: "bat" | "bowl", v: number, balls: number) => {
    const c = contrib.get(k) ?? { bat: 0, bowl: 0, balls: 0 };
    c[f] += v;
    c.balls += balls;
    contrib.set(k, c);
  };
  for (const r of ev.rows<{ year: number; name: string; phase: string; runs: number; balls: number }>(batSql)) add(`${r.year}|${r.name}`, "bat", r.runs - r.balls * base.get(`${r.year}|${r.phase}`)!.bat_rpb, r.balls);
  for (const r of ev.rows<{ year: number; name: string; phase: string; runs: number; balls: number }>(bowlSql)) add(`${r.year}|${r.name}`, "bowl", r.balls * base.get(`${r.year}|${r.phase}`)!.bowl_rpb - r.runs, r.balls);

  type Row = { year: number; player: string; crore: number; acquisition: string; traa: number; bat: number; bowl: number; balls: number };
  const rows: Row[] = [];
  let unmatched = 0, priced = 0;
  for (const y of YEARS) {
    for (const p of rcbSquad(y)) {
      if (p.priceLakh == null) continue;
      priced++;
      const c = contrib.get(`${y}|${p.cricsheetName}`);
      if (!c && p.played) unmatched++;
      rows.push({ year: y, player: p.name, crore: p.priceLakh / 100, acquisition: p.acquisition, traa: c ? c.bat + c.bowl : 0, bat: c?.bat ?? 0, bowl: c?.bowl ?? 0, balls: c?.balls ?? 0 });
    }
  }
  const q = `${baseSql} ;; ${batSql} ;; ${bowlSql}`;
  ev.metric("priced-player-seasons", { value: priced, display: String(priced), label: "Priced RCB player-seasons, 2022–2026", dataset: DS, filters: "Squad members with a recorded auction or retention price", n: priced, nUnit: "player-seasons", query: q, validate: { method: "every squad member marked 'played' matched to ball-by-ball data by Cricsheet name", passed: unmatched === 0, detail: `${unmatched} played-but-unmatched` } });
  const used = rows.filter((r) => r.balls > 0);
  const r = pearson(used.map((x) => x.crore), used.map((x) => x.traa));
  ev.metric("price-traa-corr", { value: dp(r, 2), display: fmt(r, 2), label: "Correlation between price and tRAA (RCB player-seasons that played)", dataset: DS, filters: "2022–2026, player-seasons with ≥ 1 ball", n: used.length, nUnit: "player-seasons", query: q, validate: sampleFloor(used.length, 60, "player-seasons") });

  const spend = (rs: Row[]) => rs.reduce((a, x) => a + x.crore, 0);
  const sumT = (rs: Row[]) => rs.reduce((a, x) => a + x.traa, 0);
  // Price tiers
  const tiers = [
    { id: "top", label: "₹10 Cr and above", f: (x: Row) => x.crore >= 10 },
    { id: "mid", label: "₹2–10 Cr", f: (x: Row) => x.crore >= 2 && x.crore < 10 },
    { id: "low", label: "Under ₹2 Cr", f: (x: Row) => x.crore < 2 },
  ];
  const tierRows = tiers.map((t) => {
    const rs = rows.filter(t.f);
    return { tier: t.label, playerSeasons: rs.length, spendCr: dp(spend(rs), 1), tRAA: dp(sumT(rs), 0), tRAAperCrore: dp(sumT(rs) / spend(rs), 1) };
  });
  ev.table("tier-roi", { label: "Contribution per crore by price tier, RCB 2022–2026", dataset: DS, filters: "All priced squad members (non-playing members count at zero contribution)", n: rows.length, nUnit: "player-seasons", query: q, rows: tierRows });
  for (const t of tierRows) {
    const id = tiers.find((x) => x.label === t.tier)!.id;
    ev.metric(`tier-${id}-per-cr`, { value: t.tRAAperCrore, display: fmt(t.tRAAperCrore, 1), label: `tRAA per crore, ${t.tier}`, unit: "runs per ₹1 Cr", dataset: DS, filters: "RCB 2022–2026", n: t.playerSeasons, nUnit: "player-seasons", query: q, validate: sampleFloor(t.playerSeasons, 15, "player-seasons") });
    ev.metric(`tier-${id}-spend`, { value: t.spendCr, display: `₹${fmt(t.spendCr, 0)} Cr`, label: `Total price, ${t.tier}, 2022–2026`, unit: "₹ crore", dataset: DS, filters: "Sum of season prices", n: t.playerSeasons, nUnit: "player-seasons", query: q, validate: inRange(t.spendCr, 1, 600, "spend") });
  }
  const benchPaid = rows.filter((x) => x.balls === 0);
  ev.metric("unused-spend", { value: dp(spend(benchPaid), 1), display: `₹${fmt(spend(benchPaid), 1)} Cr`, label: "Price of squad members who did not bowl or face a ball that season", unit: "₹ crore", dataset: DS, filters: "RCB 2022–2026", n: benchPaid.length, nUnit: "player-seasons", query: q, validate: inRange(spend(benchPaid), 0, 200, "bench spend") });
  ev.metric("unused-count", { value: benchPaid.length, display: String(benchPaid.length), label: "Priced player-seasons with no ball faced or bowled", dataset: DS, filters: "RCB 2022–2026", n: rows.length, nUnit: "player-seasons", query: q, validate: { method: "subset of priced rows", passed: benchPaid.length < rows.length } });

  // Scatter for the last two seasons + best/worst value lists
  const recent = rows.filter((x) => x.year >= 2025 && x.balls > 0);
  ev.table("scatter-2025-26", { label: "Price vs contribution, RCB 2025–2026", dataset: DS, filters: "Player-seasons with at least one ball faced or bowled", n: recent.length, nUnit: "player-seasons", query: q, rows: recent.map((x) => ({ player: `${x.player} (${x.year})`, priceCr: dp(x.crore, 2), tRAA: dp(x.traa, 0) })) });
  const ranked = rows.filter((x) => x.balls >= 120).map((x) => ({ ...x, per: x.traa / x.crore })).sort((a, b) => b.traa - a.traa);
  ev.table("top-contributors", { label: "Largest tRAA, RCB 2022–2026 (min. 120 balls in the season)", dataset: DS, filters: "Player-seasons with ≥ 120 balls faced + bowled", n: ranked.length, nUnit: "player-seasons", query: q, rows: ranked.slice(0, 8).map((x) => ({ player: x.player, season: String(x.year), priceCr: dp(x.crore, 2), batting: dp(x.bat, 0), bowling: dp(x.bowl, 0), tRAA: dp(x.traa, 0) })) });
  const bestPer = [...ranked].sort((a, b) => b.per - a.per)[0];
  ev.metric("best-value-player", { value: `${bestPer.player} (${bestPer.year})`, display: `${bestPer.player} (${bestPer.year})`, label: "Highest tRAA per crore (min. 120 balls)", dataset: DS, filters: "RCB 2022–2026", n: ranked.length, nUnit: "player-seasons", query: q, validate: { method: "rank over filtered rows", passed: ranked.length > 10 } });
  ev.metric("best-value-per-cr", { value: dp(bestPer.per, 0), display: fmt(bestPer.per, 0), label: `tRAA per crore, ${bestPer.player} (${bestPer.year})`, unit: "runs per ₹1 Cr", dataset: DS, filters: "RCB 2022–2026", n: bestPer.balls, nUnit: "balls", query: q, validate: sampleFloor(bestPer.balls, 120, "balls") });
  const top = ranked[0];
  ev.metric("top-traa-player", { value: `${top.player} (${top.year})`, display: `${top.player} (${top.year})`, label: "Largest single-season tRAA", dataset: DS, filters: "RCB 2022–2026", n: ranked.length, nUnit: "player-seasons", query: q, validate: { method: "rank over filtered rows", passed: true } });
  ev.metric("top-traa", { value: dp(top.traa, 0), display: fmt(top.traa, 0), label: `tRAA, ${top.player} (${top.year})`, unit: "runs", dataset: DS, filters: "RCB 2022–2026", n: top.balls, nUnit: "balls", query: q, validate: sampleFloor(top.balls, 120, "balls") });
  ev.metric("top-traa-price", { value: dp(top.crore, 2), display: `₹${fmt(top.crore, 2)} Cr`, label: `Price, ${top.player} (${top.year})`, unit: "₹ crore", dataset: DS, filters: "squads-by-season.json", n: 1, nUnit: "player-season", query: q, validate: inRange(top.crore, 0.2, 30, "price") });
  // The model's blind spot, shown on its most famous case.
  const kohli = rows.find((x) => x.year === 2025 && x.player === "Virat Kohli");
  if (kohli) {
    ev.metric("kohli-2025-traa", { value: dp(kohli.traa, 0), display: fmt(kohli.traa, 0), label: "Virat Kohli tRAA, 2025", unit: "runs", dataset: DS, filters: "RCB 2025", n: kohli.balls, nUnit: "balls", query: q, validate: sampleFloor(kohli.balls, 300, "balls") });
    ev.metric("kohli-2025-price", { value: dp(kohli.crore, 2), display: `₹${fmt(kohli.crore, 0)} Cr`, label: "Virat Kohli retention price, 2025", unit: "₹ crore", dataset: DS, filters: "squads-by-season.json", n: 1, nUnit: "player-season", query: q, validate: inRange(kohli.crore, 10, 30, "price") });
  }
  const patidar26 = rows.find((x) => x.year === 2026 && x.player === "Rajat Patidar");
  if (patidar26) ev.metric("patidar-2026-traa", { value: dp(patidar26.traa, 0), display: fmt(patidar26.traa, 0), label: "Rajat Patidar tRAA, 2026", unit: "runs", dataset: DS, filters: "RCB 2026", n: patidar26.balls, nUnit: "balls", query: q, validate: sampleFloor(patidar26.balls, 120, "balls") });
  const patidar24 = rows.find((x) => x.year === 2024 && x.player === "Rajat Patidar");
  if (patidar24) {
    ev.metric("patidar-2024-traa", { value: dp(patidar24.traa, 0), display: fmt(patidar24.traa, 0), label: "Rajat Patidar tRAA, 2024", unit: "runs", dataset: DS, filters: "RCB 2024", n: patidar24.balls, nUnit: "balls", query: q, validate: sampleFloor(patidar24.balls, 120, "balls") });
    ev.metric("patidar-2024-price", { value: dp(patidar24.crore * 100, 0), display: `₹${fmt(patidar24.crore * 100, 0)} lakh`, label: "Rajat Patidar price, 2024", unit: "₹ lakh", dataset: DS, filters: "squads-by-season.json", n: 1, nUnit: "player-season", query: q, validate: inRange(patidar24.crore, 0.1, 30, "price") });
  }
  const totalT = sumT(rows), totalS = spend(rows);
  ev.metric("total-spend", { value: dp(totalS, 0), display: `₹${fmt(totalS, 0)} Cr`, label: "Total recorded squad price, 2022–2026", unit: "₹ crore", dataset: DS, filters: "Sum of season prices for priced squad members", n: rows.length, nUnit: "player-seasons", query: q, validate: inRange(totalS, 100, 800, "spend") });
  ev.metric("squad-traa-per-cr", { value: dp(totalT / totalS, 1), display: fmt(totalT / totalS, 1), label: "Squad-wide tRAA per crore, 2022–2026", unit: "runs per ₹1 Cr", dataset: DS, filters: "All priced squad members", n: rows.length, nUnit: "player-seasons", query: q, validate: inRange(totalS, 100, 800, "five-season spend (₹ Cr)") });
}
