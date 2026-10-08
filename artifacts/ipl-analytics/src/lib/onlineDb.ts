// Match details, fetched from the API rather than assembled in the browser.
//
// This file used to build its answer client-side: the squads were the first 11
// and next 11 entries of players.json — identical for every match — and the
// commentary was four hard-coded lines about the 2026 final, returned for all
// 1243 matches including those played in 2008.
//
// The real scorecard and ball-by-ball commentary now come from
// /api/ipl/match/:id/scorecard and /api/ipl/match/:id/commentary, both computed
// from the delivery record. Prefer the useMatchScorecard / useMatchCommentary
// hooks in lib/aggregates.ts; this wrapper exists for the older live-match
// call path.

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

const EMPTY = (matchId: string): AccurateMatchDetails => ({
  matchId,
  squad: { team1: [], team2: [] },
  commentary: [],
  scorecard: null,
});

export async function getAccurateMatchDetailsFrontend(
  matchId: string,
  _team1Name: string,
  _team2Name: string,
): Promise<AccurateMatchDetails> {
  const base = import.meta.env.BASE_URL;
  try {
    const [cardRes, commRes] = await Promise.all([
      fetch(`${base}api/ipl/match/${matchId}/scorecard`),
      fetch(`${base}api/ipl/match/${matchId}/commentary`),
    ]);
    if (!cardRes.ok) return EMPTY(matchId);

    const card = await cardRes.json();
    const comms = commRes.ok ? await commRes.json() : { innings: [] };

    // Cricsheet names the XI but not a role or country per match, so those stay
    // blank instead of being filled from an unrelated player table.
    const toSquad = (names: string[] = []): SquadPlayer[] =>
      names.map((name, i) => ({ id: i, name, role: "", country: "" }));

    return {
      matchId,
      squad: {
        team1: toSquad(card?.squads?.[0]?.players),
        team2: toSquad(card?.squads?.[1]?.players),
      },
      commentary: (comms?.innings ?? []).flatMap((inn: any) =>
        (inn.balls ?? []).map((b: any) => ({
          over: b.over,
          text: b.text,
          isWicket: b.isWicket,
          isBoundary: b.isBoundary,
        })),
      ),
      scorecard: card?.innings ?? null,
    };
  } catch (err) {
    console.error("Failed to load match details", err);
    return EMPTY(matchId);
  }
}
