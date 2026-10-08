import videoData from "@/data/video-catalogue.json";

export interface VideoCatalogueItem {
  id: string;
  title: string;
  videoType: string;
  originalCategory: string;
  season: number;
  teams: string[];
  players: string[];
  opponent?: string | null;
  matchStage?: string | null;
  duration?: string | null;
  description: string;
  officialVideoUrl: string | null;
  destinationUrl: string;
  isExactVideoUrl: boolean;
  broadcaster: "JioHotstar";
  verified: boolean;
  beyondXiCategory: string;
  suggestedDestination: string;
  keywords: string[];
}

export const OFFICIAL_IPL_2026_HUB =
  "https://www.hotstar.com/in/sports/cricket/tournaments/indian-premier-league/1271507153";

export const BROADCASTER_DISCLAIMER =
  "Official broadcaster stream on JioHotstar. Opens externally in a new tab. Beyond XI is an independent analytical intelligence engine and is not affiliated with or endorsed by JioHotstar or the BCCI.";

export const ALL_VIDEOS: VideoCatalogueItem[] = videoData as VideoCatalogueItem[];

/**
 * Returns all video catalogue items.
 */
export function getAllVideos(): VideoCatalogueItem[] {
  return ALL_VIDEOS;
}

/**
 * Find video by its unique ID (e.g. V2026-006).
 */
export function getVideoById(id: string): VideoCatalogueItem | undefined {
  return ALL_VIDEOS.find(v => v.id.toLowerCase() === id.toLowerCase());
}

/**
 * Normalizes team codes for robust matching.
 */
function normalizeTeam(code: string): string {
  const c = code.trim().toUpperCase();
  if (c.includes("RCB") || c.includes("BANGALORE") || c.includes("BENGALURU")) return "RCB";
  if (c.includes("CSK") || c.includes("CHENNAI")) return "CSK";
  if (c.includes("MI") || c.includes("MUMBAI")) return "MI";
  if (c.includes("KKR") || c.includes("KOLKATA")) return "KKR";
  if (c.includes("GT") || c.includes("GUJARAT")) return "GT";
  if (c.includes("RR") || c.includes("RAJASTHAN")) return "RR";
  if (c.includes("DC") || c.includes("DELHI")) return "DC";
  if (c.includes("PBKS") || c.includes("PUNJAB")) return "PBKS";
  if (c.includes("SRH") || c.includes("HYDERABAD")) return "SRH";
  if (c.includes("LSG") || c.includes("LUCKNOW")) return "LSG";
  return c;
}

/**
 * Get all videos featuring a specific team (either as primary team or opponent).
 */
export function getVideosByTeam(teamCode: string): VideoCatalogueItem[] {
  const norm = normalizeTeam(teamCode);
  return ALL_VIDEOS.filter(v => {
    const hasInTeams = v.teams.some(t => normalizeTeam(t) === norm);
    const isOpponent = v.opponent ? normalizeTeam(v.opponent) === norm : false;
    return hasInTeams || isOpponent;
  });
}

/**
 * Get all videos featuring a specific player.
 */
export function getVideosByPlayer(playerName: string): VideoCatalogueItem[] {
  const q = playerName.toLowerCase().trim();
  const lastName = q.split(" ").pop() || q;
  return ALL_VIDEOS.filter(v => {
    return v.players.some(p => {
      const pNorm = p.toLowerCase();
      return pNorm.includes(q) || pNorm.includes(lastName);
    }) || v.title.toLowerCase().includes(q) || v.title.toLowerCase().includes(lastName);
  });
}

/**
 * Get videos by Beyond XI analytical category.
 */
export function getVideosByCategory(category: string): VideoCatalogueItem[] {
  const catLower = category.toLowerCase();
  return ALL_VIDEOS.filter(v => 
    v.beyondXiCategory.toLowerCase().includes(catLower) ||
    v.videoType.toLowerCase().includes(catLower)
  );
}

/**
 * Get videos by match stage (Final, Qualifier 1, Qualifier 2, Eliminator, League).
 */
export function getVideosByMatchStage(stage: string): VideoCatalogueItem[] {
  const sLower = stage.toLowerCase();
  return ALL_VIDEOS.filter(v => v.matchStage && v.matchStage.toLowerCase().includes(sLower));
}

/**
 * Natural language search across video title, keywords, players, and teams.
 */
export function searchVideos(query: string): VideoCatalogueItem[] {
  const q = query.toLowerCase().trim();
  if (!q) return ALL_VIDEOS;
  const terms = q.split(/\s+/).filter(Boolean);

  return ALL_VIDEOS.filter(v => {
    const haystack = [
      v.title,
      v.description,
      v.videoType,
      v.matchStage || "",
      ...v.teams,
      ...v.players,
      ...v.keywords
    ].join(" ").toLowerCase();

    return terms.every(term => haystack.includes(term));
  });
}

/**
 * Curated editorial shelves for home page and Beyond XI hubs.
 */
export interface VideoShelfCollection {
  id: string;
  title: string;
  subtitle: string;
  badge?: string;
  videos: VideoCatalogueItem[];
}

export function getEditorialShelves(): VideoShelfCollection[] {
  const finalAndPlayoffs = ALL_VIDEOS.filter(v => 
    v.matchStage && ["Final", "Qualifier 1", "Qualifier 2", "Eliminator"].some(s => v.matchStage!.includes(s))
  );

  const kohliAndRcb = ALL_VIDEOS.filter(v =>
    v.teams.includes("RCB") || v.players.some(p => p.toLowerCase().includes("kohli")) || v.title.toLowerCase().includes("kohli")
  );

  const sooryavanshiPhenom = ALL_VIDEOS.filter(v =>
    v.players.some(p => p.toLowerCase().includes("sooryavanshi")) || v.title.toLowerCase().includes("sooryavanshi")
  );

  const thrillingFinishes = ALL_VIDEOS.filter(v =>
    v.originalCategory.includes("Thrilling Finishes") || v.videoType.toLowerCase().includes("finishing")
  );

  const bowlingMasterclasses = ALL_VIDEOS.filter(v =>
    v.beyondXiCategory.toLowerCase() === "bowling" || v.videoType.toLowerCase().includes("bowling")
  );

  const topKnocksAndCenturies = ALL_VIDEOS.filter(v =>
    v.originalCategory.includes("Most Tons") || v.originalCategory.includes("Top Knocks") ||
    v.videoType.toLowerCase().includes("innings")
  );

  return [
    {
      id: "grand-finals",
      title: "Playoffs & Grand Final",
      subtitle: "RCB vs GT Grand Final, Qualifiers & high-voltage knockouts",
      badge: "Knockout Stage",
      videos: finalAndPlayoffs.slice(0, 8),
    },
    {
      id: "kohli-rcb-reign",
      title: "Kohli & RCB Championship Vault",
      subtitle: "Key innings, record milestones, and back-to-back celebrations",
      badge: "Champions 2026",
      videos: kohliAndRcb.slice(0, 8),
    },
    {
      id: "sooryavanshi-phenom",
      title: "Vaibhav Sooryavanshi: 776 Runs & 72 Sixes",
      subtitle: "The breakthrough campaign of IPL's youngest tournament MVP",
      badge: "Orange Cap & MVP",
      videos: sooryavanshiPhenom.slice(0, 8),
    },
    {
      id: "thrilling-finishes",
      title: "Thrilling Finishes & Last Over Drama",
      subtitle: "Last-ball heists, 50-off-17 chases, and death-over defensive masterclasses",
      badge: "High Leverage",
      videos: thrillingFinishes.slice(0, 8),
    },
    {
      id: "bowling-masterclasses",
      title: "Bowling Spells & Lethal Yorkers",
      subtitle: "Purple Cap Rabada (29 wickets), Bhuvi swing magic, and death-over defense",
      badge: "Wickets & Spells",
      videos: bowlingMasterclasses.slice(0, 8),
    },
    {
      id: "centuries-top-knocks",
      title: "Centuries & Top Knocks of 2026",
      subtitle: "Gill's 104, Shreyas' 101*, Kohli's 105*, and rapid three-figure masterclasses",
      badge: "Most Tons",
      videos: topKnocksAndCenturies.slice(0, 8),
    },
  ];
}
