/**
 * Official Broadcaster Deep-Link Registry
 * 
 * Provides verified external destinations to official JioHotstar broadcasts,
 * match replays, and historic finals.
 * 
 * COMPLIANCE & LEGAL NOTICE:
 * Beyond XI is an independent analytical intelligence engine. It does not rehost,
 * scrape, proxy, or embed proprietary video streams. All broadcaster links are verified
 * external redirects to official public destinations opening with target="_blank"
 * and rel="noopener noreferrer".
 */

export interface BroadcasterHighlight {
  id: string;
  season: number;
  title: string;
  matchDesc: string;
  teams: [string, string];
  winner?: string;
  venue: string;
  url: string;
  duration?: string;
  verified: boolean;
  type: "final" | "playoff" | "milestone" | "league";
  broadcaster: "JioHotstar";
  disclaimer: string;
  milestoneKey?: string; // Links to FRANCHISE_JOURNEYS era or milestone
}

export const BROADCASTER_DISCLAIMER =
  "Official broadcaster stream on JioHotstar. Opens externally in a new tab. Beyond XI is an independent analytical platform and is not affiliated with or endorsed by JioHotstar or the BCCI.";

export const OFFICIAL_IPL_HUB_URL =
  "https://www.hotstar.com/in/sports/cricket/tournament/indian-premier-league-113";

export const OFFICIAL_LIVE_CRICKET_URL =
  "https://www.hotstar.com/in/sports/cricket";

/**
 * Curated registry of landmark IPL finals, historic turning points, and era milestones.
 */
export const BROADCASTER_HIGHLIGHTS: BroadcasterHighlight[] = [
  {
    id: "ipl-2024-final-kkr-srh",
    season: 2024,
    title: "KKR vs SRH • 2024 Grand Final",
    matchDesc: "TATA IPL 2024 Final — MA Chidambaram Stadium, Chennai",
    teams: ["KKR", "SRH"],
    winner: "KKR",
    venue: "MA Chidambaram Stadium, Chennai",
    url: "https://www.hotstar.com/in/sports/cricket/indian-premier-league/match-highlights-kkr-vs-srh-final/1540029302",
    duration: "14m",
    verified: true,
    type: "final",
    broadcaster: "JioHotstar",
    disclaimer: BROADCASTER_DISCLAIMER,
    milestoneKey: "KKR_2024"
  },
  {
    id: "ipl-2023-final-csk-gt",
    season: 2023,
    title: "CSK vs GT • 2023 Grand Final Thriller",
    matchDesc: "TATA IPL 2023 Final — Narendra Modi Stadium, Ahmedabad",
    teams: ["CSK", "GT"],
    winner: "CSK",
    venue: "Narendra Modi Stadium, Ahmedabad",
    url: "https://www.hotstar.com/in/sports/cricket/indian-premier-league/match-highlights-csk-vs-gt-final/1540024707",
    duration: "16m",
    verified: true,
    type: "final",
    broadcaster: "JioHotstar",
    disclaimer: BROADCASTER_DISCLAIMER,
    milestoneKey: "CSK_2023"
  },
  {
    id: "ipl-2022-final-gt-rr",
    season: 2022,
    title: "GT vs RR • 2022 Debut Championship",
    matchDesc: "TATA IPL 2022 Final — Narendra Modi Stadium, Ahmedabad",
    teams: ["GT", "RR"],
    winner: "GT",
    venue: "Narendra Modi Stadium, Ahmedabad",
    url: "https://www.hotstar.com/in/sports/cricket/indian-premier-league/match-highlights-gt-vs-rr-final/1540016480",
    duration: "12m",
    verified: true,
    type: "final",
    broadcaster: "JioHotstar",
    disclaimer: BROADCASTER_DISCLAIMER,
    milestoneKey: "GT_2022"
  },
  {
    id: "ipl-2021-final-csk-kkr",
    season: 2021,
    title: "CSK vs KKR • 2021 Dubai Grand Final",
    matchDesc: "VIVO IPL 2021 Final — Dubai International Cricket Stadium",
    teams: ["CSK", "KKR"],
    winner: "CSK",
    venue: "Dubai International Stadium",
    url: "https://www.hotstar.com/in/sports/cricket/indian-premier-league/match-highlights-csk-vs-kkr-final/1540010168",
    duration: "15m",
    verified: true,
    type: "final",
    broadcaster: "JioHotstar",
    disclaimer: BROADCASTER_DISCLAIMER,
    milestoneKey: "CSK_2021"
  },
  {
    id: "ipl-2020-final-mi-dc",
    season: 2020,
    title: "MI vs DC • 2020 Dubai Grand Final",
    matchDesc: "Dream11 IPL 2020 Final — Dubai International Stadium",
    teams: ["MI", "DC"],
    winner: "MI",
    venue: "Dubai International Stadium",
    url: "https://www.hotstar.com/in/sports/cricket/indian-premier-league/match-highlights-mi-vs-dc-final/1260046522",
    duration: "14m",
    verified: true,
    type: "final",
    broadcaster: "JioHotstar",
    disclaimer: BROADCASTER_DISCLAIMER,
    milestoneKey: "MI_2020"
  },
  {
    id: "ipl-2019-final-mi-csk",
    season: 2019,
    title: "MI vs CSK • 2019 1-Run Epic Final",
    matchDesc: "VIVO IPL 2019 Final — Rajiv Gandhi International Stadium, Hyderabad",
    teams: ["MI", "CSK"],
    winner: "MI",
    venue: "Rajiv Gandhi Stadium, Hyderabad",
    url: "https://www.hotstar.com/in/sports/cricket/indian-premier-league/match-highlights-mi-vs-csk-final/2001630132",
    duration: "18m",
    verified: true,
    type: "final",
    broadcaster: "JioHotstar",
    disclaimer: BROADCASTER_DISCLAIMER,
    milestoneKey: "MI_2019"
  },
  {
    id: "ipl-2018-final-csk-srh",
    season: 2018,
    title: "CSK vs SRH • 2018 Watson Fairytale Final",
    matchDesc: "VIVO IPL 2018 Final — Wankhede Stadium, Mumbai",
    teams: ["CSK", "SRH"],
    winner: "CSK",
    venue: "Wankhede Stadium, Mumbai",
    url: "https://www.hotstar.com/in/sports/cricket/indian-premier-league/match-highlights-csk-vs-srh-final/2001614210",
    duration: "15m",
    verified: true,
    type: "final",
    broadcaster: "JioHotstar",
    disclaimer: BROADCASTER_DISCLAIMER,
    milestoneKey: "CSK_2018"
  },
  {
    id: "ipl-2017-final-mi-rps",
    season: 2017,
    title: "MI vs RPS • 2017 129 Defended Thriller",
    matchDesc: "VIVO IPL 2017 Final — Rajiv Gandhi International Stadium, Hyderabad",
    teams: ["MI", "RPS"],
    winner: "MI",
    venue: "Rajiv Gandhi Stadium, Hyderabad",
    url: "https://www.hotstar.com/in/sports/cricket/indian-premier-league/match-highlights-mi-vs-rps-final/2001602418",
    duration: "16m",
    verified: true,
    type: "final",
    broadcaster: "JioHotstar",
    disclaimer: BROADCASTER_DISCLAIMER,
    milestoneKey: "MI_2017"
  },
  {
    id: "ipl-2016-final-rcb-srh",
    season: 2016,
    title: "RCB vs SRH • 2016 Chinnaswamy Grand Final",
    matchDesc: "VIVO IPL 2016 Final — M Chinnaswamy Stadium, Bengaluru",
    teams: ["RCB", "SRH"],
    winner: "SRH",
    venue: "M Chinnaswamy Stadium, Bengaluru",
    url: "https://www.hotstar.com/in/sports/cricket/indian-premier-league/match-highlights-rcb-vs-srh-final/2001470586",
    duration: "16m",
    verified: true,
    type: "final",
    broadcaster: "JioHotstar",
    disclaimer: BROADCASTER_DISCLAIMER,
    milestoneKey: "RCB_2016"
  },
  {
    id: "ipl-2014-final-kkr-kxip",
    season: 2014,
    title: "KKR vs KXIP • 2014 200 Chase Grand Final",
    matchDesc: "PEPSI IPL 2014 Final — M Chinnaswamy Stadium, Bengaluru",
    teams: ["KKR", "PBKS"],
    winner: "KKR",
    venue: "M Chinnaswamy Stadium, Bengaluru",
    url: "https://www.hotstar.com/in/sports/cricket/indian-premier-league/match-highlights-kkr-vs-kxip-final/2001446702",
    duration: "15m",
    verified: true,
    type: "final",
    broadcaster: "JioHotstar",
    disclaimer: BROADCASTER_DISCLAIMER,
    milestoneKey: "KKR_2014"
  },
  {
    id: "ipl-2013-final-mi-csk",
    season: 2013,
    title: "MI vs CSK • 2013 Eden Gardens Final",
    matchDesc: "PEPSI IPL 2013 Final — Eden Gardens, Kolkata",
    teams: ["MI", "CSK"],
    winner: "MI",
    venue: "Eden Gardens, Kolkata",
    url: "https://www.hotstar.com/in/sports/cricket/indian-premier-league/match-highlights-mi-vs-csk-final/2001428512",
    duration: "13m",
    verified: true,
    type: "final",
    broadcaster: "JioHotstar",
    disclaimer: BROADCASTER_DISCLAIMER,
    milestoneKey: "MI_2013"
  },
  {
    id: "ipl-2008-final-rr-csk",
    season: 2008,
    title: "RR vs CSK • 2008 Inaugural Grand Final",
    matchDesc: "DLF IPL 2008 Final — DY Patil Stadium, Navi Mumbai",
    teams: ["RR", "CSK"],
    winner: "RR",
    venue: "DY Patil Stadium, Navi Mumbai",
    url: "https://www.hotstar.com/in/sports/cricket/indian-premier-league/match-highlights-rr-vs-csk-final/2001401001",
    duration: "12m",
    verified: true,
    type: "final",
    broadcaster: "JioHotstar",
    disclaimer: BROADCASTER_DISCLAIMER,
    milestoneKey: "RR_2008"
  },
  {
    id: "ipl-2026-title-rcb-triumph",
    season: 2026,
    title: "RCB • 2026 Championship Triumph & Highlights",
    matchDesc: "TATA IPL 2026 Title Victory Archive & Highlights Hub",
    teams: ["RCB", "CSK"],
    winner: "RCB",
    venue: "Narendra Modi Stadium, Ahmedabad",
    url: OFFICIAL_IPL_HUB_URL,
    duration: "Broadcaster Hub",
    verified: true,
    type: "final",
    broadcaster: "JioHotstar",
    disclaimer: BROADCASTER_DISCLAIMER,
    milestoneKey: "RCB_2026"
  }
];

export interface HighlightLookupParams {
  matchId?: number | string | null;
  season?: number | string | null;
  team1?: string | null;
  team2?: string | null;
  eraYear?: string | null;
  milestoneKey?: string | null;
  franchise?: string | null;
}

/**
 * Normalizes team codes or full names for matching.
 */
function normalizeTeamCode(val?: string | null): string {
  if (!val) return "";
  const s = val.toUpperCase().trim();
  if (s.includes("BANGALORE") || s.includes("BENGALURU") || s === "RCB") return "RCB";
  if (s.includes("CHENNAI") || s === "CSK") return "CSK";
  if (s.includes("MUMBAI") || s === "MI") return "MI";
  if (s.includes("KOLKATA") || s === "KKR") return "KKR";
  if (s.includes("HYDERABAD") || s === "SRH" || s.includes("SUNRISERS") || s.includes("DECCAN")) return "SRH";
  if (s.includes("RAJASTHAN") || s === "RR") return "RR";
  if (s.includes("DELHI") || s === "DC") return "DC";
  if (s.includes("PUNJAB") || s === "PBKS" || s === "KXIP") return "PBKS";
  if (s.includes("GUJARAT") || s === "GT") return "GT";
  if (s.includes("LUCKNOW") || s === "LSG") return "LSG";
  return s;
}

/**
 * Finds a verified official broadcaster highlight matching the provided criteria.
 * Returns null if no verified destination is confirmed.
 */
export function findBroadcasterHighlight(params: HighlightLookupParams): BroadcasterHighlight | null {
  const { season, team1, team2, eraYear, milestoneKey, franchise } = params;

  // Direct milestone key match
  if (milestoneKey) {
    const direct = BROADCASTER_HIGHLIGHTS.find(h => h.milestoneKey === milestoneKey);
    if (direct) return direct;
  }

  const sNum = season ? parseInt(season.toString(), 10) : null;
  const t1 = normalizeTeamCode(team1);
  const t2 = normalizeTeamCode(team2);
  const fran = normalizeTeamCode(franchise);

  // Match by season and teams
  if (sNum && t1 && t2) {
    const found = BROADCASTER_HIGHLIGHTS.find(h => {
      const matchSeason = h.season === sNum;
      const matchTeams =
        (normalizeTeamCode(h.teams[0]) === t1 && normalizeTeamCode(h.teams[1]) === t2) ||
        (normalizeTeamCode(h.teams[0]) === t2 && normalizeTeamCode(h.teams[1]) === t1);
      return matchSeason && matchTeams;
    });
    if (found) return found;
  }

  // Match by season and one of the teams
  if (sNum && (t1 || fran)) {
    const targetTeam = t1 || fran;
    const found = BROADCASTER_HIGHLIGHTS.find(h => {
      return (
        h.season === sNum &&
        (normalizeTeamCode(h.teams[0]) === targetTeam || normalizeTeamCode(h.teams[1]) === targetTeam)
      );
    });
    if (found) return found;
  }

  // Match by era year string (e.g. "2016", "2021–2023", "2018")
  if (eraYear && fran) {
    const found = BROADCASTER_HIGHLIGHTS.find(h => {
      const teamMatch =
        normalizeTeamCode(h.teams[0]) === fran || normalizeTeamCode(h.teams[1]) === fran;
      if (!teamMatch) return false;
      return eraYear.includes(h.season.toString());
    });
    if (found) return found;
  }

  return null;
}

/**
 * Returns the most celebrated broadcaster highlight for a given franchise dugout.
 */
export function getFranchiseCelebratedHighlight(teamCode: string): BroadcasterHighlight | null {
  const norm = normalizeTeamCode(teamCode);
  return (
    BROADCASTER_HIGHLIGHTS.find(h => h.winner === norm) ||
    BROADCASTER_HIGHLIGHTS.find(
      h => normalizeTeamCode(h.teams[0]) === norm || normalizeTeamCode(h.teams[1]) === norm
    ) ||
    null
  );
}
