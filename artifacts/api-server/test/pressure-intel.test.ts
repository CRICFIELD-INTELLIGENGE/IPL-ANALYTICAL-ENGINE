// Pressure Intelligence engine (browser module) on hand-made balls.
import { test } from "node:test";
import assert from "node:assert/strict";
import { COLUMNS, FLAG, type Balls } from "../../ipl-analytics/src/lib/pressure-intel/format";
import { aggregate, compile, prepare, score, spearman, type Meta } from "../../ipl-analytics/src/lib/pressure-intel/engine";
import { decodeQuery, encodeQuery, parseQuery, queryKey, type Query } from "../../ipl-analytics/src/lib/pressure-intel/query";

type B = Partial<Record<(typeof COLUMNS)[number][0], number>>;
const LEGAL_FACED = FLAG.legal | FLAG.faced;
function ds(comp: string, balls: B[], nMatches: number, players = [["a", "A", "pace", "right"], ["b", "B", "spin", "left"], ["c", "C", "pace", "left"]] as Meta["players"]) {
  const b = { n: balls.length } as Balls;
  for (const [name, type] of COLUMNS) {
    const def = name === "inn" ? 1 : name === "flags" ? LEGAL_FACED : name === "pos" ? 1 : 0;
    b[name] = (type === "u16" ? Uint16Array : Uint8Array).from(balls.map(x => x[name] ?? def));
  }
  const meta: Meta = { comp, balls: balls.length, seasons: ["2024"], matches: Array.from({ length: nMatches }, () => [0, 0, "2024-04-01"]), players };
  return prepare(meta, b);
}
const q = (over: Partial<Query>): Query => ({ comps: ["x"], years: null, discipline: "bat", where: { op: "and", items: [] }, method: "standard", minBalls: 1, minMatches: 2, ...over });
const P = { wicket: 0, lambdaH: 0, lambdaN: 0, alpha: 0, beta: 0 };

test("expectations leave the evaluated match out", () => {
  // 40 matches × 1 ball in the same cell: one 6, the rest 0s. The 6-ball's own expectation must exclude its 6.
  const balls: B[] = Array.from({ length: 40 }, (_, m) => ({ match: m, runsBat: m === 0 ? 6 : 0 }));
  const d = ds("x", balls, 40);
  assert.equal(d.exp.eRun[0], 0);
  assert.ok(Math.abs(d.exp.eRun[1] - 6 / 39) < 1e-6);
});

test("wides: not a ball faced, but conceded by the bowler; byes are never charged", () => {
  const balls: B[] = [
    { match: 0, batter: 0, bowler: 1, conceded: 1, runsBat: 0, flags: 0 },        // wide
    { match: 0, batter: 0, bowler: 1, conceded: 4, runsBat: 4 },                  // four
    { match: 1, batter: 0, bowler: 1, conceded: 0, runsBat: 0 },                  // dot (byes would also be 0 conceded)
  ];
  const d = ds("x", balls, 2);
  const bat = aggregate([d], q({}), 0).players.get("a")!;
  assert.equal(bat.H.n, 2);
  const bowl = aggregate([d], q({ discipline: "bowl" }), 0).players.get("b")!;
  assert.deepEqual([bowl.H.n, bowl.H.legal, bowl.H.runs, bowl.H.dots], [3, 2, 5, 1]);
});

test("run-outs dismiss the striker but are not bowler wickets", () => {
  const d = ds("x", [{ match: 0, batter: 0, bowler: 1, flags: LEGAL_FACED | FLAG.strikerOut }, { match: 1, batter: 0, bowler: 1 }], 2);
  assert.equal(aggregate([d], q({}), 0).players.get("a")!.H.outs, 1);
  assert.equal(aggregate([d], q({ discipline: "bowl" }), 0).players.get("b")!.H.outs, 0);
});

test("OR counts an overlapping ball once; AND intersects; state is pre-ball", () => {
  const balls: B[] = [
    { match: 0, over: 17, inn: 2, target: 180, runsBefore: 150, ballsLeft: 18 }, // death + rrr exactly 10
    { match: 0, over: 17, inn: 2, target: 180, runsBefore: 160, ballsLeft: 18 }, // death, rrr 6.67
    { match: 1, over: 3, inn: 2, target: 200, runsBefore: 20, ballsLeft: 96 },   // rrr 11.25, powerplay
    { match: 1, over: 3, inn: 1 },
  ];
  const d = ds("x", balls, 2);
  const or = compile({ op: "or", items: [{ k: "phase", v: "death" }, { k: "rrr", min: 10 }] }, d);
  const and = compile({ op: "and", items: [{ k: "phase", v: "death" }, { k: "rrr", min: 10 }] }, d);
  assert.deepEqual([0, 1, 2, 3].map(or), [true, true, true, false]);
  assert.deepEqual([0, 1, 2, 3].map(and), [true, false, false, false]);
  const a = aggregate([d], q({ where: { op: "or", items: [{ k: "phase", v: "death" }, { k: "rrr", min: 10 }] } }), 0);
  assert.equal(a.situation.events, 3);
  // Won chases (nothing needed) never match a required-rate condition.
  const won = ds("x", [{ inn: 2, target: 100, runsBefore: 100, ballsLeft: 10 }], 1);
  assert.equal(compile({ op: "and", items: [{ k: "rrr", max: 36 }] }, won)(0), false);
});

test("league-relative: average players in two differently-scoring leagues both sit at 0", () => {
  const mk = (comp: string, r: number) => ds(comp, Array.from({ length: 200 }, (_, i) => ({ match: i % 20, batter: i % 2, runsBat: r })), 20);
  const a = aggregate([mk("x", 1), mk("y", 2)], q({ comps: ["x", "y"] }), 8);
  const { rows } = score(a, P, 1, 2, true);
  for (const r of rows) assert.ok(Math.abs(r.A) < 1e-9, `${r.name} ${r.A}`);
});

test("score: shrinkage, lift, clustered SE, thresholds and determinism", () => {
  const balls: B[] = [];
  for (let m = 0; m < 10; m++) for (let k = 0; k < 6; k++) {
    balls.push({ match: m, batter: 0, over: 17, runsBat: 2 }); // A: death 2s
    balls.push({ match: m, batter: 1, over: 17, runsBat: m % 2 ? 0 : 1 });
    balls.push({ match: m, batter: 0, over: 2, runsBat: 1 });
  }
  const d = ds("x", balls, 10);
  const agg = aggregate([d], q({ where: { op: "and", items: [{ k: "phase", v: "death" }] } }), 0);
  const raw = score(agg, P, 1, 2, true).rows;
  const shrunk = score(agg, { ...P, lambdaH: 60 }, 1, 2, true).rows;
  const A = raw.find(r => r.name === "A")!, As = shrunk.find(r => r.name === "A")!;
  assert.ok(A.A > 0 && Math.abs(As.A - A.A * (60 / 120)) < 1e-9);
  assert.ok(A.lift > 0, "A beats their own ordinary balls under pressure");
  // A scores the same every match (spread only from leave-match-out expectations); B alternates 0s and 1s.
  assert.ok(A.se < raw.find(r => r.name === "B")!.se / 3, "steady player has far less match-to-match spread");
  assert.equal(score(agg, P, 61, 2, true).rows.length, 0);
  assert.equal(score(agg, P, 1, 11, true).excluded, 2);
  assert.deepEqual(score(agg, P, 1, 2, true).rows.map(r => r.id), raw.map(r => r.id));
});

test("query: validation, contradictions, canonical keys and URL round trip", () => {
  const ok = parseQuery({ comps: ["t20i", "ipl", "ipl"], years: [2026, 2022], where: { op: "and", items: [{ k: "rrr", min: 10 }, { k: "innings", v: 2 }] } }, ["ipl", "t20i"]);
  assert.ok("query" in ok);
  const same = parseQuery({ comps: ["ipl", "t20i"], years: [2022, 2026], where: { op: "and", items: [{ k: "innings", v: 2 }, { k: "rrr", min: 10 }] } }, ["ipl", "t20i"]);
  assert.ok("query" in same && queryKey(ok.query) === queryKey(same.query));
  assert.deepEqual(ok.query.years, [2022, 2026]);
  assert.deepEqual(parseQuery(decodeQuery(encodeQuery(ok.query)), ["ipl", "t20i"]), ok);
  const bad = (x: unknown) => { const r = parseQuery(x, ["ipl"]); assert.ok("error" in r, JSON.stringify(x)); return r.error; };
  assert.match(bad({ comps: ["ipl"], where: { op: "and", items: [{ k: "innings", v: 1 }, { k: "rrr", min: 8 }] } }), /chase/);
  assert.match(bad({ comps: ["ipl"], where: { op: "and", items: [{ k: "phase", v: "death" }, { k: "phase", v: "powerplay" }] } }), /OR/);
  bad({ comps: ["nope"] });
  bad({ comps: ["ipl"], where: { op: "and", items: [{ k: "over", min: 18, max: 12 }] } });
  bad({ comps: ["ipl"], where: { op: "and", items: [{ k: "venue", v: 1 }] } });
  assert.ok("query" in parseQuery({ comps: ["ipl"], where: { op: "or", items: [{ k: "phase", v: "death" }, { k: "phase", v: "powerplay" }] } }, ["ipl"]));
});

test("query: empty groups are dropped, single-item groups dissolved, duplicates removed", () => {
  const r = parseQuery({ comps: ["ipl"], where: { op: "and", items: [
    { k: "rrr", min: 10 }, { op: "or", items: [] }, { op: "or", items: [{ k: "phase", v: "death" }] }, { k: "rrr", min: 10 },
  ] } }, ["ipl"]);
  assert.ok("query" in r);
  assert.deepEqual(r.query.where, { op: "and", items: [{ k: "phase", v: "death" }, { k: "rrr", min: 10 }] });
});

test("spearman", () => {
  assert.equal(spearman([1, 2, 3], [10, 20, 30]), 1);
  assert.equal(spearman([1, 2, 3], [3, 2, 1]), -1);
});
