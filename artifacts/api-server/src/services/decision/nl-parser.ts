// Decision Intelligence OS — Phase 1: ask-style natural language → StatQuery.
//
// Deterministic and explainable: each recognised phrase is consumed from the
// question and becomes one typed field of a StatQuery, which the UI shows
// back as removable chips. Nothing here touches SQL. Ambiguities (two players
// called "Pandya") are resolved to the most-capped player and reported in
// `notes` so the user can see — and correct — what was assumed.

import { getPlayerMeta, getSeasonLines, getSeasons } from "./player-profiles";
import {
  METRICS,
  getFranchiseRefs,
  getVenueRefs,
  type GroupBy,
  type MetricId,
  type Perspective,
  type StatFilters,
  type StatQuery,
} from "./stats-engine";

export interface ParseResult {
  understood: boolean;
  query: StatQuery | null;
  notes: string[];
}

/* ─── Text consumption ───────────────────────────────────────────────────── */

class Text {
  s: string;
  constructor(s: string) { this.s = s; }
  /** Remove the first match, leaving a separator so later n-grams can't span it. */
  take(re: RegExp): RegExpExecArray | null {
    const m = re.exec(this.s);
    if (m) this.s = `${this.s.slice(0, m.index)} | ${this.s.slice(m.index + m[0].length)}`;
    return m;
  }
  has(re: RegExp): boolean { return re.test(this.s); }
}

const WORD_NUMBERS: Record<string, number> = {
  one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
  fifteen: 15, twenty: 20, twentyfive: 25, fifty: 50,
};
const num = (s: string) => WORD_NUMBERS[s] ?? Number(s);
const NUM = "(\\d{1,2}|one|two|three|four|five|six|seven|eight|nine|ten|fifteen|twenty)";

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

function normName(s: string): string {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z ]/g, " ").replace(/\s+/g, " ").trim();
}

/* ─── Team aliases ───────────────────────────────────────────────────────── */

const TEAM_ALIASES: [string, string][] = [
  ["chennai super kings", "Chennai Super Kings"], ["super kings", "Chennai Super Kings"], ["csk", "Chennai Super Kings"], ["chennai", "Chennai Super Kings"],
  ["mumbai indians", "Mumbai Indians"], ["mi", "Mumbai Indians"], ["mumbai", "Mumbai Indians"],
  ["royal challengers bengaluru", "Royal Challengers Bengaluru"], ["royal challengers bangalore", "Royal Challengers Bengaluru"],
  ["royal challengers", "Royal Challengers Bengaluru"], ["rcb", "Royal Challengers Bengaluru"],
  ["bangalore", "Royal Challengers Bengaluru"], ["bengaluru", "Royal Challengers Bengaluru"],
  ["kolkata knight riders", "Kolkata Knight Riders"], ["knight riders", "Kolkata Knight Riders"], ["kkr", "Kolkata Knight Riders"], ["kolkata", "Kolkata Knight Riders"],
  ["sunrisers hyderabad", "Sunrisers Hyderabad"], ["sunrisers", "Sunrisers Hyderabad"], ["srh", "Sunrisers Hyderabad"], ["hyderabad", "Sunrisers Hyderabad"],
  ["delhi capitals", "Delhi Capitals"], ["delhi daredevils", "Delhi Capitals"], ["daredevils", "Delhi Capitals"], ["capitals", "Delhi Capitals"],
  ["dc", "Delhi Capitals"], ["dd", "Delhi Capitals"], ["delhi", "Delhi Capitals"],
  ["punjab kings", "Punjab Kings"], ["kings xi punjab", "Punjab Kings"], ["kings xi", "Punjab Kings"], ["kxip", "Punjab Kings"],
  ["pbks", "Punjab Kings"], ["punjab", "Punjab Kings"],
  ["rajasthan royals", "Rajasthan Royals"], ["royals", "Rajasthan Royals"], ["rr", "Rajasthan Royals"], ["rajasthan", "Rajasthan Royals"],
  ["gujarat titans", "Gujarat Titans"], ["titans", "Gujarat Titans"], ["gt", "Gujarat Titans"], ["gujarat", "Gujarat Titans"],
  ["lucknow super giants", "Lucknow Super Giants"], ["super giants", "Lucknow Super Giants"], ["lsg", "Lucknow Super Giants"], ["lucknow", "Lucknow Super Giants"],
  ["deccan chargers", "Deccan Chargers"], ["deccan", "Deccan Chargers"],
  ["gujarat lions", "Gujarat Lions"],
  ["rising pune supergiants", "Rising Pune Supergiant"], ["rising pune supergiant", "Rising Pune Supergiant"], ["rps", "Rising Pune Supergiant"],
  ["pune warriors india", "Pune Warriors"], ["pune warriors", "Pune Warriors"], ["pwi", "Pune Warriors"],
  ["kochi tuskers kerala", "Kochi Tuskers Kerala"], ["kochi tuskers", "Kochi Tuskers Kerala"],
].sort((a, b) => b[0].length - a[0].length) as [string, string][];

// City names that are also team aliases: "at Chennai" is a venue, "Chennai" alone is CSK.
const CITY_ALIASES = new Set(["chennai", "mumbai", "bangalore", "bengaluru", "kolkata", "hyderabad", "delhi", "lucknow"]);

/* ─── Venue aliases ──────────────────────────────────────────────────────── */

const VENUE_NICKNAMES: Record<string, string> = {
  chepauk: "chidambaram", kotla: "arun jaitley", motera: "narendra modi", uppal: "rajiv gandhi",
  eden: "eden gardens", chinnaswamy: "chinnaswamy", wankhede: "wankhede", brabourne: "brabourne",
  "dy patil": "patil", "sawai mansingh": "sawai mansingh", sms: "sawai mansingh", mohali: "bindra",
  "is bindra": "bindra", ekana: "ekana", dharamsala: "himachal", dharamshala: "himachal", hpca: "himachal",
  mullanpur: "mullanpur", vizag: "visakhapatnam", barsapara: "barsapara", guwahati: "barsapara",
  sharjah: "sharjah", "abu dhabi": "zayed", zayed: "zayed", dubai: "dubai",
};

const GENERIC_VENUE_WORDS = new Set([
  "stadium", "cricket", "international", "association", "ground", "sports", "academy", "the", "of", "and",
  "dr", "shri", "bharat", "ratna", "club", "park", "oval", "ma", "m", "dy", "is", "acavdca", "aca", "vdca",
  "maharashtra", "punjab", "rajiv", "gandhi", "narendra", "arun", "new", "sheikh", "saurashtra",
  // Personal names inside ground names would swallow player names ("Arshdeep Singh", "PR Veer", "C Green").
  "singh", "reddy", "sharma", "kumar", "patel", "patil", "khan", "yadav", "subrata", "maharaja",
  "veer", "shaheed", "narayan", "green", "george", "nehru", "complex", "shah", "diamond",
]);

interface VenueAlias { re: RegExp; ids: number[]; name: string; cityOnly: boolean; city: string | null }

let venueAliasCache: VenueAlias[] | null = null;

function venueAliases(): VenueAlias[] {
  if (venueAliasCache) return venueAliasCache;
  const refs = getVenueRefs();
  const out: VenueAlias[] = [];
  const add = (alias: string, ids: number[], name: string, cityOnly: boolean, city: string | null) => {
    if (alias.length < 3) return;
    out.push({ re: new RegExp(`\\b${escapeRe(alias)}\\b`), ids, name, cityOnly, city });
  };
  const tokenOwners = new Map<string, Set<string>>();
  for (const v of refs) {
    for (const tok of normName(v.name).split(" ")) {
      if (tok.length < 4 || GENERIC_VENUE_WORDS.has(tok)) continue;
      const s = tokenOwners.get(tok) ?? new Set<string>();
      s.add(v.key);
      tokenOwners.set(tok, s);
    }
  }
  for (const v of refs) {
    add(normName(v.name), v.venueIds, v.name, false, v.city);
    for (const tok of normName(v.name).split(" ")) {
      if (tokenOwners.get(tok)?.size === 1) add(tok, v.venueIds, v.name, false, v.city);
    }
  }
  for (const [nick, needle] of Object.entries(VENUE_NICKNAMES)) {
    const hits = refs.filter((v) => normName(v.name).includes(needle) || normName(v.city ?? "") === needle);
    if (hits.length) add(nick, hits.flatMap((h) => h.venueIds), hits.map((h) => h.name).join(" / "), false, hits[0].city);
  }
  // Cities: every ground in that city.
  const byCity = new Map<string, typeof refs>();
  for (const v of refs) {
    for (const city of v.cities) {
      const c = normName(city);
      byCity.set(c, [...(byCity.get(c) ?? []), v]);
    }
  }
  for (const [city, vs] of byCity) add(city, vs.flatMap((v) => v.venueIds), vs.map((v) => v.name).join(" / "), true, city);
  venueAliasCache = out.sort((a, b) => b.re.source.length - a.re.source.length);
  return venueAliasCache;
}

/* ─── Player aliases ─────────────────────────────────────────────────────── */

// Single-word aliases that are also ordinary cricket/English words.
const NAME_STOPWORDS = new Set([
  "most", "runs", "run", "best", "top", "highest", "high", "ball", "balls", "over", "overs", "short", "head", "green",
  "little", "wood", "hope", "chase", "rain", "power", "play", "death", "middle", "final", "finals", "season", "seasons",
  "year", "team", "teams", "wicket", "wickets", "six", "sixes", "four", "fours", "average", "strike", "rate", "economy",
  "match", "matches", "win", "wins", "won", "stats", "record", "records", "player", "players", "bowler", "bowlers",
  "batter", "batters", "king", "kings", "royal", "super", "giants", "titans", "capitals", "indians", "riders", "knight",
  "lions", "warriors", "chargers", "sunrisers", "career", "score", "scores", "total", "innings", "first", "second", "last",
  "against", "since", "with", "from", "have", "has", "the", "and", "for", "who", "which", "what", "how", "many", "much",
  "all", "time", "ever", "left", "right", "hand", "spin", "pace", "fast", "slow", "quick", "good", "great", "young",
  "new", "most", "least", "lowest", "fewest", "worst", "best", "ipl", "bowling", "batting", "fielding", "venue", "ground",
  "stadium", "phase", "powerplay", "chasing", "defending", "playoffs", "playoff", "knockout", "league", "indian",
  "overseas", "foreign", "between", "before", "after", "during", "show", "list", "give", "tell", "compare", "versus",
  "only", "minimum", "least", "balls", "faced", "bowled", "conceded", "dot", "dots", "boundary", "boundaries", "duck",
  "ducks", "fifty", "fifties", "hundred", "hundreds", "century", "centuries", "title", "titles", "trophies", "card",
  "fifer", "haul", "hauls", "figures", "spell", "spells", "knock", "knocks", "average", "per", "each", "every", "by",
  "this", "that", "year", "years", "edition", "history", "highest", "biggest", "fastest", "cricket", "game", "games",
  "sharma", "singh", "kumar", "khan", "patel",
]);

const NICKNAMES: Record<string, string> = {
  msd: "MS Dhoni", mahi: "MS Dhoni", abd: "AB de Villiers", sky: "SA Yadav", hitman: "RG Sharma",
  jaddu: "RA Jadeja", bhuvi: "B Kumar", "king kohli": "V Kohli", ashwin: "R Ashwin", "universe boss": "CH Gayle",
};

interface PlayerAlias { ids: number[] } // ordered by prominence (matches played)

let playerAliasCache: { byAlias: Map<string, PlayerAlias>; maxWords: number; matches: Map<number, number> } | null = null;

function playerAliases() {
  if (playerAliasCache) return playerAliasCache;
  const meta = getPlayerMeta();
  const lines = getSeasonLines();
  const matches = new Map<number, number>();
  for (const [pid, ls] of lines) matches.set(pid, ls.reduce((s, l) => s + l.matches, 0));

  const raw = new Map<string, Set<number>>();
  const add = (alias: string, id: number) => {
    const a = normName(alias);
    if (!a || a.length < 3) return;
    if (!a.includes(" ") && NAME_STOPWORDS.has(a)) return;
    const s = raw.get(a) ?? new Set<number>();
    s.add(id);
    raw.set(a, s);
  };
  const firstNames = new Map<string, Set<number>>();
  for (const m of meta.values()) {
    if (!matches.get(m.playerId)) continue;
    add(m.name, m.playerId);
    const toks = normName(m.name).split(" ");
    add(toks[toks.length - 1], m.playerId); // surname
    if (toks.length >= 3) add(toks.slice(-2).join(" "), m.playerId); // "de villiers"
    if (m.fullName) {
      const ft = normName(m.fullName).split(" ");
      add(m.fullName, m.playerId);
      if (ft.length >= 3) add(`${ft[0]} ${ft[ft.length - 1]}`, m.playerId);
      if (ft[0].length >= 4 && !NAME_STOPWORDS.has(ft[0])) {
        const s = firstNames.get(ft[0]) ?? new Set<number>();
        s.add(m.playerId);
        firstNames.set(ft[0], s);
      }
    }
  }
  const byMatches = (ids: Iterable<number>) => [...ids].sort((a, b) => (matches.get(b) ?? 0) - (matches.get(a) ?? 0));
  const byAlias = new Map<string, PlayerAlias>();
  for (const [a, ids] of raw) byAlias.set(a, { ids: byMatches(ids) });
  // First names only when one player clearly dominates ("virat", "jasprit").
  for (const [first, ids] of firstNames) {
    if (byAlias.has(first)) continue;
    const ordered = byMatches(ids);
    const top = matches.get(ordered[0]) ?? 0;
    const next = matches.get(ordered[1]) ?? 0;
    if (top >= 20 && top >= 3 * next) byAlias.set(first, { ids: [ordered[0]] });
  }
  const nameToId = new Map([...meta.values()].map((m) => [m.name, m.playerId]));
  for (const [nick, name] of Object.entries(NICKNAMES)) {
    const id = nameToId.get(name);
    if (id !== undefined) byAlias.set(nick, { ids: [id] });
  }
  const maxWords = Math.max(...[...byAlias.keys()].map((k) => k.split(" ").length));
  playerAliasCache = { byAlias, maxWords, matches };
  return playerAliasCache;
}

interface FoundPlayer { id: number; at: number; alias: string }

function findPlayers(t: Text, notes: string[]): FoundPlayer[] {
  const { byAlias, maxWords, matches } = playerAliases();
  const meta = getPlayerMeta();
  const tokens = t.s.split(/\s+/).map((w) => w.replace(/'s$|'$/g, ""));
  const used = new Array(tokens.length).fill(false);
  const found: FoundPlayer[] = [];
  for (let n = maxWords; n >= 1; n--) {
    for (let i = 0; i + n <= tokens.length; i++) {
      if (used.slice(i, i + n).some(Boolean)) continue;
      const span = tokens.slice(i, i + n);
      if (span.some((w) => w === "|" || !w)) continue;
      const alias = normName(span.join(" "));
      const hit = byAlias.get(alias);
      if (!hit) continue;
      const [id, ...others] = hit.ids;
      if (found.some((f) => f.id === id)) continue;
      for (let k = i; k < i + n; k++) used[k] = true;
      found.push({ id, at: i, alias });
      const top = matches.get(id) ?? 0;
      const rivals = others.filter((o) => (matches.get(o) ?? 0) >= top * 0.25).slice(0, 3);
      if (rivals.length) {
        notes.push(`"${alias}" read as ${meta.get(id)?.name} — also matches ${rivals.map((r) => meta.get(r)?.name).join(", ")}. Use the full name to pick another.`);
      }
    }
  }
  // Consume the matched words.
  t.s = tokens.map((w, i) => (used[i] ? "|" : w)).join(" ");
  return found.sort((a, b) => a.at - b.at);
}

/* ─── Metric patterns ────────────────────────────────────────────────────── */

const BOWLING_CTX = /\b(bowl(?:er|ers|ing|ed)?|conceded|concede|spinners?|pacers?|seamers?|quicks|wicket ?takers?|economical|expensive|figures|spells?|fast bowlers?|spin bowlers?)\b/;
const BATTING_CTX = /\b(bat(?:ter|ters|ting|sman|smen)?|scorers?|scored|hitters?|knocks?|faced|run ?getters?)\b/;

interface MetricHit { metric: MetricId; record?: boolean; teamInnings?: boolean }

function detectMetric(t: Text): MetricHit | null {
  const bowl = t.has(BOWLING_CTX);
  const bat = t.has(BATTING_CTX);
  const rules: [RegExp, () => MetricHit][] = [
    [/\bbest (?:bowling )?(?:figures|spells?)\b|\bbest bowling\b/, () => ({ metric: "wickets", record: true })],
    [/\b(?:highest|biggest|lowest|smallest|best|record) (?:team )?totals?\b|\bteam totals?\b|\b(?:highest|lowest) team scores?\b|\b(?:highest|lowest) (?:innings )?scores? by a team\b/, () => ({ metric: "total", teamInnings: true })],
    [/\b(?:highest|best|top|biggest) (?:individual )?(?:scores?|knocks?|innings)\b/, () => ({ metric: "runs", record: true })],
    [/\bmost sixes in an? (?:innings|knock|match)\b/, () => ({ metric: "sixes", record: true })],
    [/\bfastest (?:fifty|fifties|hundreds?|centur(?:y|ies)|innings|knocks?)\b/, () => ({ metric: "strike_rate", record: true })],
    [/\b(?:4|four) ?(?:wicket hauls?|wkt hauls?|fers?|wickets in an innings)\b/, () => ({ metric: "four_wicket_hauls" })],
    [/\b(?:5|five) ?(?:wicket hauls?|wkt hauls?|fers?|wickets in an innings)\b|\bfifers?\b/, () => ({ metric: "five_wicket_hauls" })],
    [/\bhalf ?centur(?:y|ies)\b|\bfift(?:y|ies)\b|\b50s\b/, () => ({ metric: "fifties" })],
    [/\bcentur(?:y|ies)\b|\bhundreds?\b|\b100s\b|\btons\b/, () => ({ metric: "hundreds" })],
    [/\bducks?\b/, () => ({ metric: "ducks" })],
    [/\bdot ?balls? ?(?:%|percentage\b|percent\b)|\bdot ?ball rate\b/, () => ({ metric: bat && !bowl ? "dot_pct_faced" : "dot_pct" })],
    [/\bdot ?balls?\b|\bdots\b/, () => ({ metric: bat && !bowl ? "dot_pct_faced" : "dot_balls" })],
    [/\bruns? conceded\b|\bconceded (?:the )?most runs\b/, () => ({ metric: "runs_conceded" })],
    [/\bsixes conceded\b|\bconceded (?:the )?most sixes\b/, () => ({ metric: "sixes_conceded" })],
    [/\b(?:economy(?: rate)?|econ|eco|economical|expensive|runs per over conceded)\b/, () => ({ metric: "economy" })],
    [/\bbowling averages?\b/, () => ({ metric: "bowling_average" })],
    [/\bbowling strike ?rates?\b/, () => ({ metric: "bowling_strike_rate" })],
    [/\b(?:wickets?|wkts?|scalps|wicket ?takers?)\b/, () => ({ metric: "wickets" })],
    [/\bstrike ?rates?\b|\bsr\b/, () => ({ metric: bowl && !bat ? "bowling_strike_rate" : "strike_rate" })],
    [/\b(?:average|avg|par) (?:first innings )?(?:score|total)s?\b|\bhighest scoring\b|\bscoring venues?\b/, () => ({ metric: "avg_score" })],
    [/\baverages?\b|\bavg\b/, () => ({ metric: bowl && !bat ? "bowling_average" : "average" })],
    [/\brun ?rates?\b|\bscoring rates?\b|\brpo\b/, () => ({ metric: "run_rate" })],
    // "%" is not a word character, so no \b after it.
    [/\bboundary ?(?:%|percentage\b|percent\b|rate\b)/, () => ({ metric: "boundary_pct" })],
    [/\bsixes\b|\b6s\b|\bmaximums\b|\bsix ?hitters?\b/, () => ({ metric: "sixes" })],
    [/\bfours\b|\b4s\b/, () => ({ metric: "fours" })],
    [/\bboundar(?:y|ies)\b/, () => ({ metric: "boundaries" })],
    [/\b(?:titles?|trophies|championships?|won the ipl|ipl wins)\b/, () => ({ metric: "titles" })],
    [/\bwin(?:ning)? ?(?:%|percent(?:age)?\b|rate\b|ratio\b|record\b)|\bsuccess rate\b/, () => ({ metric: "win_pct" })],
    [/\b(?:wins|won|victories|win)\b/, () => ({ metric: "wins" })],
    [/\b(?:losses|lost|defeats)\b/, () => ({ metric: "losses" })],
    [/\bballs faced\b/, () => ({ metric: "balls_faced" })],
    [/\b(?:balls|overs) bowled\b/, () => ({ metric: "balls_bowled" })],
    [/\bmatches played\b|\bgames played\b/, () => ({ metric: "matches" })],
    [/\bruns?\b|\brun ?(?:scorers?|getters?)\b|\bscored\b/, () => ({ metric: "runs" })],
  ];
  for (const [re, hit] of rules) {
    if (re.test(t.s)) {
      const h = hit();
      while (t.take(re)); // "who scored the most runs" names the metric twice
      return h;
    }
  }
  return null;
}

// Words that carry no filter or metric of their own.
const FILLER = new Set([
  "a", "an", "the", "is", "are", "was", "were", "be", "been", "has", "have", "had", "do", "does", "did", "who", "whom",
  "which", "what", "how", "many", "much", "show", "me", "list", "give", "tell", "find", "get", "got", "please", "i",
  "want", "know", "see", "top", "best", "most", "highest", "lowest", "least", "fewest", "worst", "biggest", "leading",
  "greatest", "max", "maximum", "min", "record", "records", "stats", "statistics", "numbers", "data", "player",
  "players", "batter", "batters", "batsman", "batsmen", "bowler", "bowlers", "team", "teams", "side", "sides",
  "franchise", "franchises", "venue", "venues", "ground", "grounds", "stadium", "stadiums", "season", "seasons",
  "year", "years", "ipl", "cricket", "history", "ever", "time", "all", "of", "to", "from", "since", "in", "on", "at",
  "by", "for", "with", "and", "or", "vs", "v", "versus", "against", "his", "her", "their", "its", "they", "he", "she",
  "it", "that", "this", "these", "those", "there", "s", "scored", "score", "scoring", "hit", "hitting", "took",
  "take", "taken", "taking", "innings", "match", "matches", "game", "games", "per", "each", "every", "overall",
  "career", "total", "number", "made", "make", "bowled", "faced", "bowling", "batting", "any", "ipls", "edition",
  "compare", "comparison", "between", "than", "more", "better", "good", "great", "while", "when", "during", "an",
  "as", "so", "far", "till", "date", "now", "currently", "current", "recent", "ones", "one", "someone", "anyone",
  "successful", "consistent", "dangerous", "effective", "wise", "like", "about", "over", "overs", "balls", "ball",
  "hitters", "scorers", "getters", "takers", "batted", "fielding",
]);

/* ─── Main parser ────────────────────────────────────────────────────────── */

export function parseQuestion(question: string): ParseResult {
  const notes: string[] = [];
  const seasons = getSeasons();
  const latest = Number(seasons.at(-1));
  const first = Number(seasons[0]);
  const original = ` ${question.toLowerCase().replace(/[’‘`]/g, "'").replace(/[?!,;:()"“”]/g, " ").replace(/\s+/g, " ").trim()} `;
  const t = new Text(original);
  const f: StatFilters = {};
  let m: RegExpExecArray | null;

  /* Limit & qualification */
  let limit = 10;
  if ((m = t.take(new RegExp(`\\btop ${NUM}\\b`)))) limit = num(m[1]);
  else if ((m = t.take(new RegExp(`\\b${NUM} (?=(?:best|highest|most|leading|biggest|lowest|top)\\b)`)))) limit = num(m[1]);
  let minVolume: number | undefined;
  if ((m = t.take(/\b(?:min(?:imum)?|at ?least)(?: of)? (\d+)\+? ?(balls|deliveries|matches|games)\b/)) || (m = t.take(/\b(\d+)\+ (balls|deliveries|matches|games)\b/))) {
    minVolume = Number(m[1]);
  }

  /* Seasons */
  const yr = (s: string) => (s.length === 2 ? 2000 + Number(s) : Number(s));
  if ((m = t.take(/\b(?:between|from) (20\d\d) (?:and|to|-|–) (20\d\d)\b/)) || (m = t.take(/\b(20\d\d) ?(?:-|–|to) ?(20\d\d|\d\d)\b/))) {
    f.seasonFrom = yr(m[1]); f.seasonTo = yr(m[2]);
  } else if ((m = t.take(/\b(since|after|from) (20\d\d)\b/))) {
    f.seasonFrom = Number(m[2]) + (m[1] === "after" ? 1 : 0);
  } else if ((m = t.take(/\b(before|until|till|up ?to|through) (20\d\d)\b/))) {
    f.seasonTo = Number(m[2]) - (m[1] === "before" ? 1 : 0);
  } else if ((m = t.take(new RegExp(`\\b(?:last|past|previous|recent) ${NUM} (?:ipl )?(?:seasons|years|editions|ipls)\\b`)))) {
    f.seasonFrom = latest - num(m[1]) + 1; f.seasonTo = latest;
  } else if ((m = t.take(/\b(?:this|current|latest|last|most recent|recent) (?:ipl )?(?:season|year|ipl|edition)\b/))) {
    f.seasonFrom = latest; f.seasonTo = latest;
  } else if ((m = t.take(/\b(?:ipl ?)?(20\d\d)\b/))) {
    f.seasonFrom = Number(m[1]); f.seasonTo = Number(m[1]);
  }
  t.take(/\b(?:of )?all[ -]time\b|\bever\b|\bin (?:ipl )?history\b|\bin the ipl\b|\bin ipl\b|\bcareer\b|\boverall\b/);
  for (const y of [f.seasonFrom, f.seasonTo]) {
    if (y !== undefined && (y < first || y > latest)) notes.push(`The database covers IPL ${first}–${latest}; ${y} is outside that range.`);
  }

  /* Overs & phases */
  if ((m = t.take(/\b(?:last|final|20th) over\b/))) { f.overFrom = 20; f.overTo = 20; }
  else if ((m = t.take(/\bfirst over\b/))) { f.overFrom = 1; f.overTo = 1; }
  else if ((m = t.take(/\b(\d{1,2})(?:st|nd|rd|th) over\b/))) { f.overFrom = Number(m[1]); f.overTo = Number(m[1]); }
  else if ((m = t.take(/\bovers? (\d{1,2}) ?(?:-|–|to) ?(\d{1,2})\b/))) { f.overFrom = Number(m[1]); f.overTo = Number(m[2]); }
  else if ((m = t.take(new RegExp(`\\b(?:last|final) ${NUM} overs\\b`)))) { f.overFrom = 21 - num(m[1]); f.overTo = 20; }
  else if ((m = t.take(/\b(?:first|opening) (?:six|6) overs\b/))) { f.overFrom = 1; f.overTo = 6; }
  const phaseOf: Record<string, StatFilters["phase"]> = { "1-6": "powerplay", "7-15": "middle", "16-20": "death" };
  if (f.overFrom !== undefined && phaseOf[`${f.overFrom}-${f.overTo}`]) {
    f.phase = phaseOf[`${f.overFrom}-${f.overTo}`];
    delete f.overFrom; delete f.overTo;
  }
  // A "finisher" is judged on the death overs.
  const finisher = Boolean(t.take(/\bfinish(?:er|ers|ing)\b/));
  if (finisher && !f.phase && f.overFrom === undefined) f.phase = "death";
  if (!f.phase && f.overFrom === undefined) {
    if (t.take(/\bpower ?plays?\b|\bpp\b/)) f.phase = "powerplay";
    else if (t.take(/\bmiddle(?: overs| phase)?\b/)) f.phase = "middle";
    else if (t.take(/\b(?:at the )?death(?: overs| bowling| phase)?\b|\bslog overs\b/)) f.phase = "death";
  }

  /* Match context */
  const h2h = Boolean(t.take(/\bhead ?to ?head\b|\bh2h\b/));
  let inningsCtx: "chase" | "batFirst" | "defend" | "bowlFirst" | null = null;
  if (t.take(/\b(?:while |when )?(?:chasing|chases?|run ?chases?|batting second|second innings|2nd innings)\b/)) inningsCtx = "chase";
  else if (t.take(/\b(?:while |when )?(?:batting first|setting (?:a )?targets?|first innings|1st innings)\b/)) inningsCtx = "batFirst";
  else if (t.take(/\b(?:while |when )?(?:defending|bowling second)\b/)) inningsCtx = "defend";
  else if (t.take(/\b(?:while |when )?bowling first\b/)) inningsCtx = "bowlFirst";
  if (t.take(/\b(?:playoffs?|knock ?outs?|qualifiers?|eliminators?)\b/)) f.stage = "playoffs";
  else if (t.take(/\b(?:ipl )?finals?\b/)) f.stage = "final";
  else if (t.take(/\bleague (?:stage|games|matches|phase)\b/)) f.stage = "league";

  /* Bowling type & batting hand */
  let bowlingSubject = false;
  if (t.take(/\b(?:against|vs|versus|v|facing) (?:the )?(?:spin|spinners|spin bowl(?:ing|ers)|slow bowl(?:ing|ers))\b/)) f.bowlingType = "spin";
  else if (t.take(/\b(?:against|vs|versus|v|facing) (?:the )?(?:pace|pacers|fast bowl(?:ing|ers)|seam(?:ers)?|quicks|pace bowl(?:ing|ers))\b/)) f.bowlingType = "pace";
  else if (t.take(/\b(?:spinners?|spin bowlers?|spin)\b/)) { f.bowlingType = "spin"; bowlingSubject = true; }
  else if (t.take(/\b(?:pacers?|fast bowlers?|seamers?|quicks|pace bowlers?|quick bowlers?|pace)\b/)) { f.bowlingType = "pace"; bowlingSubject = true; }
  let handVs = false;
  if ((m = t.take(/\b(?:against|vs|versus|to) (left|right)[ -]?hand(?:ed|ers?)?(?: batters?| batsmen)?\b/))) { f.battingHand = m[1] === "left" ? "L" : "R"; handVs = true; }
  else if ((m = t.take(/\b(left|right)[ -]?hand(?:ed|ers?)?(?: batters?| batsmen)?\b|\b(lefties)\b/))) f.battingHand = m[1] === "right" ? "R" : "L";

  /* Teams (before nationality: "Mumbai Indians" ≠ "Indian players") */
  const franchises = new Map(getFranchiseRefs().map((fr) => [fr.name, fr]));
  const venueIds: number[] = [];
  const teamHits: { name: string; role: "team" | "opponent" | null; at: number }[] = [];
  const playerAliasMap = playerAliases().byAlias;
  for (const [alias, name] of TEAM_ALIASES) {
    const re = new RegExp(`(?:\\b(against|vs|versus|v|facing|at|in|for|of|by)\\s+)?\\b${escapeRe(alias)}\\b`, "g");
    const hits: RegExpExecArray[] = [];
    while ((m = re.exec(t.s))) {
      // Cricsheet initials collide with team codes: "RR Pant", "DD Gill"… are players.
      const next = /^\s+([a-z]+)/.exec(t.s.slice(m.index + m[0].length))?.[1];
      if (next && playerAliasMap.has(`${alias} ${next}`)) continue;
      hits.push(m);
    }
    // Replace right-to-left so earlier indices stay valid.
    for (const h of hits.reverse()) {
      const prep = h[1];
      const at = h.index;
      t.s = `${t.s.slice(0, h.index)} ${prep ? `${prep} ` : ""}| ${t.s.slice(h.index + h[0].length)}`;
      if ((prep === "at" || prep === "in") && CITY_ALIASES.has(alias)) {
        const city = venueAliases().find((v) => v.cityOnly && v.city === alias);
        if (city) { venueIds.push(...city.ids); continue; }
      }
      teamHits.push({ name, role: prep && /^(against|vs|versus|v|facing)$/.test(prep) ? "opponent" : prep ? "team" : null, at });
    }
  }
  teamHits.sort((a, b) => a.at - b.at);
  if (teamHits.length >= 2 && !teamHits.some((h) => h.role === "team")) {
    teamHits[0].role = "team";
    for (const h of teamHits.slice(1)) h.role = h.role ?? "opponent";
  }
  for (const h of teamHits) {
    const ids = franchises.get(h.name)?.teamIds ?? [];
    if ((h.role ?? "team") === "team") f.teamIds = [...(f.teamIds ?? []), ...ids];
    else f.opponentIds = [...(f.opponentIds ?? []), ...ids];
  }
  t.s = t.s.replace(/\b(?:against|vs|versus|v|facing|at|in|for|of|by)\s+\|/g, "|");

  /* Venues */
  for (const v of venueAliases()) {
    if (v.cityOnly && CITY_ALIASES.has(v.city ?? "") && !new RegExp(`\\b(?:at|in) ${escapeRe(v.city ?? "")}\\b`).test(t.s)) continue;
    if ((m = v.re.exec(t.s))) {
      venueIds.push(...v.ids);
      t.s = `${t.s.slice(0, m.index)} | ${t.s.slice(m.index + m[0].length)}`;
    }
  }
  if (venueIds.length) f.venueIds = [...new Set(venueIds)];

  /* Nationality */
  if (t.take(/\b(?:overseas|foreign)\b/)) f.nationality = "overseas";
  else if (t.take(/\bindians?\b/)) f.nationality = "indian";

  /* Grouping phrases */
  let groupBy: GroupBy | null = null;
  let sortByKey = false;
  if (t.take(/\b(?:by|per|each|every) (?:season|year)s?\b|\bseason ?(?:by ?season|wise)\b|\byear ?(?:by ?year|wise)\b/)) { groupBy = "season"; sortByKey = true; }
  else if (t.take(/\b(?:in )?(?:which|what) (?:season|year|edition)\b/)) groupBy = "season";
  else if (t.take(/\b(?:by|per|each) phase\b|\bphase ?wise\b|\b(?:which|what) phase\b/)) { groupBy = "phase"; sortByKey = !/\bwhich|what\b/.test(original); }
  else if (t.take(/\b(?:against|vs|versus) (?:each|every|all|other) (?:teams?|opponents?|sides?)\b|\bby opponents?\b|\bagainst (?:which|what) (?:team|side)\b/)) groupBy = "opponent";
  else if (t.take(/\b(?:which|what) (?:team|franchise|side)s?\b|\b(?:by|per|each|every) (?:team|franchise)\b|\bby an? (?:team|side)\b|\bteams\b|\bfranchises\b/)) groupBy = "team";
  else if (t.take(/\b(?:which|what) (?:venue|ground|stadium)s?\b|\b(?:by|per|each) (?:venue|ground|stadium)\b|\bvenues\b|\bgrounds\b|\bstadiums\b/)) groupBy = "venue";
  const askTotal = /\b(?:total|how many|number of)\b/.test(original) && !/\bwho|which\b/.test(original);

  /* Metric, then players from whatever is left */
  // Rejoin words split by removed filters so "highest powerplay totals" still reads "highest totals".
  t.s = t.s.replace(/(?:\s*\|\s*)+/g, " ");
  const metricHit = detectMetric(t);
  const players = findPlayers(t, notes);

  // Anything meaningful left over was not understood: say so instead of silently dropping it.
  const leftover = t.s.split(/\s+/).map((w) => w.replace(/'s$|'$/g, "")).filter((w) => w && w !== "|" && w.length > 1 && !FILLER.has(w) && !/^\d+$/.test(w));
  if (leftover.length) notes.push(`Not used in this answer: "${[...new Set(leftover)].join(" ")}".`);

  /* Perspective & metric */
  let perspective: Perspective;
  let metric: MetricId;
  let record = Boolean(metricHit?.record);
  const resultsWords = h2h || /\b(?:record|results?|win|wins|won|beat|beaten)\b/.test(original);
  const bowlerNoun = bowlingSubject || (f.battingHand !== undefined && handVs) || /\b(?:bowlers?|bowling|wicket ?takers?)\b/.test(original);
  const batterNoun = finisher || /\b(?:batters?|batsm[ae]n|batting|hitters?|run ?scorers?|run ?getters?)\b/.test(original);
  const wantsBest = /\b(?:best|worst|top|greatest)\b/.test(original);
  // A plain player name with no other condition reads as "show me their career".
  const bareName = players.length === 1 && Object.keys(f).length === 0;

  if (metricHit) {
    metric = metricHit.metric;
    perspective = metricHit.teamInnings ? "team_innings" : METRICS[metric].perspective;
  } else if (resultsWords && (f.teamIds?.length || f.opponentIds?.length || groupBy === "team")) {
    perspective = "results"; metric = /\b(?:best|worst)\b|%|percent/.test(original) ? "win_pct" : "wins";
  } else if (bowlerNoun && !players.length) {
    perspective = "bowling";
    // "best death bowlers" / "best venue for spinners" are about economy; "top bowlers" about wickets.
    metric = groupBy || (wantsBest && (f.phase || f.overFrom !== undefined)) ? "economy" : "wickets";
  } else if (players.length) {
    const p = careerSplit(players[0].id);
    perspective = p.bowlBalls > p.batBalls ? "bowling" : "batting";
    metric = perspective === "bowling" ? "wickets" : "runs";
    if (!groupBy && bareName) { groupBy = "season"; sortByKey = true; }
  } else if ((f.teamIds?.length || groupBy === "team") && !f.venueIds?.length && !batterNoun) {
    perspective = "results"; metric = /\b(?:best|worst)\b|%|percent/.test(original) ? "win_pct" : "wins";
    if (!groupBy && f.teamIds?.length && !f.opponentIds?.length && Object.keys(f).length === 1) { groupBy = "season"; sortByKey = true; }
  } else if (f.venueIds?.length || groupBy === "venue") {
    perspective = "batting";
    metric = groupBy === "venue" ? "avg_score" : "runs";
  } else if (batterNoun || f.bowlingType || f.battingHand || f.phase || f.teamIds?.length) {
    perspective = "batting";
    metric = wantsBest && (f.phase || f.overFrom !== undefined || f.bowlingType) ? "strike_rate" : "runs";
  } else {
    return { understood: false, query: null, notes };
  }

  // "spinners' strike rate", "runs conceded by pacers": a batting word about bowlers means the bowling version.
  if (bowlingSubject && perspective === "batting") {
    const map: Partial<Record<MetricId, MetricId>> = {
      strike_rate: "bowling_strike_rate", average: "bowling_average", runs: "runs_conceded",
      sixes: "sixes_conceded", dot_pct_faced: "dot_pct",
    };
    if (map[metric]) { metric = map[metric]!; perspective = "bowling"; }
  }

  /* Players: subject, matchup or comparison */
  if (players.length) {
    if (perspective === "results" || perspective === "team_innings") {
      perspective = careerSplit(players[0].id).bowlBalls > careerSplit(players[0].id).batBalls ? "bowling" : "batting";
      metric = perspective === "bowling" ? "wickets" : "runs";
    }
    const vsWord = /\b(?:vs|v|versus|against|facing)\b/.test(original);
    if (players.length >= 2 && vsWord) {
      const [a, b] = players.map((p) => ({ ...p, ...careerSplit(p.id) }));
      const aBat = a.batBalls >= a.bowlBalls;
      const bBat = b.batBalls >= b.bowlBalls;
      if (aBat !== bBat) {
        const batter = aBat ? a : b;
        const bowler = aBat ? b : a;
        f.playerIds = [batter.id]; f.vsPlayerIds = [bowler.id];
        perspective = "batting";
        if (METRICS[metric].perspective !== "batting") metric = "runs";
      } else {
        f.playerIds = players.map((p) => p.id);
      }
    } else {
      f.playerIds = players.map((p) => p.id);
    }
    if (!groupBy) groupBy = "player";
  }

  /* Innings context depends on which side the subject is on */
  if (inningsCtx) {
    const table: Record<Perspective, Record<string, 1 | 2>> = {
      batting: { chase: 2, batFirst: 1, defend: 1, bowlFirst: 2 },
      team_innings: { chase: 2, batFirst: 1, defend: 1, bowlFirst: 2 },
      results: { chase: 2, batFirst: 1, defend: 1, bowlFirst: 2 },
      bowling: { chase: 1, batFirst: 2, defend: 2, bowlFirst: 1 },
    };
    f.innings = table[perspective][inningsCtx];
  }

  /* Grouping defaults */
  if (record || perspective === "team_innings") groupBy = "innings";
  if (!groupBy && !players.length) {
    // Singular nouns: "highest scoring venue", "most successful team", "best season for sixes".
    if (/\b(?:venue|ground|stadium)\b/.test(original)) groupBy = "venue";
    else if (/\b(?:team|franchise|side)\b/.test(original) && perspective !== "results") groupBy = "team";
    else if (/\b(?:season|year|edition)\b/.test(original)) groupBy = "season";
  }
  if (!groupBy) {
    if (perspective === "results") groupBy = f.venueIds?.length && !f.teamIds?.length ? "venue" : "team";
    else if (askTotal) groupBy = "season";
    else groupBy = "player";
  }
  if (perspective === "results" && !["team", "opponent", "season", "venue"].includes(groupBy)) groupBy = "team";
  if (groupBy === "innings" && perspective === "results") { groupBy = "team"; record = false; }

  /* Order */
  const better = METRICS[metric].better;
  let order: "asc" | "desc";
  if (/\b(?:economical|tightest|cheapest)\b/.test(original)) order = "asc";
  else if (/\bexpensive\b/.test(original)) order = "desc";
  else if (/\bworst\b/.test(original)) order = better === "high" ? "asc" : "desc";
  else if (/\b(?:best|top|leading|greatest|record)\b/.test(original)) order = better === "high" ? "desc" : "asc";
  else if (/\b(?:most|highest|biggest|max(?:imum)?|fastest)\b/.test(original)) order = "desc";
  else if (/\b(?:least|fewest|lowest|smallest|slowest)\b/.test(original)) order = "asc";
  else order = better === "high" ? "desc" : "asc";

  if (metric === "strike_rate" && record) notes.push("Fastest fifties/hundreds need ball-by-ball milestones; showing the highest strike-rate innings of 30+ runs instead.");
  if (f.battingHand) notes.push("Batting hand is only known for players listed in the bio/style sources; others are left out of hand filters.");

  const query: StatQuery = {
    perspective,
    metric,
    groupBy,
    order,
    sortBy: sortByKey && groupBy !== "player" ? "key" : "metric",
    limit,
    minVolume,
    filters: f,
  };
  return { understood: true, query, notes };
}

function careerSplit(id: number): { batBalls: number; bowlBalls: number } {
  const ls = getSeasonLines().get(id) ?? [];
  return {
    batBalls: ls.reduce((s, l) => s + l.batBalls, 0),
    bowlBalls: ls.reduce((s, l) => s + l.bowlBalls, 0),
  };
}
