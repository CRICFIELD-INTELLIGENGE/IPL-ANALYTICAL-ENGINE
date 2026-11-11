// Global data engine — Cricsheet JSON → normalized global.db tables.
//
//   pnpm --filter @workspace/scripts run global:normalize [--only ipl,smat] [--force]
//
// Reads match files straight out of the newest stored archive of each enabled
// competition. Incremental: a match is (re)ingested only when it is new or its
// zip entry CRC changed (Cricsheet bumps meta.revision when it corrects a file);
// --force re-ingests everything. Matches that disappear from the newest archive
// are flagged (in_latest_source = 0), never deleted. Unknown JSON keys are kept
// in `extra` columns and counted in schema_drift.

import fs from "node:fs";
import type { DatabaseSync, StatementSync } from "node:sqlite";
import { all, openGlobalDb, one, setMeta, transaction } from "./db";
import { MANIFEST_DIR, fromGlobal, loadSources, parseArgs, type CompetitionSource } from "./paths";
import { latestAcquisition, readAcquisitions, type AcquisitionRecord } from "./acquire";
import { listEntries, readEntries } from "./zip";

type Json = Record<string, unknown>;

const KNOWN = {
  meta: ["data_version", "created", "revision"],
  info: ["balls_per_over", "bowl_out", "city", "dates", "event", "gender", "match_type", "match_type_number", "missing", "officials",
    "outcome", "overs", "player_of_match", "players", "registry", "season", "supersubs", "team_type", "teams", "toss", "venue"],
  event: ["name", "match_number", "group", "stage"],
  outcome: ["winner", "by", "method", "result", "eliminator", "bowl_out"],
  by: ["runs", "wickets", "innings"],
  toss: ["winner", "decision", "uncontested"],
  registry: ["people", "venues"],
  innings: ["team", "overs", "powerplays", "target", "penalty_runs", "absent_hurt", "declared", "forfeited", "super_over", "miscounted_overs"],
  over: ["over", "deliveries"],
  delivery: ["batter", "bowler", "non_striker", "runs", "extras", "wickets", "replacements", "review", "actual_delivery"],
  runs: ["batter", "extras", "total", "non_boundary"],
  extras: ["byes", "legbyes", "noballs", "penalty", "wides"],
  wicket: ["kind", "player_out", "fielders"],
  fielder: ["name", "substitute"],
  review: ["by", "batter", "decision", "type", "umpire", "umpires_call"],
  replMatch: ["in", "out", "team", "reason"],
  replRole: ["in", "out", "role", "reason"],
  replacements: ["match", "role"],
} as const;
const KNOWN_SETS = Object.fromEntries(Object.entries(KNOWN).map(([k, v]) => [k, new Set<string>(v)])) as Record<keyof typeof KNOWN, Set<string>>;

const num = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) ? v : null);
const str = (v: unknown): string | null => (v == null ? null : String(v));
const flag = (v: unknown): number => (v ? 1 : 0);
const json = (v: unknown): string | null => (v == null ? null : JSON.stringify(v));
const obj = (v: unknown): Json => (v && typeof v === "object" && !Array.isArray(v) ? (v as Json) : {});
const arr = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);

export interface CompetitionIngestSummary {
  code: string;
  archive: string;
  entries: number;
  added: number;
  updated: number;
  unchanged: number;
  missingFromLatest: number;
  conflicts: { matchId: number; existingCompetition: string }[];
  readmeListed: number | null;
  readmeOnly: number[];
  zipOnly: number[];
  unregisteredNames: number;
  changedMatchIds: number[];
}

/** Holds prepared statements and id caches for one ingest session. */
export class Ingestor {
  private s: Record<string, StatementSync>;
  private players = new Map<string, number>();
  private teams = new Map<string, number>();
  private venues = new Map<string, number>();
  private seenNames = new Set<string>();
  private drift = new Map<string, { n: number; example: number }>();
  unregistered = 0;

  constructor(private db: DatabaseSync) {
    const p = (sql: string) => db.prepare(sql);
    this.s = {
      playerIns: p("INSERT INTO players (cricsheet_id, name, in_register) VALUES (?, ?, 0) RETURNING player_key"),
      playerName: p("INSERT OR IGNORE INTO player_names (player_key, name, origin) VALUES (?, ?, 'match')"),
      teamIns: p("INSERT INTO teams (competition_id, name) VALUES (?, ?) RETURNING team_id"),
      venueIns: p("INSERT INTO venues (venue_key, cricsheet_venue_id, name, city) VALUES (?, ?, ?, ?) RETURNING venue_id"),
      venueName: p("INSERT OR IGNORE INTO venue_names (venue_id, name, city) VALUES (?, ?, ?)"),
      match: p(`INSERT INTO matches (match_id, competition_id, season_label, start_date, end_date, dates, gender, team_type, match_type,
        match_type_number, balls_per_over, scheduled_overs, team1_id, team2_id, venue_id, city, event_name, event_match_number, event_group,
        stage, toss_winner_id, toss_decision, toss_uncontested, winner_id, result, method, win_by_runs, win_by_wickets, win_by_innings,
        eliminator_id, bowl_out, player_of_match, officials, supersubs, missing, extra_info, data_version, created, revision,
        source_file_id, entry_crc32, in_latest_source)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,1)`),
      matchPlayer: p("INSERT OR IGNORE INTO match_players (match_id, player_key, team_id, listed_name) VALUES (?, ?, ?, ?)"),
      innings: p(`INSERT INTO innings (match_id, innings_no, batting_team_id, bowling_team_id, super_over, declared, forfeited, target_runs,
        target_overs, penalty_pre, penalty_post, absent_hurt, miscounted_overs, extra) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`),
      powerplay: p("INSERT INTO powerplays (match_id, innings_no, n, from_over, to_over, type) VALUES (?, ?, ?, ?, ?, ?)"),
      delivery: p(`INSERT INTO deliveries (match_id, innings_no, over_no, seq, actual_delivery, batter, non_striker, bowler, runs_batter,
        runs_extras, runs_total, non_boundary, wides, noballs, byes, legbyes, penalty, extra) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`),
      wicket: p("INSERT INTO wickets (match_id, innings_no, over_no, seq, n, kind, player_out) VALUES (?, ?, ?, ?, ?, ?, ?)"),
      fielder: p(`INSERT INTO wicket_fielders (match_id, innings_no, over_no, seq, n, f, player_key, name, substitute)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`),
      replacement: p(`INSERT INTO replacements (match_id, innings_no, over_no, seq, scope, n, team_id, player_in, player_out, role, reason)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`),
      deliveryExtra: p("UPDATE deliveries SET extra = ? WHERE match_id = ? AND innings_no = ? AND over_no = ? AND seq = ?"),
      review: p(`INSERT INTO reviews (match_id, innings_no, over_no, seq, by_team_id, batter, decision, type, umpire, umpires_call)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`),
    };
    for (const r of all<{ cricsheet_id: string; player_key: number }>(db, "SELECT cricsheet_id, player_key FROM players")) this.players.set(r.cricsheet_id, r.player_key);
    for (const r of all<{ competition_id: number; name: string; team_id: number }>(db, "SELECT competition_id, name, team_id FROM teams")) this.teams.set(`${r.competition_id}|${r.name}`, r.team_id);
    for (const r of all<{ venue_key: string; venue_id: number }>(db, "SELECT venue_key, venue_id FROM venues")) this.venues.set(r.venue_key, r.venue_id);
  }

  private noteUnknown(o: Json, known: Set<string>, path: string, matchId: number, sink: Json | null): void {
    for (const k of Object.keys(o)) {
      if (known.has(k)) continue;
      const key = `${path}.${k}`;
      const d = this.drift.get(key);
      if (d) d.n++;
      else this.drift.set(key, { n: 1, example: matchId });
      if (sink) sink[key] = o[k];
    }
  }

  private player(registry: Json, name: string, competitionCode: string): number {
    const registered = typeof registry[name] === "string" ? (registry[name] as string) : null;
    if (!registered) this.unregistered++;
    const id = registered ?? `unreg:${competitionCode}:${name}`;
    let key = this.players.get(id);
    if (key == null) {
      key = (this.s.playerIns.get(id, name) as { player_key: number }).player_key;
      this.players.set(id, key);
    }
    const seen = `${key}|${name}`;
    if (!this.seenNames.has(seen)) {
      this.seenNames.add(seen);
      this.s.playerName.run(key, name);
    }
    return key;
  }

  private team(competitionId: number, name: string): number {
    const k = `${competitionId}|${name}`;
    let id = this.teams.get(k);
    if (id == null) {
      id = (this.s.teamIns.get(competitionId, name) as { team_id: number }).team_id;
      this.teams.set(k, id);
    }
    return id;
  }

  private venue(name: string, city: string | null, cricsheetVenueId: string | null): number {
    const key = cricsheetVenueId ?? `name:${name}|${city ?? ""}`;
    let id = this.venues.get(key);
    if (id == null) {
      id = (this.s.venueIns.get(key, cricsheetVenueId, name, city) as { venue_id: number }).venue_id;
      this.venues.set(key, id);
    }
    this.s.venueName.run(id, name, city ?? "");
    return id;
  }

  /** Inserts one match (callers delete an older copy first). */
  ingestMatch(c: { id: number; code: string }, sourceFileId: number, matchId: number, crc: number, m: Json): void {
    const meta = obj(m.meta);
    const info = obj(m.info);
    const extraInfo: Json = {};
    this.noteUnknown(meta, KNOWN_SETS.meta, "meta", matchId, extraInfo);
    this.noteUnknown(info, KNOWN_SETS.info, "info", matchId, extraInfo);
    const event = obj(info.event);
    const outcome = obj(info.outcome);
    const by = obj(outcome.by);
    const toss = obj(info.toss);
    const registryAll = obj(info.registry);
    this.noteUnknown(event, KNOWN_SETS.event, "info.event", matchId, extraInfo);
    this.noteUnknown(outcome, KNOWN_SETS.outcome, "info.outcome", matchId, extraInfo);
    this.noteUnknown(by, KNOWN_SETS.by, "info.outcome.by", matchId, extraInfo);
    this.noteUnknown(toss, KNOWN_SETS.toss, "info.toss", matchId, extraInfo);
    this.noteUnknown(registryAll, KNOWN_SETS.registry, "info.registry", matchId, extraInfo);
    const reg = obj(registryAll.people);
    const venueReg = obj(registryAll.venues);

    const teamNames = arr(info.teams).map(String);
    if (teamNames.length !== 2) throw new Error(`match ${matchId}: expected 2 teams, found ${teamNames.length}`);
    const t1 = this.team(c.id, teamNames[0]);
    const t2 = this.team(c.id, teamNames[1]);
    const teamId = (name: unknown) => (name == null ? null : this.team(c.id, String(name)));
    const other = (id: number) => (id === t1 ? t2 : id === t2 ? t1 : null);
    const pk = (name: unknown) => this.player(reg, String(name), c.code);

    const dates = arr(info.dates).map(String);
    const venueName = str(info.venue);
    const city = str(info.city);
    const venueId = venueName ? this.venue(venueName, city, typeof venueReg[venueName] === "string" ? (venueReg[venueName] as string) : null) : null;

    this.s.match.run(
      matchId, c.id, String(info.season ?? ""), dates[0] ?? "", dates[dates.length - 1] ?? dates[0] ?? "", JSON.stringify(dates),
      String(info.gender ?? ""), String(info.team_type ?? ""), String(info.match_type ?? ""), num(info.match_type_number),
      num(info.balls_per_over) ?? 6, num(info.overs), t1, t2, venueId, city,
      str(event.name), str(event.match_number), str(event.group), str(event.stage),
      teamId(toss.winner), str(toss.decision), toss.uncontested == null ? null : flag(toss.uncontested),
      teamId(outcome.winner), str(outcome.result), str(outcome.method), num(by.runs), num(by.wickets), num(by.innings),
      teamId(outcome.eliminator), json(outcome.bowl_out ?? info.bowl_out),
      json(arr(info.player_of_match).map(pk)), json(info.officials), json(info.supersubs), json(info.missing),
      Object.keys(extraInfo).length ? JSON.stringify(extraInfo) : null,
      String(meta.data_version ?? ""), str(meta.created), num(meta.revision), sourceFileId, crc,
    );

    for (const [team, names] of Object.entries(obj(info.players))) {
      const tid = this.team(c.id, team);
      for (const n of arr(names)) this.s.matchPlayer.run(matchId, pk(n), tid, String(n));
    }

    arr(m.innings).forEach((rawInn, idx) => {
      const inn = obj(rawInn);
      const no = idx + 1;
      const innExtra: Json = {};
      this.noteUnknown(inn, KNOWN_SETS.innings, "innings", matchId, innExtra);
      const bat = this.team(c.id, String(inn.team));
      const target = obj(inn.target);
      const pen = obj(inn.penalty_runs);
      const absent = arr(inn.absent_hurt);
      this.s.innings.run(
        matchId, no, bat, other(bat), flag(inn.super_over), flag(inn.declared), flag(inn.forfeited),
        num(target.runs), num(target.overs), num(pen.pre), num(pen.post),
        absent.length ? JSON.stringify(absent.map(pk)) : null, json(inn.miscounted_overs),
        Object.keys(innExtra).length ? JSON.stringify(innExtra) : null,
      );
      arr(inn.powerplays).forEach((pp, n) => {
        const o = obj(pp);
        this.s.powerplay.run(matchId, no, n, num(o.from) ?? 0, num(o.to) ?? 0, String(o.type ?? ""));
      });
      for (const rawOver of arr(inn.overs)) {
        const over = obj(rawOver);
        this.noteUnknown(over, KNOWN_SETS.over, "over", matchId, null);
        const overNo = num(over.over) ?? 0;
        arr(over.deliveries).forEach((rawBall, seq) => this.ingestBall(matchId, no, overNo, seq, obj(rawBall), reg, pk, teamId));
      }
    });
  }

  private ingestBall(
    matchId: number, no: number, overNo: number, seq: number, d: Json, reg: Json,
    pk: (name: unknown) => number, teamId: (name: unknown) => number | null,
  ): void {
    const extra: Json = {};
    this.noteUnknown(d, KNOWN_SETS.delivery, "delivery", matchId, extra);
    const runs = obj(d.runs);
    const ex = obj(d.extras);
    this.noteUnknown(runs, KNOWN_SETS.runs, "delivery.runs", matchId, extra);
    this.noteUnknown(ex, KNOWN_SETS.extras, "delivery.extras", matchId, extra);
    this.s.delivery.run(
      matchId, no, overNo, seq, d.actual_delivery == null ? null : String(d.actual_delivery),
      pk(d.batter), pk(d.non_striker), pk(d.bowler),
      num(runs.batter) ?? 0, num(runs.extras) ?? 0, num(runs.total) ?? 0, flag(runs.non_boundary),
      num(ex.wides) ?? 0, num(ex.noballs) ?? 0, num(ex.byes) ?? 0, num(ex.legbyes) ?? 0, num(ex.penalty) ?? 0,
      null,
    );
    arr(d.wickets).forEach((rw, n) => {
      const w = obj(rw);
      this.noteUnknown(w, KNOWN_SETS.wicket, "delivery.wickets[]", matchId, extra);
      this.s.wicket.run(matchId, no, overNo, seq, n, String(w.kind ?? ""), pk(w.player_out));
      arr(w.fielders).forEach((rf, f) => {
        const fo = obj(rf);
        this.noteUnknown(fo, KNOWN_SETS.fielder, "delivery.wickets[].fielders[]", matchId, extra);
        const name = String(fo.name ?? "");
        // A fielder missing from the registry keeps the written name but gets no player key,
        // so substitutes listed only by name never mint a synthetic identity.
        const registered = typeof reg[name] === "string";
        if (!registered) this.noteUnknown({ [name]: true }, new Set(), "identity.unregistered_fielder", matchId, null);
        const key = registered ? pk(name) : null;
        this.s.fielder.run(matchId, no, overNo, seq, n, f, key, name, flag(fo.substitute));
      });
    });
    const repl = obj(d.replacements);
    this.noteUnknown(repl, KNOWN_SETS.replacements, "delivery.replacements", matchId, extra);
    arr(repl.match).forEach((rr, n) => {
      const r = obj(rr);
      this.noteUnknown(r, KNOWN_SETS.replMatch, "delivery.replacements.match[]", matchId, extra);
      this.s.replacement.run(matchId, no, overNo, seq, "match", n, teamId(r.team), r.in == null ? null : pk(r.in), r.out == null ? null : pk(r.out), null, str(r.reason));
    });
    arr(repl.role).forEach((rr, n) => {
      const r = obj(rr);
      this.noteUnknown(r, KNOWN_SETS.replRole, "delivery.replacements.role[]", matchId, extra);
      this.s.replacement.run(matchId, no, overNo, seq, "role", n, null, r.in == null ? null : pk(r.in), r.out == null ? null : pk(r.out), str(r.role), str(r.reason));
    });
    if (d.review) {
      const r = obj(d.review);
      this.noteUnknown(r, KNOWN_SETS.review, "delivery.review", matchId, extra);
      this.s.review.run(matchId, no, overNo, seq, teamId(r.by), r.batter == null ? null : pk(r.batter), str(r.decision), str(r.type),
        str(r.umpire), r.umpires_call == null ? null : flag(r.umpires_call));
    }
    if (Object.keys(extra).length) this.s.deliveryExtra.run(JSON.stringify(extra), matchId, no, overNo, seq);
  }

  flushDrift(competitionId: number): void {
    const st = this.db.prepare(`INSERT INTO schema_drift (competition_id, path, occurrences, example_match_id) VALUES (?, ?, ?, ?)
      ON CONFLICT(competition_id, path) DO UPDATE SET occurrences = occurrences + excluded.occurrences`);
    for (const [path, d] of this.drift) st.run(competitionId, path, d.n, d.example);
    this.drift.clear();
  }
}

const CHILD_TABLES = ["match_players", "innings", "powerplays", "deliveries", "wickets", "wicket_fielders", "replacements", "reviews"];

export function deleteMatch(db: DatabaseSync, matchId: number): void {
  for (const t of CHILD_TABLES) db.prepare(`DELETE FROM ${t} WHERE match_id = ?`).run(matchId);
  db.prepare("DELETE FROM matches WHERE match_id = ?").run(matchId);
}

export function upsertCompetition(db: DatabaseSync, c: CompetitionSource): number {
  db.prepare(`INSERT INTO competitions (code, name, region, format, gender, team_type, source, source_slug, batch, catalogue_matches)
    VALUES (?, ?, ?, ?, ?, ?, 'cricsheet', ?, ?, ?)
    ON CONFLICT(code) DO UPDATE SET name = excluded.name, region = excluded.region, format = excluded.format, gender = excluded.gender,
      team_type = excluded.team_type, source_slug = excluded.source_slug, batch = excluded.batch, catalogue_matches = excluded.catalogue_matches`)
    .run(c.code, c.name, c.region, c.format, c.gender, c.teamType, c.slug, c.batch, c.catalogueMatches);
  return one<{ competition_id: number }>(db, "SELECT competition_id FROM competitions WHERE code = ?", c.code)!.competition_id;
}

export function upsertSourceFile(db: DatabaseSync, rec: AcquisitionRecord): number {
  db.prepare(`INSERT OR IGNORE INTO source_files (kind, source_key, url, path, sha256, bytes, last_modified, retrieved_at, entries)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`)
    .run(rec.kind, rec.key, rec.url, rec.path, rec.sha256, rec.bytes, rec.lastModified, rec.retrievedAt, rec.entries ?? null);
  return one<{ source_file_id: number }>(db, "SELECT source_file_id FROM source_files WHERE sha256 = ?", rec.sha256)!.source_file_id;
}

/** Match ids listed in a Cricsheet archive README ("2026-01-25 - club - SAT - male - 1494286 - A vs B"). */
export function readmeMatchIds(text: string): number[] {
  const ids: number[] = [];
  for (const line of text.split(/\r?\n/)) {
    const m = /^\d{4}-\d{2}-\d{2} - [^-]+ - [^-]+ - [^-]+ - (\d+) - /.exec(line);
    if (m) ids.push(Number(m[1]));
  }
  return ids;
}

/** Ingests one archive buffer for one competition. Pure with respect to the filesystem (used by tests). */
export function ingestArchive(
  db: DatabaseSync, c: CompetitionSource, sourceFileId: number, buf: Uint8Array, opts: { force?: boolean; archiveLabel?: string } = {},
): CompetitionIngestSummary {
  const competitionId = upsertCompetition(db, c);
  const entries = listEntries(buf);
  const jsonEntries = entries.filter((e) => /^\d+\.json$/.test(e.name));
  const summary: CompetitionIngestSummary = {
    code: c.code, archive: opts.archiveLabel ?? "", entries: jsonEntries.length, added: 0, updated: 0, unchanged: 0, missingFromLatest: 0,
    conflicts: [], readmeListed: null, readmeOnly: [], zipOnly: [], unregisteredNames: 0, changedMatchIds: [],
  };

  const readme = entries.find((e) => e.name === "README.txt");
  if (readme) {
    const [{ data }] = [...readEntries(buf, [readme.name])];
    const listed = new Set(readmeMatchIds(new TextDecoder().decode(data)));
    const inZip = new Set(jsonEntries.map((e) => Number(e.name.replace(".json", ""))));
    summary.readmeListed = listed.size;
    summary.readmeOnly = [...listed].filter((id) => !inZip.has(id));
    summary.zipOnly = [...inZip].filter((id) => !listed.has(id));
  }

  const existing = new Map(
    all<{ match_id: number; competition_id: number; entry_crc32: number; code: string }>(
      db, "SELECT m.match_id, m.competition_id, m.entry_crc32, c.code FROM matches m JOIN competitions c USING (competition_id)",
    ).map((r) => [r.match_id, r]),
  );
  const todo: { name: string; matchId: number; crc: number; update: boolean }[] = [];
  for (const e of jsonEntries) {
    const matchId = Number(e.name.replace(".json", ""));
    const prev = existing.get(matchId);
    if (prev && prev.competition_id !== competitionId) { summary.conflicts.push({ matchId, existingCompetition: prev.code }); continue; }
    if (prev && !opts.force && prev.entry_crc32 >>> 0 === e.crc32 >>> 0) { summary.unchanged++; continue; }
    todo.push({ name: e.name, matchId, crc: e.crc32 >>> 0, update: !!prev });
  }

  const ing = new Ingestor(db);
  const decoder = new TextDecoder();
  transaction(db, () => {
    const crcByName = new Map(todo.map((t) => [t.name, t]));
    for (const { entry, data } of readEntries(buf, todo.map((t) => t.name))) {
      const t = crcByName.get(entry.name)!;
      if (t.update) deleteMatch(db, t.matchId);
      ing.ingestMatch({ id: competitionId, code: c.code }, sourceFileId, t.matchId, t.crc, JSON.parse(decoder.decode(data)) as Json);
      if (t.update) summary.updated++;
      else summary.added++;
      summary.changedMatchIds.push(t.matchId);
    }
    // Provenance points at the newest archive that contains each match; flag matches it no longer contains.
    const inZip = jsonEntries.map((e) => Number(e.name.replace(".json", "")));
    db.exec("CREATE TEMP TABLE IF NOT EXISTS _zip_ids (match_id INTEGER PRIMARY KEY)");
    db.exec("DELETE FROM _zip_ids");
    const ins = db.prepare("INSERT OR IGNORE INTO _zip_ids (match_id) VALUES (?)");
    for (const id of inZip) ins.run(id);
    db.prepare(`UPDATE matches SET source_file_id = ?, in_latest_source = 1
      WHERE competition_id = ? AND match_id IN (SELECT match_id FROM _zip_ids)`).run(sourceFileId, competitionId);
    const gone = db.prepare(`UPDATE matches SET in_latest_source = 0
      WHERE competition_id = ? AND match_id NOT IN (SELECT match_id FROM _zip_ids)`).run(competitionId);
    summary.missingFromLatest = Number(gone.changes);
    refreshSeasons(db, competitionId);
    ing.flushDrift(competitionId);
  });
  summary.unregisteredNames = ing.unregistered;
  return summary;
}

export function refreshSeasons(db: DatabaseSync, competitionId: number): void {
  db.prepare("DELETE FROM seasons WHERE competition_id = ?").run(competitionId);
  db.prepare(`INSERT INTO seasons (competition_id, season_label, season_year, start_date, end_date, matches)
    SELECT competition_id, season_label, CAST(substr(MIN(start_date), 1, 4) AS INTEGER), MIN(start_date), MAX(end_date), COUNT(*)
    FROM matches WHERE competition_id = ? AND in_latest_source = 1 GROUP BY season_label`).run(competitionId);
}

export function loadTeamAliases(db: DatabaseSync): number {
  const file = `${MANIFEST_DIR}/team-aliases.json`;
  if (!fs.existsSync(file)) return 0;
  const { aliases } = JSON.parse(fs.readFileSync(file, "utf8")) as { aliases: { competition: string; alias: string; canonical: string; source: string }[] };
  let n = 0;
  for (const a of aliases) {
    const c = one<{ competition_id: number }>(db, "SELECT competition_id FROM competitions WHERE code = ?", a.competition);
    if (!c) continue;
    db.prepare(`INSERT INTO team_aliases (competition_id, alias_name, canonical_name, source_note) VALUES (?, ?, ?, ?)
      ON CONFLICT(competition_id, alias_name) DO UPDATE SET canonical_name = excluded.canonical_name, source_note = excluded.source_note`)
      .run(c.competition_id, a.alias, a.canonical, a.source);
    n++;
  }
  return n;
}

export function normalize(db: DatabaseSync, opts: { only?: Set<string> | null; force?: boolean } = {}): CompetitionIngestSummary[] {
  const sources = loadSources();
  const records = readAcquisitions();
  const out: CompetitionIngestSummary[] = [];
  for (const c of sources.competitions.filter((c) => c.enabled && (!opts.only || opts.only.has(c.code)))) {
    const rec = latestAcquisition(c.slug, records);
    if (!rec) { console.warn(`  ${c.code}: no archive acquired yet — run global:acquire`); continue; }
    if (opts.force) {
      const cid = one<{ competition_id: number }>(db, "SELECT competition_id FROM competitions WHERE code = ?", c.code)?.competition_id;
      if (cid != null) db.prepare("DELETE FROM schema_drift WHERE competition_id = ?").run(cid);
    }
    const started = performance.now();
    const sourceFileId = upsertSourceFile(db, rec);
    const buf = new Uint8Array(fs.readFileSync(fromGlobal(rec.path)));
    const s = ingestArchive(db, c, sourceFileId, buf, { force: opts.force, archiveLabel: rec.path });
    out.push(s);
    const ms = Math.round(performance.now() - started);
    console.log(`  ${c.code.padEnd(6)} ${s.entries} files: +${s.added} new, ${s.updated} updated, ${s.unchanged} unchanged, ` +
      `${s.missingFromLatest} no longer in source, ${s.conflicts.length} id conflicts (${ms} ms)`);
  }
  loadTeamAliases(db);
  setMeta(db, "normalized_at", new Date().toISOString());
  return out;
}

if (process.argv[1] && /normalize\.ts$/.test(process.argv[1])) {
  const { only, flags } = parseArgs(process.argv.slice(2));
  const db = openGlobalDb();
  console.log("Normalizing Cricsheet archives into global.db");
  normalize(db, { only, force: flags.has("force") });
  db.close();
}
