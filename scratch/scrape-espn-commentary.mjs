// Downloads ESPN ball-by-ball commentary for every IPL match we hold.
//
// Endpoint: ESPN's public sports API, the same one their own apps call.
//   https://site.api.espn.com/apis/site/v2/sports/cricket/{seriesId}/playbyplay
//        ?event={matchId}&period={innings}&limit=500
//
// Notes established by testing before writing this:
//   * seriesId is ignored — 0, a real id, and a nonsense id all return the same
//     payload — so our Cricsheet filenames (which are ESPN match ids) suffice.
//   * limit=500 returns a whole innings in one request, so a match costs two
//     calls rather than ten pages of 25.
//   * The espncricinfo.com hosts (www, hs-consumer-api) return 403 to scripts;
//     this API host does not.
//
// Behaviour: one request at a time with a fixed delay, resumable (an existing
// output file is skipped), and retrying only on transient 5xx/429. It is meant
// to be re-run until `remaining` reaches zero rather than hammered in parallel.

import fs from "node:fs";
import path from "node:path";

const [, , RAW_DIR, OUT_DIR, ...rest] = process.argv;
if (!OUT_DIR) {
  console.error("usage: node scrape-espn-commentary.mjs <rawDir> <outDir> [--limit N] [--delay MS]");
  process.exit(1);
}
const argOf = (flag, dflt) => {
  const i = rest.indexOf(flag);
  return i === -1 ? dflt : Number(rest[i + 1]);
};
const MAX = argOf("--limit", Infinity);
const DELAY_MS = argOf("--delay", 1200);

const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36";
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
fs.mkdirSync(OUT_DIR, { recursive: true });

const matchIds = fs.readdirSync(RAW_DIR)
  .filter(f => f.endsWith(".json"))
  .map(f => f.replace(/\.json$/, ""))
  .filter(id => /^\d+$/.test(id))
  .sort();

// --reverse lets a second worker start from the far end of the pending list so
// two processes converge in the middle instead of racing over the same ids.
// Each writes a whole file at a time, so the worst case where they meet is a
// little duplicated work, never a partial file.
const pending = matchIds.filter(id => !fs.existsSync(path.join(OUT_DIR, `${id}.json`)));
if (rest.includes("--reverse")) pending.reverse();
console.log(`matches held: ${matchIds.length} | already downloaded: ${matchIds.length - pending.length} | to fetch: ${Math.min(pending.length, MAX)}`);

async function fetchInnings(matchId, period, attempt = 1) {
  const url = `https://site.api.espn.com/apis/site/v2/sports/cricket/0/playbyplay?event=${matchId}&period=${period}&limit=500`;
  try {
    const res = await fetch(url, { headers: { "User-Agent": UA, Accept: "application/json" } });
    // 5xx and 429 are worth another go; a 404 means this innings does not exist.
    if (res.status === 404) return { items: [], missing: true };
    if (!res.ok) {
      if ((res.status >= 500 || res.status === 429) && attempt <= 3) {
        await sleep(DELAY_MS * attempt * 3);
        return fetchInnings(matchId, period, attempt + 1);
      }
      return { items: [], error: `HTTP ${res.status}` };
    }
    const j = await res.json();
    return { items: j?.commentary?.items ?? [] };
  } catch (err) {
    if (attempt <= 3) {
      await sleep(DELAY_MS * attempt * 3);
      return fetchInnings(matchId, period, attempt + 1);
    }
    return { items: [], error: String(err?.message ?? err) };
  }
}

/** Only the fields worth keeping; the raw payload is mostly page furniture. */
function slim(item) {
  return {
    innings: item.period ?? null,
    over: item.over?.actual ?? null,
    ballInOver: item.over?.ball ?? null,
    bowler: item.bowler?.athlete?.displayName ?? null,
    batsman: item.batsman?.athlete?.displayName ?? null,
    playType: item.playType?.description ?? null,
    runs: item.scoreValue ?? null,
    // The wicket object keys the kind as `type` (not `dismissalType`) and also
    // names the fielder, which is worth keeping — Cricsheet records the fielder
    // but nothing about how the ball was bowled.
    dismissal: item.dismissal?.dismissal ? {
      type: item.dismissal.type ?? null,
      batsman: item.dismissal.batsman?.athlete?.displayName ?? null,
      bowler: item.dismissal.bowler?.athlete?.displayName ?? null,
      fielder: item.dismissal.fielder?.athlete?.displayName ?? null,
      text: item.dismissal.text ?? null,
    } : null,
    // The prose is the point: it carries length, line, shot and direction,
    // none of which exist as fields anywhere in this dataset.
    text: typeof item.text === "string" ? item.text.replace(/<[^>]+>/g, "").trim() : null,
    shortText: item.shortText ?? null,
  };
}

let done = 0, failed = 0, balls = 0;
const failures = [];

for (const id of pending.slice(0, MAX === Infinity ? undefined : MAX)) {
  const innings = [];
  let bad = null;
  // Four periods covers both innings plus any super over.
  for (let period = 1; period <= 4; period++) {
    const { items, error, missing } = await fetchInnings(id, period);
    if (error) { bad = error; break; }
    if (missing || items.length === 0) break;
    innings.push({ period, deliveries: items.map(slim) });
    await sleep(DELAY_MS);
  }

  if (bad || innings.length === 0) {
    failed++;
    failures.push(`${id}: ${bad ?? "no innings returned"}`);
    console.log(`  ${id}  FAILED  ${bad ?? "empty"}`);
    continue;
  }

  const total = innings.reduce((n, i) => n + i.deliveries.length, 0);
  balls += total;
  fs.writeFileSync(
    path.join(OUT_DIR, `${id}.json`),
    JSON.stringify({ matchId: id, fetchedAt: new Date().toISOString(), innings }, null, 1),
  );
  done++;
  if (done % 10 === 0 || done === 1) {
    console.log(`  ${done} done (${id}: ${innings.length} innings, ${total} entries) — ${balls} entries so far`);
  }
}

console.log(`\ncompleted ${done}, failed ${failed}, entries captured ${balls}`);
if (failures.length) {
  console.log("failures (re-run to retry — finished matches are skipped):");
  for (const f of failures.slice(0, 20)) console.log("   " + f);
}
const remaining = matchIds.filter(id => !fs.existsSync(path.join(OUT_DIR, `${id}.json`))).length;
console.log(`remaining: ${remaining}`);
