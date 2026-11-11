// Hand Cricket — schoolyard rules, four computer opponents, and a replay used for score validation.
//
// Rules shown to the player before a match:
//   Both sides show a number from 1 to 6 at the same moment.
//   Same number → the batter is out. Different numbers → the batter scores the number they showed.
//   An innings ends when its wickets are gone or its overs are bowled. The chasing side wins the moment
//   it passes the target; level scores at the end is a tie.
//
// Fairness: the computer commits its number from the history of *previous* balls only (`computerPick`),
// before the player's current number is known. Nothing in this module lets it see the current choice.

import { seeded } from "./rng";

export type Personality = "rookie" | "pattern" | "aggressive" | "expert";
export const PERSONALITIES: Record<Personality, { name: string; blurb: string }> = {
  rookie: { name: "Random Rookie", blurb: "Throws fingers out at random. Every number is equally likely." },
  pattern: { name: "Pattern Reader", blurb: "Watches your favourite numbers over your last few balls." },
  aggressive: { name: "Aggressive Challenger", blurb: "Loves the big numbers, with the bat and the ball." },
  expert: { name: "Adaptive Expert", blurb: "Learns what you tend to play after each number and adjusts." },
};

export type Overs = 1 | 2 | 5;
export interface HandBall { ball: number; innings: 1 | 2; player: number; computer: number; runs: number; wicket: boolean; playerBatting: boolean }
export interface HandMatch {
  seed: string;
  personality: Personality;
  overs: Overs;
  totalBalls: number;
  maxWickets: number;
  playerBatFirst: boolean;
  innings: 1 | 2;
  runs: number;
  wickets: number;
  balls: number;
  firstInnings: { runs: number; wickets: number; balls: number } | null;
  target: number | null;
  log: HandBall[];
  result: null | { winner: "player" | "computer" | "tie"; text: string };
}

export const wicketsFor = (overs: Overs) => (overs === 1 ? 2 : overs === 2 ? 3 : 5);

export function newHandMatch(seed: string, personality: Personality, overs: Overs, playerBatFirst: boolean): HandMatch {
  return { seed, personality, overs, totalBalls: overs * 6, maxWickets: wicketsFor(overs), playerBatFirst, innings: 1, runs: 0, wickets: 0, balls: 0, firstInnings: null, target: null, log: [], result: null };
}

export const playerBatting = (m: HandMatch) => (m.innings === 1 ? m.playerBatFirst : !m.playerBatFirst);

/** The computer's number for the next ball. Depends only on the seed, the opponent and earlier balls. */
export function computerPick(m: HandMatch): number {
  const rng = seeded(`${m.seed}|${m.log.length}`);
  const uniform = () => 1 + Math.floor(rng() * 6);
  const batting = !playerBatting(m); // the computer is batting
  const mine = m.log.map((b) => b.player);
  switch (m.personality) {
    case "rookie":
      return uniform();
    case "aggressive": {
      const r = rng();
      return r < 0.3 ? 6 : r < 0.55 ? 5 : r < 0.75 ? 4 : uniform();
    }
    case "pattern": {
      const recent = mine.slice(-6);
      if (recent.length < 3) return uniform();
      const counts = [0, 0, 0, 0, 0, 0, 0];
      for (const n of recent) counts[n]++;
      const fav = counts.indexOf(Math.max(...counts));
      if (rng() < 0.5) return uniform();
      // Bowling: match your favourite to get you out. Batting: stay away from it.
      return batting ? avoid(rng, [fav]) : fav;
    }
    case "expert": {
      if (mine.length < 4) return uniform();
      // First-order transition counts with +1 smoothing: what you play after your previous number.
      const last = mine[mine.length - 1];
      const next = [0, 1, 1, 1, 1, 1, 1];
      for (let i = 1; i < mine.length; i++) if (mine[i - 1] === last) next[mine[i]] += 2;
      for (const n of mine.slice(-8)) next[n] += 1;
      const ranked = [1, 2, 3, 4, 5, 6].sort((a, b) => next[b] - next[a]);
      if (rng() < 0.3) return uniform();
      return batting ? avoid(rng, ranked.slice(0, 2)) : ranked[0];
    }
  }
}

function avoid(rng: () => number, bad: number[]): number {
  const ok = [6, 5, 4, 3, 2, 1].filter((n) => !bad.includes(n));
  // Prefer big numbers when batting, but not always the biggest.
  return ok[Math.min(ok.length - 1, Math.floor(rng() * rng() * ok.length))];
}

/** Play one ball. `computer` must come from `computerPick(m)` taken before the player chose. */
export function playHandBall(m: HandMatch, player: number, computer = computerPick(m)): HandMatch {
  if (m.result || !Number.isInteger(player) || player < 1 || player > 6) return m;
  const pb = playerBatting(m);
  const wicket = player === computer;
  const runs = wicket ? 0 : pb ? player : computer;
  const next: HandMatch = { ...m, log: [...m.log, { ball: m.balls + 1, innings: m.innings, player, computer, runs, wicket, playerBatting: pb }], runs: m.runs + runs, wickets: m.wickets + Number(wicket), balls: m.balls + 1 };
  const over = next.wickets >= next.maxWickets || next.balls >= next.totalBalls;
  if (next.innings === 1) {
    if (!over) return next;
    return { ...next, innings: 2, firstInnings: { runs: next.runs, wickets: next.wickets, balls: next.balls }, target: next.runs + 1, runs: 0, wickets: 0, balls: 0 };
  }
  const target = next.target!;
  const chaserIsPlayer = pb;
  if (next.runs >= target) {
    const wl = next.maxWickets - next.wickets;
    return { ...next, result: chaserIsPlayer ? { winner: "player", text: `You chased it down with ${wl} wicket${wl === 1 ? "" : "s"} in hand.` } : { winner: "computer", text: `The computer chased it with ${next.totalBalls - next.balls} balls to spare.` } };
  }
  if (!over) return next;
  if (next.runs === target - 1) return { ...next, result: { winner: "tie", text: "Scores level. It's a tie!" } };
  const margin = target - 1 - next.runs;
  return { ...next, result: chaserIsPlayer ? { winner: "computer", text: `Defended. The computer won by ${margin} run${margin === 1 ? "" : "s"}.` } : { winner: "player", text: `Defended! You won by ${margin} run${margin === 1 ? "" : "s"}.` } };
}

/** Rebuild a finished match from the player's numbers alone (server-side score validation). */
export function replayHandMatch(seed: string, personality: Personality, overs: Overs, playerBatFirst: boolean, picks: number[]): HandMatch {
  let m = newHandMatch(seed, personality, overs, playerBatFirst);
  for (const p of picks) {
    if (m.result) break;
    m = playHandBall(m, p);
  }
  return m;
}

/** Schoolyard Tournament: beat each opponent in order. */
export const TOURNAMENT: Personality[] = ["rookie", "pattern", "aggressive", "expert"];
