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

async function testGm() {
  console.log("=== TESTING FRANCHISE GM TRADES & SEASON ===");
  const setup = await get("/gm/setup");
  console.log("GM setup status:", setup.status, "Franchises:", setup.data.franchises.length);
  
  const csk = setup.data.franchises.find((f: any) => f.code === "CSK");
  const mi = setup.data.franchises.find((f: any) => f.code === "MI");
  
  const miSquadIds = mi.squad.map((p: any) => p.id);
  const cskSquadIds = csk.squad.map((p: any) => p.id);

  // 1. Fair trade
  // Find a CSK and MI player of very similar rating/marketCr
  let pCsk = csk.squad.find((p: any) => p.marketCr > 1 && p.marketCr < 4);
  let pMi = mi.squad.find((p: any) => p.marketCr >= pCsk.marketCr * 0.95 && p.marketCr <= pCsk.marketCr * 1.05);
  if (!pMi) {
    pCsk = csk.squad[0];
    pMi = mi.squad[0];
  }
  
  const tr1 = await post("/gm/trade", {
    aiTeam: "MI",
    aiSquad: miSquadIds,
    give: [pCsk.id],
    get: [pMi.id],
  });
  console.log(`Trade 1 (CSK gives ${pCsk.name} [₹${pCsk.marketCr} Cr] for MI's ${pMi.name} [₹${pMi.marketCr} Cr]):`,
    "Accepted:", tr1.data.accepted, "Reason:", tr1.data.reason);

  // 2. Unfair trade (cheap player for top star)
  const cheapCsk = [...csk.squad].sort((a: any, b: any) => a.marketCr - b.marketCr)[0];
  const starMi = [...mi.squad].sort((a: any, b: any) => b.marketCr - a.marketCr)[0];
  const tr2 = await post("/gm/trade", {
    aiTeam: "MI",
    aiSquad: miSquadIds,
    give: [cheapCsk.id],
    get: [starMi.id],
  });
  console.log(`Trade 2 (Unfair: ${cheapCsk.name} [₹${cheapCsk.marketCr} Cr] for ${starMi.name} [₹${starMi.marketCr} Cr]):`,
    "Accepted:", tr2.data.accepted, "Reason:", tr2.data.reason);

  // 3. Test GM Strength
  const str = await post("/gm/strength", { ids: cskSquadIds.slice(0, 18) });
  console.log("CSK Strength calculation:", str.status, "Strength:", str.data.strength, "Feasible:", str.data.feasible);

  // 4. Test GM Season Simulation
  const rivals: Record<string, string[]> = {};
  for (const f of setup.data.franchises) {
    if (f.code !== "CSK") {
      rivals[f.code] = f.squad.map((p: any) => p.id);
    }
  }

  const season = await post("/gm/season", {
    seed: `gm:test:${Date.now()}`,
    team: "CSK",
    squad: cskSquadIds.slice(0, 20),
    approach: "balanced",
    rivals,
    record: false,
  });
  console.log("Season Simulation:", season.status,
    "Champion:", season.data.season?.champion,
    "CSK Finish:", season.data.season?.userFinish,
    "Total Matches:", season.data.season?.matches?.length,
    "Playoffs Matches:", season.data.season?.playoffs?.length,
    "Injuries:", season.data.season?.injuries?.length);
}

testGm().catch(console.error);
