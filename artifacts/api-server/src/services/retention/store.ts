// Retention Room — durable state in the platform database: fan ballots, append-only
// editorial notes and frozen predictions. Frozen rows are protected by triggers, so
// a published forecast cannot be rewritten even by a bug in this code. Ballots hold
// the Supabase user id only: no email or name is ever stored or returned.

import { createHash, randomUUID } from "node:crypto";
import type { DatabaseSync } from "node:sqlite";
import { platform, type PlatformStore } from "../platform/store";

let override: PlatformStore | null = null;
const ready = new WeakSet<DatabaseSync>();

function db(): DatabaseSync {
  const conn = (override ?? platform()).db;
  if (!ready.has(conn)) {
    conn.exec(`
      CREATE TABLE IF NOT EXISTS retention_ballots(user_id TEXT NOT NULL,season INTEGER NOT NULL,team TEXT NOT NULL,choices TEXT NOT NULL,created_at INTEGER NOT NULL,updated_at INTEGER NOT NULL,PRIMARY KEY(user_id,season,team));
      CREATE INDEX IF NOT EXISTS retention_ballots_team ON retention_ballots(season,team);
      CREATE TABLE IF NOT EXISTS retention_editorial(id TEXT PRIMARY KEY,season INTEGER NOT NULL,team TEXT NOT NULL,kind TEXT NOT NULL,subject TEXT NOT NULL,payload TEXT NOT NULL,recorded_at INTEGER NOT NULL);
      CREATE INDEX IF NOT EXISTS retention_editorial_team ON retention_editorial(season,team);
      CREATE TABLE IF NOT EXISTS retention_freezes(id TEXT PRIMARY KEY,season INTEGER NOT NULL,frozen_at INTEGER NOT NULL,reason TEXT NOT NULL,model_version TEXT NOT NULL,hash TEXT NOT NULL,payload TEXT NOT NULL);
      CREATE TRIGGER IF NOT EXISTS retention_freezes_no_update BEFORE UPDATE ON retention_freezes BEGIN SELECT RAISE(ABORT,'frozen predictions cannot change'); END;
      CREATE TRIGGER IF NOT EXISTS retention_freezes_no_delete BEFORE DELETE ON retention_freezes BEGIN SELECT RAISE(ABORT,'frozen predictions cannot be deleted'); END;
    `);
    ready.add(conn);
  }
  return conn;
}

/** Tests run against their own in-memory store. */
export function useRetentionStore(store: PlatformStore | null) { override = store; }
export const retentionDb = db;

export type Choice = "retain" | "release";
export interface Ballot { season: number; team: string; choices: Record<string, Choice>; createdAt: number; updatedAt: number }
interface BallotRow { season: number; team: string; choices: string; created_at: number; updated_at: number }
const toBallot = (r: BallotRow): Ballot => ({ season: r.season, team: r.team, choices: JSON.parse(r.choices), createdAt: r.created_at, updatedAt: r.updated_at });

/** One active ballot per user, franchise and cycle; a second submission replaces the first. */
export function saveBallot(userId: string, season: number, team: string, choices: Record<string, Choice>, now = Date.now()) {
  db().prepare(`INSERT INTO retention_ballots VALUES(?,?,?,?,?,?) ON CONFLICT(user_id,season,team) DO UPDATE SET choices=excluded.choices,updated_at=excluded.updated_at`).run(userId, season, team, JSON.stringify(choices), now, now);
  return getBallot(userId, season, team)!;
}
export function getBallot(userId: string, season: number, team: string): Ballot | null {
  const r = db().prepare("SELECT season,team,choices,created_at,updated_at FROM retention_ballots WHERE user_id=? AND season=? AND team=?").get(userId, season, team) as unknown as BallotRow | undefined;
  return r ? toBallot(r) : null;
}
export const userBallots = (userId: string): Ballot[] => (db().prepare("SELECT season,team,choices,created_at,updated_at FROM retention_ballots WHERE user_id=? ORDER BY updated_at DESC").all(userId) as unknown as BallotRow[]).map(toBallot);
export const teamBallots = (season: number, team: string): Ballot[] => (db().prepare("SELECT season,team,choices,created_at,updated_at FROM retention_ballots WHERE season=? AND team=?").all(season, team) as unknown as BallotRow[]).map(toBallot);

export interface EditorialNote { id: string; season: number; team: string; kind: "override" | "dilemma"; subject: string; payload: Record<string, string>; recordedAt: number }
export function addEditorial(n: Omit<EditorialNote, "id" | "recordedAt">, now = Date.now()) {
  const id = randomUUID();
  db().prepare("INSERT INTO retention_editorial VALUES(?,?,?,?,?,?,?)").run(id, n.season, n.team, n.kind, n.subject, JSON.stringify(n.payload), now);
  return { ...n, id, recordedAt: now };
}
/** Latest note per subject. Earlier notes stay in the table as the audit trail. */
export function editorialFor(season: number, team: string, kind: EditorialNote["kind"]): Map<string, EditorialNote> {
  const rows = db().prepare("SELECT * FROM retention_editorial WHERE season=? AND team=? AND kind=? ORDER BY recorded_at, rowid").all(season, team, kind) as unknown as { id: string; season: number; team: string; kind: EditorialNote["kind"]; subject: string; payload: string; recorded_at: number }[];
  return new Map(rows.map((r) => [r.subject, { id: r.id, season: r.season, team: r.team, kind: r.kind, subject: r.subject, payload: JSON.parse(r.payload), recordedAt: r.recorded_at }]));
}

export interface FreezeRow { id: string; season: number; frozenAt: number; reason: string; modelVersion: string; hash: string }
export function insertFreeze(season: number, reason: string, modelVersion: string, payload: unknown, now = Date.now()): FreezeRow {
  const text = JSON.stringify(payload);
  const row = { id: randomUUID(), season, frozenAt: now, reason, modelVersion, hash: createHash("sha256").update(text).digest("hex") };
  db().prepare("INSERT INTO retention_freezes VALUES(?,?,?,?,?,?,?)").run(row.id, season, now, reason, modelVersion, row.hash, text);
  return row;
}
export function listFreezes(season?: number): FreezeRow[] {
  const rows = (season ? db().prepare("SELECT id,season,frozen_at,reason,model_version,hash FROM retention_freezes WHERE season=? ORDER BY frozen_at DESC").all(season) : db().prepare("SELECT id,season,frozen_at,reason,model_version,hash FROM retention_freezes ORDER BY frozen_at DESC").all()) as unknown as { id: string; season: number; frozen_at: number; reason: string; model_version: string; hash: string }[];
  return rows.map((r) => ({ id: r.id, season: r.season, frozenAt: r.frozen_at, reason: r.reason, modelVersion: r.model_version, hash: r.hash }));
}
export function freezePayload(id: string): { row: FreezeRow; payload: unknown; intact: boolean } | null {
  const r = db().prepare("SELECT * FROM retention_freezes WHERE id=?").get(id) as unknown as { id: string; season: number; frozen_at: number; reason: string; model_version: string; hash: string; payload: string } | undefined;
  if (!r) return null;
  return { row: { id: r.id, season: r.season, frozenAt: r.frozen_at, reason: r.reason, modelVersion: r.model_version, hash: r.hash }, payload: JSON.parse(r.payload), intact: createHash("sha256").update(r.payload).digest("hex") === r.hash };
}
