// Global data engine — acquisition of Cricsheet archives and registers.
//
//   pnpm --filter @workspace/scripts run global:acquire [--only ipl,smat] [--registers-only] [--archives-only]
//
// Downloads one file at a time from the URLs in manifests/sources.json:
//   - sends If-Modified-Since from the last acquisition (Cricsheet sends Last-Modified, no ETag);
//   - streams to a .part file, checks Content-Length, then (for zips) inflates every
//     entry and checks it against the central-directory CRC-32;
//   - stores a new immutable file only when the SHA-256 differs from the last copy;
//   - appends one record per attempt to manifests/acquisitions.jsonl.
// Raw files are never modified or deleted.

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { Readable, Transform } from "node:stream";
import { pipeline } from "node:stream/promises";
import {
  ACQUISITIONS_PATH, ARCHIVE_DIR, REGISTER_DIR, archiveUrl, ensureDir, fromGlobal, loadSources, parseArgs, relToGlobal,
} from "./paths";
import { verifyArchive } from "./zip";

export interface AcquisitionRecord {
  kind: "archive" | "register";
  key: string; // archive slug or register name
  code?: string; // competition code for archives
  url: string;
  retrievedAt: string;
  status: "new" | "unchanged" | "not-modified";
  httpStatus: number;
  lastModified: string | null;
  bytes: number;
  sha256: string;
  path: string; // relative to lib/cricket-data/global
  entries?: number;
  jsonEntries?: number;
  uncompressedBytes?: number;
}

export function readAcquisitions(): AcquisitionRecord[] {
  if (!fs.existsSync(ACQUISITIONS_PATH)) return [];
  return fs.readFileSync(ACQUISITIONS_PATH, "utf8").split(/\r?\n/).filter(Boolean).map((l) => JSON.parse(l) as AcquisitionRecord);
}

/** The most recent stored copy of a source, or null if it was never downloaded. */
export function latestAcquisition(key: string, records = readAcquisitions()): AcquisitionRecord | null {
  for (let i = records.length - 1; i >= 0; i--) if (records[i].key === key && records[i].path) return records[i];
  return null;
}

function appendRecord(r: AcquisitionRecord): void {
  ensureDir(path.dirname(ACQUISITIONS_PATH));
  fs.appendFileSync(ACQUISITIONS_PATH, JSON.stringify(r) + "\n");
}

/** "Wed, 07 Oct 2026 17:05:16 GMT" → "20261007T170516Z" (falls back to the retrieval time). */
function stamp(lastModified: string | null): string {
  const d = lastModified ? new Date(lastModified) : new Date();
  return (Number.isNaN(d.getTime()) ? new Date() : d).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const USER_AGENT = "BeyondXI-GlobalDataEngine/1.0 (cricket analytics; periodic manual sync)";

interface FetchTarget { kind: "archive" | "register"; key: string; code?: string; url: string; dir: string; ext: string }

async function acquireOne(t: FetchTarget, previous: AcquisitionRecord | null): Promise<AcquisitionRecord> {
  ensureDir(t.dir);
  let lastError: unknown = null;
  for (let attempt = 1; attempt <= 3; attempt++) {
    const part = path.join(t.dir, `.download-${process.pid}${t.ext}.part`);
    try {
      const headers: Record<string, string> = { "User-Agent": USER_AGENT };
      if (previous?.lastModified) headers["If-Modified-Since"] = previous.lastModified;
      const res = await fetch(t.url, { headers, redirect: "follow" });
      const retrievedAt = new Date().toISOString();
      const lastModified = res.headers.get("last-modified");
      if (res.status === 304 && previous) {
        return { ...previous, status: "not-modified", httpStatus: 304, retrievedAt, url: t.url };
      }
      if (!res.ok || !res.body) throw new Error(`HTTP ${res.status} for ${t.url}`);
      const expected = Number(res.headers.get("content-length") ?? NaN);

      const hash = crypto.createHash("sha256");
      let bytes = 0;
      const body = Readable.fromWeb(res.body as import("node:stream/web").ReadableStream<Uint8Array>);
      const hasher = new Transform({
        transform(chunk: Buffer, _enc, cb) { hash.update(chunk); bytes += chunk.length; cb(null, chunk); },
      });
      await pipeline(body, hasher, fs.createWriteStream(part));
      if (Number.isFinite(expected) && bytes !== expected) throw new Error(`truncated download: ${bytes} of ${expected} bytes`);
      const sha256 = hash.digest("hex");

      let integrity: Pick<AcquisitionRecord, "entries" | "jsonEntries" | "uncompressedBytes"> = {};
      if (t.kind === "archive") {
        integrity = verifyArchive(new Uint8Array(fs.readFileSync(part)));
        if (!integrity.jsonEntries) throw new Error("archive contains no JSON match files");
      } else {
        const head = fs.readFileSync(part, "utf8").slice(0, 200);
        if (!head.startsWith("identifier,")) throw new Error("register CSV does not start with an identifier column");
      }

      if (previous && previous.sha256 === sha256 && fs.existsSync(fromGlobal(previous.path))) {
        fs.rmSync(part);
        return { ...previous, ...integrity, status: "unchanged", httpStatus: res.status, retrievedAt, lastModified, url: t.url };
      }
      const final = path.join(t.dir, `${stamp(lastModified)}_${sha256.slice(0, 8)}${t.ext}`);
      if (fs.existsSync(final)) fs.rmSync(part); // identical content already stored
      else fs.renameSync(part, final);
      return {
        kind: t.kind, key: t.key, code: t.code, url: t.url, retrievedAt, status: "new", httpStatus: res.status,
        lastModified, bytes, sha256, path: relToGlobal(final), ...integrity,
      };
    } catch (err) {
      lastError = err;
      if (fs.existsSync(part)) fs.rmSync(part);
      if (attempt < 3) {
        console.warn(`  attempt ${attempt} failed for ${t.url}: ${err instanceof Error ? err.message : err} — retrying`);
        await sleep(attempt * 3000);
      }
    }
  }
  throw new Error(`giving up on ${t.url}: ${lastError instanceof Error ? lastError.message : lastError}`);
}

export async function acquire(opts: { only?: Set<string> | null; archives?: boolean; registers?: boolean } = {}): Promise<AcquisitionRecord[]> {
  const sources = loadSources();
  const records = readAcquisitions();
  const targets: FetchTarget[] = [];
  if (opts.registers !== false) {
    for (const r of sources.registers.filter((r) => r.enabled)) {
      targets.push({ kind: "register", key: `register:${r.name}`, url: r.url, dir: path.join(REGISTER_DIR, r.name), ext: ".csv" });
    }
  }
  if (opts.archives !== false) {
    for (const c of sources.competitions.filter((c) => c.enabled && (!opts.only || opts.only.has(c.code)))) {
      targets.push({ kind: "archive", key: c.slug, code: c.code, url: archiveUrl(c.slug), dir: path.join(ARCHIVE_DIR, c.slug), ext: ".zip" });
    }
  }
  const out: AcquisitionRecord[] = [];
  for (const t of targets) {
    const started = Date.now();
    const rec = await acquireOne(t, latestAcquisition(t.key, records));
    appendRecord(rec);
    out.push(rec);
    const size = `${(rec.bytes / 1048576).toFixed(2)} MB`;
    const extra = rec.jsonEntries != null ? `, ${rec.jsonEntries} match files, CRC ok` : "";
    console.log(`  ${rec.status.padEnd(12)} ${t.key.padEnd(18)} ${size}${extra} (${Date.now() - started} ms) → ${rec.path}`);
  }
  return out;
}

if (process.argv[1] && /acquire\.ts$/.test(process.argv[1])) {
  const { only, flags } = parseArgs(process.argv.slice(2));
  console.log("Acquiring Cricsheet sources");
  acquire({ only, archives: !flags.has("registers-only"), registers: !flags.has("archives-only") && !only })
    .catch((err) => { console.error(err instanceof Error ? err.message : err); process.exit(1); });
}
