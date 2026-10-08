async function run() {
  try {
    const url = 'http://localhost:5000/api/stats/query?season=All%20Seasons&team=All%20Teams&opponent=All%20Opponents&venue=All%20Venues';
    const res = await fetch(url);
    const data = await res.json();
    if (data.bowlers && data.bowlers.length > 0) {
      console.log('First bowler:', data.bowlers[0]);
    } else {
      console.log('No bowlers found');
    }
  } catch (err) {
    console.error(err);
  }
}

run();
