/**
 * IPL Intelligence OS × Beyond XI
 * 3D Cricket Coordinate System & Spatial Transformation Engine
 * 
 * Consistent World Coordinate System:
 * - Ground Center: (0, 0, 0)
 * - X/Z Plane: Playing Surface / Outfield Turf
 * - Y Axis: Vertical Height (0 = Turf Level)
 * - Pitch Direction: Centered along Z Axis
 *   - Striker's Crease (Batting End): (0, 0, 10)
 *   - Non-Striker's Crease (Bowling End): (0, 0, -10)
 *   - Standard Cricket Pitch: 20.12m length x 3.05m width
 * - Outfield Radius: ~72m (72 units)
 * - Boundary Rope: ~68m (68 units)
 * - 30-Yard Circle: ~27.4m (27.4 units)
 */

export interface Vector3D {
  x: number;
  y: number;
  z: number;
}

export type BatterHandedness = "RHB" | "LHB";

export type CricketSector =
  | "Long On"
  | "Long Off"
  | "Mid Wicket"
  | "Extra Cover"
  | "Square Leg"
  | "Cover / Point"
  | "Fine Leg"
  | "Third Man"
  | "Straight"
  | "Deep Midwicket"
  | "Deep Square Leg"
  | "Deep Point"
  | "Deep Cover"
  | "Cow Corner";

export interface SpatialMetadata {
  confidence: "VERIFIED_TRACKING" | "SECTOR_RECORDED" | "EVENT_RECONSTRUCTION";
  source: string;
  uncertaintyRadius: number;
}

/** Standard angular sector definitions from 12 o'clock Straight (0 deg) */
const SECTOR_BASE_ANGLES: Record<string, number> = {
  "Straight": 0,
  "Long On": 24,
  "Long Off": 336,
  "Mid Wicket": 65,
  "Deep Midwicket": 72,
  "Cow Corner": 50,
  "Extra Cover": 300,
  "Deep Cover": 290,
  "Square Leg": 95,
  "Deep Square Leg": 105,
  "Cover / Point": 265,
  "Deep Point": 260,
  "Fine Leg": 140,
  "Third Man": 220,
};

/**
 * Returns angular direction (0-360) clockwise from straight drive direction.
 * Accurately flips off/on side for Left-Handed Batters (LHB).
 */
export function getSectorAngle(sector: string, handedness: BatterHandedness = "RHB"): number {
  const norm = Object.keys(SECTOR_BASE_ANGLES).find(
    k => k.toLowerCase() === sector.toLowerCase() || sector.toLowerCase().includes(k.toLowerCase())
  );
  let base = SECTOR_BASE_ANGLES[norm || "Long On"] ?? 24;

  if (handedness === "LHB") {
    // For left-handed batters, mirror across the vertical pitch line (X = 0)
    base = (360 - base) % 360;
  }
  return base;
}

/**
 * Converts polar shot coordinates (angle in degrees, distance in meters)
 * into Three.js world coordinates anchored to the Striker's Crease at (0, 0, 10).
 */
export function shotToWorld(
  angleDeg: number,
  distance: number,
  height: number = 0,
  handedness: BatterHandedness = "RHB"
): Vector3D {
  const strikerOrigin = { x: 0, y: 0, z: 10 };
  let effectiveAngle = angleDeg;
  if (handedness === "LHB") {
    effectiveAngle = (360 - angleDeg) % 360;
  }

  const rad = (effectiveAngle * Math.PI) / 180;
  // In our coordinate space: 0 deg (straight) points along -Z
  // 90 deg (leg side for RHB) points along +X
  // 270 deg (off side for RHB) points along -X
  const x = strikerOrigin.x + Math.sin(rad) * distance;
  const z = strikerOrigin.z - Math.cos(rad) * distance;

  return { x, y: Math.max(0, height), z };
}

/**
 * Computes exact intersection point with the boundary ellipse/rope (radius ~68m)
 */
export function getBoundaryPoint(angleDeg: number, boundaryRadius: number = 68, handedness: BatterHandedness = "RHB"): Vector3D {
  return shotToWorld(angleDeg, boundaryRadius, 0, handedness);
}

/**
 * Normalizes any free-form commentary or scorecard zone into standard CricketSector
 */
export function normalizeZoneToSector(zoneText: string): CricketSector {
  const t = (zoneText || "").toLowerCase();
  if (t.includes("long-on") || t.includes("long on")) return "Long On";
  if (t.includes("long-off") || t.includes("long off")) return "Long Off";
  if (t.includes("midwicket") || t.includes("mid-wicket") || t.includes("cow corner")) return "Mid Wicket";
  if (t.includes("extra cover")) return "Extra Cover";
  if (t.includes("square leg")) return "Square Leg";
  if (t.includes("fine leg")) return "Fine Leg";
  if (t.includes("third man")) return "Third Man";
  if (t.includes("point") || t.includes("cover")) return "Cover / Point";
  return "Long On";
}
