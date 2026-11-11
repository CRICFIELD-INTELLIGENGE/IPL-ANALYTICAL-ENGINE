// Resolve a Cricsheet match CSV by match id — never by a caller-supplied path.
//
// The old /api/ipl/sync-csv route accepted an arbitrary `filePath` and read it from
// disk. This resolver accepts only a numeric match id and returns a path that is
// guaranteed to sit directly inside the project's ipl_csv/ folder.

import fs from "node:fs";
import path from "node:path";
import { getProjectRoot } from "./decision/db";

const MATCH_ID = /^\d{1,12}$/;

export function iplCsvDir(root = getProjectRoot()): string {
  return path.resolve(root, "ipl_csv");
}

/** Absolute path of `<ipl_csv>/<matchId>.csv`, or null if the id is invalid or the file is absent. */
export function resolveCricsheetCsv(matchId: unknown, baseDir = iplCsvDir()): string | null {
  if (typeof matchId !== "string" || !MATCH_ID.test(matchId)) return null;
  const base = path.resolve(baseDir);
  const candidate = path.resolve(base, `${matchId}.csv`);
  // Defence in depth: the regex already forbids separators, but check containment anyway.
  if (path.dirname(candidate) !== base) return null;
  return fs.existsSync(candidate) ? candidate : null;
}
