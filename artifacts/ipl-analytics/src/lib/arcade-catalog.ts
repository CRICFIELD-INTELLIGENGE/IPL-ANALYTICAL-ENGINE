import { GAMES, type GameId } from "@workspace/arcade-rules";
export const HOME_ARCADE_GAMES = GAMES.filter(g => ["cup-chase", "hand-cricket", "super-over", "auction-room", "cricket-grid", "guess-cricketer"].includes(g.id));
export const ARCADE_ART: Record<GameId, string> = {
  "cup-chase": "/milestone-photos/highest-total-2013-rcb.jpg",
  "hand-cricket": "/milestone-photos/first-win-2022-lsg.jpg",
  "super-over": "/milestone-photos/final-2023-csk.jpg",
  "higher-or-lower": "/advance stats title image.png",
  "guess-cricketer": "/milestone-photos/final-2021-kkr-0.jpg",
  "build-your-xi": "/assets/tactical-board-hero.png",
  "auction-room": "/assets/auction-war-room-hero.png",
  "cricket-grid": "/milestone-photos/final-2025-rcb.jpg",
  "time-machine": "/milestone-photos/final-2008.jpg",
  drs: "/milestone-photos/final-2017.jpg",
  "next-ball": "/milestone-photos/highest-total-2026-dc.jpg",
  "captains-call": "/milestone-photos/final-2021-csk.jpg",
  "scout-gem": "/assets/scouts-notebook-hero.png",
  "franchise-gm": "/ipl-trophy-cup.jpg",
};

