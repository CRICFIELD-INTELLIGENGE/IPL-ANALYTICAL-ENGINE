// One colour per franchise, shared by every page that colours a team: the team
// and Dugout pages, stats, scores, player and match pages, charts and logos.
// Change a franchise here and it changes everywhere.
//
// Background synced with the CricField stadium brand image (#020814).
// Accents pinpoint-matched with the official franchise crest logos.

export const PAGE_BG = "#020814";
export const FALLBACK_ACCENT = "#8BA7FF";

export interface FranchisePalette {
  /** Main colour: text, borders, bars, lines, logo accents. */
  accent: string;
  /** Second colour for gradients, highlights and secondary emblems. */
  secondary: string;
}

const PALETTE: Record<string, FranchisePalette> = {
  // CSK: Canary Yellow & Lion Royal Blue from official crest
  "Chennai Super Kings": { accent: "#FFD11A", secondary: "#155BA6" },
  // MI: Mumbai Indians Royal Blue & Championship Gold
  "Mumbai Indians": { accent: "#004BA0", secondary: "#D4AF37" },
  // RCB: Challengers Crimson Red & Royal Gold from lion crest
  "Royal Challengers Bengaluru": { accent: "#EC1C24", secondary: "#E2A838" },
  // KKR: Knight Imperial Purple & Championship Gold
  "Kolkata Knight Riders": { accent: "#B56BEF", secondary: "#F2A900" },
  // SRH: Sunrisers Blazing Orange & Rising Gold
  "Sunrisers Hyderabad": { accent: "#FF661A", secondary: "#EAB308" },
  // RR: Royal Pink & Majestic Blue from royal shield
  "Rajasthan Royals": { accent: "#EA1A85", secondary: "#254AA5" },
  // DC: Delhi Capitals Imperial Blue & Roaring Crimson
  "Delhi Capitals": { accent: "#004C97", secondary: "#D71920" },
  // PBKS: Punjab Kings Sadda Crimson & Golden Shield
  "Punjab Kings": { accent: "#ED1B24", secondary: "#D4AF37" },
  // GT: Gujarat Titans Mint Teal & Championship Gold
  "Gujarat Titans": { accent: "#34D399", secondary: "#E5C465" },
  // LSG: Lucknow Super Giants Express Cyan & Flame Orange
  "Lucknow Super Giants": { accent: "#22D3EE", secondary: "#F97316" },
  // Former franchises
  "Deccan Chargers": { accent: "#818CF8", secondary: "#C4B5FD" },
  "Pune Warriors": { accent: "#5EEAD4", secondary: "#99F6E4" },
  "Rising Pune Supergiant": { accent: "#D946EF", secondary: "#F0ABFC" },
  "Gujarat Lions": { accent: "#FF9F1A", secondary: "#FDBA74" },
  "Kochi Tuskers Kerala": { accent: "#A3E635", secondary: "#D9F99D" },
};

/** Names a franchise has gone by, mapped to the name in PALETTE. */
const ALIASES: Record<string, string> = {
  "Royal Challengers Bangalore": "Royal Challengers Bengaluru",
  "Delhi Daredevils": "Delhi Capitals",
  "Kings XI Punjab": "Punjab Kings",
  "Pune Warriors India": "Pune Warriors",
};

/** Palette for a franchise name (current, historical or alias); undefined if unknown. */
export function franchisePalette(name: string): FranchisePalette | undefined {
  return PALETTE[name] ?? PALETTE[ALIASES[name] ?? ""];
}

/** Accent colour for every known franchise name, aliases included. */
export const TEAM_ACCENTS: Record<string, string> = Object.fromEntries([
  ...Object.entries(PALETTE).map(([name, p]) => [name, p.accent]),
  ...Object.entries(ALIASES).map(([alias, name]) => [alias, PALETTE[name].accent]),
]);

/** Full franchise name for each current short code (as used in the Dugout and match data). */
const CODE_NAMES: Record<string, string> = {
  RCB: "Royal Challengers Bengaluru",
  CSK: "Chennai Super Kings",
  MI: "Mumbai Indians",
  KKR: "Kolkata Knight Riders",
  SRH: "Sunrisers Hyderabad",
  RR: "Rajasthan Royals",
  DC: "Delhi Capitals",
  PBKS: "Punjab Kings",
  GT: "Gujarat Titans",
  LSG: "Lucknow Super Giants",
};

/** Palette for a short code such as "CSK"; undefined if the code is unknown. */
export function paletteForCode(code: string): FranchisePalette | undefined {
  const name = CODE_NAMES[code];
  return name ? franchisePalette(name) : undefined;
}

/** `#RRGGBB` plus an alpha as `rgba(...)`, for glows and translucent fills. */
export function withAlpha(hex: string, alpha: number): string {
  const n = parseInt(hex.replace("#", ""), 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
}

/** Linear blend of two `#RRGGBB` colours: t = 0 is `a`, t = 1 is `b`. */
export function mixHex(a: string, b: string, t: number): string {
  const pa = parseInt(a.replace("#", ""), 16);
  const pb = parseInt(b.replace("#", ""), 16);
  const channel = (shift: number) =>
    Math.round(((pa >> shift) & 255) * (1 - t) + ((pb >> shift) & 255) * t).toString(16).padStart(2, "0");
  return `#${channel(16)}${channel(8)}${channel(0)}`;
}
