import React, { createContext, useContext, useState, useEffect } from "react";

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

export const TEAM_REGISTRY: Record<TeamCode, TeamTheme> = {
  RCB: {
    id: "RCB",
    name: "Royal Challengers Bengaluru",
    shortName: "RCB",
    city: "Bengaluru",
    accent: "#E65A59",
    secondary: "#D9B47A",
    glow: "rgba(230, 90, 89, 0.25)",
    surfaceTint: "rgba(68, 30, 40, 0.45)",
    bannerImg: "/rcb winner 2026.jpg",
    logoImg: "/rcb logo.png",
    titles: 1,
    titleYears: ["2026"],
    motto: "Play Bold • Defending Champions",
    archRival: "CSK"
  },
  CSK: {
    id: "CSK",
    name: "Chennai Super Kings",
    shortName: "CSK",
    city: "Chennai",
    accent: "#EBC75B",
    secondary: "#86B4D8",
    glow: "rgba(235, 199, 91, 0.25)",
    surfaceTint: "rgba(66, 57, 26, 0.45)",
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
    accent: "#3B82F6",
    secondary: "#D4AF37",
    glow: "rgba(59, 130, 246, 0.25)",
    surfaceTint: "rgba(15, 35, 70, 0.45)",
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
    accent: "#A855F7",
    secondary: "#F59E0B",
    glow: "rgba(168, 85, 247, 0.25)",
    surfaceTint: "rgba(45, 20, 60, 0.45)",
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
    accent: "#F97316",
    secondary: "#EAB308",
    glow: "rgba(249, 115, 22, 0.25)",
    surfaceTint: "rgba(65, 30, 15, 0.45)",
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
    accent: "#EC4899",
    secondary: "#3B82F6",
    glow: "rgba(236, 72, 153, 0.25)",
    surfaceTint: "rgba(65, 20, 45, 0.45)",
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
    accent: "#38BDF8",
    secondary: "#EF4444",
    glow: "rgba(56, 189, 248, 0.25)",
    surfaceTint: "rgba(20, 45, 65, 0.45)",
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
    accent: "#F43F5E",
    secondary: "#FBBF24",
    glow: "rgba(244, 63, 94, 0.25)",
    surfaceTint: "rgba(65, 20, 30, 0.45)",
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
    accent: "#06B6D4",
    secondary: "#D97706",
    glow: "rgba(6, 182, 212, 0.25)",
    surfaceTint: "rgba(15, 45, 55, 0.45)",
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
    accent: "#14B8A6",
    secondary: "#F97316",
    glow: "rgba(20, 184, 166, 0.25)",
    surfaceTint: "rgba(15, 50, 45, 0.45)",
    bannerImg: "/lucknow stadium.webp",
    logoImg: "/lsg logo.jpg",
    titles: 0,
    titleYears: [],
    motto: "Gazab Andaz • Express Velocity",
    archRival: "RCB"
  }
};

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
