import { hand, auction, type GameId } from "@workspace/arcade-rules";

async function post(path: string, body: unknown) {
  const res = await fetch(`http://localhost:5000/api/arcade${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  return { status: res.status, data };
}

async function testHandCricketTournament() {
  console.log("=== TESTING HAND CRICKET TOURNAMENT ===");
  const start = await post("/session/start", { game: "hand-cricket", mode: "tournament" });
  console.log("Session start:", start.status, "RunId:", start.data.runId);

  const runId = start.data.runId;
  const seed = start.data.seed;

  for (let k = 0; k < hand.TOURNAMENT.length; k++) {
    const opp = hand.TOURNAMENT[k];
    const matchSeed = `${seed}|m${k}`;
    console.log(`\nPlaying Round ${k + 1} vs ${opp} (seed: ${matchSeed})`);

    // Simulate match until player wins
    let picks: number[] = [];
    let won = false;
    // We can try pick combinations to find a winning line
    for (let attempt = 0; attempt < 50; attempt++) {
      let m = hand.newHandMatch(matchSeed, opp, 1, true); // 1 over, bat first
      const testPicks: number[] = [];
      while (!m.result) {
        // play safe number or smart number
        const cpu = hand.computerPick(m);
        // avoid cpu pick to score runs
        let p = (cpu % 6) + 1;
        testPicks.push(p);
        m = hand.playHandBall(m, p, cpu);
      }
      if (m.result?.winner === "player") {
        picks = testPicks;
        won = true;
        console.log(`Found winning line in ${picks.length} balls: ${m.result.text}`);
        break;
      }
    }

    if (!won) {
      console.log("Could not find winning line in 50 tries, taking standard line");
      let m = hand.newHandMatch(matchSeed, opp, 1, true);
      while (!m.result) {
        const cpu = hand.computerPick(m);
        const p = cpu === 1 ? 2 : 1;
        picks.push(p);
        m = hand.playHandBall(m, p, cpu);
      }
    }

    // Submit to server
    const sub = await post(`/session/${runId}/submit`, {
      personality: opp,
      overs: 1,
      batFirst: true,
      picks,
    });
    console.log(`Round ${k + 1} submit:`, sub.status, "seriesOver:", sub.data.seriesOver, "won:", sub.data.won, "score:", sub.data.score);
    if (sub.data.seriesOver) {
      console.log("Tournament Finished! Outcome:", sub.data.outcome);
      break;
    }
  }
}

async function testAuctionModes() {
  console.log("\n=== TESTING ALL AUCTION MODES AND RESUME ===");
  for (const mode of ["full", "rebuild", "historical"] as const) {
    const start = await post("/session/start", { game: "auction-room", mode, params: { team: "CSK" } });
    console.log(`Mode '${mode}': start=${start.status}, lots=${start.data.auction?.lots.length}`);
    
    // Simulate resolving all lots (simToEnd)
    const lots = start.data.auction.lots;
    const humanMaxes = lots.map(() => null); // pass on all
    const sub = await post(`/session/${start.data.runId}/submit`, { humanMaxes });
    console.log(`Mode '${mode}': submit=${sub.status}, validated=${sub.data.validated}, squadSize=${sub.data.detail?.signed}`);
  }
}

async function main() {
  await testHandCricketTournament();
  await testAuctionModes();
}

main().catch(console.error);
