// Trade and transfer ledger. Reports are recorded with their sources and a status; only
// a Completed or Officially Confirmed entry changes a squad, and only when the snapshot is
// next published. Everything else is shown as a scenario, never as a fact.

import fs from "node:fs";
import path from "node:path";
import { z } from "zod";
import { getProjectRoot } from "../decision/db";
import { lookupPlayer } from "../intelligence/identity";
import { TEAMS } from "../intelligence/schema";

export const STATUSES = ["Rumour", "Reported Interest", "Negotiations Reported", "Officially Confirmed", "Completed", "Denied", "Stalled", "Superseded"] as const;
export const SQUAD_CHANGING = new Set<string>(["Officially Confirmed", "Completed"]);

const team = z.enum(TEAMS as unknown as [string, ...string[]]);
const day = z.string().regex(/^\d{4}-\d{2}(-\d{2})?$/);
const move = z.object({ player: z.string().min(2), from: team, to: team, feeLakh: z.number().positive().nullable() }).strict();
const source = z.object({ publisher: z.string().min(2), official: z.boolean(), url: z.string().url(), publishedOn: day, note: z.string().optional() }).strict();
export const entrySchema = z.object({
  id: z.string().regex(/^[a-z0-9-]{3,80}$/), kind: z.enum(["trade", "transfer"]), status: z.enum(STATUSES), announcedOn: day.nullable(),
  moves: z.array(move).min(1).max(6), history: z.array(z.object({ status: z.enum(STATUSES), on: day, sourceUrl: z.string().url() }).strict()).min(1),
  sources: z.array(source).min(1), lastChecked: day,
}).strict();
const fileSchema = z.object({ updatedAt: day, note: z.string(), entries: z.array(entrySchema) }).strict();
export type LedgerEntry = z.infer<typeof entrySchema>;

const file = () => process.env.TRANSACTIONS_FILE ?? path.join(getProjectRoot(), "artifacts", "api-server", "data", "retention", "transactions.json");

export function readLedger() {
  const fp = file();
  if (!fs.existsSync(fp)) return { updatedAt: null as string | null, note: "", entries: [] as LedgerEntry[] };
  return fileSchema.parse(JSON.parse(fs.readFileSync(fp, "utf8")));
}

/** Adds or replaces an entry by id. The previous status stays in its history. */
export function upsertEntry(entry: LedgerEntry, today = new Date().toISOString().slice(0, 10)) {
  const l = readLedger();
  const parsed = entrySchema.parse(entry);
  const i = l.entries.findIndex((e) => e.id === parsed.id);
  const entries = i < 0 ? [...l.entries, parsed] : l.entries.map((e, k) => (k === i ? parsed : e));
  fs.writeFileSync(file(), JSON.stringify({ updatedAt: today, note: l.note || "Player movement between franchises.", entries }, null, 2) + "\n");
  return parsed;
}

export interface ResolvedMove { entryId: string; status: string; canonicalId: string | null; player: string; from: string; to: string; feeLakh: number | null }

/** Each move with its canonical id; a name that does not resolve to one player is kept with a null id. */
export function resolvedMoves(entries = readLedger().entries): ResolvedMove[] {
  return entries.flatMap((e) => e.moves.map((m) => {
    const l = lookupPlayer(m.player);
    return { entryId: e.id, status: e.status, canonicalId: l.status === "not_found" || l.status === "ambiguous" ? null : l.player!.canonicalId, player: m.player, from: m.from, to: m.to, feeLakh: m.feeLakh };
  }));
}

/** Squad changes for the snapshot: canonical id → new team and fee. The latest completed entry wins. */
export function completedMoves() {
  const out = new Map<string, ResolvedMove>();
  const entries = [...readLedger().entries].sort((a, b) => (a.announcedOn ?? "").localeCompare(b.announcedOn ?? ""));
  for (const m of resolvedMoves(entries)) if (SQUAD_CHANGING.has(m.status) && m.canonicalId) out.set(m.canonicalId, m);
  return out;
}

/** Source audit: who said what, whether it is official, and whether every name resolved. */
export function ledgerAudit() {
  const l = readLedger();
  const moves = resolvedMoves(l.entries);
  return {
    updatedAt: l.updatedAt, entries: l.entries.length,
    byStatus: Object.fromEntries(STATUSES.map((s) => [s, l.entries.filter((e) => e.status === s).length])),
    squadChanging: l.entries.filter((e) => SQUAD_CHANGING.has(e.status)).map((e) => ({ id: e.id, officialSource: e.sources.some((s) => s.official) })),
    unresolvedPlayers: moves.filter((m) => !m.canonicalId).map((m) => m.player),
    sources: l.entries.flatMap((e) => e.sources.map((s) => ({ entry: e.id, ...s }))),
  };
}
