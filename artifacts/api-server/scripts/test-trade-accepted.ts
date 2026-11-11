import { squadPool } from "../src/services/arcade/squads";

async function post(path: string, body: unknown) {
  const res = await fetch(`http://localhost:5000/api/arcade${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  return { status: res.status, data };
}

async function get(path: string) {
  const res = await fetch(`http://localhost:5000/api/arcade${path}`);
  const data = await res.json();
  return { status: res.status, data };
}

async function testGmTrades() {
  const setup = await get("/gm/setup");
  const csk = setup.data.franchises.find((f: any) => f.code === "CSK");
  const mi = setup.data.franchises.find((f: any) => f.code === "MI");
  const miSquadIds = mi.squad.map((p: any) => p.id);

  // Search for an accepted trade:
  let acceptedTrade = null;
  for (const pCsk of csk.squad) {
    for (const pMi of mi.squad) {
      const tr = await post("/gm/trade", {
        aiTeam: "MI",
        aiSquad: miSquadIds,
        give: [pCsk.id],
        get: [pMi.id],
      });
      if (tr.data.accepted) {
        acceptedTrade = { pCsk, pMi, result: tr.data };
        break;
      }
    }
    if (acceptedTrade) break;
  }

  if (acceptedTrade) {
    console.log("ACCEPTED TRADE FOUND!");
    console.log(`CSK gives ${acceptedTrade.pCsk.name} (₹${acceptedTrade.pCsk.marketCr} Cr) for MI's ${acceptedTrade.pMi.name} (₹${acceptedTrade.pMi.marketCr} Cr)`);
    console.log("Result:", acceptedTrade.result);
  } else {
    console.log("No 1-for-1 trade accepted among tested combinations");
  }
}

testGmTrades().catch(console.error);
