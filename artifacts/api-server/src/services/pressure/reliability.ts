// Pressure Reliability — serving. Reads the published snapshot only; never trains.
// Build: node --import tsx scripts/pressure/build-pressure-reliability.ts

import fs from "node:fs";
import path from "node:path";
import { getProjectRoot } from "../decision/db";
import { computePressureReliability, modelInfoOf, type PressureQuery, type Snapshot } from "./engine";

export { DEFINITIONS, LENSES, type Definition, type Lens, type PressureQuery } from "./engine";

let snap: Snapshot | null = null;
function load(): Snapshot {
  if (snap) return snap;
  // PRESSURE_SNAPSHOT points scripts (e.g. the official-data report) at another snapshot.
  const fp = process.env.PRESSURE_SNAPSHOT ? path.resolve(process.env.PRESSURE_SNAPSHOT) : path.join(getProjectRoot(), "artifacts", "api-server", "data", "pressure", "pressure-reliability.json");
  const alt = path.join(process.cwd(), "data", "pressure", "pressure-reliability.json");
  snap = JSON.parse(fs.readFileSync(fs.existsSync(fp) ? fp : alt, "utf8")) as Snapshot;
  return snap;
}

export function pressureReliability(q: PressureQuery) {
  return computePressureReliability(load(), q);
}

export function pressureModelInfo() {
  return modelInfoOf(load());
}

/** Competition codes present in the snapshot. */
export function pressureCompetitions(): string[] {
  return load().competitions.map(c => c.code);
}
