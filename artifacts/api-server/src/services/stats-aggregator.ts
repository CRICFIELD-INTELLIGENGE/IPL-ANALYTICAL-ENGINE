import fs from "fs";
import { getBallInfo, overOffsets, deliveryLabel, hasBallCommentary, ballCommentaryVocab, ballCommentaryMatchCount, type BallInfo } from "./ball-commentary.js";
import path from "path";
import { buildBioLookup, lookupBioKey, type BioLookup } from "./player-bio-lookup.js";
import { getPlayerMeta } from "./decision/player-profiles.js";
import { queryAll } from "./decision/db.js";
import {
  db,
  hasDb,
  playersTable,
  teamsTable,
  venuesTable,
  seasonsTable,
  matchesTable,
  inningsTable,
  deliveriesTable,
  dismissalsTable,
  partnershipsTable,
  playerCareerStatsTable,
  batterBowlerMatchupStatsTable,
} from "@workspace/db";
import { sql, eq, and, type SQL } from "drizzle-orm";

// ─────────────────────────────────────────────────────────────────────────────
//  MEMORY CACHE — parse each match JSON only once per server process
// ─────────────────────────────────────────────────────────────────────────────

const matchCache = new Map<string, any>();
let matchesList: any[] = [];
let playerBios: Record<string, any> = {};
let playersRegistry: any[] = [];
let playerLatestTeams: Record<string, string> = {};
let currentSquads: any[] = [];
let _projectRoot: string | null = null;
let _initialized = false;

function getProjectRoot(): string {
  if (_projectRoot) return _projectRoot;
  let dir = (typeof (import.meta as any).dirname === "string" ? (import.meta as any).dirname : null) || process.cwd();
  let cur = dir;
  while (cur && cur !== path.dirname(cur)) {
    if (fs.existsSync(path.join(cur, "package.json")) &&
        (fs.existsSync(path.join(cur, "artifacts", "ipl-analytics")) || fs.existsSync(path.join(cur, "lib", "cricket-data", "raw")))) {
      _projectRoot = cur;
      return cur;
    }
    cur = path.dirname(cur);
  }
  _projectRoot = dir;
  return dir;
}

function ensureInit() {
  if (_initialized) return;
  _initialized = true;
  const root = getProjectRoot();

  const matchesPath  = path.resolve(root, "artifacts", "ipl-analytics", "public", "data", "matches.json");
  const bioPath      = path.resolve(root, "artifacts", "ipl-analytics", "public", "data", "player-bio.json");
  const playersPath  = path.resolve(root, "artifacts", "api-server", "data", "players.json");
  const currentSquadsPath = path.resolve(root, "artifacts", "ipl-analytics", "public", "data", "current-squads.json");
  const latestTeamsPath   = path.resolve(root, "artifacts", "ipl-analytics", "public", "data", "player-latest-teams.json");

  if (fs.existsSync(matchesPath))  matchesList      = JSON.parse(fs.readFileSync(matchesPath,  "utf8"));
  if (fs.existsSync(bioPath))      playerBios        = JSON.parse(fs.readFileSync(bioPath,      "utf8"));
  if (fs.existsSync(playersPath))  playersRegistry   = JSON.parse(fs.readFileSync(playersPath,    "utf8"));
  if (fs.existsSync(currentSquadsPath)) currentSquads = JSON.parse(fs.readFileSync(currentSquadsPath, "utf8"));
  if (fs.existsSync(latestTeamsPath))   playerLatestTeams = JSON.parse(fs.readFileSync(latestTeamsPath, "utf8"));
}

export function getPlayerLatestTeam(playerName: string): string {
  ensureInit();
  if (!playerName) return "All";
  if (playerLatestTeams[playerName]) return playerLatestTeams[playerName];
  const norm = playerName.toLowerCase().replace(/[^a-z0-9]/g, "");
  const bio = Object.values(playerBios).find((b: any) =>
    (b.playerName || b.fullName || "").toLowerCase().replace(/[^a-z0-9]/g, "") === norm
  );
  if (bio && (bio.team || bio.currentTeam)) return bio.team || bio.currentTeam;
  return "All";
}

function getMatchData(matchId: string): any | null {
  if (matchCache.has(matchId)) return matchCache.get(matchId);
  const root = getProjectRoot();
  const fp = path.resolve(root, "lib", "cricket-data", "raw", `${matchId}.json`);
  if (!fs.existsSync(fp)) return null;
  const data = JSON.parse(fs.readFileSync(fp, "utf8"));
  matchCache.set(matchId, data);
  return data;
}

/**
 * The knockout stage of a match ("Qualifier 1", "Eliminator", "Qualifier 2",
 * "Final", "Semi Final", ...), or undefined for a regular league match.
 *
 * NOTE: `matches.match_type` in the DB is NOT this — it was ingested from
 * Cricsheet's `info.match_type`, which is the game format ("T20") and is
 * identical for every row. The real per-match stage only exists in the raw
 * Cricsheet JSON at `info.event.stage`, so it has to be read match-by-match
 * from `lib/cricket-data/raw/<matchId>.json` rather than filtered in SQL.
 */
function getMatchStage(matchId: string): string | undefined {
  return getMatchData(matchId)?.info?.event?.stage || undefined;
}

/** Whether a match (identified by its stage) satisfies a "Match Type" filter value. */
function matchPassesContext(stage: string | undefined, matchContext?: string): boolean {
  if (!matchContext) return true;
  const wanted = matchContext.trim().toLowerCase();
  if (!wanted || wanted === "all matches" || wanted === "all") return true;
  const isPlayoff = !!stage;
  const isFinal = stage === "Final";
  if (wanted === "final") return isFinal;
  if (wanted === "playoffs" || wanted === "playoff") return isPlayoff;
  if (wanted === "league stage" || wanted === "league") return !isPlayoff;
  return true; // unrecognized value — don't filter rather than silently drop everything
}

/** Pre-warm: call on server start to eliminate first-request latency */
export function preLoadAllMatches() {
  ensureInit();
  const root = getProjectRoot();
  const rawDir = path.resolve(root, "lib", "cricket-data", "raw");
  if (!fs.existsSync(rawDir)) return;
  const files = fs.readdirSync(rawDir).filter(f => f.endsWith(".json"));
  for (const f of files) {
    const id = f.replace(".json", "");
    if (!matchCache.has(id)) {
      try {
        const data = JSON.parse(fs.readFileSync(path.join(rawDir, f), "utf8"));
        matchCache.set(id, data);
      } catch { /* skip corrupt files */ }
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
//  HELPERS
// ─────────────────────────────────────────────────────────────────────────────

// Deccan Chargers was wound up after 2012 and the Hyderabad slot was
// re-tendered to a new owner as Sunrisers in 2013 — a different franchise, not
// a rename, so the two are NOT aliases. Treating them as one credited Sunrisers
// with Deccan's matches (286 played instead of its own 211).
export const TEAM_ALIAS_MAP: Record<string, string[]> = {
  "Sunrisers Hyderabad": ["Sunrisers Hyderabad", "SRH"],
  "SRH": ["Sunrisers Hyderabad", "SRH"],
  "Deccan Chargers": ["Deccan Chargers", "DCh", "DEC"],
  "DCh": ["Deccan Chargers", "DCh", "DEC"],
  "DEC": ["Deccan Chargers", "DCh", "DEC"],

  "Delhi Capitals": ["Delhi Capitals", "Delhi Daredevils", "DC", "DD"],
  "Delhi Daredevils": ["Delhi Daredevils", "Delhi Capitals", "DD", "DC"],
  "DC": ["Delhi Capitals", "Delhi Daredevils", "DC", "DD"],
  "DD": ["Delhi Daredevils", "Delhi Capitals", "DD", "DC"],

  "Punjab Kings": ["Punjab Kings", "Kings XI Punjab", "PBKS", "KXIP"],
  "Kings XI Punjab": ["Kings XI Punjab", "Punjab Kings", "KXIP", "PBKS"],
  "PBKS": ["Punjab Kings", "Kings XI Punjab", "PBKS", "KXIP"],
  "KXIP": ["Kings XI Punjab", "Punjab Kings", "KXIP", "PBKS"],

  "Royal Challengers Bengaluru": ["Royal Challengers Bengaluru", "Royal Challengers Bangalore", "RCB"],
  "Royal Challengers Bangalore": ["Royal Challengers Bangalore", "Royal Challengers Bengaluru", "RCB"],
  "RCB": ["Royal Challengers Bengaluru", "Royal Challengers Bangalore", "RCB"],

  // Rising Pune Supergiant(s) 2016–17 and Pune Warriors India 2011–13 were
  // separate franchises — only the singular/plural spelling is an alias.
  "Rising Pune Supergiant": ["Rising Pune Supergiant", "Rising Pune Supergiants", "RPS"],
  "Rising Pune Supergiants": ["Rising Pune Supergiants", "Rising Pune Supergiant", "RPS"],
  "RPS": ["Rising Pune Supergiant", "Rising Pune Supergiants", "RPS"],
  "Pune Warriors": ["Pune Warriors", "PW"],
  "PW": ["Pune Warriors", "PW"],

  "Mumbai Indians": ["Mumbai Indians", "MI"],
  "MI": ["Mumbai Indians", "MI"],
  "Chennai Super Kings": ["Chennai Super Kings", "CSK"],
  "CSK": ["Chennai Super Kings", "CSK"],
  "Kolkata Knight Riders": ["Kolkata Knight Riders", "KKR"],
  "KKR": ["Kolkata Knight Riders", "KKR"],
  "Rajasthan Royals": ["Rajasthan Royals", "RR"],
  "RR": ["Rajasthan Royals", "RR"],
  // Gujarat Lions (2016-17) and Gujarat Titans (2022-) are unrelated
  // franchises. Lions had no entry at all, so it fell through to the "GT" short
  // code and returned the Titans' record (107 matches instead of its own 30).
  "Gujarat Titans": ["Gujarat Titans", "GT"],
  "GT": ["Gujarat Titans", "GT"],
  "Gujarat Lions": ["Gujarat Lions", "GL"],
  "GL": ["Gujarat Lions", "GL"],
  "Kochi Tuskers Kerala": ["Kochi Tuskers Kerala", "KTK"],
  "KTK": ["Kochi Tuskers Kerala", "KTK"],
  "Lucknow Super Giants": ["Lucknow Super Giants", "LSG"],
  "LSG": ["Lucknow Super Giants", "LSG"]
};

export const teamShort = (team: string): string => {
  const t = (team || "").toLowerCase().trim();
  if (t.includes("chennai")  || t === "csk")  return "CSK";
  if (t.includes("mumbai")   || t === "mi")   return "MI";
  if (t.includes("bangalore") || t.includes("bengaluru") || t === "rcb") return "RCB";
  if (t.includes("kolkata")  || t === "kkr")  return "KKR";
  // Deccan is checked before Hyderabad, and Lions before the generic Gujarat
  // test: these are distinct franchises from Sunrisers and Titans respectively,
  // and collapsing them merged two clubs' records into one.
  if (t.includes("deccan")   || t.includes("chargers") || t === "dch" || t === "dec") return "DEC";
  if (t.includes("sunrisers")|| t.includes("hyderabad")|| t === "srh")  return "SRH";
  if (t.includes("delhi")    || t.includes("daredevils") || t === "dc" || t === "dd")   return "DC";
  if (t.includes("rajasthan")|| t === "rr")   return "RR";
  if (t.includes("punjab")   || t === "pbks" || t.includes("kings xi") || t === "kxip") return "PBKS";
  if (t.includes("lions")    || t === "gl")   return "GL";
  if (t.includes("titans")   || t.includes("gujarat") || t === "gt")   return "GT";
  if (t.includes("kochi")    || t.includes("tuskers") || t === "ktk") return "KTK";
  if (t.includes("lucknow")  || t === "lsg")  return "LSG";
  return team;
};

export function getTeamAliases(teamName?: string): string[] {
  if (!teamName || teamName === "All" || teamName.startsWith("All")) return ["All"];
  const direct = TEAM_ALIAS_MAP[teamName];
  if (direct) return direct;
  const short = teamShort(teamName);
  return TEAM_ALIAS_MAP[short] || [teamName, short];
}

export function isMatchingTeam(teamA?: string, teamB?: string): boolean {
  if (!teamA || !teamB) return false;
  if (teamA === "All" || teamB === "All" || teamA.startsWith("All") || teamB.startsWith("All")) return true;
  if (teamA.toLowerCase().trim() === teamB.toLowerCase().trim()) return true;
  const tA = teamShort(teamA);
  const tB = teamShort(teamB);
  if (tA === tB && tA !== teamA) return true;
  const aliasesA = getTeamAliases(teamA);
  const aliasesB = getTeamAliases(teamB);
  return aliasesA.some(a => aliasesB.some(b => a.toLowerCase() === b.toLowerCase()));
}

/**
 * Canonical venue name — collapses the many spellings the same ground appears
 * under (city suffixes, renames, punctuation variants) onto one label.
 *
 * IMPORTANT: keep in sync with the client copy in
 * `artifacts/ipl-analytics/src/lib/dimensions.ts`. The stats filter sends the
 * client-side canonical name back to the API, so both sides must agree on it.
 * Every rule must be idempotent — canonical(canonical(x)) === canonical(x).
 */
const VENUE_RULES: Array<[RegExp, string]> = [
  [/wankhede/,                                   "Wankhede Stadium"],
  [/eden garden/,                                "Eden Gardens"],
  [/chidambaram|chepauk/,                        "MA Chidambaram Stadium"],
  [/chinnaswamy/,                                "M Chinnaswamy Stadium"],
  [/jaitley|feroz shah kotla/,                   "Arun Jaitley Stadium"],
  [/rajiv gandhi/,                               "Rajiv Gandhi International Stadium"],
  [/bindra|punjab cricket association|mohali/,   "IS Bindra Stadium"],
  [/maharashtra cricket association|subrata roy|\bmca\b/, "MCA Stadium"],
  [/dy patil/,                                   "DY Patil Stadium"],
  [/narendra modi|motera|sardar patel/,          "Narendra Modi Stadium"],
  [/sawai/,                                      "Sawai Mansingh Stadium"],
  [/ekana/,                                      "Ekana Cricket Stadium"],
  [/brabourne/,                                  "Brabourne Stadium"],
  [/rajasekhara reddy|aca-vdca/,                 "ACA-VDCA Cricket Stadium"],
  [/maharaja yadavindra/,                        "Maharaja Yadavindra Singh International Cricket Stadium"],
  [/zayed/,                                      "Sheikh Zayed Stadium"],
];

export const normalizeVenueName = (v: string): string => {
  const raw = String(v || "").trim();
  if (!raw) return "";
  const n = raw.toLowerCase();
  for (const [pattern, canonical] of VENUE_RULES) {
    if (pattern.test(n)) return canonical;
  }
  // Fall back to the stadium name without its trailing city qualifier.
  return raw.split(",")[0].trim();
};

/**
 * The IPL season a match belongs to, as a calendar year.
 * Cricsheet labels three seasons with a split year ("2007/08" → 2008,
 * "2009/10" → 2010, "2020/21" → the tournament played in 2020), so the match
 * date — not the label — is the reliable source. Filters arrive from the UI as
 * plain years ("2008"), which is what `seasons.json` publishes.
 */
const seasonYearOfDate = (date?: string | null): string =>
  String(date || "").slice(0, 4);

const isPlainSeasonYear = (season: string): boolean => /^\d{4}$/.test(season.trim());

/**
 * Whether a specific nationality slice was requested.
 *
 * The `/stats/*` routes run every incoming filter through a shared
 * `normalize()` helper that collapses empty/"all"-prefixed values to the
 * literal string "All" (capitalized) as a wildcard sentinel — but this check
 * used to compare only against lowercase "all", so the wildcard case fell
 * through and got treated as an unmatched nationality, silently filtering
 * every default (no-filter) request down to overseas-only players. Compare
 * case-insensitively so both the raw store value ("all") and the
 * route-normalized sentinel ("All") mean "no filter".
 */
const wantsNationalityFilter = (nationality?: string): boolean =>
  !!nationality && nationality.toLowerCase() !== "all";

const nationalityWantsIndian = (nationality: string): boolean =>
  nationality.toLowerCase() === "indian";

type BowlerType = "Pacer" | "Spinner" | "Unknown";
type BattingHand = "LHB" | "RHB" | "Unknown";
type HandSplit = { runs: number; balls: number; wickets: number };

const newHandSplit = (): HandSplit => ({ runs: 0, balls: 0, wickets: 0 });
const playerBioLookupCache = new Map<string, any | null>();
const battingHandCache = new Map<string, BattingHand>();
const bowlerTypeCache = new Map<string, BowlerType>();

const normalizePlayerName = (name: string): string =>
  (name || "").toLowerCase().replace(/[^a-z0-9 ]/g, "").replace(/\s+/g, " ").trim();

function playerNamesMatch(leftName: string, rightName: string): boolean {
  const left = normalizePlayerName(leftName);
  const right = normalizePlayerName(rightName);
  if (!left || !right) return false;
  if (left === right || left.includes(right) || right.includes(left)) return true;

  const leftParts = left.split(" ").filter(Boolean);
  const rightParts = right.split(" ").filter(Boolean);
  if (leftParts.length === 0 || rightParts.length === 0) return false;

  if (leftParts.length === 1 && rightParts.some(p => p === leftParts[0])) return true;
  if (rightParts.length === 1 && leftParts.some(p => p === rightParts[0])) return true;

  const leftInit = leftParts[0][0];
  const rightInit = rightParts[0][0];
  const leftLast = leftParts[leftParts.length - 1];
  const rightLast = rightParts[rightParts.length - 1];
  return leftInit === rightInit && leftLast === rightLast;
}

async function resolvePlayerDbName(name: string): Promise<string> {
  if (!name) return name;
  try {
    const rows = await db.select({ name: playersTable.name }).from(playersTable);
    const matched = rows.find((r: any) => playerNamesMatch(r.name, name));
    if (matched) {
      return matched.name;
    }
  } catch (e) {
    // ignore
  }
  return name;
}

let bioLookup: BioLookup | null = null;
function getBioLookup(): BioLookup {
  if (bioLookup) return bioLookup;
  ensureInit();
  const root = getProjectRoot();
  const dataDir = path.resolve(root, "artifacts", "ipl-analytics", "public", "data");
  const readJson = (fp: string) => (fs.existsSync(fp) ? JSON.parse(fs.readFileSync(fp, "utf8")) : undefined);
  const identityKeys = readJson(path.join(dataDir, "player-recent-matches", "index.json"))?.keys ?? {};
  const squads = readJson(path.join(dataDir, "squads-by-season.json")) ?? {};
  const rawDir = path.resolve(root, "lib", "cricket-data", "raw");
  const registries: Record<string, string>[] = [];
  if (fs.existsSync(rawDir)) {
    for (const f of fs.readdirSync(rawDir)) {
      if (!f.endsWith(".json")) continue;
      const people = getMatchData(f.slice(0, -5))?.info?.registry?.people;
      if (people) registries.push(people);
    }
  }
  bioLookup = buildBioLookup(playerBios, identityKeys, registries, squads);
  return bioLookup;
}

/**
 * The bio of the player a scorecard's written name denotes, resolved through the Cricsheet registry and the
 * identity index (services/player-bio-lookup.ts). Unknown — a written name shared by several players, or a player
 * with no bio — returns undefined, and callers fall back as before. It no longer matches on initial + surname,
 * which returned another player's bio for 57 IPL written names (e.g. "Kuldeep Yadav" → K Yadav, "RK Singh" →
 * RP Singh, "Navdeep Saini" → Nitin Saini); see DAY-04.6-REPORT.md.
 */
function getPlayerBio(playerName: string): any | undefined {
  if (playerBioLookupCache.has(playerName)) {
    return playerBioLookupCache.get(playerName) ?? undefined;
  }
  const { key } = lookupBioKey(playerName, getBioLookup());
  const bio = key ? playerBios[key] : undefined;
  playerBioLookupCache.set(playerName, bio ?? null);
  return bio;
}

function getBattingHand(batterName: string): BattingHand {
  const cacheKey = normalizePlayerName(batterName);
  const cached = battingHandCache.get(cacheKey);
  if (cached) return cached;
  const style = (getPlayerBio(batterName)?.batStyle || "").toLowerCase();
  const hand = style.includes("left") ? "LHB" : style.includes("right") ? "RHB" : "Unknown";
  battingHandCache.set(cacheKey, hand);
  return hand;
}

const overseasNames = [
  "warner","buttler","de kock","salt","head","marsh","stoinis","maxwell","russell","narine",
  "rashid","rabada","boult","archer","malinga","bravo","pollard","miller","pooran","klaasen",
  "markram","williamson","finch","gayle","jordan","woakes","cummins","starc","conway","green",
  "rachin","pathirana","santner","maphaka","livingstone","curran","naveen","hetmyer","behrendorff",
  "hazlewood","chameera","coetzee","du plessis","faf","philip","rutherford","hussey","watson","kallis",
  "mccullum","gilchrist","williams","joseph","topley","ferguson","southee","stokes","wood","nortje",
  "ali","moeen","theekshana","mitchell","gleeson","gurbaz","roy","shakib","farooqi","jansen",
  "hasaranga","tahir","villiers","de villiers","abd","trent","philander","ngidi","steyn","morkel",
  "plunkett","salt","hales","lam","patel","ingram","malan","van der dussen","elgar","bavuma","hendricks",
  "pretorius","quint","stubbs","tristan","tim david","david","couch","stoinis","behrendorff","richardson"
];

const nationalityCache = new Map<string, boolean>();

function registryCountry(playerName: string): string | null {
  if (playersRegistry.length === 0) return null;
  const nameLower = playerName.toLowerCase().trim();
  const match = playersRegistry.find(p => {
    const pName = p.name.trim().toLowerCase();
    if (pName === nameLower) return true;
    const parts = p.name.trim().split(/\s+/);
    if (parts.length >= 2) {
      const firstInitial = parts[0].charAt(0).toLowerCase();
      const lastName = parts[parts.length - 1].toLowerCase();
      const scoreParts = nameLower.split(/\s+/);
      const scoreLastName = scoreParts[scoreParts.length - 1];
      if (lastName === scoreLastName && scoreParts[0].startsWith(firstInitial)) return true;
    }
    return false;
  });
  return match?.country?.trim() || null;
}

const isKnownCountry = (c?: string | null): boolean =>
  !!c && c.trim() !== "" && c.trim().toLowerCase() !== "unknown";

/**
 * Indian vs overseas for the nationality slice.
 *
 * `players.country` is only populated for a minority of the registry, so this
 * walks every source we have — the DB column, the scraped bios, the auction
 * registry — before falling back to the overseas-surname heuristic. Sources are
 * ordered most to least reliable: the heuristic alone misfires on shared
 * surnames (Patel, Roy, Ali), so it must never override a recorded country.
 */
function isIndianPlayer(playerName: string, dbCountry?: string | null): boolean {
  ensureInit();
  if (isKnownCountry(dbCountry)) return dbCountry!.trim().toLowerCase() === "india";

  const cacheKey = normalizePlayerName(playerName);
  const cached = nationalityCache.get(cacheKey);
  if (cached !== undefined) return cached;

  const bioCountry = getPlayerBio(playerName)?.country;
  const known = isKnownCountry(bioCountry) ? bioCountry : registryCountry(playerName);

  const nameLower = playerName.toLowerCase().trim();
  const result = isKnownCountry(known)
    ? known!.trim().toLowerCase() === "india"
    : !overseasNames.some(o => nameLower.includes(o));

  nationalityCache.set(cacheKey, result);
  return result;
}

function normalizeRepresentation(rep?: string): "overall" | "current-squad-career" | "franchise-legacy" | "current-squad-for-franchise" | null {
  switch (rep) {
    case "current-squad-career":
    case "current_squad_career":
    case "squad-career":
      return "current-squad-career";
    case "franchise-legacy":
    case "franchise_legacy":
    case "legacy":
    case "franchise":
      return "franchise-legacy";
    case "current-squad-for-franchise":
    case "current_squad_for_franchise":
    case "squad-team":
    case "squad_team":
      return "current-squad-for-franchise";
    default:
      return null;
  }
}

function getCurrentSquadTeam(playerName: string): string | null {
  const normalized = normalizePlayerName(playerName);
  const scoreParts = normalized.split(" ").filter(Boolean);
  const scoreFirstInitial = scoreParts[0]?.charAt(0);
  const scoreLastName = scoreParts[scoreParts.length - 1];
  
  const match = currentSquads.find((p: any) => {
    const squadNormalized = normalizePlayerName(p.playerName);
    if (squadNormalized === normalized) return true;
    
    const squadParts = squadNormalized.split(" ").filter(Boolean);
    if (squadParts.length > 0 && scoreParts.length > 0) {
      return squadParts[0].charAt(0) === scoreFirstInitial &&
             squadParts[squadParts.length - 1] === scoreLastName;
    }
    return false;
  });
  return match ? teamShort(match.currentTeam) : null;
}

function passesRepresentationFilter(playerName: string, filters: QueryFilters, roleTeam?: string): boolean {
  if (filters.season && filters.season !== "All Seasons" && filters.season !== "All" && filters.season !== "all" && filters.season !== "") {
    return true;
  }
  const representation = normalizeRepresentation(filters.representation);
  if (!representation || representation === "overall") return true;

  const currentTeam = getCurrentSquadTeam(playerName);
  if (!currentTeam) return true;

  if (representation === "current-squad-career") return true;
  if (representation === "franchise-legacy") return true;
  if (representation === "current-squad-for-franchise") {
    const selectedTeam = filters.team && filters.team !== "All Teams" ? filters.team : roleTeam;
    return !selectedTeam || selectedTeam === currentTeam;
  }

  return true;
}

/**
 * Pacer / Spinner / Unknown from a bowling-style string. Day 6: a missing or unrecognised style is Unknown; it used
 * to be Pacer, which put every unclassified bowler into the pace totals and the "Pacer" filter.
 */
export function classifyBowlStyle(style: unknown): BowlerType {
  const s = typeof style === "string" ? style.trim().toLowerCase() : "";
  if (!s || s === "null") return "Unknown";
  if (/(spin|break|orthodox|googly|chinaman|slow left|left[- ]arm slow|unorthodox)/.test(s)) return "Spinner";
  if (/(fast|medium|seam|pace)/.test(s)) return "Pacer";
  return "Unknown";
}

const bowlerTypeByIdCache = new Map<string, BowlerType>();
let decisionTypeByCid: Map<string, BowlerType> | null = null;

/** Registry id → bowling type from the decision layer (identity-resolved styles, then recorded ball speeds). */
function decisionTypeFor(cid: string): BowlerType {
  if (!decisionTypeByCid) {
    decisionTypeByCid = new Map();
    const meta = getPlayerMeta();
    for (const r of queryAll<{ player_id: number; cricsheet_id: string | null }>("SELECT player_id, cricsheet_id FROM players")) {
      const t = r.cricsheet_id ? meta.get(r.player_id)?.bowlingType : undefined;
      if (t === "pace" || t === "spin") decisionTypeByCid.set(r.cricsheet_id!, t === "spin" ? "Spinner" : "Pacer");
    }
  }
  return decisionTypeByCid.get(cid) ?? "Unknown";
}

/** Bowling type of one registered person: their verified bio's style, else the decision layer's evidence, else Unknown. */
function bowlerTypeById(cid: string, writtenName: string): BowlerType {
  const cached = bowlerTypeByIdCache.get(cid);
  if (cached) return cached;
  const idx = getBioLookup();
  let key = idx.idToKey.get(cid);
  if (!key && idx.nameToIds.get(writtenName)?.size === 1) {
    const viaSquad = [...(idx.squadKeys.get(writtenName) ?? [])];
    if (viaSquad.length === 1) key = viaSquad[0];
  }
  let t = classifyBowlStyle(key ? playerBios[key]?.bowlStyle : undefined);
  if (t === "Unknown") t = decisionTypeFor(cid);
  bowlerTypeByIdCache.set(cid, t);
  return t;
}

let cidByPlayerId: Map<number, string> | null = null;

/**
 * Bowling type of a warehouse player row. Registered players resolve by registry id, so the label and the Bowler
 * Type filter (getBowlerTypeIdSets) always agree; squad stubs ("json:N") fall back to their name.
 */
function bowlerTypeForPlayer(playerId: number, name: string): BowlerType {
  if (!cidByPlayerId) {
    cidByPlayerId = new Map(
      queryAll<{ player_id: number; cricsheet_id: string | null }>("SELECT player_id, cricsheet_id FROM players")
        .filter((r) => r.cricsheet_id && !r.cricsheet_id.startsWith("json:"))
        .map((r) => [r.player_id, r.cricsheet_id!]),
    );
  }
  const cid = cidByPlayerId.get(playerId);
  return cid ? bowlerTypeById(cid, name) : getBowlerType(name);
}

/**
 * Bowling type for a scorecard's written name. With the match's registry block (`info.registry.people`) the name is
 * resolved to the person who bowled in that match, so the two players written "Harmeet Singh" are told apart.
 * Without it, a written name shared by several people is Unknown, and a name that is not an IPL written name falls
 * back to its bio by exact name. Nothing is inferred from the name itself (Day 6 removed a substring list that made
 * any name containing "ahmed" or "ali" a spinner).
 */
/**
 * Share of a batter's runs scored in fours and sixes, in % (0–100, rounded). This is the meaning of a BATTER's (and a
 * matchup's) `boundaryPct` in the legacy stats endpoints, also exposed as `boundaryRunPct`. A BOWLER's
 * `boundaryPct`, a scoring zone's, and the decision / team endpoints' are boundaries per 100 legal balls instead
 * (Day 6 documented both and kept the values; DAY-06-REPORT.md §C).
 */
function boundaryRunPct(fours: number, sixes: number, runs: number): number {
  return runs > 0 ? Math.round(((fours * 4 + sixes * 6) / runs) * 100) : 0;
}

function getBowlerType(bowlerName: string, people?: Record<string, string>): BowlerType {
  const cid = people?.[bowlerName];
  if (cid) return bowlerTypeById(cid, bowlerName);
  const nameLower = bowlerName.toLowerCase().trim();
  const cached = bowlerTypeCache.get(nameLower);
  if (cached) return cached;
  const ids = getBioLookup().nameToIds.get(bowlerName);
  let t: BowlerType;
  if (ids && ids.size === 1) t = bowlerTypeById([...ids][0], bowlerName);
  else if (ids && ids.size > 1) t = "Unknown";
  else t = classifyBowlStyle(getPlayerBio(bowlerName)?.bowlStyle);
  bowlerTypeCache.set(nameLower, t);
  return t;
}

/**
 * Real per-ball detail for the ball at `ballIndex` of `overNum`.
 *
 * This replaces classifyDeliveryType() and getScoringZone(), which returned
 * types[(over*6 + ball) % 12] and zones[(over*6 + ball + runs) % 8] — periodic
 * functions of the ball's position, identical for every bowler and every
 * batter in the league. What they produced was not data.
 *
 * Now the length, line, variation, stroke, contact and area come from the
 * commentary for that exact delivery, and are null when the commentary did not
 * describe them. Callers must skip nulls rather than substitute a value.
 */
function ballDetail(matchId: string, inningIndex: number, inn: any, overNum: number, ballIndex: number): BallInfo {
  const offsets = overOffsets(matchId, inningIndex, inn);
  const base = offsets[overNum];
  if (base == null) return EMPTY_BALL_INFO;
  return getBallInfo(matchId, inningIndex, base + ballIndex);
}

const EMPTY_BALL_INFO: BallInfo = {
  length: null, line: null, variation: null, shot: null, contact: null, zone: null,
};

// ─────────────────────────────────────────────────────────────────────────────
//  FILTER INTERFACES
// ─────────────────────────────────────────────────────────────────────────────

export interface QueryFilters {
  season?: string;
  team?: string;
  opponent?: string;
  venue?: string;
  phase?: string;
  overRange?: string;
  bowlerType?: string;
  deliveryType?: string;
  pressure?: string;
  representation?: string;
  nationality?: string;
  fieldingPosition?: string;
  innings?: string;
  matchContext?: string;   // "All" | "League" | "Playoffs"
  homeAway?: string;       // "All" | "Home" | "Away"
  chasingDefending?: string; // "All" | "Chasing" | "Defending"
  battingHand?: string;    // "All Batters" | "vs LHB" | "vs RHB" — hand of the batter faced (bowler-side filter)
  batter?: string;         // filter to specific batter (for matchup)
  bowler?: string;         // filter to specific bowler (for matchup)
}

export interface FieldFilters {
  season?: string;
  team?: string;
  opponent?: string;
  venue?: string;
  bowlerType?: string;
  deliveryType?: string;
  phase?: string;
  innings?: string;
  batter?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
//  MATCH FILTER — shared by all aggregators
// ─────────────────────────────────────────────────────────────────────────────

function filterMatches(filters: QueryFilters | FieldFilters): string[] {
  ensureInit();
  return matchesList
    .filter(m => {
      // Season filter (support 2008, IPL 2020, and Cricsheet's "2007/08" labels)
      const s = filters.season;
      if (s && s !== "All Seasons" && s !== "All" && s !== "all" && s !== "") {
        const wanted = String(s).trim();
        const label = String(m.season || "").trim();
        const sameLabel = label === wanted;
        const sameYear = isPlainSeasonYear(wanted) &&
          (seasonYearOfDate(m.date) === wanted || (isPlainSeasonYear(label) && label === wanted));
        if (!sameLabel && !sameYear) return false;
      }

      const teamF = (filters as QueryFilters).team;
      if (teamF && teamF !== "All Teams" && teamF !== "All" && teamF !== "all" && teamF !== "") {
        if (!isMatchingTeam(m.team1, teamF) && !isMatchingTeam(m.team2, teamF)) return false;
      }

      const oppF = (filters as QueryFilters).opponent;
      if (oppF && oppF !== "All Opponents" && oppF !== "All" && oppF !== "all" && oppF !== "") {
        if (!isMatchingTeam(m.team1, oppF) && !isMatchingTeam(m.team2, oppF)) return false;
      }

      const venueF = filters.venue;
      if (venueF && venueF !== "All Venues" && venueF !== "Venue" && venueF !== "All" && venueF !== "all" && venueF !== "") {
        const vN = normalizeVenueName(venueF).toLowerCase();
        const mN = normalizeVenueName(m.venue || "").toLowerCase();
        if (vN !== mN) return false;
      }

      // Match context: League / Playoffs / Final, resolved from the raw
      // Cricsheet event stage — see getMatchStage() for why m.match_type
      // (always "T20") can't be used here.
      if (!matchPassesContext(getMatchStage(m.id), (filters as QueryFilters).matchContext)) return false;
      return true;
    })
    .map(m => m.id);
}

// ─────────────────────────────────────────────────────────────────────────────
//  PHASE / OVER FILTER — per delivery
// ─────────────────────────────────────────────────────────────────────────────

function phaseFromOver(over: number): "powerplay" | "middle" | "death" {
  if (over < 6) return "powerplay";
  if (over >= 15) return "death";
  return "middle";
}

function passesPhaseFilter(overNum: number, filters: QueryFilters | FieldFilters): boolean {
  const phase = (filters as QueryFilters).phase;
  if (!phase || phase === "All Phases" || phase === "Phase") return true;
  const fp = phase.toLowerCase();
  const p = phaseFromOver(overNum);
  if (fp.includes("powerplay") || fp.includes("pp") || fp.includes("0-6")) return p === "powerplay";
  if (fp.includes("middle") || fp.includes("7-15")) return p === "middle";
  if (fp.includes("death") || fp.includes("16-20")) return p === "death";
  return true;
}

function passesOverRangeFilter(overNum: number, overRange?: string): boolean {
  if (!overRange || overRange === "All Overs" || overRange === "All") return true;
  // Format: "1-6", "7-15", "16-20", "17-20", "18-20", "1-10"
  const match = overRange.match(/^(\d+)-(\d+)$/);
  if (match) {
    const lo = parseInt(match[1]) - 1; // 0-indexed
    const hi = parseInt(match[2]) - 1;
    return overNum >= lo && overNum <= hi;
  }
  return true;
}

/**
 * Whether a ball matches the selected delivery type. The old version answered
 * this with `(overNum + ballIdx) % 6`, so "show me yorkers" returned every
 * sixth ball of every over regardless of what was bowled.
 *
 * A ball the commentary did not describe is excluded when a specific type is
 * selected — it cannot be shown to match, and pretending it does would refill
 * the charts with the same noise.
 */
function passesDeliveryTypeFilter(info: BallInfo, deliveryType?: string): boolean {
  if (!deliveryType || deliveryType === "Delivery Type" || deliveryType === "Delivery" || deliveryType === "All Deliveries") return true;
  const want = deliveryType.toLowerCase().replace(/[^a-z]/g, "");
  const label = deliveryLabel(info);
  if (!label) return false;
  const have = label.toLowerCase().replace(/[^a-z]/g, "");
  return have.includes(want) || want.includes(have);
}

function passesPressureFilter(overNum: number, inningIndex: number, wicketsFallen: number, pressure?: string): boolean {
  if (!pressure || pressure === "Standard" || pressure === "Pressure" || pressure === "All") return true;
  const fPr = pressure.toLowerCase();
  const isHighPressure = (inningIndex === 1 && overNum >= 15) || wicketsFallen >= 4;
  const isClutch = overNum >= 18;
  const isPlayoffPressure = wicketsFallen >= 3 && overNum >= 10;
  if (fPr.includes("clutch") || fPr.includes("moment")) return isClutch;
  if (fPr.includes("playoff")) return isPlayoffPressure;
  if (fPr.includes("high")) return isHighPressure;
  return true;
}

// ─────────────────────────────────────────────────────────────────────────────
//  MAIN QUERY AGGREGATOR
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Day 8: the result is a pure function of the filters and the warehouse, which is read-only while the server runs
 * (deployed with CRICFIELD_DB_READONLY=1; every other derived cache in this module already lives for the process).
 * The unfiltered all-time query took ~5 s warm and returned 2.4 MB on every request. The most recent results are
 * kept (bounded: QUERY_CACHE_MAX entries); each caller gets a shallow copy, because aggregateScenarioStats reassigns
 * result.batters / result.bowlers. A failed computation is not cached.
 */
const QUERY_CACHE_MAX = 12;
const queryStatsCache = new Map<string, Promise<any>>();

export async function aggregateQueryStats(filters: QueryFilters) {
  const key = JSON.stringify(Object.entries(filters ?? {}).filter(([, v]) => v !== undefined && v !== null && v !== "").sort(([a], [b]) => a.localeCompare(b)));
  let pending = queryStatsCache.get(key);
  if (pending) {
    queryStatsCache.delete(key); // refresh recency
  } else {
    pending = aggregateQueryStatsUncached(filters);
    pending.catch(() => queryStatsCache.delete(key));
  }
  queryStatsCache.set(key, pending);
  while (queryStatsCache.size > QUERY_CACHE_MAX) queryStatsCache.delete(queryStatsCache.keys().next().value!);
  const result = await pending;
  return result && typeof result === "object" ? { ...result } : result;
}

async function aggregateQueryStatsUncached(filters: QueryFilters) {
  const resolvedFilters = { ...filters };
  if (filters.batter && hasDb()) {
    resolvedFilters.batter = await resolvePlayerDbName(filters.batter);
  }
  if (filters.bowler && hasDb()) {
    resolvedFilters.bowler = await resolvePlayerDbName(filters.bowler);
  }

  // The SQL-backed players table has no populated batting_style column, so
  // the "vs LHB"/"vs RHB" filter can only be honored via the JSON path,
  // which resolves handedness per-ball from the player-bio dataset.
  const needsHandednessFilter = !!filters.battingHand && filters.battingHand !== "All Batters" && filters.battingHand !== "All";

  // deliveries.pressure_state is never populated (always "Standard") — every
  // delivery was ingested without it, so it can't be filtered in SQL. Only
  // the JSON path derives pressure per-ball from over/innings/wickets-fallen.
  const needsPressureFilter = !!filters.pressure && filters.pressure !== "Standard" && filters.pressure !== "Pressure" && filters.pressure !== "All";

  if (hasDb() && !needsHandednessFilter && !needsPressureFilter) {
    try {
      return await aggregateQueryStatsSql(resolvedFilters);
    } catch (err) {
      console.warn("SQL Query Stats failed, falling back to JSON:", err);
    }
  }
  return await aggregateQueryStatsJson(resolvedFilters);
}

async function aggregateQueryStatsJson(filters: QueryFilters) {
  ensureInit();
  const matchIds = filterMatches(filters);

  const batterStats = new Map<string, {
    runs: number; balls: number; fours: number; sixes: number;
    innings: Set<string>; notOuts: Set<string>; matchScores: Map<string, number>;
    ppRuns: number; ppBalls: number; middleRuns: number; middleBalls: number;
    deathRuns: number; deathBalls: number;
    dismissals: { kind: string; bowler: string; over: number }[];
    deliveryStats: Map<string, { runs: number; balls: number; dismissals: number; dots: number }>;
    scoringZones: Map<string, { runs: number; balls: number; boundaries: number }>;
  }>();

  const bowlerStats = new Map<string, {
    runs: number; balls: number; wickets: number; dots: number;
    innings: Set<string>;
    ppRuns: number; ppBalls: number; ppWickets: number;
    middleRuns: number; middleBalls: number; middleWickets: number;
    deathRuns: number; deathBalls: number; deathWickets: number;
    boundaries: number;
    bowlerType: BowlerType;
    handSplits: Record<BattingHand, HandSplit>;
    deliveryStats: Map<string, { runs: number; balls: number; wickets: number }>;
  }>();

  const selectedTeam = filters.team && filters.team !== "All Teams" ? filters.team : null;
  const selectedOpponent = filters.opponent && filters.opponent !== "All Opponents" ? filters.opponent : null;
  const filterBatter = filters.batter ? filters.batter.toLowerCase() : null;
  const filterBowler = filters.bowler ? filters.bowler.toLowerCase() : null;

  for (const matchId of matchIds) {
    const matchData = getMatchData(matchId);
    if (!matchData) continue;

    matchData.innings?.forEach((inn: any, inningIndex: number) => {
      // Skip Super Over innings (3rd/4th innings or super_over flag) — ESPN/Cricbuzz exclude these from career stats
      if (inn.super_over || inningIndex >= 2) return;

      const battingTeam  = inn.team;
      const btShort      = teamShort(battingTeam);
      const bowlingTeams = matchData.info.teams.filter((t: string) => t !== battingTeam);
      const blShort      = teamShort(bowlingTeams[0] || "");

      // Innings direction filter
      const chasingDefending = filters.chasingDefending;
      if (chasingDefending && chasingDefending !== "All" && chasingDefending !== "All") {
        if (chasingDefending === "Chasing" && inningIndex !== 1) return;
        if (chasingDefending === "Defending" && inningIndex !== 0) return;
      }

      // Innings (1st/2nd) filter
      if (filters.innings && filters.innings !== "All Innings" && filters.innings !== "Innings") {
        if (filters.innings.toLowerCase().includes("1st") && inningIndex !== 0) return;
        if (filters.innings.toLowerCase().includes("2nd") && inningIndex !== 1) return;
      }

      // Track wickets fallen per over for pressure filter
      let wicketsFallenSoFar = 0;

      inn.overs?.forEach((overObj: any) => {
        const overNum = overObj.over;
        if (!passesOverRangeFilter(overNum, (filters as QueryFilters).overRange)) return;

        overObj.deliveries?.forEach((d: any, ballIndex: number) => {
          const ext = d.extras ?? {};
          const isWide  = !!ext.wides;
          const isNoball = !!ext.noballs;
          const legalBall = !isWide && !isNoball;

          // Phase filter
          if (!passesPhaseFilter(overNum, filters)) return;

          // Bowler type filter
          const bType = getBowlerType(d.bowler, matchData.info?.registry?.people);
          const bowlerTypeF = filters.bowlerType;
          if (bowlerTypeF && bowlerTypeF !== "All Bowlers") {
            const isSpinSel = bowlerTypeF.toLowerCase().includes("spin");
            if (isSpinSel && bType !== "Spinner") return;
            if (!isSpinSel && bType !== "Pacer") return;
          }

          // Delivery type filter
          const ballInfo = ballDetail(matchId, inningIndex, inn, overNum, ballIndex);
          if (!passesDeliveryTypeFilter(ballInfo, filters.deliveryType)) return;

          // Pressure filter
          if (!passesPressureFilter(overNum, inningIndex, wicketsFallenSoFar, filters.pressure)) return;

          // Scoring area / fielding position filter
          if (filters.fieldingPosition && filters.fieldingPosition !== "Scoring Area" &&
              filters.fieldingPosition !== "All Positions" && filters.fieldingPosition !== "All Areas") {
            // No recorded area means the ball cannot be shown to satisfy an
            // area filter, so it drops out rather than being assigned one.
            if (!ballInfo.zone) return;
            if (ballInfo.zone.toLowerCase() !== filters.fieldingPosition.toLowerCase()) return;
          }

          // Batter handedness filter (bowler-side: "vs LHB" / "vs RHB")
          if (filters.battingHand && filters.battingHand !== "All Batters" && filters.battingHand !== "All") {
            const bh = filters.battingHand.toLowerCase();
            const hand = getBattingHand(d.batter);
            if (bh.includes("lhb") && hand !== "LHB") return;
            if (bh.includes("rhb") && hand !== "RHB") return;
          }

          // Representation source-of-truth filter
          if (!passesRepresentationFilter(d.batter, filters, btShort)) return;
          if (!passesRepresentationFilter(d.bowler, filters, blShort)) return;

          // Batter name filter (for matchup)
          if (filters.batter && !playerNamesMatch(d.batter, filters.batter)) return;
          // Bowler name filter (for matchup)
          if (filters.bowler && !playerNamesMatch(d.bowler, filters.bowler)) return;

          const phase = phaseFromOver(overNum);
          const delivType = deliveryLabel(ballInfo);
          const zone = ballInfo.zone;

          // ── Accumulate batter stats ──────────────────────────────────────
          const batterCondition = (!selectedTeam || isMatchingTeam(battingTeam, selectedTeam) || isMatchingTeam(btShort, selectedTeam)) &&
                                  (!selectedOpponent || isMatchingTeam(blShort, selectedOpponent) || bowlingTeams.some((bt: any) => isMatchingTeam(bt, selectedOpponent)));
          if (batterCondition) {
            let bs = batterStats.get(d.batter);
            if (!bs) {
              bs = {
                runs: 0, balls: 0, fours: 0, sixes: 0,
                innings: new Set(), notOuts: new Set(), matchScores: new Map(),
                ppRuns: 0, ppBalls: 0, middleRuns: 0, middleBalls: 0,
                deathRuns: 0, deathBalls: 0,
                dismissals: [],
                deliveryStats: new Map(),
                scoringZones: new Map(),
              };
              batterStats.set(d.batter, bs);
            }
            const br = d.runs?.batter || 0;
            bs.runs += br;
            if (legalBall) bs.balls++;
            if (br === 4) bs.fours++;
            if (br === 6) bs.sixes++;
            bs.innings.add(matchId);
            bs.matchScores.set(matchId, (bs.matchScores.get(matchId) || 0) + br);

            if (phase === "powerplay") { bs.ppRuns += br; if (legalBall) bs.ppBalls++; }
            else if (phase === "middle") { bs.middleRuns += br; if (legalBall) bs.middleBalls++; }
            else { bs.deathRuns += br; if (legalBall) bs.deathBalls++; }

            // Delivery breakdown — only for balls the commentary described.
            if (delivType) {
              const ds = bs.deliveryStats.get(delivType) || { runs: 0, balls: 0, dismissals: 0, dots: 0 };
              ds.runs += br; if (legalBall) ds.balls++;
              if (legalBall && (d.runs?.total || 0) === 0) ds.dots++;
              bs.deliveryStats.set(delivType, ds);
            }

            // Scoring zone — likewise, silence is not a zone.
            if (zone) {
              const zs = bs.scoringZones.get(zone) || { runs: 0, balls: 0, boundaries: 0 };
              zs.runs += br; if (legalBall) zs.balls++;
              if (br === 4 || br === 6) zs.boundaries++;
              bs.scoringZones.set(zone, zs);
            }
          }

// ── Accumulate bowler stats ──────────────────────────────────────
          const bowlerCondition = (!selectedTeam || isMatchingTeam(blShort, selectedTeam) || bowlingTeams.some((bt: any) => isMatchingTeam(bt, selectedTeam))) &&
                                  (!selectedOpponent || isMatchingTeam(battingTeam, selectedOpponent) || isMatchingTeam(btShort, selectedOpponent));
          if (bowlerCondition) {
            let ws = bowlerStats.get(d.bowler);
            if (!ws) {
              ws = {
                runs: 0, balls: 0, wickets: 0, dots: 0, innings: new Set(),
                ppRuns: 0, ppBalls: 0, ppWickets: 0,
                middleRuns: 0, middleBalls: 0, middleWickets: 0,
                deathRuns: 0, deathBalls: 0, deathWickets: 0,
                boundaries: 0,
                bowlerType: bType,
                handSplits: { LHB: newHandSplit(), RHB: newHandSplit(), Unknown: newHandSplit() },
                deliveryStats: new Map(),
              };
              bowlerStats.set(d.bowler, ws);
            }
            const conceded = (d.runs?.batter || 0) + (ext.wides ?? 0) + (ext.noballs ?? 0);
            ws.runs += conceded;
            if (legalBall) ws.balls++;
            const batterRuns = d.runs?.batter || 0;
            if (legalBall && (batterRuns === 4 || batterRuns === 6)) ws.boundaries++;
            if (legalBall && (d.runs?.total || 0) === 0) ws.dots++;
            ws.innings.add(matchId);

            const battingHand = getBattingHand(d.batter);
            ws.handSplits[battingHand].runs += batterRuns;
            if (legalBall) ws.handSplits[battingHand].balls++;

            if (phase === "powerplay") { ws.ppRuns += conceded; if (legalBall) ws.ppBalls++; }
            else if (phase === "middle") { ws.middleRuns += conceded; if (legalBall) ws.middleBalls++; }
            else { ws.deathRuns += conceded; if (legalBall) ws.deathBalls++; }

            // Delivery breakdown for bowler
            if (delivType) {
              const wds = ws.deliveryStats.get(delivType) || { runs: 0, balls: 0, wickets: 0 };
              wds.runs += conceded; if (legalBall) wds.balls++;
              ws.deliveryStats.set(delivType, wds);
            }

            if (d.wickets) {
              d.wickets.forEach((wk: any) => {
                wicketsFallenSoFar++;
                const credited = !["run out","retired hurt","retired out","obstructing the field"].includes(wk.kind);
                if (credited) {
                  ws!.wickets++;
                  ws!.handSplits[battingHand].wickets++;
                  if (phase === "powerplay") ws!.ppWickets++;
                  else if (phase === "middle") ws!.middleWickets++;
                  else ws!.deathWickets++;
                  if (delivType) {
                    const wd2 = ws!.deliveryStats.get(delivType) || { runs: 0, balls: 0, wickets: 0 };
                    wd2.wickets++;
                    ws!.deliveryStats.set(delivType, wd2);
                  }
                }
              });
            }
          }

          // Track wickets for pressure filter next ball
          if (d.wickets) wicketsFallenSoFar += d.wickets.length;
        });
      });

      // Resolve notOuts — remove anyone who was dismissed
      inn.overs?.forEach((overObj: any) => {
        overObj.deliveries?.forEach((d: any) => {
          if (d.wickets) {
            d.wickets.forEach((wk: any) => {
              const bs = batterStats.get(wk.player_out);
              if (bs) bs.notOuts.delete(matchId);
            });
          } else {
            const bs = batterStats.get(d.batter);
            if (bs) bs.notOuts.add(matchId);
          }
        });
      });
    });
  }

  // ── Compile batters ────────────────────────────────────────────────────────
  const filteredMatchList = matchesList.filter(m => matchIds.includes(m.id));

  const compiledBatters = Array.from(batterStats.entries()).map(([player, stat]) => {
    const inningsCount   = stat.innings.size;
    const notOutCount    = stat.notOuts.size;
    const dismissedCount = inningsCount - notOutCount;
    const avg  = dismissedCount > 0 ? Math.round((stat.runs / dismissedCount) * 10) / 10 : stat.runs;
    const sr   = stat.balls > 0 ? Math.round((stat.runs / stat.balls) * 1000) / 10 : 0;
    let highest = 0, fifties = 0, hundreds = 0;
    stat.matchScores.forEach(s => {
      if (s > highest) highest = s;
      if (s >= 100) hundreds++;
      else if (s >= 50) fifties++;
    });

    // Phase split
    const ppSR     = stat.ppBalls   > 0 ? Math.round((stat.ppRuns   / stat.ppBalls)   * 1000) / 10 : 0;
    const midSR    = stat.middleBalls > 0 ? Math.round((stat.middleRuns / stat.middleBalls) * 1000) / 10 : 0;
    const deathSR  = stat.deathBalls > 0 ? Math.round((stat.deathRuns / stat.deathBalls)   * 1000) / 10 : 0;

    // Delivery breakdown
    const deliveryBreakdown = Array.from(stat.deliveryStats.entries()).map(([type, s]) => ({
      type, runs: s.runs, balls: s.balls, dismissals: s.dismissals,
      sr: s.balls > 0 ? Math.round((s.runs / s.balls) * 1000) / 10 : 0,
      // Dot balls (legal, no runs) per 100 balls. Was (balls − runs) ÷ balls, which is not a dot rate.
      dotPct: s.balls > 0 ? Math.round((s.dots / s.balls) * 100) : 0
    })).filter(d => d.balls >= 1).sort((a, b) => b.runs - a.runs);

    // Scoring zones
    const scoringZones = Array.from(stat.scoringZones.entries()).map(([zone, s]) => ({
      zone, runs: s.runs, balls: s.balls, boundaries: s.boundaries,
      sr: s.balls > 0 ? Math.round((s.runs / s.balls) * 1000) / 10 : 0,
      // Boundaries per 100 balls in the zone. (Was boundaries ÷ runs: a count over runs, not a percentage.)
      boundaryPct: s.balls > 0 ? Math.round((s.boundaries / s.balls) * 100) : 0
    })).filter(z => z.balls >= 1).sort((a, b) => b.runs - a.runs);

    return {
      player,
      season: filters.season || "All",
      team: selectedTeam && selectedTeam !== "All" ? selectedTeam : getPlayerLatestTeam(player),
      matches: filteredMatchList.filter(m => {
        const t1 = teamShort(m.team1); const t2 = teamShort(m.team2);
        return !selectedTeam || t1 === selectedTeam || t2 === selectedTeam;
      }).length || inningsCount,
      innings: inningsCount,
      runs: stat.runs,
      balls: stat.balls,
      avg, sr, fours: stat.fours, sixes: stat.sixes, fifties, hundreds, highest,
      boundaryPct: boundaryRunPct(stat.fours, stat.sixes, stat.runs),
      boundaryRunPct: boundaryRunPct(stat.fours, stat.sixes, stat.runs),
      isIndian: isIndianPlayer(player),
      // Phase breakdown
      ppRuns: stat.ppRuns, ppBalls: stat.ppBalls, ppSR,
      middleRuns: stat.middleRuns, middleBalls: stat.middleBalls, midSR,
      deathRuns: stat.deathRuns, deathBalls: stat.deathBalls, deathSR,
      // Advanced breakdowns
      deliveryBreakdown,
      scoringZones,
    };
  }).filter(b => {
    if (wantsNationalityFilter(filters.nationality)) {
      return b.isIndian === nationalityWantsIndian(filters.nationality!);
    }
    return true;
  });

// ── Compile bowlers ────────────────────────────────────────────────────────
   const compiledBowlers = Array.from(bowlerStats.entries()).map(([player, stat]) => {
    const inningsCount = stat.innings.size;
    const econ = stat.balls > 0 ? Math.round((stat.runs / (stat.balls / 6)) * 100) / 100 : 0;
    const avg  = stat.wickets > 0 ? Math.round((stat.runs / stat.wickets) * 10) / 10 : 0;
    const sr   = stat.wickets > 0 ? Math.round((stat.balls / stat.wickets) * 10) / 10 : 0;
    const dotPct = stat.balls > 0 ? Math.round((stat.dots / stat.balls) * 100) : 0;

    const boundaryPct = stat.balls > 0 ? Math.round((stat.boundaries / stat.balls) * 1000) / 10 : 0;
    const ballsPerBoundary = stat.boundaries > 0 ? Math.round((stat.balls / stat.boundaries) * 10) / 10 : (stat.balls || 99.9);

    // Calculate True Economy as bowler economy minus each match's total scoring baseline.
    let totalMatchEcon = 0, matchCount = 0;
    stat.innings.forEach(matchId => {
      const matchData = matchCache.get(matchId);
      if (matchData) {
        let matchRuns = 0, matchBalls = 0;
        matchData.innings?.forEach((inn: any) => {
          inn.overs?.forEach((overObj: any) => {
            overObj.deliveries?.forEach((d: any) => {
              const ext = d.extras ?? {};
              const isWide = !!ext.wides;
              const isNoball = !!ext.noballs;
              const legalBall = !isWide && !isNoball;
              matchRuns += d.runs?.total || 0;
              if (legalBall) matchBalls++;
            });
          });
        });
        const matchEcon = matchBalls > 0 ? Math.round((matchRuns / (matchBalls / 6)) * 100) / 100 : 0;
        totalMatchEcon += matchEcon;
        matchCount++;
      }
    });
    const avgMatchEcon = matchCount > 0 ? totalMatchEcon / matchCount : 0;
    const trueEconomy = Math.round((econ - avgMatchEcon) * 100) / 100;
    const compileHandSplit = (split: HandSplit) => ({
      ...split,
      strikeRate: split.balls > 0 ? Math.round((split.runs / split.balls) * 1000) / 10 : 0,
    });

    const deliveryBreakdown = Array.from(stat.deliveryStats.entries()).map(([type, s]) => ({
      type, runs: s.runs, balls: s.balls, wickets: s.wickets,
      econ: s.balls > 0 ? Math.round((s.runs / (s.balls / 6)) * 100) / 100 : 0,
      sr: s.wickets > 0 ? Math.round((s.balls / s.wickets) * 10) / 10 : 0
    })).filter(d => d.balls >= 1).sort((a, b) => b.wickets - a.wickets);

    return {
      player,
      season: filters.season || "All",
      team: selectedTeam || "All",
      matches: inningsCount, innings: inningsCount,
      balls: stat.balls,
      wickets: stat.wickets, econ, avg, sr, dotPct,
      ppWickets: stat.ppWickets, middleWickets: stat.middleWickets, deathWickets: stat.deathWickets,
      isIndian: isIndianPlayer(player),
      deliveryBreakdown,
      boundaryPct,
      ballsPerBoundary,
      trueEconomy,
      bowlerType: stat.bowlerType,
      vsLhb: compileHandSplit(stat.handSplits.LHB),
      vsRhb: compileHandSplit(stat.handSplits.RHB),
      unmatchedBatterBalls: stat.handSplits.Unknown.balls,
    };
  }).filter(b => {
    if (wantsNationalityFilter(filters.nationality)) {
      return b.isIndian === nationalityWantsIndian(filters.nationality!);
    }
    return true;
  });

  return { batters: compiledBatters, bowlers: compiledBowlers };
}

// ─────────────────────────────────────────────────────────────────────────────
//  MATCHUP AGGREGATOR — batter vs bowler deep stats
// ─────────────────────────────────────────────────────────────────────────────

export async function aggregateMatchupStats(batter: string, bowler: string, filters: QueryFilters) {
  let resolvedBatter = batter;
  let resolvedBowler = bowler;
  const resolvedFilters = { ...filters };
  if (hasDb()) {
    resolvedBatter = await resolvePlayerDbName(batter);
    resolvedBowler = await resolvePlayerDbName(bowler);
    if (filters.batter) resolvedFilters.batter = await resolvePlayerDbName(filters.batter);
    if (filters.bowler) resolvedFilters.bowler = await resolvePlayerDbName(filters.bowler);
  }
  // See aggregateQueryStats() — pressure_state is never populated in the DB.
  const needsPressureFilter = !!filters.pressure && filters.pressure !== "Standard" && filters.pressure !== "Pressure" && filters.pressure !== "All";
  if (hasDb() && !needsPressureFilter) {
    try {
      return await aggregateMatchupStatsSql(resolvedBatter, resolvedBowler, resolvedFilters);
    } catch (err) {
      console.warn("SQL Matchup Stats failed, falling back to JSON:", err);
    }
  }
  return await aggregateMatchupStatsJson(resolvedBatter, resolvedBowler, resolvedFilters);
}

async function aggregateMatchupStatsJson(batter: string, bowler: string, filters: QueryFilters) {
  ensureInit();
  const matchIds = filterMatches(filters);

  const stats = {
    runs: 0, balls: 0, dismissals: 0, dots: 0, fours: 0, sixes: 0,
    phaseSplit: { powerplay: { runs: 0, balls: 0, wkts: 0 }, middle: { runs: 0, balls: 0, wkts: 0 }, death: { runs: 0, balls: 0, wkts: 0 } },
    deliveries: new Map<string, { runs: number; balls: number; dismissals: number; dots: number }>(),
    scoringZones: new Map<string, { runs: number; balls: number; boundaries: number }>(),
    matchHistory: [] as { matchId: string; season: string; venue: string; runs: number; balls: number; dismissed: boolean }[],
  };

  // Balls in this matchup that the commentary described in any way. Counted so
  // the response can say what fraction of the contest the breakdowns cover.
  let describedBalls = 0;

  for (const matchId of matchIds) {
    const matchData = getMatchData(matchId);
    if (!matchData) continue;
    const matchMeta = matchesList.find(m => m.id === matchId);

    let matchRuns = 0, matchBalls = 0, matchDismissed = false;

    matchData.innings?.forEach((inn: any, inningIndex: number) => {
      if (filters.innings && filters.innings !== "All Innings" && filters.innings !== "Innings") {
        if (filters.innings.toLowerCase().includes("1st") && inningIndex !== 0) return;
        if (filters.innings.toLowerCase().includes("2nd") && inningIndex !== 1) return;
      }

      inn.overs?.forEach((overObj: any) => {
        const overNum = overObj.over;
        if (!passesPhaseFilter(overNum, filters)) return;

        overObj.deliveries?.forEach((d: any, ballIndex: number) => {
          if (!playerNamesMatch(d.batter || "", batter)) return;
          if (!playerNamesMatch(d.bowler || "", bowler)) return;

          const btShort = teamShort(inn.team);
          const bowlingTeams = matchData.info.teams.filter((t: string) => t !== inn.team);
          const blShort = teamShort(bowlingTeams[0] || "");
          if (!passesRepresentationFilter(d.batter, filters, btShort)) return;
          if (!passesRepresentationFilter(d.bowler, filters, blShort)) return;

          const ext = d.extras ?? {};
          const isWide = !!ext.wides; const isNoball = !!ext.noballs;
          const legal = !isWide && !isNoball;
          const br = d.runs?.batter || 0;
          const bType = getBowlerType(d.bowler, matchData.info?.registry?.people);
          const phase = phaseFromOver(overNum);
          const ballInfo = ballDetail(matchId, inningIndex, inn, overNum, ballIndex);
          const delivType = deliveryLabel(ballInfo);
          const zone = ballInfo.zone;
          if (delivType || zone) describedBalls++;

          stats.runs += br; matchRuns += br;
          if (legal) { stats.balls++; matchBalls++; }
          if (br === 4) stats.fours++;
          if (br === 6) stats.sixes++;
          if (legal && (d.runs?.total || 0) === 0) stats.dots++;

          // Phase split
          const ps = stats.phaseSplit[phase];
          ps.runs += br; if (legal) ps.balls++;

          // Delivery — counted only where the commentary named one.
          if (delivType) {
            const ds = stats.deliveries.get(delivType) || { runs: 0, balls: 0, dismissals: 0, dots: 0 };
            ds.runs += br; if (legal) ds.balls++;
            if (legal && (d.runs?.total || 0) === 0) ds.dots++;
            stats.deliveries.set(delivType, ds);
          }

          // Zone
          if (zone) {
            const zs = stats.scoringZones.get(zone) || { runs: 0, balls: 0, boundaries: 0 };
            zs.runs += br; if (legal) zs.balls++;
            if (br === 4 || br === 6) zs.boundaries++;
            stats.scoringZones.set(zone, zs);
          }

          if (d.wickets) {
            d.wickets.forEach((wk: any) => {
              if (playerNamesMatch(wk.player_out || "", batter)) {
                stats.dismissals++;
                stats.phaseSplit[phase].wkts++;
                const ds2 = delivType ? stats.deliveries.get(delivType) : undefined;
                if (ds2) ds2.dismissals++;
                matchDismissed = true;
              }
            });
          }
        });
      });
    });

    if (matchRuns > 0 || matchBalls > 0 || matchDismissed) {
      stats.matchHistory.push({
        matchId,
        season: matchMeta?.season || "",
        venue: normalizeVenueName(matchMeta?.venue || ""),
        runs: matchRuns,
        balls: matchBalls,
        dismissed: matchDismissed
      });
    }
  }

  const sr   = stats.balls > 0 ? Math.round((stats.runs / stats.balls) * 1000) / 10 : 0;
  const dotPct = stats.balls > 0 ? Math.round((stats.dots / stats.balls) * 100) : 0;
  const boundaryPct = boundaryRunPct(stats.fours, stats.sixes, stats.runs);
  const dismissalRate = stats.balls > 0 ? Math.round((stats.dismissals / stats.balls) * 1000) / 10 : 0;
  const dominanceIndex = Math.max(0, Math.min(100, Math.round(50 + (sr - 130) * 0.25 - dismissalRate * 2 + boundaryPct * 0.15)));

  return {
    batter, bowler, runs: stats.runs, balls: stats.balls, dismissals: stats.dismissals,
    sr, dotPct, boundaryPct, boundaryRunPct: boundaryPct, dominanceIndex, fours: stats.fours, sixes: stats.sixes,
    battingHand: getBattingHand(batter),
    bowlerType: getBowlerType(bowler),
    phaseSplit: {
      powerplay: { ...stats.phaseSplit.powerplay, sr: stats.phaseSplit.powerplay.balls > 0 ? Math.round((stats.phaseSplit.powerplay.runs / stats.phaseSplit.powerplay.balls) * 1000) / 10 : 0 },
      middle:    { ...stats.phaseSplit.middle,    sr: stats.phaseSplit.middle.balls    > 0 ? Math.round((stats.phaseSplit.middle.runs    / stats.phaseSplit.middle.balls)    * 1000) / 10 : 0 },
      death:     { ...stats.phaseSplit.death,     sr: stats.phaseSplit.death.balls     > 0 ? Math.round((stats.phaseSplit.death.runs     / stats.phaseSplit.death.balls)     * 1000) / 10 : 0 },
    },
    deliveries: Array.from(stats.deliveries.entries()).map(([type, s]) => ({
      type, runs: s.runs, balls: s.balls, dismissals: s.dismissals, dots: s.dots,
      sr: s.balls > 0 ? Math.round((s.runs / s.balls) * 1000) / 10 : 0,
      dotPct: s.balls > 0 ? Math.round((s.dots / s.balls) * 100) : 0
    })).filter(d => d.balls >= 1).sort((a, b) => b.runs - a.runs),
    scoringZones: Array.from(stats.scoringZones.entries()).map(([zone, s]) => ({
      zone, runs: s.runs, balls: s.balls, boundaries: s.boundaries,
      sr: s.balls > 0 ? Math.round((s.runs / s.balls) * 1000) / 10 : 0,
      boundaryPct: s.balls > 0 ? Math.round((s.boundaries / s.balls) * 100) : 0
    })).filter(z => z.balls >= 1).sort((a, b) => b.runs - a.runs),
    matchHistory: stats.matchHistory.sort((a, b) => b.runs - a.runs),
    // How much of this matchup the ball-by-ball commentary actually describes.
    // The breakdowns above cover only these balls; the headline runs/balls
    // cover all of them. Reporting the gap is the difference between a sparse
    // chart and a misleading one.
    detail: {
      describedBalls,
      totalBalls: stats.balls,
      coveragePct: stats.balls > 0 ? Math.round((describedBalls / stats.balls) * 100) : 0,
    },
  };
}

// ─────────────────────────────────────────────────────────────────────────────
//  SCENARIO AGGREGATOR
// ─────────────────────────────────────────────────────────────────────────────

export interface ScenarioFilters extends QueryFilters {
  scenario?: string;  // "chasing200plus" | "defending150minus" | "playoff" | "death-spin" | "powerplay-wickets"
  minBalls?: number;
  minRuns?: number;
}

export async function aggregateScenarioStats(filters: ScenarioFilters) {
  ensureInit();

  // Build base query filters depending on scenario
  const baseFilters: QueryFilters = { ...filters };

  switch (filters.scenario) {
    case "chasing200plus":
      baseFilters.innings = "2nd Innings (Chasing)";
      baseFilters.chasingDefending = "Chasing";
      break;
    case "defending150minus":
      baseFilters.innings = "1st Innings (Setting)";
      baseFilters.chasingDefending = "Defending";
      break;
    case "playoff":
      baseFilters.matchContext = "Playoffs";
      break;
    case "death-spin":
      baseFilters.phase = "Death Overs (16-20)";
      baseFilters.bowlerType = "Spinner";
      break;
    case "powerplay":
      baseFilters.phase = "Powerplay (0-6)";
      break;
    case "death":
      baseFilters.phase = "Death Overs (16-20)";
      break;
    case "high-pressure":
      baseFilters.pressure = "High Pressure";
      break;
    case "clutch":
      baseFilters.pressure = "Clutch Moment";
      break;
  }

  const result = await aggregateQueryStats(baseFilters);

  // For chasing200plus: filter matches where the target was 200+
  if (filters.scenario === "chasing200plus") {
    const matchIds = filterMatches(baseFilters);
    const highTargetMatchIds = new Set(
      matchesList
        .filter(m => {
          if (!matchIds.includes(m.id)) return false;
          const t1Score = m.team1Score ? parseInt((m.team1Score || "").split("/")[0]) : 0;
          const t2Score = m.team2Score ? parseInt((m.team2Score || "").split("/")[0]) : 0;
          return Math.max(t1Score, t2Score) >= 200;
        })
        .map(m => m.id)
    );
    // Re-run with high-target match list only
    // For simplicity, mark context
    result.batters = result.batters.map((b: any) => ({ ...b, scenario: "Chasing 200+" }));
  }

  if (filters.scenario === "defending150minus") {
    result.batters = result.batters.map((b: any) => ({ ...b, scenario: "Defending <150" }));
  }

  const minBalls = filters.minBalls || 0;
  const minRuns  = filters.minRuns  || 0;

  result.batters  = result.batters.filter((b: any) => b.balls >= minBalls && b.runs >= minRuns);
  result.bowlers  = result.bowlers.filter((b: any) => b.balls >= minBalls);

  return result;
}

// ─────────────────────────────────────────────────────────────────────────────
//  DRILLDOWN AGGREGATOR — for a specific player, get dimensional breakdown
// ─────────────────────────────────────────────────────────────────────────────

export async function aggregateDrilldown(player: string, dimension: "phase" | "delivery" | "scoring-zone" | "bowler" | "over", filters: QueryFilters) {
  let resolvedPlayer = player;
  const resolvedFilters = { ...filters };
  if (hasDb()) {
    resolvedPlayer = await resolvePlayerDbName(player);
    if (filters.batter) resolvedFilters.batter = await resolvePlayerDbName(filters.batter);
    if (filters.bowler) resolvedFilters.bowler = await resolvePlayerDbName(filters.bowler);
  }
  // See aggregateQueryStats() — pressure_state is never populated in the DB.
  const needsPressureFilter = !!filters.pressure && filters.pressure !== "Standard" && filters.pressure !== "Pressure" && filters.pressure !== "All";
  if (hasDb() && !needsPressureFilter) {
    try {
      return await aggregateDrilldownSql(resolvedPlayer, dimension, resolvedFilters);
    } catch (err) {
      console.warn("SQL Drilldown Stats failed, falling back to JSON:", err);
    }
  }
  return await aggregateDrilldownJson(resolvedPlayer, dimension, resolvedFilters);
}

async function aggregateDrilldownJson(player: string, dimension: "phase" | "delivery" | "scoring-zone" | "bowler" | "over", filters: QueryFilters) {
  ensureInit();
  const matchIds = filterMatches(filters);
  const playerLower = player.toLowerCase();

  const acc = new Map<string, { label: string; runs: number; balls: number; dismissals: number; dots: number; boundaries: number }>();

  for (const matchId of matchIds) {
    const matchData = getMatchData(matchId);
    if (!matchData) continue;

    matchData.innings?.forEach((inn: any, inningIndex: number) => {
      inn.overs?.forEach((overObj: any) => {
        const overNum = overObj.over;
        overObj.deliveries?.forEach((d: any, ballIndex: number) => {
          if (!d.batter?.toLowerCase().includes(playerLower)) return;
          const btShort = teamShort(inn.team);
          const bowlingTeams = matchData.info.teams.filter((t: string) => t !== inn.team);
          const blShort = teamShort(bowlingTeams[0] || "");
          if (!passesRepresentationFilter(d.batter, filters, btShort)) return;
          if (!passesRepresentationFilter(d.bowler, filters, blShort)) return;

          const ext = d.extras ?? {};
          const legal = !ext.wides && !ext.noballs;
          const br = d.runs?.batter || 0;
          const bType = getBowlerType(d.bowler, matchData.info?.registry?.people);

          // A null label means the commentary did not describe this ball on
          // the requested dimension; the ball is left out of the drilldown
          // instead of being bucketed under a guess.
          let label: string | null = "";
          switch (dimension) {
            case "phase":
              label = phaseFromOver(overNum);
              break;
            case "delivery":
              label = deliveryLabel(ballDetail(matchId, inningIndex, inn, overNum, ballIndex));
              break;
            case "scoring-zone":
              label = ballDetail(matchId, inningIndex, inn, overNum, ballIndex).zone;
              break;
            case "bowler":
              label = d.bowler;
              break;
            case "over":
              label = `Over ${overNum + 1}`;
              break;
          }

          if (!label) return;
          const rec = acc.get(label) || { label, runs: 0, balls: 0, dismissals: 0, dots: 0, boundaries: 0 };
          rec.runs += br;
          if (legal) rec.balls++;
          if (legal && br === 0 && !d.wickets) rec.dots++;
          if (br === 4 || br === 6) rec.boundaries++;
          acc.set(label, rec);

          if (d.wickets) {
            d.wickets.forEach((wk: any) => {
              if (wk.player_out && playerNamesMatch(wk.player_out, player)) {
                acc.get(label)!.dismissals++;
              }
            });
          }
        });
      });
    });
  }

  return Array.from(acc.values()).map(r => ({
    ...r,
    sr: r.balls > 0 ? Math.round((r.runs / r.balls) * 1000) / 10 : 0,
    dotPct: r.balls > 0 ? Math.round((r.dots / r.balls) * 100) : 0,
    boundaryPct: r.balls > 0 ? Math.round((r.boundaries / r.balls) * 100) : 0,
  })).filter(r => r.balls >= 1).sort((a, b) => b.runs - a.runs);
}

// ─────────────────────────────────────────────────────────────────────────────
//  FIELD POSITIONS (Scoring Areas)
// ─────────────────────────────────────────────────────────────────────────────

export async function aggregateFieldStats(filters: FieldFilters) {
  const resolvedFilters = { ...filters };
  if (filters.batter && hasDb()) {
    resolvedFilters.batter = await resolvePlayerDbName(filters.batter);
  }
  if (hasDb()) {
    try {
      return await aggregateFieldStatsSql(resolvedFilters);
    } catch (err) {
      console.warn("SQL Field Stats failed, falling back to JSON:", err);
    }
  }
  return await aggregateFieldStatsJson(resolvedFilters);
}

async function aggregateFieldStatsJson(filters: FieldFilters) {
  ensureInit();
  const matchIds = filterMatches(filters as QueryFilters);

  type FPRec = { position: string; zone: string; balls: number; runs: number; wickets: number; boundaries: number; dotBalls: number };
  const fieldAcc = new Map<string, FPRec>();

  function recordPos(position: string, zone: string, d: any) {
    let rec = fieldAcc.get(position);
    if (!rec) { rec = { position, zone, balls: 0, runs: 0, wickets: 0, boundaries: 0, dotBalls: 0 }; fieldAcc.set(position, rec); }
    const legal = !d.extras?.wides && !d.extras?.noballs;
    rec.balls++;
    rec.runs += d.runs?.batter || 0;
    if (d.runs?.batter === 4 || d.runs?.batter === 6) rec.boundaries++;
    if (d.wickets) rec.wickets++;
    if (legal && !d.wickets && (d.runs?.total || 0) === 0) rec.dotBalls++;
  }

  function classifyZone(stopField: string | undefined): { position: string; zone: string } | null {
    if (!stopField) return null;
    const t = stopField.toLowerCase();
    if (t.includes("keeper") || t.includes("wicket-keeper"))      return { position: "Wicket-keeper", zone: "keeper" };
    if (t.includes("slip") || t.includes("leg gully"))            return { position: stopField.split(",").pop()?.trim() || stopField, zone: "slips" };
    if (t.includes("gully"))                                       return { position: "Gully",          zone: "slips" };
    if (t.includes("point") || t.includes("cover") || t.includes("extra cover"))
      return { position: stopField.split(",").pop()?.trim() || stopField, zone: t.includes("deep") ? "off-deep" : "off" };
    if (t.includes("mid-wicket") || t.includes("mid wicket"))
      return { position: stopField.split(",").pop()?.trim() || stopField, zone: t.includes("deep") ? "leg-deep" : "leg" };
    if (t.includes("mid-on") || t.includes("mid off"))
      return { position: stopField.split(",").pop()?.trim() || stopField, zone: t.includes("deep") ? "leg-deep" : "leg" };
    if (t.includes("square leg") || t.includes("fine leg") || t.includes("deep square") || t.includes("deep fine"))
      return { position: stopField.split(",").pop()?.trim() || stopField, zone: "leg-deep" };
    if (t.includes("long on"))   return { position: "Long-on",   zone: "leg-deep" };
    if (t.includes("long off"))  return { position: "Long-off",  zone: "off-deep" };
    if (t.includes("third man")) return { position: "Third Man", zone: "boundary" };
    return { position: stopField.split(",").pop()?.trim() || stopField, zone: "off" };
  }

  const filterBatter = filters.batter ? filters.batter.toLowerCase() : null;

  for (const matchId of matchIds) {
    const mData = getMatchData(matchId);
    if (!mData) continue;

    mData.innings?.forEach((inn: any, inningIndex: number) => {
      if (filters.innings && filters.innings !== "All Innings" && filters.innings !== "Innings") {
        if (filters.innings.toLowerCase().includes("1st") && inningIndex !== 0) return;
        if (filters.innings.toLowerCase().includes("2nd") && inningIndex !== 1) return;
      }
      inn.overs?.forEach((oObj: any) => {
        const overNum = oObj.over;
        const deliveries = (oObj.deliveries || []) as any[];
        deliveries.forEach((d: any, ballIdx: number) => {
          if (filters.batter && !playerNamesMatch(d.batter || "", filters.batter)) return;

          const btShort = teamShort(inn.team);
          const bowlingTeams = mData.info.teams.filter((t: string) => t !== inn.team);
          const blShort = teamShort(bowlingTeams[0] || "");
          if (!passesRepresentationFilter(d.batter, filters as QueryFilters, btShort)) return;
          if (!passesRepresentationFilter(d.bowler, filters as QueryFilters, blShort)) return;

          const bType = getBowlerType(d.bowler, mData.info?.registry?.people);
          if (filters.bowlerType && filters.bowlerType !== "All Bowlers") {
            const isSpin = filters.bowlerType.toLowerCase().includes("spin");
            if (isSpin && bType !== "Spinner") return;
            if (!isSpin && bType !== "Pacer") return;
          }
          if (!passesPhaseFilter(overNum, filters as QueryFilters)) return;
          const ballInfo = ballDetail(matchId, inningIndex, inn, overNum, ballIdx);
          if (!passesDeliveryTypeFilter(ballInfo, filters.deliveryType)) return;

          const zone = ballInfo.zone;
          if (!zone) return;
          const found = classifyZone(zone);
          if (found) recordPos(found.position, found.zone, d);
        });
      });
    });
  }

  return Array.from(fieldAcc.values()).sort((a, b) => b.runs - a.runs);
}

// ─────────────────────────────────────────────────────────────────────────────
//  SQL BACKEND IMPLEMENTATIONS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Team and venue names reach us in whatever spelling the UI happens to show
 * (short codes, franchise renames, canonical venue labels). Matching those
 * against the DB in SQL is unreliable — both dimension tables are tiny, so we
 * resolve the filter to a set of primary keys once and filter on ids instead.
 */
export interface ResolvedRefs {
  teamIds?: number[];
  opponentIds?: number[];
  venueIds?: number[];
  matchIds?: string[];
  bowlerTypeIds?: number[];
}

let teamRowCache: { id: number; name: string; shortName: string }[] | null = null;
let venueRowCache: { id: number; name: string }[] | null = null;
let bowlerTypeIdCache: { pacerIds: number[]; spinnerIds: number[] } | null = null;

const isDimensionSet = (value: string | undefined, allLabel: string): boolean =>
  !!value && value !== allLabel && value !== "All" && value !== "all" && value !== "";

/** `column IN (...)`, or a never-true predicate when nothing resolved. */
function inIdList(column: SQL, ids?: Array<string | number>): SQL {
  if (!ids || ids.length === 0) return sql`1 = 0`;
  return sql`${column} IN (${sql.join(ids.map(id => sql`${id}`), sql`, `)})`;
}

/**
 * Match ids whose stage satisfies a "Match Type" (League/Playoffs/Final)
 * filter. Stage isn't a DB column (see getMatchStage()), so this walks the
 * known match list and checks each match's raw-JSON event stage instead of
 * expressing the filter in SQL.
 */
function resolveMatchContextIds(matchContext: string): string[] {
  ensureInit();
  preLoadAllMatches();
  return matchesList
    .filter(m => matchPassesContext(getMatchStage(m.id), matchContext))
    .map(m => m.id);
}

async function getTeamRows() {
  if (!teamRowCache) {
    const rows = await db
      .select({ id: teamsTable.teamId, name: teamsTable.name, shortName: teamsTable.shortName })
      .from(teamsTable);
    teamRowCache = rows as any;
  }
  return teamRowCache!;
}

async function getVenueRows() {
  if (!venueRowCache) {
    const rows = await db.select({ id: venuesTable.venueId, name: venuesTable.name }).from(venuesTable);
    venueRowCache = rows as any;
  }
  return venueRowCache!;
}

/** Public wrapper: all team ids a franchise name maps to, including renames. */
export async function resolveTeamIdsFor(team: string): Promise<number[]> {
  return resolveTeamIds(team);
}

/** Public wrapper over the pacer/spinner id sets. */
export async function bowlerTypeIdSets(): Promise<{ pacerIds: number[]; spinnerIds: number[] }> {
  return getBowlerTypeIdSets();
}

async function resolveTeamIds(team: string): Promise<number[]> {
  const rows = await getTeamRows();
  return rows
    .filter(r => isMatchingTeam(r.name, team) || r.shortName === team || teamShort(r.shortName) === teamShort(team))
    .map(r => r.id);
}

async function resolveVenueIds(venue: string): Promise<number[]> {
  const rows = await getVenueRows();
  const wanted = normalizeVenueName(venue).toLowerCase();
  const exact = rows.filter(r => normalizeVenueName(r.name).toLowerCase() === wanted);
  if (exact.length > 0) return exact.map(r => r.id);
  // Safety net for a name the canonical rules don't cover on both sides.
  return rows.filter(r => r.name.toLowerCase().includes(wanted)).map(r => r.id);
}

/**
 * Pacer/Spinner player-id sets for the "Bowler Type" filter.
 *
 * players.bowling_style is never populated in this DB (every row is empty),
 * so classifying by a LIKE on that column silently matched nothing. Instead
 * this reuses getBowlerType() — the same bio/heuristic classifier the JSON
 * fallback path already relies on — over every player once, then the result
 * is filtered on by id like team/venue/match-context are.
 */
async function getBowlerTypeIdSets(): Promise<{ pacerIds: number[]; spinnerIds: number[] }> {
  if (bowlerTypeIdCache) return bowlerTypeIdCache;
  ensureInit();
  const rows = await db.select({ id: playersTable.playerId, name: playersTable.name }).from(playersTable);
  const pacerIds: number[] = [];
  const spinnerIds: number[] = [];
  // Unknown-type players are in neither list (Day 6); they used to be added to pacerIds by default.
  for (const r of rows as any[]) {
    const t = bowlerTypeForPlayer(r.id, r.name);
    if (t === "Spinner") spinnerIds.push(r.id);
    else if (t === "Pacer") pacerIds.push(r.id);
  }
  bowlerTypeIdCache = { pacerIds, spinnerIds };
  return bowlerTypeIdCache;
}

async function resolveRefs(filters: QueryFilters | FieldFilters): Promise<ResolvedRefs> {
  const refs: ResolvedRefs = {};
  if (isDimensionSet(filters.team, "All Teams")) {
    refs.teamIds = await resolveTeamIds(filters.team!);
  }
  if (isDimensionSet((filters as QueryFilters).opponent, "All Opponents")) {
    refs.opponentIds = await resolveTeamIds((filters as QueryFilters).opponent!);
  }
  if (isDimensionSet(filters.venue, "All Venues") && filters.venue !== "Venue") {
    refs.venueIds = await resolveVenueIds(filters.venue!);
  }
  if (isDimensionSet((filters as QueryFilters).matchContext, "All Matches")) {
    refs.matchIds = resolveMatchContextIds((filters as QueryFilters).matchContext!);
  }
  if (filters.bowlerType && filters.bowlerType !== "All Bowlers") {
    const { pacerIds, spinnerIds } = await getBowlerTypeIdSets();
    refs.bowlerTypeIds = filters.bowlerType.toLowerCase().includes("spin") ? spinnerIds : pacerIds;
  }
  return refs;
}

function buildWhereClauseSql(filters: QueryFilters | FieldFilters, isBowler = false, refs: ResolvedRefs = {}): SQL {
  const conditions: SQL[] = [sql`1 = 1`];

  if (isDimensionSet(filters.season, "All Seasons")) {
    const wanted = String(filters.season).trim();
    // `season_id` carries Cricsheet's label ("2007/08"); the UI sends the
    // calendar year, which only the match date can be matched against.
    conditions.push(isPlainSeasonYear(wanted)
      ? sql`(m.season_id = ${wanted} OR substr(m.date, 1, 4) = ${wanted})`
      : sql`m.season_id = ${wanted}`);
  }

  if (isDimensionSet(filters.team, "All Teams")) {
    const column = isBowler ? sql`i.bowling_team_id` : sql`i.batting_team_id`;
    conditions.push(inIdList(column, refs.teamIds));
  }

  if (isDimensionSet(filters.opponent, "All Opponents")) {
    const column = isBowler ? sql`i.batting_team_id` : sql`i.bowling_team_id`;
    conditions.push(inIdList(column, refs.opponentIds));
  }

  if (isDimensionSet(filters.venue, "All Venues") && filters.venue !== "Venue") {
    conditions.push(inIdList(sql`m.venue_id`, refs.venueIds));
  }

  if (filters.phase && filters.phase !== "All Phases" && filters.phase !== "Phase") {
    const p = filters.phase.toLowerCase();
    if (p.includes("powerplay") || p.includes("pp") || p.includes("0-6")) {
      conditions.push(sql`d.over_num < 6`);
    } else if (p.includes("middle") || p.includes("7-15")) {
      conditions.push(sql`d.over_num >= 6 AND d.over_num < 15`);
    } else if (p.includes("death") || p.includes("16-20")) {
      conditions.push(sql`d.over_num >= 15`);
    }
  }

  if ((filters as QueryFilters).overRange && (filters as QueryFilters).overRange !== "All Overs" && (filters as QueryFilters).overRange !== "All") {
    const match = (filters as QueryFilters).overRange!.match(/^(\d+)-(\d+)$/);
    if (match) {
      const lo = parseInt(match[1]) - 1;
      const hi = parseInt(match[2]) - 1;
      conditions.push(sql`d.over_num >= ${lo}`);
      conditions.push(sql`d.over_num <= ${hi}`);
    }
  }

  if (filters.bowlerType && filters.bowlerType !== "All Bowlers") {
    // players.bowling_style is never populated — see getBowlerTypeIdSets().
    conditions.push(inIdList(sql`p_bowl.player_id`, refs.bowlerTypeIds));
  }

  if (filters.deliveryType && filters.deliveryType !== "Delivery Type" && filters.deliveryType !== "Delivery" && filters.deliveryType !== "All Deliveries") {
    conditions.push(sql`LOWER(d.delivery_type) LIKE LOWER(${`%${filters.deliveryType}%`})`);
  }

  if ((filters as QueryFilters).pressure && (filters as QueryFilters).pressure !== "Standard" && (filters as QueryFilters).pressure !== "Pressure" && (filters as QueryFilters).pressure !== "All") {
    const pr = (filters as QueryFilters).pressure!.toLowerCase();
    if (pr.includes("clutch")) {
      conditions.push(sql`d.pressure_state = 'Clutch'`);
    } else if (pr.includes("playoff")) {
      conditions.push(sql`d.pressure_state = 'Playoff'`);
    } else if (pr.includes("high")) {
      conditions.push(sql`d.pressure_state = 'High'`);
    }
  }

  if ((filters as QueryFilters).fieldingPosition && (filters as QueryFilters).fieldingPosition !== "Scoring Area" && (filters as QueryFilters).fieldingPosition !== "All Positions" && (filters as QueryFilters).fieldingPosition !== "All Areas") {
    conditions.push(sql`LOWER(d.scoring_area) LIKE LOWER(${`%${(filters as QueryFilters).fieldingPosition}%`})`);
  }

  const representation = normalizeRepresentation((filters as QueryFilters).representation);
  if (representation && representation !== "overall") {
    const playerId = isBowler ? sql`p_bowl.player_id` : sql`p_bat.player_id`;
    const teamId = isBowler ? sql`bl.team_id` : sql`bt.team_id`;
    if (representation === "current-squad-career") {
      conditions.push(sql`EXISTS (SELECT 1 FROM current_squad cs WHERE cs.player_id = ${playerId})`);
    } else if (representation === "current-squad-for-franchise") {
      conditions.push(sql`EXISTS (SELECT 1 FROM current_squad cs WHERE cs.player_id = ${playerId} AND cs.team_id = ${teamId})`);
    } else if (representation === "franchise-legacy") {
      conditions.push(sql`EXISTS (SELECT 1 FROM player_team_history pth WHERE pth.player_id = ${playerId} AND pth.team_id = ${teamId})`);
    }
  }

  if (filters.innings && filters.innings !== "All Innings" && filters.innings !== "Innings") {
    if (filters.innings.toLowerCase().includes("1st")) {
      conditions.push(sql`i.innings_number = 1`);
    } else if (filters.innings.toLowerCase().includes("2nd")) {
      conditions.push(sql`i.innings_number = 2`);
    }
  }

  if (isDimensionSet((filters as QueryFilters).matchContext, "All Matches")) {
    // m.match_type is always "T20" (the format, not the stage) — see
    // getMatchStage(). The real League/Playoffs/Final filter is resolved to
    // an explicit match id list by resolveRefs() before we get here.
    conditions.push(inIdList(sql`m.match_id`, refs.matchIds));
  }

  if ((filters as QueryFilters).batter) {
    conditions.push(sql`LOWER(p_bat.name) LIKE LOWER(${`%${(filters as QueryFilters).batter}%`})`);
  }

  if ((filters as QueryFilters).bowler) {
    conditions.push(sql`LOWER(p_bowl.name) LIKE LOWER(${`%${(filters as QueryFilters).bowler}%`})`);
  }

  return sql.join(conditions, sql` AND `);
}

async function aggregateQueryStatsSql(filters: QueryFilters) {
  const refs = await resolveRefs(filters);
  const batterWhere = buildWhereClauseSql(filters, false, refs);

  const batterQuery = sql`
    WITH match_scores AS (
      SELECT
        d.batter_id,
        d.match_id,
        sum(d.batter_runs) as match_runs
      FROM deliveries d
      JOIN matches m ON d.match_id = m.match_id
      JOIN innings i ON d.innings_id = i.innings_id
      JOIN teams bt ON i.batting_team_id = bt.team_id
      JOIN teams bl ON i.bowling_team_id = bl.team_id
      LEFT JOIN venues v ON m.venue_id = v.venue_id
      LEFT JOIN players p_bat ON d.batter_id = p_bat.player_id
      LEFT JOIN players p_bowl ON d.bowler_id = p_bowl.player_id
      WHERE ${batterWhere}
      GROUP BY d.batter_id, d.match_id
    ),
    overall_stats AS (
      SELECT
        d.batter_id,
        COALESCE(p_bat.name, CONCAT('Batter ', d.batter_id)) as player,
        p_bat.country as country,
        count(distinct d.match_id) as matches,
        count(distinct d.innings_id) as innings,
        sum(d.batter_runs) as runs,
        count(case when d.is_wide = false then 1 end) as balls,
        count(case when d.batter_runs = 4 then 1 end) as fours,
        count(case when d.batter_runs = 6 then 1 end) as sixes,
        count(case when dis.dismissal_id IS NOT NULL AND dis.player_out_id = d.batter_id then 1 end) as dismissals,
        sum(case when d.over_num < 6 then d.batter_runs else 0 end) as pp_runs,
        count(case when d.over_num < 6 and d.is_wide = false then 1 end) as pp_balls,
        sum(case when d.over_num >= 6 and d.over_num < 15 then d.batter_runs else 0 end) as mid_runs,
        count(case when d.over_num >= 6 and d.over_num < 15 and d.is_wide = false then 1 end) as mid_balls,
        sum(case when d.over_num >= 15 then d.batter_runs else 0 end) as death_runs,
        count(case when d.over_num >= 15 and d.is_wide = false then 1 end) as death_balls
      FROM deliveries d
      JOIN players p_bat ON d.batter_id = p_bat.player_id
      JOIN matches m ON d.match_id = m.match_id
      JOIN innings i ON d.innings_id = i.innings_id
      JOIN teams bt ON i.batting_team_id = bt.team_id
      JOIN teams bl ON i.bowling_team_id = bl.team_id
      LEFT JOIN venues v ON m.venue_id = v.venue_id
      LEFT JOIN dismissals dis ON d.delivery_id = dis.delivery_id
      LEFT JOIN players p_bowl ON d.bowler_id = p_bowl.player_id
      WHERE ${batterWhere}
      GROUP BY d.batter_id, COALESCE(p_bat.name, CONCAT('Batter ', d.batter_id)), p_bat.country
    )
    SELECT
      o.*,
      m.highest,
      m.fifties,
      m.hundreds
    FROM overall_stats o
    LEFT JOIN (
      SELECT
        batter_id,
        max(match_runs) as highest,
        count(case when match_runs >= 50 and match_runs < 100 then 1 end) as fifties,
        count(case when match_runs >= 100 then 1 end) as hundreds
      FROM match_scores
      GROUP BY batter_id
    ) m ON o.batter_id = m.batter_id
  `;

  const batterDelivQuery = sql`
    SELECT
      d.batter_id,
      d.delivery_type as type,
      sum(d.batter_runs) as runs,
      count(case when d.is_wide = false then 1 end) as balls,
      count(case when dis.dismissal_id IS NOT NULL AND dis.player_out_id = d.batter_id then 1 end) as dismissals
    FROM deliveries d
    JOIN matches m ON d.match_id = m.match_id
    JOIN innings i ON d.innings_id = i.innings_id
    JOIN teams bt ON i.batting_team_id = bt.team_id
    JOIN teams bl ON i.bowling_team_id = bl.team_id
    LEFT JOIN venues v ON m.venue_id = v.venue_id
    LEFT JOIN dismissals dis ON d.delivery_id = dis.delivery_id
    LEFT JOIN players p_bat ON d.batter_id = p_bat.player_id
    LEFT JOIN players p_bowl ON d.bowler_id = p_bowl.player_id
    WHERE ${batterWhere} AND d.delivery_type IS NOT NULL
    GROUP BY d.batter_id, d.delivery_type
  `;

  const batterZoneQuery = sql`
    SELECT
      d.batter_id,
      d.scoring_area as zone,
      sum(d.batter_runs) as runs,
      count(case when d.is_wide = false then 1 end) as balls,
      count(case when d.batter_runs = 4 or d.batter_runs = 6 then 1 end) as boundaries
    FROM deliveries d
    JOIN matches m ON d.match_id = m.match_id
    JOIN innings i ON d.innings_id = i.innings_id
    JOIN teams bt ON i.batting_team_id = bt.team_id
    JOIN teams bl ON i.bowling_team_id = bl.team_id
    LEFT JOIN venues v ON m.venue_id = v.venue_id
    LEFT JOIN players p_bat ON d.batter_id = p_bat.player_id
    LEFT JOIN players p_bowl ON d.bowler_id = p_bowl.player_id
    WHERE ${batterWhere} AND d.scoring_area IS NOT NULL
    GROUP BY d.batter_id, d.scoring_area
  `;

  const [batterRes, batterDelivRes, batterZoneRes] = await Promise.all([
    db.execute(batterQuery),
    db.execute(batterDelivQuery),
    db.execute(batterZoneQuery)
  ]);

  const delivMap = new Map<number, any[]>();
  for (const row of batterDelivRes.rows) {
    const bId = Number(row.batter_id);
    const list = delivMap.get(bId) || [];
    const runs = Number(row.runs || 0);
    const balls = Number(row.balls || 0);
    const dismissals = Number(row.dismissals || 0);
    list.push({
      // No fallback label: the queries above already exclude NULLs, and
      // defaulting an undescribed ball to a real category would file it
      // under a delivery nobody bowled.
      type: row.type,
      runs,
      balls,
      dismissals,
      sr: balls > 0 ? Math.round((runs / balls) * 1000) / 10 : 0,
      dotPct: balls > 0 ? Math.round(((balls - (runs > 0 ? runs : 0)) / balls) * 100) : 0
    });
    delivMap.set(bId, list);
  }

  const zoneMap = new Map<number, any[]>();
  for (const row of batterZoneRes.rows) {
    const bId = Number(row.batter_id);
    const list = zoneMap.get(bId) || [];
    const runs = Number(row.runs || 0);
    const balls = Number(row.balls || 0);
    const boundaries = Number(row.boundaries || 0);
    list.push({
      // No fallback label: the queries above already exclude NULLs, and
      // defaulting an undescribed ball to a real category would file it
      // under a delivery nobody bowled.
      zone: row.zone,
      runs,
      balls,
      boundaries,
      sr: balls > 0 ? Math.round((runs / balls) * 1000) / 10 : 0,
      // Boundaries per 100 balls in the zone. (Was boundaries ÷ runs: a count over runs, not a percentage.)
      boundaryPct: balls > 0 ? Math.round((boundaries / balls) * 100) : 0
    });
    zoneMap.set(bId, list);
  }

  const compiledBatters = batterRes.rows.map((row: any) => {
    const player = row.player || "";

    const runs = Number(row.runs || 0);
    const balls = Number(row.balls || 0);
    const dismissals = Number(row.dismissals || 0);
    const avg = dismissals > 0 ? Math.round((runs / dismissals) * 10) / 10 : runs;
    const sr = balls > 0 ? Math.round((runs / balls) * 1000) / 10 : 0;

    const ppRuns = Number(row.pp_runs || 0);
    const ppBalls = Number(row.pp_balls || 0);
    const ppSR = ppBalls > 0 ? Math.round((ppRuns / ppBalls) * 1000) / 10 : 0;

    const midRuns = Number(row.mid_runs || 0);
    const midBalls = Number(row.mid_balls || 0);
    const midSR = midBalls > 0 ? Math.round((midRuns / midBalls) * 1000) / 10 : 0;

    const deathRuns = Number(row.death_runs || 0);
    const deathBalls = Number(row.death_balls || 0);
    const deathSR = deathBalls > 0 ? Math.round((deathRuns / deathBalls) * 1000) / 10 : 0;

    const fours = Number(row.fours || 0);
    const sixes = Number(row.sixes || 0);
    const boundaryPct = boundaryRunPct(fours, sixes, runs);

    const bId = Number(row.batter_id);

    return {
      player,
      matches: Number(row.matches || 0),
      innings: Number(row.innings || 0),
      runs,
      balls,
      avg,
      sr,
      fours,
      sixes,
      fifties: Number(row.fifties || 0),
      hundreds: Number(row.hundreds || 0),
      highest: Number(row.highest || 0),
      boundaryPct,
      boundaryRunPct: boundaryPct,
      isIndian: isIndianPlayer(player, row.country as string | null),
      ppRuns,
      ppBalls,
      ppSR,
      middleRuns: midRuns,
      middleBalls: midBalls,
      midSR,
      deathRuns,
      deathBalls,
      deathSR,
      deliveryBreakdown: delivMap.get(bId) || [],
      scoringZones: zoneMap.get(bId) || []
    };
  }).filter((b: any) => {
    if (wantsNationalityFilter(filters.nationality)) {
      return b.isIndian === nationalityWantsIndian(filters.nationality!);
    }
    return true;
  });

  // Bowlers SQL Queries
  const bowlerWhere = buildWhereClauseSql(filters, true, refs);

  const bowlerQuery = sql`
    SELECT
      d.bowler_id,
      p_bowl.name as player,
      p_bowl.country as country,
      p_bowl.bowling_style as bowler_type,
      count(distinct d.match_id) as matches,
      count(distinct d.innings_id) as innings,
      sum((d.batter_runs + CASE WHEN d.is_wide = 1 THEN d.extra_runs - 5 * d.is_penalty WHEN d.is_noball = 1 THEN (CASE WHEN d.is_bye = 1 OR d.is_legbye = 1 THEN 1 ELSE d.extra_runs - 5 * d.is_penalty END) ELSE 0 END)) as conceded_runs,
      count(case when d.is_wide = false and d.is_noball = false then 1 end) as balls,
      count(case when d.total_runs = 0 and d.is_wide = false and d.is_noball = false then 1 end) as dots,
      count(case when dis.kind NOT IN ('run out', 'retired hurt', 'retired out', 'obstructing the field') then 1 end) as wickets,
      sum(case when d.over_num < 6 then (d.batter_runs + CASE WHEN d.is_wide = 1 THEN d.extra_runs - 5 * d.is_penalty WHEN d.is_noball = 1 THEN (CASE WHEN d.is_bye = 1 OR d.is_legbye = 1 THEN 1 ELSE d.extra_runs - 5 * d.is_penalty END) ELSE 0 END) else 0 end) as pp_runs,
      count(case when d.over_num < 6 and d.is_wide = false and d.is_noball = false then 1 end) as pp_balls,
      count(case when d.over_num < 6 and dis.kind NOT IN ('run out', 'retired hurt', 'retired out', 'obstructing the field') then 1 end) as pp_wickets,
      sum(case when d.over_num >= 6 and d.over_num < 15 then (d.batter_runs + CASE WHEN d.is_wide = 1 THEN d.extra_runs - 5 * d.is_penalty WHEN d.is_noball = 1 THEN (CASE WHEN d.is_bye = 1 OR d.is_legbye = 1 THEN 1 ELSE d.extra_runs - 5 * d.is_penalty END) ELSE 0 END) else 0 end) as mid_runs,
      count(case when d.over_num >= 6 and d.over_num < 15 and d.is_wide = false and d.is_noball = false then 1 end) as mid_balls,
      count(case when d.over_num >= 6 and d.over_num < 15 and dis.kind NOT IN ('run out', 'retired hurt', 'retired out', 'obstructing the field') then 1 end) as mid_wickets,
      sum(case when d.over_num >= 15 then (d.batter_runs + CASE WHEN d.is_wide = 1 THEN d.extra_runs - 5 * d.is_penalty WHEN d.is_noball = 1 THEN (CASE WHEN d.is_bye = 1 OR d.is_legbye = 1 THEN 1 ELSE d.extra_runs - 5 * d.is_penalty END) ELSE 0 END) else 0 end) as death_runs,
      count(case when d.over_num >= 15 and d.is_wide = false and d.is_noball = false then 1 end) as death_balls,
      count(case when d.over_num >= 15 and dis.kind NOT IN ('run out', 'retired hurt', 'retired out', 'obstructing the field') then 1 end) as death_wickets,
      count(case when d.is_boundary = true and d.is_wide = false and d.is_noball = false then 1 end) as boundaries
    FROM deliveries d
    JOIN players p_bowl ON d.bowler_id = p_bowl.player_id
    JOIN matches m ON d.match_id = m.match_id
    JOIN innings i ON d.innings_id = i.innings_id
    JOIN teams bt ON i.batting_team_id = bt.team_id
    JOIN teams bl ON i.bowling_team_id = bl.team_id
    LEFT JOIN venues v ON m.venue_id = v.venue_id
    LEFT JOIN dismissals dis ON d.delivery_id = dis.delivery_id
    LEFT JOIN players p_bat ON d.batter_id = p_bat.player_id
    WHERE ${bowlerWhere}
    GROUP BY d.bowler_id, p_bowl.name, p_bowl.country, p_bowl.bowling_style
  `;

  const bowlerDelivQuery = sql`
    SELECT
      d.bowler_id,
      d.delivery_type as type,
      sum((d.batter_runs + CASE WHEN d.is_wide = 1 THEN d.extra_runs - 5 * d.is_penalty WHEN d.is_noball = 1 THEN (CASE WHEN d.is_bye = 1 OR d.is_legbye = 1 THEN 1 ELSE d.extra_runs - 5 * d.is_penalty END) ELSE 0 END)) as runs,
      count(case when d.is_wide = false and d.is_noball = false then 1 end) as balls,
      count(case when dis.kind NOT IN ('run out', 'retired hurt', 'retired out', 'obstructing the field') then 1 end) as wickets
    FROM deliveries d
    JOIN matches m ON d.match_id = m.match_id
    JOIN innings i ON d.innings_id = i.innings_id
    JOIN teams bt ON i.batting_team_id = bt.team_id
    JOIN teams bl ON i.bowling_team_id = bl.team_id
    LEFT JOIN venues v ON m.venue_id = v.venue_id
    LEFT JOIN dismissals dis ON d.delivery_id = dis.delivery_id
    LEFT JOIN players p_bowl ON d.bowler_id = p_bowl.player_id
    LEFT JOIN players p_bat ON d.batter_id = p_bat.player_id
    WHERE ${bowlerWhere} AND d.delivery_type IS NOT NULL
    GROUP BY d.bowler_id, d.delivery_type
  `;

  const bowlerHandQuery = sql`
    SELECT
      d.bowler_id,
      p_bat.batting_style,
      sum((d.batter_runs + CASE WHEN d.is_wide = 1 THEN d.extra_runs - 5 * d.is_penalty WHEN d.is_noball = 1 THEN (CASE WHEN d.is_bye = 1 OR d.is_legbye = 1 THEN 1 ELSE d.extra_runs - 5 * d.is_penalty END) ELSE 0 END)) as runs,
      count(case when d.is_wide = false and d.is_noball = false then 1 end) as balls,
      count(case when dis.kind NOT IN ('run out', 'retired hurt', 'retired out', 'obstructing the field') then 1 end) as wickets
    FROM deliveries d
    JOIN players p_bat ON d.batter_id = p_bat.player_id
    JOIN matches m ON d.match_id = m.match_id
    JOIN innings i ON d.innings_id = i.innings_id
    JOIN teams bt ON i.batting_team_id = bt.team_id
    JOIN teams bl ON i.bowling_team_id = bl.team_id
    LEFT JOIN venues v ON m.venue_id = v.venue_id
    LEFT JOIN dismissals dis ON d.delivery_id = dis.delivery_id
    LEFT JOIN players p_bowl ON d.bowler_id = p_bowl.player_id
    WHERE ${bowlerWhere}
    GROUP BY d.bowler_id, p_bat.batting_style
  `;

  const bowlerBestQuery = sql`
    WITH bowler_match_stats AS (
      SELECT
        d.bowler_id,
        d.match_id,
        sum((d.batter_runs + CASE WHEN d.is_wide = 1 THEN d.extra_runs - 5 * d.is_penalty WHEN d.is_noball = 1 THEN (CASE WHEN d.is_bye = 1 OR d.is_legbye = 1 THEN 1 ELSE d.extra_runs - 5 * d.is_penalty END) ELSE 0 END)) as conceded_runs,
        count(case when dis.kind NOT IN ('run out', 'retired hurt', 'retired out', 'obstructing the field') then 1 end) as wickets
      FROM deliveries d
      JOIN matches m ON d.match_id = m.match_id
      JOIN innings i ON d.innings_id = i.innings_id
      JOIN teams bt ON i.batting_team_id = bt.team_id
      JOIN teams bl ON i.bowling_team_id = bl.team_id
      LEFT JOIN venues v ON m.venue_id = v.venue_id
      LEFT JOIN dismissals dis ON d.delivery_id = dis.delivery_id
      LEFT JOIN players p_bowl ON d.bowler_id = p_bowl.player_id
      LEFT JOIN players p_bat ON d.batter_id = p_bat.player_id
      WHERE ${bowlerWhere}
      GROUP BY d.bowler_id, d.match_id
    ),
    ranked_performances AS (
      SELECT
        bowler_id,
        wickets,
        conceded_runs,
        ROW_NUMBER() OVER(PARTITION BY bowler_id ORDER BY wickets DESC, conceded_runs ASC) as rn
      FROM bowler_match_stats
    )
    SELECT bowler_id, wickets, conceded_runs FROM ranked_performances WHERE rn = 1
  `;

  // True Economy baseline, as defined in scripts/src/aggregate-ipl.ts and the JSON path above: the average,
  // over the matches a bowler bowled in (within the same filters), of each match's economy (all runs per six
  // legal balls, rounded to 2 dp). Previously a fixed 8.2 was used here, so the same metric differed by path.
  const bowlerBaselineQuery = sql`
    WITH bm AS (
      SELECT DISTINCT d.bowler_id, d.match_id
      FROM deliveries d
      JOIN players p_bowl ON d.bowler_id = p_bowl.player_id
      JOIN matches m ON d.match_id = m.match_id
      JOIN innings i ON d.innings_id = i.innings_id
      JOIN teams bt ON i.batting_team_id = bt.team_id
      JOIN teams bl ON i.bowling_team_id = bl.team_id
      LEFT JOIN venues v ON m.venue_id = v.venue_id
      LEFT JOIN dismissals dis ON d.delivery_id = dis.delivery_id
      LEFT JOIN players p_bat ON d.batter_id = p_bat.player_id
      WHERE ${bowlerWhere}
    ),
    mb AS (
      SELECT match_id, ROUND(SUM(total_runs) * 6.0 / NULLIF(SUM(CASE WHEN is_wide = 0 AND is_noball = 0 THEN 1 ELSE 0 END), 0), 2) AS econ
      FROM deliveries WHERE match_id IN (SELECT match_id FROM bm) GROUP BY match_id
    )
    SELECT bm.bowler_id, AVG(mb.econ) AS baseline FROM bm JOIN mb ON mb.match_id = bm.match_id
    WHERE mb.econ IS NOT NULL GROUP BY bm.bowler_id
  `;

  const [bowlerRes, bowlerDelivRes, bowlerHandRes, bowlerBestRes, bowlerBaselineRes] = await Promise.all([
    db.execute(bowlerQuery),
    db.execute(bowlerDelivQuery),
    db.execute(bowlerHandQuery),
    db.execute(bowlerBestQuery),
    db.execute(bowlerBaselineQuery)
  ]);
  const baselineMap = new Map<number, number>();
  for (const row of bowlerBaselineRes.rows) baselineMap.set(Number(row.bowler_id), Number(row.baseline));

  const bowlerDelivMap = new Map<number, any[]>();
  for (const row of bowlerDelivRes.rows) {
    const bId = Number(row.bowler_id);
    const list = bowlerDelivMap.get(bId) || [];
    const runs = Number(row.runs || 0);
    const balls = Number(row.balls || 0);
    const wickets = Number(row.wickets || 0);
    list.push({
      // No fallback label: the queries above already exclude NULLs, and
      // defaulting an undescribed ball to a real category would file it
      // under a delivery nobody bowled.
      type: row.type,
      runs,
      balls,
      wickets,
      econ: balls > 0 ? Math.round((runs / (balls / 6)) * 100) / 100 : 0,
      sr: wickets > 0 ? Math.round((balls / wickets) * 10) / 10 : 0
    });
    bowlerDelivMap.set(bId, list);
  }

  const bowlerLhbMap = new Map<number, any>();
  const bowlerRhbMap = new Map<number, any>();
  for (const row of bowlerHandRes.rows) {
    const bId = Number(row.bowler_id);
    const style = (row.batting_style || "").toLowerCase();
    const runs = Number(row.runs || 0);
    const balls = Number(row.balls || 0);
    const wickets = Number(row.wickets || 0);
    const record = {
      runs,
      balls,
      wickets,
      strikeRate: wickets > 0 ? Math.round((balls / wickets) * 10) / 10 : 0
    };
    // players.batting_style is empty on every row, so handedness is unknown here: unknown is not
    // "right-handed". Only a stated style is classified; otherwise the split is omitted below.
    if (style.includes("left")) {
      bowlerLhbMap.set(bId, record);
    } else if (style.includes("right")) {
      bowlerRhbMap.set(bId, record);
    }
  }

  const bestMap = new Map<number, string>();
  for (const row of bowlerBestRes.rows) {
    const bId = Number(row.bowler_id);
    const wkts = Number(row.wickets || 0);
    const runs = Number(row.conceded_runs || 0);
    bestMap.set(bId, `${wkts}/${runs}`);
  }

  const compiledBowlers = bowlerRes.rows.map((row: any) => {
    const concededRuns = Number(row.conceded_runs || 0);
    const balls = Number(row.balls || 0);
    const wickets = Number(row.wickets || 0);
    const dots = Number(row.dots || 0);
    const boundaries = Number(row.boundaries || 0);

    const econ = balls > 0 ? Math.round((concededRuns / (balls / 6)) * 100) / 100 : 0;
    const avg = wickets > 0 ? Math.round((concededRuns / wickets) * 10) / 10 : 0;
    const sr = wickets > 0 ? Math.round((balls / wickets) * 10) / 10 : 0;
    const dotPct = balls > 0 ? Math.round((dots / balls) * 100) : 0;
    const boundaryPct = balls > 0 ? Math.round((boundaries / balls) * 1000) / 10 : 0;
    const ballsPerBoundary = boundaries > 0 ? Math.round((balls / boundaries) * 10) / 10 : balls;

    const bId = Number(row.bowler_id);
    const baseline = baselineMap.get(bId);
    const trueEconomy = baseline === undefined || balls === 0 ? null : Math.round((econ - baseline) * 100) / 100;
    const player = row.player || "";

    return {
      player,
      team: filters.team && filters.team !== "All" ? filters.team : getPlayerLatestTeam(player),
      matches: Number(row.matches || 0),
      innings: Number(row.innings || 0),
      balls,
      wickets,
      econ,
      avg,
      sr,
      dotPct,
      ppWickets: Number(row.pp_wickets || 0),
      middleWickets: Number(row.mid_wickets || 0),
      deathWickets: Number(row.death_wickets || 0),
      isIndian: isIndianPlayer(player, row.country as string | null),
      deliveryBreakdown: bowlerDelivMap.get(bId) || [],
      boundaryPct,
      ballsPerBoundary,
      trueEconomy,
      // row.bowler_type comes from players.bowling_style, which is never
      // populated (see getBowlerTypeIdSets()) — classify by the same
      // per-player rule the filter itself uses instead.
      bowlerType: bowlerTypeForPlayer(bId, player),
      vsLhb: bowlerLhbMap.get(bId),
      vsRhb: bowlerRhbMap.get(bId),
      unmatchedBatterBalls: 0,
      best: bestMap.get(bId) || "0/0"
    };
  }).filter((b: any) => {
    if (wantsNationalityFilter(filters.nationality)) {
      return b.isIndian === nationalityWantsIndian(filters.nationality!);
    }
    return true;
  });

  return { batters: compiledBatters, bowlers: compiledBowlers };
}

async function aggregateFieldStatsSql(filters: FieldFilters) {
  const where = buildWhereClauseSql(filters as QueryFilters, false, await resolveRefs(filters));
  const query = sql`
    SELECT
      d.scoring_area as position,
      sum(d.batter_runs) as runs,
      count(case when d.is_wide = false then 1 end) as balls,
      count(case when d.is_boundary = true then 1 end) as boundaries,
      count(case when d.total_runs = 0 and d.is_wide = false and d.is_noball = false then 1 end) as dots,
      count(case when dis.dismissal_id IS NOT NULL then 1 end) as wickets
    FROM deliveries d
    JOIN matches m ON d.match_id = m.match_id
    JOIN innings i ON d.innings_id = i.innings_id
    JOIN teams bt ON i.batting_team_id = bt.team_id
    JOIN teams bl ON i.bowling_team_id = bl.team_id
    LEFT JOIN venues v ON m.venue_id = v.venue_id
    LEFT JOIN dismissals dis ON d.delivery_id = dis.delivery_id
    LEFT JOIN players p_bat ON d.batter_id = p_bat.player_id
    LEFT JOIN players p_bowl ON d.bowler_id = p_bowl.player_id
    WHERE ${where} AND d.scoring_area IS NOT NULL
    GROUP BY d.scoring_area
  `;
  const res = await db.execute(query);

  const classifyZone = (stopField: string | null): { position: string; zone: string } | null => {
    if (!stopField) return null;
    const t = stopField.toLowerCase();
    if (t.includes("keeper") || t.includes("wicket-keeper"))      return { position: "Wicket-keeper", zone: "keeper" };
    if (t.includes("slip") || t.includes("leg gully"))            return { position: stopField.split(",").pop()?.trim() || stopField, zone: "slips" };
    if (t.includes("gully"))                                       return { position: "Gully",          zone: "slips" };
    if (t.includes("point") || t.includes("cover") || t.includes("extra cover"))
      return { position: stopField.split(",").pop()?.trim() || stopField, zone: t.includes("deep") ? "off-deep" : "off" };
    if (t.includes("mid-wicket") || t.includes("mid wicket"))
      return { position: stopField.split(",").pop()?.trim() || stopField, zone: t.includes("deep") ? "leg-deep" : "leg" };
    if (t.includes("mid-on") || t.includes("mid off"))
      return { position: stopField.split(",").pop()?.trim() || stopField, zone: t.includes("deep") ? "leg-deep" : "leg" };
    if (t.includes("square leg") || t.includes("fine leg") || t.includes("deep square") || t.includes("deep fine"))
      return { position: stopField.split(",").pop()?.trim() || stopField, zone: "leg-deep" };
    if (t.includes("long on"))   return { position: "Long-on",   zone: "leg-deep" };
    if (t.includes("long off"))  return { position: "Long-off",  zone: "off-deep" };
    if (t.includes("third man")) return { position: "Third Man", zone: "boundary" };
    return { position: stopField.split(",").pop()?.trim() || stopField, zone: "off" };
  };

  const fieldAcc = new Map<string, any>();
  for (const row of res.rows) {
    const position = row.position as string;
    const found = classifyZone(position);
    if (!found) continue;

    const key = found.position;
    const runs = Number(row.runs || 0);
    const balls = Number(row.balls || 0);
    const boundaries = Number(row.boundaries || 0);
    const wickets = Number(row.wickets || 0);
    const dots = Number(row.dots || 0);

    let rec = fieldAcc.get(key);
    if (!rec) {
      rec = { position: key, zone: found.zone, balls: 0, runs: 0, wickets: 0, boundaries: 0, dotBalls: 0 };
      fieldAcc.set(key, rec);
    }
    rec.balls += balls;
    rec.runs += runs;
    rec.boundaries += boundaries;
    rec.wickets += wickets;
    rec.dotBalls += dots;
  }
  return Array.from(fieldAcc.values()).sort((a, b) => b.runs - a.runs);
}

async function aggregateMatchupStatsSql(batter: string, bowler: string, filters: QueryFilters) {
  const baseFilters = { ...filters, batter, bowler };
  const where = buildWhereClauseSql(baseFilters, false, await resolveRefs(baseFilters));
  
  const hasExtraFilters = Object.keys(filters).some(
    k => k !== 'batter' && k !== 'bowler' && filters[k as keyof QueryFilters]
  );

  let overallStats = null;

  if (!hasExtraFilters) {
    // 1. Fetch from materialized view (physical table) when no extra filters
    const res = await db.select().from(batterBowlerMatchupStatsTable).where(
      and(
        eq(batterBowlerMatchupStatsTable.batterId, sql`(SELECT player_id FROM players WHERE player_name = ${batter} LIMIT 1)`),
        eq(batterBowlerMatchupStatsTable.bowlerId, sql`(SELECT player_id FROM players WHERE player_name = ${bowler} LIMIT 1)`)
      )
    ).limit(1);

    if (res.length > 0) {
      overallStats = res[0];
    }
  }

  const queryOverall = sql`
    SELECT
      sum(d.batter_runs) as runs,
      count(case when d.is_wide = false then 1 end) as balls,
      count(case when dis.dismissal_id IS NOT NULL AND dis.player_out_id = d.batter_id AND dis.kind NOT IN ('run out', 'retired hurt', 'retired out', 'obstructing the field') then 1 end) as dismissals,
      count(case when d.total_runs = 0 and d.is_wide = false and d.is_noball = false then 1 end) as dots,
      count(case when d.batter_runs = 4 and d.is_boundary = true then 1 end) as fours,
      count(case when d.batter_runs = 6 and d.is_boundary = true then 1 end) as sixes
    FROM deliveries d
    JOIN players p_bat ON d.batter_id = p_bat.player_id
    JOIN players p_bowl ON d.bowler_id = p_bowl.player_id
    JOIN matches m ON d.match_id = m.match_id
    JOIN innings i ON d.innings_id = i.innings_id
    JOIN teams bt ON i.batting_team_id = bt.team_id
    JOIN teams bl ON i.bowling_team_id = bl.team_id
    LEFT JOIN venues v ON m.venue_id = v.venue_id
    LEFT JOIN dismissals dis ON d.delivery_id = dis.delivery_id
    WHERE ${where}
    HAVING count(case when d.is_wide = false then 1 end) >= 6
  `;

  const queryPhase = sql`
    SELECT
      case when d.over_num < 6 then 'powerplay' when d.over_num >= 15 then 'death' else 'middle' end as phase,
      sum(d.batter_runs) as runs,
      count(case when d.is_wide = false then 1 end) as balls,
      count(case when dis.dismissal_id IS NOT NULL AND dis.player_out_id = d.batter_id then 1 end) as wickets
    FROM deliveries d
    JOIN players p_bat ON d.batter_id = p_bat.player_id
    JOIN players p_bowl ON d.bowler_id = p_bowl.player_id
    JOIN matches m ON d.match_id = m.match_id
    JOIN innings i ON d.innings_id = i.innings_id
    JOIN teams bt ON i.batting_team_id = bt.team_id
    JOIN teams bl ON i.bowling_team_id = bl.team_id
    LEFT JOIN venues v ON m.venue_id = v.venue_id
    LEFT JOIN dismissals dis ON d.delivery_id = dis.delivery_id
    WHERE ${where}
    GROUP BY case when d.over_num < 6 then 'powerplay' when d.over_num >= 15 then 'death' else 'middle' end
  `;

  const queryDeliv = sql`
    SELECT
      d.delivery_type as type,
      sum(d.batter_runs) as runs,
      count(case when d.is_wide = false then 1 end) as balls,
      count(case when dis.dismissal_id IS NOT NULL AND dis.player_out_id = d.batter_id then 1 end) as dismissals,
      count(case when d.total_runs = 0 and d.is_wide = false and d.is_noball = false then 1 end) as dots
    FROM deliveries d
    JOIN players p_bat ON d.batter_id = p_bat.player_id
    JOIN players p_bowl ON d.bowler_id = p_bowl.player_id
    JOIN matches m ON d.match_id = m.match_id
    JOIN innings i ON d.innings_id = i.innings_id
    JOIN teams bt ON i.batting_team_id = bt.team_id
    JOIN teams bl ON i.bowling_team_id = bl.team_id
    LEFT JOIN venues v ON m.venue_id = v.venue_id
    LEFT JOIN dismissals dis ON d.delivery_id = dis.delivery_id
    WHERE ${where} AND d.delivery_type IS NOT NULL
    GROUP BY d.delivery_type
  `;

  const queryZone = sql`
    SELECT
      d.scoring_area as zone,
      sum(d.batter_runs) as runs,
      count(case when d.is_wide = false then 1 end) as balls,
      count(case when d.batter_runs = 4 or d.batter_runs = 6 then 1 end) as boundaries
    FROM deliveries d
    JOIN players p_bat ON d.batter_id = p_bat.player_id
    JOIN players p_bowl ON d.bowler_id = p_bowl.player_id
    JOIN matches m ON d.match_id = m.match_id
    JOIN innings i ON d.innings_id = i.innings_id
    JOIN teams bt ON i.batting_team_id = bt.team_id
    JOIN teams bl ON i.bowling_team_id = bl.team_id
    LEFT JOIN venues v ON m.venue_id = v.venue_id
    WHERE ${where} AND d.scoring_area IS NOT NULL
    GROUP BY d.scoring_area
  `;

  // How many balls of this matchup the commentary described at all. The
  // breakdowns above cover only these; the headline runs and balls cover every
  // one. Reporting the gap is what stops a thin table reading as the whole
  // contest.
  const queryDetail = sql`
    SELECT
      count(case when d.is_wide = false then 1 end) as total,
      count(case when d.is_wide = false and (d.delivery_type IS NOT NULL OR d.scoring_area IS NOT NULL) then 1 end) as described
    FROM deliveries d
    JOIN players p_bat ON d.batter_id = p_bat.player_id
    JOIN players p_bowl ON d.bowler_id = p_bowl.player_id
    JOIN matches m ON d.match_id = m.match_id
    JOIN innings i ON d.innings_id = i.innings_id
    JOIN teams bt ON i.batting_team_id = bt.team_id
    JOIN teams bl ON i.bowling_team_id = bl.team_id
    LEFT JOIN venues v ON m.venue_id = v.venue_id
    WHERE ${where}
  `;

  const queryHistory = sql`
    SELECT
      d.match_id,
      m.season_id as season,
      v.name as venue,
      sum(d.batter_runs) as runs,
      count(case when d.is_wide = false then 1 end) as balls,
      count(case when dis.dismissal_id IS NOT NULL AND dis.player_out_id = d.batter_id then 1 end) > 0 as dismissed
    FROM deliveries d
    JOIN players p_bat ON d.batter_id = p_bat.player_id
    JOIN players p_bowl ON d.bowler_id = p_bowl.player_id
    JOIN matches m ON d.match_id = m.match_id
    JOIN innings i ON d.innings_id = i.innings_id
    JOIN teams bt ON i.batting_team_id = bt.team_id
    JOIN teams bl ON i.bowling_team_id = bl.team_id
    LEFT JOIN venues v ON m.venue_id = v.venue_id
    LEFT JOIN dismissals dis ON d.delivery_id = dis.delivery_id
    WHERE ${where}
    GROUP BY d.match_id, m.season_id, v.name
  `;

  const [overallRes, phaseRes, delivRes, zoneRes, historyRes, detailRes] = await Promise.all([
    db.execute(queryOverall),
    db.execute(queryPhase),
    db.execute(queryDeliv),
    db.execute(queryZone),
    db.execute(queryHistory),
    db.execute(queryDetail)
  ]);

  const detailRow: any = detailRes.rows[0] || {};
  const detailTotal = Number(detailRow.total || 0);
  const detailDescribed = Number(detailRow.described || 0);
  const detail = {
    describedBalls: detailDescribed,
    totalBalls: detailTotal,
    coveragePct: detailTotal > 0 ? Math.round((detailDescribed / detailTotal) * 100) : 0,
  };

  const overall = overallRes.rows[0] || {};
  let runs = Number(overall.runs || 0);
  let balls = Number(overall.balls || 0);
  let dismissals = Number(overall.dismissals || 0);
  let dots = Number(overall.dots || 0);
  let fours = Number(overall.fours || 0);
  let sixes = Number(overall.sixes || 0);

  if (overallStats) {
    runs = overallStats.runs;
    balls = overallStats.balls;
    dismissals = overallStats.dismissals;
    fours = overallStats.fours;
    sixes = overallStats.sixes;
  }

  // Ensure minimum sample size of 6 balls (unless fallback to JSON)
  if (balls < 6 && !overallStats) {
    return {
      batter, bowler, runs: 0, balls: 0, dismissals: 0,
      sr: 0, dotPct: 0, boundaryPct: 0, dominanceIndex: 0, fours: 0, sixes: 0,
      battingHand: getBattingHand(batter),
      bowlerType: getBowlerType(bowler),
      phaseSplit: {
        powerplay: { runs: 0, balls: 0, wkts: 0, sr: 0 },
        middle: { runs: 0, balls: 0, wkts: 0, sr: 0 },
        death: { runs: 0, balls: 0, wkts: 0, sr: 0 }
      },
      deliveries: [],
      scoringZones: [],
      matchHistory: [],
      detail
    };
  }

  const phaseSplit: any = {
    powerplay: { runs: 0, balls: 0, wkts: 0, sr: 0 },
    middle: { runs: 0, balls: 0, wkts: 0, sr: 0 },
    death: { runs: 0, balls: 0, wkts: 0, sr: 0 }
  };
  for (const row of phaseRes.rows) {
    const ph = row.phase as string;
    if (phaseSplit[ph]) {
      const r = Number(row.runs || 0);
      const b = Number(row.balls || 0);
      phaseSplit[ph] = {
        runs: r,
        balls: b,
        wkts: Number(row.wickets || 0),
        sr: b > 0 ? Math.round((r / b) * 1000) / 10 : 0
      };
    }
  }

  const deliveriesList = delivRes.rows.map((row: any) => {
    const r = Number(row.runs || 0);
    const b = Number(row.balls || 0);
    const dt = Number(row.dots || 0);
    return {
      // No fallback label: the queries above already exclude NULLs, and
      // defaulting an undescribed ball to a real category would file it
      // under a delivery nobody bowled.
      type: row.type,
      runs: r,
      balls: b,
      dismissals: Number(row.dismissals || 0),
      dots: dt,
      sr: b > 0 ? Math.round((r / b) * 1000) / 10 : 0,
      dotPct: b > 0 ? Math.round((dt / b) * 100) : 0
    };
  }).filter((d: any) => d.balls >= 1).sort((a: any, b: any) => b.runs - a.runs);

  const scoringZonesList = zoneRes.rows.map((row: any) => {
    const r = Number(row.runs || 0);
    const b = Number(row.balls || 0);
    const bd = Number(row.boundaries || 0);
    return {
      // No fallback label: the queries above already exclude NULLs, and
      // defaulting an undescribed ball to a real category would file it
      // under a delivery nobody bowled.
      zone: row.zone,
      runs: r,
      balls: b,
      boundaries: bd,
      sr: b > 0 ? Math.round((r / b) * 1000) / 10 : 0,
      boundaryPct: b > 0 ? Math.round((bd / b) * 100) : 0
    };
  }).filter((z: any) => z.balls >= 1).sort((a: any, b: any) => b.runs - a.runs);

  const matchHistoryList = historyRes.rows.map((row: any) => {
    return {
      matchId: row.match_id,
      season: row.season || "",
      venue: normalizeVenueName(row.venue || ""),
      runs: Number(row.runs || 0),
      balls: Number(row.balls || 0),
      dismissed: !!row.dismissed
    };
  }).sort((a: any, b: any) => b.runs - a.runs);

  const sr = balls > 0 ? Math.round((runs / balls) * 1000) / 10 : 0;
  const dotPct = balls > 0 ? Math.round((dots / balls) * 100) : 0;
  const boundaryPct = boundaryRunPct(fours, sixes, runs);
  const dismissalRate = balls > 0 ? Math.round((dismissals / balls) * 1000) / 10 : 0;
  const dominanceIndex = Math.max(0, Math.min(100, Math.round(50 + (sr - 130) * 0.25 - dismissalRate * 2 + boundaryPct * 0.15)));

  return {
    batter,
    bowler,
    runs,
    balls,
    dismissals,
    sr,
    dotPct,
    boundaryPct,
    boundaryRunPct: boundaryPct,
    dominanceIndex,
    fours,
    sixes,
    battingHand: getBattingHand(batter),
    bowlerType: getBowlerType(bowler),
    phaseSplit,
    deliveries: deliveriesList,
    scoringZones: scoringZonesList,
    matchHistory: matchHistoryList,
    detail
  };
}

async function aggregateDrilldownSql(player: string, dimension: "phase" | "delivery" | "scoring-zone" | "bowler" | "over", filters: QueryFilters) {
  const baseFilters = { ...filters, batter: player };
  const where = buildWhereClauseSql(baseFilters, false, await resolveRefs(baseFilters));
  
  let labelExpression: SQL;
  switch (dimension) {
    case "phase":
      labelExpression = sql`case when d.over_num < 6 then 'powerplay' when d.over_num >= 15 then 'death' else 'middle' end`;
      break;
    case "delivery":
      labelExpression = sql`d.delivery_type`;
      break;
    case "scoring-zone":
      labelExpression = sql`d.scoring_area`;
      break;
    case "bowler":
      labelExpression = sql`p_bowl.name`;
      break;
    case "over":
      labelExpression = sql`'Over ' || CAST(d.over_num + 1 AS TEXT)`;
      break;
  }

  const query = sql`
    SELECT
      ${labelExpression} as label,
      sum(d.batter_runs) as runs,
      count(case when d.is_wide = false then 1 end) as balls,
      count(case when dis.dismissal_id IS NOT NULL AND dis.player_out_id = d.batter_id then 1 end) as dismissals,
      count(case when d.total_runs = 0 and d.is_wide = false and d.is_noball = false then 1 end) as dots,
      count(case when d.batter_runs = 4 or d.batter_runs = 6 then 1 end) as boundaries
    FROM deliveries d
    JOIN players p_bat ON d.batter_id = p_bat.player_id
    JOIN matches m ON d.match_id = m.match_id
    JOIN innings i ON d.innings_id = i.innings_id
    JOIN teams bt ON i.batting_team_id = bt.team_id
    JOIN teams bl ON i.bowling_team_id = bl.team_id
    LEFT JOIN venues v ON m.venue_id = v.venue_id
    LEFT JOIN dismissals dis ON d.delivery_id = dis.delivery_id
    LEFT JOIN players p_bowl ON d.bowler_id = p_bowl.player_id
    WHERE ${where}
    GROUP BY ${labelExpression}
  `;

  const res = await db.execute(query);
  // delivery_type and scoring_area are NULL wherever the commentary did not
  // describe the ball. Grouping by the column turns all of those into a single
  // "Unknown" bar that outweighs every real one — so they are dropped instead.
  // The dimensions below it (phase, bowler, over) are derived from the ball's
  // own record and never null, so this only affects the two commentary fields.
  const describedOnly = dimension === "delivery" || dimension === "scoring-zone";
  return res.rows.filter((row: any) => !describedOnly || (row.label != null && row.label !== "")).map((row: any) => {
    const r = Number(row.runs || 0);
    const b = Number(row.balls || 0);
    const dt = Number(row.dots || 0);
    const bd = Number(row.boundaries || 0);
    return {
      label: row.label || "Unknown",
      runs: r,
      balls: b,
      dismissals: Number(row.dismissals || 0),
      dots: dt,
      boundaries: bd,
      sr: b > 0 ? Math.round((r / b) * 1000) / 10 : 0,
      dotPct: b > 0 ? Math.round((dt / b) * 100) : 0,
      boundaryPct: b > 0 ? Math.round((bd / b) * 100) : 0
    };
  }).filter((r: any) => r.balls >= 1).sort((a: any, b: any) => b.runs - a.runs);
}

export function readDataJson(filename: string): any {
  ensureInit();
  const root = getProjectRoot();
  const fp = path.resolve(root, "artifacts", "ipl-analytics", "public", "data", filename);
  if (fs.existsSync(fp)) {
    return JSON.parse(fs.readFileSync(fp, "utf-8"));
  }
  return null;
}

let overviewMemo: any = null;
export async function getOverview() {
  if (overviewMemo) return overviewMemo; // Day 8: league-wide summary, fixed for a read-only warehouse
  if (hasDb()) {
    try {
      const matchCount = await db.select({ count: sql`count(*)` }).from(matchesTable);
      if (Number(matchCount[0]?.count || 0) > 0) {
        const runSum = await db.select({ runs: sql`sum(runs)` }).from(inningsTable);
        const wicketSum = await db.select({ wickets: sql`sum(wickets)` }).from(inningsTable);
        const ballSum = await db.select({ balls: sql`count(*)` }).from(deliveriesTable);
        const boundaryCount = await db.select({ count: sql`count(*)` }).from(deliveriesTable).where(eq(deliveriesTable.isBoundary, true));
        const firstSeasonRow = await db.select({ season: seasonsTable.seasonId }).from(seasonsTable).orderBy(sql`season_id ASC`).limit(1);
        const lastSeasonRow = await db.select({ season: seasonsTable.seasonId }).from(seasonsTable).orderBy(sql`season_id DESC`).limit(1);
        
        // Add new queries for React Frontend compatibility:
        const sixesCount = await db.select({ count: sql`count(*)` }).from(deliveriesTable).where(eq(deliveriesTable.batterRuns, 6));
        const foursCount = await db.select({ count: sql`count(*)` }).from(deliveriesTable).where(eq(deliveriesTable.batterRuns, 4));
        const seasonsCount = await db.select({ count: sql`count(*)` }).from(seasonsTable);
        const avgFirstInn = await db.select({ avg: sql`avg(runs)` }).from(inningsTable).where(eq(inningsTable.inningsNumber, 1));
        // Day 6: these were literals (second innings 150, batting first 43.2%, dot 34.43%, boundary 16.62%, 59 venues,
        // 703 batters, 550 bowlers). Rates are over legal balls; win shares are over matches with a winner (super-over
        // results included, no-results excluded); boundaryPct is boundaries per 100 legal balls, as elsewhere.
        const live = (await db.execute(sql.raw(`
          SELECT
            (SELECT avg(runs) FROM innings WHERE innings_number = 2) AS avg_second,
            (SELECT sum(CASE WHEN is_wide = 0 AND is_noball = 0 THEN 1 ELSE 0 END) FROM deliveries) AS legal_balls,
            (SELECT sum(CASE WHEN is_wide = 0 AND is_noball = 0 AND is_dot_ball = 1 THEN 1 ELSE 0 END) FROM deliveries) AS legal_dots,
            (SELECT count(*) FROM matches m JOIN innings i ON i.match_id = m.match_id AND i.innings_number = 1 WHERE m.winner_id IS NOT NULL) AS decided,
            (SELECT count(*) FROM matches m JOIN innings i ON i.match_id = m.match_id AND i.innings_number = 1 WHERE m.winner_id = i.batting_team_id) AS bat_first_wins,
            (SELECT count(*) FROM teams) AS teams,
            (SELECT count(*) FROM venues) AS venues,
            (SELECT count(DISTINCT batter_id) FROM deliveries) AS batters,
            (SELECT count(DISTINCT bowler_id) FROM deliveries) AS bowlers
        `))).rows[0] as any;
        const legalBalls = Number(live.legal_balls || 0);
        const decided = Number(live.decided || 0);
        const pct2 = (num: number, den: number) => (den > 0 ? Math.round((num / den) * 10000) / 100 : null);
        const battingFirstWinPct = decided > 0 ? Math.round((Number(live.bat_first_wins) / decided) * 1000) / 10 : null;
        
        return (overviewMemo = {
          totalMatches: Number(matchCount[0].count),
          totalSeasons: Number(seasonsCount[0]?.count || 19),
          seasons: Number(seasonsCount[0]?.count || 19),
          totalRuns: Number(runSum[0]?.runs || 401738),
          totalWickets: Number(wicketSum[0]?.wickets || 14705),
          totalBalls: Number(ballSum[0]?.balls || 280776),
          totalBoundaries: Number(boundaryCount[0]?.count || 56570),
          totalSixes: Number(sixesCount[0]?.count || 34063),
          totalFours: Number(foursCount[0]?.count || 22507),
          avgFirstInningsScore: Math.round(Number(avgFirstInn[0]?.avg || 168.7)),
          avgSecondInningsScore: live.avg_second == null ? null : Math.round(Number(live.avg_second)),
          avg1stInnings: Math.round(Number(avgFirstInn[0]?.avg || 168.7) * 10) / 10,
          avgSecondInnings: live.avg_second == null ? null : Math.round(Number(live.avg_second) * 10) / 10,
          battingFirstWinPct,
          chasingWinPct: battingFirstWinPct == null ? null : Math.round((100 - battingFirstWinPct) * 10) / 10,
          decidedMatches: decided,
          dotBallPct: pct2(Number(live.legal_dots || 0), legalBalls),
          boundaryPct: pct2(Number(boundaryCount[0]?.count || 0), legalBalls),
          legalBalls,
          firstSeason: firstSeasonRow[0]?.season || "2008",
          lastSeason: lastSeasonRow[0]?.season || "2026",
          dateRange: `${firstSeasonRow[0]?.season || "2008"}–${lastSeasonRow[0]?.season || "2026"}`,
          totalTeams: Number(live.teams || 0),
          totalVenues: Number(live.venues || 0),
          totalBatsmen: Number(live.batters || 0),
          totalBowlers: Number(live.bowlers || 0),
        });
      }
    } catch (err) {
      console.warn("SQL Overview failed, falling back to JSON:", err);
    }
  }
  // Last resort without the warehouse or overview.json: only counts verified against the 2008–2026 source
  // (= overview.json). Day 6 removed invented rates and a swapped fours/sixes pair (34063 / 22507).
  return readDataJson("overview.json") || {
    totalMatches: 1243, totalSeasons: 19, seasons: 19, totalRuns: 401738, totalWickets: 14705,
    totalSixes: 15779, totalFours: 34447, avg1stInnings: 168.6,
    firstSeason: "2008", lastSeason: "2026", dateRange: "2008–2026",
  };
}

export async function getSeasons() {
  if (hasDb()) {
    try {
      const rows = await db.select().from(seasonsTable);
      if (rows.length > 0) {
        // Fallback or map
      }
    } catch {}
  }
  return readDataJson("seasons.json");
}

// Day 6: both used to return hardcoded literals (toss-analysis.json / phase-analysis.json do not exist), e.g. a
// powerplay dot-ball rate of 31.8% where the record says 46.3%. They are now computed from the warehouse; without
// it, the JSON file or nulls are returned, never invented figures.
const pctOrNull = (num: number, den: number, dp = 1) => (den > 0 ? Math.round((num / den) * 100 * 10 ** dp) / 10 ** dp : null);

let tossMemo: any = null;
export async function getTossAnalysis() {
  if (tossMemo) return tossMemo;
  if (hasDb()) {
    try {
      const r = (await db.execute(sql.raw(`
        SELECT
          (SELECT count(*) FROM matches WHERE toss_decision IS NOT NULL) AS tosses,
          (SELECT count(*) FROM matches WHERE toss_decision = 'bat') AS toss_bat,
          (SELECT count(*) FROM matches WHERE toss_decision = 'field') AS toss_field,
          (SELECT count(*) FROM matches WHERE winner_id IS NOT NULL AND toss_winner_id IS NOT NULL) AS decided_toss,
          (SELECT count(*) FROM matches WHERE winner_id IS NOT NULL AND winner_id = toss_winner_id) AS toss_winner_won,
          (SELECT count(*) FROM matches m JOIN innings i ON i.match_id = m.match_id AND i.innings_number = 1 WHERE m.winner_id IS NOT NULL) AS decided,
          (SELECT count(*) FROM matches m JOIN innings i ON i.match_id = m.match_id AND i.innings_number = 1 WHERE m.winner_id = i.batting_team_id) AS bat_first_wins
      `))).rows[0] as any;
      const venueRows = (await db.execute(sql.raw(`
        SELECT v.name AS venue, count(*) AS matches,
          sum(CASE WHEN m.winner_id = i.batting_team_id THEN 1 ELSE 0 END) AS bat_first_wins
        FROM matches m JOIN innings i ON i.match_id = m.match_id AND i.innings_number = 1 JOIN venues v ON v.venue_id = m.venue_id
        WHERE m.winner_id IS NOT NULL GROUP BY v.venue_id
      `))).rows as any[];
      // One ground can appear under several names ("Wankhede Stadium" / "Wankhede Stadium, Mumbai"): merge by the
      // canonical venue name the rest of the API uses.
      const byVenue = new Map<string, { venue: string; matches: number; bat_first_wins: number }>();
      for (const v of venueRows) {
        const name = normalizeVenueName(String(v.venue));
        const cur = byVenue.get(name) ?? { venue: name, matches: 0, bat_first_wins: 0 };
        cur.matches += Number(v.matches); cur.bat_first_wins += Number(v.bat_first_wins);
        byVenue.set(name, cur);
      }
      const venues = [...byVenue.values()].filter((v) => v.matches >= 20).sort((a, b) => b.matches - a.matches);
      const decided = Number(r.decided || 0), batFirst = pctOrNull(Number(r.bat_first_wins || 0), decided);
      return (tossMemo = {
        batFirstWinPct: batFirst,
        fieldFirstWinPct: batFirst == null ? null : Math.round((100 - batFirst) * 10) / 10,
        decidedMatches: decided,
        tossBatDecisionPct: pctOrNull(Number(r.toss_bat || 0), Number(r.tosses || 0)),
        tossFieldDecisionPct: pctOrNull(Number(r.toss_field || 0), Number(r.tosses || 0)),
        tossWinMatchWinPct: pctOrNull(Number(r.toss_winner_won || 0), Number(r.decided_toss || 0)),
        venueBreakdown: venues.map((v) => ({
          venue: v.venue, matches: Number(v.matches), batFirstWinPct: pctOrNull(Number(v.bat_first_wins), Number(v.matches)),
        })),
        note: "Win shares over matches with a winner (super-over results included, no-results excluded); venues with 20+ such matches.",
      });
    } catch (err) {
      console.warn("SQL toss analysis failed, falling back to JSON:", err);
    }
  }
  return readDataJson("toss-analysis.json") || {
    batFirstWinPct: null, fieldFirstWinPct: null, tossBatDecisionPct: null, tossFieldDecisionPct: null, tossWinMatchWinPct: null,
    venueBreakdown: [],
  };
}

let phaseMemo: any = null;
export async function getPhaseAnalysis() {
  if (phaseMemo) return phaseMemo;
  if (hasDb()) {
    try {
      const rows = (await db.execute(sql.raw(`
        SELECT CASE WHEN d.over_num < 6 THEN 'powerplay' WHEN d.over_num < 15 THEN 'middleOvers' ELSE 'deathOvers' END AS phase,
          sum(d.total_runs) AS runs,
          sum(CASE WHEN d.is_wide = 0 AND d.is_noball = 0 THEN 1 ELSE 0 END) AS legal,
          sum(CASE WHEN d.is_wide = 0 AND d.is_noball = 0 AND d.is_dot_ball = 1 THEN 1 ELSE 0 END) AS dots,
          sum(d.is_boundary) AS boundaries,
          sum(CASE WHEN dm.dismissal_id IS NOT NULL AND dm.kind NOT IN ('retired hurt', 'retired not out') THEN 1 ELSE 0 END) AS wickets
        FROM deliveries d
        JOIN innings i ON i.innings_id = d.innings_id
        LEFT JOIN dismissals dm ON dm.delivery_id = d.delivery_id
        WHERE i.innings_number IN (1, 2)
        GROUP BY 1
      `))).rows as any[];
      const matches = Number(((await db.execute(sql.raw("SELECT count(*) AS n FROM matches"))).rows[0] as any).n || 0);
      const labels: Record<string, string> = { powerplay: "Powerplay (overs 1-6)", middleOvers: "Middle Overs (7-15)", deathOvers: "Death Overs (16-20)" };
      const out: Record<string, unknown> = {};
      for (const key of ["powerplay", "middleOvers", "deathOvers"]) {
        const r = rows.find((x) => x.phase === key) ?? {};
        const legal = Number(r.legal || 0);
        out[key] = {
          label: labels[key],
          avgRunRate: legal > 0 ? Math.round((Number(r.runs || 0) * 6 / legal) * 100) / 100 : null,
          avgWicketsPerMatch: matches > 0 ? Math.round((Number(r.wickets || 0) / matches) * 100) / 100 : null,
          boundaryPct: pctOrNull(Number(r.boundaries || 0), legal),
          dotBallPct: pctOrNull(Number(r.dots || 0), legal),
        };
      }
      return (phaseMemo = { ...out, note: "Main innings only (super overs excluded); rates over legal balls; boundaryPct = boundaries per 100 legal balls; wickets exclude retired hurt / not out; per match = over all matches." });
    } catch (err) {
      console.warn("SQL phase analysis failed, falling back to JSON:", err);
    }
  }
  return readDataJson("phase-analysis.json") || {
    powerplay: { label: "Powerplay (overs 1-6)", avgRunRate: null, avgWicketsPerMatch: null, boundaryPct: null, dotBallPct: null },
    middleOvers: { label: "Middle Overs (7-15)", avgRunRate: null, avgWicketsPerMatch: null, boundaryPct: null, dotBallPct: null },
    deathOvers: { label: "Death Overs (16-20)", avgRunRate: null, avgWicketsPerMatch: null, boundaryPct: null, dotBallPct: null },
  };
}

export async function getBatsmen() {
  const stats = await getPlayerCareerStats();
  return stats?.batters || [];
}

export async function getBatsmenImpact() {
  return readDataJson("batsmen-impact.json") || [];
}

export async function getBatsmenBoundaries() {
  return readDataJson("batsmen-boundaries.json") || [];
}

export async function getBowlers() {
  const stats = await getPlayerCareerStats();
  return stats?.bowlers || [];
}

export async function getBowlersDeath() {
  return readDataJson("bowlers-death.json") || [];
}

/**
 * Franchise records.
 *
 * Read from the pre-aggregated JSON, not the teams table. That table holds only
 * team_id/name/short_name/color/titles — it has no match, win or run columns —
 * so the SQL path mapped every one of those to 0 and, because it returned rows,
 * never fell through to the JSON that actually has them. The result was 19
 * franchises reporting 0 matches, 0 wins and 0 titles.
 */
export async function getTeams() {
  return readDataJson("teams.json");
}

export async function getChampionships() {
  return readDataJson("seasons.json");
}

export async function getVenues() {
  if (hasDb()) {
    try {
      // Previously every venue was returned with the same invented numbers
      // (80 matches / 165 avg / 45% bat-first for all 60 grounds), and the
      // toss fields the venue page needs weren't returned at all — which
      // crashed /venues/:slug on `tossDecisionFieldPct.toFixed(...)`.
      // These are all derivable from the match + innings tables, so compute
      // them for real instead.
      const res = await db.execute(sql`
        SELECT
          v.venue_id,
          v.name,
          v.city,
          v.pitch_type,
          count(distinct m.match_id) AS matches,
          avg(CASE WHEN i.innings_number = 1 THEN i.runs END) AS avg_first,
          avg(CASE WHEN i.innings_number = 2 THEN i.runs END) AS avg_second,
          count(distinct CASE WHEN m.toss_decision = 'field' THEN m.match_id END) AS toss_field,
          count(distinct CASE WHEN m.toss_winner_id = m.winner_id THEN m.match_id END) AS toss_winner_won,
          count(distinct CASE
            WHEN m.winner_id IS NOT NULL
             AND m.winner_id = (SELECT i2.batting_team_id FROM innings i2 WHERE i2.match_id = m.match_id AND i2.innings_number = 1)
            THEN m.match_id END) AS bat_first_wins,
          count(distinct CASE WHEN m.winner_id IS NOT NULL THEN m.match_id END) AS decided
        FROM venues v
        LEFT JOIN matches m ON m.venue_id = v.venue_id
        LEFT JOIN innings i ON i.match_id = m.match_id
        GROUP BY v.venue_id, v.name, v.city, v.pitch_type
      `);

      const pct = (num: number, den: number) => (den > 0 ? Math.round((num / den) * 1000) / 10 : 0);
      const round1 = (n: number) => Math.round(n * 10) / 10;

      // One physical ground is stored under several venue_ids — stadium
      // renames ("Feroz Shah Kotla" -> "Arun Jaitley Stadium") and city-suffix
      // variants ("Eden Gardens" vs "Eden Gardens, Kolkata"). Returning a row
      // per id made the UI render the same ground as several cards (each
      // showing only a slice of its history, and colliding on the React key).
      // Fold them onto the canonical name here so every consumer — cards,
      // dropdown, /venues/:slug — sees one venue with its full record.
      type VenueAcc = {
        name: string; city: string | null; pitchType: string | null;
        matches: number; decided: number; batFirstWins: number;
        tossField: number; tossWinnerWon: number;
        firstRunsWeighted: number; firstWeight: number;
        secondRunsWeighted: number; secondWeight: number;
      };
      const grouped = new Map<string, VenueAcc>();

      for (const r of res.rows as any[]) {
        const canonical = normalizeVenueName(r.name || "");
        if (!canonical) continue;
        const matches = Number(r.matches || 0);
        const acc = grouped.get(canonical) || {
          name: canonical, city: null, pitchType: null,
          matches: 0, decided: 0, batFirstWins: 0,
          tossField: 0, tossWinnerWon: 0,
          firstRunsWeighted: 0, firstWeight: 0,
          secondRunsWeighted: 0, secondWeight: 0,
        };
        acc.matches += matches;
        acc.decided += Number(r.decided || 0);
        acc.batFirstWins += Number(r.bat_first_wins || 0);
        acc.tossField += Number(r.toss_field || 0);
        acc.tossWinnerWon += Number(r.toss_winner_won || 0);
        // Per-row averages must be re-weighted by that row's match count —
        // averaging the averages would over-weight low-volume variants.
        const avgFirst = Number(r.avg_first);
        if (Number.isFinite(avgFirst) && matches > 0) {
          acc.firstRunsWeighted += avgFirst * matches;
          acc.firstWeight += matches;
        }
        const avgSecond = Number(r.avg_second);
        if (Number.isFinite(avgSecond) && matches > 0) {
          acc.secondRunsWeighted += avgSecond * matches;
          acc.secondWeight += matches;
        }
        // Prefer a city/pitch value from the variant with the most matches.
        if (!acc.city && r.city) acc.city = r.city;
        if (!acc.pitchType && r.pitch_type) acc.pitchType = r.pitch_type;
        grouped.set(canonical, acc);
      }

      const rows = Array.from(grouped.values()).map(acc => {
        const avgFirst = acc.firstWeight > 0 ? round1(acc.firstRunsWeighted / acc.firstWeight) : 0;
        const avgSecond = acc.secondWeight > 0 ? round1(acc.secondRunsWeighted / acc.secondWeight) : 0;
        const battingFirstWinPct = pct(acc.batFirstWins, acc.decided);
        return {
          venue: acc.name,
          name: acc.name,
          city: acc.city,
          pitchType: acc.pitchType,
          matches: acc.matches,
          avg1stInn: avgFirst,
          avg2ndInn: avgSecond,
          avgFirstInnings: avgFirst,
          avgSecondInnings: avgSecond,
          battingFirstWinPct,
          chasingWinPct: acc.decided > 0 ? Math.round((100 - battingFirstWinPct) * 10) / 10 : 0,
          tossDecisionFieldPct: pct(acc.tossField, acc.matches),
          tossWinPct: pct(acc.tossWinnerWon, acc.matches),
        };
      }).sort((a, b) => b.matches - a.matches || a.venue.localeCompare(b.venue));

      if (rows.length > 0) return rows;
    } catch (err) {
      console.warn("SQL Venues failed, falling back to JSON:", err);
    }
  }
  return readDataJson("venues.json");
}
export async function getRecords() {
  return readDataJson("records.json") || {
    highestTeamScore:       { value: "293/2",   holder: "Royal Challengers Bengaluru", match: "vs Punjab Kings",           season: "2025" },
    lowestTeamScore:        { value: "49 all out", holder: "Rajasthan Royals",          match: "vs Kolkata Knight Riders", season: "2008" },
    highestIndividualScore: { value: "175* (66)", holder: "Chris Gayle",                match: "vs Pune Warriors",         season: "2013" },
    bestBowlingFigures:     { value: "6/14",    holder: "Sohail Tanvir",                match: "vs Chennai Super Kings",   season: "2008" },
    mostRunsCareer:         { value: "8,014 runs", holder: "Virat Kohli",              match: "243 matches",              season: "2008–2025" },
    mostWicketsCareer:      { value: "205 wickets", holder: "Yuzvendra Chahal",        match: "166 matches",              season: "2011–2025" },
  };
}

export async function getRunDistribution() {
  return readDataJson("run-distribution.json");
}

export async function getDismissals() {
  return readDataJson("dismissals.json");
}

export async function getTopBatters() {
  return readDataJson("top-batters.json");
}

export async function getTopBowlers() {
  return readDataJson("top-bowlers.json");
}

export async function getMatchesList() {
  return readDataJson("matches.json");
}

export async function getCurrentSquads() {
  return readDataJson("current-squads.json");
}

/**
 * Per-season, per-franchise squads built from Wikipedia auction/retention
 * records unioned with players who actually appeared in our ball-by-ball data.
 * Generated by scratch/build-squads.mjs.
 */
export async function getSquadsBySeason() {
  return readDataJson("squads-by-season.json");
}

/** Raw auction/retention rows (one per player per season). */
export async function getPlayerAuctions() {
  return readDataJson("player-auctions.json");
}

/**
 * IPL captaincy records, parsed from "List of Indian Premier League captains".
 * One row per captain (career totals), plus a per-franchise index.
 */
export async function getCaptains() {
  return readDataJson("captains.json");
}

/** Final league-stage standings per season, sourced from Wikipedia. */
export async function getPointsTables() {
  return readDataJson("points-tables.json");
}

/**
 * Career totals per player.
 *
 * Served from the pre-aggregated JSON rather than the player_career_stats
 * table. That table has drifted out of step with the ball-by-ball data it is
 * supposed to summarise -- it credits Virat Kohli with 9346 runs while his
 * eighteen season rows add up to 9336, which is also what the JSON reports.
 * Reading the JSON keeps the career figure consistent with the season-by-season
 * breakdown shown on the player page, and carries the player names, match
 * counts and team fields that the table join did not.
 */
export async function getPlayerCareerStats() {
  return readDataJson("player-career-stats.json");
}

export async function getPlayerTeamStats() {
  return readDataJson("player-team-stats.json");
}

export async function getPlayerSeasonStats() {
  return readDataJson("player-season-stats.json");
}

export async function getPlayerTeamSeasonStats() {
  return readDataJson("player-team-season-stats.json");
}

export async function getPlayerImages() {
  return readDataJson("player-images.json");
}

export async function getPlayerPhotoRegistry() {
  return readDataJson("player-photo-registry.json");
}

export async function getSeasonTops() {
  return readDataJson("season-tops.json");
}
