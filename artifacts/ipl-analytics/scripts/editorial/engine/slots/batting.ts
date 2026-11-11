// Batting Intelligence templates (plan slots 1–10).
import { A, BOWLER_RUNS, LEGAL, REGULATION, YEAR, batHand, bioByCricsheet, bowlType, cmp, derived, dp, floor, range, yearsLabel, type Draft, type Row } from "../core";
import { eras, extremes, phaseBlock, phasePlayers, wicketsWin } from "../kit";
import { hyp, metaDesc, metaTitle, type SlotSpec } from "./types";

const METHOD_BASE = "Regulation innings only (super overs excluded). Run rates use all runs per legal ball times six. Every figure is generated from the CricField warehouse by scripts/editorial/engine.";

/** Batting position = order of first appearance at the crease (striker or non-striker) within the innings. */
export const POS_CTE = `WITH appear AS (
    SELECT d.innings_id, d.batter_id pid, MIN(d.delivery_id) first FROM deliveries d GROUP BY d.innings_id, d.batter_id
    UNION ALL SELECT d.innings_id, d.non_striker_id pid, MIN(d.delivery_id) first FROM deliveries d GROUP BY d.innings_id, d.non_striker_id),
  firsts AS (SELECT innings_id, pid, MIN(first) first FROM appear GROUP BY innings_id, pid),
  pos AS (SELECT innings_id, pid, ROW_NUMBER() OVER (PARTITION BY innings_id ORDER BY first, pid) position FROM firsts)`;

// ── 1. The Powerplay Equation ─────────────────────────────────────────────────
const s1: SlotSpec = {
  n: 1,
  storyType: "investigation",
  build(a) {
    const { e1, e2 } = eras(a);
    const pb = phaseBlock(a, "pp", "bat", "pp");
    const ww = wicketsWin(a, "ppw", 0, 5, "powerplay");
    const pl = phasePlayers(a, "ppb", "bat", 0, 5, 2024, 2026, 60);
    const t = pb.tok, w = ww.tok;
    const ppX = extremes(a, "pp-x", pb.v.rows, "powerplay run rate", "runs per over", true, 2, pb.v.rows.length ? "phase series" : "");
    const tradeSql = `WITH pp AS (SELECT i.innings_id, i.match_id, i.batting_team_id bt, SUM(d.total_runs) r,
        SUM(CASE WHEN dm.dismissal_id IS NOT NULL AND dm.kind NOT IN ('retired hurt') THEN 1 ELSE 0 END) w
        FROM innings i JOIN deliveries d ON d.innings_id = i.innings_id LEFT JOIN dismissals dm ON dm.delivery_id = d.delivery_id
        WHERE ${REGULATION} AND d.over_num BETWEEN 0 AND 5 GROUP BY i.innings_id)
      SELECT CASE WHEN r BETWEEN 50 AND 59 AND w <= 1 THEN 'steady' WHEN r >= 60 AND w >= 2 THEN 'reckless' END k, COUNT(*) n, SUM(CASE WHEN m.winner_id = pp.bt THEN 1 ELSE 0 END) won
      FROM pp JOIN matches m ON m.match_id = pp.match_id WHERE m.winner_id IS NOT NULL GROUP BY k HAVING k IS NOT NULL`;
    const tr = a.rows<{ k: string; n: number; won: number }>(tradeSql);
    const steady = tr.find((x) => x.k === "steady")!, reckless = tr.find((x) => x.k === "reckless")!;
    const tSteady = a.pct("pp-steady", (steady.won / steady.n) * 100, "IPL win rate after 50–59 powerplay runs for no more than one wicket", { filters: "All innings with a result", n: steady.n, nUnit: "innings", sql: tradeSql, check: floor(steady.n, 100, "innings") });
    const tReck = a.pct("pp-reckless", (reckless.won / reckless.n) * 100, "IPL win rate after 60 or more powerplay runs for two or more wickets", { filters: "All innings with a result", n: reckless.n, nUnit: "innings", sql: tradeSql, check: floor(reckless.n, 50, "innings") });
    const steadyWins = steady.won / steady.n > reckless.won / reckless.n;
    const now = pb.better ? "ahead of" : "behind";
    const then = pb.betterE1 ? "ahead of" : "behind";
    const leadLine = pl.tok ? `Among ${a.code}'s recent openers, ${pl.tok.name} faced the most powerplay balls since 2024, ${pl.tok.balls} of them, at a strike rate of ${pl.tok.rate}.` : `No ${a.code} batter has faced enough powerplay balls since 2024 to be profiled on their own.`;
    return {
      dek: `How fast should ${a.name} start? Ball-by-ball data shows the first six overs reward runs, but punish lost wickets even more.`,
      excerpt: `${a.name} have been ${now} the league's powerplay scoring rate since 2024. Across every IPL innings, an early wicket costs more win probability than a quick start earns.`,
      keyTakeaways: [
        `${a.code}'s powerplay run rate was ${t.t1} across ${yearsLabel(e1[0], e1[1])} (league ${t.l1}) and ${t.t2} across ${yearsLabel(e2[0], e2[1])} (league ${t.l2}).`,
        `IPL sides that lost no powerplay wickets won ${w.l0} of the time; three or more wickets down, ${w.l3}.`,
        `${a.code} out-scored the league in the powerplay in ${t.good} of ${t.seasons} seasons.`,
      ],
      sections: [
        { heading: "The First Six Overs, Measured", body: [
          `Every T20 innings starts with the same bargain: two fielders outside the circle, a new ball, and a choice about risk. For ${a.name} the record shows how that bargain has been struck. Between ${e1[0]} and ${e1[1]} the side scored at ${t.t1} runs per over in the powerplay while the league scored at ${t.l1}, which put them ${then} the average.`,
          `Since 2024 the scoring environment has changed for everyone. ${a.code} have scored at ${t.t2} in the powerplay against a league figure of ${t.l2}, ${now} the pace of the competition. Across the seasons in the CricField warehouse they finished above the league's powerplay rate in ${t.good} of ${t.seasons}.`,
          ppX,
        ].filter(Boolean), chartIds: ["pp-trend"] },
        { heading: "What a Powerplay Wicket Costs", body: [
          `Runs are only half of the equation. Grouping every IPL innings with a result by wickets lost in the first six overs gives a steep staircase: sides that kept all ten wickets won ${w.l0} of the time, sides two down won ${w.l2}, and sides three or more down won ${w.l3}. The steepest single step is worth ${w.stepMax} percentage points of win rate.`,
          w.t0 && w.t3 ? `${a.poss} own ${w.tInn} innings with a result follow the same pattern: ${w.t0} with no powerplay wickets lost, ${w.t3} with three or more.` : `${a.poss} own sample of ${w.tInn} innings is too small to split cleanly by wickets lost, so the league-wide pattern is the better guide.`,
        ], chartIds: ["pp-wkts"] },
        { heading: "Who Carries the Risk", body: [
          leadLine,
          `The useful question for selectors is not whether to attack but who absorbs the risk. The player table shows each recent powerplay batter's strike rate beside how many balls they survive per dismissal; a pairing works when at least one of the two keeps the wicket count low while the other accelerates.`,
        ], chartIds: pl.rows.length ? ["pp-players"] : [] },
        { heading: "The Case for Swinging Harder", body: [
          `The league has sped up, and deeper batting line-ups since the impact-player rule may make an early wicket cheaper than the long-run averages suggest. The full-history staircase mixes eras in which a collapse was harder to absorb.`,
          `{{hyp:depth}}`,
        ] },
        { heading: `CricField Verdict: Price the Wicket First`, body: [
          `${a.name} should keep pace with a faster league, but the evidence says the binding constraint in the powerplay is wickets. Across the IPL, a start of fifty-odd for one or fewer has won ${tSteady} of the time, while sixty-plus for two or more has won ${tReck}${steadyWins ? ": the steadier start wins more often" : ""}.`,
          `The practical rule is one licensed attacker and one risk-absorber at the top, chosen on balls per dismissal as much as on strike rate.`,
        ] },
      ],
      charts: [
        { id: "pp-trend", type: "line", title: "Powerplay run rate by season", subtitle: `${a.code} batting vs IPL average, overs 1–6`, table: pb.table, xKey: "season", series: [{ key: "team", label: a.code }, { key: "league", label: "IPL average" }], xLabel: "Season", unit: "runs per over", takeaway: `${a.code} have been ${now} the league's powerplay rate since 2024.`, ariaLabel: `Line chart of ${a.code} powerplay run rate and the IPL average by season.` },
        { id: "pp-wkts", type: "column", title: "Win rate by powerplay wickets lost", subtitle: "All IPL innings with a result", table: ww.table, xKey: "wickets", series: [{ key: "team", label: a.code }, { key: "league", label: "IPL" }], xLabel: "Wickets lost in overs 1–6", unit: "% of innings won", takeaway: "Each extra powerplay wicket cuts the chance of winning sharply.", ariaLabel: `Grouped column chart of win rate by powerplay wickets lost for ${a.code} and the IPL.` },
        { id: "pp-players", type: "bar", title: `${a.code} powerplay batters since 2024`, subtitle: "Balls per dismissal, minimum 60 balls", table: pl.table, xKey: "player", series: [{ key: "ballsPerDismissal", label: "Balls per dismissal" }], unit: "balls per dismissal", takeaway: "Survival varies far more than strike rate between powerplay batters.", ariaLabel: `Horizontal bar chart of balls per dismissal for ${a.code} powerplay batters since 2024.` },
      ],
      hypotheses: [hyp("depth", "the impact-player rule has made an early wicket cheaper than the 2008–2026 averages imply.", "The recent sample is too small to estimate the wicket penalty by era with precision.", "Re-run the wickets-lost analysis on 2023 onwards with an era interaction term.")],
      players: pl.rs.slice(0, 4).map((r) => r.name),
      seasons: [yearsLabel(a.c.firstYear, 2026), "2024–2026"],
      hero: { narrative: `${a.name} openers attacking the powerplay.`, wanted: `${a.name} opening batter playing an attacking shot, recent season.`, query: `${a.name} batting powerplay` },
      related: [2, 9, 29],
      seo: { metaTitle: metaTitle(`The Powerplay Equation: when should ${a.code} attack?`), metaDescription: metaDesc(`${a.name} powerplay run rate against the league, and why IPL data says an early wicket costs more than a quick start earns.`) },
      methodology: `${METHOD_BASE} Powerplay = overs one to six. Wickets exclude retired hurt. Player table: balls faced exclude wides.`,
    };
  },
};

// ── 2. The Anchor Paradox (No. 3) ─────────────────────────────────────────────
const s2: SlotSpec = {
  n: 2,
  storyType: "tactical",
  build(a) {
    const sql = `${POS_CTE}
      SELECT ${YEAR()} year, CASE WHEN i.batting_team_id IN ${a.T} THEN 'team' ELSE 'rest' END side,
        SUM(d.batter_runs) runs, SUM(CASE WHEN d.is_wide = 0 THEN 1 ELSE 0 END) balls,
        SUM(CASE WHEN dm.player_out_id = d.batter_id THEN 1 ELSE 0 END) outs
      FROM deliveries d JOIN innings i ON i.innings_id = d.innings_id JOIN matches m ON m.match_id = d.match_id
      JOIN pos ON pos.innings_id = d.innings_id AND pos.pid = d.batter_id LEFT JOIN dismissals dm ON dm.delivery_id = d.delivery_id
      WHERE ${REGULATION} AND pos.position = 3 GROUP BY year, side ORDER BY year`;
    const rs = a.rows<{ year: number; side: string; runs: number; balls: number; outs: number }>(sql);
    const years = [...new Set(rs.filter((r) => r.side === "team").map((r) => r.year))];
    const rows: Row[] = years.map((y) => {
      const t = rs.find((r) => r.year === y && r.side === "team")!, l = rs.find((r) => r.year === y && r.side === "rest")!;
      return { season: String(y), team: dp((t.runs / t.balls) * 100), league: dp((l.runs / l.balls) * 100), teamBalls: t.balls };
    });
    a.table("no3-series", `Strike rate of the No. 3 batter by season: ${a.code} vs rest of IPL`, "Position = order of arrival at the crease; balls faced exclude wides", rs.filter((r) => r.side === "team").reduce((x, r) => x + r.balls, 0), `${a.code} balls at No. 3`, sql, rows);
    const agg = (side: string, from: number, to: number) => rs.filter((r) => r.side === side && r.year >= from && r.year <= to).reduce((x, r) => ({ runs: x.runs + r.runs, balls: x.balls + r.balls, outs: x.outs + r.outs }), { runs: 0, balls: 0, outs: 0 });
    const { e1, e2 } = eras(a);
    const T1 = agg("team", e1[0], e1[1]), T2 = agg("team", e2[0], e2[1]), L1 = agg("rest", e1[0], e1[1]), L2 = agg("rest", e2[0], e2[1]);
    const o = (n: number) => ({ filters: "Batter arriving third at the crease, regulation innings", n, nUnit: "balls", sql });
    const tok = {
      sr1: a.num("no3-sr-e1", (T1.runs / T1.balls) * 100, `${a.code} No. 3 strike rate, ${yearsLabel(e1[0], e1[1])}`, { ...o(T1.balls), unit: "runs per 100 balls", check: floor(T1.balls, 150, "balls") }),
      lsr1: a.num("no3-lsr-e1", (L1.runs / L1.balls) * 100, `Rest of IPL No. 3 strike rate, ${yearsLabel(e1[0], e1[1])}`, { ...o(L1.balls), unit: "runs per 100 balls", check: floor(L1.balls, 1000, "balls") }),
      sr2: a.num("no3-sr-e2", (T2.runs / T2.balls) * 100, `${a.code} No. 3 strike rate, 2024–2026`, { ...o(T2.balls), unit: "runs per 100 balls", check: floor(T2.balls, 150, "balls") }),
      lsr2: a.num("no3-lsr-e2", (L2.runs / L2.balls) * 100, "Rest of IPL No. 3 strike rate, 2024–2026", { ...o(L2.balls), unit: "runs per 100 balls", check: floor(L2.balls, 1000, "balls") }),
      bpd2: a.num("no3-bpd-e2", T2.balls / Math.max(1, T2.outs), `${a.code} No. 3 balls per dismissal, 2024–2026`, { ...o(T2.balls), unit: "balls", check: floor(T2.outs, 5, "dismissals") }),
      lbpd2: a.num("no3-lbpd-e2", L2.balls / Math.max(1, L2.outs), "Rest of IPL No. 3 balls per dismissal, 2024–2026", { ...o(L2.balls), unit: "balls", check: floor(L2.outs, 50, "dismissals") }),
    };
    const whoSql = `${POS_CTE} SELECT pl.name, COUNT(DISTINCT pos.innings_id) inns FROM pos JOIN innings i ON i.innings_id = pos.innings_id JOIN matches m ON m.match_id = i.match_id JOIN players pl ON pl.player_id = pos.pid
      WHERE pos.position = 3 AND i.batting_team_id IN ${a.T} AND ${YEAR()} BETWEEN 2024 AND 2026 AND ${REGULATION} GROUP BY pos.pid ORDER BY inns DESC LIMIT 1`;
    const who = a.rows<{ name: string; inns: number }>(whoSql)[0];
    const whoTok = who ? a.text("no3-who", who.name, `${a.code}'s most frequent No. 3 since 2024`, { filters: "Innings batting at No. 3", n: who.inns, nUnit: "innings", sql: whoSql, check: derived("rank by innings") }) : "";
    const whoN = who ? a.int("no3-who-n", who.inns, `Innings ${who.name} batted at No. 3 since 2024`, { filters: `${a.code}, 2024–2026`, n: who.inns, nUnit: "innings", sql: whoSql, check: floor(who.inns, 1, "innings") }) : "";
    const v2 = T2.runs / T2.balls, l2 = L2.runs / L2.balls, surv = T2.balls / Math.max(1, T2.outs) > L2.balls / Math.max(1, L2.outs);
    const style = v2 >= l2 && surv ? "both faster and longer-lasting than" : v2 >= l2 ? "faster but shorter-lived than" : surv ? "slower but longer-lasting than" : "both slower and shorter-lived than";
    return {
      dek: `Is the classic No. 3, the batter who steadies the innings, still worth a place in ${a.poss} XI? The position's numbers since 2024 answer it.`,
      excerpt: `Since 2024 ${a.poss} No. 3 has been ${style} the rest of the league's. That profile decides whether the anchor role is a strength or a luxury.`,
      keyTakeaways: [
        `${a.poss} No. 3 struck at ${tok.sr2} since 2024 against ${tok.lsr2} for the rest of the IPL.`,
        `Their No. 3 lasted ${tok.bpd2} balls per dismissal, against ${tok.lbpd2} league-wide.`,
        who ? `${whoTok} has filled the role most often since 2024, in ${whoN} innings.` : `No single batter has owned the No. 3 role since 2024.`,
      ],
      sections: [
        { heading: "The Position That Sets the Tempo", body: [
          `No. 3 is the hinge of a T20 innings: in some matches the batter walks in during the first over, in others after the fielding restrictions are gone. The traditional answer was an anchor who could bat through. The modern answer is less settled.`,
          `For ${a.name} the record is measurable. Between ${e1[0]} and ${e1[1]} their No. 3 struck at ${tok.sr1} against ${tok.lsr1} for the rest of the league.`,
          extremes(a, "no3-x", rows.filter((r) => (r.teamBalls as number) >= 60).map((r) => ({ year: Number(r.season), team: r.team as number })), "No. 3 strike rate", "runs per 100 balls", true, 1, sql),
        ].filter(Boolean), chartIds: ["no3-trend"] },
        { heading: "Speed Against Survival", body: [
          `Since 2024 ${a.poss} No. 3 has struck at ${tok.sr2} while the rest of the league's No. 3s struck at ${tok.lsr2}. On survival, the side's No. 3 lasted ${tok.bpd2} balls per dismissal against ${tok.lbpd2}.`,
          `Put together, ${a.poss} No. 3 has been ${style} the league's. That is the profile any change to the role has to improve on.`,
        ] },
        { heading: "When the Anchor Earns the Place", body: [
          who ? `${whoTok} batted at three in ${whoN} innings since 2024, the most of any ${a.code} player. Continuity in the role matters because a No. 3 who also opens or bats at four is hard to plan around.` : `${a.code} have rotated the position since 2024, which makes it harder to build a stable plan around it.`,
          `The anchor justifies the place when the top order collapses often, because then the No. 3 is effectively an opener. When openers regularly survive the powerplay, a hitter at three adds more.`,
        ] },
        { heading: "Why Strike Rate Alone Misleads", body: [
          `A No. 3 who walks in at nought for one in the first over faces a different job from one who arrives at a hundred for one in the tenth. The averages here mix both situations, so a slow strike rate may reflect early arrivals rather than caution.`,
          `{{hyp:entry}}`,
        ] },
        { heading: "CricField Verdict: Pick the Role by Its Entry Point", body: [
          `${a.name} should decide the No. 3 role by when that batter typically arrives. If the openers survive, the slot should go to a hitter; if they do not, an anchor remains valuable.`,
          `The numbers since 2024 are the benchmark: any replacement has to be ${v2 >= l2 ? "as quick" : "quicker"} without being ${surv ? "shorter-lived" : "even shorter-lived"}.`,
        ] },
      ],
      charts: [{ id: "no3-trend", type: "line", title: "Strike rate at No. 3 by season", subtitle: `${a.code} vs rest of IPL`, table: "no3-series", xKey: "season", series: [{ key: "team", label: a.code }, { key: "league", label: "Rest of IPL" }], xLabel: "Season", unit: "runs per 100 balls", takeaway: `${a.poss} No. 3 has been ${style} the league's since 2024.`, ariaLabel: `Line chart of strike rate at number three by season for ${a.code} and the rest of the IPL.` }],
      hypotheses: [hyp("entry", "a No. 3's strike rate depends more on the over in which they arrive than on their style.", "Entry-over adjusted strike rates have not been computed for every franchise.", "Group No. 3 innings by arrival over and compare strike rates within each group.")],
      literalNumbers: [{ text: "3", reason: "Batting position number (No. 3), a definition rather than a finding." }],
      players: who ? [who.name] : [],
      seasons: [yearsLabel(a.c.firstYear, 2026), "2024–2026"],
      hero: { narrative: `The No. 3 role at ${a.name}.`, wanted: `${who?.name ?? a.name} batting for ${a.name}.`, query: `${who?.name ?? ""} ${a.name} batting`.trim() },
      related: [1, 24, 71],
      seo: { metaTitle: metaTitle(`The Anchor Paradox: does ${a.code} need a No. 3?`), metaDescription: metaDesc(`${a.poss} No. 3 against the league on strike rate and survival since 2024, and when the anchor role still pays.`) },
      methodology: `${METHOD_BASE} Batting position is the order of first appearance at the crease. Strike rate excludes wides from balls faced.`,
    };
  },
};

// ── 3. Boundary Dependency ────────────────────────────────────────────────────
const s3: SlotSpec = {
  n: 3,
  storyType: "explainer",
  build(a) {
    const sql = `SELECT ${YEAR()} year,
        SUM(CASE WHEN i.batting_team_id IN ${a.T} AND d.is_boundary = 1 THEN d.batter_runs ELSE 0 END) * 100.0 / SUM(CASE WHEN i.batting_team_id IN ${a.T} THEN d.total_runs ELSE 0 END) team,
        SUM(CASE WHEN d.is_boundary = 1 THEN d.batter_runs ELSE 0 END) * 100.0 / SUM(d.total_runs) league,
        SUM(CASE WHEN i.batting_team_id IN ${a.T} THEN d.total_runs ELSE 0 END) teamRuns
      FROM deliveries d JOIN innings i ON i.innings_id = d.innings_id JOIN matches m ON m.match_id = d.match_id WHERE ${REGULATION} GROUP BY year HAVING teamRuns > 0 ORDER BY year`;
    const rs = a.rows<{ year: number; team: number; league: number; teamRuns: number }>(sql);
    a.table("bnd-series", `Share of runs from boundaries: ${a.code} vs IPL`, "Fours and sixes off the bat as a share of all runs", rs.reduce((x, r) => x + r.teamRuns, 0), `${a.code} runs`, sql, rs.map((r) => ({ season: String(r.year), team: dp(r.team), league: dp(r.league) })));
    const winSql = `WITH inn AS (SELECT i.innings_id, i.batting_team_id bt, i.match_id, SUM(CASE WHEN d.is_boundary = 1 THEN d.batter_runs ELSE 0 END) * 1.0 / NULLIF(SUM(d.total_runs), 0) share
        FROM innings i JOIN deliveries d ON d.innings_id = i.innings_id WHERE ${REGULATION} GROUP BY i.innings_id)
      SELECT CASE WHEN share < 0.55 THEN 'under 55%' WHEN share < 0.65 THEN '55–65%' ELSE '65% or more' END band,
        COUNT(*) n, SUM(CASE WHEN m.winner_id = inn.bt THEN 1 ELSE 0 END) won,
        SUM(CASE WHEN inn.bt IN ${a.T} THEN 1 ELSE 0 END) tn, SUM(CASE WHEN inn.bt IN ${a.T} AND m.winner_id = inn.bt THEN 1 ELSE 0 END) tw
      FROM inn JOIN matches m ON m.match_id = inn.match_id WHERE m.winner_id IS NOT NULL GROUP BY band`;
    const wb = a.rows<{ band: string; n: number; won: number; tn: number; tw: number }>(winSql);
    const order = ["under 55%", "55–65%", "65% or more"];
    const wrows = order.map((b) => wb.find((r) => r.band === b)!).filter(Boolean);
    a.table("bnd-win", "Win rate by share of runs from boundaries", "All IPL innings with a result", wrows.reduce((x, r) => x + r.n, 0), "innings", winSql, wrows.map((r) => ({ band: r.band, league: dp((r.won / r.n) * 100), team: r.tn >= 10 ? dp((r.tw / r.tn) * 100) : null })));
    const all = (who: "team" | "league", from: number, to: number) => {
      const xs = rs.filter((r) => r.year >= from && r.year <= to);
      return xs.reduce((x, r) => x + (who === "team" ? r.team : r.league) * (who === "team" ? r.teamRuns : 1), 0) / xs.reduce((x, r) => x + (who === "team" ? r.teamRuns : 1), 0);
    };
    const { e2 } = eras(a);
    const t2 = all("team", e2[0], e2[1]), l2 = all("league", e2[0], e2[1]), tAll = all("team", a.c.firstYear, 2026);
    const o = (n: number) => ({ filters: "Fours and sixes off the bat ÷ all runs", n, nUnit: "runs", sql });
    const tok = {
      t2: a.pct("bnd-t2", t2, `${a.code} share of runs from boundaries, 2024–2026`, { ...o(rs.filter((r) => r.year >= 2024).reduce((x, r) => x + r.teamRuns, 0)), check: range(t2, 30, 85, "share") }),
      l2: a.pct("bnd-l2", l2, "IPL share of runs from boundaries, 2024–2026 (mean of seasons)", { ...o(3), check: range(l2, 30, 85, "share") }),
      tAll: a.pct("bnd-tall", tAll, `${a.code} share of runs from boundaries, all seasons`, { ...o(rs.reduce((x, r) => x + r.teamRuns, 0)), check: range(tAll, 30, 85, "share") }),
      wLow: a.pct("bnd-wlow", (wrows[0].won / wrows[0].n) * 100, "IPL win rate for innings with under 55% of runs from boundaries", { filters: "All innings with a result", n: wrows[0].n, nUnit: "innings", sql: winSql, check: floor(wrows[0].n, 100, "innings") }),
      wHigh: a.pct("bnd-whigh", (wrows[2].won / wrows[2].n) * 100, "IPL win rate for innings with 65% or more of runs from boundaries", { filters: "All innings with a result", n: wrows[2].n, nUnit: "innings", sql: winSql, check: floor(wrows[2].n, 100, "innings") }),
    };
    const more = t2 > l2;
    return {
      dek: `How much of ${a.poss} scoring comes in fours and sixes, and is a boundary-heavy innings a winning one? The data separates power from dependency.`,
      excerpt: `Since 2024 ${a.name} have taken ${more ? "more" : "less"} of their runs in boundaries than the league. Across the IPL, boundary-heavy innings win more often, but the reasons are not as simple as hitting harder.`,
      keyTakeaways: [
        `${tok.t2} of ${a.poss} runs since 2024 came in fours and sixes; the league figure is ${tok.l2}.`,
        `IPL innings built on boundaries for 65% or more of their runs won ${tok.wHigh} of the time; under 55%, ${tok.wLow}.`,
        `Across all seasons, ${tok.tAll} of ${a.poss} runs have come from boundaries.`,
      ],
      sections: [
        { heading: "Counting the Ropes", body: [
          `Boundary dependency is easy to talk about and rarely measured. For ${a.name} the measurement is simple: since 2024, ${tok.t2} of their runs have come in fours and sixes off the bat, against ${tok.l2} for the league as a whole.`,
          `Over their full history the figure is ${tok.tAll}. The season chart shows how far the whole league has moved towards boundary hitting, which is the backdrop any team-level comparison has to sit against.`,
          extremes(a, "bnd-x", rs.map((r) => ({ year: r.year, team: r.team })), "share of runs from boundaries", "% of runs", true, 1, sql, ["most boundary-reliant", "least boundary-reliant"]),
        ].filter(Boolean), chartIds: ["bnd-trend"] },
        { heading: "Do Boundaries Win Matches?", body: [
          `Across every IPL innings with a result, those that took 65% or more of their runs in boundaries won ${tok.wHigh} of the time, while those under 55% won ${tok.wLow}.`,
          `Part of that link is cause and part is effect: an innings with many boundaries is usually a big total, and big totals win. A high boundary share also means fewer runs from running, which is exactly the skill that keeps an innings moving when boundaries dry up.`,
        ], chartIds: ["bnd-win"] },
        { heading: "Dependency Versus Firepower", body: [
          `The tactical risk is not a high boundary share; it is the absence of a fallback. A side that ${more ? "relies on" : "leans less on"} boundaries more than the league needs batters who can rotate strike on the days the ball is not coming onto the bat.`,
          `For ${a.code}, that means judging middle-order batters partly on singles and twos per ball, not only on sixes per innings.`,
        ] },
        { heading: "The Conditions Caveat", body: [
          `Boundary share depends on where a side plays. Home grounds with short boundaries inflate it, and a season spent at big grounds deflates it, regardless of approach.`,
          `{{hyp:venue}}`,
        ] },
        { heading: "CricField Verdict: Power With a Plan B", body: [
          `${a.name} should not fear boundary dependency; the league-wide data says boundary-heavy innings win. What they should guard against is a batting order with no way of scoring when the boundaries stop.`,
          `The measurable test is simple: runs from non-boundary balls per over in the middle overs, tracked alongside the boundary share.`,
        ] },
      ],
      charts: [
        { id: "bnd-trend", type: "line", title: "Share of runs from boundaries by season", subtitle: `${a.code} vs IPL`, table: "bnd-series", xKey: "season", series: [{ key: "team", label: a.code }, { key: "league", label: "IPL" }], xLabel: "Season", unit: "% of runs", takeaway: `The league's reliance on boundaries has risen; ${a.code} sit ${more ? "above" : "below"} it since 2024.`, ariaLabel: `Line chart of the share of runs from boundaries by season for ${a.code} and the IPL.` },
        { id: "bnd-win", type: "column", title: "Win rate by boundary share of an innings", subtitle: "All IPL innings with a result", table: "bnd-win", xKey: "band", series: [{ key: "league", label: "IPL" }, { key: "team", label: a.code }], xLabel: "Share of runs from boundaries", unit: "% of innings won", takeaway: "Boundary-heavy innings win more often across the league.", ariaLabel: "Column chart of win rate by the share of an innings' runs that came from boundaries." },
      ],
      literalNumbers: [{ text: "65", reason: "Band threshold (65% of runs from boundaries)." }, { text: "55", reason: "Band threshold (55% of runs from boundaries)." }],
      hypotheses: [hyp("venue", `${a.poss} boundary share is driven more by home conditions than by batting approach.`, "Venue-adjusted boundary shares have not been computed.", "Compare home and away boundary shares season by season.")],
      players: [],
      seasons: [yearsLabel(a.c.firstYear, 2026), "2024–2026"],
      hero: { narrative: `Boundary hitting at ${a.name}.`, wanted: `${a.name} batter hitting a six.`, query: `${a.name} six` },
      related: [9, 10, 4],
      seo: { metaTitle: metaTitle(`Boundary dependency: how ${a.code} score their runs`), metaDescription: metaDesc(`How much of ${a.poss} scoring comes in fours and sixes compared with the IPL, and whether boundary-heavy innings win.`) },
      methodology: `${METHOD_BASE} Boundary runs are fours and sixes off the bat. Win-rate bands use innings from matches with a result.`,
    };
  },
};

// ── 4. Middle-Overs Momentum ──────────────────────────────────────────────────
const s4: SlotSpec = {
  n: 4,
  storyType: "tactical",
  build(a) {
    const { e1, e2 } = eras(a);
    const pb = phaseBlock(a, "mid", "bat", "middle");
    const ww = wicketsWin(a, "midw", 6, 14, "middle overs");
    const pl = phasePlayers(a, "midb", "bat", 6, 14, 2024, 2026, 80);
    const t = pb.tok, w = ww.tok;
    const now = pb.better ? "faster than" : "slower than";
    return {
      dek: `Overs seven to fifteen decide more T20 matches than they get credit for. Where does ${a.poss} run rate rise or stall in that stretch?`,
      excerpt: `${a.name} have scored ${now} the league in the middle overs since 2024. The data shows why the quiet phase is where totals are really set.`,
      keyTakeaways: [
        `${a.poss} middle-overs run rate: ${t.t2} since 2024, against a league figure of ${t.l2}.`,
        `In ${yearsLabel(e1[0], e1[1])} the comparison was ${t.t1} against ${t.l1}.`,
        `Sides that lost three or more wickets in overs seven to fifteen won ${w.l3} of the time.`,
      ],
      sections: [
        { heading: "The Overs Nobody Remembers", body: [
          `Highlights packages favour the first six overs and the last five. The middle nine overs, between the fielding restrictions and the death, are where an innings either keeps its momentum or loses it.`,
          `For ${a.name} the middle-overs run rate was ${t.t1} between ${e1[0]} and ${e1[1]}, with the league at ${t.l1}. Since 2024 it has been ${t.t2} against ${t.l2}.`,
          extremes(a, "mid-x", pb.v.rows, "middle-overs run rate", "runs per over", true),
        ].filter(Boolean), chartIds: ["mid-trend"] },
        { heading: "Momentum and Wickets", body: [
          `The middle overs carry their own wicket penalty. Across every IPL innings with a result, sides that lost no wickets between overs seven and fifteen won ${w.l0} of the time, while those losing three or more won ${w.l3}.`,
          `${a.code} finished above the league's middle-overs rate in ${t.good} of ${t.seasons} seasons.`,
        ], chartIds: ["mid-wkts"] },
        { heading: "Who Drives the Middle", body: [
          pl.tok ? `Since 2024 ${pl.tok.name} has faced the most middle-overs balls for ${a.code}, ${pl.tok.balls} of them, striking at ${pl.tok.rate}.` : `No ${a.code} batter has faced enough middle-overs balls since 2024 to be profiled individually.`,
          `The middle overs reward batters who can hit spin and rotate strike against defensive fields. The player table shows strike rate and dot-ball rate side by side, the two levers that decide whether the run rate climbs.`,
        ], chartIds: pl.rows.length ? ["mid-players"] : [] },
        { heading: "Consolidation Is Not Always a Mistake", body: [
          `A slow middle phase is sometimes deliberate: a side that lost early wickets may be rebuilding to give its finishers a platform. Comparing raw run rates mixes those rebuilding innings with innings that simply stalled.`,
          `{{hyp:rebuild}}`,
        ] },
        { heading: "CricField Verdict: Win the Quiet Overs", body: [
          `${a.name} have been ${now} the league in the middle overs recently. The target for the phase should be a run rate at or above the league without giving up the wickets that make the death overs productive.`,
          `Selection should value middle-order batters on dot-ball rate against spin as much as on strike rate.`,
        ] },
      ],
      charts: [
        { id: "mid-trend", type: "line", title: "Middle-overs run rate by season", subtitle: `${a.code} batting vs IPL, overs 7–15`, table: pb.table, xKey: "season", series: [{ key: "team", label: a.code }, { key: "league", label: "IPL average" }], xLabel: "Season", unit: "runs per over", takeaway: `${a.code} have scored ${now} the league in the middle overs since 2024.`, ariaLabel: `Line chart of ${a.code} middle-overs run rate and the IPL average by season.` },
        { id: "mid-wkts", type: "column", title: "Win rate by middle-overs wickets lost", subtitle: "All IPL innings with a result", table: ww.table, xKey: "wickets", series: [{ key: "team", label: a.code }, { key: "league", label: "IPL" }], xLabel: "Wickets lost in overs 7–15", unit: "% of innings won", takeaway: "Losing wickets in the middle overs costs heavily.", ariaLabel: "Column chart of win rate by wickets lost in overs seven to fifteen." },
        { id: "mid-players", type: "bar", title: `${a.code} middle-overs batters since 2024`, subtitle: "Strike rate, minimum 80 balls", table: pl.table, xKey: "player", series: [{ key: "strikeRate", label: "Strike rate" }], unit: "runs per 100 balls", takeaway: "Middle-overs strike rates vary widely within the same squad.", ariaLabel: `Horizontal bar chart of middle-overs strike rate for ${a.code} batters since 2024.` },
      ],
      hypotheses: [hyp("rebuild", "a slow middle phase after early wickets is a deliberate rebuild rather than a failure, and costs less than the raw run rate suggests.", "Middle-overs run rates have not been split by wickets lost in the powerplay.", "Compare middle-overs run rates and match outcomes grouped by powerplay wickets lost.")],
      players: pl.rs.slice(0, 4).map((r) => r.name),
      seasons: [yearsLabel(a.c.firstYear, 2026), "2024–2026"],
      hero: { narrative: `${a.name} batting through the middle overs.`, wanted: `${pl.lead?.name ?? a.name} batting for ${a.name}.`, query: `${pl.lead?.name ?? ""} ${a.name} batting`.trim() },
      related: [1, 14, 9],
      seo: { metaTitle: metaTitle(`Middle-overs momentum: where ${a.code} gain or lose`), metaDescription: metaDesc(`${a.poss} run rate in overs seven to fifteen against the IPL, and what wickets lost in the middle phase cost.`) },
      methodology: `${METHOD_BASE} Middle overs = overs seven to fifteen. Wickets exclude retired hurt.`,
    };
  },
};

// ── 5. The Finisher's Clock ───────────────────────────────────────────────────
const s5: SlotSpec = {
  n: 5,
  storyType: "tactical",
  build(a) {
    const sql = `WITH entry AS (SELECT d.innings_id, d.batter_id pid, MIN(d.over_num) eo FROM deliveries d GROUP BY d.innings_id, d.batter_id)
      SELECT CASE WHEN e.eo < 10 THEN 'arrived before over 11' WHEN e.eo < 15 THEN 'arrived overs 11–15' ELSE 'arrived overs 16–20' END band,
        CASE WHEN i.batting_team_id IN ${a.T} THEN 'team' ELSE 'rest' END side,
        SUM(d.batter_runs) runs, SUM(CASE WHEN d.is_wide = 0 THEN 1 ELSE 0 END) balls
      FROM deliveries d JOIN innings i ON i.innings_id = d.innings_id JOIN matches m ON m.match_id = d.match_id
      JOIN entry e ON e.innings_id = d.innings_id AND e.pid = d.batter_id
      WHERE ${REGULATION} AND d.over_num BETWEEN 15 AND 19 AND ${YEAR()} >= 2022 GROUP BY band, side`;
    const rs = a.rows<{ band: string; side: string; runs: number; balls: number }>(sql);
    const bands = ["arrived before over 11", "arrived overs 11–15", "arrived overs 16–20"];
    const rows = bands.map((b) => {
      const t = rs.find((r) => r.band === b && r.side === "team"), l = rs.find((r) => r.band === b && r.side === "rest")!;
      return { arrival: b, team: t && t.balls >= 40 ? dp((t.runs / t.balls) * 100) : null, league: dp((l.runs / l.balls) * 100), teamBalls: t?.balls ?? 0 };
    });
    a.table("fin-entry", "Death-overs strike rate by when the batter arrived", "Overs 16–20, 2022–2026; entry = first ball faced", rs.reduce((x, r) => x + r.balls, 0), "balls", sql, rows);
    const lSet = rs.find((r) => r.band === bands[0] && r.side === "rest")!, lFresh = rs.find((r) => r.band === bands[2] && r.side === "rest")!;
    const tSet = rs.find((r) => r.band === bands[0] && r.side === "team"), tFresh = rs.find((r) => r.band === bands[2] && r.side === "team");
    const o = (n: number) => ({ filters: "Death overs, 2022–2026", n, nUnit: "balls", sql, unit: "runs per 100 balls" });
    const tok = {
      lSet: a.num("fin-lset", (lSet.runs / lSet.balls) * 100, "IPL death-overs strike rate of batters who arrived before over 11", { ...o(lSet.balls), check: floor(lSet.balls, 500, "balls") }),
      lFresh: a.num("fin-lfresh", (lFresh.runs / lFresh.balls) * 100, "IPL death-overs strike rate of batters who arrived in overs 16–20", { ...o(lFresh.balls), check: floor(lFresh.balls, 500, "balls") }),
      tSet: tSet && tSet.balls >= 40 ? a.num("fin-tset", (tSet.runs / tSet.balls) * 100, `${a.code} death-overs strike rate, batters set before over 11`, { ...o(tSet.balls), check: floor(tSet.balls, 40, "balls") }) : null,
      tFresh: tFresh && tFresh.balls >= 40 ? a.num("fin-tfresh", (tFresh.runs / tFresh.balls) * 100, `${a.code} death-overs strike rate, batters arriving in overs 16–20`, { ...o(tFresh.balls), check: floor(tFresh.balls, 40, "balls") }) : null,
    };
    const pb = phaseBlock(a, "dbat", "bat", "death");
    const pl = phasePlayers(a, "finb", "bat", 15, 19, 2024, 2026, 40);
    const setBetter = lSet.runs / lSet.balls > lFresh.runs / lFresh.balls;
    return {
      dek: `When should ${a.name} send in their power hitters? The answer depends on how much a set batter is worth in the last five overs.`,
      excerpt: `Across the IPL since 2022, batters already set by the death overs ${setBetter ? "out-score" : "trail"} those who arrive late. That trade-off decides when ${a.poss} finishers should walk out.`,
      keyTakeaways: [
        `IPL batters already at the crease before the eleventh over struck at ${tok.lSet} in the death overs since 2022; those arriving in the last five struck at ${tok.lFresh}.`,
        `${a.poss} death-overs run rate since 2024: ${pb.tok.t2}, against ${pb.tok.l2} for the league.`,
        pl.tok ? `${pl.tok.name} has faced the most death-overs balls for ${a.code} since 2024, striking at ${pl.tok.rate}.` : `${a.code} have rotated their finishers since 2024.`,
      ],
      sections: [
        { heading: "A Clock, Not a Batting Order", body: [
          `Finishers are usually discussed as a position. In practice they are a timing decision: send the hitter in too early and he burns his innings against the middle-overs spinners, too late and he has three balls to change a match.`,
          `The league-wide evidence since 2022 shows what being set is worth. Batters who were already at the crease before the eleventh over struck at ${tok.lSet} in the death overs; batters who arrived in the last five overs struck at ${tok.lFresh}.`,
        ], chartIds: ["fin-entry"] },
        { heading: `${a.poss} Last Five Overs`, body: [
          `${a.name} scored at ${pb.tok.t2} runs per over in the death since 2024, against a league figure of ${pb.tok.l2}. Earlier, between ${eras(a).e1[0]} and ${eras(a).e1[1]}, the comparison was ${pb.tok.t1} against ${pb.tok.l1}.`,
          tok.tSet && tok.tFresh ? `Inside the squad the split is visible too: set ${a.code} batters struck at ${tok.tSet} in the death, late arrivals at ${tok.tFresh}.` : `${a.poss} own sample is too small to split by arrival time with confidence, so the league pattern is the guide.`,
        ], chartIds: ["fin-trend"] },
        { heading: "Who Should Walk Out When", body: [
          pl.tok ? `Since 2024, ${pl.tok.name} has led ${a.code} in death-overs balls faced, with ${pl.tok.balls} at a strike rate of ${pl.tok.rate}.` : `No single ${a.code} batter dominates the death-overs workload since 2024.`,
          `The implication is a flexible order: when the platform is strong, the best hitter should walk out earlier than tradition says, so that he is set by the sixteenth over.`,
        ], chartIds: pl.rows.length ? ["fin-players"] : [] },
        { heading: "Selection Bias in the Numbers", body: [
          `Batters who are set by the death overs are often the better batters, which inflates their strike rate. Late arrivals include lower-order bowlers who would struggle at any point.`,
          `{{hyp:quality}}`,
        ] },
        { heading: "CricField Verdict: Send the Hitter Early Enough to Be Set", body: [
          `${a.name} should treat the finisher's entry as a clock. ${setBetter ? "Because set batters out-score late arrivals in the death," : "Even though late arrivals hold up well in the league data,"} the best hitter should be in by the twelfth or thirteenth over whenever wickets allow.`,
          `That changes how the batting order is written: as a set of triggers rather than fixed numbers.`,
        ] },
      ],
      charts: [
        { id: "fin-entry", type: "column", title: "Death-overs strike rate by arrival time", subtitle: "Overs 16–20, 2022–2026", table: "fin-entry", xKey: "arrival", series: [{ key: "league", label: "Rest of IPL" }, { key: "team", label: a.code }], xLabel: "When the batter arrived", unit: "runs per 100 balls", takeaway: setBetter ? "Batters already set before the death out-score late arrivals." : "Late arrivals hold their own against set batters.", ariaLabel: "Column chart of death-overs strike rate grouped by the over in which the batter arrived." },
        { id: "fin-trend", type: "line", title: "Death-overs run rate by season", subtitle: `${a.code} batting vs IPL, overs 16–20`, table: pb.table, xKey: "season", series: [{ key: "team", label: a.code }, { key: "league", label: "IPL average" }], xLabel: "Season", unit: "runs per over", takeaway: `${a.code} sit ${pb.better ? "above" : "below"} the league's death-overs rate since 2024.`, ariaLabel: `Line chart of ${a.code} death-overs run rate and the IPL average by season.` },
        { id: "fin-players", type: "bar", title: `${a.code} death-overs batters since 2024`, subtitle: "Strike rate, minimum 40 balls", table: pl.table, xKey: "player", series: [{ key: "strikeRate", label: "Strike rate" }], unit: "runs per 100 balls", takeaway: "Death-overs strike rates separate genuine finishers from the rest.", ariaLabel: `Horizontal bar chart of death-overs strike rate for ${a.code} batters since 2024.` },
      ],
      hypotheses: [hyp("quality", "the set-batter advantage in the death overs survives after controlling for batter quality.", "Strike rates have not been adjusted for each batter's career level.", "Compare the same batters' death-overs strike rates when set and when arriving late.")],
      players: pl.rs.slice(0, 4).map((r) => r.name),
      seasons: ["2022–2026", "2024–2026"],
      hero: { narrative: `A ${a.name} finisher at the death.`, wanted: `${pl.lead?.name ?? a.name} batting late in an innings.`, query: `${pl.lead?.name ?? ""} ${a.name}`.trim() },
      related: [76, 28, 24],
      seo: { metaTitle: metaTitle(`The Finisher's Clock: when should ${a.code} send hitters?`), metaDescription: metaDesc(`Set batters against late arrivals in the death overs, and what it means for when ${a.poss} power hitters should walk out.`) },
      methodology: `${METHOD_BASE} Arrival = the over of a batter's first ball faced. Death overs = sixteen to twenty. Bands with fewer than forty ${a.code} balls are not shown for the team.`,
    };
  },
};

// ── 6. Chasing Under Pressure ─────────────────────────────────────────────────
const s6: SlotSpec = {
  n: 6,
  storyType: "investigation",
  build(a) {
    const sql = `SELECT CASE WHEN i1.runs < 150 THEN 'under 150' WHEN i1.runs < 175 THEN '150–174' WHEN i1.runs < 200 THEN '175–199' ELSE '200+' END band,
        COUNT(*) n, SUM(CASE WHEN m.winner_id = i2.batting_team_id THEN 1 ELSE 0 END) won,
        SUM(CASE WHEN i2.batting_team_id IN ${a.T} THEN 1 ELSE 0 END) tn, SUM(CASE WHEN i2.batting_team_id IN ${a.T} AND m.winner_id = i2.batting_team_id THEN 1 ELSE 0 END) tw
      FROM matches m JOIN innings i1 ON i1.match_id = m.match_id AND i1.innings_number = 1 JOIN innings i2 ON i2.match_id = m.match_id AND i2.innings_number = 2
      WHERE m.winner_id IS NOT NULL GROUP BY band`;
    const rs = a.rows<{ band: string; n: number; won: number; tn: number; tw: number }>(sql);
    const order = ["under 150", "150–174", "175–199", "200+"];
    const rows = order.map((b) => rs.find((r) => r.band === b)!).filter(Boolean);
    a.table("chase-bands", "Chasing win rate by target band", "Matches with a result; target band = first-innings total", rows.reduce((x, r) => x + r.n, 0), "chases", sql, rows.map((r) => ({ target: r.band, league: dp((r.won / r.n) * 100), team: r.tn >= 8 ? dp((r.tw / r.tn) * 100) : null, teamChases: r.tn })));
    const tChases = rows.reduce((x, r) => x + r.tn, 0), tWon = rows.reduce((x, r) => x + r.tw, 0);
    const lAll = rows.reduce((x, r) => ({ n: x.n + r.n, w: x.w + r.won }), { n: 0, w: 0 });
    const big = rows.find((r) => r.band === "200+")!;
    const tok = {
      tPct: a.pct("chase-t", (tWon / tChases) * 100, `${a.code} chasing win rate, all seasons`, { filters: "Second innings, matches with a result", n: tChases, nUnit: "chases", sql, check: floor(tChases, 20, "chases") }),
      lPct: a.pct("chase-l", (lAll.w / lAll.n) * 100, "IPL chasing win rate, all seasons", { filters: "Second innings, matches with a result", n: lAll.n, nUnit: "chases", sql, check: floor(lAll.n, 500, "chases") }),
      l200: a.pct("chase-l200", (big.won / big.n) * 100, "IPL win rate chasing 200 or more", { filters: "First-innings total of 200+", n: big.n, nUnit: "chases", sql, check: floor(big.n, 30, "chases") }),
      lUnder: a.pct("chase-lunder", (rows[0].won / rows[0].n) * 100, "IPL win rate chasing under 150", { filters: "First-innings total under 150", n: rows[0].n, nUnit: "chases", sql, check: floor(rows[0].n, 30, "chases") }),
      t200: big.tn >= 5 ? a.pct("chase-t200", (big.tw / big.tn) * 100, `${a.code} win rate chasing 200 or more`, { filters: "First-innings total of 200+", n: big.tn, nUnit: "chases", sql, check: floor(big.tn, 5, "chases") }) : null,
      t200n: a.int("chase-t200n", big.tn, `${a.code} chases of 200 or more`, { filters: "First-innings total of 200+", n: big.tn, nUnit: "chases", sql, check: derived("count") }),
    };
    const rrSql = `SELECT CASE WHEN rr_need < 9 THEN 'under 9' WHEN rr_need < 11 THEN '9–11' WHEN rr_need < 13 THEN '11–13' ELSE '13+' END band, COUNT(*) n, SUM(won) won,
        SUM(is_t) tn, SUM(is_t * won) tw FROM (
        SELECT i2.batting_team_id IN ${a.T} is_t, CASE WHEN m.winner_id = i2.batting_team_id THEN 1 ELSE 0 END won,
          (i1.runs + 1 - SUM(d.total_runs)) * 6.0 / (120 - SUM(CASE WHEN ${LEGAL} THEN 1 ELSE 0 END)) rr_need
        FROM matches m JOIN innings i1 ON i1.match_id = m.match_id AND i1.innings_number = 1 JOIN innings i2 ON i2.match_id = m.match_id AND i2.innings_number = 2
        JOIN deliveries d ON d.innings_id = i2.innings_id AND d.over_num < 10 WHERE m.winner_id IS NOT NULL GROUP BY m.match_id HAVING SUM(CASE WHEN ${LEGAL} THEN 1 ELSE 0 END) >= 60) GROUP BY band`;
    const rr = a.rows<{ band: string; n: number; won: number; tn: number; tw: number }>(rrSql);
    const rrOrder = ["under 9", "9–11", "11–13", "13+"];
    const b911 = rr.find((r) => r.band === "9–11"), b1113 = rr.find((r) => r.band === "11–13");
    const tMid = b911 ? a.pct("chase-rr-911", (b911.won / b911.n) * 100, "IPL win rate when needing 9–11 an over at halfway", { filters: "Chases after ten overs", n: b911.n, nUnit: "chases", sql: rrSql, check: floor(b911.n, 50, "chases") }) : "";
    const tHigh = b1113 ? a.pct("chase-rr-1113", (b1113.won / b1113.n) * 100, "IPL win rate when needing 11–13 an over at halfway", { filters: "Chases after ten overs", n: b1113.n, nUnit: "chases", sql: rrSql, check: floor(b1113.n, 50, "chases") }) : "";
    a.table("chase-need", "Chasing win rate by required rate at halfway", "Second innings, required run rate after ten overs", rr.reduce((x, r) => x + r.n, 0), "chases", rrSql, rrOrder.map((b) => rr.find((r) => r.band === b)).filter(Boolean).map((r) => ({ required: r!.band, league: dp((r!.won / r!.n) * 100), team: r!.tn >= 8 ? dp((r!.tw / r!.tn) * 100) : null })));
    const better = tWon / tChases > lAll.w / lAll.n;
    return {
      dek: `Does ${a.poss} batting change as the target climbs? Chasing records by target band and by the required rate at halfway show where pressure bites.`,
      excerpt: `${a.name} have won ${better ? "more" : "fewer"} of their chases than the league average. The data shows how quickly a chase slips away as the target rises past two hundred.`,
      keyTakeaways: [
        `${a.code} have won ${tok.tPct} of their chases; the league figure is ${tok.lPct}.`,
        `IPL sides chasing under 150 won ${tok.lUnder}; chasing 200 or more, ${tok.l200}.`,
        tok.t200 ? `${a.code} have won ${tok.t200} of their ${tok.t200n} chases of 200 or more.` : `${a.code} have faced ${tok.t200n} targets of 200 or more.`,
      ],
      sections: [
        { heading: "The Target Sets the Tone", body: [
          `Chasing in T20 is a different sport at different totals. Across every IPL chase with a result, sides set under 150 won ${tok.lUnder} of the time; set 200 or more, ${tok.l200}.`,
          `${a.name} have won ${tok.tPct} of their chases overall against a league figure of ${tok.lPct}.`,
        ], chartIds: ["chase-bands"] },
        { heading: "Pressure at Halfway", body: [
          `The required run rate after ten overs is a sharper measure of pressure than the target itself. Across the league, sides needing nine to eleven an over at halfway won ${tMid} of the time; sides needing eleven to thirteen won ${tHigh}.`,
          tok.t200 ? `Against the biggest targets, ${a.code} have won ${tok.t200} of ${tok.t200n} chases of 200 or more.` : `${a.code} have faced too few big targets to judge their high-pressure chasing on its own.`,
        ], chartIds: ["chase-need"] },
        { heading: "Batting Differently as the Target Climbs", body: [
          `A big target changes the batting order's job: the powerplay has to be bigger and the middle overs cannot be used for consolidation. The other lever is wickets in hand, which decide how hard a side can swing in the last five overs.`,
          `For ${a.code}, the practical plan is to set halfway checkpoints for each target band and promote hitters when the side is behind them.`,
        ] },
        { heading: "Dew, Toss and Venue", body: [
          `Chasing records carry conditions with them. Dew in evening matches, the toss and the ground all shift the odds, and none of them are controlled in a simple record by target band.`,
          `{{hyp:dew}}`,
        ] },
        { heading: "CricField Verdict: Chase the Checkpoint, Not the Total", body: [
          `${a.name} ${better ? "have been better chasers than the league" : "have chased less well than the league"}, and the gap matters most against big targets. The evidence supports chasing to a required-rate checkpoint at halfway rather than to the total.`,
          `If the asking rate at ten overs is manageable, protecting wickets keeps the finish available; if it is not, the hitters have to come in early.`,
        ] },
      ],
      charts: [
        { id: "chase-bands", type: "column", title: "Chasing win rate by target", subtitle: "Matches with a result", table: "chase-bands", xKey: "target", series: [{ key: "league", label: "IPL" }, { key: "team", label: a.code }], xLabel: "First-innings total", unit: "% of chases won", takeaway: "Chasing gets steadily harder as the target rises.", ariaLabel: "Column chart of chasing win rate grouped by target band for the IPL and the franchise." },
        { id: "chase-need", type: "column", title: "Win rate by required rate at halfway", subtitle: "Required run rate after ten overs of the chase", table: "chase-need", xKey: "required", series: [{ key: "league", label: "IPL" }, { key: "team", label: a.code }], xLabel: "Required runs per over", unit: "% of chases won", takeaway: `Win rates fall as the asking rate at halfway rises.`, ariaLabel: "Column chart of chasing win rate grouped by required run rate after ten overs." },
      ],
      literalNumbers: [{ text: "150", reason: "Target band threshold." }, { text: "200", reason: "Target band threshold." }],
      hypotheses: [hyp("dew", `${a.poss} chasing record depends on evening dew more than on batting approach.`, "Match start times and dew conditions are not recorded in the warehouse.", "Join match start times and compare day and night chasing records.")],
      players: [],
      seasons: [yearsLabel(a.c.firstYear, 2026)],
      hero: { narrative: `${a.name} chasing a target.`, wanted: `${a.name} batters during a run chase.`, query: `${a.name} chase win` },
      related: [10, 25, 81],
      seo: { metaTitle: metaTitle(`Chasing under pressure: how ${a.code} handle big targets`), metaDescription: metaDesc(`${a.poss} chasing record against the IPL by target band and by required rate at halfway.`) },
      methodology: `${METHOD_BASE} Target bands use the first-innings total. Required rate at halfway = runs needed after ten overs divided by overs remaining. Team bands with fewer than eight chases are not shown.`,
    };
  },
};

// ── 7. Left–Right Combinations ────────────────────────────────────────────────
const s7: SlotSpec = {
  n: 7,
  storyType: "explainer",
  build(a) {
    const bio = bioByCricsheet();
    const sql = `SELECT ${YEAR()} year, CASE WHEN i.batting_team_id IN ${a.T} THEN 1 ELSE 0 END is_t, sb.name s, nb.name ns, d.total_runs r, CASE WHEN ${LEGAL} THEN 1 ELSE 0 END b, CASE WHEN dm.player_out_id IS NOT NULL THEN 1 ELSE 0 END w
      FROM deliveries d JOIN innings i ON i.innings_id = d.innings_id JOIN matches m ON m.match_id = d.match_id JOIN players sb ON sb.player_id = d.batter_id JOIN players nb ON nb.player_id = d.non_striker_id
      LEFT JOIN dismissals dm ON dm.delivery_id = d.delivery_id WHERE ${REGULATION} AND ${YEAR()} >= 2018`;
    const rs = a.rows<{ year: number; is_t: number; s: string; ns: string; r: number; b: number; w: number }>(sql);
    const acc = { team: { mixed: { r: 0, b: 0, w: 0 }, same: { r: 0, b: 0, w: 0 } }, rest: { mixed: { r: 0, b: 0, w: 0 }, same: { r: 0, b: 0, w: 0 } } };
    let typed = 0;
    for (const x of rs) {
      const h1 = batHand(bio.get(x.s)?.batStyle), h2 = batHand(bio.get(x.ns)?.batStyle);
      if (!h1 || !h2) continue;
      typed++;
      const k = h1 === h2 ? "same" : "mixed";
      const g = acc[x.is_t ? "team" : "rest"][k];
      g.r += x.r, (g.b += x.b), (g.w += x.w);
    }
    const rr = (g: { r: number; b: number }) => (g.r * 6) / g.b;
    const rows: Row[] = [
      { pair: "Left–right pair", team: dp(rr(acc.team.mixed), 2), league: dp(rr(acc.rest.mixed), 2) },
      { pair: "Same-handed pair", team: dp(rr(acc.team.same), 2), league: dp(rr(acc.rest.same), 2) },
    ];
    a.table("lr-rr", "Run rate by batting pair handedness, 2018–2026", "Striker and non-striker handedness from player-bio.json via the squads crosswalk; balls with both hands known", typed, "balls", sql, rows, "CricField warehouse + player-bio.json");
    const cov = (typed / rs.length) * 100;
    const o = (n: number) => ({ filters: "2018–2026, both batters' hands known", n, nUnit: "legal balls", sql, unit: "runs per over", dataset: "CricField warehouse + player-bio.json" });
    const tok = {
      cov: a.pct("lr-cov", cov, "Share of 2018–2026 deliveries with both batters' hands known", { filters: "Crosswalk coverage", n: rs.length, nUnit: "deliveries", sql, check: range(cov, 50, 100, "coverage"), dataset: "CricField warehouse + player-bio.json" }, 0),
      tMix: a.num("lr-tmix", rr(acc.team.mixed), `${a.code} run rate with a left–right pair at the crease`, { ...o(acc.team.mixed.b), check: floor(acc.team.mixed.b, 500, "balls") }, 2),
      tSame: a.num("lr-tsame", rr(acc.team.same), `${a.code} run rate with a same-handed pair`, { ...o(acc.team.same.b), check: floor(acc.team.same.b, 500, "balls") }, 2),
      lMix: a.num("lr-lmix", rr(acc.rest.mixed), "Rest of IPL run rate with a left–right pair", { ...o(acc.rest.mixed.b), check: floor(acc.rest.mixed.b, 5000, "balls") }, 2),
      lSame: a.num("lr-lsame", rr(acc.rest.same), "Rest of IPL run rate with a same-handed pair", { ...o(acc.rest.same.b), check: floor(acc.rest.same.b, 5000, "balls") }, 2),
      tMixShare: a.pct("lr-tshare", (acc.team.mixed.b / (acc.team.mixed.b + acc.team.same.b)) * 100, `Share of ${a.code} balls faced with a left–right pair`, { filters: "2018–2026", n: acc.team.mixed.b + acc.team.same.b, nUnit: "balls", sql, check: floor(acc.team.mixed.b + acc.team.same.b, 1000, "balls"), dataset: "CricField warehouse + player-bio.json" }, 0),
    };
    const lgGain = rr(acc.rest.mixed) - rr(acc.rest.same), tGain = rr(acc.team.mixed) - rr(acc.team.same);
    return {
      dek: `Do left–right batting partnerships unsettle bowlers enough to be worth more than raw strike rate? ${a.poss} partnerships since 2018 put the theory to a test.`,
      excerpt: `Across the rest of the IPL since 2018, left–right pairs have scored ${lgGain > 0 ? "faster" : "no faster"} than same-handed pairs. For ${a.name} the gap ${tGain > 0 ? "points the same way" : "runs the other way"}.`,
      keyTakeaways: [
        `${a.code} scored at ${tok.tMix} with a left–right pair at the crease and ${tok.tSame} with a same-handed pair (2018–2026).`,
        `For the rest of the league the figures are ${tok.lMix} and ${tok.lSame}.`,
        `Handedness is known for ${tok.cov} of deliveries in the window; the rest are excluded.`,
      ],
      sections: [
        { heading: "The Theory of the Awkward Pair", body: [
          `Coaches like a left–right partnership because every strike change forces bowlers to reset their line and captains to move fielders. If the theory is right, mixed pairs should score faster than same-handed pairs over a large sample.`,
          `CricField tested it by attaching each batter's handedness from player-bio data to every delivery since 2018. Both batters' hands are known for ${tok.cov} of balls.`,
        ] },
        { heading: "What the Partnerships Show", body: [
          `Across the rest of the IPL, left–right pairs scored at ${tok.lMix} runs per over and same-handed pairs at ${tok.lSame}. For ${a.name} the figures are ${tok.tMix} and ${tok.tSame}.`,
          `${a.code} spent ${tok.tMixShare} of their balls since 2018 with a left–right pair at the crease.`,
        ], chartIds: ["lr-chart"] },
        { heading: "Using the Combination Deliberately", body: [
          `If a mixed pair is worth even a fraction of a run per over, batting orders can be flexed to keep one left-hander in the middle at all times, especially against finger spin that turns into one hand and away from the other.`,
          `The decision is cheap to implement: it changes who walks out next, not who is picked.`,
        ] },
        { heading: "Why the Gap Might Be an Illusion", body: [
          `Mixed and same-handed pairs do not bat in the same situations. If left-handers are concentrated among openers, mixed pairs will be over-represented in the powerplay, where scoring is easier, and the comparison will flatter them.`,
          `{{hyp:phase}}`,
        ] },
        { heading: "CricField Verdict: A Tiebreaker, Not a Selection Rule", body: [
          `The data ${lgGain > 0 ? "gives some support to" : "does not clearly support"} the left–right theory league-wide. For ${a.name} it should decide batting-order ties between batters of similar quality, not override strike rate and survival.`,
          `The next step is to repeat the comparison within each phase to remove the powerplay effect.`,
        ] },
      ],
      charts: [{ id: "lr-chart", type: "column", title: "Run rate by batting pair handedness", subtitle: "2018–2026, both batters' hands known", table: "lr-rr", xKey: "pair", series: [{ key: "team", label: a.code }, { key: "league", label: "Rest of IPL" }], xLabel: "Batting pair", unit: "runs per over", takeaway: `Left–right pairs score ${lgGain > 0 ? "a little faster" : "no faster"} across the league.`, ariaLabel: "Grouped column chart comparing run rates of left-right and same-handed batting pairs." }],
      hypotheses: [hyp("phase", "the left–right advantage disappears once phase of innings is controlled for.", "The comparison has not yet been split by powerplay, middle and death overs.", "Repeat the comparison within each phase and weight by balls faced.")],
      sources: [{ id: "cf-bio", kind: "cricfield-dataset", title: "CricField player-bio dataset (batting and bowling styles)", publisher: "CricField", note: "Joined to ball-by-ball data through squad lists; coverage reported in the article." }],
      players: [],
      seasons: ["2018–2026"],
      hero: { narrative: `A ${a.name} batting partnership.`, wanted: `Two ${a.name} batters together in the middle.`, query: `${a.name} partnership batting` },
      related: [88, 24, 2],
      seo: { metaTitle: metaTitle(`Left–right combinations: are they worth it for ${a.code}?`), metaDescription: metaDesc(`${a.name} run rates with left-right and same-handed batting pairs since 2018, against the rest of the IPL.`) },
      methodology: `${METHOD_BASE} Handedness from CricField player-bio data joined via squad lists (Cricsheet names); deliveries where either batter's hand is unknown are excluded. Window 2018–2026.`,
    };
  },
};

// ── 8. Spin Versus Pace ───────────────────────────────────────────────────────
const s8: SlotSpec = {
  n: 8,
  storyType: "tactical",
  build(a) {
    const bio = bioByCricsheet();
    const sql = `SELECT CASE WHEN i.batting_team_id IN ${a.T} THEN 1 ELSE 0 END is_t, bw.name bowler, d.batter_runs r, CASE WHEN d.is_wide = 0 THEN 1 ELSE 0 END b,
        CASE WHEN dm.player_out_id = d.batter_id AND dm.kind NOT IN ('run out','retired hurt','retired out','obstructing the field') THEN 1 ELSE 0 END w
      FROM deliveries d JOIN innings i ON i.innings_id = d.innings_id JOIN matches m ON m.match_id = d.match_id JOIN players bw ON bw.player_id = d.bowler_id
      LEFT JOIN dismissals dm ON dm.delivery_id = d.delivery_id WHERE ${REGULATION} AND ${YEAR()} >= 2022`;
    const rs = a.rows<{ is_t: number; bowler: string; r: number; b: number; w: number }>(sql);
    const acc: Record<string, { r: number; b: number; w: number }> = {};
    let typed = 0;
    for (const x of rs) {
      const ty = bowlType(bio.get(x.bowler)?.bowlStyle);
      if (!ty) continue;
      typed++;
      const k = `${x.is_t ? "team" : "rest"}|${ty}`;
      const g = (acc[k] ??= { r: 0, b: 0, w: 0 });
      g.r += x.r, (g.b += x.b), (g.w += x.w);
    }
    const g = (k: string) => acc[k] ?? { r: 0, b: 1, w: 1 };
    const sr = (k: string) => (g(k).r / g(k).b) * 100, bpd = (k: string) => g(k).b / Math.max(1, g(k).w);
    const rows: Row[] = ["pace", "spin"].map((ty) => ({ bowling: ty === "pace" ? "Against pace" : "Against spin", teamSR: dp(sr(`team|${ty}`)), leagueSR: dp(sr(`rest|${ty}`)), teamBPD: dp(bpd(`team|${ty}`)), leagueBPD: dp(bpd(`rest|${ty}`)) }));
    a.table("svp", "Batting against pace and spin, 2022–2026", "Bowling type from player-bio.json via the squads crosswalk; balls with a known bowling type", typed, "balls", sql, rows, "CricField warehouse + player-bio.json");
    const o = (k: string, label: string, kind: "sr" | "bpd") => kind === "sr" ? a.num(`svp-${k.replace("|", "-")}-sr`, sr(k), label, { unit: "runs per 100 balls", filters: "2022–2026", n: g(k).b, nUnit: "balls", sql, check: floor(g(k).b, 300, "balls"), dataset: "CricField warehouse + player-bio.json" }) : a.num(`svp-${k.replace("|", "-")}-bpd`, bpd(k), label, { unit: "balls per dismissal", filters: "2022–2026", n: g(k).b, nUnit: "balls", sql, check: floor(g(k).w, 10, "dismissals"), dataset: "CricField warehouse + player-bio.json" });
    const tok = {
      tP: o("team|pace", `${a.code} strike rate against pace, 2022–2026`, "sr"),
      tS: o("team|spin", `${a.code} strike rate against spin, 2022–2026`, "sr"),
      lP: o("rest|pace", "Rest of IPL strike rate against pace, 2022–2026", "sr"),
      lS: o("rest|spin", "Rest of IPL strike rate against spin, 2022–2026", "sr"),
      tPb: o("team|pace", `${a.code} balls per dismissal against pace`, "bpd"),
      tSb: o("team|spin", `${a.code} balls per dismissal against spin`, "bpd"),
      cov: a.pct("svp-cov", (typed / rs.length) * 100, "Share of 2022–2026 deliveries with a known bowling type", { filters: "Crosswalk coverage", n: rs.length, nUnit: "deliveries", sql, check: range((typed / rs.length) * 100, 50, 100, "coverage"), dataset: "CricField warehouse + player-bio.json" }, 0),
    };
    const relPace = sr("team|pace") - sr("rest|pace"), relSpin = sr("team|spin") - sr("rest|spin");
    const weaker = relPace < relSpin ? "pace" : "spin";
    const material = Math.abs(relPace - relSpin) >= 4; // strike-rate points; smaller gaps are noise at these samples
    return {
      dek: `Do ${a.name} score more freely against pace or spin, and what does each cost them in wickets? Bowling-type data since 2022 maps the trade-off.`,
      excerpt: material ? `Compared with the rest of the league, ${a.poss} batting has been relatively weaker against ${weaker} since 2022. That shapes how opponents will bowl at them.` : `Since 2022 ${a.poss} batting has tracked the league closely against both pace and spin, with no clear weakness for opponents to target.`,
      keyTakeaways: [
        `${a.code} struck at ${tok.tP} against pace and ${tok.tS} against spin (2022–2026).`,
        `The rest of the IPL struck at ${tok.lP} and ${tok.lS} respectively.`,
        `Bowling type is known for ${tok.cov} of deliveries in the window.`,
      ],
      sections: [
        { heading: "Two Different Games", body: [
          `Batting against pace and batting against spin reward different skills: one punishes the ball that is too full or too short, the other the ball that is flighted or too flat. Every side has a lean, and opposition analysts look for it first.`,
          `CricField attached each bowler's type from player-bio data to every delivery since 2022. Bowling type is known for ${tok.cov} of balls.`,
        ] },
        { heading: `${a.poss} Lean`, body: [
          `Against pace, ${a.name} struck at ${tok.tP} and lost a wicket every ${tok.tPb} balls. Against spin they struck at ${tok.tS}, losing a wicket every ${tok.tSb} balls.`,
          `The league comparison matters because everyone scores at different rates against the two types: the rest of the IPL struck at ${tok.lP} against pace and ${tok.lS} against spin. ${material ? `Relative to that baseline, ${a.code} are weaker against ${weaker}.` : `Relative to that baseline the gaps are small, too small to call a weakness at these sample sizes.`}`,
        ], chartIds: ["svp-chart"] },
        { heading: "How Opponents Will Plan", body: [
          material ? `A relative weakness against ${weaker} invites more of it: opposition captains will hold their ${weaker === "spin" ? "spinners for the middle overs" : "quicks back for the batters who struggle against pace"}.` : `With no clear weakness, opposition plans are more likely to target individual batters than the line-up as a whole.`,
          material ? `The counter is in selection and order: a batter who is strong against ${weaker} should be placed where that bowling is most likely to come.` : `The useful work is at player level: each batter's split against pace and spin, tracked season by season.`,
        ] },
        { heading: "Type Is Not Everything", body: [
          `Pace and spin are broad labels. A left-arm wrist spinner and an off-spinner pose different problems, as do a swing bowler and a hit-the-deck quick. The comparison here also excludes bowlers whose type is unknown.`,
          `{{hyp:subtype}}`,
        ] },
        { heading: material ? `CricField Verdict: Shore Up Against ${weaker === "spin" ? "Spin" : "Pace"}` : "CricField Verdict: Balanced, So Plan Batter by Batter", body: [
          material ? `${a.name} should expect to see more ${weaker} than average, and should recruit or promote batters who score freely against it.` : `${a.name} have no team-wide weakness by bowling type; the plan should be built around individual match-ups.`,
          `Tracking strike rate and balls per dismissal by bowling type each season would show whether the gap is closing.`,
        ] },
      ],
      charts: [{ id: "svp-chart", type: "column", title: "Strike rate against pace and spin", subtitle: "2022–2026, bowling type known", table: "svp", xKey: "bowling", series: [{ key: "teamSR", label: a.code }, { key: "leagueSR", label: "Rest of IPL" }], xLabel: "Bowling type", unit: "runs per 100 balls", takeaway: material ? `Relative to the league, ${a.code} are weaker against ${weaker}.` : `${a.code} track the league closely against both types.`, ariaLabel: "Grouped column chart of batting strike rate against pace and spin bowling." }],
      hypotheses: [hyp("subtype", `${a.poss} weakness is concentrated against one sub-type of bowling rather than all ${weaker}.`, "Bowling sub-types (wrist spin, left-arm orthodox, swing) have not been analysed separately.", "Split the comparison by detailed bowling style where coverage allows.")],
      sources: [{ id: "cf-bio", kind: "cricfield-dataset", title: "CricField player-bio dataset (batting and bowling styles)", publisher: "CricField", note: "Joined via squad lists; coverage reported in the article." }],
      players: [],
      seasons: ["2022–2026"],
      hero: { narrative: `${a.name} batting against spin.`, wanted: `${a.name} batter sweeping or driving against spin.`, query: `${a.name} batting` },
      related: [14, 19, 4],
      seo: { metaTitle: metaTitle(`Spin versus pace: ${a.poss} batting trade-offs`), metaDescription: metaDesc(`${a.name} strike rate and balls per dismissal against pace and spin since 2022, compared with the rest of the IPL.`) },
      methodology: `${METHOD_BASE} Bowling type from CricField player-bio data joined via squad lists; balls by bowlers of unknown or mixed type are excluded. Wickets exclude run outs.`,
    };
  },
};

// ── 9. Dot-Ball Debt ──────────────────────────────────────────────────────────
const s9: SlotSpec = {
  n: 9,
  storyType: "explainer",
  build(a) {
    const sql = `SELECT ${YEAR()} year,
        SUM(CASE WHEN i.batting_team_id IN ${a.T} AND d.total_runs = 0 AND ${LEGAL} THEN 1 ELSE 0 END) * 100.0 / SUM(CASE WHEN i.batting_team_id IN ${a.T} AND ${LEGAL} THEN 1 ELSE 0 END) team,
        SUM(CASE WHEN d.total_runs = 0 AND ${LEGAL} THEN 1 ELSE 0 END) * 100.0 / SUM(CASE WHEN ${LEGAL} THEN 1 ELSE 0 END) league,
        SUM(CASE WHEN i.batting_team_id IN ${a.T} AND ${LEGAL} THEN 1 ELSE 0 END) balls
      FROM deliveries d JOIN innings i ON i.innings_id = d.innings_id JOIN matches m ON m.match_id = d.match_id WHERE ${REGULATION} GROUP BY year HAVING balls > 0 ORDER BY year`;
    const rs = a.rows<{ year: number; team: number; league: number; balls: number }>(sql);
    a.table("dot-series", `Dot-ball rate by season: ${a.code} batting vs IPL`, "Legal balls with no run of any kind", rs.reduce((x, r) => x + r.balls, 0), `${a.code} legal balls`, sql, rs.map((r) => ({ season: String(r.year), team: dp(r.team), league: dp(r.league) })));
    const winSql = `WITH inn AS (SELECT i.innings_id, i.batting_team_id bt, i.match_id, SUM(CASE WHEN d.total_runs = 0 AND ${LEGAL} THEN 1 ELSE 0 END) * 1.0 / SUM(CASE WHEN ${LEGAL} THEN 1 ELSE 0 END) dots
        FROM innings i JOIN deliveries d ON d.innings_id = i.innings_id WHERE ${REGULATION} GROUP BY i.innings_id HAVING SUM(CASE WHEN ${LEGAL} THEN 1 ELSE 0 END) >= 60)
      SELECT CASE WHEN dots < 0.30 THEN 'under 30%' WHEN dots < 0.36 THEN '30–36%' WHEN dots < 0.42 THEN '36–42%' ELSE '42% or more' END band, COUNT(*) n, SUM(CASE WHEN m.winner_id = inn.bt THEN 1 ELSE 0 END) won
      FROM inn JOIN matches m ON m.match_id = inn.match_id WHERE m.winner_id IS NOT NULL GROUP BY band`;
    const wb = a.rows<{ band: string; n: number; won: number }>(winSql);
    const order = ["under 30%", "30–36%", "36–42%", "42% or more"];
    const wrows = order.map((b) => wb.find((r) => r.band === b)!).filter(Boolean);
    a.table("dot-win", "Win rate by dot-ball share of an innings", "IPL innings with a result and at least ten overs batted", wrows.reduce((x, r) => x + r.n, 0), "innings", winSql, wrows.map((r) => ({ band: r.band, winPct: dp((r.won / r.n) * 100) })));
    const w = (from: number, to: number, k: "team" | "league") => { const xs = rs.filter((r) => r.year >= from && r.year <= to); return xs.reduce((x, r) => x + r[k] * r.balls, 0) / xs.reduce((x, r) => x + r.balls, 0); };
    const t2 = w(2024, 2026, "team"), l2 = w(2024, 2026, "league");
    const tok = {
      t2: a.pct("dot-t2", t2, `${a.code} dot-ball rate batting, 2024–2026`, { filters: "Legal balls", n: rs.filter((r) => r.year >= 2024).reduce((x, r) => x + r.balls, 0), nUnit: "balls", sql, check: range(t2, 15, 60, "dot rate") }),
      l2: a.pct("dot-l2", l2, "IPL dot-ball rate, 2024–2026", { filters: "Legal balls, weighted by the franchise's balls per season", n: 3, nUnit: "seasons", sql, check: range(l2, 15, 60, "dot rate") }),
      wLow: a.pct("dot-wlow", (wrows[0].won / wrows[0].n) * 100, "IPL win rate for innings with under 30% dot balls", { filters: "Innings with a result", n: wrows[0].n, nUnit: "innings", sql: winSql, check: floor(wrows[0].n, 50, "innings") }),
      wHigh: a.pct("dot-whigh", (wrows[wrows.length - 1].won / wrows[wrows.length - 1].n) * 100, "IPL win rate for innings with 42% or more dot balls", { filters: "Innings with a result", n: wrows[wrows.length - 1].n, nUnit: "innings", sql: winSql, check: floor(wrows[wrows.length - 1].n, 50, "innings") }),
      cost: a.num("dot-cost", Math.abs(t2 - l2) / 100 * 120, `Difference in dot balls per ${a.code} innings against the league rate, 2024–2026`, { unit: "balls per innings", filters: "Absolute difference in dot rate × 120 balls", n: 3, nUnit: "seasons", sql, check: derived() }, 1),
    };
    const more = t2 > l2;
    return {
      dek: `Every quiet ball is a debt the rest of the innings has to repay. How much does ${a.poss} dot-ball rate cost, and how does it compare with the league?`,
      excerpt: `Since 2024 ${a.name} have played ${more ? "more" : "fewer"} dot balls than the league average. Across the IPL, innings with fewer dots win markedly more often.`,
      keyTakeaways: [
        `${a.code} played dot balls on ${tok.t2} of legal deliveries since 2024; the league rate is ${tok.l2}.`,
        `IPL innings with under 30% dot balls won ${tok.wLow} of the time; with 42% or more, ${tok.wHigh}.`,
        `The difference from the league rate is ${tok.cost} dot balls per innings, ${more ? "more" : "fewer"} than average.`,
      ],
      sections: [
        { heading: "The Hidden Cost of a Quiet Over", body: [
          `A dot ball does not show up in a highlights package, but it shows up in the scorebook. Each one has to be repaid later at a higher risk, usually by a batter swinging at a ball he would rather have nudged for one.`,
          `Since 2024 ${a.name} have played dot balls on ${tok.t2} of legal deliveries, against ${tok.l2} for the league. That is ${tok.cost} balls per innings ${more ? "more" : "fewer"} than average.`,
          extremes(a, "dot-x", rs.map((r) => ({ year: r.year, team: r.team })), "dot-ball rate", "% of legal balls", false, 1, sql, ["most efficient", "most dot-heavy"]),
        ].filter(Boolean), chartIds: ["dot-trend"] },
        { heading: "What Dots Do to Results", body: [
          `Across every IPL innings with a result and at least ten overs batted, those with fewer than 30% dot balls won ${tok.wLow} of the time; those with 42% or more won ${tok.wHigh}.`,
          `The relationship runs both ways, since a side under pressure plays more dots, but the size of the gap shows how much a scoring-every-ball approach is worth.`,
        ], chartIds: ["dot-win"] },
        { heading: "Pricing the Quiet Over", body: [
          `For ${a.code}, the practical measure is dot rate in the middle overs, where fields spread and singles are available. A batter who turns two dots an over into singles adds runs without adding risk.`,
          `That is why strike rotation deserves a place on the scouting sheet alongside boundary hitting.`,
        ] },
        { heading: "Some Dots Are Worth Playing", body: [
          `Not every dot ball is a mistake. Against an elite death bowler or on a slow pitch, blocking a good ball can be the right decision, and a raw dot rate cannot tell the difference.`,
          `{{hyp:quality}}`,
        ] },
        { heading: "CricField Verdict: Pay Down the Debt Early", body: [
          `${a.name} ${more ? "carry more dot-ball debt than the league" : "carry less dot-ball debt than the league"}. The aim should be to reduce dots in the middle overs, where it costs least risk to do so.`,
          `Tracking dot rate by phase each season would show whether the side's approach is changing.`,
        ] },
      ],
      charts: [
        { id: "dot-trend", type: "line", title: "Dot-ball rate by season", subtitle: `${a.code} batting vs IPL`, table: "dot-series", xKey: "season", series: [{ key: "team", label: a.code }, { key: "league", label: "IPL" }], xLabel: "Season", unit: "% of legal balls", takeaway: `${a.code} have played ${more ? "more" : "fewer"} dot balls than the league since 2024.`, ariaLabel: `Line chart of dot-ball rate by season for ${a.code} batting and the IPL.` },
        { id: "dot-win", type: "column", title: "Win rate by dot-ball share of an innings", subtitle: "IPL innings with a result, at least ten overs", table: "dot-win", xKey: "band", series: [{ key: "winPct", label: "Win rate" }], xLabel: "Share of legal balls that were dots", unit: "% of innings won", takeaway: "Innings with fewer dot balls win more often.", ariaLabel: "Column chart of win rate grouped by the share of dot balls in an innings." },
      ],
      literalNumbers: [{ text: "30", reason: "Band threshold (30% dot balls)." }, { text: "42", reason: "Band threshold (42% dot balls)." }],
      hypotheses: [hyp("quality", "a share of dot balls reflects good bowling rather than passive batting, so dot rate overstates the batting cost.", "Ball quality is not recorded; length labels exist for only part of the data.", "Compare dot rates against labelled good-length deliveries with dot rates against other lengths.")],
      players: [],
      seasons: [yearsLabel(a.c.firstYear, 2026), "2024–2026"],
      hero: { narrative: `${a.name} rotating the strike.`, wanted: `${a.name} batters running between the wickets.`, query: `${a.name} batting` },
      related: [3, 4, 82],
      seo: { metaTitle: metaTitle(`Dot-ball debt: what quiet overs cost ${a.code}`), metaDescription: metaDesc(`${a.poss} dot-ball rate against the IPL, and how much dot-heavy innings cost in win rate across the league.`) },
      methodology: `${METHOD_BASE} A dot ball is a legal delivery with no run of any kind. Innings bands use innings of at least ten overs from matches with a result.`,
    };
  },
};

// ── 10. The 200-Run Question ──────────────────────────────────────────────────
const s10: SlotSpec = {
  n: 10,
  storyType: "investigation",
  build(a) {
    const sql = `SELECT ${YEAR()} year, SUM(CASE WHEN i.batting_team_id IN ${a.T} AND i.runs >= 200 THEN 1 ELSE 0 END) t200, SUM(CASE WHEN i.batting_team_id IN ${a.T} THEN 1 ELSE 0 END) tn,
        SUM(CASE WHEN i.runs >= 200 THEN 1 ELSE 0 END) * 1.0 / COUNT(*) lshare
      FROM innings i JOIN matches m ON m.match_id = i.match_id WHERE ${REGULATION} GROUP BY year ORDER BY year`;
    const rs = a.rows<{ year: number; t200: number; tn: number; lshare: number }>(sql).filter((r) => r.tn > 0);
    a.table("t200-series", `Share of innings reaching 200: ${a.code} vs IPL`, "Regulation innings", rs.reduce((x, r) => x + r.tn, 0), `${a.code} innings`, sql, rs.map((r) => ({ season: String(r.year), team: dp((r.t200 / r.tn) * 100), league: dp(r.lshare * 100) })));
    const tot = rs.reduce((x, r) => ({ t: x.t + r.t200, n: x.n + r.tn }), { t: 0, n: 0 });
    const rec = rs.filter((r) => r.year >= 2024).reduce((x, r) => ({ t: x.t + r.t200, n: x.n + r.tn }), { t: 0, n: 0 });
    const early = rs.filter((r) => r.year < 2024).reduce((x, r) => ({ t: x.t + r.t200, n: x.n + r.tn }), { t: 0, n: 0 });
    const rising = early.n ? rec.t / Math.max(1, rec.n) > early.t / early.n : true;
    const lgShareSql = `SELECT SUM(CASE WHEN ${YEAR()} < 2024 AND i.runs >= 200 THEN 1 ELSE 0 END) * 100.0 / SUM(CASE WHEN ${YEAR()} < 2024 THEN 1 ELSE 0 END) e1, SUM(CASE WHEN ${YEAR()} >= 2024 AND i.runs >= 200 THEN 1 ELSE 0 END) * 100.0 / SUM(CASE WHEN ${YEAR()} >= 2024 THEN 1 ELSE 0 END) e2, COUNT(*) n FROM innings i JOIN matches m ON m.match_id = i.match_id WHERE ${REGULATION}`;
    const lgShare = a.one<{ e1: number; e2: number; n: number }>(lgShareSql);
    const lgE1 = a.pct("t200-lg-e1", lgShare.e1, "Share of IPL innings reaching 200, 2008–2023", { filters: "All regulation innings", n: lgShare.n, nUnit: "innings", sql: lgShareSql, check: range(lgShare.e1, 0, 100, "share") });
    const lgE2 = a.pct("t200-lg-e2", lgShare.e2, "Share of IPL innings reaching 200, 2024–2026", { filters: "All regulation innings", n: lgShare.n, nUnit: "innings", sql: lgShareSql, check: range(lgShare.e2, 0, 100, "share") });
    const winSql = `SELECT CASE WHEN m.venue_id IN ${a.c.homeSql} THEN 'home' ELSE 'away' END loc, COUNT(*) n, SUM(CASE WHEN m.winner_id = i.batting_team_id THEN 1 ELSE 0 END) won
      FROM innings i JOIN matches m ON m.match_id = i.match_id WHERE i.innings_number = 1 AND i.runs >= 200 AND i.batting_team_id IN ${a.T} AND m.winner_id IS NOT NULL GROUP BY loc`;
    const wr = a.rows<{ loc: string; n: number; won: number }>(winSql);
    const wAll = wr.reduce((x, r) => ({ n: x.n + r.n, w: x.w + r.won }), { n: 0, w: 0 });
    const lgSql = `SELECT COUNT(*) n, SUM(CASE WHEN m.winner_id = i.batting_team_id THEN 1 ELSE 0 END) won FROM innings i JOIN matches m ON m.match_id = i.match_id WHERE i.innings_number = 1 AND i.runs >= 200 AND m.winner_id IS NOT NULL`;
    const lg = a.one<{ n: number; won: number }>(lgSql);
    const tok = {
      all: a.int("t200-all", tot.t, `${a.code} totals of 200 or more`, { filters: "Regulation innings, both innings", n: tot.n, nUnit: "innings", sql, check: derived("count") }),
      rec: a.int("t200-rec", rec.t, `${a.code} totals of 200 or more since 2024`, { filters: "2024–2026", n: rec.n, nUnit: "innings", sql, check: derived("count") }),
      recShare: a.pct("t200-recshare", rec.n ? (rec.t / rec.n) * 100 : 0, `Share of ${a.code} innings reaching 200 since 2024`, { filters: "2024–2026", n: rec.n, nUnit: "innings", sql, check: floor(rec.n, 20, "innings") }, 0),
      lgWin: a.pct("t200-lgwin", (lg.won / lg.n) * 100, "IPL win rate when posting 200 or more batting first", { filters: "First innings of 200+", n: lg.n, nUnit: "matches", sql: lgSql, check: floor(lg.n, 50, "matches") }),
      tWin: wAll.n >= 5 ? a.pct("t200-twin", (wAll.w / wAll.n) * 100, `${a.code} win rate when posting 200 or more batting first`, { filters: "First innings of 200+", n: wAll.n, nUnit: "matches", sql: winSql, check: floor(wAll.n, 5, "matches") }) : null,
      tWinN: a.int("t200-twinn", wAll.n, `${a.code} first-innings totals of 200 or more`, { filters: "Matches with a result", n: wAll.n, nUnit: "matches", sql: winSql, check: derived("count") }),
    };
    const home = wr.find((r) => r.loc === "home"), away = wr.find((r) => r.loc === "away");
    a.table("t200-where", `${a.code} first-innings totals of 200+: home vs away`, "Matches with a result", wAll.n, "matches", winSql, [
      { where: "Home", totals: home?.n ?? 0, winPct: home && home.n ? dp((home.won / home.n) * 100) : null },
      { where: "Away", totals: away?.n ?? 0, winPct: away && away.n ? dp((away.won / away.n) * 100) : null },
    ]);
    return {
      dek: `Two hundred used to be a winning total. Which conditions make ${a.name} a high-scoring side, and how safe is a big total now?`,
      excerpt: `${a.name} have reached 200 ${rising ? "more" : "less"} often since 2024 than before it. Across the league, a 200-plus total batting first still usually wins, but it is no longer a guarantee.`,
      keyTakeaways: [
        `${a.code} have posted ${tok.all} totals of 200 or more, ${tok.rec} of them since 2024.`,
        `${tok.recShare} of ${a.poss} innings since 2024 have reached 200.`,
        tok.tWin ? `Batting first, ${a.code} have won ${tok.tWin} of matches in which they made 200 or more; the league figure is ${tok.lgWin}.` : `Across the league, sides posting 200 or more batting first have won ${tok.lgWin} of the time.`,
      ],
      sections: [
        { heading: "When Two Hundred Became Normal", body: [
          `For most of IPL history a score of 200 was a statement. Across the league, ${lgE1} of innings reached it between 2008 and 2023; since 2024 the figure is ${lgE2}. The question for ${a.name} is when and where they get there.`,
          `${a.code} have posted ${tok.all} totals of 200 or more in all, ${tok.rec} of them since 2024. In that recent window ${tok.recShare} of their innings reached the mark.`,
        ], chartIds: ["t200-trend"] },
        { heading: "Is Two Hundred Still Safe?", body: [
          `Across the league, sides that posted 200 or more batting first won ${tok.lgWin} of the time.`,
          tok.tWin ? `${a.name} have won ${tok.tWin} of their ${tok.tWinN} such matches. The home-and-away split shows where those totals came from.` : `${a.name} have made too few first-innings totals of 200 to judge how safely they defend them.`,
        ], chartIds: ["t200-where"] },
        { heading: "Conditions That Produce Big Totals", body: [
          `Big totals cluster at certain grounds and in certain seasons, so the home venue matters. The split between home and away 200-plus totals shows how much of ${a.poss} high scoring depends on familiar conditions.`,
          `A side that posts big totals only at home has a venue advantage, not necessarily a batting one.`,
        ] },
        { heading: "Big Totals Can Hide Bowling Problems", body: [
          `A team that regularly needs 200 to win is also a team that concedes a lot. The high-scoring identity can mask a bowling attack that would lose more often at par totals.`,
          `{{hyp:mask}}`,
        ] },
        { heading: "CricField Verdict: Plan for Two Hundred, Defend One-Eighty", body: [
          `${a.name} should treat 200 as a realistic target in good conditions, not a safety margin. The league data says it still wins most of the time, but not often enough to relax.`,
          `The more useful planning number is the total the bowling can defend on a normal day, which the defending-totals analysis in this series addresses.`,
        ] },
      ],
      charts: [
        { id: "t200-trend", type: "line", title: "Share of innings reaching 200", subtitle: `${a.code} vs IPL, by season`, table: "t200-series", xKey: "season", series: [{ key: "team", label: a.code }, { key: "league", label: "IPL" }], xLabel: "Season", unit: "% of innings", takeaway: "Two-hundred-run innings have become far more common across the league.", ariaLabel: `Line chart of the share of innings reaching two hundred by season for ${a.code} and the IPL.` },
        { id: "t200-where", type: "column", title: "First-innings totals of 200+: home vs away", subtitle: "Matches with a result", table: "t200-where", xKey: "where", series: [{ key: "totals", label: "Totals of 200+" }], xLabel: "Venue", unit: "matches", takeaway: "The split shows how much big scoring depends on the home ground.", ariaLabel: "Column chart of first-innings totals of two hundred or more at home and away." },
      ],
      literalNumbers: [{ text: "200", reason: "The 200-run threshold named in the title." }],
      hypotheses: [hyp("mask", `${a.poss} high-scoring seasons coincide with weaker bowling seasons.`, "The correlation between season scoring and season economy has not been tested.", "Correlate season run rate with season economy for the franchise and the league.")],
      players: [],
      seasons: [yearsLabel(a.c.firstYear, 2026), "2024–2026"],
      hero: { narrative: `${a.name} posting a big total.`, wanted: `${a.name} batter celebrating a big innings.`, query: `${a.name} fifty celebrates` },
      related: [25, 3, 6],
      seo: { metaTitle: metaTitle(`The 200-run question: when do ${a.code} score big?`), metaDescription: metaDesc(`How often ${a.name} pass 200, where they do it, and how safely a 200-plus total wins in the IPL.`) },
      methodology: `${METHOD_BASE} Totals include both innings for frequency; win rates use first-innings totals from matches with a result.`,
    };
  },
};

export const BATTING: SlotSpec[] = [s1, s2, s3, s4, s5, s6, s7, s8, s9, s10];
void BOWLER_RUNS, cmp;
