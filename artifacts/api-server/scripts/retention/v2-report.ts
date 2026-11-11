// Retention Engine V2 validation report: old vs new categories, sensitivity, the MI case
// studies, every franchise, the trade source audit and data defects. Reads the published
// snapshot and computes nothing new.
//
//   node --import tsx scripts/retention/v2-report.ts   → docs/retention-room/v2-report.json

import fs from "node:fs";
import path from "node:path";
import { getProjectRoot } from "../../src/services/decision/db";
import { TEAMS } from "../../src/services/intelligence/schema";
import { CATEGORIES } from "../../src/services/retention/crr";
import { ledgerAudit } from "../../src/services/retention/ledger";
import { allPicks, methodOf } from "../../src/services/retention/service";

const a = allPicks();
if (!a) throw new Error("No snapshot or live season.");
const { picks, snapshot: s } = a;
const count = <T,>(xs: T[], key: (x: T) => string) => xs.reduce<Record<string, number>>((m, x) => { m[key(x)] = (m[key(x)] ?? 0) + 1; return m; }, {});
const brief = (p: (typeof picks)[number]) => ({
  name: p.name, team: p.team, role: p.granularRole, crr: p.index, tier: p.category, cappedFrom: p.cappedFrom, confidence: p.confidence, coverage: p.coverage,
  components: Object.fromEntries(p.metrics.map((m) => [m.key, m.fraction])), previous: p.previous, stability: p.sensitivity.tierStability, range: p.sensitivity.range,
});

const MI_CASES = ["JJ Bumrah", "HH Pandya", "RG Sharma", "Tilak Varma", "SA Yadav", "TA Boult"];
const report = {
  generatedFrom: { modelVersion: s.version, dataCutoff: s.dataCutoff, crr: "crr-2.0", previous: "rri-1.0" },
  method: methodOf(s),
  distribution: { crr: count(picks, (p) => p.category), previous: count(picks, (p) => p.previous?.category ?? "none"), order: CATEGORIES },
  transitions: count(picks, (p) => `${p.previous?.category ?? "none"} → ${p.category}`),
  biggestMoves: [...picks].filter((p) => p.previous).sort((x, y) => Math.abs(y.index - y.previous!.index) - Math.abs(x.index - x.previous!.index)).slice(0, 15).map((p) => ({ ...brief(p), change: Math.round((p.index - p.previous!.index) * 10) / 10 })),
  sensitivity: {
    meanTierStability: Math.round((picks.reduce((t, p) => t + p.sensitivity.tierStability, 0) / picks.length) * 100) / 100,
    unstable: picks.filter((p) => p.sensitivity.tierStability < 0.5 && p.category !== "Insufficient Evidence").map((p) => ({ name: p.name, team: p.team, crr: p.index, tier: p.category, byWeights: p.sensitivity.byWeights })),
  },
  confidence: count(picks, (p) => p.confidence),
  capped: picks.filter((p) => p.cappedFrom).map(brief),
  miCaseStudies: MI_CASES.map((n) => { const p = picks.find((x) => x.name === n); return p ? { ...brief(p), evidence: p.metrics.map((m) => `${m.label}: ${m.evidence}`), scenarios: p.scenarios, limitations: p.limitations } : { name: n, missing: true }; }),
  franchises: Object.fromEntries(TEAMS.map((t) => { const rows = picks.filter((p) => p.team === t); return [t, { squad: rows.length, tiers: count(rows, (p) => p.category), top: rows.slice(0, 6).map(brief), releaseCandidates: rows.filter((p) => p.category === "Release Candidate").map((p) => p.name) }]; })),
  tradeAudit: { ...ledgerAudit(), appliedInSnapshot: s.transactionsApplied ?? [] },
  dataDefects: {
    squadPlayersWithoutContract: (s as { squadPlayersWithoutContract?: unknown }).squadPlayersWithoutContract ?? [],
    unknownNationality: s.players.filter((p) => p.team && p.overseas === null).map((p) => p.name),
    missingSalary: picks.filter((p) => !p.contractLakh).length,
    missingBirthDate: picks.filter((p) => p.horizon.age === null).length,
  },
};

const out = path.join(getProjectRoot(), "docs", "retention-room", "v2-report.json");
fs.writeFileSync(out, JSON.stringify(report, null, 1) + "\n");
console.log(`Wrote ${out}`);
console.log(JSON.stringify({ distribution: report.distribution.crr, confidence: report.confidence, stability: report.sensitivity.meanTierStability, capped: report.capped.length, defects: report.dataDefects }, null, 1));
