import React, { createContext, useContext, useEffect } from "react";

export type Theme = "dark";
export type ResolvedTheme = "dark";

export interface DarkPalette {
  id: "midnight";
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
];

interface ThemeContextType {
  theme: Theme;
  resolvedTheme: ResolvedTheme;
  darkPalette: "midnight";
  setDarkPalette: (palette: any) => void;
  palettes: DarkPalette[];
  setTheme: (theme: string) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: "dark",
  resolvedTheme: "dark",
  darkPalette: "midnight",
  setDarkPalette: () => {},
  palettes: DARK_PALETTES,
  setTheme: () => {},
  toggleTheme: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // Apply dark class and dark theme variables permanently to documentElement
  useEffect(() => {
    const root = document.documentElement;
    root.classList.add("dark");
    root.setAttribute("data-theme", "dark");
    root.removeAttribute("data-dark-palette");

    const activeConfig = DARK_PALETTES[0];
    root.style.setProperty("--theme-bg-page", activeConfig.bgPage);
    root.style.setProperty("--theme-bg-card", activeConfig.bgCard);
    root.style.setProperty("--theme-border", activeConfig.border);
    root.style.setProperty("--theme-bg-card-subtle", "rgba(255, 255, 255, 0.03)");
    root.style.setProperty("--theme-border-subtle", "rgba(255, 255, 255, 0.04)");
    root.style.setProperty("--palette-glow", "rgba(56, 189, 248, 0.15)");
  }, []);

  return (
    <ThemeContext.Provider
      value={{
        theme: "dark",
        resolvedTheme: "dark",
        darkPalette: "midnight",
        setDarkPalette: () => {},
        palettes: DARK_PALETTES,
        setTheme: () => {},
        toggleTheme: () => {},
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
