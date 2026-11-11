import { hand } from "@workspace/arcade-rules";

async function post(path: string, body: unknown) {
  const res = await fetch(`http://localhost:5000/api/arcade${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  return { status: res.status, data };
}

function solveMatch(seed: string, opp: hand.Personality): { picks: number[]; result: hand.HandMatch["result"] } {
  // Try DFS or random search with max 500 tries
  for (let t = 0; t < 500; t++) {
    let m = hand.newHandMatch(seed, opp, 1, true);
    const picks: number[] = [];
    while (!m.result) {
      // Pick random 1-6
      const cpu = hand.computerPick(m);
      // When batting, try not to get out
      const p = m.playerBatFirst && m.innings === 1 ? ((cpu + (t % 5)) % 6) + 1 : cpu; // when bowling, try to get cpu out
      picks.push(p);
      m = hand.playHandBall(m, p, cpu);
    }
    if (m.result?.winner === "player") {
      return { picks, result: m.result };
    }
  }
  // Fallback random
  for (let t = 0; t < 5000; t++) {
    let m = hand.newHandMatch(seed, opp, 1, true);
    const picks: number[] = [];
    while (!m.result) {
      const p = 1 + Math.floor(Math.random() * 6);
      picks.push(p);
      m = hand.playHandBall(m, p);
    }
    if (m.result?.winner === "player") {
      return { picks, result: m.result };
    }
  }
  throw new Error(`Could not solve match vs ${opp}`);
}

async function runTournament() {
  const start = await post("/session/start", { game: "hand-cricket", mode: "tournament" });
  console.log("Started tournament:", start.data.runId);
  const runId = start.data.runId;
  const seed = start.data.seed;

  for (let k = 0; k < 4; k++) {
    const opp = hand.TOURNAMENT[k];
    const matchSeed = `${seed}|m${k}`;
    const solved = solveMatch(matchSeed, opp);
    console.log(`Round ${k + 1} (${opp}): won in ${solved.picks.length} balls -> ${solved.result?.text}`);

    const sub = await post(`/session/${runId}/submit`, {
      personality: opp,
      overs: 1,
      batFirst: true,
      picks: solved.picks,
    });
    console.log(`Submit Round ${k + 1}: status=${sub.status}, seriesOver=${sub.data.seriesOver}, won=${sub.data.won}, score=${sub.data.score}, nextOpp=${sub.data.nextOpponent}`);
  }
}

runTournament().catch(console.error);
