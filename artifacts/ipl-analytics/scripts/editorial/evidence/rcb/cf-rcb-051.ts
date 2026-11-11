// Why Fans Stay — the results record RCB supporters lived through. CricField can measure the
// cricket; it cannot measure loyalty, so every psychological claim in the article is a cited
// study or a labelled hypothesis, never a number from this file.
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { Evidence, RCB_IDS, ROOT, YEAR, dp, fmt, inRange } from "../lib";

type PT = { position: number; teamCode: string; played: number; wins: number; qualified: boolean; result: string | null };

export default function build(ev: Evidence) {
  const DS = "CricField warehouse: matches (Cricsheet, IPL 2008–2026) + CricField points-tables.json (league stage)";
  const pts = JSON.parse(readFileSync(resolve(ROOT, "artifacts/api-server/data/points-tables.json"), "utf8")) as Record<string, PT[]>;

  const seasonSql = `
    SELECT ${YEAR()} year, COUNT(*) n, SUM(CASE WHEN m.winner_id IN ${RCB_IDS} THEN 1 ELSE 0 END) won
    FROM matches m WHERE (m.team1_id IN ${RCB_IDS} OR m.team2_id IN ${RCB_IDS}) AND m.winner_id IS NOT NULL GROUP BY year ORDER BY year`;
  const finalSql = `
    SELECT ${YEAR()} year, m.winner_id IN ${RCB_IDS} won FROM matches m
    WHERE m.date = (SELECT MAX(x.date) FROM matches x WHERE x.season_id = m.season_id) AND (m.team1_id IN ${RCB_IDS} OR m.team2_id IN ${RCB_IDS})`;
  const seasons = ev.rows<{ year: number; n: number; won: number }>(seasonSql);
  const finals = ev.rows<{ year: number; won: number }>(finalSql);
  let mismatch = 0;
  const rows = seasons.map((s) => {
    const t = (pts[String(s.year)] ?? []).find((r) => r.teamCode === "RCB");
    if (!t || t.wins > s.won || Boolean(t.result) !== t.position <= 4) mismatch++;
    const f = finals.find((x) => x.year === s.year);
    const outcome = f ? (f.won ? "Champions" : "Runners-up") : t?.result ? "Playoffs" : "League stage";
    return { season: String(s.year), winPct: dp((s.won / s.n) * 100), leaguePosition: t?.position ?? null, outcome };
  });
  ev.table("rcb-seasons", { label: "RCB season by season: win rate and finish", dataset: DS, filters: "All matches with a result (league + playoffs); position = league-stage table", n: seasons.reduce((a, s) => a + s.n, 0), nUnit: "matches", query: `${seasonSql} ;; ${finalSql}`, rows });
  const check = { method: "points-table league wins never exceed warehouse wins (which add playoffs); playoff result set exactly for top-four finishes", passed: mismatch === 0, detail: `${mismatch} seasons inconsistent` };

  const pre = rows.filter((r) => Number(r.season) <= 2024);
  const losing = pre.filter((r) => r.winPct < 50).length;
  const playoffs = pre.filter((r) => r.outcome !== "League stage").length;
  const finalsLost = rows.filter((r) => r.outcome === "Runners-up").map((r) => r.season);
  ev.metric("wait-seasons", { value: pre.length, display: String(pre.length), label: "Seasons RCB played before their first title", dataset: DS, filters: "2008–2024", n: pre.length, nUnit: "seasons", query: finalSql, validate: check });
  ev.metric("losing-seasons", { value: losing, display: String(losing), label: "Seasons with a win rate below 50%, 2008–2024", dataset: DS, filters: "Matches with a result", n: pre.length, nUnit: "seasons", query: seasonSql, validate: inRange(losing, 0, 17, "season count") });
  ev.metric("playoff-seasons", { value: playoffs, display: String(playoffs), label: "Seasons reaching the playoffs, 2008–2024", dataset: DS, filters: "Points-table playoff result (Q = Qualifier 1, E = Eliminator) or final appearance", n: pre.length, nUnit: "seasons", query: finalSql, validate: check });
  ev.metric("finals-lost", { value: finalsLost.length, display: String(finalsLost.length), label: "Finals lost before the first title", dataset: DS, filters: "Season's last match involving RCB, lost", n: finals.length, nUnit: "finals played", query: finalSql, validate: { method: "expected 2009, 2011, 2016", passed: finalsLost.join(",") === "2009,2011,2016", detail: finalsLost.join(",") } });
  ev.metric("finals-lost-years", { value: finalsLost.join(", "), display: finalsLost.join(", "), label: "Years of lost finals", dataset: DS, filters: "As above", n: finalsLost.length, nUnit: "finals", query: finalSql, validate: { method: "matches known finals", passed: finalsLost.length === 3 } });
  const preMatches = seasons.filter((s) => s.year <= 2024).reduce((a, s) => ({ n: a.n + s.n, won: a.won + s.won }), { n: 0, won: 0 });
  ev.metric("pre-title-winpct", { value: dp((preMatches.won / preMatches.n) * 100), display: `${fmt((preMatches.won / preMatches.n) * 100)}%`, label: "RCB win rate across 2008–2024", unit: "%", dataset: DS, filters: "Matches with a result", n: preMatches.n, nUnit: "matches", query: seasonSql, validate: inRange(preMatches.won / preMatches.n, 0.3, 0.7, "win rate") });
  ev.metric("pre-title-matches", { value: preMatches.n, display: String(preMatches.n), label: "RCB matches with a result, 2008–2024", dataset: DS, filters: "Warehouse; abandoned-without-a-ball fixtures absent", n: preMatches.n, nUnit: "matches", query: seasonSql, validate: inRange(preMatches.n, 200, 300, "match count") });
  // Longest run of seasons without reaching the playoffs
  let longest = 0, run = 0, runEnd = "";
  for (const r of pre) {
    run = r.outcome === "League stage" ? run + 1 : 0;
    if (run > longest) (longest = run), (runEnd = r.season);
  }
  ev.metric("longest-drought", { value: longest, display: String(longest), label: "Longest run of consecutive seasons without a playoff place", dataset: DS, filters: "2008–2024", n: pre.length, nUnit: "seasons", query: finalSql, validate: inRange(longest, 1, 10, "run length") });
  ev.metric("longest-drought-end", { value: runEnd, display: runEnd, label: "Last season of that run", dataset: DS, filters: "2008–2024", n: pre.length, nUnit: "seasons", query: finalSql, validate: { method: "derived from season table", passed: !!runEnd } });
  const r2024 = rows.find((r) => r.season === "2024")!;
  ev.metric("pos-2024", { value: r2024.leaguePosition ?? 0, display: String(r2024.leaguePosition), label: "RCB league position, 2024", dataset: DS, filters: "points-tables.json", n: 1, nUnit: "season", query: "points-tables.json", validate: check });
}
