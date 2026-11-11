// Shared helpers for article evidence generators.
// Every metric records the SQL that produced it, the filters in words, the sample size and a
// validation step, so a reader (or the validator) can trace any number in an article to its query.

import { DatabaseSync } from "node:sqlite";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { evidenceFileSchema, type EvidenceFile, type EvidenceMetric, type EvidenceTable } from "../../../src/data/editorial/schema";

export const APP = resolve(import.meta.dirname, "../../..");
export const ROOT = resolve(APP, "../..");
export const DB_FILE = resolve(ROOT, "sqlite.db");
export const SQUADS_FILE = resolve(ROOT, "artifacts/api-server/data/squads-by-season.json");

/** Team ids for the franchise across its two registered names. */
export const RCB_IDS = "(2,15)";

/** Cricsheet season ids → IPL edition year (2007/08 → 2008, 2009/10 → 2010, 2020/21 → 2020). */
export const YEAR = (alias = "m") =>
  `CAST(CASE ${alias}.season_id WHEN '2007/08' THEN '2008' WHEN '2009/10' THEN '2010' WHEN '2020/21' THEN '2020' ELSE ${alias}.season_id END AS INTEGER)`;

/** Legal deliveries (wides and no-balls do not count as balls faced/bowled). */
export const LEGAL = "(d.is_wide = 0 AND d.is_noball = 0)";
/** Runs charged to the bowler (byes and leg-byes excluded). */
export const BOWLER_RUNS = "(d.total_runs - CASE WHEN d.is_bye = 1 OR d.is_legbye = 1 THEN d.extra_runs ELSE 0 END)";
/** Regulation innings only: innings 3+ are super overs. */
export const REGULATION = "i.innings_number <= 2";

export function openDb() {
  return new DatabaseSync(DB_FILE, { readOnly: true });
}

export const dp = (x: number, n = 1) => (Number.isFinite(x) ? Number(x.toFixed(n)) : NaN);
export const pct = (x: number, n = 1) => `${(x * 100).toFixed(n)}%`;
export const fmt = (x: number, n = 1) => x.toFixed(n);
export const int = (x: number) => Math.round(x).toLocaleString("en-IN");

export interface MetricInput {
  value: number | string;
  display?: string;
  label: string;
  unit?: string;
  dataset: string;
  filters: string;
  n: number;
  nUnit: string;
  query: string;
  validate: { method: string; passed: boolean; detail?: string };
}

export class Evidence {
  readonly metrics: Record<string, EvidenceMetric> = {};
  readonly tables: Record<string, EvidenceTable> = {};
  readonly failures: string[] = [];
  constructor(
    readonly articleId: string,
    readonly db: DatabaseSync,
  ) {}

  rows<T = Record<string, number | string | null>>(sql: string, ...params: (string | number)[]): T[] {
    return this.db.prepare(sql).all(...params) as T[];
  }
  one<T = Record<string, number | string | null>>(sql: string, ...params: (string | number)[]): T {
    const r = this.db.prepare(sql).get(...params) as T | undefined;
    if (!r) throw new Error(`${this.articleId}: query returned no row:\n${sql}`);
    return r;
  }

  metric(id: string, m: MetricInput) {
    if (this.metrics[id]) throw new Error(`${this.articleId}: duplicate metric ${id}`);
    if (typeof m.value === "number" && !Number.isFinite(m.value)) this.failures.push(`${id}: non-finite value`);
    if (!m.validate.passed) this.failures.push(`${id}: validation failed — ${m.validate.method}: ${m.validate.detail ?? ""}`);
    this.metrics[id] = {
      value: m.value,
      display: m.display ?? String(m.value),
      label: m.label,
      unit: m.unit,
      dataset: m.dataset,
      filters: m.filters,
      sampleSize: { n: m.n, unit: m.nUnit },
      query: m.query.replace(/\s+/g, " ").trim(),
      validation: m.validate,
    };
    return this.metrics[id];
  }

  table(id: string, t: { label: string; dataset: string; filters: string; n: number; nUnit: string; query: string; rows: Record<string, number | string | null>[] }) {
    this.tables[id] = {
      label: t.label,
      dataset: t.dataset,
      filters: t.filters,
      sampleSize: { n: t.n, unit: t.nUnit },
      query: t.query.replace(/\s+/g, " ").trim(),
      rows: t.rows,
    };
    return this.tables[id];
  }

  write(): EvidenceFile {
    const dbInfo = this.one<{ matches: number; deliveries: number; last: string }>(
      "SELECT (SELECT COUNT(*) FROM matches) matches, (SELECT COUNT(*) FROM deliveries) deliveries, (SELECT MAX(date) FROM matches) last",
    );
    const file: EvidenceFile = {
      articleId: this.articleId,
      generatedAt: new Date().toISOString(),
      generator: "scripts/editorial/evidence/run.ts",
      database: { file: "sqlite.db", matches: dbInfo.matches, deliveries: dbInfo.deliveries, lastMatchDate: dbInfo.last.replaceAll("/", "-") },
      metrics: this.metrics,
      tables: this.tables,
    };
    evidenceFileSchema.parse(file);
    const franchise = this.articleId.split("-")[1];
    const out = resolve(APP, `src/data/editorial/evidence/${franchise}/${this.articleId}.json`);
    mkdirSync(dirname(out), { recursive: true });
    writeFileSync(out, JSON.stringify(file, null, 1) + "\n");
    return file;
  }
}

/** Two independent computations of the same quantity must agree within `tol` (relative). */
export function reconcile(a: number, b: number, tol = 0.005, what = "values") {
  const rel = Math.abs(a - b) / Math.max(1, Math.abs(b));
  return { method: `cross-check: ${what}`, passed: rel <= tol, detail: `${a} vs ${b} (Δ ${(rel * 100).toFixed(2)}%)` };
}
export function sampleFloor(n: number, min: number, unit: string) {
  return { method: `sample-size floor ≥ ${min} ${unit}`, passed: n >= min, detail: `n = ${n}` };
}
export function inRange(x: number, lo: number, hi: number, what: string) {
  return { method: `plausibility range ${lo}–${hi} for ${what}`, passed: x >= lo && x <= hi, detail: `value ${x}` };
}

/** Two-sided exact binomial test p-value (H0: p = 0.5) — used for win-rate claims. */
export function binomialP(k: number, n: number, p = 0.5): number {
  const logC = (n: number, k: number) => lgamma(n + 1) - lgamma(k + 1) - lgamma(n - k + 1);
  const pmf = (i: number) => Math.exp(logC(n, i) + i * Math.log(p) + (n - i) * Math.log(1 - p));
  const obs = pmf(k);
  let total = 0;
  for (let i = 0; i <= n; i++) if (pmf(i) <= obs * (1 + 1e-9)) total += pmf(i);
  return Math.min(1, total);
}
function lgamma(z: number): number {
  // Lanczos approximation
  const g = 7;
  const c = [0.99999999999980993, 676.5203681218851, -1259.1392167224028, 771.32342877765313, -176.61518017113, 12.507343278686905, -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7];
  if (z < 0.5) return Math.log(Math.PI / Math.sin(Math.PI * z)) - lgamma(1 - z);
  z -= 1;
  let x = c[0];
  for (let i = 1; i < g + 2; i++) x += c[i] / (z + i);
  const t = z + g + 0.5;
  return 0.5 * Math.log(2 * Math.PI) + (z + 0.5) * Math.log(t) - t + Math.log(x);
}

/** Wilson score interval for a proportion. */
export function wilson(k: number, n: number, z = 1.96): [number, number] {
  if (!n) return [0, 0];
  const p = k / n;
  const den = 1 + (z * z) / n;
  const centre = (p + (z * z) / (2 * n)) / den;
  const half = (z * Math.sqrt((p * (1 - p)) / n + (z * z) / (4 * n * n))) / den;
  return [centre - half, centre + half];
}

export function pearson(xs: number[], ys: number[]): number {
  const n = xs.length;
  const mx = xs.reduce((a, b) => a + b, 0) / n;
  const my = ys.reduce((a, b) => a + b, 0) / n;
  let sxy = 0, sxx = 0, syy = 0;
  for (let i = 0; i < n; i++) {
    sxy += (xs[i] - mx) * (ys[i] - my);
    sxx += (xs[i] - mx) ** 2;
    syy += (ys[i] - my) ** 2;
  }
  return sxy / Math.sqrt(sxx * syy);
}

export type SquadPlayer = { name: string; cricsheetName: string; country: string | null; role: string | null; acquisition: string; priceLakh: number | null; played: boolean };
export function rcbSquad(year: number): SquadPlayer[] {
  const squads = JSON.parse(readFileSync(SQUADS_FILE, "utf8")) as Record<string, Record<string, SquadPlayer[]>>;
  const season = squads[String(year)] ?? {};
  const key = Object.keys(season).find((k) => /Royal Challengers/.test(k));
  return key ? season[key] : [];
}
