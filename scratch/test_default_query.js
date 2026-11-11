async function testWithRep(rep) {
  const params = new URLSearchParams();
  const defaults = {
    season: "All Seasons",
    team: "All Teams",
    opponent: "All Opponents",
    venue: "All Venues",
    phase: "All Phases",
    bowlerType: "All Bowlers",
    deliveryType: "Delivery Type",
    pressure: "Standard",
    nationality: "all",
    representation: rep,
    fieldingPosition: "Scoring Area",
    innings: "All Innings",
    matchContext: "All Matches",
    requiredRr: "All",
    currentRr: "All",
    homeAway: "All",
    playoff: "All"
  };

  for (const [k, v] of Object.entries(defaults)) {
    params.append(k, v);
  }

  const url = `http://localhost:5000/api/stats/query?${params.toString()}`;
  const res = await fetch(url);
  const data = await res.json();
  return {
    batters: data.batters ? data.batters.length : 0,
    bowlers: data.bowlers ? data.bowlers.length : 0
  };
}

async function run() {
  const modes = ["current-squad-career", "franchise-legacy", "current-squad-for-franchise", "overall"];
  for (const mode of modes) {
    const res = await testWithRep(mode);
    console.log(`Mode "${mode}": Batters count = ${res.batters}, Bowlers count = ${res.bowlers}`);
  }
}

run();
