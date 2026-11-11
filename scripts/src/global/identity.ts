// Global data engine — player identity.
//
//   pnpm --filter @workspace/scripts run global:identity
//
// 1. Loads the Cricsheet people register (people.csv: identifier, name,
//    unique_name, key_* ids on other sites) and its name variants (names.csv).
// 2. Links the IPL warehouse (sqlite.db, read-only) to canonical players by
//    exact Cricsheet identifier. Rows without one go to the review queue with
//    exact-name candidates as evidence — nothing is linked on a name alone.
// 3. Applies reviewed decisions from manifests/identity-decisions.json.
// 4. Writes reports/identity-<date>.{json,md}: register coverage, cross-league
//    players, name collisions, name variants and the review queue.

import fs from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { all, openGlobalDb, setMeta, transaction } from "./db";
import { IDENTITY_DECISIONS_PATH, IPL_WAREHOUSE_PATH, REPORT_DIR, ensureDir, fromGlobal, today } from "./paths";
import { latestAcquisition, readAcquisitions } from "./acquire";
import { parseCsvObjects } from "./csv";

const HEX_ID = /^[0-9a-f]{8}$/;
/** Exact comparison key: case, dots and repeated spaces ignored — no fuzzy matching. */
export const nameKey = (s: string) => s.toLowerCase().replace(/\./g, " ").replace(/\s+/g, " ").trim();

export function loadRegister(db: DatabaseSync): { people: number; sourceIds: number; variants: number; file: string | null } {
  const records = readAcquisitions();
  const peopleRec = latestAcquisition("register:people", records);
  const namesRec = latestAcquisition("register:names", records);
  if (!peopleRec) throw new Error("people register not acquired — run global:acquire");
  const people = parseCsvObjects(fs.readFileSync(fromGlobal(peopleRec.path), "utf8"));
  const variants = namesRec ? parseCsvObjects(fs.readFileSync(fromGlobal(namesRec.path), "utf8")) : [];

  let sourceIds = 0;
  transaction(db, () => {
    const upd = db.prepare("UPDATE players SET name = ?, unique_name = ?, in_register = 1 WHERE cricsheet_id = ?");
    const ins = db.prepare("INSERT INTO players (cricsheet_id, name, unique_name, in_register) VALUES (?, ?, ?, 1)");
    const keyOf = db.prepare("SELECT player_key FROM players WHERE cricsheet_id = ?");
    const sid = db.prepare("INSERT OR IGNORE INTO player_source_ids (player_key, source, source_id) VALUES (?, ?, ?)");
    const pn = db.prepare("INSERT OR IGNORE INTO player_names (player_key, name, origin) VALUES (?, ?, ?)");
    db.exec("DELETE FROM player_source_ids; DELETE FROM player_names WHERE origin IN ('register', 'register_variant');");
    const keys = new Map<string, number>();
    for (const p of people) {
      if (!HEX_ID.test(p.identifier)) continue;
      if (Number(upd.run(p.name, p.unique_name || null, p.identifier).changes) === 0) ins.run(p.identifier, p.name, p.unique_name || null);
      const key = (keyOf.get(p.identifier) as { player_key: number }).player_key;
      keys.set(p.identifier, key);
      pn.run(key, p.name, "register");
      if (p.unique_name && p.unique_name !== p.name) pn.run(key, p.unique_name, "register");
      for (const [col, val] of Object.entries(p)) {
        if (!col.startsWith("key_") || !val) continue;
        sid.run(key, col.slice(4).replace(/_\d+$/, ""), val);
        sourceIds++;
      }
    }
    for (const v of variants) {
      const key = keys.get(v.identifier);
      if (key != null && v.name) pn.run(key, v.name, "register_variant");
    }
  });
  return { people: people.length, sourceIds, variants: variants.length, file: peopleRec.path };
}

interface Candidate { player_key: number; cricsheet_id: string; unique_name: string | null; evidence: string[] }

/** Players whose register name, unique name, variant or match name equals `name` exactly (see nameKey). */
function exactNameCandidates(db: DatabaseSync, name: string, byName: Map<string, { player_key: number; name: string; origin: string }[]>): Candidate[] {
  const hits = byName.get(nameKey(name)) ?? [];
  const out = new Map<number, Candidate>();
  for (const h of hits) {
    let c = out.get(h.player_key);
    if (!c) {
      const p = db.prepare("SELECT cricsheet_id, unique_name FROM players WHERE player_key = ?").get(h.player_key) as { cricsheet_id: string; unique_name: string | null };
      const played = all<{ code: string; n: number; last: string }>(db, `SELECT c.code, COUNT(*) n, MAX(m.start_date) last FROM match_players mp
        JOIN matches m USING (match_id) JOIN competitions c USING (competition_id) WHERE mp.player_key = ? GROUP BY c.code`, h.player_key);
      c = { player_key: h.player_key, cricsheet_id: p.cricsheet_id, unique_name: p.unique_name, evidence: [] };
      c.evidence.push(played.length ? `played: ${played.map((x) => `${x.code} ${x.n} matches (last ${x.last})`).join(", ")}` : "no matches in loaded competitions");
      out.set(h.player_key, c);
    }
    c.evidence.push(`${h.origin} name "${h.name}"`);
  }
  return [...out.values()];
}

interface Decision { source: string; source_key: string; decision: "link" | "distinct"; cricsheet_id?: string; decided_by: string; decided_at: string; note?: string }

export function bridgeIplWarehouse(db: DatabaseSync): { linked: number; queued: number; missingIds: string[]; total: number; synthetic: number } {
  if (!fs.existsSync(IPL_WAREHOUSE_PATH)) return { linked: 0, queued: 0, missingIds: [], total: 0, synthetic: 0 };
  const ipl = new DatabaseSync(IPL_WAREHOUSE_PATH, { readOnly: true });
  const rows = ipl.prepare("SELECT player_id, cricsheet_id, name FROM players").all() as { player_id: number; cricsheet_id: string; name: string }[];
  ipl.close();
  const decisions = fs.existsSync(IDENTITY_DECISIONS_PATH)
    ? (JSON.parse(fs.readFileSync(IDENTITY_DECISIONS_PATH, "utf8")) as { decisions: Decision[] }).decisions
    : [];
  const decided = new Map(decisions.filter((d) => d.source === "ipl_warehouse").map((d) => [d.source_key, d]));
  const byName = new Map<string, { player_key: number; name: string; origin: string }[]>();
  for (const r of all<{ player_key: number; name: string; origin: string }>(db, "SELECT player_key, name, origin FROM player_names")) {
    const k = nameKey(r.name);
    (byName.get(k) ?? byName.set(k, []).get(k)!).push(r);
  }
  const keyOf = new Map(all<{ cricsheet_id: string; player_key: number }>(db, "SELECT cricsheet_id, player_key FROM players").map((r) => [r.cricsheet_id, r.player_key]));
  const now = new Date().toISOString();
  let linked = 0, queued = 0, synthetic = 0;
  const missingIds: string[] = [];
  transaction(db, () => {
    db.exec("DELETE FROM identity_links WHERE source = 'ipl_warehouse'; DELETE FROM identity_review_queue WHERE source = 'ipl_warehouse';");
    const link = db.prepare(`INSERT INTO identity_links (source, source_key, source_name, player_key, method, confidence, decided_by, decided_at, note)
      VALUES ('ipl_warehouse', ?, ?, ?, ?, ?, ?, ?, ?)`);
    const queue = db.prepare(`INSERT INTO identity_review_queue (source, source_key, source_name, reason, candidates, status, created_at)
      VALUES ('ipl_warehouse', ?, ?, ?, ?, ?, ?)`);
    for (const r of rows) {
      const sourceKey = String(r.player_id);
      if (HEX_ID.test(r.cricsheet_id)) {
        const key = keyOf.get(r.cricsheet_id);
        if (key == null) { missingIds.push(r.cricsheet_id); continue; }
        link.run(sourceKey, r.name, key, "cricsheet_registry", "exact", "pipeline", now, null);
        linked++;
        continue;
      }
      synthetic++;
      const d = decided.get(sourceKey);
      if (d?.decision === "link" && d.cricsheet_id && keyOf.has(d.cricsheet_id)) {
        link.run(sourceKey, r.name, keyOf.get(d.cricsheet_id)!, "manual", "reviewed", d.decided_by, d.decided_at, d.note ?? null);
        linked++;
        continue;
      }
      const candidates = exactNameCandidates(db, r.name, byName);
      const reason = `IPL warehouse id "${r.cricsheet_id}" is not a Cricsheet identifier (squad-only player)`;
      queue.run(sourceKey, r.name, reason, JSON.stringify(candidates), d?.decision === "distinct" ? "distinct" : "open", now);
      queued++;
    }
  });
  return { linked, queued, missingIds, total: rows.length, synthetic };
}

export interface IdentityReport {
  generatedAt: string;
  register: { file: string | null; people: number; sourceIdsLoaded: number; variantNames: number; sourceCoverage: { source: string; players: number }[] };
  matchPlayers: { total: number; inRegister: number; notInRegister: { cricsheet_id: string; name: string | null }[] };
  byCompetition: { competition: string; players: number; batted: number; bowled: number }[];
  multiLeague: {
    distribution: { leagues: number; players: number }[];
    pairs: { a: string; b: string; players: number }[];
    iplPlayersElsewhere: { competition: string; players: number }[];
    mostTravelled: { cricsheet_id: string; name: string; leagues: number; detail: string }[];
  };
  collisions: {
    writtenNameSharedByDifferentPeople: { name: string; people: { cricsheet_id: string; unique_name: string | null; competitions: string }[] }[];
    registerNameSharedInLoadedData: number;
  };
  nameVariants: { cricsheet_id: string; unique_name: string | null; names: string[] }[];
  iplWarehouseBridge: { total: number; linkedExact: number; synthetic: number; queued: number; missingIds: string[] };
  reviewQueue: { source_key: string; source_name: string | null; status: string; candidates: Candidate[] }[];
}

export function buildIdentityReport(db: DatabaseSync, reg: ReturnType<typeof loadRegister>, bridge: ReturnType<typeof bridgeIplWarehouse>): IdentityReport {
  const comps = all<{ competition_id: number; code: string }>(db, "SELECT competition_id, code FROM competitions ORDER BY competition_id");
  const codeOf = new Map(comps.map((c) => [c.competition_id, c.code]));
  // Squad appearances per player per competition (info.players lists every member of each XI, plus substitutes).
  const appear = all<{ player_key: number; competition_id: number; n: number }>(db, `SELECT mp.player_key, m.competition_id, COUNT(*) n
    FROM match_players mp JOIN matches m USING (match_id) WHERE m.in_latest_source = 1 GROUP BY mp.player_key, m.competition_id`);
  const leagues = new Map<number, Map<string, number>>();
  for (const a of appear) {
    const m = leagues.get(a.player_key) ?? leagues.set(a.player_key, new Map()).get(a.player_key)!;
    m.set(codeOf.get(a.competition_id)!, a.n);
  }
  const playerInfo = new Map(all<{ player_key: number; cricsheet_id: string; name: string | null; unique_name: string | null; in_register: number }>(
    db, "SELECT player_key, cricsheet_id, name, unique_name, in_register FROM players WHERE player_key IN (SELECT DISTINCT player_key FROM match_players)",
  ).map((p) => [p.player_key, p]));

  const dist = new Map<number, number>();
  const pairs = new Map<string, number>();
  for (const [, m] of leagues) {
    dist.set(m.size, (dist.get(m.size) ?? 0) + 1);
    const codes = [...m.keys()].sort();
    for (let i = 0; i < codes.length; i++) for (let j = i + 1; j < codes.length; j++) {
      const k = `${codes[i]}|${codes[j]}`;
      pairs.set(k, (pairs.get(k) ?? 0) + 1);
    }
  }
  const mostTravelled = [...leagues.entries()]
    .filter(([, m]) => m.size >= 4)
    .sort((a, b) => b[1].size - a[1].size || [...b[1].values()].reduce((s, x) => s + x, 0) - [...a[1].values()].reduce((s, x) => s + x, 0))
    .slice(0, 40)
    .map(([k, m]) => {
      const p = playerInfo.get(k)!;
      return { cricsheet_id: p.cricsheet_id, name: p.unique_name ?? p.name ?? "", leagues: m.size, detail: [...m.entries()].map(([c, n]) => `${c} ${n}`).join(", ") };
    });

  const byCompetition = comps.map((c) => {
    const players = appear.filter((a) => a.competition_id === c.competition_id).length;
    const batted = (db.prepare(`SELECT COUNT(DISTINCT d.batter) n FROM deliveries d JOIN matches m USING (match_id) WHERE m.competition_id = ?`).get(c.competition_id) as { n: number }).n;
    const bowled = (db.prepare(`SELECT COUNT(DISTINCT d.bowler) n FROM deliveries d JOIN matches m USING (match_id) WHERE m.competition_id = ?`).get(c.competition_id) as { n: number }).n;
    return { competition: c.code, players, batted, bowled };
  });

  // The same written name used by different people (proof that nothing merges on names).
  const written = all<{ name: string; keys: string }>(db, `SELECT name, GROUP_CONCAT(player_key) keys FROM player_names WHERE origin = 'match'
    GROUP BY name HAVING COUNT(DISTINCT player_key) > 1 ORDER BY name`);
  const sharedName = written.map((w) => ({
    name: w.name,
    people: w.keys.split(",").map(Number).map((k) => {
      const p = playerInfo.get(k);
      return { cricsheet_id: p?.cricsheet_id ?? String(k), unique_name: p?.unique_name ?? null, competitions: [...(leagues.get(k)?.keys() ?? [])].join(", ") };
    }),
  }));
  const registerShared = (db.prepare(`SELECT COUNT(*) n FROM (SELECT name FROM players WHERE player_key IN (SELECT DISTINCT player_key FROM match_players)
    GROUP BY name HAVING COUNT(*) > 1)`).get() as { n: number }).n;

  const variants = all<{ player_key: number; names: string }>(db, `SELECT player_key, GROUP_CONCAT(name, ' | ') names FROM player_names WHERE origin = 'match'
    GROUP BY player_key HAVING COUNT(*) > 1`).map((v) => ({
    cricsheet_id: playerInfo.get(v.player_key)?.cricsheet_id ?? "", unique_name: playerInfo.get(v.player_key)?.unique_name ?? null, names: v.names.split(" | "),
  }));

  const iplCode = comps.find((c) => c.code === "ipl");
  const iplPlayers = new Set([...leagues.entries()].filter(([, m]) => m.has("ipl")).map(([k]) => k));
  const iplElsewhere = comps.filter((c) => c.code !== "ipl").map((c) => ({
    competition: c.code, players: [...iplPlayers].filter((k) => leagues.get(k)!.has(c.code)).length,
  }));

  const notInRegister = [...playerInfo.values()].filter((p) => !p.in_register).map((p) => ({ cricsheet_id: p.cricsheet_id, name: p.name }));
  const sourceCoverage = all<{ source: string; players: number }>(db, `SELECT source, COUNT(DISTINCT player_key) players FROM player_source_ids
    WHERE player_key IN (SELECT DISTINCT player_key FROM match_players) GROUP BY source ORDER BY players DESC`);
  const reviewQueue = all<{ source_key: string; source_name: string | null; status: string; candidates: string }>(db,
    "SELECT source_key, source_name, status, candidates FROM identity_review_queue ORDER BY source_name").map((r) => ({ ...r, candidates: JSON.parse(r.candidates) as Candidate[] }));

  return {
    generatedAt: new Date().toISOString(),
    register: { file: reg.file, people: reg.people, sourceIdsLoaded: reg.sourceIds, variantNames: reg.variants, sourceCoverage },
    matchPlayers: { total: playerInfo.size, inRegister: playerInfo.size - notInRegister.length, notInRegister },
    byCompetition,
    multiLeague: {
      distribution: [...dist.entries()].sort((a, b) => a[0] - b[0]).map(([leagues, players]) => ({ leagues, players })),
      pairs: [...pairs.entries()].map(([k, n]) => ({ a: k.split("|")[0], b: k.split("|")[1], players: n })).sort((x, y) => y.players - x.players),
      iplPlayersElsewhere: iplCode ? iplElsewhere : [],
      mostTravelled,
    },
    collisions: { writtenNameSharedByDifferentPeople: sharedName, registerNameSharedInLoadedData: registerShared },
    nameVariants: variants,
    iplWarehouseBridge: { total: bridge.total, linkedExact: bridge.linked, synthetic: bridge.synthetic, queued: bridge.queued, missingIds: bridge.missingIds },
    reviewQueue,
  };
}

export function identityMarkdown(r: IdentityReport): string {
  const L: string[] = [];
  L.push(`# Player identity report — ${r.generatedAt.slice(0, 10)}`, "");
  L.push("Canonical key: the Cricsheet registry identifier. Cross-league aggregation is an exact join on it; no record is merged on a name.", "");
  L.push("## Register", "");
  L.push(`- Source: \`${r.register.file}\` — ${r.register.people.toLocaleString("en-US")} people, ${r.register.variantNames.toLocaleString("en-US")} variant names (names.csv), ${r.register.sourceIdsLoaded.toLocaleString("en-US")} external ids.`);
  L.push(`- Players in loaded matches: **${r.matchPlayers.total.toLocaleString("en-US")}**; in the register: ${r.matchPlayers.inRegister.toLocaleString("en-US")}; not in the register: ${r.matchPlayers.notInRegister.length}.`);
  L.push(`- External-id coverage for those players: ${r.register.sourceCoverage.map((s) => `${s.source} ${s.players}`).join(", ")}.`, "");
  L.push("## Players per competition", "", "| Competition | In squads | Batted | Bowled |", "|---|---:|---:|---:|");
  for (const c of r.byCompetition) L.push(`| ${c.competition} | ${c.players} | ${c.batted} | ${c.bowled} |`);
  L.push("", "## Cross-league players", "");
  L.push("| Leagues played | Players |", "|---:|---:|");
  for (const d of r.multiLeague.distribution) L.push(`| ${d.leagues} | ${d.players} |`);
  L.push("", "IPL players who also appear in:", "");
  L.push(r.multiLeague.iplPlayersElsewhere.map((x) => `${x.competition} ${x.players}`).join(" · "), "");
  L.push("Shared players by competition pair:", "", "| Pair | Players |", "|---|---:|");
  for (const p of r.multiLeague.pairs) L.push(`| ${p.a} + ${p.b} | ${p.players} |`);
  L.push("", "Players in four or more Batch 1 competitions (squad appearances):", "", "| Player | Cricsheet id | Leagues | Matches by league |", "|---|---|---:|---|");
  for (const m of r.multiLeague.mostTravelled) L.push(`| ${m.name} | ${m.cricsheet_id} | ${m.leagues} | ${m.detail} |`);
  L.push("", "## Name collisions", "");
  L.push(`The same written name is used by **${r.collisions.writtenNameSharedByDifferentPeople.length}** different-person groups across the loaded files. They stay separate because the registry ids differ:`, "");
  L.push("| Written name | People (id · unique name · competitions) |", "|---|---|");
  for (const c of r.collisions.writtenNameSharedByDifferentPeople) L.push(`| ${c.name} | ${c.people.map((p) => `${p.cricsheet_id} · ${p.unique_name ?? "?"} · ${p.competitions}`).join("<br>")} |`);
  L.push("", `Register \`name\` values shared by more than one loaded player: ${r.collisions.registerNameSharedInLoadedData}. Display names should use \`unique_name\`.`, "");
  L.push("## Name variants (same person, different written names)", "");
  if (!r.nameVariants.length) L.push("None.");
  for (const v of r.nameVariants) L.push(`- ${v.unique_name ?? v.cricsheet_id} (${v.cricsheet_id}): ${v.names.join(" / ")}`);
  L.push("", "## IPL warehouse bridge (sqlite.db, read-only)", "");
  const b = r.iplWarehouseBridge;
  L.push(`- ${b.total} warehouse players; **${b.linkedExact} linked exactly** by Cricsheet identifier; ${b.synthetic} have synthetic ids; ${b.queued} queued for review.`);
  L.push(`- Warehouse identifiers not found in the register or loaded matches: ${b.missingIds.length ? b.missingIds.join(", ") : "none"}.`, "");
  L.push("## Review queue", "", "Candidates come from exact (case- and punctuation-insensitive) name equality only. Nothing here is linked until a decision is added to `manifests/identity-decisions.json`.", "");
  L.push("| Warehouse id | Warehouse name | Status | Candidates (evidence) |", "|---|---|---|---|");
  for (const q of r.reviewQueue) {
    const cands = q.candidates.length ? q.candidates.map((c) => `${c.cricsheet_id} ${c.unique_name ?? ""} — ${c.evidence.join("; ")}`).join("<br>") : "no exact-name candidate";
    L.push(`| ${q.source_key} | ${q.source_name ?? ""} | ${q.status} | ${cands} |`);
  }
  return L.join("\n") + "\n";
}

export function runIdentity(db: DatabaseSync): IdentityReport {
  const reg = loadRegister(db);
  const bridge = bridgeIplWarehouse(db);
  const report = buildIdentityReport(db, reg, bridge);
  ensureDir(REPORT_DIR);
  fs.writeFileSync(path.join(REPORT_DIR, `identity-${today()}.json`), JSON.stringify(report, null, 2));
  fs.writeFileSync(path.join(REPORT_DIR, `identity-${today()}.md`), identityMarkdown(report));
  setMeta(db, "identity_at", report.generatedAt);
  return report;
}

if (process.argv[1] && /identity\.ts$/.test(process.argv[1])) {
  const db = openGlobalDb();
  const r = runIdentity(db);
  console.log(`  register: ${r.register.people} people; match players ${r.matchPlayers.total} (${r.matchPlayers.notInRegister.length} not in register)`);
  console.log(`  multi-league: ${r.multiLeague.distribution.map((d) => `${d.leagues}→${d.players}`).join(", ")}`);
  console.log(`  IPL bridge: ${r.iplWarehouseBridge.linkedExact}/${r.iplWarehouseBridge.total} exact, ${r.iplWarehouseBridge.queued} queued`);
  console.log(`  written-name collisions: ${r.collisions.writtenNameSharedByDifferentPeople.length}; name variants: ${r.nameVariants.length}`);
  db.close();
}
