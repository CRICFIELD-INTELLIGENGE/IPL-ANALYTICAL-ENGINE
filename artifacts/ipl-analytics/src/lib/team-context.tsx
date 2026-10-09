import React, { createContext, useContext, useState, useEffect } from "react";
import { PAGE_BG, FALLBACK_ACCENT, franchisePalette, mixHex, withAlpha } from "@/lib/team-palette";

export type TeamCode = "RCB" | "CSK" | "MI" | "KKR" | "SRH" | "RR" | "DC" | "PBKS" | "GT" | "LSG";

export interface TeamTheme {
  id: TeamCode;
  name: string;
  shortName: string;
  city: string;
  accent: string;
  secondary: string;
  glow: string;
  surfaceTint: string;
  bannerImg: string;
  logoImg: string;
  titles: number;
  titleYears: string[];
  motto: string;
  archRival: TeamCode;
}

/**
 * Colours come from the shared franchise palette (lib/team-palette.ts), so the
 * Dugout matches the team page, stats and every other page that colours a team.
 * The glow and surface tint are derived from the accent.
 */
function colours(name: string): Pick<TeamTheme, "accent" | "secondary" | "glow" | "surfaceTint"> {
  const p = franchisePalette(name);
  const accent = p?.accent ?? FALLBACK_ACCENT;
  return {
    accent,
    secondary: p?.secondary ?? accent,
    glow: withAlpha(accent, 0.25),
    surfaceTint: withAlpha(mixHex(accent, PAGE_BG, 0.8), 0.55),
  };
}

export const TEAM_REGISTRY: Record<TeamCode, TeamTheme> = {
  RCB: {
    id: "RCB",
    name: "Royal Challengers Bengaluru",
    shortName: "RCB",
    city: "Bengaluru",
    ...colours("Royal Challengers Bengaluru"),
    bannerImg: "/rcb winner 2026.jpg",
    logoImg: "/rcb logo.png",
    titles: 2,
    titleYears: ["2025", "2026"],
    motto: "Play Bold • Defending Champions",
    archRival: "CSK"
  },
  CSK: {
    id: "CSK",
    name: "Chennai Super Kings",
    shortName: "CSK",
    city: "Chennai",
    ...colours("Chennai Super Kings"),
    bannerImg: "/csk insight.jpg",
    logoImg: "/csk logo.png",
    titles: 5,
    titleYears: ["2010", "2011", "2018", "2021", "2023"],
    motto: "Whistle Podu • The Yellow Brigade",
    archRival: "MI"
  },
  MI: {
    id: "MI",
    name: "Mumbai Indians",
    shortName: "MI",
    city: "Mumbai",
    ...colours("Mumbai Indians"),
    bannerImg: "/wankhede stadium.webp",
    logoImg: "/mi logo.jpg",
    titles: 5,
    titleYears: ["2013", "2015", "2017", "2019", "2020"],
    motto: "Duniya Hila Denge • The Powerhouse",
    archRival: "CSK"
  },
  KKR: {
    id: "KKR",
    name: "Kolkata Knight Riders",
    shortName: "KKR",
    city: "Kolkata",
    ...colours("Kolkata Knight Riders"),
    bannerImg: "/eden gardens stadium.webp",
    logoImg: "/kkr logo.png",
    titles: 3,
    titleYears: ["2012", "2014", "2024"],
    motto: "Korbo Lorbo Jeetbo • Boundary Purists",
    archRival: "SRH"
  },
  SRH: {
    id: "SRH",
    name: "Sunrisers Hyderabad",
    shortName: "SRH",
    city: "Hyderabad",
    ...colours("Sunrisers Hyderabad"),
    bannerImg: "/rajiv gandhi hyderabad stadium.webp",
    logoImg: "/srh logo.jpg",
    titles: 2,
    titleYears: ["2009", "2016"],
    motto: "Orange Army • Boundary Velocity",
    archRival: "KKR"
  },
  RR: {
    id: "RR",
    name: "Rajasthan Royals",
    shortName: "RR",
    city: "Jaipur",
    ...colours("Rajasthan Royals"),
    bannerImg: "/sawai mansingh jaipur stadium.webp",
    logoImg: "/rr logo.png",
    titles: 1,
    titleYears: ["2008"],
    motto: "Halla Bol • First Champions",
    archRival: "PBKS"
  },
  DC: {
    id: "DC",
    name: "Delhi Capitals",
    shortName: "DC",
    city: "Delhi",
    ...colours("Delhi Capitals"),
    bannerImg: "/arun jaitely stadium.webp",
    logoImg: "/dc logo.jpg",
    titles: 0,
    titleYears: [],
    motto: "Roar Macha • Young Gun Firepower",
    archRival: "MI"
  },
  PBKS: {
    id: "PBKS",
    name: "Punjab Kings",
    shortName: "PBKS",
    city: "Mohali",
    ...colours("Punjab Kings"),
    bannerImg: "/mullanpur stadium.webp",
    logoImg: "/pbks logo.png",
    titles: 0,
    titleYears: [],
    motto: "Sadda Punjab • High Ceiling Attack",
    archRival: "RR"
  },
  GT: {
    id: "GT",
    name: "Gujarat Titans",
    shortName: "GT",
    city: "Ahmedabad",
    ...colours("Gujarat Titans"),
    bannerImg: "/narendra modi stadium.webp",
    logoImg: "/gt logo.png",
    titles: 1,
    titleYears: ["2022"],
    motto: "Aava De • Clinical Precision",
    archRival: "CSK"
  },
  LSG: {
    id: "LSG",
    name: "Lucknow Super Giants",
    shortName: "LSG",
    city: "Lucknow",
    ...colours("Lucknow Super Giants"),
    bannerImg: "/lucknow stadium.webp",
    logoImg: "/lsg logo.jpg",
    titles: 0,
    titleYears: [],
    motto: "Gazab Andaz • Express Velocity",
    archRival: "RCB"
  }
};

/** True for the ten current franchise codes (own keys only, so "toString" is not a code). */
export const isTeamCode = (c: string): c is TeamCode => Object.prototype.hasOwnProperty.call(TEAM_REGISTRY, c);

export const TEAM_CODE_TO_SLUG: Record<TeamCode, string> = {
  SRH: "sunrisers-hyderabad",
  CSK: "chennai-super-kings",
  RCB: "royal-challengers-bengaluru",
  MI: "mumbai-indians",
  KKR: "kolkata-knight-riders",
  RR: "rajasthan-royals",
  DC: "delhi-capitals",
  PBKS: "punjab-kings",
  GT: "gujarat-titans",
  LSG: "lucknow-super-giants",
};

export const TEAM_SLUG_MAP: Record<string, TeamCode> = {
  // Uppercase codes
  SRH: "SRH", CSK: "CSK", RCB: "RCB", MI: "MI", KKR: "KKR",
  RR: "RR", DC: "DC", PBKS: "PBKS", GT: "GT", LSG: "LSG",
  // Lowercase codes
  srh: "SRH", csk: "CSK", rcb: "RCB", mi: "MI", kkr: "KKR",
  rr: "RR", dc: "DC", pbks: "PBKS", gt: "GT", lsg: "LSG",
  // URL slugs & team name variations
  "sunrisers-hyderabad": "SRH",
  "sunrisers hyderabad": "SRH",
  "chennai-super-kings": "CSK",
  "chennai super kings": "CSK",
  "royal-challengers-bengaluru": "RCB",
  "royal challengers bengaluru": "RCB",
  "royal-challengers-bangalore": "RCB",
  "royal challengers bangalore": "RCB",
  "mumbai-indians": "MI",
  "mumbai indians": "MI",
  "kolkata-knight-riders": "KKR",
  "kolkata knight riders": "KKR",
  "rajasthan-royals": "RR",
  "rajasthan royals": "RR",
  "delhi-capitals": "DC",
  "delhi capitals": "DC",
  "delhi-daredevils": "DC",
  "delhi daredevils": "DC",
  "punjab-kings": "PBKS",
  "punjab kings": "PBKS",
  "kings-xi-punjab": "PBKS",
  "kings xi punjab": "PBKS",
  "gujarat-titans": "GT",
  "gujarat titans": "GT",
  "lucknow-super-giants": "LSG",
  "lucknow super giants": "LSG",
};

export function resolveTeamCode(input?: string | null): TeamCode | null {
  if (!input) return null;
  const trimmed = input.trim();
  const upper = trimmed.toUpperCase();
  if (isTeamCode(upper)) return upper as TeamCode;
  const normalized = trimmed.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  if (TEAM_SLUG_MAP[normalized]) return TEAM_SLUG_MAP[normalized];
  const spaceNorm = trimmed.toLowerCase().replace(/[^a-z0-9]+/g, " ");
  if (TEAM_SLUG_MAP[spaceNorm]) return TEAM_SLUG_MAP[spaceNorm];
  return null;
}

export const NEUTRAL_THEME = {
  accent: "#8B5CF6",
  secondary: "#06B6D4",
  glow: "rgba(139, 92, 246, 0.25)",
  surfaceTint: "rgba(19, 24, 38, 0.4)"
};

interface TeamContextType {
  selectedTeam: TeamCode | null;
  setSelectedTeam: (team: TeamCode | null) => void;
  theme: TeamTheme | null;
  allTeams: TeamTheme[];
  clearTeam: () => void;
}

const TeamContext = createContext<TeamContextType | undefined>(undefined);

const STORAGE_KEY = "beyond_xi_selected_team";

export function TeamProvider({ children }: { children: React.ReactNode }) {
  const [selectedTeam, setSelectedTeamState] = useState<TeamCode | null>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored && stored in TEAM_REGISTRY) {
        return stored as TeamCode;
      }
    } catch (e) {
      // ignore
    }
    return null;
  });

  const setSelectedTeam = (team: TeamCode | null) => {
    setSelectedTeamState(team);
    try {
      if (team) {
        localStorage.setItem(STORAGE_KEY, team);
      } else {
        localStorage.removeItem(STORAGE_KEY);
      }
    } catch (e) {
      // ignore
    }
  };

  const clearTeam = () => setSelectedTeam(null);

  // Apply CSS tokens to root
  useEffect(() => {
    const root = document.documentElement;
    if (selectedTeam && TEAM_REGISTRY[selectedTeam]) {
      const t = TEAM_REGISTRY[selectedTeam];
      root.dataset.team = selectedTeam;
      root.style.setProperty("--team-accent", t.accent);
      root.style.setProperty("--team-secondary", t.secondary);
      root.style.setProperty("--team-glow", t.glow);
      root.style.setProperty("--team-surface-tint", t.surfaceTint);
    } else {
      delete root.dataset.team;
      root.style.setProperty("--team-accent", NEUTRAL_THEME.accent);
      root.style.setProperty("--team-secondary", NEUTRAL_THEME.secondary);
      root.style.setProperty("--team-glow", NEUTRAL_THEME.glow);
      root.style.setProperty("--team-surface-tint", NEUTRAL_THEME.surfaceTint);
    }
  }, [selectedTeam]);

  const currentTheme = selectedTeam ? TEAM_REGISTRY[selectedTeam] : null;
  const allTeams = Object.values(TEAM_REGISTRY);

  return (
    <TeamContext.Provider
      value={{
        selectedTeam,
        setSelectedTeam,
        theme: currentTheme,
        allTeams,
        clearTeam
      }}
    >
      {children}
    </TeamContext.Provider>
  );
}

export function useTeamTheme() {
  const context = useContext(TeamContext);
  if (!context) {
    throw new Error("useTeamTheme must be used within a TeamProvider");
  }
  return context;
}
