// Shared test fixture: one T20 (A 20/3 beats B 12/1 by 8 runs) plus a super-over innings, as Cricsheet JSON.

import { strToU8, zipSync } from "fflate";
import type { DatabaseSync } from "node:sqlite";
import { ingestArchive } from "../normalize";
import type { CompetitionSource } from "../paths";
export const comp = (code: string): CompetitionSource => ({
  code, name: `Test ${code}`, region: "Test", format: "T20", gender: "male", teamType: "club", slug: `${code}_test_json`, batch: 0, enabled: true, catalogueMatches: 1,
});

export type Ball = Record<string, unknown>;
export const d = (batter: string, nonStriker: string, bowler: string, bat: number, extras: Record<string, number> = {}, more: Ball = {}): Ball => {
  const ex = Object.values(extras).reduce((s, x) => s + x, 0);
  return { batter, non_striker: nonStriker, bowler, runs: { batter: bat, extras: ex, total: bat + ex }, ...(ex ? { extras } : {}), ...more };
};

/** One T20: A 20/3 beats B 12/1 by 8 runs, plus a super-over innings that must be excluded from stats. */
export function fixture(registry: Record<string, string>, revision = 1, tamper = false): Record<string, unknown> {
  const over0 = [
    d("a1", "a2", "b1", 1),
    d("a2", "a1", "b1", 0, { wides: 1 }),
    d("a2", "a1", "b1", 4, { noballs: 1 }),
    d("a2", "a1", "b1", 0, { legbyes: 1 }),
    { ...d("a1", "a2", "b1", 4), runs: { batter: 4, extras: 0, total: 4, non_boundary: true } },
    d("a1", "a2", "b1", 6),
    d("a1", "a2", "b1", 0, {}, { wickets: [{ kind: "caught", player_out: "a1", fielders: [{ name: "b2" }] }],
      review: { by: "A", batter: "a1", decision: "upheld", type: "wicket", umpire: "U One" } }),
    d("a3", "a2", "b1", 0, { byes: 2 }, { foo: "kept" }),
  ];
  if (tamper) over0[0] = { ...over0[0], runs: { batter: 1, extras: 0, total: 3 } };
  const over1 = [
    d("a3", "a2", "b3", 0),
    d("a3", "a2", "b3", 0, {}, { wickets: [{ kind: "run out", player_out: "a2", fielders: [{ name: "b4", substitute: true }] }] }),
    d("a3", "a4", "b3", 0, {}, { wickets: [{ kind: "retired hurt", player_out: "a3" }] }),
    d("a4", "a5", "b3", 0, {}, { wickets: [{ kind: "stumped", player_out: "a4", fielders: [{ name: "b4" }] }] }),
  ];
  const chase = [
    d("b1", "b2", "a1", 4, {}, { replacements: { match: [{ in: "b4", out: "b3", team: "B", reason: "impact_player" }] } }),
    d("b1", "b2", "a1", 1),
    d("b2", "b1", "a1", 6),
    d("b2", "b1", "a1", 1),
    d("b1", "b2", "a1", 0),
    d("b1", "b2", "a1", 0, {}, { wickets: [{ kind: "retired out", player_out: "b1" }] }),
  ];
  return {
    meta: { data_version: "1.3.0", created: "2026-01-01", revision },
    info: {
      balls_per_over: 6, city: "Testville", dates: ["2025-04-01"], event: { name: "Test League", match_number: 1 }, gender: "male",
      match_type: "T20", outcome: { winner: "A", by: { runs: 8 } }, overs: 20,
      players: { A: ["a1", "a2", "a3", "a4", "a5"], B: ["b1", "b2", "b3", "b4"] },
      registry: { people: registry }, season: "2025", team_type: "club", teams: ["A", "B"],
      toss: { winner: "A", decision: "bat" }, venue: "Test Oval",
    },
    innings: [
      { team: "A", overs: [{ over: 0, deliveries: over0 }, { over: 1, deliveries: over1 }], powerplays: [{ from: 0.1, to: 5.6, type: "mandatory" }] },
      { team: "B", overs: [{ over: 0, deliveries: chase }], target: { overs: 20, runs: 21 } },
      { team: "A", super_over: true, overs: [{ over: 0, deliveries: [d("a1", "a2", "b1", 6)] }] },
    ],
  };
}

export const registry = (prefix: string) =>
  Object.fromEntries(["a1", "a2", "a3", "a4", "a5", "b1", "b2", "b3", "b4"].map((n, i) => [n, `${prefix}${String(i).padStart(7, "0")}`.slice(0, 8)]));

export const zip = (matches: Record<number, Record<string, unknown>>): Uint8Array =>
  zipSync(Object.fromEntries(Object.entries(matches).map(([id, m]) => [`${id}.json`, strToU8(JSON.stringify(m))])));

export function load(db: DatabaseSync, code: string, matches: Record<number, Record<string, unknown>>) {
  return ingestArchive(db, comp(code), 1, zip(matches));
}
