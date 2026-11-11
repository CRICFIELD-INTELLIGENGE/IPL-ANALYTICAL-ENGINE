// The Business of Belonging — how attention and results relate to RCB's brand value.
// External figures are transcribed from Houlihan Lokey's own press releases (primary source) and
// recorded with their URL; CricField computes only the on-field side and the comparisons.
import { Evidence, YEAR, dp, fmt, inRange, pearson } from "../lib";
import { FRANCHISE_TEAM_IDS } from "../franchises";

const HL_2025 = "https://hl.com/media/x1kcmcty/houlihan-lokey-ipl-2025-valuation-study.pdf";
const HL_2026 = "https://hl.com/media/20mp5jrj/hl-ipl-valuation-study-2026-press-release.pdf";
// Brand values, US$ million, as printed in the releases (8 July 2025; 29 July 2026). Checked 2026-10-25.
const BRAND: Record<string, { y2025: number; y2026: number }> = {
  RCB: { y2025: 269, y2026: 312 },
  MI: { y2025: 242, y2026: 264 },
  KKR: { y2025: 227, y2026: 245 },
  CSK: { y2025: 235, y2026: 244 },
  SRH: { y2025: 154, y2026: 168 },
  RR: { y2025: 146, y2026: 161 },
  PBKS: { y2025: 141, y2026: 158 },
  GT: { y2025: 142, y2026: 157 },
  DC: { y2025: 152, y2026: 156 },
  LSG: { y2025: 122, y2026: 122 },
};
const RCB_2024 = 227; // 2025 release: "up from US$227 million a year ago"

export default function build(ev: Evidence) {
  const EXT = "Houlihan Lokey IPL Brand Valuation Study press releases (2025, 2026)";
  const DS = "CricField warehouse: matches (Cricsheet, IPL 2008–2026)";
  const ext = (detail: string) => ({ method: "transcribed from primary source; re-read against the release text on 2026-10-25", passed: true, detail });

  ev.metric("rcb-brand-2024", { value: RCB_2024, display: `US$${RCB_2024}m`, label: "RCB brand value, 2024 study", unit: "US$ million", dataset: EXT, filters: HL_2025, n: 1, nUnit: "published estimate", query: "external", validate: ext("2025 release, p.1") });
  ev.metric("rcb-brand-2025", { value: BRAND.RCB.y2025, display: `US$${BRAND.RCB.y2025}m`, label: "RCB brand value, 2025 study", unit: "US$ million", dataset: EXT, filters: HL_2025, n: 1, nUnit: "published estimate", query: "external", validate: ext("2025 release, p.1–2") });
  ev.metric("rcb-brand-2026", { value: BRAND.RCB.y2026, display: `US$${BRAND.RCB.y2026}m`, label: "RCB brand value, 2026 study", unit: "US$ million", dataset: EXT, filters: HL_2026, n: 1, nUnit: "published estimate", query: "external", validate: ext("2026 release, p.3") });
  const g25 = (BRAND.RCB.y2025 / RCB_2024 - 1) * 100, g26 = (BRAND.RCB.y2026 / BRAND.RCB.y2025 - 1) * 100;
  ev.metric("rcb-brand-growth-2025", { value: dp(g25), display: `${fmt(g25)}%`, label: "RCB brand value growth, 2024→2025 study", unit: "%", dataset: EXT, filters: "Derived from the two published values", n: 2, nUnit: "published estimates", query: "external", validate: inRange(g25, 0, 50, "growth") });
  ev.metric("rcb-brand-growth-2026", { value: dp(g26), display: `${fmt(g26)}%`, label: "RCB brand value growth, 2025→2026 study", unit: "%", dataset: EXT, filters: "Derived; the 2026 release itself states 16.0%", n: 2, nUnit: "published estimates", query: "external", validate: { method: "matches the release's own stated growth (16.0%)", passed: Math.abs(g26 - 16.0) < 0.1, detail: fmt(g26, 2) } });
  ev.metric("rcb-transaction", { value: 1.78, display: "US$1.78bn", label: "Reported valuation of the 2026 RCB ownership transaction", unit: "US$ billion", dataset: EXT, filters: HL_2026, n: 1, nUnit: "reported figure", query: "external", validate: ext("2026 release, p.1 ('reported valuation')") });
  ev.metric("ipl-business-2026", { value: 20.6, display: "US$20.6bn", label: "IPL business value, 2026 study", unit: "US$ billion", dataset: EXT, filters: HL_2026, n: 1, nUnit: "published estimate", query: "external", validate: ext("2026 release, p.1") });
  ev.metric("ipl-brand-2026", { value: 4.3, display: "US$4.3bn", label: "IPL stand-alone brand value, 2026 study", unit: "US$ billion", dataset: EXT, filters: HL_2026, n: 1, nUnit: "published estimate", query: "external", validate: ext("2026 release, p.1") });
  ev.metric("mi-finish-2026", { value: "ninth", display: "ninth", label: "MI's 2026 league finish as stated in the 2026 study", dataset: EXT, filters: HL_2026, n: 1, nUnit: "statement", query: "external", validate: ext("2026 release, p.3") });

  // ── On-field side, per franchise ──
  const champSql = `SELECT m.season_id, m.winner_id FROM matches m WHERE m.date = (SELECT MAX(x.date) FROM matches x WHERE x.season_id = m.season_id)`;
  const champs = ev.rows<{ season_id: string; winner_id: number }>(champSql);
  const recSql = (ids: number[], from: number, to: number) => `
    SELECT SUM(CASE WHEN m.winner_id IN (${ids}) THEN 1 ELSE 0 END) won, COUNT(*) n
    FROM matches m WHERE (m.team1_id IN (${ids}) OR m.team2_id IN (${ids})) AND m.winner_id IS NOT NULL AND ${YEAR()} BETWEEN ${from} AND ${to}`;
  const rows = Object.entries(BRAND).map(([code, b]) => {
    const ids = FRANCHISE_TEAM_IDS[code];
    const titles = champs.filter((c) => ids.includes(c.winner_id)).length;
    const r26 = ev.one<{ won: number; n: number }>(recSql(ids, 2026, 2026));
    const rAll = ev.one<{ won: number; n: number }>(recSql(ids, 2008, 2026));
    return { franchise: code, brand2026: b.y2026, brand2025: b.y2025, growthPct: dp((b.y2026 / b.y2025 - 1) * 100), titles, win2026: dp((r26.won / r26.n) * 100), matches2026: r26.n, winAllTime: dp((rAll.won / rAll.n) * 100) };
  });
  rows.sort((a, b) => b.brand2026 - a.brand2026);
  ev.table("brand-vs-field", {
    label: "Brand value (Houlihan Lokey) vs on-field record (CricField)",
    dataset: `${EXT}; ${DS}`,
    filters: "Titles = winner of each season's final match 2008–2026; win rates exclude no-results",
    n: rows.length,
    nUnit: "franchises",
    query: `${champSql} ;; ${recSql([0], 2026, 2026)}`,
    rows,
  });
  const cTitles = pearson(rows.map((r) => r.brand2026), rows.map((r) => r.titles));
  const cWin26 = pearson(rows.map((r) => r.brand2026), rows.map((r) => r.win2026));
  const cGrowth = pearson(rows.map((r) => r.growthPct), rows.map((r) => r.win2026));
  ev.metric("corr-brand-titles", { value: dp(cTitles, 2), display: fmt(cTitles, 2), label: "Correlation: 2026 brand value vs titles won", dataset: `${EXT}; ${DS}`, filters: "Ten current franchises", n: 10, nUnit: "franchises", query: champSql, validate: { method: "n = 10 franchises; descriptive only, no significance claimed", passed: rows.length === 10 } });
  ev.metric("corr-brand-win2026", { value: dp(cWin26, 2), display: fmt(cWin26, 2), label: "Correlation: 2026 brand value vs 2026 win rate", dataset: `${EXT}; ${DS}`, filters: "Ten current franchises", n: 10, nUnit: "franchises", query: recSql([0], 2026, 2026), validate: { method: "n = 10 franchises; descriptive only", passed: rows.length === 10 } });
  ev.metric("corr-growth-win2026", { value: dp(cGrowth, 2), display: fmt(cGrowth, 2), label: "Correlation: 2025→2026 brand growth vs 2026 win rate", dataset: `${EXT}; ${DS}`, filters: "Ten current franchises", n: 10, nUnit: "franchises", query: recSql([0], 2026, 2026), validate: { method: "n = 10 franchises; descriptive only", passed: rows.length === 10 } });
  const rcb = rows.find((r) => r.franchise === "RCB")!;
  const mi = rows.find((r) => r.franchise === "MI")!;
  ev.metric("rcb-titles", { value: rcb.titles, display: String(rcb.titles), label: "RCB IPL titles, 2008–2026", dataset: DS, filters: "Winner of each season's final match", n: champs.length, nUnit: "seasons", query: champSql, validate: { method: "finals 2025 and 2026 won by team_id 15", passed: rcb.titles === 2 } });
  ev.metric("rcb-win-2026", { value: rcb.win2026, display: `${fmt(rcb.win2026)}%`, label: "RCB win rate, 2026", unit: "%", dataset: DS, filters: "Matches with a result", n: rcb.matches2026, nUnit: "matches", query: recSql(FRANCHISE_TEAM_IDS.RCB, 2026, 2026), validate: inRange(rcb.win2026, 0, 100, "win rate") });
  ev.metric("mi-titles", { value: mi.titles, display: String(mi.titles), label: "MI IPL titles, 2008–2026", dataset: DS, filters: "Winner of each season's final match", n: champs.length, nUnit: "seasons", query: champSql, validate: { method: "five titles per the 2026 release", passed: mi.titles === 5 } });
  ev.metric("mi-win-2026", { value: mi.win2026, display: `${fmt(mi.win2026)}%`, label: "MI win rate, 2026", unit: "%", dataset: DS, filters: "Matches with a result", n: mi.matches2026, nUnit: "matches", query: recSql(FRANCHISE_TEAM_IDS.MI, 2026, 2026), validate: inRange(mi.win2026, 0, 100, "win rate") });
  ev.metric("mi-brand-2026", { value: mi.brand2026, display: `US$${mi.brand2026}m`, label: "MI brand value, 2026 study", unit: "US$ million", dataset: EXT, filters: HL_2026, n: 1, nUnit: "published estimate", query: "external", validate: ext("2026 release, p.3") });
  const lsg = rows.find((r) => r.franchise === "LSG")!;
  ev.metric("lsg-brand-2026", { value: lsg.brand2026, display: `US$${lsg.brand2026}m`, label: "LSG brand value, 2026 study (flat on 2025)", unit: "US$ million", dataset: EXT, filters: HL_2026, n: 1, nUnit: "published estimate", query: "external", validate: ext("2026 release, p.3") });
  const gap = BRAND.RCB.y2026 - BRAND.MI.y2026;
  ev.metric("rcb-mi-gap", { value: gap, display: `US$${gap}m`, label: "RCB's brand-value lead over second-placed MI, 2026", unit: "US$ million", dataset: EXT, filters: "Derived", n: 2, nUnit: "published estimates", query: "external", validate: inRange(gap, 0, 200, "gap") });
}
