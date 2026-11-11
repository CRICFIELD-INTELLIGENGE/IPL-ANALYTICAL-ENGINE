/**
 * IPL Intelligence OS × Beyond XI
 * 3D Boundary Replay Animator
 * 
 * Executes coordinated 5-phase boundary replays:
 * Phase 1: Bat Contact & Sound
 * Phase 2: Ball Flight / Travel with topspin & ground shadows
 * Phase 3: Boundary Crossing & LED Board reaction
 * Phase 4: Synchronized Crowd Celebration
 * Phase 5: Replay Complete & Reset
 */

import { NormalizedDelivery } from "../../lib/cricket3d/deliveryAdapter";
import { ReplayPhase } from "../../lib/cricket3d/replayController";
import { stadiumAudio } from "./StadiumAudio";

export class BoundaryReplayController {
  private activeDelivery: NormalizedDelivery | null = null;
  private currentProgress: number = 0; // 0 to 1
  private isPlaying: boolean = false;
  private currentPhase: ReplayPhase = "IDLE";
  private speed: number = 1.0;

  private onBallPositionUpdate: (pos: any, rot: any) => void;
  private onCrowdReaction: (cheering: boolean, isSix: boolean) => void;
  private onPhaseChange: (phase: ReplayPhase, progress: number) => void;

  constructor(
    onBallPositionUpdate: (pos: any, rot: any) => void,
    onCrowdReaction: (cheering: boolean, isSix: boolean) => void,
    onPhaseChange: (phase: ReplayPhase, progress: number) => void
  ) {
    this.onBallPositionUpdate = onBallPositionUpdate;
    this.onCrowdReaction = onCrowdReaction;
    this.onPhaseChange = onPhaseChange;
  }

  public startReplay(delivery: NormalizedDelivery, speed: number = 1.0) {
    this.activeDelivery = delivery;
    this.currentProgress = 0;
    this.isPlaying = true;
    this.speed = speed;
    this.currentPhase = "PHASE_1_CONTACT";

    // Play contact sound
    stadiumAudio.playBatContact();
    this.onPhaseChange(this.currentPhase, 0);
  }

  /** Pause in place: the ball and phase stay where they are (the Pause button). startReplay restarts. */
  public pause() {
    this.isPlaying = false;
  }

  public stopReplay() {
    this.isPlaying = false;
    this.currentPhase = "IDLE";
    this.onCrowdReaction(false, false);
    this.onPhaseChange(this.currentPhase, 0);
  }

  public update(deltaSeconds: number) {
    if (!this.isPlaying || !this.activeDelivery) return;

    const totalDuration = this.activeDelivery.trajectory.durationSeconds / this.speed;
    this.currentProgress += deltaSeconds / totalDuration;

    if (this.currentProgress >= 1.0) {
      this.currentProgress = 1.0;
      this.isPlaying = false;
      this.currentPhase = "PHASE_5_COMPLETE";
      this.onPhaseChange(this.currentPhase, 1.0);
      return;
    }

    const isSix = this.activeDelivery.boundaryType === "SIX";
    const crossingTime = this.activeDelivery.trajectory.boundaryIntersectionTime;

    // Phase Transitions
    if (this.currentProgress < 0.1) {
      if (this.currentPhase !== "PHASE_1_CONTACT") {
        this.currentPhase = "PHASE_1_CONTACT";
        this.onPhaseChange(this.currentPhase, this.currentProgress);
      }
    } else if (this.currentProgress < crossingTime) {
      if (this.currentPhase !== "PHASE_2_BALL_TRAVEL") {
        this.currentPhase = "PHASE_2_BALL_TRAVEL";
        this.onPhaseChange(this.currentPhase, this.currentProgress);
      }
    } else if (this.currentProgress < crossingTime + 0.12) {
      if (this.currentPhase !== "PHASE_3_BOUNDARY") {
        this.currentPhase = "PHASE_3_BOUNDARY";
        stadiumAudio.playCrowdCelebration(isSix);
        this.onCrowdReaction(true, isSix);
        this.onPhaseChange(this.currentPhase, this.currentProgress);
      }
    } else {
      if (this.currentPhase !== "PHASE_4_CROWD_REACTION") {
        this.currentPhase = "PHASE_4_CROWD_REACTION";
        this.onPhaseChange(this.currentPhase, this.currentProgress);
      }
    }

    // Sample position along trajectory
    const samples = this.activeDelivery.trajectory.samples;
    const sampleIdx = Math.min(
      samples.length - 1,
      Math.floor(this.currentProgress * (samples.length - 1))
    );
    const sample = samples[sampleIdx];
    if (sample) {
      this.onBallPositionUpdate(sample.position, sample.rotation);
    }
  }

  public getProgress(): number {
    return this.currentProgress;
  }

  public getPhase(): ReplayPhase {
    return this.currentPhase;
  }
}
