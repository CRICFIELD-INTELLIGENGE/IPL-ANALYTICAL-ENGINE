// Tactical & Match Intelligence templates (plan slots 21–30).
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { ROOT } from "../../evidence/lib";
import { BOWLER_RUNS, FR_NAME, LEGAL, REGULATION, YEAR, derived, dp, floor, range, yearsLabel, type Row } from "../core";
import { eras, extremes, headToHead, homeGround, phaseBlock } from "../kit";
import { hyp, metaDesc, metaTitle, type SlotSpec } from "./types";

const METHOD = "Regulation innings only (super overs excluded); win rates use matches with a result. Generated from the CricField warehouse by scripts/editorial/engine.";

// ── 21. The Toss Illusion ─────────────────────────────────────────────────────
const s21: SlotSpec = {
  n: 21,
  storyType: "investigation",
  build(a) {
    const sql = `SELECT CASE WHEN m.team1_id IN ${a.T} OR m.team2_id IN ${a.T} THEN 1 ELSE 0 END inv, CASE WHEN m.toss_winner_id IN ${a.T} THEN 1 ELSE 0 END tw,
        m.toss_decision dec, CASE WHEN m.winner_id = m.toss_winner_id THEN 1 ELSE 0 END tossWon, CASE WHEN m.winner_id IN ${a.T} THEN 1 ELSE 0 END won, ${YEAR()} year
      FROM matches m WHERE m.winner_id IS NOT NULL`;
    const rs = a.rows<{ inv: number; tw: number; dec: string; tossWon: number; won: number; year: number }>(sql);
    const lg = rs.reduce((x, r) => ({ n: x.n + 1, w: x.w + r.tossWon }), { n: 0, w: 0 });
    const mine = rs.filter((r) => r.inv);
    const wonToss = mine.filter((r) => r.tw), lostToss = mine.filter((r) => !r.tw);
    const pc = (xs: typeof rs, f: (r: (typeof rs)[number]) => number) => (xs.reduce((x, r) => x + f(r), 0) / Math.max(1, xs.length)) * 100;
    const recentField = wonToss.filter((r) => r.year >= 2023);
    const tok = {
      lg: a.pct("toss-lg", (lg.w / lg.n) * 100, "Share of IPL matches won by the toss winner", { filters: "All matches with a result", n: lg.n, nUnit: "matches", sql, check: floor(lg.n, 500, "matches") }),
      won: a.pct("toss-won", pc(wonToss, (r) => r.won), `${a.code} win rate after winning the toss`, { filters: "Matches with a result", n: wonToss.length, nUnit: "matches", sql, check: floor(wonToss.length, 20, "matches") }),
      lost: a.pct("toss-lost", pc(lostToss, (r) => r.won), `${a.code} win rate after losing the toss`, { filters: "Matches with a result", n: lostToss.length, nUnit: "matches", sql, check: floor(lostToss.length, 20, "matches") }),
      field: a.pct("toss-field", pc(recentField, (r) => (r.dec === "field" ? 1 : 0)), `${a.code} choosing to bowl first after winning the toss, 2023–2026`, { filters: "Tosses won, 2023–2026", n: recentField.length, nUnit: "tosses", sql, check: floor(recentField.length, 5, "tosses") }, 0),
    };
    const fieldWon = wonToss.filter((r) => r.dec === "field"), batWon = wonToss.filter((r) => r.dec === "bat");
    a.table("toss-tab", `${a.code} win rate by toss outcome and choice`, "Matches with a result", mine.length, "matches", sql, [
      { situation: "Won toss, chose to bowl", winPct: fieldWon.length ? dp(pc(fieldWon, (r) => r.won)) : null, matches: fieldWon.length },
      { situation: "Won toss, chose to bat", winPct: batWon.length ? dp(pc(batWon, (r) => r.won)) : null, matches: batWon.length },
      { situation: "Lost toss", winPct: dp(pc(lostToss, (r) => r.won)), matches: lostToss.length },
    ]);
    const gap = pc(wonToss, (r) => r.won) - pc(lostToss, (r) => r.won);
    const matters = Math.abs(gap) >= 8;
    return {
      dek: `How much should ${a.name} change their plan after the coin flip? Their record after winning and losing the toss puts a number on the illusion.`,
      excerpt: `Across the IPL, toss winners have won ${"about"} as often as a coin would suggest. ${a.poss} own record after winning and losing the toss ${matters ? "shows a sizeable gap" : "shows only a small gap"}.`.replace(`${"about"} as often as a coin would suggest`, `${(lg.w / lg.n) * 100 >= 53 || (lg.w / lg.n) * 100 <= 47 ? "a little more or less often than half" : "close to half the time"}`),
      keyTakeaways: [
        `IPL toss winners have won ${tok.lg} of matches with a result.`,
        `${a.code} have won ${tok.won} after winning the toss and ${tok.lost} after losing it.`,
        `Since 2023, ${a.code} have chosen to bowl first in ${tok.field} of the tosses they won.`,
      ],
      sections: [
        { heading: "The Coin Flip and the Plan", body: [
          `Captains talk about the toss as if it decides matches. Across every IPL match with a result, the toss winner has won ${tok.lg} of the time.`,
          `${a.name} have won ${tok.won} of their matches after winning the toss and ${tok.lost} after losing it.`,
        ], chartIds: ["toss-chart"] },
        { heading: "Bat or Bowl", body: [
          `The choice after the toss is where plans change. Since 2023 ${a.code} have chosen to bowl first in ${tok.field} of the tosses they won.`,
          `The table splits ${a.poss} record by toss outcome and choice, which is the comparison a captain actually faces.`,
        ] },
        { heading: "Plans That Survive the Toss", body: [
          `A side whose results barely move with the toss has a plan that works either way. ${matters ? `${a.poss} gap between winning and losing the toss is large enough to suggest the plan leans on the call.` : `${a.poss} small gap suggests a plan that works whichever way the coin falls.`}`,
          `The practical aim is two prepared game plans, one for batting first and one for chasing, so the toss changes the order of execution rather than the strategy.`,
        ] },
        { heading: "Why the Toss Can Still Matter", body: [
          `League-wide averages hide venues and seasons where dew or pitch wear made chasing much easier. In those conditions the toss genuinely matters, even if it washes out across all matches.`,
          `{{hyp:venue}}`,
        ] },
        { heading: "CricField Verdict: Prepare Two Plans, Then Ignore the Coin", body: [
          `The evidence says the toss is a small edge across the league. ${a.name} should treat it as a choice of plan, not a change of plan.`,
          `Where conditions make chasing clearly easier, the choice is simple; elsewhere the side's strengths should decide it.`,
        ] },
      ],
      charts: [{ id: "toss-chart", type: "column", title: "Win rate by toss outcome and choice", subtitle: `${a.code}, matches with a result`, table: "toss-tab", xKey: "situation", series: [{ key: "winPct", label: "Win rate" }], xLabel: "Toss", unit: "% of matches won", takeaway: matters ? "The toss outcome moves the franchise's results noticeably." : "The toss outcome moves the franchise's results only a little.", ariaLabel: "Column chart of win rate after winning the toss and choosing to bowl or bat, and after losing the toss." }],
      hypotheses: [hyp("venue", "the toss is decisive at a small number of dew-affected venues and irrelevant elsewhere.", "Venue-by-venue toss effects have not been estimated for every ground.", "Compute toss-winner win rates by venue and season with intervals.")],
      players: [],
      seasons: [yearsLabel(a.c.firstYear, 2026), "2023–2026"],
      hero: { narrative: `The toss before a ${a.name} match.`, wanted: `${a.name} captain at the toss.`, query: `${a.name} captain toss` },
      related: [22, 30, 6],
      seo: { metaTitle: metaTitle(`The toss illusion: how much should ${a.code} care?`), metaDescription: metaDesc(`${a.poss} record after winning and losing the toss, their bat-or-bowl choices since 2023, and the league toss effect.`) },
      methodology: `${METHOD} Toss data from match records; no-results excluded.`,
    };
  },
};

// ── 22. Home-Ground Advantage ─────────────────────────────────────────────────
const s22: SlotSpec = {
  n: 22,
  storyType: "investigation",
  build(a) {
    const hg = homeGround(a, "hg");
    const t = hg.tok, v = hg.v;
    const H = a.c.homeSql;
    const sql = `SELECT ${YEAR()} year, AVG(CASE WHEN m.venue_id IN ${H} THEN i.runs END) home, AVG(i.runs) league, SUM(CASE WHEN m.venue_id IN ${H} THEN 1 ELSE 0 END) n
      FROM innings i JOIN matches m ON m.match_id = i.match_id WHERE i.innings_number = 1 GROUP BY year HAVING n > 0 ORDER BY year`;
    const rs = a.rows<{ year: number; home: number; league: number; n: number }>(sql);
    a.table("hg-series", `Average first-innings score: ${a.c.homeLabel} vs IPL`, "First innings; seasons in which the ground hosted", rs.reduce((x, r) => x + r.n, 0), "innings at the ground", sql, rs.map((r) => ({ season: String(r.year), ground: dp(r.home, 0), league: dp(r.league, 0) })));
    const homeEdge = v.homePct - v.awayPct;
    const edge = v.p < 0.05 ? (homeEdge > 0 ? "a real home advantage" : "a real home disadvantage") : "no statistically clear home advantage";
    const hi = v.rrH > v.rrO + 0.2, lo = v.rrH < v.rrO - 0.2;
    const character = hi ? "higher-scoring than" : lo ? "lower-scoring than" : "close to";
    return {
      dek: `${a.c.homeLabel} has its own character. Does it give ${a.name} an edge, or does it simply change the cricket for both sides?`,
      excerpt: `${a.c.homeLabel} has been ${character} the average IPL venue. ${a.poss} home record against their away record shows ${edge}.`,
      keyTakeaways: [
        `Run rate at ${a.c.homeLabel}: ${t.rrH}, against ${t.rrO} at other IPL venues.`,
        `${a.code} have won ${t.homePct} at home and ${t.awayPct} elsewhere; the ninety-five per cent interval on the home figure is ${t.ci}.`,
        `Toss winners at ${a.c.homeLabel} have chosen to bowl first ${t.fieldPct} of the time.`,
      ],
      sections: [
        { heading: `What Makes ${a.c.homeLabel} Different`, body: [
          `Across ${t.matches} matches in the CricField warehouse, ${a.c.homeLabel} has produced a run rate of ${t.rrH} against ${t.rrO} at other IPL venues, ${t.sixH} sixes per match against ${t.sixO}, and an average first-innings score of ${t.firstH} against ${t.firstO}.`,
          `Chasing sides have won ${t.chaseH} of decided matches there, against ${t.chaseO} elsewhere.`,
        ], chartIds: ["hg-series"] },
        { heading: "Does the Ground Favour the Home Side?", body: [
          `${a.name} have won ${t.homePct} of their ${t.homeN} decided matches at ${a.c.homeLabel} and ${t.awayPct} of matches elsewhere. The ninety-five per cent interval around the home figure is ${t.ci}; a home record at least this far from even would arise by chance with probability ${t.p}.`,
          `On this evidence there is ${edge} for ${a.code}.`,
        ], chartIds: ["hg-homeaway"] },
        { heading: "Turning Conditions Into an Edge", body: [
          `A distinctive ground only helps the home side if the squad is built for it in ways visitors cannot copy. Toss winners at ${a.c.homeLabel} have chosen to bowl first ${t.fieldPct} of the time, so the toss decision itself is rarely the edge.`,
          `The levers are squad composition and preparation: bowlers whose skills suit the surface and batters who know where the scoring areas are.`,
        ] },
        { heading: "What a Home-Away Split Hides", body: [
          `Away records include neutral venues and seasons played away from home, and home records span eras with very different squads. A matched comparison would be fairer than this raw split.`,
          `{{hyp:crowd}}`,
        ] },
        { heading: `CricField Verdict: ${v.p < 0.05 && homeEdge > 0 ? "A Fortress Worth Protecting" : "Distinctive Is Not the Same as Decisive"}`, body: [
          `${a.c.homeLabel} has been ${character} the average venue, and the record shows ${edge} for ${a.name}.`,
          `${v.p < 0.05 && homeEdge > 0 ? "The priority is to keep building the squad around those conditions." : "A home edge has to be engineered through squad design rather than assumed."}`,
        ] },
      ],
      charts: [
        { id: "hg-series", type: "line", title: `Average first-innings score: ${a.c.homeLabel} vs IPL`, subtitle: "Seasons in which the ground hosted", table: "hg-series", xKey: "season", series: [{ key: "ground", label: a.c.homeLabel }, { key: "league", label: "IPL average" }], xLabel: "Season", unit: "runs", takeaway: `${a.c.homeLabel} has been ${character} the IPL average.`, ariaLabel: `Line chart of average first-innings score by season at ${a.c.homeLabel} and across the IPL.` },
        { id: "hg-homeaway", type: "column", title: `${a.code} win rate: ${a.c.homeLabel} vs elsewhere`, subtitle: "Matches with a result", table: hg.table, xKey: "where", series: [{ key: "winPct", label: "Win rate" }], xLabel: "Venue", unit: "% of matches won", takeaway: `The record shows ${edge}.`, ariaLabel: `Column chart of ${a.code} win rate at home and elsewhere.` },
      ],
      hypotheses: [hyp("crowd", `home support at ${a.c.homeLabel} affects close finishes in ways a win-rate split cannot detect.`, "No crowd data is in the warehouse, and close home matches are few.", "Compare close-match records at home and away with a matched-fixture design.")],
      players: [],
      seasons: [yearsLabel(a.c.firstYear, 2026)],
      hero: { narrative: `${a.c.homeLabel} on an ${a.name} match night.`, wanted: `Wide view of ${a.c.homeLabel} during an ${a.name} IPL match.`, query: `${a.c.homeLabel} stadium ${a.name}` },
      related: [65, 93, 21],
      seo: { metaTitle: metaTitle(`What makes ${a.c.homeLabel} different for ${a.code}?`), metaDescription: metaDesc(`How ${a.c.homeLabel} changes IPL cricket, and whether ${a.name} actually win more often there than away.`) },
      methodology: `${METHOD} The home ground combines every venue name used for it in the source. The interval is a Wilson interval; the probability is a two-sided exact binomial test against 50%.`,
    };
  },
};

// ── 23. Impact Player Chess ───────────────────────────────────────────────────
const s23: SlotSpec = {
  n: 23,
  storyType: "tactical",
  build(a) {
    const sql = `WITH bat AS (SELECT d.innings_id, COUNT(DISTINCT d.batter_id) batters FROM deliveries d GROUP BY d.innings_id),
        bowl AS (SELECT d.innings_id, COUNT(DISTINCT d.bowler_id) bowlers FROM deliveries d GROUP BY d.innings_id)
      SELECT CASE WHEN ${YEAR()} >= 2023 THEN 'impact' ELSE 'before' END era, CASE WHEN i.batting_team_id IN ${a.T} THEN 'team' ELSE 'rest' END side,
        AVG(bat.batters) batters, AVG(i.runs) runs, COUNT(*) n
      FROM innings i JOIN matches m ON m.match_id = i.match_id JOIN bat ON bat.innings_id = i.innings_id
      WHERE ${REGULATION} AND ${YEAR()} >= 2019 GROUP BY era, side`;
    const rs = a.rows<{ era: string; side: string; batters: number; runs: number; n: number }>(sql);
    const g = (era: string, side: string) => rs.find((r) => r.era === era && r.side === side) ?? { batters: NaN, runs: NaN, n: 0 };
    const bowlSql = `WITH bowl AS (SELECT d.innings_id, COUNT(DISTINCT d.bowler_id) bowlers FROM deliveries d GROUP BY d.innings_id)
      SELECT CASE WHEN ${YEAR()} >= 2023 THEN 'impact' ELSE 'before' END era, CASE WHEN i.bowling_team_id IN ${a.T} THEN 'team' ELSE 'rest' END side, AVG(bowl.bowlers) bowlers, COUNT(*) n
      FROM innings i JOIN matches m ON m.match_id = i.match_id JOIN bowl ON bowl.innings_id = i.innings_id WHERE ${REGULATION} AND ${YEAR()} >= 2019 GROUP BY era, side`;
    const bw = a.rows<{ era: string; side: string; bowlers: number; n: number }>(bowlSql);
    const gb = (era: string, side: string) => bw.find((r) => r.era === era && r.side === side) ?? { bowlers: NaN, n: 0 };
    a.table("ip-cmp", "Before and after the impact-player rule (2019–2022 vs 2023–2026)", "Average per innings", rs.reduce((x, r) => x + r.n, 0), "innings", `${sql} ;; ${bowlSql}`, [
      { measure: "Runs per innings", before: dp(g("before", "team").runs, 1), impact: dp(g("impact", "team").runs, 1), leagueBefore: dp(g("before", "rest").runs, 1), leagueImpact: dp(g("impact", "rest").runs, 1) },
      { measure: "Batters used", before: dp(g("before", "team").batters, 2), impact: dp(g("impact", "team").batters, 2), leagueBefore: dp(g("before", "rest").batters, 2), leagueImpact: dp(g("impact", "rest").batters, 2) },
      { measure: "Bowlers used", before: dp(gb("before", "team").bowlers, 2), impact: dp(gb("impact", "team").bowlers, 2), leagueBefore: dp(gb("before", "rest").bowlers, 2), leagueImpact: dp(gb("impact", "rest").bowlers, 2) },
    ]);
    a.table("ip-runs", "Runs per innings before and after the impact-player rule", "Average runs per regulation innings", rs.reduce((x, r) => x + r.n, 0), "innings", sql, [
      { period: "2019–2022", team: dp(g("before", "team").runs, 1), league: dp(g("before", "rest").runs, 1) },
      { period: "2023–2026", team: dp(g("impact", "team").runs, 1), league: dp(g("impact", "rest").runs, 1) },
    ]);
    const o = (id: string, v: number, label: string, n: number, unit: string, dg = 1) => a.num(id, v, label, { unit, filters: "Regulation innings, per innings", n, nUnit: "innings", sql, check: floor(n, 10, "innings") }, dg);
    const before = a.c.firstYear >= 2022 ? "their single pre-rule season, 2022" : "2019–2022";
    const tok = {
      rB: o("ip-rb", g("before", "team").runs, `${a.code} runs per innings, 2019–2022`, g("before", "team").n, "runs"),
      rI: o("ip-ri", g("impact", "team").runs, `${a.code} runs per innings, 2023–2026`, g("impact", "team").n, "runs"),
      lB: o("ip-lb", g("before", "rest").runs, "Rest of IPL runs per innings, 2019–2022", g("before", "rest").n, "runs"),
      lI: o("ip-li", g("impact", "rest").runs, "Rest of IPL runs per innings, 2023–2026", g("impact", "rest").n, "runs"),
      bB: o("ip-bb", gb("before", "team").bowlers, `${a.code} bowlers used per innings, 2019–2022`, gb("before", "team").n, "bowlers", 2),
      bI: o("ip-bi", gb("impact", "team").bowlers, `${a.code} bowlers used per innings, 2023–2026`, gb("impact", "team").n, "bowlers", 2),
    };
    const rise = g("impact", "team").runs - g("before", "team").runs, lrise = g("impact", "rest").runs - g("before", "rest").runs;
    return {
      dek: `The impact-player rule turned team selection into a match-day decision. Which substitution gives ${a.name} the biggest edge? The before-and-after numbers frame the question.`,
      excerpt: `${a.poss} totals have risen ${rise > lrise ? "faster than" : "no faster than"} the league's since the impact-player rule arrived in 2023. The substitution record itself is not in public data, so the choice has to be reasoned from its effects.`,
      keyTakeaways: [
        `${a.code} averaged ${tok.rB} runs per innings in ${before} and ${tok.rI} in 2023–2026.`,
        `The rest of the league moved from ${tok.lB} to ${tok.lI}.`,
        `${a.code} used ${tok.bB} bowlers per innings before the rule and ${tok.bI} after it.`,
      ],
      sections: [
        { heading: "A Twelfth Player, Chosen Late", body: [
          `Since 2023 each side can bring in a substitute who bats or bowls in full. The obvious use is to bat deep in the first innings and swap in a bowler for the second, or the reverse when chasing.`,
          `The effect on scoring is visible. ${a.name} averaged ${tok.rB} runs per innings in ${before} and ${tok.rI} since 2023; the rest of the league went from ${tok.lB} to ${tok.lI}.${a.c.firstYear >= 2022 ? ` With only one season before the rule, ${a.poss} comparison is thin.` : ""}`,
        ], chartIds: ["ip-chart"] },
        { heading: "What Changed in the Field", body: [
          `${a.code} used ${tok.bB} bowlers per innings before the rule and ${tok.bI} after it. A deeper bench of bowling options can change how overs are shared, even if the core five still bowl most of them.`,
          `The comparison table sets each measure for ${a.code} beside the rest of the league.`,
        ] },
        { heading: "Choosing the Substitution", body: [
          `The highest-value substitution is the one that fills the side's weakest phase. If the death bowling is the weak link, an extra specialist for the second innings is worth more than an extra batter; if the middle order collapses, the reverse.`,
          `For ${a.code}, the phase-by-phase comparisons elsewhere in this series identify which phase that is.`,
        ] },
        { heading: "What the Data Cannot See", body: [
          `Public ball-by-ball data does not record which player was the impact substitute, so the effect of each choice cannot be measured directly. The before-and-after comparison also mixes the rule with a general rise in scoring.`,
          `{{hyp:subs}}`,
        ] },
        { heading: "CricField Verdict: Substitute for the Weakest Phase", body: [
          `The rule has ${rise > lrise ? "lifted" : "not especially lifted"} ${a.poss} scoring relative to the league. The edge comes from using the substitution to patch the side's weakest phase each match.`,
          `Recording every substitution and the phase it was meant to strengthen would let the franchise measure the choice directly.`,
        ] },
      ],
      charts: [{ id: "ip-chart", type: "column", title: "Runs per innings before and after the impact-player rule", subtitle: "2019–2022 vs 2023–2026", table: "ip-runs", xKey: "period", series: [{ key: "team", label: a.code }, { key: "league", label: "Rest of IPL" }], xLabel: "Period", unit: "runs per innings", takeaway: `Scoring rose after the rule arrived, for ${a.code} and the rest of the league.`, ariaLabel: "Grouped column chart of average runs per innings before and after the impact-player rule." }],
      hypotheses: [hyp("subs", `${a.poss} choice of impact substitute has a measurable effect on the phase it targets.`, "Substitution records are not in Cricsheet data.", "Join substitution records from match reports and compare phase performance by substitute type.")],
      players: [],
      seasons: ["2019–2022", "2023–2026"],
      hero: { narrative: `${a.name} in the impact-player era.`, wanted: `${a.name} team huddle, recent season.`, query: `${a.name} team huddle` },
      related: [20, 24, 100],
      seo: { metaTitle: metaTitle(`Impact player chess: the best substitution for ${a.code}`), metaDescription: metaDesc(`How ${a.poss} scoring and bowling usage changed after the impact-player rule, and how to choose the substitution.`) },
      methodology: `${METHOD} Before = 2019–2022, after = 2023–2026. Batters and bowlers used are distinct players who faced or bowled at least one ball in the innings.`,
    };
  },
};

// ── 24. Batting Order as a Decision Tree ──────────────────────────────────────
const s24: SlotSpec = {
  n: 24,
  storyType: "tactical",
  build(a) {
    const POS = `WITH appear AS (SELECT d.innings_id, d.batter_id pid, MIN(d.delivery_id) first FROM deliveries d GROUP BY d.innings_id, d.batter_id
        UNION ALL SELECT d.innings_id, d.non_striker_id pid, MIN(d.delivery_id) first FROM deliveries d GROUP BY d.innings_id, d.non_striker_id),
      firsts AS (SELECT innings_id, pid, MIN(first) first FROM appear GROUP BY innings_id, pid),
      pos AS (SELECT innings_id, pid, ROW_NUMBER() OVER (PARTITION BY innings_id ORDER BY first, pid) position FROM firsts)`;
    const sql = `${POS} SELECT pl.name, COUNT(*) inns, COUNT(DISTINCT pos.position) positions, MIN(pos.position) top, MAX(pos.position) low
      FROM pos JOIN innings i ON i.innings_id = pos.innings_id JOIN matches m ON m.match_id = i.match_id JOIN players pl ON pl.player_id = pos.pid
      WHERE ${REGULATION} AND i.batting_team_id IN ${a.T} AND ${YEAR()} BETWEEN 2024 AND 2026 GROUP BY pos.pid HAVING inns >= 8 ORDER BY positions DESC, inns DESC`;
    const rs = a.rows<{ name: string; inns: number; positions: number; top: number; low: number }>(sql);
    a.table("bo-flex", `${a.code} batters by number of batting positions used, 2024–2026`, "Batters with at least eight innings; position = order of arrival", rs.reduce((x, r) => x + r.inns, 0), "innings", sql, rs.slice(0, 10).map((r) => ({ batter: r.name, positions: r.positions, innings: r.inns })));
    const lg2Sql = `${POS} SELECT bt, AVG(np) avgPositions, COUNT(*) players FROM (
        SELECT i.batting_team_id bt, pos.pid, COUNT(DISTINCT pos.position) np, COUNT(*) inns FROM pos JOIN innings i ON i.innings_id = pos.innings_id JOIN matches m ON m.match_id = i.match_id
        WHERE ${REGULATION} AND ${YEAR()} BETWEEN 2024 AND 2026 GROUP BY i.batting_team_id, pos.pid HAVING inns >= 8) GROUP BY bt`;
    const lg = a.rows<{ bt: number; avgPositions: number; players: number }>(lg2Sql);
    const mine = lg.filter((r) => a.c.ids.includes(r.bt)), rest = lg.filter((r) => !a.c.ids.includes(r.bt));
    const wavg = (xs: typeof lg) => xs.reduce((x, r) => x + r.avgPositions * r.players, 0) / Math.max(1, xs.reduce((x, r) => x + r.players, 0));
    const tok = {
      t: a.num("bo-t", wavg(mine), `Average batting positions used per regular ${a.code} batter, 2024–2026`, { unit: "positions", filters: "Batters with at least eight innings", n: mine.reduce((x, r) => x + r.players, 0), nUnit: "batters", sql: lg2Sql, check: floor(mine.reduce((x, r) => x + r.players, 0), 4, "batters") }, 2),
      l: a.num("bo-l", wavg(rest), "Average batting positions used per regular batter, rest of IPL", { unit: "positions", filters: "Batters with at least eight innings", n: rest.reduce((x, r) => x + r.players, 0), nUnit: "batters", sql: lg2Sql, check: floor(rest.reduce((x, r) => x + r.players, 0), 40, "batters") }, 2),
      most: rs[0] ? a.text("bo-most", rs[0].name, `${a.code}'s most-moved batter, 2024–2026`, { filters: "Distinct positions", n: rs[0].inns, nUnit: "innings", sql, check: derived("rank by positions") }) : "",
      mostN: rs[0] ? a.int("bo-most-n", rs[0].positions, `Distinct positions used by ${rs[0].name}`, { filters: "2024–2026", n: rs[0].inns, nUnit: "innings", sql, check: floor(rs[0].inns, 8, "innings") }) : "",
    };
    const flexible = wavg(mine) > wavg(rest) + 0.2, rigid = wavg(mine) < wavg(rest) - 0.2;
    const style = flexible ? "more flexible than" : rigid ? "more fixed than" : "about as flexible as";
    return {
      dek: `Should ${a.name} write their batting order in ink or in pencil? How often their batters move positions shows how far they already treat it as a decision tree.`,
      excerpt: `Since 2024 ${a.poss} batting order has been ${style} the rest of the league's. The case for a flexible order rests on matching batters to the match situation.`,
      keyTakeaways: [
        `Regular ${a.code} batters used ${tok.t} batting positions each on average since 2024; across the rest of the IPL the figure is ${tok.l}.`,
        rs[0] ? `${tok.most} moved the most, batting in ${tok.mostN} different positions.` : `No ${a.code} batter had enough innings to profile.`,
        `The order is ${style} the league norm.`,
      ],
      sections: [
        { heading: "Ink or Pencil", body: [
          `A traditional batting order is fixed: each batter has a number. A decision-tree order uses triggers instead: if a wicket falls before the sixth over, send the anchor; if the platform is strong at the twelfth, send the hitter.`,
          `Since 2024 regular ${a.code} batters have each batted in ${tok.t} positions on average, against ${tok.l} for the rest of the league. ${a.poss} order has been ${style} the league's.`,
        ] },
        { heading: "Who Moves", body: [
          rs[0] ? `${tok.most} has been the most mobile, batting in ${tok.mostN} positions. The table lists every regular batter by positions used.` : `The table lists ${a.poss} regular batters by positions used.`,
          `Movement on its own is neither good nor bad: what matters is whether each move follows a rule the batters understand.`,
        ], chartIds: ["bo-chart"] },
        { heading: "Building the Tree", body: [
          `The decision tree needs a few branches: wickets lost at the end of the powerplay, run rate at halfway, and the bowling still to come. Each branch names the next batter.`,
          `For ${a.code}, writing those triggers down before the season makes flexibility a plan rather than an improvisation.`,
        ] },
        { heading: "The Cost of Uncertainty", body: [
          `Batters who do not know when they will bat can find it harder to prepare. Some evidence of that would show up as lower strike rates for batters who move often, but this analysis has not tested it.`,
          `{{hyp:certainty}}`,
        ] },
        { heading: "CricField Verdict: A Tree With Few Branches", body: [
          `${a.name} should use a small number of clear triggers rather than a fixed order or constant improvisation.`,
          `Tracking each batter's output by position and by trigger would show which branches pay.`,
        ] },
      ],
      charts: [{ id: "bo-chart", type: "bar", title: `${a.code} batters by positions used`, subtitle: "2024–2026, minimum eight innings", table: "bo-flex", xKey: "batter", series: [{ key: "positions", label: "Distinct positions" }], unit: "positions", takeaway: `${a.poss} order has been ${style} the league's.`, ariaLabel: `Horizontal bar chart of the number of batting positions used by each regular ${a.code} batter since 2024.` }],
      hypotheses: [hyp("certainty", "batters who move positions often score more slowly than when they bat in a fixed position.", "Within-batter comparisons by position stability have not been run.", "Compare each batter's strike rate in his most common position with his strike rate elsewhere.")],
      players: rs.slice(0, 3).map((r) => r.name),
      seasons: ["2024–2026"],
      hero: { narrative: `An ${a.name} batter walking out to bat.`, wanted: `${rs[0]?.name ?? a.name} walking out to bat.`, query: `${rs[0]?.name ?? ""} ${a.name} batting`.trim() },
      related: [2, 5, 29],
      seo: { metaTitle: metaTitle(`Batting order as a decision tree for ${a.code}`), metaDescription: metaDesc(`How often ${a.poss} batters change positions compared with the IPL since 2024, and how to turn flexibility into rules.`) },
      methodology: `${METHOD} Position is the order of first arrival at the crease; batters with at least eight innings, 2024–2026.`,
    };
  },
};

// ── 25. Defending 160 Versus 200 ──────────────────────────────────────────────
const s25: SlotSpec = {
  n: 25,
  storyType: "tactical",
  build(a) {
    const sql = `SELECT CASE WHEN i1.runs < 160 THEN 'under 160' WHEN i1.runs < 180 THEN '160–179' WHEN i1.runs < 200 THEN '180–199' ELSE '200+' END band,
        COUNT(*) n, SUM(CASE WHEN m.winner_id = i1.batting_team_id THEN 1 ELSE 0 END) won,
        SUM(CASE WHEN i1.batting_team_id IN ${a.T} THEN 1 ELSE 0 END) tn, SUM(CASE WHEN i1.batting_team_id IN ${a.T} AND m.winner_id = i1.batting_team_id THEN 1 ELSE 0 END) tw
      FROM matches m JOIN innings i1 ON i1.match_id = m.match_id AND i1.innings_number = 1 WHERE m.winner_id IS NOT NULL AND ${YEAR()} >= 2022 GROUP BY band`;
    const rs = a.rows<{ band: string; n: number; won: number; tn: number; tw: number }>(sql);
    const order = ["under 160", "160–179", "180–199", "200+"];
    const rows = order.map((b) => rs.find((r) => r.band === b)!).filter(Boolean);
    a.table("def-bands", "Defending win rate by first-innings total, 2022–2026", "Side batting first; matches with a result", rows.reduce((x, r) => x + r.n, 0), "matches", sql, rows.map((r) => ({ total: r.band, league: dp((r.won / r.n) * 100), team: r.tn >= 5 ? dp((r.tw / r.tn) * 100) : null, teamMatches: r.tn })));
    const b = (k: string) => rows.find((r) => r.band === k)!;
    const tok = {
      l160: a.pct("def-l160", (b("160–179").won / b("160–179").n) * 100, "IPL win rate defending 160–179, 2022–2026", { filters: "Batting first", n: b("160–179").n, nUnit: "matches", sql, check: floor(b("160–179").n, 30, "matches") }),
      l200: a.pct("def-l200", (b("200+").won / b("200+").n) * 100, "IPL win rate defending 200+, 2022–2026", { filters: "Batting first", n: b("200+").n, nUnit: "matches", sql, check: floor(b("200+").n, 30, "matches") }),
      lUnder: a.pct("def-lunder", (b("under 160").won / b("under 160").n) * 100, "IPL win rate defending under 160, 2022–2026", { filters: "Batting first", n: b("under 160").n, nUnit: "matches", sql, check: floor(b("under 160").n, 30, "matches") }),
      tDef: a.pct("def-t", (rows.reduce((x, r) => x + r.tw, 0) / Math.max(1, rows.reduce((x, r) => x + r.tn, 0))) * 100, `${a.code} win rate batting first, 2022–2026`, { filters: "Matches with a result", n: rows.reduce((x, r) => x + r.tn, 0), nUnit: "matches", sql, check: floor(rows.reduce((x, r) => x + r.tn, 0), 10, "matches") }),
    };
    const dpb = phaseBlock(a, "defd", "bowl", "death");
    return {
      dek: `Defending 160 and defending 200 are different jobs. Why ${a.name} need two bowling playbooks, and what the league data says each one must achieve.`,
      excerpt: `Since 2022, IPL sides defending 160–179 have won ${"far less"} often than sides defending 200 or more. The bowling plan has to change with the total.`.replace(`${"far less"} often`, "less often"),
      keyTakeaways: [
        `Since 2022 IPL sides defending 160–179 won ${tok.l160}; defending 200 or more, ${tok.l200}.`,
        `Below 160 the defending side won ${tok.lUnder}.`,
        `${a.code} have won ${tok.tDef} of matches when batting first since 2022.`,
      ],
      sections: [
        { heading: "Two Totals, Two Jobs", body: [
          `A total of 200 lets a bowling side buy wickets with runs. A total of 160 does not: every boundary hurts, and the plan has to start with containment.`,
          `Across the IPL since 2022, sides defending 160–179 have won ${tok.l160} of the time; sides defending 200 or more, ${tok.l200}; below 160, ${tok.lUnder}.`,
        ], chartIds: ["def-chart"] },
        { heading: `${a.poss} Record Batting First`, body: [
          `${a.name} have won ${tok.tDef} of their matches batting first since 2022. The team series in the chart shows how that varies by total, where the sample allows.`,
          `Their death bowling, which decides most defences, has run at ${dpb.tok.t2} an over since 2024 against ${dpb.tok.l2} for the league.`,
        ] },
        { heading: "The Two Playbooks", body: [
          `Defending a big total: attack in the powerplay with catchers up, accept boundaries for wickets, and keep the best death bowler for the eighteenth and twentieth overs.`,
          `Defending a modest total: bowl to fields, use the slower bowlers in the middle overs to drag the required rate up, and spread the death overs so no bowler is exposed twice to a set hitter.`,
        ] },
        { heading: "Totals Are Relative to Conditions", body: [
          `A total of one hundred and seventy at a small, fast ground is a different defence from the same total on a slow pitch. Grouping by raw total ignores venue par scores.`,
          `{{hyp:par}}`,
        ] },
        { heading: "CricField Verdict: Choose the Playbook at the Innings Break", body: [
          `${a.name} should decide which playbook to use at the innings break, based on the total relative to the venue's par, not stick to one plan.`,
          `Recording which playbook was used and how it went would turn this into a measurable habit.`,
        ] },
      ],
      charts: [{ id: "def-chart", type: "column", title: "Defending win rate by total", subtitle: "Side batting first, 2022–2026", table: "def-bands", xKey: "total", series: [{ key: "league", label: "IPL" }, { key: "team", label: a.code }], xLabel: "First-innings total", unit: "% of matches won", takeaway: "Defending gets steadily easier as the total rises.", ariaLabel: "Column chart of the batting-first side's win rate grouped by first-innings total." }],
      hypotheses: [hyp("par", "defending success depends on the total relative to the venue's par score more than on the raw total.", "Venue par scores have not been subtracted from each total.", "Compute each venue's rolling par and group defences by total minus par.")],
      literalNumbers: [{ text: "160", reason: "The 160 total named in the title and a band threshold." }, { text: "200", reason: "The 200 total named in the title and a band threshold." }, { text: "179", reason: "Band boundary (160–179)." }],
      players: [],
      seasons: ["2022–2026"],
      hero: { narrative: `${a.name} defending a total.`, wanted: `${a.name} bowlers celebrating while defending a total.`, query: `${a.name} bowler celebrates wicket` },
      related: [10, 15, 28],
      seo: { metaTitle: metaTitle(`Defending 160 versus 200: ${a.poss} two playbooks`), metaDescription: metaDesc(`How often IPL sides defend 160 and 200 since 2022, ${a.poss} record batting first, and the bowling plan each total needs.`) },
      methodology: `${METHOD} Bands use the first-innings total; 2022–2026. Team bands with fewer than five matches are not shown.`,
    };
  },
};

// ── 26. The Timeout Decision ──────────────────────────────────────────────────
const s26: SlotSpec = {
  n: 26,
  storyType: "explainer",
  build(a) {
    const sql = `WITH o AS (SELECT d.innings_id, d.over_num, SUM(d.total_runs) r FROM deliveries d GROUP BY d.innings_id, d.over_num),
        s AS (SELECT o.*, LAG(o.r) OVER (PARTITION BY o.innings_id ORDER BY o.over_num) prev, LEAD(o.r) OVER (PARTITION BY o.innings_id ORDER BY o.over_num) nxt FROM o)
      SELECT CASE WHEN i.bowling_team_id IN ${a.T} THEN 'team' ELSE 'rest' END side, COUNT(*) overs,
        SUM(CASE WHEN s.r >= 15 THEN 1 ELSE 0 END) big, AVG(CASE WHEN s.r >= 15 THEN s.nxt END) afterBig, AVG(s.r) avgOver
      FROM s JOIN innings i ON i.innings_id = s.innings_id JOIN matches m ON m.match_id = i.match_id
      WHERE ${REGULATION} AND ${YEAR()} >= 2022 AND s.over_num BETWEEN 0 AND 18 GROUP BY side`;
    const rs = a.rows<{ side: string; overs: number; big: number; afterBig: number; avgOver: number }>(sql);
    const t = rs.find((r) => r.side === "team")!, l = rs.find((r) => r.side === "rest")!;
    a.table("to-cmp", "Big overs conceded and what followed, 2022–2026", "Overs one to nineteen of regulation innings; a big over = 15 runs or more", t.overs + l.overs, "overs", sql, [
      { measure: "Big overs per 100 overs", team: dp((t.big / t.overs) * 100, 1), league: dp((l.big / l.overs) * 100, 1) },
      { measure: "Runs in the over after a big over", team: dp(t.afterBig, 2), league: dp(l.afterBig, 2) },
      { measure: "Runs in an average over", team: dp(t.avgOver, 2), league: dp(l.avgOver, 2) },
    ]);
    const tok = {
      tBig: a.num("to-tbig", (t.big / t.overs) * 100, `${a.code} big overs conceded per 100 overs, 2022–2026`, { unit: "per 100 overs", filters: "Overs of fifteen runs or more", n: t.overs, nUnit: "overs", sql, check: floor(t.overs, 300, "overs") }, 1),
      lBig: a.num("to-lbig", (l.big / l.overs) * 100, "Rest of IPL big overs conceded per 100 overs", { unit: "per 100 overs", filters: "Overs of fifteen runs or more", n: l.overs, nUnit: "overs", sql, check: floor(l.overs, 3000, "overs") }, 1),
      tAfter: a.num("to-tafter", t.afterBig, `${a.code} runs conceded in the over after a big over`, { unit: "runs", filters: "Over following an over of fifteen or more", n: t.big, nUnit: "big overs", sql, check: floor(t.big, 20, "big overs") }, 2),
      lAfter: a.num("to-lafter", l.afterBig, "Rest of IPL runs conceded in the over after a big over", { unit: "runs", filters: "As above", n: l.big, nUnit: "big overs", sql, check: floor(l.big, 200, "big overs") }, 2),
      lAvg: a.num("to-lavg", l.avgOver, "Rest of IPL runs in an average over", { unit: "runs", filters: "Overs one to nineteen", n: l.overs, nUnit: "overs", sql, check: range(l.avgOver, 5, 14, "runs per over") }, 2),
    };
    const momentum = l.afterBig > l.avgOver + 0.5;
    return {
      dek: `Can ${a.name} stop an opposition surge by stopping the game? The over that follows a big over shows whether momentum is real.`,
      excerpt: `League-wide since 2022, the over after a fifteen-run over has cost ${momentum ? "more" : "about the same"} than an average over. ${a.name} concede big overs at a rate the data can compare with the league.`,
      keyTakeaways: [
        `${a.code} conceded ${tok.tBig} big overs (fifteen runs or more) per hundred overs since 2022; the rest of the IPL conceded ${tok.lBig}.`,
        `Across the league, the over after a big over cost ${tok.lAfter} runs, against ${tok.lAvg} for an average over.`,
        `For ${a.code} the over after a big over cost ${tok.tAfter}.`,
      ],
      sections: [
        { heading: "Is Momentum Real?", body: [
          `The strategic timeout exists partly to break momentum: after a big over, the bowling side regroups and resets. That only matters if surges carry on, so that a big over makes the next one more likely to be expensive.`,
          `Across the league since 2022, the over after a fifteen-run over cost ${tok.lAfter} runs, against ${tok.lAvg} for an average over. ${momentum ? "Surges do carry on, at least partly." : "On this measure, surges do not obviously carry on."}`,
        ], chartIds: ["to-chart"] },
        { heading: `${a.poss} Exposure`, body: [
          `${a.name} conceded ${tok.tBig} big overs per hundred since 2022, against ${tok.lBig} for the rest of the league. After those overs, their next over cost ${tok.tAfter}.`,
          `The fewer big overs a side concedes, the less often the timeout question arises at all.`,
        ] },
        { heading: "Using the Break", body: [
          `A timeout is most valuable when it changes something concrete: the bowler, the field or the plan for a set batter. Used as a pause without a change, it is a breather rather than a tactic.`,
          `For ${a.code}, the practical rule is to pair every reactive break with a specific change, and to record it.`,
        ] },
        { heading: "Timeouts Are Not in the Data", body: [
          `Public data does not record when timeouts were taken, so their effect cannot be measured directly. The analysis here tests the premise, momentum, rather than the timeout itself.`,
          `{{hyp:timeout}}`,
        ] },
        { heading: "CricField Verdict: Break With a Plan, Not a Pause", body: [
          `The league evidence ${momentum ? "supports" : "does not strongly support"} the idea that surges carry on. ${a.name} should use breaks to change bowler or field, not just to stop the clock.`,
          `Logging every break and what changed after it would show whether the decision pays.`,
        ] },
      ],
      charts: [{ id: "to-chart", type: "column", title: "Big overs and what followed", subtitle: "2022–2026", table: "to-cmp", xKey: "measure", series: [{ key: "team", label: a.code }, { key: "league", label: "Rest of IPL" }], xLabel: "Measure", unit: "runs or overs", takeaway: momentum ? "The over after a big over costs more than an average over." : "The over after a big over costs about the same as an average over.", ariaLabel: "Grouped column chart of big overs conceded and the runs in the following over." }],
      hypotheses: [hyp("timeout", "overs immediately after a strategic timeout cost less than comparable overs without one.", "Timeout timings are not in the warehouse.", "Join timeout times from broadcast data and compare the following overs.")],
      literalNumbers: [{ text: "15", reason: "Definition of a big over (fifteen runs or more), used in a table label." }],
      players: [],
      seasons: ["2022–2026"],
      hero: { narrative: `${a.name} regrouping on the field.`, wanted: `${a.name} players in a huddle on the field.`, query: `${a.name} players huddle` },
      related: [28, 29, 30],
      seo: { metaTitle: metaTitle(`The timeout decision: can ${a.code} stop a surge?`), metaDescription: metaDesc(`How often ${a.name} concede fifteen-run overs and whether IPL scoring surges carry into the next over, since 2022.`) },
      methodology: `${METHOD} A big over is fifteen runs or more, overs one to nineteen; the following over is the next over in the same innings. 2022–2026.`,
    };
  },
};

// ── 27. Opponent-Specific Plans ───────────────────────────────────────────────
const s27: SlotSpec = {
  n: 27,
  storyType: "tactical",
  build(a) {
    const h = headToHead(a, "opp");
    const t = h.tok;
    const pcts = h.rows.filter((r) => (r.matches as number) >= 6).map((r) => r.winPct as number);
    const spread = pcts.length >= 2 ? Math.max(...pcts) - Math.min(...pcts) : 0;
    const spreadTok = a.num("opp-spread", spread, `Gap between ${a.poss} best and worst head-to-head win rates (min. six matches)`, { unit: "percentage points", filters: "Current franchises", n: pcts.length, nUnit: "opponents", sql: "head-to-head table", check: derived("max − min over opponents") }, 0);
    return {
      dek: `Should ${a.name} rebuild their eleven for every opponent? Head-to-head records show how much results really vary from one rival to the next.`,
      excerpt: `${a.poss} head-to-head win rates span ${"a wide range"} across their opponents. Some of that is genuine match-up, some is the noise of small samples.`.replace(`${"a wide range"}`, spread >= 25 ? "a wide range" : "a fairly narrow range"),
      keyTakeaways: [
        `${a.code} have played ${t.mostName} most often (${t.mostN} decided matches), winning ${t.mostPct}.`,
        t.bestName ? `Their best record is against ${t.bestName} (${t.bestPct}); their weakest against ${t.worstName} (${t.worstPct}).` : `No opponent has enough matches for a reliable best or worst record.`,
        `The gap between best and worst head-to-head records is ${spreadTok} percentage points.`,
      ],
      sections: [
        { heading: "One Eleven or Ten", body: [
          `Every opponent has a different shape: some bat deep, some rely on spin, some have a single destructive opener. The question is whether ${a.name} should pick a different eleven for each, or keep a stable side and adjust tactics.`,
          `The head-to-head record is the starting point. ${a.code} have met ${t.mostName} most often, winning ${t.mostPct} of ${t.mostN} decided matches.`,
        ], chartIds: ["opp-chart"] },
        { heading: "How Much Results Vary", body: [
          t.bestName ? `${a.poss} best record, among opponents met at least six times, is against ${t.bestName} at ${t.bestPct}; their weakest is against ${t.worstName} at ${t.worstPct}.` : `Few opponents have been met often enough to compare.`,
          `The spread between those records is ${spreadTok} percentage points. Part of that spread is real, part is what any team would see by chance over a dozen or so matches per opponent.`,
        ] },
        { heading: "Where Specific Plans Pay", body: [
          `Opponent-specific selection pays when an opponent has a structural weakness that one player in the squad exploits, such as a left-arm wrist spinner against a right-hand-heavy top order.`,
          `It does not pay when it unsettles a stable core. For ${a.code}, one or two match-up changes per game is a sensible ceiling.`,
        ] },
        { heading: "Small Samples, Big Stories", body: [
          `Head-to-head records are built from few matches over many seasons, with different squads each time. A poor record against one rival can be history rather than a current weakness.`,
          `{{hyp:era}}`,
        ] },
        { heading: "CricField Verdict: Stable Core, Targeted Changes", body: [
          `${a.name} should keep a stable core and make targeted changes where an opponent's structure creates a clear match-up.`,
          `Recent head-to-head results, weighted towards the last three seasons, are a better guide than the all-time record.`,
        ] },
      ],
      charts: [{ id: "opp-chart", type: "bar", title: `${a.code} head-to-head win rate`, subtitle: "Matches with a result, current franchises", table: h.table, xKey: "opponent", series: [{ key: "winPct", label: "Win rate" }], unit: "% of matches won", takeaway: "Head-to-head records vary, but small samples exaggerate the differences.", ariaLabel: `Horizontal bar chart of ${a.code} win rate against each current franchise.` }],
      hypotheses: [hyp("era", "head-to-head records from more than three seasons ago do not predict current results.", "Recency-weighted head-to-head records have not been tested for predictive power.", "Compare all-time and last-three-season head-to-head records as predictors of the next season's results.")],
      players: [],
      seasons: [yearsLabel(a.c.firstYear, 2026)],
      hero: { narrative: `${a.name} against a rival.`, wanted: `${a.name} playing ${FR_NAME[h.most.opponent as string] ?? "a rival"}.`, query: `${a.name} ${FR_NAME[h.most.opponent as string] ?? ""}`.trim() },
      related: [55, 86, 19],
      seo: { metaTitle: metaTitle(`Opponent-specific plans: should ${a.code} change the XI?`), metaDescription: metaDesc(`${a.poss} head-to-head records against every current IPL franchise, and when opponent-specific selection pays.`) },
      methodology: `${METHOD} Opponents are grouped under their current franchise names.`,
    };
  },
};

// ── 28. The Last Five Overs ───────────────────────────────────────────────────
const s28: SlotSpec = {
  n: 28,
  storyType: "tactical",
  build(a) {
    const bat = phaseBlock(a, "l5bat", "bat", "last5");
    const bowl = phaseBlock(a, "l5bowl", "bowl", "last5");
    const sql = `WITH st AS (SELECT d.innings_id, SUM(CASE WHEN dm.dismissal_id IS NOT NULL THEN 1 ELSE 0 END) wk FROM deliveries d LEFT JOIN dismissals dm ON dm.delivery_id = d.delivery_id WHERE d.over_num < 15 GROUP BY d.innings_id),
        de AS (SELECT d.innings_id, SUM(d.total_runs) r, SUM(CASE WHEN ${LEGAL} THEN 1 ELSE 0 END) b FROM deliveries d WHERE d.over_num >= 15 GROUP BY d.innings_id)
      SELECT CASE WHEN st.wk <= 3 THEN '0–3 down' WHEN st.wk <= 5 THEN '4–5 down' ELSE '6+ down' END state, SUM(de.r) * 6.0 / SUM(de.b) rr, COUNT(*) n
      FROM st JOIN de ON de.innings_id = st.innings_id JOIN innings i ON i.innings_id = st.innings_id JOIN matches m ON m.match_id = i.match_id
      WHERE ${REGULATION} AND ${YEAR()} >= 2022 AND de.b >= 24 GROUP BY state`;
    const rs = a.rows<{ state: string; rr: number; n: number }>(sql);
    const order = ["0–3 down", "4–5 down", "6+ down"];
    a.table("l5-state", "Death-overs run rate by wickets lost after fifteen overs, 2022–2026", "Innings with at least four death overs batted", rs.reduce((x, r) => x + r.n, 0), "innings", sql, order.map((s) => rs.find((r) => r.state === s)).filter(Boolean).map((r) => ({ state: r!.state, runRate: dp(r!.rr, 2), innings: r!.n })));
    const g = (s: string) => rs.find((r) => r.state === s)!;
    const tok = {
      fresh: a.num("l5-fresh", g("0–3 down").rr, "IPL death-overs run rate with three or fewer wickets down after fifteen overs", { unit: "runs per over", filters: "2022–2026", n: g("0–3 down").n, nUnit: "innings", sql, check: floor(g("0–3 down").n, 100, "innings") }, 2),
      deep: a.num("l5-deep", g("6+ down").rr, "IPL death-overs run rate with six or more wickets down after fifteen overs", { unit: "runs per over", filters: "2022–2026", n: g("6+ down").n, nUnit: "innings", sql, check: floor(g("6+ down").n, 50, "innings") }, 2),
    };
    const net2 = bat.v.t2 - bowl.v.t2;
    const netTok = a.num("l5-net", net2, `${a.code} death-overs net run rate since 2024 (scored minus conceded)`, { unit: "runs per over", filters: "2024–2026", n: 3, nUnit: "seasons", sql: "phase blocks", check: derived() }, 2);
    return {
      dek: `When should ${a.name} preserve resources in the last five overs and when should they spend them? Wickets in hand at the fifteenth over set the ceiling.`,
      excerpt: `Since 2024 ${a.name} have ${net2 > 0 ? "out-scored" : "been out-scored by"} their opponents in the last five overs. League-wide, wickets in hand at the fifteenth over decide how fast the finish can be.`,
      keyTakeaways: [
        `${a.code} scored ${bat.tok.t2} an over in overs sixteen to twenty since 2024 and conceded ${bowl.tok.t2}: a net of ${netTok} per over.`,
        `League-wide since 2022, sides three or fewer down after fifteen overs scored ${tok.fresh} in the death; six or more down, ${tok.deep}.`,
        `The league's death-overs scoring rate since 2024 is ${bat.tok.l2}.`,
      ],
      sections: [
        { heading: "Five Overs, Two Ledgers", body: [
          `The last five overs are where most T20 matches are decided, and every team has two ledgers there: runs scored and runs conceded.`,
          `Since 2024 ${a.name} have scored ${bat.tok.t2} an over in the death and conceded ${bowl.tok.t2}, a net of ${netTok} per over. The league scoring rate in that phase is ${bat.tok.l2}.`,
        ], chartIds: ["l5-bat"] },
        { heading: "Wickets in Hand Set the Ceiling", body: [
          `How fast a side can finish depends on what it has left. Across the league since 2022, sides with three or fewer wickets down after fifteen overs scored ${tok.fresh} an over in the death; sides six or more down scored ${tok.deep}.`,
          `That is the price of spending wickets earlier: a slower finish.`,
        ], chartIds: ["l5-state"] },
        { heading: "Preserve or Spend", body: [
          `With the bat, the rule follows from the table: protect wickets through the middle overs when the finishers are strong, because they convert wickets in hand into runs at the death.`,
          `With the ball, spend the best death bowler's overs where the batting side has most wickets in hand, since that is where the scoring ceiling is highest.`,
        ] },
        { heading: "Correlation and Collapse", body: [
          `Sides six down after fifteen overs are often the weaker batting sides, so part of the slower finish reflects quality rather than state. The table describes outcomes, not the effect of a single decision.`,
          `{{hyp:state}}`,
        ] },
        { heading: "CricField Verdict: Bank Wickets, Then Cash Them", body: [
          `${a.name} have ${net2 > 0 ? "won" : "lost"} the death-overs ledger since 2024. The league evidence says wickets in hand at the fifteenth over are what turn a finish into a big one.`,
          `Batting plans should protect wickets until the fifteenth over; bowling plans should target that same window.`,
        ] },
      ],
      charts: [
        { id: "l5-bat", type: "line", title: "Death-overs run rate by season", subtitle: `${a.code} batting vs IPL, overs 16–20`, table: bat.table, xKey: "season", series: [{ key: "team", label: a.code }, { key: "league", label: "IPL average" }], xLabel: "Season", unit: "runs per over", takeaway: `${a.code} have scored ${bat.better ? "faster" : "slower"} than the league at the death since 2024.`, ariaLabel: `Line chart of ${a.code} death-overs run rate and the IPL average by season.` },
        { id: "l5-state", type: "column", title: "Death-overs run rate by wickets lost after fifteen overs", subtitle: "IPL, 2022–2026", table: "l5-state", xKey: "state", series: [{ key: "runRate", label: "Run rate" }], xLabel: "Wickets lost after over fifteen", unit: "runs per over", takeaway: "More wickets in hand after fifteen overs means a faster finish.", ariaLabel: "Column chart of death-overs run rate grouped by wickets lost after fifteen overs." },
      ],
      hypotheses: [hyp("state", "the run-rate gap between wickets-in-hand states persists after controlling for batting quality.", "Batting quality has not been adjusted for in the state comparison.", "Compare the same sides' death-overs scoring across different wicket states.")],
      players: [],
      seasons: ["2022–2026", "2024–2026"],
      hero: { narrative: `${a.name} in the last five overs.`, wanted: `${a.name} batter hitting late in an innings.`, query: `${a.name} batting death overs` },
      related: [5, 15, 29],
      seo: { metaTitle: metaTitle(`The last five overs: when ${a.code} preserve or spend`), metaDescription: metaDesc(`${a.poss} death-overs runs scored and conceded since 2024, and how wickets in hand after fifteen overs set the finish.`) },
      methodology: `${METHOD} Death overs = sixteen to twenty. Wicket states count all dismissals before the sixteenth over; innings with at least four death overs.`,
    };
  },
};

// ── 29. Risk Budgeting ────────────────────────────────────────────────────────
const s29: SlotSpec = {
  n: 29,
  storyType: "explainer",
  build(a) {
    const sql = `WITH st AS (SELECT d.innings_id, SUM(CASE WHEN dm.dismissal_id IS NOT NULL THEN 1 ELSE 0 END) wk FROM deliveries d LEFT JOIN dismissals dm ON dm.delivery_id = d.delivery_id WHERE d.over_num < 10 GROUP BY d.innings_id),
        nx AS (SELECT d.innings_id, SUM(d.total_runs) r, SUM(CASE WHEN ${LEGAL} THEN 1 ELSE 0 END) b, SUM(CASE WHEN dm.dismissal_id IS NOT NULL THEN 1 ELSE 0 END) w
          FROM deliveries d LEFT JOIN dismissals dm ON dm.delivery_id = d.delivery_id WHERE d.over_num BETWEEN 10 AND 14 GROUP BY d.innings_id)
      SELECT CASE WHEN st.wk <= 1 THEN '0–1 down' WHEN st.wk <= 3 THEN '2–3 down' ELSE '4+ down' END state,
        CASE WHEN i.batting_team_id IN ${a.T} THEN 'team' ELSE 'rest' END side,
        SUM(nx.r) * 6.0 / SUM(nx.b) rr, SUM(nx.w) * 1.0 / COUNT(*) wkts, COUNT(*) n
      FROM st JOIN nx ON nx.innings_id = st.innings_id JOIN innings i ON i.innings_id = st.innings_id JOIN matches m ON m.match_id = i.match_id
      WHERE ${REGULATION} AND ${YEAR()} >= 2022 GROUP BY state, side`;
    const rs = a.rows<{ state: string; side: string; rr: number; wkts: number; n: number }>(sql);
    const order = ["0–1 down", "2–3 down", "4+ down"];
    const g = (s: string, side: string) => rs.find((r) => r.state === s && r.side === side);
    a.table("rb-state", "Overs 11–15 by wickets lost at halfway, 2022–2026", "Run rate and wickets lost in overs eleven to fifteen", rs.reduce((x, r) => x + r.n, 0), "innings", sql, order.map((s) => ({ state: s, leagueRR: g(s, "rest") ? dp(g(s, "rest")!.rr, 2) : null, teamRR: g(s, "team") && g(s, "team")!.n >= 8 ? dp(g(s, "team")!.rr, 2) : null, leagueWkts: g(s, "rest") ? dp(g(s, "rest")!.wkts, 2) : null })));
    const lFresh = g("0–1 down", "rest")!, lDeep = g("4+ down", "rest")!;
    const tok = {
      fRR: a.num("rb-frr", lFresh.rr, "IPL run rate in overs 11–15 when 0–1 down at halfway", { unit: "runs per over", filters: "2022–2026", n: lFresh.n, nUnit: "innings", sql, check: floor(lFresh.n, 100, "innings") }, 2),
      dRR: a.num("rb-drr", lDeep.rr, "IPL run rate in overs 11–15 when four or more down at halfway", { unit: "runs per over", filters: "2022–2026", n: lDeep.n, nUnit: "innings", sql, check: floor(lDeep.n, 50, "innings") }, 2),
      fW: a.num("rb-fw", lFresh.wkts, "IPL wickets lost in overs 11–15 when 0–1 down at halfway", { unit: "wickets per innings", filters: "2022–2026", n: lFresh.n, nUnit: "innings", sql, check: floor(lFresh.n, 100, "innings") }, 2),
      dW: a.num("rb-dw", lDeep.wkts, "IPL wickets lost in overs 11–15 when four or more down at halfway", { unit: "wickets per innings", filters: "2022–2026", n: lDeep.n, nUnit: "innings", sql, check: floor(lDeep.n, 50, "innings") }, 2),
      tStates: a.int("rb-tn", order.reduce((x, s) => x + (g(s, "team")?.n ?? 0), 0), `${a.code} innings in the analysis`, { filters: "2022–2026", n: order.reduce((x, s) => x + (g(s, "team")?.n ?? 0), 0), nUnit: "innings", sql, check: floor(order.reduce((x, s) => x + (g(s, "team")?.n ?? 0), 0), 10, "innings") }),
    };
    return {
      dek: `How aggressive should ${a.name} be at different match states? Treating wickets as a budget turns that question into arithmetic.`,
      excerpt: `League-wide since 2022, sides one or no wicket down at halfway have scored ${"much"} faster in overs eleven to fifteen than sides four or more down. Here is how ${a.name} should budget risk.`.replace(`${"much"} faster`, lFresh.rr > lDeep.rr + 0.5 ? "markedly faster" : "a little faster"),
      keyTakeaways: [
        `IPL sides no more than one wicket down at halfway scored ${tok.fRR} an over in overs eleven to fifteen since 2022; four or more down, ${tok.dRR}.`,
        `They lost ${tok.fW} and ${tok.dW} wickets respectively in that stretch.`,
        `The analysis covers ${tok.tStates} ${a.code} innings since 2022.`,
      ],
      sections: [
        { heading: "Wickets as a Budget", body: [
          `A T20 innings has ten wickets and one hundred and twenty balls. Risk budgeting asks how many wickets a side can afford to spend in each phase and still finish strongly.`,
          `Across the league since 2022, sides that were no more than one wicket down at halfway scored ${tok.fRR} an over in overs eleven to fifteen and lost ${tok.fW} wickets in that stretch.`,
        ], chartIds: ["rb-chart"] },
        { heading: "When the Budget Is Spent", body: [
          `Sides four or more down at halfway scored ${tok.dRR} an over in the same stretch and lost ${tok.dW} wickets. The chart includes ${a.poss} own figures where the sample allows.`,
          `The difference is the cost of an overspent budget: a side short of wickets cannot accelerate safely.`,
        ] },
        { heading: "Setting the Budget", body: [
          `A simple budget is two wickets by the end of the powerplay and four by the fifteenth over. Within it, batters can attack; beyond it, the next batter's job changes to protecting the finish.`,
          `For ${a.code}, the budget should depend on the depth of the batting: the deeper the order, the more wickets can be spent early.`,
        ] },
        { heading: "Budgets Ignore Who Is In", body: [
          `Four wickets down with the two best hitters at the crease is a different state from four down with the tail exposed. A wickets-only budget misses that.`,
          `{{hyp:resources}}`,
        ] },
        { heading: "CricField Verdict: Spend Wickets Early Only If the Order Is Deep", body: [
          `${a.name} should set a wickets budget for each phase based on their batting depth, and change the next batter's role when the budget is exceeded.`,
          `The league table gives the baseline rates against which each state can be judged.`,
        ] },
      ],
      charts: [{ id: "rb-chart", type: "column", title: "Run rate in overs 11–15 by wickets lost at halfway", subtitle: "2022–2026", table: "rb-state", xKey: "state", series: [{ key: "leagueRR", label: "Rest of IPL" }, { key: "teamRR", label: a.code }], xLabel: "Wickets lost after ten overs", unit: "runs per over", takeaway: "The more wickets lost by halfway, the slower the scoring that follows.", ariaLabel: "Column chart of run rate in overs eleven to fifteen grouped by wickets lost after ten overs." }],
      hypotheses: [hyp("resources", "a resources model that weights wickets by the batters remaining predicts scoring better than wickets lost alone.", "Batter quality has not been attached to each wicket state.", "Weight remaining batters by career strike rate and compare predictive power.")],
      players: [],
      seasons: ["2022–2026"],
      hero: { narrative: `${a.name} batting with intent.`, wanted: `${a.name} batter attacking in the middle overs.`, query: `${a.name} batting shot` },
      related: [1, 28, 81],
      seo: { metaTitle: metaTitle(`Risk budgeting: how aggressive should ${a.code} be?`), metaDescription: metaDesc(`How IPL scoring in overs eleven to fifteen depends on wickets lost at halfway, and how ${a.name} should budget risk.`) },
      methodology: `${METHOD} States use all dismissals in overs one to ten; the following stretch is overs eleven to fifteen. 2022–2026.`,
    };
  },
};

// ── 30. Captaincy Under Uncertainty ───────────────────────────────────────────
type Cap = { player: string; firstSeason: number; lastSeason: number; titles: number; matches: number; won: number; lost: number; winPct: number; exact: boolean; alsoLed: string[] };
const s30: SlotSpec = {
  n: 30,
  storyType: "archive",
  build(a) {
    const caps = JSON.parse(readFileSync(resolve(ROOT, "artifacts/api-server/data/captains.json"), "utf8")) as { byFranchise: Record<string, Cap[]> };
    const key = Object.keys(caps.byFranchise).find((k) => k === a.name) ?? Object.keys(caps.byFranchise).find((k) => k.startsWith(a.name.split(" ")[0]));
    const list = (key ? caps.byFranchise[key] : []).slice().sort((x, y) => y.matches - x.matches);
    const exact = list.filter((c) => c.exact && c.matches >= 5);
    const DS = "CricField captains.json (captaincy records compiled from match data)";
    const rows: Row[] = exact.map((c) => ({ captain: c.player, seasons: `${c.firstSeason}–${c.lastSeason}`, matches: c.matches, winPct: c.winPct, titles: c.titles }));
    a.table("cap-tab", `${a.code} captains with franchise-only records`, "Captains whose record covers this franchise alone (min. five matches)", exact.reduce((x, c) => x + c.matches, 0), "matches", "captains.json byFranchise", rows, DS);
    const top = exact[0];
    const tok = {
      n: a.int("cap-n", list.length, `${a.code} captains listed`, { filters: "captains.json", n: list.length, nUnit: "captains", sql: "captains.json byFranchise", check: range(list.length, 1, 30, "captain count"), dataset: DS }),
      topName: top ? a.text("cap-top", top.player, `${a.code}'s longest-serving captain with a franchise-only record`, { filters: "exact records only", n: top.matches, nUnit: "matches", sql: "captains.json byFranchise", check: derived("rank by matches"), dataset: DS }) : "",
      topPct: top ? a.pct("cap-top-pct", top.winPct, `${top.player} win rate as ${a.code} captain`, { filters: `${top.firstSeason}–${top.lastSeason}`, n: top.matches, nUnit: "matches", sql: "captains.json byFranchise", check: floor(top.matches, 5, "matches"), dataset: DS }) : "",
      topN: top ? a.int("cap-top-n", top.matches, `Matches with ${top.player} as ${a.code} captain`, { filters: "exact record", n: top.matches, nUnit: "matches", sql: "captains.json byFranchise", check: floor(top.matches, 5, "matches"), dataset: DS }) : "",
    };
    const multi = list.filter((c) => !c.exact).map((c) => c.player).slice(0, 3);
    const joinNames = (xs: string[]) => (xs.length <= 1 ? xs.join("") : `${xs.slice(0, -1).join(", ")} and ${xs[xs.length - 1]}`);
    const longest = list[0];
    const longestNote = longest && !longest.exact && top && longest.player !== top.player ? `${longest.player} captained ${a.code} for longer, but his record in the dataset combines franchises, so it is not compared.` : "";
    const all = a.results();
    const allTok = a.pct("cap-team", all.pct, `${a.code} win rate, all seasons`, { filters: "Matches with a result", n: all.n, nUnit: "matches", sql: all.sql, check: floor(all.n, 20, "matches") });
    return {
      dek: `Which decisions matter most for an ${a.name} captain? The franchise's captaincy record shows how leadership and results have moved together.`,
      excerpt: `${a.name} have had ${"several"} captains. The records that can be credited to this franchise alone show how much results have varied from one leader to the next.`.replace(`${"several"} captains`, `${list.length > 1 ? "a series of" : "one main"} captain${list.length > 1 ? "s" : ""}`),
      keyTakeaways: [
        `CricField lists ${tok.n} captains for ${a.code}.`,
        top ? `${tok.topName} has the longest franchise-only record: ${tok.topN} matches at a win rate of ${tok.topPct}.${longestNote ? ` ${longestNote}` : ""}` : `No captain has a franchise-only record of five or more matches in the dataset.`,
        `Across all seasons ${a.code} have won ${allTok} of matches with a result.`,
      ],
      sections: [
        { heading: "Decisions Under Uncertainty", body: [
          `A T20 captain makes a handful of decisions that move win probability: the toss choice, the bowling order, the use of the impact substitute and when to change the field. Most are made with incomplete information.`,
          `CricField's captaincy records list ${tok.n} captains for ${a.name}. The franchise has won ${allTok} of its matches with a result across all seasons.`,
        ] },
        { heading: "The Records", body: [
          top ? `Among captains whose records cover ${a.code} alone, ${tok.topName} led in ${tok.topN} matches at a win rate of ${tok.topPct}. The table lists every captain with a franchise-only record of five or more matches.` : `None of ${a.poss} captains has a franchise-only record of five or more matches in the dataset.`,
          multi.length ? `Some captains, including ${joinNames(multi)}, also led other franchises; their records in the dataset combine teams, so they are not compared here.` : `Every listed captain's record covers this franchise alone.`,
        ], chartIds: exact.length ? ["cap-chart"] : [] },
        { heading: "Which Decisions Matter Most", body: [
          `Elsewhere in this series, wickets in hand and death bowling show large measurable effects on results, while the toss is a small edge across the league. Those are the decisions most worth a captain's attention.`,
          `For ${a.code}, captaincy can be judged on those decisions rather than on the win rate alone, which depends heavily on the squad.`,
        ] },
        { heading: "Captains Inherit Their Squads", body: [
          `A captain's win rate is mostly a measure of the squad he was given. Separating leadership from talent needs decision-level data, such as bowling changes and field settings, that public records do not contain.`,
          `{{hyp:decisions}}`,
        ] },
        { heading: "CricField Verdict: Judge the Decisions, Not the Record", body: [
          `${a.name} should evaluate captains on a short list of measurable decisions, reviewed after each match, rather than on win rate.`,
          `Over a season, that review would show which captaincy habits are worth keeping.`,
        ] },
      ],
      charts: [{ id: "cap-chart", type: "bar", title: `${a.code} captains: win rate`, subtitle: "Franchise-only records, minimum five matches", table: "cap-tab", xKey: "captain", series: [{ key: "winPct", label: "Win rate" }], unit: "% of matches won", takeaway: "Captains' records differ, but each reflects the squad he led as much as his decisions.", ariaLabel: `Horizontal bar chart of win rate for each ${a.code} captain with a franchise-only record.` }],
      hypotheses: [hyp("decisions", "captains differ measurably in how well they deploy their best death bowler, independent of squad strength.", "Over-by-over captaincy decisions have not been reconstructed for every captain.", "Measure, for each captain, how often the best death bowler bowls the highest-leverage overs.")],
      sources: [{ id: "cf-captains", kind: "cricfield-dataset", title: "CricField captaincy records (captains.json)", publisher: "CricField", note: "Franchise-only records used; combined multi-team records are not compared." }],
      players: exact.slice(0, 3).map((c) => c.player),
      seasons: [yearsLabel(a.c.firstYear, 2026)],
      hero: { narrative: `${a.name} captaincy.`, wanted: `${top?.player ?? a.name} as ${a.name} captain.`, query: `${top?.player ?? ""} ${a.name} captain`.trim() },
      related: [64, 21, 26],
      seo: { metaTitle: metaTitle(`Captaincy under uncertainty at ${a.code}`), metaDescription: metaDesc(`${a.poss} captains and their franchise-only records, and which captaincy decisions can actually be measured.`) },
      methodology: `${METHOD} Captaincy records from CricField captains.json; only records marked as franchise-only are compared.`,
    };
  },
};

export const TACTICAL: SlotSpec[] = [s21, s22, s23, s24, s25, s26, s27, s28, s29, s30];
void BOWLER_RUNS, eras, extremes;
