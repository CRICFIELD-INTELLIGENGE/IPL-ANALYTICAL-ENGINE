// Ask AI query planner: question → typed AskQuery over the SAME filter schema the Stats Centre uses.
// Deterministic and explainable; it never produces SQL. Every recognised phrase becomes one field, and every
// assumption (an ambiguous surname, a default sample size) is reported in `notes`.
// Pure module (type imports only) so it runs under node:test.
import type { AnalyticsFilters } from "@/lib/store";
import type { MatchState } from "./match-state";

export type Role = "batters" | "bowlers";
export type Intent = "leaderboard" | "player" | "compare" | "matchup" | "trend" | "pressure" | "batter-lens" | "unsupported";
export type Metric = "runs" | "sr" | "avg" | "highest" | "sixes" | "fours" | "boundaryPct" | "dotPct" | "balls" | "wickets" | "econ" | "bowlAvg" | "bowlSr";

export interface AskQuery {
  intent: Intent;
  role: Role;
  filters: Partial<AnalyticsFilters>;
  matchState: MatchState;
  metric: Metric;
  order: "desc" | "asc";
  limit: number;
  minBalls: number;
  minInnings: number;
  players: string[];      // warehouse names (the leaderboard rows' `player`)
  notes: string[];
  unsupported?: string;
}

export interface AskContext {
  players: { name: string; display: string; balls: number; role: Role }[];
  venues: string[];
  years: string[];        // ascending
}

export const METRIC_LABEL: Record<Metric, string> = {
  runs: "Runs", sr: "Strike rate", avg: "Batting average", highest: "Highest score", sixes: "Sixes", fours: "Fours",
  boundaryPct: "Boundary %", dotPct: "Dot-ball %", balls: "Balls", wickets: "Wickets", econ: "Economy", bowlAvg: "Bowling average", bowlSr: "Bowling strike rate",
};
/** Row field each metric reads; batting and bowling formulas are the server's, never recomputed here. */
export const METRIC_FIELD: Record<Metric, string> = {
  runs: "runs", sr: "sr", avg: "avg", highest: "highest", sixes: "sixes", fours: "fours", boundaryPct: "boundaryPct", dotPct: "dotPct", balls: "balls",
  wickets: "wickets", econ: "econ", bowlAvg: "avg", bowlSr: "sr",
};

const TEAMS: [RegExp, string][] = [
  [/\b(chennai super kings|super kings|csk)\b/, "CSK"], [/\b(mumbai indians|mi)\b/, "MI"],
  [/\b(royal challengers( bengaluru| bangalore)?|rcb)\b/, "RCB"], [/\b(kolkata knight riders|knight riders|kkr)\b/, "KKR"],
  [/\b(sunrisers( hyderabad)?|srh)\b/, "SRH"], [/\b(delhi capitals|delhi daredevils|daredevils|capitals|dc)\b/, "DC"],
  [/\b(punjab kings|kings xi( punjab)?|kxip|pbks)\b/, "PBKS"], [/\b(rajasthan royals|royals|rr)\b/, "RR"],
  [/\b(gujarat titans|titans|gt)\b/, "GT"], [/\b(lucknow super giants|super giants|lsg)\b/, "LSG"],
];
const VENUE_CITY: [RegExp, RegExp][] = [
  [/\bjaipur\b/, /sawai mansingh/i], [/\bguwahati\b/, /barsapara|guwahati/i], [/\bchennai|chepauk\b/, /chidambaram|chepauk/i],
  [/\bmumbai|wankhede\b/, /wankhede/i], [/\bkolkata|eden\b/, /eden gardens/i], [/\bbengaluru|bangalore|chinnaswamy\b/, /chinnaswamy/i],
  [/\bdelhi|kotla\b/, /arun jaitley|feroz shah/i], [/\bhyderabad|uppal\b/, /rajiv gandhi/i], [/\bmohali\b/, /bindra|mohali/i],
  [/\bahmedabad\b/, /narendra modi|motera/i], [/\blucknow\b/, /ekana/i], [/\bpune\b/, /mca|maharashtra cricket/i],
  [/\bdharamsala\b/, /dharamsala|hpca/i], [/\bmullanpur|new chandigarh\b/, /yadavindra|mullanpur/i], [/\bdubai\b/, /dubai/i],
  [/\bsharjah\b/, /sharjah/i], [/\babu dhabi\b/, /zayed|abu dhabi/i], [/\bvisakhapatnam|vizag\b/, /reddy|vdca|visakhapatnam/i],
];
const STOP = new Set(["the", "and", "with", "from", "best", "most", "top", "since", "between", "against", "who", "which", "how", "many",
  "runs", "ipl", "show", "compare", "performance", "batters", "bowlers", "batter", "bowler", "over", "overs", "death", "middle", "rate",
  "strike", "at", "in", "of", "for", "vs", "score", "scored", "did", "has", "been", "when", "players", "player", "only", "now", "rank",
  "spin", "pace", "indian", "overseas", "chasing", "powerplay", "minimum", "balls", "least", "highest", "lowest", "economy", "wickets",
  "fastest", "reliable", "pressure", "since", "season", "seasons", "khan", "singh", "sharma", "kumar", "yadav", "pandya", "patel"]);

const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9+.' -]/g, " ").replace(/\s+/g, " ").trim();
const plainName = (s: string) => norm(s).replace(/[.']/g, "").trim();

function editDistance(a: string, b: string): number {
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++)
    d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return d[a.length][b.length];
}

/** Finds players named in the question: full names first, then unique-ish surnames (most-capped wins, noted). */
export function findPlayers(q: string, ctx: AskContext, notes: string[]): { name: string; role: Role; at: number }[] {
  let text = ` ${plainName(q)} `;
  const found: { name: string; role: Role; at: number }[] = [];
  const byFull = [...ctx.players].sort((a, b) => b.display.length - a.display.length);
  for (const p of byFull) {
    for (const label of new Set([plainName(p.display), plainName(p.name)])) {
      if (label.split(" ").length < 2) continue;
      const at = text.indexOf(` ${label} `);
      if (at >= 0 && !found.some(f => f.name === p.name)) {
        found.push({ name: p.name, role: p.role, at });
        text = text.slice(0, at) + " | ".padEnd(label.length + 2) + text.slice(at + label.length + 2);
      }
    }
  }
  for (const word of text.split(/[ |]+/)) {
    if (word.length < 4 || STOP.has(word) || /^\d/.test(word) || TEAMS.some(([re]) => re.test(word))) continue;
    const surname = (p: AskContext["players"][number]) => plainName(p.display).split(" ").pop()!;
    let hits = ctx.players.filter(p => surname(p) === word || plainName(p.name).split(" ").pop() === word);
    let fuzzy = false;
    if (!hits.length && word.length >= 6) { hits = ctx.players.filter(p => editDistance(surname(p), word) === 1); fuzzy = hits.length > 0; }
    if (!hits.length) continue;
    const best = [...hits].sort((a, b) => b.balls - a.balls)[0];
    if (found.some(f => f.name === best.name)) continue;
    found.push({ name: best.name, role: best.role, at: text.indexOf(word) });
    if (hits.length > 1 || fuzzy) notes.push(`"${word}" read as ${best.display}${hits.length > 1 ? ` (most balls of ${hits.length} matches)` : " (spelling corrected)"}`);
  }
  return found.sort((a, b) => a.at - b.at);
}

export const EMPTY_QUERY: AskQuery = { intent: "leaderboard", role: "batters", filters: {}, matchState: {}, metric: "runs", order: "desc", limit: 10, minBalls: 0, minInnings: 0, players: [], notes: [] };

const FOLLOW_UP = /^(only|just|now|and|also|but|then|what about|how about|minimum|min|at least|rank|sort|order|exclude|instead|compare the top|show only|make it|limit)\b/;

/**
 * Parses one question. With `prev`, a follow-up ("Only Indian players", "Minimum 250 balls", "Now rank by strike rate")
 * keeps every field of the previous validated query and changes only what the follow-up names.
 */
export function parseAsk(question: string, ctx: AskContext, prev?: AskQuery, prevTop: string[] = []): AskQuery {
  const q = ` ${norm(question)} `;
  const followUp = !!prev && (FOLLOW_UP.test(q.trim()) || q.trim().split(" ").length <= 4);
  const base: AskQuery = followUp && prev ? { ...prev, filters: { ...prev.filters }, matchState: { ...prev.matchState }, notes: [], players: [...prev.players] } : { ...EMPTY_QUERY, filters: {}, matchState: {}, notes: [], players: [] };
  const out = base;
  const f = out.filters;
  const latest = ctx.years[ctx.years.length - 1] ?? "2026";

  // ── unsupported families, stated precisely ──
  if (/\bsimilar\b|\blike\b.*\bprofile\b/.test(q)) return { ...out, intent: "unsupported", unsupported: "Similar-player search needs a validated similarity model over role and per-phase profiles; none is published yet." };
  if (/\b(supporting|evidence|deliveries supporting|which matches)\b/.test(q) && !/\bpressure\b/.test(q)) return { ...out, intent: "unsupported", unsupported: "Ball-level evidence listing is not served by the production stats API; use a player's page for match-by-match innings." };
  if (/\b(how successful|win(ning)? (record|percentage|%)|won .* when|team record)\b/.test(q) && TEAMS.some(([re]) => re.test(q)))
    return { ...out, intent: "unsupported", unsupported: "Team chase/defend records need the batting-first side per match; matches.json lists team1/team2 without it (team1 batted first in only ~76% of results), so the answer cannot be verified." };
  if (/\bhome\b|\baway\b/.test(q)) out.notes.push("Home / away is not available: there is no verified home-ground mapping per franchise and season");

  // ── role ──
  const bowlingWords = /\b(bowler|bowlers|bowling|wickets?|economy|economical|spinners?|pacers?|seamers?|leg-?spinners?|off-?spinners?|dot balls? bowled)\b/;
  const facingWords = /\b(against|vs|versus|facing)\s+(spin|pace|leg-?spin|off-?spin|left-arm|right-arm|spinners|pacers)/;
  if (bowlingWords.test(q) && !facingWords.test(q)) out.role = "bowlers";
  else if (!followUp || /\bbatters?\b/.test(q)) out.role = "batters";

  // ── seasons ──
  let m: RegExpExecArray | null;
  if ((m = /\b(?:between|from)\s+(20\d\d)\s+(?:and|to|-)\s+(20\d\d)\b/.exec(q)) || (m = /\b(20\d\d)\s*(?:-|–|to)\s*(20\d\d)\b/.exec(q))) {
    const [a, b] = [m[1], m[2]].sort();
    Object.assign(f, { season: "All Seasons", seasonFrom: a, seasonTo: b });
  } else if ((m = /\bsince\s+(20\d\d)\b/.exec(q))) Object.assign(f, { season: "All Seasons", seasonFrom: m[1], seasonTo: latest });
  else if ((m = /\b(?:last|past)\s+(\d|two|three|four|five)\s+seasons?\b/.exec(q))) {
    const n = Number(m[1]) || ({ two: 2, three: 3, four: 4, five: 5 } as Record<string, number>)[m[1]];
    Object.assign(f, { season: "All Seasons", seasonFrom: String(Number(latest) - n + 1), seasonTo: latest });
  } else if ((m = /\b(?:ipl\s*|in\s+|season\s+|during\s+)?(20(?:0[89]|1\d|2\d))\b/.exec(q)) && ctx.years.includes(m[1])) Object.assign(f, { season: m[1], seasonFrom: "", seasonTo: "" });
  else if (/\b(all[- ]time|ever|career)\b/.test(q)) Object.assign(f, { season: "All Seasons", seasonFrom: "", seasonTo: "" });

  // ── phase / overs ──
  if (/\bdeath\b/.test(q)) f.phase = "Death";
  else if (/\bpower ?play\b|\bpp\b/.test(q)) f.phase = "Powerplay";
  else if (/\bmiddle[- ]overs?\b|\bmiddle\b/.test(q)) f.phase = "Middle";
  if ((m = /\bovers?\s+(\d{1,2})\s*(?:-|to|–)\s*(\d{1,2})\b/.exec(q)) && Number(m[1]) >= 1 && Number(m[2]) <= 20 && Number(m[1]) <= Number(m[2])) f.overRange = `${m[1]}-${m[2]}`;

  // ── bowling style / type ──
  const style: [RegExp, string][] = [[/\bleg-?spin(ners?)?\b|\bleg-?break|\bwrist-?spin(ners?)? right/, "leg-spin"], [/\boff-?spin(ners?)?\b|\boff-?break/, "right-arm-off-spin"],
    [/\bleft-arm (orthodox|finger)|\bslow left-arm\b|\bsla\b/, "left-arm-orthodox"], [/\bleft-arm wrist|\bchinaman\b/, "left-arm-wrist-spin"],
    [/\bleft-arm (fast|quick|pace|seam)/, "left-arm-fast-medium"], [/\bright-arm fast\b/, "right-arm-fast"]];
  const styleHit = style.find(([re]) => re.test(q));
  if (styleHit) { f.bowlStyle = styleHit[1]; f.bowler_type = "All Bowlers"; if (styleHit[1] === "left-arm-fast-medium") out.notes.push("Left-arm pace read as left-arm fast-medium (bio style)"); }
  else if (/\bspin(ners?)?\b/.test(q)) { f.bowler_type = "Spinner"; f.bowlStyle = "all"; }
  else if (/\b(pace|pacers?|seam(ers)?|fast bowl(ers|ing))\b/.test(q)) { f.bowler_type = "Pacer"; f.bowlStyle = "all"; }

  // ── handedness (bowlers vs batter hand) ──
  if (/\bleft-?hand(ed|ers)?\b|\blhbs?\b/.test(q)) f.batterHandedness = "vs LHB";
  else if (/\bright-?hand(ed|ers)?\b|\brhbs?\b/.test(q)) f.batterHandedness = "vs RHB";
  if (f.batterHandedness && f.batterHandedness !== "All Batters" && out.role === "batters") { out.role = "bowlers"; out.notes.push("Batter handedness splits bowling figures, so this ranks bowlers"); }

  // ── nationality, innings, match type ──
  if (/\bindian\b/.test(q)) f.nationality = "indian";
  else if (/\b(overseas|foreign|international)\b/.test(q)) f.nationality = "overseas";
  else if (/\b(all nationalities|any nationality)\b/.test(q)) f.nationality = "all";
  if (/\b(chasing|chase|second innings|2nd innings|batting second)\b/.test(q)) f.innings = "2nd Innings (Chasing)";
  else if (/\b(batting first|setting|first innings|1st innings|defending)\b/.test(q)) f.innings = "1st Innings (Setting)";
  if (/\bfinals?\b/.test(q)) f.match_context = "Final";
  else if (/\b(playoffs?|knock-?outs?|eliminators?|qualifiers?)\b/.test(q)) f.match_context = "Playoffs";
  else if (/\bleague (stage|matches)\b/.test(q)) f.match_context = "League Stage";

  // ── match state ──
  if ((m = /\brequired (?:run )?rate (?:is |of )?(?:above|over|exceeds|exceeding|more than|greater than|>=?|at least)\s*(\d{1,2}(?:\.\d)?)\b/.exec(q))) { out.matchState.minRequiredRate = Number(m[1]); f.innings = "2nd Innings (Chasing)"; }
  if ((m = /\brequired (?:run )?rate (?:is |of )?(?:below|under|less than|<=?)\s*(\d{1,2}(?:\.\d)?)\b/.exec(q))) { out.matchState.maxRequiredRate = Number(m[1]); f.innings = "2nd Innings (Chasing)"; }
  if ((m = /\bchas(?:ing|es?) (?:of )?(?:over |more than |above )?(\d{3})\s*(\+|or more|plus)?/.exec(q))) { out.matchState.minTarget = Number(m[1]) + (m[2] || /\b(over|more than|above)\b/.test(m[0]) ? (m[2] ? 0 : 1) : 0); f.innings = "2nd Innings (Chasing)"; }
  if ((m = /\b(\d{1,3}) (?:runs )?(?:needed|required|to win) (?:from|off|in) (\d{1,3}) balls\b/.exec(q))) {
    out.matchState.minRunsNeeded = out.matchState.maxRunsNeeded = Number(m[1]);
    out.matchState.minBallsLeft = out.matchState.maxBallsLeft = Number(m[2]);
    f.innings = "2nd Innings (Chasing)";
    out.notes.push(`${m[1]} from ${m[2]} balls = required rate ${(Number(m[1]) * 6 / Number(m[2])).toFixed(2)}`);
  }
  if (/\bclutch\b/.test(q) && !/\breliab/.test(q)) f.pressure_state = "Clutch Moment";
  else if (/\bhigh[- ]pressure\b/.test(q) && !/\breliab/.test(q)) f.pressure_state = "High Pressure";

  // ── sample thresholds ──
  if ((m = /\b(?:at least|minimum(?: of)?|min(?:imum)?\.?|>=?)\s*(\d{1,4})\s*(?:balls|deliveries)\b/.exec(q)) || (m = /\b(\d{1,4})\+?\s*(?:balls|deliveries) minimum\b/.exec(q)) || (m = /\b(\d{2,4})\+\s*balls\b/.exec(q))) out.minBalls = Number(m[1]);
  if ((m = /\b(?:at least|minimum(?: of)?|min)\s*(\d{1,3})\s*innings\b/.exec(q))) out.minInnings = Number(m[1]);

  // ── metric / order / limit ──
  const metricRules: [RegExp, Metric, Role?][] = [
    [/\b(strike rate|sr|fastest|quickest|scoring rate)\b/, "sr"], [/\bbatting average|\baverage\b(?! economy)/, "avg"], [/\bhighest (individual )?scores?\b|\bbest scores?\b/, "highest", "batters"],
    [/\bsix(es)?\b/, "sixes"], [/\bfours\b/, "fours"], [/\bboundar(y|ies)\b/, "boundaryPct"], [/\bdot[- ]?balls?\b|\bdot ?%/, "dotPct"],
    [/\b(economy|economical|cheapest|tightest)\b/, "econ", "bowlers"], [/\bwickets?\b/, "wickets", "bowlers"], [/\bruns\b/, "runs"],
  ];
  const metricHit = metricRules.find(([re]) => re.test(q));
  if (metricHit) {
    out.metric = metricHit[1];
    if (metricHit[2]) out.role = metricHit[2];
    if (out.role === "bowlers" && metricHit[1] === "avg") out.metric = "bowlAvg";
    if (out.role === "bowlers" && metricHit[1] === "sr") out.metric = "bowlSr";
    if (out.role === "bowlers" && metricHit[1] === "runs") out.metric = "wickets";
  } else if (!followUp) out.metric = out.role === "bowlers" ? (/\bbest\b/.test(q) && (f.phase === "Death" || f.bowlStyle || f.batterHandedness) ? "econ" : "wickets") : "runs";
  if (out.role === "bowlers" && !["wickets", "econ", "bowlAvg", "bowlSr", "dotPct", "balls"].includes(out.metric)) out.metric = /\bbest\b/.test(q) ? "econ" : "wickets";
  if (out.role === "batters" && ["wickets", "econ", "bowlAvg", "bowlSr"].includes(out.metric)) out.metric = "runs";
  const lowerIsBetter = ["econ", "bowlAvg", "bowlSr"].includes(out.metric);
  out.order = /\b(lowest|worst|fewest|least)\b/.test(q) ? (lowerIsBetter ? "desc" : "asc") : lowerIsBetter ? "asc" : "desc";
  if ((m = /\btop\s+(\d{1,2}|ten|five|three|twenty)\b/.exec(q))) out.limit = Number(m[1]) || ({ ten: 10, five: 5, three: 3, twenty: 20 } as Record<string, number>)[m[1]];
  if (["sr", "avg", "econ", "bowlAvg", "bowlSr", "dotPct", "boundaryPct"].includes(out.metric) && !out.minBalls) {
    out.minBalls = out.role === "bowlers" ? 120 : 100;
    out.notes.push(`Rate metric: minimum ${out.minBalls} balls assumed so tiny samples don't top the list`);
  }

  // ── teams / venue ──
  const venueHits = VENUE_CITY.filter(([re]) => re.test(q)).flatMap(([, vre]) => ctx.venues.filter(v => vre.test(v)));
  const named = ctx.venues.filter(v => q.includes(` ${norm(v)} `));
  const venues = [...new Set([...venueHits, ...named])];
  if (venues.length) f.venue = venues.join("|");
  const oppMatch = /\b(?:against|vs|versus|facing)\s+([a-z ]{2,30}?)(?=\s+(?:in|at|since|between|during|from)\b|\s*$|[?.,])/.exec(q);
  if (oppMatch) {
    const opp = TEAMS.filter(([re]) => re.test(` ${oppMatch[1]} `)).map(([, c]) => c);
    if (opp.length) f.opposition = opp.join("|");
  }
  const forTeam = TEAMS.filter(([re]) => re.test(q)).map(([, c]) => c).filter(c => !(f.opposition ?? "").split("|").includes(c));
  if (forTeam.length && !/\bat\s+(jaipur|guwahati|chennai|mumbai|kolkata|bengaluru|bangalore|delhi|hyderabad|ahmedabad|lucknow)\b/.test(q)) f.team = forTeam.join("|");

  // ── players and intent ──
  const players = findPlayers(question, ctx, out.notes);
  if (players.length) out.players = players.map(p => p.name);
  const pressure = /\b(pressure|clutch)\b.*\breliab|\breliab\w*\b.*\b(pressure|clutch)\b|\bpressure (batters|bowlers|performers)\b/.test(q);
  if (pressure) out.intent = "pressure";
  else if (/\braa\b|runs above average/.test(q)) out.intent = "batter-lens";
  else if (/\bcompare the top (\d|two|three|five)\b/.test(q) && prevTop.length) {
    const n = Number(/top (\d)/.exec(q)?.[1]) || ({ two: 2, three: 3, five: 5 } as Record<string, number>)[/top (two|three|five)/.exec(q)?.[1] ?? ""] || 3;
    out.intent = "compare"; out.players = prevTop.slice(0, n);
  } else if (/\b(changed|trend|season[- ]by[- ]season|season-wise|over the years|each season|per season)\b/.test(q) && players.length >= 1) {
    out.intent = "trend"; out.players = [players[0].name];
    if (!f.seasonFrom && !(f.season && f.season !== "All Seasons")) Object.assign(f, { seasonFrom: ctx.years[Math.max(0, ctx.years.length - 5)], seasonTo: latest });
  } else if (players.length >= 2 && /\b(against|vs|versus|facing)\b/.test(q) && players[0].role !== players[1].role) {
    const batter = players.find(p => p.role === "batters")!, bowler = players.find(p => p.role === "bowlers")!;
    out.intent = "matchup"; out.role = "batters"; f.batter = batter.name; f.bowler = bowler.name; out.players = [batter.name];
  } else if (players.length >= 2 && /\b(against|vs|versus|facing)\b/.test(q) && players[0].role === "batters") {
    // Both names resolved to batters (e.g. a bowler who also bats): treat the second as the bowler faced.
    out.intent = "matchup"; out.role = "batters"; f.batter = players[0].name; f.bowler = players[1].name; out.players = [players[0].name];
  } else if (players.length >= 2 || (/\bcompare\b/.test(q) && players.length)) {
    out.intent = "compare"; out.players = players.map(p => p.name);
    if (!bowlingWords.test(q)) out.role = players.every(p => p.role === "bowlers") ? "bowlers" : "batters";
  } else if (players.length === 1) {
    out.intent = "player"; out.role = bowlingWords.test(q) ? "bowlers" : players[0].role === "bowlers" && !/\b(runs|score|bat|strike rate)\b/.test(q) ? "bowlers" : "batters";
  } else if (!followUp || !["compare", "player", "matchup", "trend"].includes(out.intent)) out.intent = followUp && prev ? (prev.intent === "pressure" || prev.intent === "batter-lens" ? prev.intent : "leaderboard") : "leaderboard";
  if (/\brank(ed)? by pressure raa\b/.test(q)) out.intent = "pressure";

  return out;
}

/** Same param mapping as the desktop Stats Centre query, so Ask AI and the dashboard hit identical calculations. */
export function askParams(f: Partial<AnalyticsFilters>, ms: MatchState, defaults: AnalyticsFilters): string {
  const v = { ...defaults, ...f };
  const p = new URLSearchParams();
  const pairs: [string, string, string][] = [
    ["season", v.season, "All Seasons"], ["team", v.team, "All Teams"], ["opponent", v.opposition, "All Opponents"], ["venue", v.venue, "All Venues"],
    ["phase", v.phase, "All Phases"], ["bowlerType", v.bowler_type, "All Bowlers"], ["pressure", v.pressure_state, "Standard"], ["nationality", v.nationality, "all"],
    ["innings", v.innings, "All Innings"], ["matchContext", v.match_context, "All Matches"], ["battingHand", v.batterHandedness, "All Batters"],
    ["batter", v.batter, "All Batters"], ["bowler", v.bowler, "All Bowlers"], ["seasonFrom", v.seasonFrom, ""], ["seasonTo", v.seasonTo, ""],
    ["dateFrom", v.dateFrom, ""], ["dateTo", v.dateTo, ""], ["battingPosition", v.battingPosition, "all"], ["matchResult", v.matchResult, "all"],
    ["bowlStyle", v.bowlStyle, "all"], ["overRange", v.overRange, "All"], ["representation", v.representation, "overall"],
  ];
  for (const [k, val, unset] of pairs) if (val && val !== unset) p.set(k, val);
  for (const [k, val] of Object.entries(ms)) p.set(k, String(val));
  return p.toString();
}
