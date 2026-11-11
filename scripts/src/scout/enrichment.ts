// Scouting layer — attributes Cricsheet does not have, from named sources only.
//
// Two read-only sources already in the repository:
//   ipl_player_bio   artifacts/api-server/data/player-bio.json — bowling style and batting hand for IPL
//                    players. Its playerName is the name written in IPL match files, so a link is exact when
//                    that name belongs to exactly one player across the IPL files.
//   ipl_auction_2026 "2026 ipl auction player list*.csv" — official Capped/Uncapped/Associate status, bowling
//                    style, batting hand, country and specialism, by full name only. A link needs an exact
//                    name candidate AND corroboration (state association ↔ SMAT team, or 2025 IPL team), and
//                    stays 'corroborated_unreviewed'.
// Rows that cannot be linked to exactly one player are written to attribute_link_issues. Nothing is guessed.

import fs from "node:fs";
import path from "node:path";
import type { DatabaseSync } from "node:sqlite";
import { all, transaction } from "../global/db";
import { MANIFEST_DIR, REPO } from "../global/paths";
import { parseCsv } from "../global/csv";
import { nameKey } from "../global/identity";

export const BIO_PATH = path.join(REPO, "artifacts", "api-server", "data", "player-bio.json");

export function findAuctionCsv(): string | null {
  const f = fs.readdirSync(REPO).find((n) => /^2026 ipl auction player list.*\.csv$/i.test(n));
  return f ? path.join(REPO, f) : null;
}

export type BowlingType = "pace" | "spin" | "mixed" | "unknown";

/** Keyword classification of a written bowling style. Both kinds listed → mixed; neither → unknown. */
export function bowlingType(style: string): BowlingType {
  const s = style.toLowerCase();
  const spin = /(off ?break|off[- ]?spin|leg ?break|leg[- ]?spin|googly|orthodox|unorthodox|wrist ?spin|chinaman|slow left)/.test(s);
  const pace = /(fast|medium|seam)/.test(s);
  if (spin && pace) return "mixed";
  if (spin) return "spin";
  if (pace) return "pace";
  return "unknown";
}

export function battingHand(s: string): "left" | "right" | null {
  const t = s.toLowerCase();
  if (/^lhb$|left/.test(t)) return "left";
  if (/^rhb$|right/.test(t)) return "right";
  return null;
}

interface Attr { player_key: number; attribute: string; value: string; normalized: string | null; source: string; link_method: string; confidence: string; evidence: string }
interface Issue { source: string; source_key: string; name: string; issue: string; detail: string }

export interface EnrichmentSummary {
  bio: { rows: number; linked: number; noCandidate: number; ambiguous: number };
  auction: { rows: number; linked: number; noCandidate: number; ambiguous: number; notCorroborated: number };
  conflicts: number;
}

export function loadEnrichment(db: DatabaseSync): EnrichmentSummary {
  const attrs: Attr[] = [];
  const issues: Issue[] = [];
  const summary: EnrichmentSummary = {
    bio: { rows: 0, linked: 0, noCandidate: 0, ambiguous: 0 },
    auction: { rows: 0, linked: 0, noCandidate: 0, ambiguous: 0, notCorroborated: 0 },
    conflicts: 0,
  };

  // ── ipl_player_bio: exact link through names written in IPL match files ──
  const iplNames = new Map<string, Set<number>>();
  for (const r of all<{ listed_name: string; player_key: number }>(db, `SELECT DISTINCT mp.listed_name, mp.player_key FROM match_players mp
    JOIN matches m USING (match_id) JOIN competitions c USING (competition_id) WHERE c.code = 'ipl'`)) {
    (iplNames.get(r.listed_name) ?? iplNames.set(r.listed_name, new Set()).get(r.listed_name)!).add(r.player_key);
  }
  if (fs.existsSync(BIO_PATH)) {
    const bio = JSON.parse(fs.readFileSync(BIO_PATH, "utf8")) as Record<string, { playerName?: string; batStyle?: string; bowlStyle?: string }>;
    // The same playerName on several bio entries means at least one entry describes someone else: link none of them.
    const perName = new Map<string, number>();
    for (const b of Object.values(bio)) perName.set(b.playerName ?? "", (perName.get(b.playerName ?? "") ?? 0) + 1);
    for (const [slug, b] of Object.entries(bio)) {
      summary.bio.rows++;
      const name = b.playerName ?? "";
      if ((perName.get(name) ?? 0) > 1) {
        summary.bio.ambiguous++;
        issues.push({ source: "ipl_player_bio", source_key: slug, name, issue: "ambiguous", detail: `player-bio.json has ${perName.get(name)} entries named "${name}"` });
        continue;
      }
      const keys = iplNames.get(name);
      if (!keys || keys.size === 0) { summary.bio.noCandidate++; issues.push({ source: "ipl_player_bio", source_key: slug, name, issue: "no_candidate", detail: "name not written in any IPL match file" }); continue; }
      if (keys.size > 1) { summary.bio.ambiguous++; issues.push({ source: "ipl_player_bio", source_key: slug, name, issue: "ambiguous", detail: `IPL files use this name for ${keys.size} players` }); continue; }
      const pk = [...keys][0];
      summary.bio.linked++;
      const evidence = `player-bio.json "${slug}": playerName "${name}" is the IPL match-file name of exactly one player`;
      if (b.bowlStyle) attrs.push({ player_key: pk, attribute: "bowling_style", value: b.bowlStyle, normalized: bowlingType(b.bowlStyle), source: "ipl_player_bio", link_method: "ipl_match_name_exact", confidence: "exact", evidence });
      const hand = b.batStyle ? battingHand(b.batStyle) : null;
      if (b.batStyle && hand) attrs.push({ player_key: pk, attribute: "batting_hand", value: b.batStyle, normalized: hand, source: "ipl_player_bio", link_method: "ipl_match_name_exact", confidence: "exact", evidence });
    }
  }

  // ── ipl_auction_2026: exact-name candidates + corroboration ──
  const csv = findAuctionCsv();
  const maps = JSON.parse(fs.readFileSync(path.join(MANIFEST_DIR, "state-associations.json"), "utf8")) as { associations: Record<string, string[]>; iplTeams2025: Record<string, string> };
  if (csv) {
    const rows = parseCsv(fs.readFileSync(csv, "utf8"));
    const header = rows[0];
    const col = (label: string) => header.findIndex((h) => h.replace(/\s+/g, " ").trim() === label);
    const iFirst = col("First Name"), iLast = col("Surname"), iCountry = col("Country"), iAssoc = col("State Association"), iSpec = col("Specialism");
    const iCua = col("C/U/A"), iTeam = col("2025 Team"), iSr = col("List Sr. No.");
    const iBat = iSpec + 1, iBowl = iSpec + 2; // unlabelled columns after Specialism: batting hand, bowling style
    const byName = new Map<string, Set<number>>();
    for (const r of all<{ player_key: number; name: string }>(db, `SELECT pn.player_key, pn.name FROM player_names pn
      WHERE pn.player_key IN (SELECT DISTINCT player_key FROM match_players)`)) {
      const k = nameKey(r.name);
      (byName.get(k) ?? byName.set(k, new Set()).get(k)!).add(r.player_key);
    }
    const teamsOf = new Map<number, Set<string>>();
    for (const r of all<{ player_key: number; code: string; season_label: string; team: string }>(db, `SELECT DISTINCT mp.player_key, c.code, m.season_label, t.name team
      FROM match_players mp JOIN matches m USING (match_id) JOIN competitions c USING (competition_id) JOIN teams t ON t.team_id = mp.team_id
      WHERE c.code IN ('smat', 'ipl')`)) {
      const s = teamsOf.get(r.player_key) ?? teamsOf.set(r.player_key, new Set()).get(r.player_key)!;
      s.add(`${r.code}|${r.team}`);
      if (r.code === "ipl") s.add(`ipl${r.season_label}|${r.team}`);
    }
    for (const r of rows.slice(1)) {
      const first = (r[iFirst] ?? "").trim(), last = (r[iLast] ?? "").trim();
      if (!first && !last) continue;
      if (r[iCua] === "C/U/A" || first === "First Name") continue; // repeated page headers
      summary.auction.rows++;
      const full = `${first} ${last}`.trim();
      const sourceKey = r[iSr] || full;
      // Exact full name only. An initials form ("M Kumar") was tried and rejected: it linked Manvanth Kumar to
      // Mukesh Kumar, both in Delhi's 2025 squad, so team corroboration cannot rescue an initials match.
      const candidates = new Set<number>([...(byName.get(nameKey(full)) ?? [])]);
      if (!candidates.size) { summary.auction.noCandidate++; issues.push({ source: "ipl_auction_2026", source_key: sourceKey, name: full, issue: "no_candidate", detail: "no exact full-name match among players in the loaded matches" }); continue; }
      const assocTeams = maps.associations[(r[iAssoc] ?? "").trim()] ?? [];
      const iplTeam = maps.iplTeams2025[(r[iTeam] ?? "").trim()];
      const corroborated = [...candidates].filter((pk) => {
        const t = teamsOf.get(pk) ?? new Set();
        return assocTeams.some((name) => t.has(`smat|${name}`)) || (iplTeam != null && t.has(`ipl2025|${iplTeam}`));
      });
      if (corroborated.length === 0) { summary.auction.notCorroborated++; issues.push({ source: "ipl_auction_2026", source_key: sourceKey, name: full, issue: "not_corroborated", detail: `${candidates.size} name candidate(s); association "${r[iAssoc]}" / 2025 team "${r[iTeam]}" not seen for them` }); continue; }
      if (corroborated.length > 1) { summary.auction.ambiguous++; issues.push({ source: "ipl_auction_2026", source_key: sourceKey, name: full, issue: "ambiguous", detail: `${corroborated.length} corroborated candidates` }); continue; }
      const pk = corroborated[0];
      summary.auction.linked++;
      const via = assocTeams.length && [...(teamsOf.get(pk) ?? [])].some((x) => assocTeams.some((n) => x === `smat|${n}`)) ? `state association ${r[iAssoc]} ↔ SMAT team` : `2025 IPL team ${r[iTeam]}`;
      const evidence = `2026 auction list #${sourceKey} "${full}": exact name match, corroborated by ${via}; unreviewed`;
      const add = (attribute: string, value: string, normalized: string | null) => {
        if (value) attrs.push({ player_key: pk, attribute, value, normalized, source: "ipl_auction_2026", link_method: "name_exact+corroboration", confidence: "corroborated_unreviewed", evidence });
      };
      add("capped_status_2026", (r[iCua] ?? "").trim(), (r[iCua] ?? "").trim().toLowerCase() || null);
      add("auction_country", (r[iCountry] ?? "").trim(), null);
      add("auction_specialism", (r[iSpec] ?? "").trim(), null);
      add("bowling_style", (r[iBowl] ?? "").trim(), (r[iBowl] ?? "").trim() ? bowlingType(r[iBowl]) : null);
      const hand = battingHand((r[iBat] ?? "").trim());
      if (hand) add("batting_hand", (r[iBat] ?? "").trim(), hand);
    }
  }

  // Conflicts between sources (same attribute, different normalized value).
  const byPlayerAttr = new Map<string, Attr[]>();
  for (const a of attrs) (byPlayerAttr.get(`${a.player_key}|${a.attribute}`) ?? byPlayerAttr.set(`${a.player_key}|${a.attribute}`, []).get(`${a.player_key}|${a.attribute}`)!).push(a);
  for (const [k, list] of byPlayerAttr) {
    const vals = new Set(list.map((a) => a.normalized).filter((v) => v && v !== "unknown"));
    if (vals.size > 1) {
      summary.conflicts++;
      issues.push({ source: "conflict", source_key: k, name: list[0].value, issue: "conflict", detail: list.map((a) => `${a.source}: ${a.value}`).join(" vs ") });
    }
  }

  transaction(db, () => {
    db.exec("DELETE FROM player_attributes; DELETE FROM attribute_link_issues;");
    const ia = db.prepare(`INSERT OR REPLACE INTO player_attributes (player_key, attribute, value, normalized, source, link_method, confidence, evidence)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)`);
    for (const a of attrs) ia.run(a.player_key, a.attribute, a.value, a.normalized, a.source, a.link_method, a.confidence, a.evidence);
    const ii = db.prepare("INSERT OR REPLACE INTO attribute_link_issues (source, source_key, name, issue, detail) VALUES (?, ?, ?, ?, ?)");
    for (const i of issues) ii.run(i.source, i.source_key, i.name, i.issue, i.detail);
  });
  return summary;
}

export interface EffectiveBowlingType { type: BowlingType | "conflict"; style: string | null; source: string | null; confidence: string | null }

/** The bowling type a scouting query may rely on: exact source first, then corroborated; disagreement → conflict. */
export function effectiveBowlingType(rows: { value: string; normalized: string | null; source: string; confidence: string }[]): EffectiveBowlingType {
  const usable = rows.filter((r) => r.normalized && r.normalized !== "unknown");
  if (!usable.length) return { type: "unknown", style: null, source: null, confidence: null };
  const kinds = new Set(usable.map((r) => r.normalized));
  if (kinds.size > 1) return { type: "conflict", style: usable.map((r) => `${r.source}: ${r.value}`).join(" vs "), source: null, confidence: null };
  const best = usable.find((r) => r.confidence === "exact") ?? usable[0];
  return { type: best.normalized as BowlingType, style: best.value, source: best.source, confidence: best.confidence };
}
