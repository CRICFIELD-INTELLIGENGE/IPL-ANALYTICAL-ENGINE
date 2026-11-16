// Shareable URL state for desktop Dimensional Slicing, and CSV export of the visible leaderboard.
import { defaultAnalyticsFilters, type AnalyticsFilters } from "@/lib/store";
import { MATCH_STATE_FIELDS, type MatchState } from "./match-state";

export type SliceExtras = { tab?: string; analysis?: string; minBalls?: number; minInnings?: number; minMatches?: number; matchState?: MatchState };

const MS_KEYS = MATCH_STATE_FIELDS.flatMap(f => [`min${f.key}`, `max${f.key}`]);

/** Only non-default values go into the URL, prefixed "f." so they never clash with the page's own ?team= / ?tab=. */
export function sliceToSearch(filters: AnalyticsFilters, extras: SliceExtras): string {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(filters)) if (v !== (defaultAnalyticsFilters as any)[k]) p.set(`f.${k}`, String(v));
  if (extras.tab && extras.tab !== "batters") p.set("tab", extras.tab);
  if (extras.analysis && extras.analysis !== "standard") p.set("analysis", extras.analysis);
  for (const k of ["minBalls", "minInnings", "minMatches"] as const) if (extras[k]) p.set(k, String(extras[k]));
  for (const [k, v] of Object.entries(extras.matchState ?? {})) p.set(`ms.${k}`, String(v));
  return p.toString();
}

export function sliceFromSearch(search: string): { filters: Partial<AnalyticsFilters>; extras: SliceExtras } {
  const p = new URLSearchParams(search);
  const filters: Partial<AnalyticsFilters> = {};
  for (const k of Object.keys(defaultAnalyticsFilters) as (keyof AnalyticsFilters)[]) {
    const v = p.get(`f.${k}`);
    if (v !== null && v.length <= 400) (filters as any)[k] = v;
  }
  const num = (k: string) => { const n = Number(p.get(k)); return Number.isFinite(n) && n > 0 ? Math.min(10000, Math.trunc(n)) : 0; };
  const matchState: MatchState = {};
  for (const k of MS_KEYS) {
    const n = Number(p.get(`ms.${k}`));
    if (p.has(`ms.${k}`) && Number.isFinite(n) && n >= 0 && n <= 400) (matchState as any)[k] = n;
  }
  return {
    filters,
    extras: { tab: p.get("tab") ?? undefined, analysis: p.get("analysis") ?? undefined, minBalls: num("minBalls"), minInnings: num("minInnings"), minMatches: num("minMatches"), matchState },
  };
}

const cell = (v: unknown) => {
  const s = v === null || v === undefined ? "" : String(v);
  // Neutralise spreadsheet formula injection, then quote.
  const safe = /^[=+\-@]/.test(s) && !/^-?\d/.test(s) ? `'${s}` : s;
  return /[",\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
};

export function toCsv(rows: Record<string, unknown>[], columns: string[], meta: string[]): string {
  return [...meta.map(m => `# ${m}`), columns.join(","), ...rows.map(r => columns.map(c => cell(r[c])).join(","))].join("\n");
}

export function downloadCsv(name: string, csv: string) {
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const a = Object.assign(document.createElement("a"), { href: url, download: name });
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}
