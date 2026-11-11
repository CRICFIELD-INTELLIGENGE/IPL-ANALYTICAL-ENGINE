import { auction as AU } from "@workspace/arcade-rules";

async function post(path: string, body: unknown) {
  const res = await fetch(`http://localhost:5000/api/arcade${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  return { status: res.status, data };
}

async function testResume() {
  console.log("=== TESTING AUCTION RESUME FIDELITY ===");
  const start = await post("/session/start", { game: "auction-room", mode: "full", params: { team: "CSK" } });
  const runId = start.data.runId;
  const initialAuction: AU.AuctionState = start.data.auction;

  console.log("Started auction. Total lots:", initialAuction.lots.length);

  // Play 5 lots
  let s = initialAuction;
  const maxes: (number | null)[] = [];
  for (let i = 0; i < 5; i++) {
    const lot = s.lots[s.index];
    // Bid baseCr on odd lots, pass on even lots
    const myBid = i % 2 === 1 ? lot.baseCr : null;
    maxes.push(myBid);
    const { result, next } = AU.resolveLot(s, myBid);
    console.log(`Lot ${i + 1} (${lot.name}): winner=${result.winner}, price=₹${result.priceCr} Cr`);
    s = next;
  }

  console.log("State at Lot 5 index:", s.index, "Results count:", s.results.length);

  // Now simulate RESUME from the initial state + maxes:
  console.log("\nSimulating Resume...");
  let resumedState = initialAuction;
  for (const m of maxes) {
    resumedState = AU.resolveLot(resumedState, m).next;
  }

  console.log("Resumed State index:", resumedState.index, "Results count:", resumedState.results.length);
  const match = resumedState.index === s.index && resumedState.results.length === s.results.length;
  console.log("States match identically?", match);

  // Now finish remainder of auction
  const remainingMaxes = [...maxes];
  while (!resumedState.done) {
    remainingMaxes.push(null);
    resumedState = AU.resolveLot(resumedState, null).next;
  }

  // Submit to server
  const sub = await post(`/session/${runId}/submit`, { humanMaxes: remainingMaxes });
  console.log("Auction Submit after Resume:", sub.status, "validated:", sub.data.validated, "score:", sub.data.score);
}

testResume().catch(console.error);
