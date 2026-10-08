// Match details for the /live/match-details/:matchId endpoint.
//
// This used to answer every request with the same invented payload: the first
// 11 and next 11 rows of players.json as the two "squads" — the same 22 players
// for every fixture in league history — and four hard-coded lines of commentary
// about the 2026 final, served for matches played in 2008.
//
// It now returns the real team sheets and the real ball-by-ball commentary,
// both derived from the match record by match-card.ts. Where a match has no
// commentary at source the list is empty rather than filled.

import { getMatchScorecard, getMatchCommentary } from "./match-card.js";

export interface SquadPlayer {
  id: number;
  name: string;
  role: string;
  country: string;
}

export interface AccurateMatchDetails {
  matchId: string;
  squad: {
    team1: SquadPlayer[];
    team2: SquadPlayer[];
  };
  commentary: { over: string; text: string; isWicket?: boolean; isBoundary?: boolean }[];
  scorecard: any;
}

export async function getAccurateMatchDetails(
  matchId: string,
  _team1Name: string,
  _team2Name: string,
): Promise<AccurateMatchDetails> {
  const card = getMatchScorecard(matchId);
  const comms = getMatchCommentary(matchId);

  // Cricsheet names the XI but publishes no role or country per match, so those
  // are left blank rather than guessed from an unrelated player table.
  const toSquad = (names: string[] = []): SquadPlayer[] =>
    names.map((name, i) => ({ id: i, name, role: "", country: "" }));

  return {
    matchId,
    squad: {
      team1: toSquad(card?.squads?.[0]?.players),
      team2: toSquad(card?.squads?.[1]?.players),
    },
    commentary: comms.innings.flatMap(inn =>
      inn.balls.map(b => ({
        over: b.over,
        text: b.text,
        isWicket: b.isWicket,
        isBoundary: b.isBoundary,
      })),
    ),
    scorecard: card?.innings ?? null,
  };
}
