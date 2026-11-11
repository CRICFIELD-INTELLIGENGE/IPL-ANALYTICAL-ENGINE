// Global data engine — filesystem layout and the source catalogue.
//
// Everything the engine writes lives under lib/cricket-data/global/. The IPL
// warehouse (sqlite.db), ipl_csv/ and lib/cricket-data/raw/ are only ever read.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));

export const REPO = path.resolve(here, "..", "..", "..");
export const GLOBAL_DIR = path.join(REPO, "lib", "cricket-data", "global");
export const ARCHIVE_DIR = path.join(GLOBAL_DIR, "raw", "cricsheet", "archives");
export const REGISTER_DIR = path.join(GLOBAL_DIR, "raw", "cricsheet", "register");
export const MANIFEST_DIR = path.join(GLOBAL_DIR, "manifests");
export const REPORT_DIR = path.join(GLOBAL_DIR, "reports");
export const WAREHOUSE_PATH = process.env.GLOBAL_DB ?? path.join(GLOBAL_DIR, "warehouse", "global.db");
export const SOURCES_PATH = path.join(MANIFEST_DIR, "sources.json");
export const ACQUISITIONS_PATH = path.join(MANIFEST_DIR, "acquisitions.jsonl");
export const COVERAGE_PATH = path.join(MANIFEST_DIR, "coverage.json");
export const IDENTITY_DECISIONS_PATH = path.join(MANIFEST_DIR, "identity-decisions.json");

/** The existing IPL warehouse. Opened read-only, for reconciliation and the identity bridge. */
export const IPL_WAREHOUSE_PATH = path.join(REPO, "sqlite.db");
/** The Cricsheet JSON the IPL site already reads (format 1.2.0). Read-only. */
export const IPL_RAW_DIR = path.join(REPO, "lib", "cricket-data", "raw");

export type Format = "T20" | "T20I" | "100-ball";

export interface CompetitionSource {
  code: string;
  name: string;
  region: string;
  format: Format;
  gender: "male" | "female";
  teamType: "club" | "international";
  slug: string;
  batch: number;
  enabled: boolean;
  catalogueMatches: number;
  note?: string;
}

export interface RegisterSource {
  name: "people" | "names";
  url: string;
  enabled: boolean;
}

export interface SourcesFile {
  catalogueCheckedAt: string;
  licence: string;
  competitions: CompetitionSource[];
  registers: RegisterSource[];
}

export function loadSources(): SourcesFile {
  return JSON.parse(fs.readFileSync(SOURCES_PATH, "utf8")) as SourcesFile;
}

export const archiveUrl = (slug: string) => `https://cricsheet.org/downloads/${slug}.zip`;

/** Path relative to GLOBAL_DIR, with forward slashes, for manifests. */
export const relToGlobal = (p: string) => path.relative(GLOBAL_DIR, p).split(path.sep).join("/");
export const fromGlobal = (rel: string) => path.join(GLOBAL_DIR, ...rel.split("/"));

/** `--only a,b` / `--force` style flags shared by the CLIs. */
export function parseArgs(argv: string[]): { only: Set<string> | null; flags: Set<string>; values: Map<string, string> } {
  const flags = new Set<string>();
  const values = new Map<string, string>();
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith("--")) continue;
    const eq = a.indexOf("=");
    if (eq > 0) values.set(a.slice(2, eq), a.slice(eq + 1));
    else if (i + 1 < argv.length && !argv[i + 1].startsWith("--")) values.set(a.slice(2), argv[++i]);
    else flags.add(a.slice(2));
  }
  const only = values.get("only");
  return { only: only ? new Set(only.split(",").map((s) => s.trim()).filter(Boolean)) : null, flags, values };
}

export function ensureDir(dir: string): void {
  fs.mkdirSync(dir, { recursive: true });
}

/** Local timestamp-free date stamp used in report file names. */
export const today = () => new Date().toISOString().slice(0, 10);
