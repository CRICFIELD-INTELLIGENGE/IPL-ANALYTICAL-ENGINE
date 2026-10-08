async function testWithParams(override) {
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
    representation: "current-squad-career",
    fieldingPosition: "Scoring Area",
    innings: "All Innings",
    matchContext: "All Matches",
    requiredRr: "All",
    currentRr: "All",
    homeAway: "All",
    playoff: "All"
  };

  const active = { ...defaults, ...override };
  for (const [k, v] of Object.entries(active)) {
    if (v !== null) params.append(k, v);
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
  const keys = [
    "season", "team", "opponent", "venue", "phase", "bowlerType",
    "deliveryType", "pressure", "nationality", "representation",
    "fieldingPosition", "innings", "matchContext", "requiredRr",
    "currentRr", "homeAway", "playoff"
  ];

  console.log("Testing individual parameter removals:");
  for (const key of keys) {
    const override = { [key]: null }; // omit this key
    const res = await testWithParams(override);
    console.log(`Omitted "${key}": Batters=${res.batters}, Bowlers=${res.bowlers}`);
  }
}

run();
