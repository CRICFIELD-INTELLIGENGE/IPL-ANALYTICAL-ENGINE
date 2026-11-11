// CricField data release — build, verify and restore the data that Git does not carry (Day 5.5).
//
//   node scripts/data-release.mjs build   <out-dir> [--version <v>]   build a release from this checkout's data
//   node scripts/data-release.mjs verify  <release-dir>               check every file against the manifest
//   node scripts/data-release.mjs restore <release-dir> [--root <checkout>] [--force]
//
// A release holds:
//   sqlite.db   IPL warehouse snapshot (VACUUM INTO from a read-only connection, then DELETE journal mode on the copy,
//               so readers never need -wal/-shm files)
//   global.db   six-league warehouse snapshot (same procedure)
//   raw/        the 1,243 IPL Cricsheet JSON match files the API reads at runtime (+ Cricsheet README.txt)
//   MANIFEST.json, SHA256SUMS, README.md
// Building never writes the source databases. Restoring never overwrites an existing file that differs from the
// release unless --force is given (and then only after the release itself has verified).

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { fileURLToPath } from "node:url";

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const LAYOUT = {
  sqlite: "sqlite.db",
  global: path.join("lib", "cricket-data", "global", "warehouse", "global.db"),
  raw: path.join("lib", "cricket-data", "raw"),
};
const EXPECTED_RAW_MATCHES = 1243;

const sha256File = (f) => crypto.createHash("sha256").update(fs.readFileSync(f)).digest("hex");
const fail = (msg) => { console.error(`ERROR: ${msg}`); process.exit(1); };
const args = process.argv.slice(2);
const flag = (n) => args.includes(`--${n}`);
const opt = (n) => { const i = args.indexOf(`--${n}`); return i >= 0 ? args[i + 1] : undefined; };

/** Logical fingerprint: per table row count and SHA-256 over rows in primary-key order (independent of page layout). */
function fingerprint(file) {
  const db = new DatabaseSync(file, { readOnly: true });
  try {
    const integrity = db.prepare("PRAGMA integrity_check").all().map((r) => r.integrity_check).join("; ");
    const journal = db.prepare("PRAGMA journal_mode").get().journal_mode;
    const tables = {};
    for (const { name } of db.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name").all()) {
      const cols = db.prepare(`PRAGMA table_info("${name}")`).all();
      const pk = cols.filter((c) => c.pk > 0).sort((a, b) => a.pk - b.pk).map((c) => `"${c.name}"`);
      const order = (pk.length ? pk : cols.map((c) => `"${c.name}"`)).join(", ");
      const h = crypto.createHash("sha256");
      let rows = 0;
      for (const r of db.prepare(`SELECT * FROM "${name}" ORDER BY ${order}`).iterate()) { h.update(JSON.stringify(cols.map((c) => r[c.name]))); h.update("\n"); rows++; }
      tables[name] = { rows, sha256: h.digest("hex") };
    }
    return { integrity, journal, tables };
  } finally { db.close(); }
}

function snapshot(src, dest) {
  const s = new DatabaseSync(src, { readOnly: true });
  s.exec(`VACUUM INTO '${dest.replace(/'/g, "''")}'`);
  s.close();
  const d = new DatabaseSync(dest);
  d.exec("PRAGMA journal_mode = DELETE");
  d.close();
  for (const side of ["-wal", "-shm"]) if (fs.existsSync(dest + side)) fs.rmSync(dest + side);
}

function listRaw(dir) {
  return fs.readdirSync(dir).filter((f) => f.endsWith(".json")).sort();
}

function build(out) {
  if (!out) fail("usage: build <out-dir>");
  out = path.resolve(out);
  if (fs.existsSync(out)) fail(`${out} exists; choose a new directory`);
  for (const k of ["sqlite", "global", "raw"]) if (!fs.existsSync(path.join(REPO, LAYOUT[k]))) fail(`missing ${LAYOUT[k]}`);
  const version = opt("version") ?? `${new Date().toISOString().slice(0, 10)}`;
  const srcHashes = { sqlite: sha256File(path.join(REPO, LAYOUT.sqlite)), global: sha256File(path.join(REPO, LAYOUT.global)) };
  fs.mkdirSync(path.join(out, "raw"), { recursive: true });

  const dbs = {};
  for (const k of ["sqlite", "global"]) {
    const src = path.join(REPO, LAYOUT[k]), dest = path.join(out, path.basename(LAYOUT[k]));
    snapshot(src, dest);
    const a = fingerprint(src), b = fingerprint(dest);
    const differing = Object.keys({ ...a.tables, ...b.tables }).filter((t) => a.tables[t]?.sha256 !== b.tables[t]?.sha256);
    if (b.integrity !== "ok") fail(`${dest}: integrity_check ${b.integrity}`);
    if (differing.length) fail(`${dest}: tables differ from the source: ${differing.join(", ")}`);
    if (b.journal !== "delete") fail(`${dest}: journal mode ${b.journal}`);
    dbs[k] = { tables: Object.keys(b.tables).length, rows: Object.values(b.tables).reduce((s, t) => s + t.rows, 0), fingerprint: b.tables };
  }
  const rawFiles = listRaw(path.join(REPO, LAYOUT.raw));
  if (rawFiles.length !== EXPECTED_RAW_MATCHES) fail(`expected ${EXPECTED_RAW_MATCHES} raw match files, found ${rawFiles.length}`);
  const rawConcat = crypto.createHash("sha256");
  for (const f of rawFiles) { const buf = fs.readFileSync(path.join(REPO, LAYOUT.raw, f)); rawConcat.update(buf); fs.writeFileSync(path.join(out, "raw", f), buf); }
  if (fs.existsSync(path.join(REPO, LAYOUT.raw, "README.txt"))) fs.copyFileSync(path.join(REPO, LAYOUT.raw, "README.txt"), path.join(out, "raw", "README.txt"));

  fs.writeFileSync(path.join(out, "README.md"), readme(version, srcHashes, dbs, rawFiles.length));

  const files = [];
  const walk = (d) => { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, e.name); if (e.isDirectory()) walk(p); else files.push(p); } };
  walk(out);
  const entries = files.map((p) => ({ path: path.relative(out, p).split(path.sep).join("/"), bytes: fs.statSync(p).size, sha256: sha256File(p) })).sort((a, b) => a.path.localeCompare(b.path));
  const manifest = {
    name: "cricfield-data", version, created: new Date().toISOString(),
    layout: { "sqlite.db": LAYOUT.sqlite.split(path.sep).join("/"), "global.db": LAYOUT.global.split(path.sep).join("/"), "raw/*.json": LAYOUT.raw.split(path.sep).join("/") + "/" },
    source: {
      sqliteDbSha256: srcHashes.sqlite, globalDbSha256: srcHashes.global,
      rawConcatenatedSha256: rawConcat.digest("hex"), rawMatchFiles: rawFiles.length,
      note: "Source files are the working warehouses after the Day 4.5 corrections (C1–C7) and Day 4.6 identity cleanup. Snapshots are logically identical (per-table fingerprints below) but not byte-identical: VACUUM INTO rewrites pages and the journal mode is DELETE.",
    },
    databases: dbs,
    files: entries,
  };
  fs.writeFileSync(path.join(out, "MANIFEST.json"), JSON.stringify(manifest, null, 2) + "\n");
  fs.writeFileSync(path.join(out, "SHA256SUMS"), entries.map((e) => `${e.sha256}  ${e.path}`).join("\n") + "\n");
  console.log(`built ${out}: ${entries.length} files, version ${version}`);
  console.log(`  sqlite.db ${dbs.sqlite.tables} tables / ${dbs.sqlite.rows} rows; global.db ${dbs.global.tables} tables / ${dbs.global.rows} rows; raw ${rawFiles.length} matches`);
}

function readme(version, srcHashes, dbs, rawCount) {
  return `# CricField data release ${version}

Data that the CricField API needs at runtime but that is not stored in Git. Restore into a checkout with:

    node scripts/data-release.mjs verify  <this-directory>
    node scripts/data-release.mjs restore <this-directory> --root <checkout>

| File | Restored to | Content |
|---|---|---|
| sqlite.db | ${LAYOUT.sqlite} | IPL warehouse: ${dbs.sqlite.tables} tables, ${dbs.sqlite.rows} rows |
| global.db | ${LAYOUT.global.split(path.sep).join("/")} | Six-league warehouse (Scout Lab): ${dbs.global.tables} tables, ${dbs.global.rows} rows |
| raw/*.json | ${LAYOUT.raw.split(path.sep).join("/")}/ | ${rawCount} IPL match files (Cricsheet JSON, modified as below) |

## State of the data

- sqlite.db includes the Day 4.5 warehouse corrections C1–C7 (retired-out and retired-hurt wickets, penalty runs,
  extras-type flags, batting dismissals, fielders, super-over winners; DAY-04.5-REPORT.md) and derived analytics
  rebuilt with the exact runs-conceded expression. Source file SHA-256 ${srcHashes.sqlite}.
- global.db is the six-league warehouse built by \`pnpm --filter @workspace/scripts run global:sync\`. Source SHA-256
  ${srcHashes.global}.
- Both are VACUUM INTO snapshots in DELETE journal mode: logically identical to the source (per-table fingerprints in
  MANIFEST.json), not byte-identical.

## Provenance and licence

Match data comes from Cricsheet (https://cricsheet.org), licensed under the Open Data Commons Attribution License
(ODC-BY 1.0, https://opendatacommons.org/licenses/by/1-0/; https://cricsheet.org/licensing/). Attribution to
Cricsheet is required when this data is redistributed.

raw/*.json are Cricsheet's ipl_male_json.zip (archive dated 2026-06-10, SHA-256
e8d39ac8aafdb239e66b743dd8b11a4dffc477a84d0eaeb08257641e58a397d1) with two systematic local modifications, verified
on all ${rawCount} files (content otherwise identical):
  1. every delivery has an added field \`actual_delivery\` (the over.ball label);
  2. meta.data_version is relabelled "1.2.0" (845 files were 1.0.0, 398 were 1.1.0).
They are therefore a modified derivative of Cricsheet data, not the original files. A fresh Cricsheet download
does not reproduce them byte-for-byte.

Not included: player photographs and other media (licences not documented), the original Cricsheet zip archives.
Do not publish this release until its destination and the licensing review are approved.
`;
}

function verify(dir, { quiet = false } = {}) {
  if (!dir) fail("usage: verify <release-dir>");
  dir = path.resolve(dir);
  const manifest = JSON.parse(fs.readFileSync(path.join(dir, "MANIFEST.json"), "utf8"));
  const bad = [];
  for (const e of manifest.files) {
    const p = path.join(dir, e.path);
    if (!fs.existsSync(p)) { bad.push(`missing ${e.path}`); continue; }
    if (fs.statSync(p).size !== e.bytes || sha256File(p) !== e.sha256) bad.push(`checksum ${e.path}`);
  }
  const raw = listRaw(path.join(dir, "raw"));
  if (raw.length !== manifest.source.rawMatchFiles) bad.push(`raw count ${raw.length} != ${manifest.source.rawMatchFiles}`);
  const concat = crypto.createHash("sha256");
  for (const f of raw) concat.update(fs.readFileSync(path.join(dir, "raw", f)));
  if (concat.digest("hex") !== manifest.source.rawConcatenatedSha256) bad.push("raw concatenated hash");
  for (const k of ["sqlite", "global"]) {
    const fp = fingerprint(path.join(dir, `${k === "sqlite" ? "sqlite" : "global"}.db`));
    if (fp.integrity !== "ok") bad.push(`${k}.db integrity ${fp.integrity}`);
    if (fp.journal !== "delete") bad.push(`${k}.db journal ${fp.journal}`);
    const exp = manifest.databases[k].fingerprint;
    const diff = Object.keys({ ...exp, ...fp.tables }).filter((t) => exp[t]?.sha256 !== fp.tables[t]?.sha256);
    if (diff.length) bad.push(`${k}.db tables differ: ${diff.join(", ")}`);
  }
  for (const side of ["sqlite.db-wal", "sqlite.db-shm", "global.db-wal", "global.db-shm"]) if (fs.existsSync(path.join(dir, side))) fs.rmSync(path.join(dir, side));
  if (bad.length) fail(`release ${dir} failed verification:\n  ${bad.join("\n  ")}`);
  if (!quiet) console.log(`verified ${dir}: ${manifest.files.length} files, version ${manifest.version}`);
  return manifest;
}

function restore(dir) {
  if (!dir) fail("usage: restore <release-dir> [--root <checkout>] [--force]");
  const manifest = verify(dir, { quiet: true });
  dir = path.resolve(dir);
  const root = path.resolve(opt("root") ?? REPO);
  const plan = [
    [path.join(dir, "sqlite.db"), path.join(root, LAYOUT.sqlite)],
    [path.join(dir, "global.db"), path.join(root, LAYOUT.global)],
    ...listRaw(path.join(dir, "raw")).concat(fs.existsSync(path.join(dir, "raw", "README.txt")) ? ["README.txt"] : [])
      .map((f) => [path.join(dir, "raw", f), path.join(root, LAYOUT.raw, f)]),
  ];
  const conflicts = plan.filter(([src, dest]) => fs.existsSync(dest) && sha256File(dest) !== sha256File(src));
  if (conflicts.length && !flag("force")) {
    fail(`${conflicts.length} existing file(s) differ from the release (e.g. ${path.relative(root, conflicts[0][1])}). Nothing was written. ` +
      "A live warehouse is never overwritten implicitly; move it aside first, or pass --force deliberately.");
  }
  let copied = 0, same = 0;
  for (const [src, dest] of plan) {
    if (fs.existsSync(dest) && sha256File(dest) === sha256File(src)) { same++; continue; }
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.copyFileSync(src, dest);
    if (sha256File(dest) !== sha256File(src)) fail(`copy verification failed for ${dest}`);
    copied++;
  }
  console.log(`restored release ${manifest.version} into ${root}: ${copied} files written, ${same} already identical, all verified`);
}

const [cmd, target] = args;
if (cmd === "build") build(target);
else if (cmd === "verify") verify(target);
else if (cmd === "restore") restore(target);
else fail("usage: node scripts/data-release.mjs build|verify|restore <dir> [...]");
