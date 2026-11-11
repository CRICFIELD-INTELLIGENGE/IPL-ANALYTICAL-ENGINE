import { fileURLToPath } from "node:url";
process.chdir(fileURLToPath(new URL("..", import.meta.url)));
import ts from "typescript";
import fs from "node:fs";
import assert from "node:assert/strict";
const src = fs.readFileSync(
  "artifacts/ipl-analytics/src/lib/ipl-2027.ts",
  "utf8",
);
const js = ts.transpileModule(src, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
}).outputText;
const m = await import(
  "data:text/javascript;base64," + Buffer.from(js).toString("base64")
);
const read = (f) =>
  JSON.parse(
    fs.readFileSync(`artifacts/ipl-analytics/public/data/${f}.json`, "utf8"),
  );
const squads = read("squads-by-season"),
  official = read("official-squads"),
  bios = read("player-bio"),
  stats = read("player-season-stats");
const names = {
  CSK: "Chennai Super Kings",
  MI: "Mumbai Indians",
  RCB: "Royal Challengers Bengaluru",
  KKR: "Kolkata Knight Riders",
  SRH: "Sunrisers Hyderabad",
  RR: "Rajasthan Royals",
  DC: "Delhi Capitals",
  PBKS: "Punjab Kings",
  GT: "Gujarat Titans",
  LSG: "Lucknow Super Giants",
};
const all = m.HUB_TEAMS.flatMap((t) =>
  m.buildRoster(names[t], squads, official, bios),
);
const coverage = [];
for (const t of m.HUB_TEAMS) {
  const roster = m.buildRoster(names[t], squads, official, bios);
  assert.ok(roster.length > 0, t);
  assert.equal(new Set(roster.map((p) => p.id)).size, roster.length);
  const gap = m.squadGaps(roster);
  assert.equal(
    gap.reduce((s, g) => s + g.count, 0),
    roster.filter((p) => p.role !== "unknown").length,
  );
  const p = roster[0],
    model = m.retentionModel(p, roster, stats, all);
  assert.ok(model.score === null || (model.score >= 0 && model.score <= 100));
  const raw = JSON.stringify({
    version: 1,
    team: t,
    savedAt: "2026-10-27T00:00:00Z",
    decisions: { [p.id]: "release", fake: "retain" },
  });
  const saved = m.parseScenario(raw, t, roster);
  assert.equal(saved.decisions[p.id], "release");
  assert.ok(!saved.decisions.fake);
  assert.equal(m.parseScenario(raw, t === "MI" ? "CSK" : "MI", roster), null);
  assert.equal(m.parseScenario("{broken", t, roster), null);
  const active = roster.filter((r) => saved.decisions[r.id] !== "release");
  assert.equal(active.length, roster.length - 1);
  const originalCount = m
    .squadGaps(roster)
    .find((g) => g.role === p.role)?.count;
  if (originalCount !== undefined)
    assert.equal(
      m.squadGaps(active).find((g) => g.role === p.role).count,
      originalCount - 1,
    );
  assert.equal(
    m.retentionModel(p, roster, { batters: [], bowlers: [] }, all).score,
    null,
  );
  assert.equal(
    m.retentionModel(p, roster, stats, all, {
      ...m.DEFAULT_MODEL,
      performance: 0,
      consistency: 0,
      scarcity: 0,
      replacement: 0,
    }).score,
    null,
  );
  const matched = roster.filter((p) => {
    const h = m.playerHistory(p, stats);
    return h.batting.length || h.bowling.length;
  }).length;
  assert.ok(matched > 0, `${t} must have matched performance history`);
  coverage.push({
    team: t,
    listed: roster.length,
    matchedHistory: matched,
    unknownCountry: roster.filter((p) => p.overseas === null).length,
  });
}
const kohli=all.find(p=>p.name==='Virat Kohli');
assert.ok(kohli);
assert.notEqual(m.retentionModel(kohli,all.filter(p=>p.id===kohli.id),stats,all).score,null,'known qualifying player must produce a score');
assert.deepEqual(m.buildRoster("Missing", {}, undefined, {}), []);
assert.ok(m.HUB_EVENTS.every((e) => e.status !== "confirmed"));
assert.ok(
  m.HUB_EVENTS.filter((e) => e.date).every(
    (e) => e.sourceUrl && e.lastVerified,
  ),
);
fs.mkdirSync("docs/ipl-2027", { recursive: true });
fs.writeFileSync(
  "docs/ipl-2027/coverage.json",
  JSON.stringify(coverage, null, 2),
);
console.log(
  "Passed: all ten rosters, identity uniqueness, role counts, release calculations, validated save/reload, corrupt/cross-team data, missing performance, zero weights, empty rosters and event provenance.",
);
console.table(coverage);
