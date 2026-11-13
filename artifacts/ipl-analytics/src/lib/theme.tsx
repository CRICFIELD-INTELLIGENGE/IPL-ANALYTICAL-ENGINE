import React, { createContext, useContext, useEffect, useState } from "react";

export type DarkPaletteId = "midnight" | "obsidian" | "cyber" | "carbon";
export type Theme = "dark";
export type ResolvedTheme = "dark";

export interface DarkPalette {
  id: DarkPaletteId;
  name: string;
  tagline: string;
  dotColor: string;
  bgPage: string;
  bgCard: string;
  border: string;
}

export const DARK_PALETTES: DarkPalette[] = [
  {
    id: "midnight",
    name: "Midnight Pitch",
    tagline: "Stadium Night Sky",
    dotColor: "#38BDF8",
    bgPage: "#050814",
    bgCard: "#0B1224",
    border: "rgba(255, 255, 255, 0.09)",
  },
  {
    id: "obsidian",
    name: "OLED Obsidian",
    tagline: "Pure Infinite Black",
    dotColor: "#E4E4E7",
    bgPage: "#000000",
    bgCard: "#09090B",
    border: "rgba(255, 255, 255, 0.12)",
  },
  {
    id: "cyber",
    name: "Cyber Navy",
    tagline: "Deep Neon Blue",
    dotColor: "#06B6D4",
    bgPage: "#040D1A",
    bgCard: "#08182D",
    border: "rgba(56, 189, 248, 0.18)",
  },
  {
    id: "carbon",
    name: "Tactical Carbon",
    tagline: "Graphite Gunmetal",
    dotColor: "#F59E0B",
    bgPage: "#0C0E12",
    bgCard: "#151820",
    border: "rgba(255, 255, 255, 0.09)",
  },
];

interface ThemeContextType {
  theme: Theme;
  resolvedTheme: ResolvedTheme;
  darkPalette: DarkPaletteId;
  setDarkPalette: (palette: DarkPaletteId) => void;
  palettes: DarkPalette[];
  setTheme: (theme: string) => void;
  toggleTheme: () => void;
}

const PALETTE_STORAGE_KEY = "cricfield-dark-palette";

const ThemeContext = createContext<ThemeContextType>({
  theme: "dark",
  resolvedTheme: "dark",
  darkPalette: "midnight",
  setDarkPalette: () => {},
  palettes: DARK_PALETTES,
  setTheme: () => {},
  toggleTheme: () => {},
});

function getStoredPalette(): DarkPaletteId {
  if (typeof window === "undefined") return "midnight";
  try {
    const val = localStorage.getItem(PALETTE_STORAGE_KEY) as DarkPaletteId | null;
    if (val && ["midnight", "obsidian", "cyber", "carbon"].includes(val)) {
      return val;
    }
  } catch {}
  return "midnight";
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [darkPalette, setDarkPaletteState] = useState<DarkPaletteId>(getStoredPalette);

  // Apply dark class and palette variables permanently to documentElement
  useEffect(() => {
    const root = document.documentElement;
    // Permanently enforce dark mode
    root.classList.add("dark");
    root.setAttribute("data-theme", "dark");
    root.setAttribute("data-dark-palette", darkPalette);

    const activeConfig = DARK_PALETTES.find((p) => p.id === darkPalette) || DARK_PALETTES[0];

    // Set centralized semantic variables
    root.style.setProperty("--theme-bg-page", activeConfig.bgPage);
    root.style.setProperty("--theme-bg-card", activeConfig.bgCard);
    root.style.setProperty("--theme-border", activeConfig.border);

    if (darkPalette === "obsidian") {
      root.style.setProperty("--theme-bg-card-subtle", "rgba(255, 255, 255, 0.04)");
      root.style.setProperty("--theme-border-subtle", "rgba(255, 255, 255, 0.06)");
      root.style.setProperty("--palette-glow", "rgba(255, 255, 255, 0.08)");
    } else if (darkPalette === "cyber") {
      root.style.setProperty("--theme-bg-card-subtle", "rgba(14, 165, 233, 0.06)");
      root.style.setProperty("--theme-border-subtle", "rgba(56, 189, 248, 0.08)");
      root.style.setProperty("--palette-glow", "rgba(6, 182, 212, 0.2)");
    } else if (darkPalette === "carbon") {
      root.style.setProperty("--theme-bg-card-subtle", "rgba(255, 255, 255, 0.03)");
      root.style.setProperty("--theme-border-subtle", "rgba(255, 255, 255, 0.04)");
      root.style.setProperty("--palette-glow", "rgba(245, 158, 11, 0.15)");
    } else {
      // midnight
      root.style.setProperty("--theme-bg-card-subtle", "rgba(255, 255, 255, 0.03)");
      root.style.setProperty("--theme-border-subtle", "rgba(255, 255, 255, 0.04)");
      root.style.setProperty("--palette-glow", "rgba(56, 189, 248, 0.15)");
    }
  }, [darkPalette]);

  const setDarkPalette = (newPalette: DarkPaletteId) => {
    setDarkPaletteState(newPalette);
    try {
      localStorage.setItem(PALETTE_STORAGE_KEY, newPalette);
    } catch {}
  };

  // Cycle through dark palettes
  const toggleTheme = () => {
    const currentIndex = DARK_PALETTES.findIndex((p) => p.id === darkPalette);
    const nextIndex = (currentIndex + 1) % DARK_PALETTES.length;
    setDarkPalette(DARK_PALETTES[nextIndex].id);
  };

  const setTheme = (themeName: string) => {
    if (["midnight", "obsidian", "cyber", "carbon"].includes(themeName)) {
      setDarkPalette(themeName as DarkPaletteId);
    }
  };

  return (
    <ThemeContext.Provider
      value={{
        theme: "dark",
        resolvedTheme: "dark",
        darkPalette,
        setDarkPalette,
        palettes: DARK_PALETTES,
        setTheme,
        toggleTheme,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
