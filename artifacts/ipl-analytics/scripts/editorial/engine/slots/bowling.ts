// Bowling & Fielding Science templates (plan slots 11–20).
import { BOWLER_RUNS, LEGAL, REGULATION, YEAR, batHand, bioByCricsheet, bowlType, derived, dp, floor, pearsonOf, range, yearsLabel, type Row } from "../core";
import { eras, extremes, phaseBlock, phasePlayers } from "../kit";
import { hyp, metaDesc, metaTitle, type SlotSpec } from "./types";

const METHOD = "Regulation innings only (super overs excluded). Economy uses runs charged to the bowler (byes and leg-byes excluded) per legal ball times six. Bowler wickets exclude run outs. Generated from the CricField warehouse by scripts/editorial/engine.";
const BOWLER_WKT = `dm.dismissal_id IS NOT NULL AND dm.kind NOT IN ('run out','retired hurt','retired out','obstructing the field')`;
const BIO_DS = "CricField warehouse + player-bio.json";
const material = (x: number, y: number, tol: number) => Math.abs(x - y) >= tol;

// ── 11. New-Ball Blueprint ────────────────────────────────────────────────────
const s11: SlotSpec = {
  n: 11,
  storyType: "tactical",
  build(a) {
    const pb = phaseBlock(a, "nb", "bowl", "newball");
    const sql = `WITH w AS (SELECT i.innings_id, i.match_id, i.bowling_team_id bo, SUM(CASE WHEN ${BOWLER_WKT} THEN 1 ELSE 0 END) wk
        FROM innings i JOIN deliveries d ON d.innings_id = i.innings_id LEFT JOIN dismissals dm ON dm.delivery_id = d.delivery_id
        WHERE ${REGULATION} AND d.over_num BETWEEN 0 AND 2 GROUP BY i.innings_id)
      SELECT CASE WHEN wk >= 2 THEN '2+' ELSE CAST(wk AS TEXT) END k, COUNT(*) n, SUM(CASE WHEN m.winner_id = w.bo THEN 1 ELSE 0 END) won,
        SUM(CASE WHEN w.bo IN ${a.T} THEN 1 ELSE 0 END) tn, SUM(CASE WHEN w.bo IN ${a.T} AND m.winner_id = w.bo THEN 1 ELSE 0 END) tw
      FROM w JOIN matches m ON m.match_id = w.match_id WHERE m.winner_id IS NOT NULL GROUP BY k ORDER BY k`;
    const rs = a.rows<{ k: string; n: number; won: number; tn: number; tw: number }>(sql);
    a.table("nb-wkts", "Bowling side's win rate by wickets taken in overs 1–3", "Innings with a result; bowler-credited wickets", rs.reduce((x, r) => x + r.n, 0), "innings", sql, rs.map((r) => ({ wickets: r.k, league: dp((r.won / r.n) * 100), team: r.tn >= 10 ? dp((r.tw / r.tn) * 100) : null })));
    const r0 = rs.find((r) => r.k === "0")!, r2 = rs.find((r) => r.k === "2+")!;
    const tok = {
      l0: a.pct("nb-l0", (r0.won / r0.n) * 100, "Bowling side's IPL win rate with no wicket in overs 1–3", { filters: "Innings with a result", n: r0.n, nUnit: "innings", sql, check: floor(r0.n, 100, "innings") }),
      l2: a.pct("nb-l2", (r2.won / r2.n) * 100, "Bowling side's IPL win rate with two or more wickets in overs 1–3", { filters: "Innings with a result", n: r2.n, nUnit: "innings", sql, check: floor(r2.n, 100, "innings") }),
      tShare: a.pct("nb-tshare", ((rs.filter((r) => r.k !== "0").reduce((x, r) => x + r.tn, 0)) / rs.reduce((x, r) => x + r.tn, 0)) * 100, `Share of ${a.code} bowling innings with a wicket in the first three overs`, { filters: "Innings with a result", n: rs.reduce((x, r) => x + r.tn, 0), nUnit: "innings", sql, check: floor(rs.reduce((x, r) => x + r.tn, 0), 20, "innings") }, 0),
    };
    const pl = phasePlayers(a, "nbp", "bowl", 0, 2, 2024, 2026, 60);
    const t = pb.tok;
    const x = extremes(a, "nb-x", pb.v.rows, "economy in overs 1–3", "runs per over", false);
    return {
      dek: `What should ${a.name} optimise before the fourth over: wickets or containment? The first three overs of every innings answer it.`,
      excerpt: `${a.name} have conceded ${pb.better ? "less" : "more"} than the league in the first three overs since 2024. Across the IPL, early wickets move the result far more than a tight start does.`,
      keyTakeaways: [
        `${a.code} conceded ${t.t2} runs per over in overs one to three since 2024; the league conceded ${t.l2}.`,
        `Bowling sides that took two or more wickets in the first three overs won ${tok.l2} of IPL matches; with none, ${tok.l0}.`,
        `${a.code} have struck in the first three overs in ${tok.tShare} of their bowling innings.`,
      ],
      sections: [
        { heading: "Three Overs That Shape an Innings", body: [
          `The new ball offers swing, seam and a batter who has not yet seen the pace of the pitch. It is the best chance a bowling side gets to take a wicket cheaply, and the question is whether to attack with it or simply keep the scoring down.`,
          `${a.name} conceded ${t.t1} runs per over in the first three overs between ${eras(a).e1[0]} and ${eras(a).e1[1]}, against ${t.l1} for the league. Since 2024 the figures are ${t.t2} and ${t.l2}.`,
          x,
        ].filter(Boolean), chartIds: ["nb-trend"] },
        { heading: "What an Early Wicket Is Worth", body: [
          `Across every IPL innings with a result, the bowling side won ${tok.l0} of the time when it took no wicket in the first three overs, and ${tok.l2} when it took two or more.`,
          `${a.code} have taken at least one wicket in that window in ${tok.tShare} of their bowling innings.`,
        ], chartIds: ["nb-wkts"] },
        { heading: "Who Takes the New Ball", body: [
          pl.tok ? `Since 2024 ${pl.tok.name} has bowled the most of ${a.poss} balls in the first three overs, ${pl.tok.balls} of them, at an economy of ${pl.tok.rate}.` : `${a.code} have shared the new ball widely since 2024.`,
          `The player table shows economy, dot-ball rate and wickets side by side. A new-ball bowler who concedes a little more but strikes more often can be the better choice, given what an early wicket is worth.`,
        ], chartIds: pl.rows.length ? ["nb-players"] : [] },
        { heading: "When Containment Is the Right Plan", body: [
          `Attacking lengths cost more when they miss. On a flat pitch against openers who punish width, a tight new-ball spell may protect a total better than a wicket hunt.`,
          `{{hyp:conditions}}`,
        ] },
        { heading: "CricField Verdict: Hunt Wickets With the New Ball", body: [
          `The evidence shows how much an early wicket moves the result. ${a.name} should pick new-ball bowlers on strike rate in that window as much as on economy.`,
          `Field settings should follow: catchers in place for the first three overs, even at the cost of a few boundaries.`,
        ] },
      ],
      charts: [
        { id: "nb-trend", type: "line", title: "Economy in overs 1–3 by season", subtitle: `${a.code} bowling vs IPL`, table: pb.table, xKey: "season", series: [{ key: "team", label: a.code }, { key: "league", label: "IPL average" }], xLabel: "Season", unit: "runs per over", takeaway: `${a.code} have conceded ${pb.better ? "less" : "more"} than the league with the new ball since 2024.`, ariaLabel: `Line chart of ${a.code} economy in the first three overs and the IPL average by season.` },
        { id: "nb-wkts", type: "column", title: "Win rate by wickets taken in overs 1–3", subtitle: "Bowling side, innings with a result", table: "nb-wkts", xKey: "wickets", series: [{ key: "league", label: "IPL" }, { key: "team", label: a.code }], xLabel: "Wickets in overs 1–3", unit: "% of matches won", takeaway: "Early wickets lift the bowling side's win rate sharply.", ariaLabel: "Column chart of the bowling side's win rate by wickets taken in the first three overs." },
        { id: "nb-players", type: "bar", title: `${a.code} new-ball bowlers since 2024`, subtitle: "Economy in overs 1–3, minimum 60 balls", table: pl.table, xKey: "player", series: [{ key: "economy", label: "Economy" }], unit: "runs per over", takeaway: "New-ball economy varies widely within the attack.", ariaLabel: `Horizontal bar chart of new-ball economy for ${a.code} bowlers since 2024.` },
      ],
      hypotheses: [hyp("conditions", "the value of an early wicket depends on pitch and swing conditions more than on the bowler.", "Pitch and ball-movement data are not recorded.", "Compare early-wicket rates and match outcomes by venue and month.")],
      players: pl.rs.slice(0, 4).map((r) => r.name),
      seasons: [yearsLabel(a.c.firstYear, 2026), "2024–2026"],
      hero: { narrative: `${a.name} new-ball bowling.`, wanted: `${pl.lead?.name ?? a.name} bowling with the new ball.`, query: `${pl.lead?.name ?? ""} ${a.name} bowls`.trim() },
      related: [13, 15, 1],
      seo: { metaTitle: metaTitle(`New-ball blueprint: what ${a.code} should optimise`), metaDescription: metaDesc(`${a.poss} economy in the first three overs against the IPL, and how much an early wicket is worth to the bowling side.`) },
      methodology: `${METHOD} New ball = overs one to three.`,
    };
  },
};

// ── 12. The Yorker Premium (execution vs variation) ──────────────────────────
const s12: SlotSpec = {
  n: 12,
  storyType: "tactical",
  build(a) {
    const sql = `SELECT CASE WHEN i.bowling_team_id IN ${a.T} THEN 'team' ELSE 'rest' END side,
        CASE WHEN c.length = 'Yorker' THEN 'Yorker' WHEN c.variation IN ('Slower ball','Off-cutter','Leg-cutter') THEN 'Slower ball / cutter' WHEN c.length IS NOT NULL THEN 'Other labelled ball' END dkind,
        SUM(${BOWLER_RUNS}) runs, SUM(CASE WHEN ${LEGAL} THEN 1 ELSE 0 END) balls, SUM(CASE WHEN ${BOWLER_WKT} THEN 1 ELSE 0 END) wk
      FROM deliveries d JOIN innings i ON i.innings_id = d.innings_id JOIN matches m ON m.match_id = d.match_id
      JOIN delivery_commentary c ON c.delivery_id = d.delivery_id LEFT JOIN dismissals dm ON dm.delivery_id = d.delivery_id
      WHERE ${REGULATION} AND d.over_num BETWEEN 15 AND 19 AND ${YEAR()} >= 2022 GROUP BY side, dkind HAVING dkind IS NOT NULL`;
    const rs = a.rows<{ side: string; dkind: string; runs: number; balls: number; wk: number }>(sql);
    const kinds = ["Yorker", "Slower ball / cutter", "Other labelled ball"];
    const g = (side: string, k: string) => rs.find((r) => r.side === side && r.dkind === k) ?? { runs: 0, balls: 0, wk: 0 };
    a.table("yk-kinds", "Death-overs cost by delivery type, 2022–2026", "Overs 16–20; commentary-derived length and variation labels", rs.reduce((x, r) => x + r.balls, 0), "labelled balls", sql, kinds.map((k) => ({ delivery: k, team: g("team", k).balls >= 30 ? dp(g("team", k).runs / g("team", k).balls, 2) : null, league: dp(g("rest", k).runs / g("rest", k).balls, 2), teamBalls: g("team", k).balls })));
    const rpb = (side: string, k: string) => g(side, k).runs / Math.max(1, g(side, k).balls);
    const o = (side: string, k: string, label: string) => a.num(`yk-${side}-${k.split(" ")[0].toLowerCase()}`, rpb(side, k), label, { unit: "runs per ball", filters: "Overs 16–20, 2022–2026", n: g(side, k).balls, nUnit: "labelled balls", sql, check: floor(g(side, k).balls, side === "team" ? 30 : 300, "balls") }, 2);
    const teamOK = g("team", "Yorker").balls >= 30 && g("team", "Slower ball / cutter").balls >= 30;
    const tok = {
      lY: o("rest", "Yorker", "IPL runs per yorker in the death, 2022–2026"),
      lS: o("rest", "Slower ball / cutter", "IPL runs per slower ball or cutter in the death, 2022–2026"),
      lO: o("rest", "Other labelled ball", "IPL runs per other labelled ball in the death, 2022–2026"),
      tY: teamOK ? o("team", "Yorker", `${a.code} runs per yorker in the death, 2022–2026`) : "",
      tS: teamOK ? o("team", "Slower ball / cutter", `${a.code} runs per slower ball or cutter in the death, 2022–2026`) : "",
      tYshare: a.pct("yk-share", (g("team", "Yorker").balls / Math.max(1, kinds.reduce((x, k) => x + g("team", k).balls, 0))) * 100, `Yorkers as a share of ${a.code}'s labelled death balls`, { filters: "2022–2026", n: kinds.reduce((x, k) => x + g("team", k).balls, 0), nUnit: "labelled balls", sql, check: floor(kinds.reduce((x, k) => x + g("team", k).balls, 0), 100, "balls") }),
      lYshare: a.pct("yk-lshare", (g("rest", "Yorker").balls / kinds.reduce((x, k) => x + g("rest", k).balls, 0)) * 100, "Yorkers as a share of the rest of the IPL's labelled death balls", { filters: "2022–2026", n: kinds.reduce((x, k) => x + g("rest", k).balls, 0), nUnit: "labelled balls", sql, check: floor(kinds.reduce((x, k) => x + g("rest", k).balls, 0), 1000, "balls") }),
    };
    const yBetter = rpb("rest", "Yorker") < rpb("rest", "Slower ball / cutter");
    return {
      dek: `At the death, is ${a.poss} best weapon the perfectly executed yorker or the well-disguised slower ball? Commentary labels let CricField price both.`,
      excerpt: `Across the IPL since 2022, the yorker has cost ${yBetter ? "less" : "more"} per ball in the death overs than slower balls and cutters. Here is how ${a.poss} delivery mix compares.`,
      keyTakeaways: [
        `IPL death yorkers cost ${tok.lY} runs per ball since 2022; slower balls and cutters cost ${tok.lS}.`,
        `Yorkers make up ${tok.tYshare} of ${a.poss} labelled death balls, against ${tok.lYshare} for the rest of the league.`,
        teamOK ? `${a.code} conceded ${tok.tY} per yorker and ${tok.tS} per slower ball or cutter.` : `${a.poss} own labelled sample is too small to split by delivery type with confidence.`,
      ],
      sections: [
        { heading: "Execution or Deception", body: [
          `Death bowling has two philosophies. One says nail the yorker and the batter cannot score; the other says change pace and the batter cannot time it. Both are skills, and both carry a cost when they go wrong.`,
          `Using commentary-derived labels for deliveries in overs sixteen to twenty since 2022, the league's yorkers cost ${tok.lY} runs per ball, slower balls and cutters ${tok.lS}, and all other labelled deliveries ${tok.lO}.`,
        ], chartIds: ["yk-chart"] },
        { heading: `${a.poss} Mix`, body: [
          `Yorkers make up ${tok.tYshare} of ${a.poss} labelled death deliveries, against ${tok.lYshare} for the rest of the IPL.`,
          teamOK ? `When they land it, ${a.code} concede ${tok.tY} per yorker; slower balls and cutters cost them ${tok.tS}.` : `The franchise's own split is too thin to read, so the league pattern is the guide.`,
        ] },
        { heading: "Building the Death Plan", body: [
          `The data ${yBetter ? "favours" : "does not clearly favour"} execution over variation at league level. The practical answer is a mix: a bowler whose yorker is reliable should lead with it, and a bowler whose yorker misses should lean on pace-off deliveries.`,
          `That makes yorker accuracy in practice a measurable selection input, not just a coaching talking point.`,
        ] },
        { heading: "What Labels Cannot Capture", body: [
          `Commentary labels describe the result as much as the intention: a slower ball that is smashed may be recorded as a full toss. That bias could make either option look better than it is.`,
          `{{hyp:labels}}`,
        ] },
        { heading: `CricField Verdict: ${yBetter ? "Execution First, Variation as Cover" : "Variation Earns Its Place"}`, body: [
          `For ${a.name}, the league evidence says the ${yBetter ? "yorker" : "change of pace"} is the cheaper death ball when bowled. The bowling plan should be built around whichever each bowler executes more reliably.`,
          `Tracking each bowler's delivery mix and cost by type each season would turn this from instinct into measurement.`,
        ] },
      ],
      charts: [{ id: "yk-chart", type: "column", title: "Death-overs cost by delivery type", subtitle: "Overs 16–20, 2022–2026, labelled balls", table: "yk-kinds", xKey: "delivery", series: [{ key: "league", label: "Rest of IPL" }, { key: "team", label: a.code }], xLabel: "Delivery", unit: "runs per ball", takeaway: `League-wide, the ${yBetter ? "yorker" : "slower ball"} has been the cheaper death delivery.`, ariaLabel: "Column chart of runs per ball in the death overs for yorkers, slower balls and other deliveries." }],
      hypotheses: [hyp("labels", "commentary labelling inflates the cost of failed variations because expensive balls are described by their result.", "No ball-tracking data is available to check labels against.", "Compare commentary labels with tracking data for a sample of matches.")],
      players: [],
      seasons: ["2022–2026"],
      hero: { narrative: `A ${a.name} bowler at the death.`, wanted: `${a.name} fast bowler bowling late in an innings.`, query: `${a.name} bowls death` },
      related: [15, 18, 28],
      seo: { metaTitle: metaTitle(`The yorker premium: execution or variation for ${a.code}?`), metaDescription: metaDesc(`What yorkers and slower balls cost in the death overs since 2022, and how ${a.poss} delivery mix compares with the IPL.`) },
      methodology: `${METHOD} Length and variation labels come from ball-by-ball commentary (delivery_commentary), 2022–2026; unlabelled balls are excluded. Slower balls include off- and leg-cutters.`,
    };
  },
};

// ── 13. Wickets Versus Economy ────────────────────────────────────────────────
const s13: SlotSpec = {
  n: 13,
  storyType: "explainer",
  build(a) {
    const sql = `SELECT m.match_id, i.bowling_team_id bo, CASE WHEN m.winner_id = i.bowling_team_id THEN 1 ELSE 0 END won,
        SUM(${BOWLER_RUNS}) runs, SUM(CASE WHEN ${LEGAL} THEN 1 ELSE 0 END) balls, SUM(CASE WHEN ${BOWLER_WKT} THEN 1 ELSE 0 END) wk
      FROM deliveries d JOIN innings i ON i.innings_id = d.innings_id JOIN matches m ON m.match_id = d.match_id LEFT JOIN dismissals dm ON dm.delivery_id = d.delivery_id
      WHERE ${REGULATION} AND m.winner_id IS NOT NULL GROUP BY m.match_id, i.innings_id`;
    const rs = a.rows<{ bo: number; won: number; runs: number; balls: number; wk: number }>(sql).filter((r) => r.balls >= 60);
    const xs = rs.map((r) => (r.runs * 6) / r.balls), ws = rs.map((r) => r.wk), win = rs.map((r) => r.won);
    const cEcon = pearsonOf(xs, win), cWk = pearsonOf(ws, win);
    const tok = {
      cE: a.num("we-c-econ", cEcon, "Correlation between a bowling innings' economy and winning (IPL)", { filters: "Bowling innings of at least ten overs, matches with a result", n: rs.length, nUnit: "innings", sql, check: floor(rs.length, 1000, "innings") }, 2),
      cW: a.num("we-c-wk", cWk, "Correlation between wickets taken in a bowling innings and winning (IPL)", { filters: "As above", n: rs.length, nUnit: "innings", sql, check: floor(rs.length, 1000, "innings") }, 2),
    };
    const bSql = `SELECT pl.name, ${YEAR()} year, SUM(${BOWLER_RUNS}) runs, SUM(CASE WHEN ${LEGAL} THEN 1 ELSE 0 END) balls, SUM(CASE WHEN ${BOWLER_WKT} THEN 1 ELSE 0 END) wk
      FROM deliveries d JOIN innings i ON i.innings_id = d.innings_id JOIN matches m ON m.match_id = d.match_id JOIN players pl ON pl.player_id = d.bowler_id LEFT JOIN dismissals dm ON dm.delivery_id = d.delivery_id
      WHERE ${REGULATION} AND i.bowling_team_id IN ${a.T} AND ${YEAR()} >= 2022 GROUP BY pl.name, year HAVING balls >= 120`;
    const bs = a.rows<{ name: string; year: number; runs: number; balls: number; wk: number }>(bSql);
    a.table("we-scatter", `${a.code} bowler-seasons since 2022: economy vs strike rate`, "Bowler-seasons with at least 120 legal balls", bs.reduce((x, r) => x + r.balls, 0), "balls", bSql, bs.map((r) => ({ bowler: `${r.name} (${r.year})`, economy: dp((r.runs * 6) / r.balls, 2), ballsPerWicket: r.wk ? dp(r.balls / r.wk, 1) : null })).filter((r) => r.ballsPerWicket !== null));
    const best = [...bs].filter((r) => r.wk >= 5).sort((x, y) => (x.runs / x.balls) - (y.runs / y.balls))[0];
    const tok2 = best ? {
      name: a.text("we-best-name", `${best.name} (${best.year})`, `${a.code}'s most economical bowler-season since 2022 (min. five wickets)`, { filters: "Min. 120 balls and five wickets", n: best.balls, nUnit: "balls", sql: bSql, check: derived("rank by economy") }),
      econ: a.num("we-best-econ", (best.runs * 6) / best.balls, `${best.name} economy in ${best.year}`, { unit: "runs per over", filters: `${a.code}, ${best.year}`, n: best.balls, nUnit: "balls", sql: bSql, check: floor(best.balls, 120, "balls") }, 2),
    } : null;
    const econStronger = Math.abs(cEcon) > Math.abs(cWk);
    return {
      dek: `Should ${a.name} judge bowlers by wickets or by runs conceded? Across thousands of IPL bowling innings, one measure tracks winning more closely.`,
      excerpt: `In IPL bowling innings, ${econStronger ? "economy" : "wickets"} tracks the result more closely than ${econStronger ? "wickets" : "economy"}. That should shape how ${a.name} rate their attack.`,
      keyTakeaways: [
        `Across IPL bowling innings, economy correlates with winning at ${tok.cE} and wickets at ${tok.cW}.`,
        `The ${econStronger ? "stronger" : "weaker"} link is economy, by absolute size.`,
        tok2 ? `${a.poss} most economical bowler-season since 2022 (five or more wickets): ${tok2.name} at ${tok2.econ} an over.` : `${a.code} bowler-seasons since 2022 appear in the scatter chart.`,
      ],
      sections: [
        { heading: "Two Ways to Rate a Bowler", body: [
          `Wicket-takers make headlines; economical bowlers win quiet arguments in analytics departments. The two measures overlap, because wickets slow scoring, but they are not the same thing.`,
          `CricField took every IPL bowling innings of at least ten overs from matches with a result and correlated the side's economy and wickets with whether it won. Economy correlates at ${tok.cE} (lower economy, more wins) and wickets at ${tok.cW}.`,
        ] },
        { heading: "What the Correlations Say", body: [
          `By absolute size, the link between ${econStronger ? "economy" : "wickets"} and winning is the stronger one. Neither measure explains most of the outcome, because batting decides the other half of the match.`,
          `The scatter chart places each ${a.code} bowler-season since 2022 on both axes, which makes the trade-off visible: some bowlers buy wickets with runs, others save runs without striking.`,
        ], chartIds: ["we-scatter"] },
        { heading: "Rating the Attack", body: [
          tok2 ? `${tok2.name} was ${a.poss} most economical bowler-season since 2022 among those with five or more wickets, at ${tok2.econ} an over.` : `${a.poss} bowler-seasons since 2022 are spread across both axes.`,
          `A balanced attack needs both types. The practical rating combines runs saved against the phase average with a value for each wicket, rather than reading either column on its own.`,
        ] },
        { heading: "Why Correlation Is Not the Whole Story", body: [
          `Team-level correlations mix bowlers, and wickets late in an innings are worth less than wickets early. A bowler who takes the tenth wicket and one who removes a set opener get the same credit here.`,
          `{{hyp:timing}}`,
        ] },
        { heading: "CricField Verdict: Price Both, Weight by Phase", body: [
          `${a.name} should judge bowlers on runs saved against the phase average and on wickets weighted by when they fall. The league evidence says ${econStronger ? "economy" : "wickets"} carries more of the signal, but not all of it.`,
          `That dual measure would make auction and selection decisions about bowlers far less dependent on headline wicket counts.`,
        ] },
      ],
      charts: [{ id: "we-scatter", type: "scatter", title: "Economy against strike rate", subtitle: `${a.code} bowler-seasons since 2022, min. 120 balls`, table: "we-scatter", xKey: "economy", series: [{ key: "ballsPerWicket", label: "Balls per wicket" }], xLabel: "Economy (runs per over)", unit: "balls per wicket", takeaway: "The best bowler-seasons sit low on both axes: cheap and penetrative.", ariaLabel: `Scatter plot of economy against balls per wicket for ${a.code} bowler-seasons since 2022.` }],
      hypotheses: [hyp("timing", "wickets in the first half of an innings are worth several times more than wickets in the last five overs.", "A wicket-value model by over and wickets in hand has not been fitted.", "Estimate runs saved per wicket by over from historical innings and re-rank bowlers.")],
      players: tok2 && best ? [best.name] : [],
      seasons: ["2008–2026", "2022–2026"],
      hero: { narrative: `A ${a.name} bowler taking a wicket.`, wanted: `${best?.name ?? a.name} celebrating a wicket for ${a.name}.`, query: `${best?.name ?? ""} ${a.name} wicket`.trim() },
      related: [11, 39, 87],
      seo: { metaTitle: metaTitle(`Wickets versus economy: how ${a.code} should judge bowlers`), metaDescription: metaDesc(`Which tracks IPL wins more closely, wickets or economy, and where ${a.poss} bowlers sit on both since 2022.`) },
      methodology: `${METHOD} Correlations are Pearson coefficients across bowling innings of at least ten overs; economy is negatively related to winning.`,
    };
  },
};

// ── 14. Middle-Overs Spin ─────────────────────────────────────────────────────
const s14: SlotSpec = {
  n: 14,
  storyType: "tactical",
  build(a) {
    const bio = bioByCricsheet();
    const sql = `SELECT CASE WHEN i.bowling_team_id IN ${a.T} THEN 'team' ELSE 'rest' END side, bw.name bowler, ${BOWLER_RUNS} r, CASE WHEN ${LEGAL} THEN 1 ELSE 0 END b,
        CASE WHEN ${BOWLER_RUNS} = 0 AND ${LEGAL} THEN 1 ELSE 0 END dot, CASE WHEN ${BOWLER_WKT} THEN 1 ELSE 0 END w
      FROM deliveries d JOIN innings i ON i.innings_id = d.innings_id JOIN matches m ON m.match_id = d.match_id JOIN players bw ON bw.player_id = d.bowler_id LEFT JOIN dismissals dm ON dm.delivery_id = d.delivery_id
      WHERE ${REGULATION} AND d.over_num BETWEEN 6 AND 14 AND ${YEAR()} >= 2022`;
    const rs = a.rows<{ side: string; bowler: string; r: number; b: number; dot: number; w: number }>(sql);
    const acc: Record<string, { r: number; b: number; dot: number; w: number }> = {};
    const per: Record<string, { r: number; b: number; w: number }> = {};
    for (const x of rs) {
      const ty = bowlType(bio.get(x.bowler)?.bowlStyle);
      if (!ty) continue;
      const g = (acc[`${x.side}|${ty}`] ??= { r: 0, b: 0, dot: 0, w: 0 });
      g.r += x.r, (g.b += x.b), (g.dot += x.dot), (g.w += x.w);
      if (x.side === "team" && ty === "spin") { const p = (per[x.bowler] ??= { r: 0, b: 0, w: 0 }); p.r += x.r, (p.b += x.b), (p.w += x.w); }
    }
    const g = (k: string) => acc[k] ?? { r: 0, b: 1, dot: 0, w: 0 };
    const econ = (k: string) => (g(k).r * 6) / g(k).b, dotp = (k: string) => (g(k).dot / g(k).b) * 100;
    a.table("mos-cmp", "Middle-overs bowling by type, 2022–2026", "Overs 7–15; bowling type from player-bio.json", Object.values(acc).reduce((x, v) => x + v.b, 0), "balls", sql, [
      { bowling: "Spin", teamEconomy: dp(econ("team|spin"), 2), leagueEconomy: dp(econ("rest|spin"), 2), teamDotPct: dp(dotp("team|spin")), leagueDotPct: dp(dotp("rest|spin")) },
      { bowling: "Pace", teamEconomy: dp(econ("team|pace"), 2), leagueEconomy: dp(econ("rest|pace"), 2), teamDotPct: dp(dotp("team|pace")), leagueDotPct: dp(dotp("rest|pace")) },
    ], BIO_DS);
    const o = (id: string, v: number, label: string, k: string, unit: string, floorN: number) => a.num(id, v, label, { unit, filters: "Overs 7–15, 2022–2026", n: g(k).b, nUnit: "balls", sql, check: floor(g(k).b, floorN, "balls"), dataset: BIO_DS }, unit === "runs per over" ? 2 : 1);
    const tok = {
      tE: o("mos-te", econ("team|spin"), `${a.code} spin economy in the middle overs`, "team|spin", "runs per over", 300),
      lE: o("mos-le", econ("rest|spin"), "Rest of IPL spin economy in the middle overs", "rest|spin", "runs per over", 3000),
      tD: o("mos-td", dotp("team|spin"), `${a.code} spin dot-ball rate in the middle overs`, "team|spin", "% of balls", 300),
      lD: o("mos-ld", dotp("rest|spin"), "Rest of IPL spin dot-ball rate in the middle overs", "rest|spin", "% of balls", 3000),
      tShare: a.pct("mos-share", (g("team|spin").b / (g("team|spin").b + g("team|pace").b)) * 100, `Share of ${a.poss} middle-overs balls bowled by spinners`, { filters: "Overs 7–15, 2022–2026, typed bowlers", n: g("team|spin").b + g("team|pace").b, nUnit: "balls", sql, check: floor(g("team|spin").b + g("team|pace").b, 500, "balls"), dataset: BIO_DS }, 0),
      lShare: a.pct("mos-lshare", (g("rest|spin").b / (g("rest|spin").b + g("rest|pace").b)) * 100, "Share of the rest of the IPL's middle-overs balls bowled by spinners", { filters: "Overs 7–15, 2022–2026, typed bowlers", n: g("rest|spin").b + g("rest|pace").b, nUnit: "balls", sql, check: floor(g("rest|spin").b + g("rest|pace").b, 5000, "balls"), dataset: BIO_DS }, 0),
    };
    const lead = Object.entries(per).sort((x, y) => y[1].b - x[1].b)[0];
    const leadTok = lead && lead[1].b >= 120 ? { name: a.text("mos-lead", lead[0], `${a.poss} most-used middle-overs spinner since 2022`, { filters: "Ranked by balls", n: lead[1].b, nUnit: "balls", sql, check: derived("rank by balls"), dataset: BIO_DS }), econ: a.num("mos-lead-econ", (lead[1].r * 6) / lead[1].b, `${lead[0]} middle-overs economy since 2022`, { unit: "runs per over", filters: "Overs 7–15", n: lead[1].b, nUnit: "balls", sql, check: floor(lead[1].b, 120, "balls"), dataset: BIO_DS }, 2) } : null;
    const tighter = econ("team|spin") < econ("rest|spin"), mat = material(econ("team|spin"), econ("rest|spin"), 0.25);
    const desc = !mat ? "in line with" : tighter ? "tighter than" : "more expensive than";
    return {
      dek: `Can ${a.poss} spinners squeeze an innings without taking wickets? Dot-ball rates and economy in the middle overs since 2022 measure the pressure they create.`,
      excerpt: `${a.poss} middle-overs spin has been ${desc} the rest of the league's since 2022. Pressure without wickets is real, but it has to be measured in dots and runs, not reputation.`,
      keyTakeaways: [
        `${a.code} spinners conceded ${tok.tE} an over in overs seven to fifteen since 2022; the rest of the IPL's spinners conceded ${tok.lE}.`,
        `Their dot-ball rate was ${tok.tD}, against ${tok.lD} league-wide.`,
        `Spinners bowled ${tok.tShare} of ${a.poss} typed middle-overs balls; across the rest of the league, ${tok.lShare}.`,
      ],
      sections: [
        { heading: "The Squeeze Theory", body: [
          `The case for middle-overs spin is pressure: a run of dot balls forces a batter to take a risk, and the wicket follows, sometimes off the next bowler. If the theory holds, a spinner can be valuable without a big wicket tally.`,
          `Since 2022, with bowling type known from player-bio data, ${a.poss} spinners have conceded ${tok.tE} an over in overs seven to fifteen against ${tok.lE} for the rest of the league.`,
        ], chartIds: ["mos-chart"] },
        { heading: "Dots as the Currency of Pressure", body: [
          `${a.poss} spinners have bowled dot balls on ${tok.tD} of their middle-overs deliveries, against ${tok.lD} for the rest of the IPL. Spin has taken ${tok.tShare} of the franchise's typed middle-overs balls, against ${tok.lShare} elsewhere.`,
          leadTok ? `${leadTok.name} has carried the biggest middle-overs spin workload since 2022, at an economy of ${leadTok.econ}.` : `No single spinner dominates ${a.poss} middle-overs workload since 2022.`,
        ] },
        { heading: "Using Spin to Set Up Wickets", body: [
          `If spin squeezes and pace strikes, the order of bowlers matters: a tight spell from a spinner is most useful immediately before a wicket-taking seamer returns.`,
          `For ${a.code} the measurable test is what happens in the over after a spinner's dot-heavy over, a pattern that the ball-by-ball data can track.`,
        ] },
        { heading: "Pressure Can Be an Illusion", body: [
          `A low economy in the middle overs may reflect batters choosing to consolidate rather than spinners forcing them to. Without measuring what the following overs yield, the squeeze cannot be proven.`,
          `{{hyp:carry}}`,
        ] },
        { heading: `CricField Verdict: Measure the Squeeze`, body: [
          `${a.poss} spin has been ${desc} the league's in the middle overs since 2022. The franchise should value spinners on dot rate and economy, and test whether their dot-heavy overs lead to wickets for the next bowler.`,
          `That would turn the squeeze from a cliché into a number the selectors can use.`,
        ] },
      ],
      charts: [{ id: "mos-chart", type: "column", title: "Middle-overs economy by bowling type", subtitle: "Overs 7–15, 2022–2026", table: "mos-cmp", xKey: "bowling", series: [{ key: "teamEconomy", label: a.code }, { key: "leagueEconomy", label: "Rest of IPL" }], xLabel: "Bowling type", unit: "runs per over", takeaway: `${a.poss} middle-overs spin has been ${desc} the rest of the league's.`, ariaLabel: "Grouped column chart of middle-overs economy for spin and pace bowling." }],
      hypotheses: [hyp("carry", "dot-heavy spin overs raise the chance of a wicket in the following over.", "The over-to-over carry-over effect has not been modelled.", "Compare wicket rates in overs that follow a spin over with three or more dots against other overs.")],
      sources: [{ id: "cf-bio", kind: "cricfield-dataset", title: "CricField player-bio dataset (bowling styles)", publisher: "CricField", note: "Joined via squad lists; balls by bowlers of unknown type excluded." }],
      players: leadTok ? [lead[0]] : [],
      seasons: ["2022–2026"],
      hero: { narrative: `${a.name} spin in the middle overs.`, wanted: `${lead?.[0] ?? a.name} bowling spin for ${a.name}.`, query: `${lead?.[0] ?? ""} ${a.name} bowls`.trim() },
      related: [8, 13, 4],
      seo: { metaTitle: metaTitle(`Middle-overs spin: can ${a.code} squeeze without wickets?`), metaDescription: metaDesc(`${a.poss} spin economy and dot-ball rate in overs seven to fifteen since 2022, against the rest of the IPL.`) },
      methodology: `${METHOD} Middle overs = seven to fifteen. Bowling type from CricField player-bio data via squad lists; unknown types excluded.`,
    };
  },
};

// ── 15. Death-Overs Risk ──────────────────────────────────────────────────────
const s15: SlotSpec = {
  n: 15,
  storyType: "tactical",
  build(a) {
    const pb = phaseBlock(a, "do", "bowl", "death");
    const sql = `SELECT CASE WHEN i.bowling_team_id IN ${a.T} THEN 'team' ELSE 'rest' END side, c.length len, SUM(${BOWLER_RUNS}) runs, SUM(CASE WHEN ${LEGAL} THEN 1 ELSE 0 END) balls
      FROM deliveries d JOIN innings i ON i.innings_id = d.innings_id JOIN matches m ON m.match_id = d.match_id JOIN delivery_commentary c ON c.delivery_id = d.delivery_id
      WHERE ${REGULATION} AND d.over_num BETWEEN 15 AND 19 AND ${YEAR()} >= 2022 AND c.length IN ('Yorker','Full toss','Full','Good length','Length ball','Short of a length','Short') GROUP BY side, len`;
    const rs = a.rows<{ side: string; len: string; runs: number; balls: number }>(sql);
    const g = (side: string, l: string) => rs.find((r) => r.side === side && r.len === l) ?? { runs: 0, balls: 0 };
    const order = ["Yorker", "Full", "Full toss", "Good length", "Length ball", "Short of a length", "Short"];
    a.table("do-len", "Death-overs cost by length, 2022–2026", "Overs 16–20; commentary-derived length labels", rs.reduce((x, r) => x + r.balls, 0), "labelled balls", sql, order.map((l) => ({ length: l, league: dp(g("rest", l).runs / Math.max(1, g("rest", l).balls), 2), team: g("team", l).balls >= 30 ? dp(g("team", l).runs / g("team", l).balls, 2) : null })));
    const rpb = (side: string, l: string) => g(side, l).runs / Math.max(1, g(side, l).balls);
    const lMiss = rpb("rest", "Full toss") - rpb("rest", "Yorker");
    const teamOK = g("team", "Yorker").balls >= 40 && g("team", "Full toss").balls >= 40;
    const tok = {
      lY: a.num("do-ly", rpb("rest", "Yorker"), "Rest of IPL runs per death yorker, 2022–2026", { unit: "runs per ball", filters: "Overs 16–20", n: g("rest", "Yorker").balls, nUnit: "balls", sql, check: floor(g("rest", "Yorker").balls, 500, "balls") }, 2),
      lF: a.num("do-lf", rpb("rest", "Full toss"), "Rest of IPL runs per death full toss, 2022–2026", { unit: "runs per ball", filters: "Overs 16–20", n: g("rest", "Full toss").balls, nUnit: "balls", sql, check: floor(g("rest", "Full toss").balls, 500, "balls") }, 2),
      miss: a.num("do-miss", lMiss, "Extra runs when a death yorker becomes a full toss (league)", { unit: "runs per ball", filters: "Full toss − yorker", n: g("rest", "Yorker").balls + g("rest", "Full toss").balls, nUnit: "balls", sql, check: range(lMiss, 0, 3, "per-ball difference") }, 2),
      spell: a.num("do-spell", lMiss * 4, "Expected extra runs if one yorker per over becomes a full toss across four death overs", { unit: "runs", filters: "Four × per-ball cost", n: 4, nUnit: "overs", sql, check: derived() }, 1),
      tMiss: teamOK ? a.num("do-tmiss", rpb("team", "Full toss") - rpb("team", "Yorker"), `${a.code} extra runs when a death yorker becomes a full toss`, { unit: "runs per ball", filters: "2022–2026", n: g("team", "Yorker").balls + g("team", "Full toss").balls, nUnit: "balls", sql, check: floor(g("team", "Full toss").balls, 40, "balls") }, 2) : "",
    };
    const x = extremes(a, "do-x", pb.v.rows, "death-overs economy", "runs per over", false);
    const pl = phasePlayers(a, "dop", "bowl", 15, 19, 2024, 2026, 60);
    return {
      dek: `A yorker that slips into a full toss is the costliest single mistake at the death. Ball-by-ball length labels put a price on it for ${a.name}.`,
      excerpt: `Since 2022, each yorker that became a full toss has cost IPL bowlers ${tok.miss} extra runs. ${a.poss} death bowling has been ${pb.better ? "cheaper" : "more expensive"} than the league's since 2024.`,
      keyTakeaways: [
        `${a.code} conceded ${pb.tok.t2} an over at the death since 2024; the league conceded ${pb.tok.l2}.`,
        `League-wide, a death yorker cost ${tok.lY} runs per ball and a full toss ${tok.lF}: a miss costs ${tok.miss} runs.`,
        `One missed yorker per over across the last four overs adds ${tok.spell} runs.`,
      ],
      sections: [
        { heading: "The Most Expensive Inch", body: [
          `Every death bowler aims at the same few centimetres at the base of the stumps. Hit them and the batter scrambles a single at best; miss by a hand's width and the yorker becomes a full toss.`,
          `${a.name} conceded ${pb.tok.t1} an over in the last five overs between ${eras(a).e1[0]} and ${eras(a).e1[1]}, against ${pb.tok.l1} for the league, and ${pb.tok.t2} since 2024 against ${pb.tok.l2}.`,
          x,
        ].filter(Boolean), chartIds: ["do-trend"] },
        { heading: "Pricing the Miss", body: [
          `Commentary labels allow each death delivery since 2022 to be priced. Across the rest of the league a yorker cost ${tok.lY} runs per ball and a full toss ${tok.lF}, so each miss costs ${tok.miss} runs.`,
          teamOK ? `For ${a.code} the same miss has cost ${tok.tMiss} runs per ball.` : `${a.poss} own labelled sample is too small to price the miss separately.`,
        ], chartIds: ["do-len"] },
        { heading: "Who Bowls the Last Five", body: [
          pl.tok ? `Since 2024 ${pl.tok.name} has bowled the most death-overs balls for ${a.code}, ${pl.tok.balls} of them, at an economy of ${pl.tok.rate}.` : `${a.code} have shared the death overs widely since 2024.`,
          `A death bowler's value is how rarely his misses become full tosses. Across a four-over spell, one miss an over adds ${tok.spell} runs, roughly the margin of a tight finish.`,
        ], chartIds: pl.rows.length ? ["do-players"] : [] },
        { heading: "What Commentary Labels Miss", body: [
          `Length labels come from text commentary rather than ball-tracking, and expensive deliveries may be described by their result. That would inflate the measured cost of a full toss.`,
          `{{hyp:labels}}`,
        ] },
        { heading: "CricField Verdict: Budget for the Miss, Then Shrink It", body: [
          `${a.poss} death bowling has been ${pb.better ? "cheaper" : "more expensive"} than the league's since 2024. The measurable skill to recruit for is a low full-toss rate under pressure, not a high yorker attempt rate.`,
          `Plans that mix hard lengths with the yorker cap the downside when execution slips.`,
        ] },
      ],
      charts: [
        { id: "do-trend", type: "line", title: "Death-overs economy by season", subtitle: `${a.code} bowling vs IPL, overs 16–20`, table: pb.table, xKey: "season", series: [{ key: "team", label: a.code }, { key: "league", label: "IPL average" }], xLabel: "Season", unit: "runs per over", takeaway: `${a.code} have been ${pb.better ? "cheaper" : "more expensive"} than the league at the death since 2024.`, ariaLabel: `Line chart of ${a.code} death-overs economy and the IPL average by season.` },
        { id: "do-len", type: "column", title: "Death-overs cost by length", subtitle: "Overs 16–20, 2022–2026, labelled balls", table: "do-len", xKey: "length", series: [{ key: "league", label: "Rest of IPL" }, { key: "team", label: a.code }], xLabel: "Length", unit: "runs per ball", takeaway: "The full toss is the costliest pitched-up delivery at the death.", ariaLabel: "Column chart of runs per ball by delivery length in the death overs." },
        { id: "do-players", type: "bar", title: `${a.code} death bowlers since 2024`, subtitle: "Economy, minimum 60 balls", table: pl.table, xKey: "player", series: [{ key: "economy", label: "Economy" }], unit: "runs per over", takeaway: "Death economy separates the specialists from the rest.", ariaLabel: `Horizontal bar chart of death-overs economy for ${a.code} bowlers since 2024.` },
      ],
      hypotheses: [hyp("labels", "commentary labelling inflates the cost of a full toss because expensive balls are described by their result.", "No ball-tracking data is available to check labels against.", "Compare commentary labels with tracking data for a sample of matches.")],
      players: pl.rs.slice(0, 4).map((r) => r.name),
      seasons: [yearsLabel(a.c.firstYear, 2026), "2022–2026"],
      hero: { narrative: `${a.name} death bowling.`, wanted: `${pl.lead?.name ?? a.name} bowling at the death.`, query: `${pl.lead?.name ?? ""} ${a.name} bowls`.trim() },
      related: [12, 18, 28],
      seo: { metaTitle: metaTitle(`Death-overs risk: what a missed yorker costs ${a.code}`), metaDescription: metaDesc(`${a.poss} death-overs economy against the IPL, and what a yorker that becomes a full toss costs per ball.`) },
      methodology: `${METHOD} Death overs = sixteen to twenty. Length labels from ball-by-ball commentary, 2022–2026; unlabelled balls excluded.`,
    };
  },
};

// ── 16. Fielding as Run Prevention ────────────────────────────────────────────
const s16: SlotSpec = {
  n: 16,
  storyType: "explainer",
  build(a) {
    const sql = `SELECT CASE WHEN i.bowling_team_id IN ${a.T} THEN 'team' ELSE 'rest' END side, COUNT(DISTINCT i.innings_id) inns,
        SUM(CASE WHEN dm.kind = 'run out' THEN 1 ELSE 0 END) ro, SUM(CASE WHEN dm.kind IN ('caught','caught and bowled') THEN 1 ELSE 0 END) ct,
        SUM(CASE WHEN dm.kind = 'stumped' THEN 1 ELSE 0 END) st, SUM(CASE WHEN d.is_wide = 1 OR d.is_noball = 1 THEN d.extra_runs ELSE 0 END) wnb,
        SUM(CASE WHEN d.is_bye = 1 OR d.is_legbye = 1 THEN d.extra_runs ELSE 0 END) byes
      FROM deliveries d JOIN innings i ON i.innings_id = d.innings_id JOIN matches m ON m.match_id = d.match_id LEFT JOIN dismissals dm ON dm.delivery_id = d.delivery_id
      WHERE ${REGULATION} AND ${YEAR()} >= 2022 GROUP BY side`;
    const rs = a.rows<{ side: string; inns: number; ro: number; ct: number; st: number; wnb: number; byes: number }>(sql);
    const t = rs.find((r) => r.side === "team")!, l = rs.find((r) => r.side === "rest")!;
    const per = (r: typeof t, k: "ro" | "ct" | "st" | "wnb" | "byes") => r[k] / r.inns;
    a.table("fld-cmp", "Fielding and discipline per innings, 2022–2026", "Fielding side; run outs, catches and extras per bowling innings", t.inns + l.inns, "innings", sql, [
      { measure: "Run outs", team: dp(per(t, "ro"), 2), league: dp(per(l, "ro"), 2) },
      { measure: "Catches", team: dp(per(t, "ct"), 2), league: dp(per(l, "ct"), 2) },
      { measure: "Byes and leg-byes", team: dp(per(t, "byes"), 2), league: dp(per(l, "byes"), 2) },
    ]);
    const o = (id: string, v: number, label: string, r: typeof t) => a.num(id, v, label, { unit: "per innings", filters: "Bowling innings, 2022–2026", n: r.inns, nUnit: "innings", sql, check: floor(r.inns, 20, "innings") }, 2);
    const tok = {
      tRO: o("fld-tro", per(t, "ro"), `${a.code} run outs per bowling innings`, t),
      lRO: o("fld-lro", per(l, "ro"), "Rest of IPL run outs per bowling innings", l),
      tCT: o("fld-tct", per(t, "ct"), `${a.code} catches per bowling innings`, t),
      lCT: o("fld-lct", per(l, "ct"), "Rest of IPL catches per bowling innings", l),
      tBY: o("fld-tby", per(t, "byes"), `${a.code} byes and leg-byes conceded per innings`, t),
      lBY: o("fld-lby", per(l, "byes"), "Rest of IPL byes and leg-byes conceded per innings", l),
      inns: a.int("fld-inns", t.inns, `${a.code} bowling innings, 2022–2026`, { filters: "Regulation innings", n: t.inns, nUnit: "innings", sql, check: floor(t.inns, 20, "innings") }),
    };
    const moreRO = per(t, "ro") > per(l, "ro");
    return {
      dek: `How many runs do ${a.poss} fielders save? The scorebook records run outs, catches and byes; it does not record the dive on the boundary. Here is what can and cannot be measured.`,
      excerpt: `${a.name} have effected ${moreRO ? "more" : "fewer"} run outs per innings than the league since 2022. The most valuable fielding, the boundary save, is still invisible in public data.`,
      keyTakeaways: [
        `${a.code} have effected ${tok.tRO} run outs per bowling innings since 2022, against ${tok.lRO} for the rest of the IPL.`,
        `They have held ${tok.tCT} catches per innings, against ${tok.lCT} league-wide.`,
        `Byes and leg-byes conceded: ${tok.tBY} per innings, against ${tok.lBY}.`,
      ],
      sections: [
        { heading: "The Invisible Discipline", body: [
          `Fielding is the part of T20 cricket that public data measures worst. The scorebook records a run out and a catch; it does not record the single that was not taken because of a fast pick-up, or the four that became a two after a dive.`,
          `What can be measured is still useful. Across ${tok.inns} ${a.code} bowling innings since 2022, the side has effected ${tok.tRO} run outs per innings against ${tok.lRO} for the rest of the league.`,
        ], chartIds: ["fld-chart"] },
        { heading: "Catches, Run Outs and Leakage", body: [
          `${a.name} have held ${tok.tCT} catches per bowling innings against ${tok.lCT} elsewhere. Catches depend on chances created, so the figure mixes fielding with bowling.`,
          `Byes and leg-byes, a rough measure of wicketkeeping and line discipline, run at ${tok.tBY} per innings against ${tok.lBY} for the league.`,
        ] },
        { heading: "Where Fielding Value Hides", body: [
          `The largest fielding contribution is runs not conceded: boundaries cut off and singles denied. Those require event-level fielding data that Cricsheet does not provide.`,
          `For ${a.code}, a practical step is to log boundary saves and misfields in-house each match, turning coaching impressions into a run-prevention number.`,
        ] },
        { heading: "Why Raw Counts Mislead", body: [
          `Run outs depend on how often opponents take risky singles, and catches on how many chances bowlers create. A side facing aggressive running sides will record more run outs without fielding any better.`,
          `{{hyp:saves}}`,
        ] },
        { heading: "CricField Verdict: Measure What the Scorebook Misses", body: [
          `The available counts put ${a.name} ${moreRO ? "ahead of" : "behind"} the league on run outs since 2022. The bigger prize is the unmeasured one: runs saved in the field.`,
          `A franchise that tracks fielding events itself will have an advantage in selection that public data cannot match.`,
        ] },
      ],
      charts: [{ id: "fld-chart", type: "column", title: "Fielding events per bowling innings", subtitle: "2022–2026", table: "fld-cmp", xKey: "measure", series: [{ key: "team", label: a.code }, { key: "league", label: "Rest of IPL" }], xLabel: "Measure", unit: "per innings", takeaway: "Recorded fielding events capture only part of a side's fielding value.", ariaLabel: "Grouped column chart of run outs, catches and byes per bowling innings." }],
      hypotheses: [hyp("saves", "boundary saves and denied singles are worth more runs per match than run outs and catches combined.", "Fielding events other than dismissals are not recorded in Cricsheet data.", "Log fielding events from video for a sample of matches and value each in runs.")],
      players: [],
      seasons: ["2022–2026"],
      hero: { narrative: `${a.name} in the field.`, wanted: `${a.name} fielder diving or taking a catch.`, query: `${a.name} catch` },
      related: [17, 77, 13],
      seo: { metaTitle: metaTitle(`Fielding as run prevention: what ${a.code} can measure`), metaDescription: metaDesc(`${a.poss} run outs, catches and byes per innings since 2022 against the IPL, and the fielding value that public data cannot see.`) },
      methodology: `${METHOD} Fielding counts use the fielding side's bowling innings since 2022. Cricsheet data does not identify fielders, so individual fielding is not assessed.`,
    };
  },
};

// ── 17. Catch Difficulty Index ────────────────────────────────────────────────
const s17: SlotSpec = {
  n: 17,
  storyType: "explainer",
  build(a) {
    const sql = `SELECT ${YEAR()} year, CASE WHEN i.bowling_team_id IN ${a.T} THEN 'team' ELSE 'rest' END side,
        SUM(CASE WHEN dm.kind IN ('caught','caught and bowled') THEN 1 ELSE 0 END) ct, SUM(CASE WHEN ${BOWLER_WKT} THEN 1 ELSE 0 END) wk
      FROM deliveries d JOIN innings i ON i.innings_id = d.innings_id JOIN matches m ON m.match_id = d.match_id LEFT JOIN dismissals dm ON dm.delivery_id = d.delivery_id
      WHERE ${REGULATION} GROUP BY year, side`;
    const rs = a.rows<{ year: number; side: string; ct: number; wk: number }>(sql);
    const years = [...new Set(rs.filter((r) => r.side === "team" && r.wk > 0).map((r) => r.year))];
    const rows = years.map((y) => {
      const t = rs.find((r) => r.year === y && r.side === "team")!, l = rs.find((r) => r.year === y && r.side === "rest")!;
      return { season: String(y), team: dp((t.ct / t.wk) * 100), league: dp((l.ct / l.wk) * 100), year: y, teamPct: (t.ct / t.wk) * 100, wk: t.wk };
    });
    a.table("ct-series", `Catches as a share of bowler wickets: ${a.code} vs IPL`, "Caught and caught-and-bowled as a share of bowler-credited wickets", rows.reduce((x, r) => x + r.wk, 0), `${a.code} wickets`, sql, rows.map(({ season, team, league }) => ({ season, team, league })));
    const sum = (side: string) => rs.filter((r) => r.side === side).reduce((x, r) => ({ ct: x.ct + r.ct, wk: x.wk + r.wk }), { ct: 0, wk: 0 });
    const T = sum("team"), L = sum("rest");
    const tok = {
      t: a.pct("ct-t", (T.ct / T.wk) * 100, `Share of ${a.poss} bowler wickets that were catches`, { filters: "All seasons", n: T.wk, nUnit: "wickets", sql, check: floor(T.wk, 100, "wickets") }),
      l: a.pct("ct-l", (L.ct / L.wk) * 100, "Share of the rest of the IPL's bowler wickets that were catches", { filters: "All seasons", n: L.wk, nUnit: "wickets", sql, check: floor(L.wk, 1000, "wickets") }),
      n: a.int("ct-n", T.ct, `${a.code} catches recorded`, { filters: "Caught and caught-and-bowled", n: T.ct, nUnit: "catches", sql, check: floor(T.ct, 50, "catches") }),
    };
    const x = extremes(a, "ct-x", rows.map((r) => ({ year: r.year, team: r.teamPct })), "catch share of wickets", "% of wickets", true, 1, sql, ["highest", "lowest"]);
    return {
      dek: `Dropped-catch counts are a blunt way to judge fielders: they ignore how hard each chance was. What would a catch-difficulty index for ${a.name} need, and what can be measured now?`,
      excerpt: `Catches account for ${tok.l} of the rest of the IPL's bowler wickets and ${tok.t} of ${a.poss}. Without data on drops and difficulty, a fair fielding grade remains out of reach.`,
      keyTakeaways: [
        `${tok.t} of ${a.poss} bowler wickets have been catches, against ${tok.l} for the rest of the IPL.`,
        `${a.code} have ${tok.n} catches on record in the CricField warehouse.`,
        `Drops and catch difficulty are not recorded in public ball-by-ball data.`,
      ],
      sections: [
        { heading: "The Problem With Drop Counts", body: [
          `A dropped skier at long-on and a missed half-chance at slip both count as one drop. A fielder who stands in the hardest positions will drop more chances and still be the most valuable catcher in the side.`,
          `A catch-difficulty index would weight each chance by how hard it was: reaction time, distance covered, ball speed. Public data does not provide those inputs.`,
        ] },
        { heading: "What the Scorebook Does Show", body: [
          `${tok.t} of ${a.poss} bowler-credited wickets have been catches, against ${tok.l} for the rest of the league, from ${tok.n} catches on record.`,
          x || `The season chart shows how the share has moved over time.`,
        ], chartIds: ["ct-trend"] },
        { heading: "Building an Index In-House", body: [
          `The inputs for a fair index are achievable with video: the fielder's starting position, distance to the ball and time available. Each chance can then be graded and every fielder rated on catches taken above expectation.`,
          `For ${a.code}, that would turn fielding selection from reputation into evidence, and highlight which positions need specialists.`,
        ] },
        { heading: "Catch Share Is Not Catching Quality", body: [
          `A high share of caught wickets can reflect bowlers inducing false shots rather than fielders taking hard chances. It says nothing about the chances that went down.`,
          `{{hyp:drops}}`,
        ] },
        { heading: "CricField Verdict: Grade the Chance, Not the Fielder's Tally", body: [
          `Raw catch and drop counts should not drive ${a.poss} fielding decisions. A graded-chance index, built from video, is the only fair measure.`,
          `Until it exists, the honest position is that catching quality cannot be compared between franchises from public data.`,
        ] },
      ],
      charts: [{ id: "ct-trend", type: "line", title: "Catches as a share of bowler wickets", subtitle: `${a.code} vs IPL, by season`, table: "ct-series", xKey: "season", series: [{ key: "team", label: a.code }, { key: "league", label: "Rest of IPL" }], xLabel: "Season", unit: "% of wickets", takeaway: "Catch share alone cannot grade fielding quality.", ariaLabel: `Line chart of catches as a share of bowler wickets by season for ${a.code} and the rest of the IPL.` }],
      hypotheses: [hyp("drops", `${a.poss} catching efficiency on difficult chances differs from the league average by more than raw catch counts suggest.`, "Dropped catches and chance difficulty are not recorded in public data.", "Grade every chance from video for a season and compare catches taken against expected catches.")],
      players: [],
      seasons: [yearsLabel(a.c.firstYear, 2026)],
      hero: { narrative: `A ${a.name} catch.`, wanted: `${a.name} fielder taking a catch.`, query: `${a.name} takes catch` },
      related: [16, 77, 87],
      seo: { metaTitle: metaTitle(`Catch difficulty: judging ${a.code} beyond drop counts`), metaDescription: metaDesc(`Catches as a share of ${a.poss} wickets against the IPL, and why a fair fielding grade needs chance difficulty that public data lacks.`) },
      methodology: `${METHOD} Catches include caught and caught-and-bowled. Dropped catches are not recorded in Cricsheet data.`,
    };
  },
};

// ── 18. Pace-Off Tactics ──────────────────────────────────────────────────────
const s18: SlotSpec = {
  n: 18,
  storyType: "tactical",
  build(a) {
    const sql = `SELECT CASE WHEN i.bowling_team_id IN ${a.T} THEN 'team' ELSE 'rest' END side,
        CASE WHEN d.over_num <= 5 THEN 'Powerplay' WHEN d.over_num <= 14 THEN 'Middle' ELSE 'Death' END ph,
        CASE WHEN c.variation IN ('Slower ball','Off-cutter','Leg-cutter') THEN 'slow' ELSE 'stock' END dkind,
        SUM(${BOWLER_RUNS}) runs, SUM(CASE WHEN ${LEGAL} THEN 1 ELSE 0 END) balls, SUM(CASE WHEN ${BOWLER_WKT} THEN 1 ELSE 0 END) wk
      FROM deliveries d JOIN innings i ON i.innings_id = d.innings_id JOIN matches m ON m.match_id = d.match_id JOIN delivery_commentary c ON c.delivery_id = d.delivery_id
      LEFT JOIN dismissals dm ON dm.delivery_id = d.delivery_id
      WHERE ${REGULATION} AND ${YEAR()} >= 2022 AND (c.variation IN ('Slower ball','Off-cutter','Leg-cutter') OR c.length IS NOT NULL)
        AND d.bowler_id IN (SELECT d2.bowler_id FROM deliveries d2 JOIN delivery_commentary c2 ON c2.delivery_id = d2.delivery_id WHERE c2.variation IN ('Slower ball','Off-cutter','Leg-cutter') GROUP BY d2.bowler_id HAVING COUNT(*) >= 10)
      GROUP BY side, ph, dkind`;
    const rs = a.rows<{ side: string; ph: string; dkind: string; runs: number; balls: number; wk: number }>(sql);
    const g = (side: string, ph: string, k: string) => rs.find((r) => r.side === side && r.ph === ph && r.dkind === k) ?? { runs: 0, balls: 0, wk: 0 };
    const phases = ["Powerplay", "Middle", "Death"];
    a.table("po-phase", "Slower balls vs other labelled deliveries by phase, 2022–2026", "Runs per ball; commentary-derived variation labels", rs.reduce((x, r) => x + r.balls, 0), "labelled balls", sql, phases.map((p) => ({ phase: p, slowerBall: dp(g("rest", p, "slow").runs / Math.max(1, g("rest", p, "slow").balls), 2), otherBall: dp(g("rest", p, "stock").runs / Math.max(1, g("rest", p, "stock").balls), 2), teamSlower: g("team", p, "slow").balls >= 30 ? dp(g("team", p, "slow").runs / g("team", p, "slow").balls, 2) : null })));
    const rpb = (s: string, p: string, k: string) => g(s, p, k).runs / Math.max(1, g(s, p, k).balls);
    const o = (id: string, s: string, p: string, k: string, label: string, min: number) => a.num(id, rpb(s, p, k), label, { unit: "runs per ball", filters: `${p}, 2022–2026`, n: g(s, p, k).balls, nUnit: "balls", sql, check: floor(g(s, p, k).balls, min, "balls") }, 2);
    const tok = {
      lsD: o("po-lsd", "rest", "Death", "slow", "IPL runs per slower ball in the death", 300),
      loD: o("po-lod", "rest", "Death", "stock", "IPL runs per other labelled ball in the death", 1000),
      lsP: o("po-lsp", "rest", "Powerplay", "slow", "IPL runs per slower ball in the powerplay", 200),
      loP: o("po-lop", "rest", "Powerplay", "stock", "IPL runs per other labelled ball in the powerplay", 1000),
      tShare: a.pct("po-tshare", (phases.reduce((x, p) => x + g("team", p, "slow").balls, 0) / phases.reduce((x, p) => x + g("team", p, "slow").balls + g("team", p, "stock").balls, 0)) * 100, `Slower balls as a share of ${a.poss} labelled deliveries`, { filters: "2022–2026", n: phases.reduce((x, p) => x + g("team", p, "slow").balls + g("team", p, "stock").balls, 0), nUnit: "labelled balls", sql, check: floor(phases.reduce((x, p) => x + g("team", p, "slow").balls + g("team", p, "stock").balls, 0), 300, "balls") }),
      lShare: a.pct("po-lshare", (phases.reduce((x, p) => x + g("rest", p, "slow").balls, 0) / phases.reduce((x, p) => x + g("rest", p, "slow").balls + g("rest", p, "stock").balls, 0)) * 100, "Slower balls as a share of the rest of the IPL's labelled deliveries", { filters: "2022–2026", n: phases.reduce((x, p) => x + g("rest", p, "slow").balls + g("rest", p, "stock").balls, 0), nUnit: "labelled balls", sql, check: floor(phases.reduce((x, p) => x + g("rest", p, "slow").balls + g("rest", p, "stock").balls, 0), 1000, "balls") }),
    };
    // Differences under 0.08 runs per ball are treated as no real difference.
    const verdict = (p: string) => { const d = rpb("rest", p, "slow") - rpb("rest", p, "stock"); return Math.abs(d) < 0.08 ? "about the same" : d < 0 ? "cheaper" : "dearer"; };
    const vD = verdict("Death"), vP = verdict("Powerplay");
    const deathHelps = vD === "cheaper", ppHelps = vP === "cheaper";
    return {
      dek: `When do slower balls help ${a.name}, and when do they just give batters time to hit? Variation labels split the answer by phase.`,
      excerpt: `League-wide since 2022, the slower ball has cost ${vD === "about the same" ? "about the same as" : `${vD === "cheaper" ? "less than" : "more than"}`} other deliveries at the death, and ${vP === "about the same" ? "about the same" : vP === "cheaper" ? "less" : "more"} in the powerplay. Here is how ${a.poss} use of it compares.`,
      keyTakeaways: [
        `At the death, IPL slower balls cost ${tok.lsD} runs per ball against ${tok.loD} for other labelled deliveries.`,
        `In the powerplay the figures are ${tok.lsP} and ${tok.loP}.`,
        `Slower balls make up ${tok.tShare} of ${a.poss} labelled deliveries, against ${tok.lShare} league-wide.`,
      ],
      sections: [
        { heading: "Pace Off as a Weapon", body: [
          `The slower ball is the T20 bowler's change-up: the same action, less speed, and a batter through the shot too early. Its value depends on surprise and on the batter's intention, which is why it may help in one phase and hurt in another.`,
          `Using commentary variation labels since 2022, and comparing only bowlers who use the slower ball, slower balls and cutters at the death cost the league ${tok.lsD} runs per ball against ${tok.loD} for the same bowlers' other labelled deliveries.`,
        ], chartIds: ["po-chart"] },
        { heading: "Phase by Phase", body: [
          `In the powerplay, with fielders up and batters looking to use the pace, slower balls cost ${tok.lsP} runs per ball against ${tok.loP} for other deliveries. ${vP === vD ? `Pace off has been ${vP} in both phases.` : `The phase changes the answer: pace off has been ${vP} early and ${vD} at the death.`}`,
          `${a.name} bowl slower balls on ${tok.tShare} of their labelled deliveries, against ${tok.lShare} for the rest of the league.`,
        ] },
        { heading: "Using the Change-Up Well", body: [
          `A slower ball works best when the batter expects pace. That argues for using it sparingly enough to stay a surprise, and in the phase where the league data says it pays.`,
          `For ${a.code} the plan is a per-bowler split: who disguises the slower ball well enough to use it more often, and who should keep it as a rare variation.`,
        ] },
        { heading: "Labels and Selection Effects", body: [
          `Bowlers choose slower balls against certain batters and situations, and commentary may label a ball by its result. Both effects can make the variation look better or worse than it is.`,
          `{{hyp:batter}}`,
        ] },
        { heading: `CricField Verdict: ${deathHelps ? "Pace Off at the Death" : "Use the Change-Up Sparingly"}`, body: [
          `The league evidence says pace off ${deathHelps ? "earns its place at the death" : "does not consistently pay at the death"}, and in the powerplay it has been ${vP}. ${a.name} should align their bowlers' variation use with those phases.`,
          `Measuring each bowler's slower-ball cost by phase each season would make that alignment precise.`,
        ] },
      ],
      charts: [{ id: "po-chart", type: "column", title: "Slower balls vs other deliveries by phase", subtitle: "Rest of IPL, 2022–2026, labelled balls", table: "po-phase", xKey: "phase", series: [{ key: "slowerBall", label: "Slower ball / cutter" }, { key: "otherBall", label: "Other labelled ball" }], xLabel: "Phase", unit: "runs per ball", takeaway: vP === vD ? `Against the same bowlers' other deliveries, the slower ball has been ${vP} in both the powerplay and the death.` : "The slower ball's value changes with the phase of the innings.", ariaLabel: "Grouped column chart of runs per ball for slower balls and other deliveries in each phase." }],
      hypotheses: [hyp("batter", "slower balls are cheaper against set hitters than against new batters.", "The batter's balls faced at the time of each delivery has not been joined to variation labels.", "Split slower-ball cost by the batter's balls faced before the delivery.")],
      players: [],
      seasons: ["2022–2026"],
      hero: { narrative: `${a.name} pace bowling.`, wanted: `${a.name} seam bowler in delivery stride.`, query: `${a.name} bowls` },
      related: [12, 15, 19],
      seo: { metaTitle: metaTitle(`Pace-off tactics: when slower balls help ${a.code}`), metaDescription: metaDesc(`What slower balls cost by phase in the IPL since 2022, and how often ${a.name} use them compared with the league.`) },
      methodology: `${METHOD} Slower balls include off- and leg-cutters, from commentary-derived variation labels. The comparison is restricted to bowlers with at least ten labelled slower balls, so other deliveries are the same bowlers' labelled stock balls. 2022–2026.`,
    };
  },
};

// ── 19. Bowler Matchups ───────────────────────────────────────────────────────
const s19: SlotSpec = {
  n: 19,
  storyType: "tactical",
  build(a) {
    const bio = bioByCricsheet();
    const sql = `SELECT CASE WHEN i.bowling_team_id IN ${a.T} THEN 'team' ELSE 'rest' END side, bw.name bowler, bt.name batter, ${BOWLER_RUNS} r, CASE WHEN ${LEGAL} THEN 1 ELSE 0 END b, CASE WHEN ${BOWLER_WKT} THEN 1 ELSE 0 END w
      FROM deliveries d JOIN innings i ON i.innings_id = d.innings_id JOIN matches m ON m.match_id = d.match_id JOIN players bw ON bw.player_id = d.bowler_id JOIN players bt ON bt.player_id = d.batter_id
      LEFT JOIN dismissals dm ON dm.delivery_id = d.delivery_id WHERE ${REGULATION} AND ${YEAR()} >= 2022`;
    const rs = a.rows<{ side: string; bowler: string; batter: string; r: number; b: number; w: number }>(sql);
    const acc: Record<string, { r: number; b: number; w: number }> = {};
    for (const x of rs) {
      const ty = bowlType(bio.get(x.bowler)?.bowlStyle), h = batHand(bio.get(x.batter)?.batStyle);
      if (!ty || !h) continue;
      const g = (acc[`${x.side}|${ty}|${h}`] ??= { r: 0, b: 0, w: 0 });
      g.r += x.r, (g.b += x.b), (g.w += x.w);
    }
    const g = (k: string) => acc[k] ?? { r: 0, b: 1, w: 0 };
    const e = (k: string) => (g(k).r * 6) / g(k).b;
    const combos = [["pace", "right"], ["pace", "left"], ["spin", "right"], ["spin", "left"]];
    a.table("mu-matrix", "Economy by bowling type and batter hand, 2022–2026", "Bowling type and batting hand from player-bio.json", Object.values(acc).reduce((x, v) => x + v.b, 0), "balls", sql, combos.map(([ty, h]) => ({ matchup: `${ty === "pace" ? "Pace" : "Spin"} to ${h}-hander`, team: dp(e(`team|${ty}|${h}`), 2), league: dp(e(`rest|${ty}|${h}`), 2), teamBalls: g(`team|${ty}|${h}`).b })), BIO_DS);
    const o = (k: string, label: string, min: number) => a.num(`mu-${k.replace(/\|/g, "-")}`, e(k), label, { unit: "runs per over", filters: "2022–2026", n: g(k).b, nUnit: "balls", sql, check: floor(g(k).b, min, "balls"), dataset: BIO_DS }, 2);
    const tok = {
      tSL: o("team|spin|left", `${a.code} spin economy against left-handers`, 150),
      tSR: o("team|spin|right", `${a.code} spin economy against right-handers`, 150),
      lSL: o("rest|spin|left", "Rest of IPL spin economy against left-handers", 1500),
      lSR: o("rest|spin|right", "Rest of IPL spin economy against right-handers", 1500),
      tPL: o("team|pace|left", `${a.code} pace economy against left-handers`, 150),
      tPR: o("team|pace|right", `${a.code} pace economy against right-handers`, 150),
    };
    const spinLeftWorse = e("team|spin|left") - e("team|spin|right"), leagueSpinLeft = e("rest|spin|left") - e("rest|spin|right");
    return {
      dek: `When should ${a.name} break their preferred bowling rotation to target a batter? Bowling-type and batting-hand match-ups since 2022 show where the edges are.`,
      excerpt: `League-wide since 2022, spin has been ${leagueSpinLeft > 0 ? "more expensive" : "cheaper"} against left-handers than right-handers. ${a.poss} own match-up profile shows whether they follow the pattern.`,
      keyTakeaways: [
        `${a.code} spin conceded ${tok.tSL} an over to left-handers and ${tok.tSR} to right-handers since 2022.`,
        `For the rest of the IPL, spin conceded ${tok.lSL} and ${tok.lSR}.`,
        `${a.code} pace conceded ${tok.tPL} to left-handers and ${tok.tPR} to right-handers.`,
      ],
      sections: [
        { heading: "Rotations and Match-Ups", body: [
          `Most captains bowl their attack in a familiar order. The match-up school says the order should bend to the batters at the crease: an off-spinner to a left-hander, a left-arm seamer to a right-hander, and so on.`,
          `CricField matched each delivery's bowling type and batting hand from player-bio data. Since 2022 ${a.poss} spinners have conceded ${tok.tSL} an over to left-handers and ${tok.tSR} to right-handers.`,
        ], chartIds: ["mu-chart"] },
        { heading: "Where the Edges Are", body: [
          `For the rest of the league the comparable spin figures are ${tok.lSL} against left-handers and ${tok.lSR} against right-handers. ${a.poss} pace attack conceded ${tok.tPL} to left-handers and ${tok.tPR} to right-handers.`,
          `The ${spinLeftWorse > 0 ? "higher" : "lower"} cost of ${a.poss} spin against left-handers is the most direct signal for when to change the rotation.`,
        ] },
        { heading: "When to Break the Plan", body: [
          `A match-up is worth breaking the rotation for when the gap is large and the sample behind it is solid. Small gaps in small samples are noise, and chasing them can leave the best bowlers with overs in the wrong phase.`,
          `For ${a.code}, the practical rule is to bend the order only for the strongest match-ups and keep the phase plan otherwise.`,
        ] },
        { heading: "Handedness Is Only One Dimension", body: [
          `A batter's hand is a crude stand-in for his strengths. Within each hand there are batters who sweep well and batters who cannot, which a type-by-hand table cannot see.`,
          `{{hyp:individual}}`,
        ] },
        { heading: "CricField Verdict: Bend the Rotation, Do Not Break the Phases", body: [
          `${a.name} should use match-ups to choose between bowlers of similar quality in the same phase, not to move overs between phases.`,
          `Individual batter-against-bowler-type records, shrunk for small samples, are the next level of detail.`,
        ] },
      ],
      charts: [{ id: "mu-chart", type: "column", title: "Economy by match-up", subtitle: "Bowling type × batter hand, 2022–2026", table: "mu-matrix", xKey: "matchup", series: [{ key: "team", label: a.code }, { key: "league", label: "Rest of IPL" }], xLabel: "Match-up", unit: "runs per over", takeaway: "Match-up costs differ, but most gaps are a fraction of a run per over.", ariaLabel: "Grouped column chart of economy for pace and spin against left- and right-handed batters." }],
      hypotheses: [hyp("individual", "batter-specific match-ups carry more signal than bowling type against batting hand.", "Batter-level match-up samples are small and have not been shrunk.", "Estimate shrunk batter-against-bowling-type economies and compare their predictive power.")],
      sources: [{ id: "cf-bio", kind: "cricfield-dataset", title: "CricField player-bio dataset (batting hands and bowling styles)", publisher: "CricField", note: "Joined via squad lists; unknown types excluded." }],
      players: [],
      seasons: ["2022–2026"],
      hero: { narrative: `A ${a.name} bowler targeting a batter.`, wanted: `${a.name} spinner bowling.`, query: `${a.name} spinner bowls` },
      related: [14, 20, 86],
      seo: { metaTitle: metaTitle(`Bowler match-ups: when ${a.code} should break the rotation`), metaDescription: metaDesc(`${a.poss} pace and spin economy against left- and right-handed batters since 2022, compared with the IPL.`) },
      methodology: `${METHOD} Bowling type and batting hand from CricField player-bio data via squad lists; unknown types excluded. 2022–2026.`,
    };
  },
};

// ── 20. The Sixth-Bowler Insurance Policy ─────────────────────────────────────
const s20: SlotSpec = {
  n: 20,
  storyType: "tactical",
  build(a) {
    const sql = `WITH b AS (SELECT d.innings_id, d.bowler_id, SUM(CASE WHEN ${LEGAL} THEN 1 ELSE 0 END) balls, SUM(${BOWLER_RUNS}) runs FROM deliveries d GROUP BY d.innings_id, d.bowler_id),
        r AS (SELECT b.*, ROW_NUMBER() OVER (PARTITION BY innings_id ORDER BY balls DESC, bowler_id) rk FROM b)
      SELECT CASE WHEN i.bowling_team_id IN ${a.T} THEN 'team' ELSE 'rest' END side, i.innings_id,
        SUM(CASE WHEN r.rk > 5 THEN r.balls ELSE 0 END) extraBalls, SUM(CASE WHEN r.rk > 5 THEN r.runs ELSE 0 END) extraRuns,
        SUM(CASE WHEN r.rk <= 5 THEN r.balls ELSE 0 END) coreBalls, SUM(CASE WHEN r.rk <= 5 THEN r.runs ELSE 0 END) coreRuns, MAX(r.rk) used,
        CASE WHEN m.winner_id = i.bowling_team_id THEN 1 ELSE 0 END won
      FROM r JOIN innings i ON i.innings_id = r.innings_id JOIN matches m ON m.match_id = i.match_id
      WHERE ${REGULATION} AND ${YEAR()} >= 2022 AND m.winner_id IS NOT NULL GROUP BY i.innings_id`;
    const rs = a.rows<{ side: string; extraBalls: number; extraRuns: number; coreBalls: number; coreRuns: number; used: number; won: number }>(sql);
    const agg = (side: string) => rs.filter((r) => r.side === side).reduce((x, r) => ({ n: x.n + 1, used6: x.used6 + (r.used >= 6 ? 1 : 0), eb: x.eb + r.extraBalls, er: x.er + r.extraRuns, cb: x.cb + r.coreBalls, cr: x.cr + r.coreRuns, w6: x.w6 + (r.used >= 6 ? r.won : 0), w5: x.w5 + (r.used < 6 ? r.won : 0) }), { n: 0, used6: 0, eb: 0, er: 0, cb: 0, cr: 0, w6: 0, w5: 0 });
    const T = agg("team"), L = agg("rest");
    a.table("sb-cmp", "Five-bowler core vs extra bowlers, 2022–2026", "Core = the five bowlers who bowled most in each innings", T.n + L.n, "bowling innings", sql, [
      { group: "Core five", team: dp((T.cr * 6) / T.cb, 2), league: dp((L.cr * 6) / L.cb, 2) },
      { group: "Sixth bowler and beyond", team: T.eb ? dp((T.er * 6) / T.eb, 2) : null, league: dp((L.er * 6) / L.eb, 2) },
    ]);
    const tok = {
      tUsed6: a.pct("sb-tused", (T.used6 / T.n) * 100, `${a.code} bowling innings using six or more bowlers, 2022–2026`, { filters: "Innings with a result", n: T.n, nUnit: "innings", sql, check: floor(T.n, 20, "innings") }, 0),
      lUsed6: a.pct("sb-lused", (L.used6 / L.n) * 100, "Rest of IPL bowling innings using six or more bowlers", { filters: "Innings with a result", n: L.n, nUnit: "innings", sql, check: floor(L.n, 200, "innings") }, 0),
      lCore: a.num("sb-lcore", (L.cr * 6) / L.cb, "Rest of IPL economy of the core five bowlers", { unit: "runs per over", filters: "2022–2026", n: L.cb, nUnit: "balls", sql, check: floor(L.cb, 5000, "balls") }, 2),
      lExtra: a.num("sb-lextra", (L.er * 6) / L.eb, "Rest of IPL economy of the sixth bowler and beyond", { unit: "runs per over", filters: "2022–2026", n: L.eb, nUnit: "balls", sql, check: floor(L.eb, 1000, "balls") }, 2),
      tExtra: T.eb >= 60 ? a.num("sb-textra", (T.er * 6) / T.eb, `${a.code} economy of the sixth bowler and beyond`, { unit: "runs per over", filters: "2022–2026", n: T.eb, nUnit: "balls", sql, check: floor(T.eb, 60, "balls") }, 2) : "",
      tExtraShare: a.pct("sb-tshare", (T.eb / (T.eb + T.cb)) * 100, `Share of ${a.poss} legal balls bowled by the sixth bowler and beyond`, { filters: "2022–2026", n: T.eb + T.cb, nUnit: "balls", sql, check: floor(T.eb + T.cb, 600, "balls") }, 1),
    };
    const extraCostly = (L.er / L.eb) > (L.cr / L.cb);
    return {
      dek: `How much flexibility do ${a.name} need from a sixth bowling option? Workload and economy beyond the core five measure the insurance policy's cost.`,
      excerpt: `${a.name} have used six or more bowlers in ${tok.tUsed6} of their bowling innings since 2022. League-wide, overs from beyond the core five have cost ${extraCostly ? "more" : "less"} than the core's.`,
      keyTakeaways: [
        `${a.code} used six or more bowlers in ${tok.tUsed6} of bowling innings since 2022; the rest of the IPL did so in ${tok.lUsed6}.`,
        `League-wide, the core five conceded ${tok.lCore} an over and the extra bowlers ${tok.lExtra}.`,
        `${tok.tExtraShare} of ${a.poss} balls came from beyond the core five.`,
      ],
      sections: [
        { heading: "The Insurance Question", body: [
          `A sixth bowling option is insurance: if a frontline bowler is being hit, or injured, someone else can take the overs. The premium is paid in batting depth, because the sixth bowler usually displaces a specialist batter.`,
          `Since 2022 ${a.name} have used six or more bowlers in ${tok.tUsed6} of their bowling innings, against ${tok.lUsed6} for the rest of the league.`,
        ] },
        { heading: "What the Extra Overs Cost", body: [
          `Across the rest of the IPL, the five bowlers who bowl most in each innings conceded ${tok.lCore} an over; everyone else conceded ${tok.lExtra}.`,
          tok.tExtra ? `For ${a.code}, bowlers beyond the core five conceded ${tok.tExtra} an over and bowled ${tok.tExtraShare} of the side's balls.` : `${a.code} bowled only ${tok.tExtraShare} of their balls beyond the core five, too few to rate separately.`,
        ], chartIds: ["sb-chart"] },
        { heading: "Designing the Policy", body: [
          `The right amount of insurance depends on how reliable the core five are. A side with five frontline bowlers who rarely go for big overs needs little cover; a side with a volatile bowler needs a sixth option in every match.`,
          `For ${a.code}, an all-rounder whose bowling is close to frontline standard is worth more than a part-timer who only bowls in emergencies.`,
        ] },
        { heading: "The Impact-Player Complication", body: [
          `Since 2023 the impact-player rule lets sides add a bowler or a batter during the match, which changes the value of a sixth option in the starting eleven. The pre-2023 and post-2023 numbers are not strictly comparable.`,
          `{{hyp:impact}}`,
        ] },
        { heading: "CricField Verdict: Buy the Policy Only If the Core Is Volatile", body: [
          `League-wide, overs beyond the core five have cost ${extraCostly ? "more" : "less"} than the core's. ${a.name} should carry a sixth bowler when a frontline bowler's form is uncertain, not as a default.`,
          `Tracking how often the sixth option is actually used would show whether the policy is paying out.`,
        ] },
      ],
      charts: [{ id: "sb-chart", type: "column", title: "Economy: core five vs extra bowlers", subtitle: "2022–2026", table: "sb-cmp", xKey: "group", series: [{ key: "team", label: a.code }, { key: "league", label: "Rest of IPL" }], xLabel: "Bowler group", unit: "runs per over", takeaway: `Extra bowlers have been ${extraCostly ? "more expensive" : "cheaper"} than the core five league-wide.`, ariaLabel: "Grouped column chart of economy for the core five bowlers and the sixth bowler and beyond." }],
      hypotheses: [hyp("impact", "the impact-player rule has reduced the value of a sixth bowling option in the starting eleven.", "Impact-player substitutions are not recorded in the warehouse.", "Join substitution records and compare bowling usage before and after 2023.")],
      players: [],
      seasons: ["2022–2026"],
      hero: { narrative: `A ${a.name} all-rounder bowling.`, wanted: `${a.name} all-rounder bowling.`, query: `${a.name} all-rounder bowls` },
      related: [100, 89, 13],
      seo: { metaTitle: metaTitle(`The sixth-bowler insurance policy at ${a.code}`), metaDescription: metaDesc(`How often ${a.name} use six or more bowlers and what overs beyond the core five cost, compared with the IPL since 2022.`) },
      methodology: `${METHOD} Core five = the five bowlers with the most legal balls in each bowling innings. 2022–2026, matches with a result.`,
    };
  },
};

export const BOWLING: SlotSpec[] = [s11, s12, s13, s14, s15, s16, s17, s18, s19, s20];
void range;
