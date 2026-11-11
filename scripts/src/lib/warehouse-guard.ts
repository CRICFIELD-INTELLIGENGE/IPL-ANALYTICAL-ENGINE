// Day 6D — refuse warehouse-writing scripts against the production sqlite.db.
//
// The corrected warehouse (Day 4.5, sha256 ab897a8c…) must only change through a reviewed rebuild of a COPY. Every
// script that writes to sqlite.db calls guardWarehouseWrite() before it opens or writes the database:
//   - a target that is the repository's sqlite.db needs an explicit --allow-production;
//   - a deprecated script refuses outright and names its replacement.
// compute_analytics.ts and update-ipl-data-v3.ts carry their own equivalent guard (Days 3–4).

import path from "node:path";
import { fileURLToPath } from "node:url";

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
export const PRODUCTION_DB = path.join(REPO, "sqlite.db");

/** The warehouse a script will write: an explicit path, else CRICFIELD_DB_PATH (as @workspace/db honours), else production. */
export function warehouseTarget(explicit?: string): string {
  if (explicit) return path.resolve(explicit);
  return process.env.CRICFIELD_DB_PATH ? path.resolve(process.env.CRICFIELD_DB_PATH) : PRODUCTION_DB;
}

export function guardWarehouseWrite(script: string, opts: { target?: string; deprecated?: string } = {}): void {
  if (opts.deprecated) {
    console.error(`${script} is deprecated and disabled (Day 6): ${opts.deprecated}`);
    process.exit(1);
  }
  const target = warehouseTarget(opts.target);
  if (path.resolve(target).toLowerCase() === PRODUCTION_DB.toLowerCase() && !process.argv.includes("--allow-production")) {
    const howToCopy = opts.target ? "This script writes a fixed path; run it from a copy of the repository" : "Point CRICFIELD_DB_PATH at a copy";
    console.error(`${script}: refusing to write the production sqlite.db. ${howToCopy}, or pass --allow-production after review.`);
    process.exit(1);
  }
}
