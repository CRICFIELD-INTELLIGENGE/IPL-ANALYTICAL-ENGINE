import { create } from "zustand";

interface LiveState {
  currentMatchId: number | null;
  setCurrentMatchId: (id: number | null) => void;
  isLive: boolean;
  setIsLive: (isLive: boolean) => void;
}

export type RepresentationMode = "overall" | "current-squad-career" | "franchise-legacy" | "current-squad-for-franchise";

export interface AnalyticsFilters {
  season: string;
  team: string;
  opposition: string;
  venue: string;
  innings: string;
  phase: string;
  batter: string;
  bowler: string;
  bowler_type: string;
  pressure_state: string;
  match_context: string;
  required_rr: string;
  current_rr: string;
  home_away: string;
  playoff: string;
  nationality: string;
  fieldingPosition: string;
  batterHandedness: string;
  representation: RepresentationMode;
}

export interface PrimaryFilters {
  season?: string | number;
  team?: string;
  opponent?: string;
  nationality?: string;
  venue?: string;
}

/**
 * Normalizes filter inputs to ensure wildcard handling
 */
export function buildDimensionalPayload(filters: Record<string, any>): PrimaryFilters {
  const normalize = (val: any) => {
    if (!val || typeof val !== 'string') return 'All';
    const clean = val.trim().toLowerCase();
    return clean === '' || clean.startsWith('all') ? 'All' : val;
  };

  return {
    season: filters.season && filters.season !== 'All Seasons' && filters.season !== 'All' ? filters.season : 'All',
    team: normalize(filters.team ?? filters.batting_team),
    opponent: normalize(filters.opponent ?? filters.opposition ?? filters.bowling_team),
    nationality: normalize(filters.nationality),
    venue: normalize(filters.venue),
  };
}

export interface FilterChainItem {
  key: keyof AnalyticsFilters;
  label: string;
  value: string;
}

export const defaultAnalyticsFilters: AnalyticsFilters = {
  season: "All Seasons",
  team: "All Teams",
  opposition: "All Opponents",
  venue: "All Venues",
  innings: "All Innings",
  phase: "All Phases",
  batter: "All Batters",
  bowler: "All Bowlers",
  bowler_type: "All Bowlers",
  pressure_state: "Standard",
  match_context: "All Matches",
  required_rr: "All",
  current_rr: "All",
  home_away: "All",
  playoff: "All",
  nationality: "all",
  fieldingPosition: "Scoring Area",
  batterHandedness: "All Batters",
  representation: "overall",
};

const filterDefaults: Record<keyof AnalyticsFilters, string> = {
  season: "All Seasons",
  team: "All Teams",
  opposition: "All Opponents",
  venue: "All Venues",
  innings: "All Innings",
  phase: "All Phases",
  batter: "All Batters",
  bowler: "All Bowlers",
  bowler_type: "All Bowlers",
  pressure_state: "Standard",
  match_context: "All Matches",
  required_rr: "All",
  current_rr: "All",
  home_away: "All",
  playoff: "All",
  nationality: "all",
  fieldingPosition: "Scoring Area",
  batterHandedness: "All Batters",
  representation: "overall",
};

interface AnalyticsFilterState {
  filters: AnalyticsFilters;
  chain: FilterChainItem[];
  setFilter: <K extends keyof AnalyticsFilters>(key: K, value: AnalyticsFilters[K]) => void;
  setRepresentation: (representation: RepresentationMode) => void;
  clearFilter: (key: keyof AnalyticsFilters) => void;
  resetFilters: () => void;
}

export const useAnalyticsFilterStore = create<AnalyticsFilterState>((set) => ({
  filters: defaultAnalyticsFilters,
  chain: [],
  setFilter: (key, value) => set((state) => {
    const nextFilters = { ...state.filters, [key]: value };
    const def = filterDefaults[key];
    const chainItem = value && value !== def && value !== "" && value !== "all"
      ? { key, label: value as string, value: value as string }
      : null;
    return {
      filters: nextFilters,
      chain: chainItem
        ? [...state.chain.filter(item => item.key !== key), chainItem]
        : state.chain.filter(item => item.key !== key),
    };
  }),
  setRepresentation: (representation) => set((state) => ({
    filters: { ...state.filters, representation },
    chain: [
      ...state.chain.filter(item => item.key !== "representation"),
      { key: "representation", label: representation, value: representation },
    ],
  })),
  clearFilter: (key) => set((state) => ({
    filters: { ...state.filters, [key]: filterDefaults[key] },
    chain: state.chain.filter(item => item.key !== key),
  })),
  resetFilters: () => set({ filters: defaultAnalyticsFilters, chain: [] }),
}));

export const useLiveStore = create<LiveState>((set) => ({
  currentMatchId: null,
  setCurrentMatchId: (id: number | null) => set({ currentMatchId: id }),
  isLive: false,
  setIsLive: (isLive: boolean) => set({ isLive }),
}));
