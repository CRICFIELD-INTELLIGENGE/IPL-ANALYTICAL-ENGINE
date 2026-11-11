/**
 * IPL Intelligence OS × Beyond XI
 * 3D Trajectory Resolver & Ballistic Physics Simulator
 * 
 * Generates verified or reconstructed 3D ball path trajectories:
 * - FOUR: Ground boundary racing trajectory with grass friction, spin rotation, and subtle bounces
 * - SIX: 3D parabolic aerial loft trajectory clearing boundary rope into stadium crowd
 * - DOT / 1s / 2s / 3s: Outfield and infield running trajectories
 */

import { Vector3D } from "./coordinateTransform";

export interface TrajectorySample {
  position: Vector3D;
  rotation: Vector3D;
  velocity: number;
  time: number; // 0 to 1 normalized
  isGrounded: boolean;
}

export interface TrajectoryData {
  samples: TrajectorySample[];
  durationSeconds: number;
  maxHeight: number;
  totalDistance: number;
  boundaryIntersectionTime: number; // normalized time when ball crosses rope
}

/**
 * Resolves 3D trajectory samples for any recorded delivery
 */
export function resolveTrajectory(
  startPos: Vector3D,
  targetPos: Vector3D,
  boundaryType: "FOUR" | "SIX" | "DOT" | "SINGLE" | "TWO" | "THREE",
  distanceMeters: number
): TrajectoryData {
  const samples: TrajectorySample[] = [];
  const numSamples = 60;

  const dx = targetPos.x - startPos.x;
  const dz = targetPos.z - startPos.z;
  const horizontalDist = Math.sqrt(dx * dx + dz * dz);

  let durationSeconds = 2.4;
  let maxHeight = 0.2;
  let boundaryIntersectionTime = 0.9;

  if (boundaryType === "SIX") {
    durationSeconds = 3.2;
    // Real cricket six apex typically reaches 14m - 28m depending on hit
    maxHeight = Math.min(26, Math.max(16, horizontalDist * 0.28));
    boundaryIntersectionTime = 0.82;

    for (let i = 0; i <= numSamples; i++) {
      const t = i / numSamples;
      // Linear horizontal progression
      const x = startPos.x + dx * t;
      const z = startPos.z + dz * t;

      // Parabolic ballistic trajectory: Y(t) = 4 * H * t * (1 - t)
      const y = Math.max(0.15, 4 * maxHeight * t * (1 - t) + (startPos.y * (1 - t) + targetPos.y * t));

      // Ball rotation (rapid backspin on lofted hits)
      const rotX = t * Math.PI * 18;
      const rotY = t * Math.PI * 4;
      const rotZ = t * Math.PI * 6;

      samples.push({
        position: { x, y, z },
        rotation: { x: rotX, y: rotY, z: rotZ },
        velocity: (1 - t * 0.3) * (horizontalDist / durationSeconds),
        time: t,
        isGrounded: t >= 0.98 || t <= 0.02,
      });
    }
  } else if (boundaryType === "FOUR") {
    durationSeconds = 2.0;
    maxHeight = 0.8; // Initial slight bounce off turf
    boundaryIntersectionTime = 0.88;

    for (let i = 0; i <= numSamples; i++) {
      const t = i / numSamples;
      const x = startPos.x + dx * t;
      const z = startPos.z + dz * t;

      // Fast ground drive with small early bounces settling onto grass
      let y = 0.12;
      if (t < 0.2) {
        y = Math.sin((t / 0.2) * Math.PI) * 0.7 + 0.12;
      } else if (t < 0.45) {
        y = Math.sin(((t - 0.2) / 0.25) * Math.PI) * 0.35 + 0.12;
      }

      // Ball rolling topspin / forward rotation
      const rotX = t * Math.PI * 32;
      const rotY = 0;
      const rotZ = t * Math.PI * 8;

      samples.push({
        position: { x, y, z },
        rotation: { x: rotX, y: rotY, z: rotZ },
        velocity: (1 - t * 0.4) * (horizontalDist / durationSeconds),
        time: t,
        isGrounded: y <= 0.2,
      });
    }
  } else {
    // Ground running strokes (1s, 2s, dots)
    durationSeconds = 1.8;
    maxHeight = 0.3;
    boundaryIntersectionTime = 1.0;

    for (let i = 0; i <= numSamples; i++) {
      const t = i / numSamples;
      const x = startPos.x + dx * t;
      const z = startPos.z + dz * t;
      const y = t < 0.15 ? Math.sin((t / 0.15) * Math.PI) * 0.3 + 0.12 : 0.12;

      samples.push({
        position: { x, y, z },
        rotation: { x: t * Math.PI * 14, y: 0, z: 0 },
        velocity: horizontalDist / durationSeconds,
        time: t,
        isGrounded: y <= 0.18,
      });
    }
  }

  return {
    samples,
    durationSeconds,
    maxHeight,
    totalDistance: horizontalDist,
    boundaryIntersectionTime,
  };
}
