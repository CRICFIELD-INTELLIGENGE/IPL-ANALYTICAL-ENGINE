// One colour per franchise, shared by every page that colours a team: the team
// and Dugout pages, stats, scores, player and match pages, charts and logos.
// Change a franchise here and it changes everywhere.
//
// Each accent clears WCAG AA text contrast (4.5:1) on the dark page background,
// so it reads as text as well as a fill. Historical names are included so that
// old seasons get the same colour as the franchise they belong to.

export const PAGE_BG = "#0B1020";
export const FALLBACK_ACCENT = "#A78BFA";

export interface FranchisePalette {
  /** Main colour: text, borders, bars, lines. */
  accent: string;
  /** Second colour for gradients and highlights. */
  secondary: string;
}

const PALETTE: Record<string, FranchisePalette> = {
  "Chennai Super Kings": { accent: "#FFD11A", secondary: "#86B4D8" },
  "Mumbai Indians": { accent: "#3377FF", secondary: "#D4AF37" },
  "Royal Challengers Bengaluru": { accent: "#F03C3C", secondary: "#D9B47A" },
  "Kolkata Knight Riders": { accent: "#B56BEF", secondary: "#F59E0B" },
  "Sunrisers Hyderabad": { accent: "#FF661A", secondary: "#EAB308" },
  "Rajasthan Royals": { accent: "#E8308C", secondary: "#3B82F6" },
  "Delhi Capitals": { accent: "#38BDF8", secondary: "#EF4444" },
  "Punjab Kings": { accent: "#FF5A6E", secondary: "#FBBF24" },
  "Gujarat Titans": { accent: "#34D399", secondary: "#D97706" },
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
