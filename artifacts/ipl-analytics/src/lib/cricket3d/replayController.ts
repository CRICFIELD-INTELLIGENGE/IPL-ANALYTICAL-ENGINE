/**
 * IPL Intelligence OS × Beyond XI
 * 3D Boundary Replay State Machine & Camera Controller
 */

export type CameraMode =
  | "BROADCAST"
  | "BATTER_POV"
  | "AERIAL_WAGON_WHEEL"
  | "BALL_FOLLOW"
  | "BOUNDARY_CAM"
  | "STADIUM_REVEAL";

export type ReplayPhase =
  | "IDLE"
  | "PHASE_1_CONTACT"
  | "PHASE_2_BALL_TRAVEL"
  | "PHASE_3_BOUNDARY"
  | "PHASE_4_CROWD_REACTION"
  | "PHASE_5_COMPLETE";

export interface ReplayState {
  phase: ReplayPhase;
  progress: number; // 0 to 1
  isPlaying: boolean;
  speed: number; // 0.5, 1, 1.5, 2
  cameraMode: CameraMode;
  activeDeliveryId: string | null;
  soundEnabled: boolean;
}

export interface CameraPreset {
  position: [number, number, number];
  target: [number, number, number];
  fov: number;
}

export const CAMERA_PRESETS: Record<CameraMode, CameraPreset> = {
  BROADCAST: {
    position: [0, 42, 85],
    target: [0, 0, 10],
    fov: 40,
  },
  BATTER_POV: {
    position: [0, 2.4, 18],
    target: [0, 1.2, -40],
    fov: 55,
  },
  AERIAL_WAGON_WHEEL: {
    position: [0, 120, 0.1],
    target: [0, 0, 0],
    fov: 48,
  },
  BALL_FOLLOW: {
    position: [0, 15, 30],
    target: [0, 0, 0],
    fov: 45,
  },
  BOUNDARY_CAM: {
    position: [0, 3.5, -62],
    target: [0, 1, 10],
    fov: 50,
  },
  STADIUM_REVEAL: {
    position: [95, 65, 95],
    target: [0, 0, 0],
    fov: 45,
  },
};
