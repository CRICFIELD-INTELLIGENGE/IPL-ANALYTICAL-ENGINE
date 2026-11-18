import { useMemo, useState } from "react";
import { AlertTriangle, ChevronDown, ChevronRight, RotateCcw, Search, SlidersHorizontal, X } from "lucide-react";
import {
  DETAILED_STYLE_OPTIONS,
  SITUATIONS,
  sliceList,
} from "@/components/stats-slicing/config";
import {
  MATCH_STATE_FIELDS,
  impliedRequiredRate,
  matchStateProblems,
  type MatchState,
} from "@/components/stats-slicing/match-state";
import { BATTING_POSITIONS } from "@/components/stats-slicing/more-filters";
import { defaultAnalyticsFilters, type AnalyticsFilters, type RepresentationMode } from "@/lib/store";
import { Sheet } from "../../shell";
import type { MobileStatsHook } from "./use-mobile-stats";

type ActiveChip = {
  id: string;
  label: string;
  onRemove: () => void;
};

function toggleCsvSelection(current: string, defaultValue: string, target: string): string {
  const list = sliceList(current);
  const exists = list.includes(target);
  const next = exists ? list.filter((x) => x !== target) : [...list, target];
  return next.length ? next.join(",") : defaultValue;
}

function parseOverRange(raw: string): [string, string] {
  if (!raw || raw === "All") return ["", ""];
  const [a = "", b = ""] = raw.split("-");
  return [a, b];
}

export function MobileSlicingSystem({ state }: { state: MobileStatsHook }) {
  const [open, setOpen] = useState(false);

  // Draft state inside sheet (zero API refetching while typing/selecting until Apply)
  const [draftFilters, setDraftFilters] = useState<AnalyticsFilters>(state.filters);
  const [draftMatchState, setDraftMatchState] = useState<MatchState>(state.matchState);
  const [draftMinBalls, setDraftMinBalls] = useState<number>(state.minSliceBalls);
  const [draftMinInnings, setDraftMinInnings] = useState<number>(state.minInnings);
  const [draftMinMatches, setDraftMinMatches] = useState<number>(state.minMatches);

  const [venueFilterText, setVenueFilterText] = useState("");
  const [batterFilterText, setBatterFilterText] = useState("");
  const [bowlerFilterText, setBowlerFilterText] = useState("");
  const [openSection, setOpenSection] = useState<"A" | "B" | "C" | "D" | "E">("A");

  const openSheet = () => {
    setDraftFilters({ ...state.filters });
    setDraftMatchState({ ...state.matchState });
    setDraftMinBalls(state.minSliceBalls);
    setDraftMinInnings(state.minInnings);
    setDraftMinMatches(state.minMatches);
    setOpenSection("A");
    setOpen(true);
  };

  // Removable applied filter chips for collapsed bar
  const appliedChips = useMemo<ActiveChip[]>(() => {
    const f = state.filters;
    const chips: ActiveChip[] = [];
    if (f.seasonFrom || f.seasonTo) {
      chips.push({
        id: "seasonRange",
        label: `Years ${f.seasonFrom || "2008"}–${f.seasonTo || "2026"}`,
        onRemove: () => {
          state.setFilter("seasonFrom", "");
          state.setFilter("seasonTo", "");
        },
      });
    } else if (f.season !== "All Seasons") {
      chips.push({
        id: "season",
        label: `Season ${f.season}`,
        onRemove: () => state.clearFilter("season"),
      });
    }
    for (const t of sliceList(f.team)) {
      chips.push({
        id: `team:${t}`,
        label: `Team ${t}`,
        onRemove: () => state.setFilter("team", toggleCsvSelection(f.team, defaultAnalyticsFilters.team, t)),
      });
    }
    for (const o of sliceList(f.opposition)) {
      chips.push({
        id: `opp:${o}`,
        label: `vs ${o}`,
        onRemove: () => state.setFilter("opposition", toggleCsvSelection(f.opposition, defaultAnalyticsFilters.opposition, o)),
      });
    }
    if (f.venue !== "All Venues") {
      chips.push({
        id: "venue",
        label: f.venue.split(",")[0],
        onRemove: () => state.clearFilter("venue"),
      });
    }
    if (f.nationality !== "all") {
      chips.push({
        id: "nationality",
        label: f.nationality === "indian" ? "Indian" : "Overseas",
        onRemove: () => state.clearFilter("nationality"),
      });
    }
    if (f.innings !== "All Innings") {
      chips.push({
        id: "innings",
        label: /1st|^1$/.test(f.innings) ? "1st Innings" : "2nd Chasing",
        onRemove: () => state.clearFilter("innings"),
      });
    }
    if (f.match_context !== "All Matches") {
      chips.push({
        id: "context",
        label: f.match_context,
        onRemove: () => state.clearFilter("match_context"),
      });
    }
    if (f.matchResult !== "all") {
      chips.push({
        id: "result",
        label: `Result: ${f.matchResult}`,
        onRemove: () => state.setFilter("matchResult", "all"),
      });
    }
    if (f.representation !== "overall") {
      chips.push({
        id: "rep",
        label: "Franchise Legacy",
        onRemove: () => state.clearFilter("representation"),
      });
    }
    if (f.phase !== "All Phases") {
      chips.push({
        id: "phase",
        label: f.phase,
        onRemove: () => state.clearFilter("phase"),
      });
    }
    if (f.overRange !== "All") {
      chips.push({
        id: "overRange",
        label: `Overs ${f.overRange}`,
        onRemove: () => state.setFilter("overRange", "All"),
      });
    }
    if (f.bowler_type !== "All Bowlers") {
      chips.push({
        id: "bowlerType",
        label: `vs ${f.bowler_type}`,
        onRemove: () => state.clearFilter("bowler_type"),
      });
    }
    if (f.bowlStyle !== "all") {
      const styleLabel = DETAILED_STYLE_OPTIONS.find(([id]) => id === f.bowlStyle)?.[1] ?? f.bowlStyle;
      chips.push({
        id: "bowlStyle",
        label: styleLabel,
        onRemove: () => state.setFilter("bowlStyle", "all"),
      });
    }
    if (f.batterHandedness !== "All Batters") {
      chips.push({
        id: "hand",
        label: `Batter ${f.batterHandedness}`,
        onRemove: () => state.clearFilter("batterHandedness"),
      });
    }
    if (f.batter !== "All Batters") {
      chips.push({
        id: "batter",
        label: `vs ${state.formatName(f.batter)}`,
        onRemove: () => state.clearFilter("batter"),
      });
    }
    if (f.bowler !== "All Bowlers") {
      chips.push({
        id: "bowler",
        label: `vs ${state.formatName(f.bowler)}`,
        onRemove: () => state.clearFilter("bowler"),
      });
    }
    if (f.pressure_state !== defaultAnalyticsFilters.pressure_state && f.pressure_state !== "All Pressure") {
      chips.push({
        id: "pressure",
        label: f.pressure_state,
        onRemove: () => state.clearFilter("pressure_state"),
      });
    }
    if (f.battingPosition !== "all") {
      const posLabel = BATTING_POSITIONS.find(([v]) => v === f.battingPosition)?.[1] ?? f.battingPosition;
      chips.push({
        id: "batPos",
        label: posLabel,
        onRemove: () => state.setFilter("battingPosition", "all"),
      });
    }
    if (state.minSliceBalls > 0) {
      chips.push({
        id: "minBalls",
        label: `Min ${state.minSliceBalls} balls`,
        onRemove: () => state.setMinSliceBalls(0),
      });
    }
    if (state.minInnings > 0) {
      chips.push({
        id: "minInnings",
        label: `Min ${state.minInnings} inns`,
        onRemove: () => state.setMinInnings(0),
      });
    }
    if (state.minMatches > 0) {
      chips.push({
        id: "minMatches",
        label: `Min ${state.minMatches} mat`,
        onRemove: () => state.setMinMatches(0),
      });
    }
    for (const field of MATCH_STATE_FIELDS) {
      const minKey = `min${field.key}` as keyof MatchState;
      const maxKey = `max${field.key}` as keyof MatchState;
      const minV = state.matchState[minKey];
      const maxV = state.matchState[maxKey];
      if (minV !== undefined || maxV !== undefined) {
        const range =
          minV !== undefined && maxV !== undefined
            ? `${minV}–${maxV}`
            : minV !== undefined
              ? `≥${minV}`
              : `≤${maxV}`;
        chips.push({
          id: `ms:${field.key}`,
          label: `${field.label} ${range}`,
          onRemove: () =>
            state.setMatchState((prev) => {
              const next = { ...prev };
              delete next[minKey];
              delete next[maxKey];
              return next;
            }),
        });
      }
    }
    return chips;
  }, [state]);

  // Scope badge + real 1-line Filter Story (never invented numbers)
  const scopeBadge = useMemo(() => {
    const f = state.filters;
    const seasonPart = f.seasonFrom || f.seasonTo
      ? `${f.seasonFrom || "08"}–${f.seasonTo || "26"}`
      : f.season === "All Seasons"
        ? "All Seasons"
        : f.season;
    const teamPart = f.team === "All Teams" ? "All Teams" : f.team.split(",").slice(0, 2).join("+");
    return `${seasonPart} · ${teamPart}`;
  }, [state.filters]);

  const filterStory = useMemo(() => {
    const tab = state.activeTab;
    const countLabel =
      tab === "bowlers"
        ? `${state.activeData.bowlers.length} qualifying bowlers`
        : tab === "teams"
          ? `${state.teamCards.length} franchises`
          : tab === "venues"
            ? `${state.venueCards.length} venues`
            : `${state.activeData.batters.length} qualifying batters`;

    if (state.slicedApiUnavailable) {
      return `Showing ${scopeBadge} · ${state.activeMatches.length} matches · Telemetry query endpoint unavailable in current mode.`;
    }
    const minNote =
      state.minSliceBalls > 0 || state.minInnings > 0 || state.minMatches > 0
        ? ` · Min thresholds applied`
        : "";
    return `Scope: ${scopeBadge} · ${state.activeMatches.length} matches · ${countLabel}${minNote}`;
  }, [
    state.activeTab,
    state.activeData.batters.length,
    state.activeData.bowlers.length,
    state.teamCards.length,
    state.venueCards.length,
    state.activeMatches.length,
    state.slicedApiUnavailable,
    state.minSliceBalls,
    state.minInnings,
    state.minMatches,
    scopeBadge,
  ]);

  // Draft validation
  const draftProblems = useMemo(() => {
    const [a, b] = parseOverRange(draftFilters.overRange);
    const overTuple: [number, number] | null = a && b ? [Number(a), Number(b)] : null;
    return matchStateProblems(draftMatchState, draftFilters.innings, overTuple);
  }, [draftMatchState, draftFilters.innings, draftFilters.overRange]);
  const draftImpliedRR = useMemo(() => impliedRequiredRate(draftMatchState), [draftMatchState]);

  const draftActiveCount = useMemo(() => {
    let n = 0;
    const keys = Object.keys(defaultAnalyticsFilters) as (keyof AnalyticsFilters)[];
    for (const k of keys) {
      if (draftFilters[k] !== defaultAnalyticsFilters[k]) n += 1;
    }
    if (draftMinBalls > 0) n += 1;
    if (draftMinInnings > 0) n += 1;
    if (draftMinMatches > 0) n += 1;
    n += Object.keys(draftMatchState).length;
    return n;
  }, [draftFilters, draftMatchState, draftMinBalls, draftMinInnings, draftMinMatches]);

  const applyDraft = () => {
    if (draftProblems.length > 0) return;
    state.setFilters(draftFilters);
    state.setMatchState(draftMatchState);
    state.setMinSliceBalls(draftMinBalls);
    state.setMinInnings(draftMinInnings);
    state.setMinMatches(draftMinMatches);
    setOpen(false);
  };

  const clearDraft = () => {
    setDraftFilters({ ...defaultAnalyticsFilters });
    setDraftMatchState({});
    setDraftMinBalls(0);
    setDraftMinInnings(0);
    setDraftMinMatches(0);
  };

  const [overFrom, overTo] = parseOverRange(draftFilters.overRange);
  const setOverBounds = (from: string, to: string) => {
    const a = from.trim();
    const b = to.trim();
    if (!a && !b) {
      setDraftFilters((p) => ({ ...p, overRange: "All" }));
      return;
    }
    const lo = Math.max(1, Math.min(20, Number(a || 1)));
    const hi = Math.max(lo, Math.min(20, Number(b || 20)));
    setDraftFilters((p) => ({ ...p, overRange: `${lo}-${hi}`, phase: "All Phases" }));
  };

  const filteredVenues = useMemo(() => {
    const q = venueFilterText.trim().toLowerCase();
    return state.venueOptions.filter((v) => !q || v.toLowerCase().includes(q)).slice(0, 40);
  }, [state.venueOptions, venueFilterText]);

  const filteredBatters = useMemo(() => {
    const q = batterFilterText.trim().toLowerCase();
    return state.batterOptionNames.filter((n) => !q || n.toLowerCase().includes(q) || state.formatName(n).toLowerCase().includes(q)).slice(0, 35);
  }, [state.batterOptionNames, batterFilterText, state]);

  const filteredBowlers = useMemo(() => {
    const q = bowlerFilterText.trim().toLowerCase();
    return state.bowlerOptionNames.filter((n) => !q || n.toLowerCase().includes(q) || state.formatName(n).toLowerCase().includes(q)).slice(0, 35);
  }, [state.bowlerOptionNames, bowlerFilterText, state]);

  const fixtureOnlyTab = state.activeTab === "teams" || state.activeTab === "venues";

  return (
    <div className="ms3-slicing-wrap" data-testid="ms3-slicing-wrap">
      <div className="ms3-slicing-bar">
        <button
          type="button"
          className="ms3-slicing-trigger"
          onClick={openSheet}
          aria-expanded={open}
          data-testid="ms3-slicing-open"
        >
          <SlidersHorizontal size={14} style={{ color: "var(--ms-accent)", flexShrink: 0 }} />
          <span style={{ whiteSpace: "nowrap" }}>Dimensional Slicing</span>
          {appliedChips.length > 0 && (
            <span
              style={{
                padding: "1px 6px",
                borderRadius: 999,
                background: "var(--ms-accent)",
                color: "#050816",
                font: "800 10px/1.3 var(--m-mono)",
                flexShrink: 0,
              }}
            >
              {appliedChips.length}
            </span>
          )}
          <span
            style={{
              marginLeft: "auto",
              font: "600 11px/1.2 var(--m-ui)",
              color: "var(--ms-muted)",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {scopeBadge}
          </span>
          <ChevronDown size={14} style={{ color: "var(--ms-muted)", flexShrink: 0 }} />
        </button>

        {appliedChips.length > 0 && (
          <button
            type="button"
            className="ms3-clear-btn"
            onClick={state.resetAllFilters}
            data-testid="ms3-slicing-clear-bar"
          >
            <RotateCcw size={11} />
            Clear
          </button>
        )}
      </div>

      {appliedChips.length > 0 && (
        <div className="ms3-hscroll" aria-label="Applied dimensional slices">
          {appliedChips.map((chip) => (
            <button
              key={chip.id}
              type="button"
              className="ms3-chip"
              onClick={chip.onRemove}
              title={`Remove ${chip.label}`}
            >
              <span>{chip.label}</span>
              <X size={11} aria-hidden="true" />
            </button>
          ))}
        </div>
      )}

      <div className="ms3-story-line" data-testid="ms3-filter-story">
        <span>{filterStory}</span>
      </div>

      {open && (
        <Sheet title="Universal Dimensional Slicing" onClose={() => setOpen(false)}>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {fixtureOnlyTab && (
              <div
                style={{
                  padding: "8px 10px",
                  borderRadius: 8,
                  border: "1px solid var(--ms-border)",
                  background: "var(--ms-muted-bg)",
                  font: "500 11px/1.35 var(--m-ui)",
                  color: "var(--ms-muted)",
                }}
              >
                {state.activeTab === "teams" ? "Teams" : "Venues"} operates at fixture scope (Season, Team, Opposition, Venue, Match Stage). Ball-level groups also apply when switching to Batters, Bowlers, or Records.
              </div>
            )}

            {/* Accordion Groups A - E */}
            {(
              [
                ["A", "Group A — Competition & Scope", "Season, Range, Franchise, Opposition, Venue, Nationality"],
                ["B", "Group B — Match Context", "Innings, Stage, Result, Representation"],
                ["C", "Group C — Ball & Player Matchups", "Phase, Overs, Bowling Type/Style, Batter/Bowler Faced"],
                ["D", "Group D — Situations & Pressure", "7 situational presets (Pressure rules & Chase telemetry)"],
                ["E", "Group E — Advanced Conditions", "Batting Pos, Min Sample thresholds & Chase Match State"],
              ] as const
            ).map(([key, heading, sub]) => {
              const isOpen = openSection === key;
              return (
                <div
                  key={key}
                  style={{
                    borderRadius: 10,
                    border: "1px solid var(--ms-border)",
                    background: "var(--ms-surface)",
                    overflow: "hidden",
                  }}
                >
                  <button
                    type="button"
                    onClick={() => setOpenSection(key)}
                    style={{
                      width: "100%",
                      padding: "10px 12px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 8,
                      textAlign: "left",
                      background: isOpen ? "var(--ms-accent-soft)" : "transparent",
                    }}
                    data-testid={`ms3-group-${key}`}
                  >
                    <div style={{ minWidth: 0 }}>
                      <div style={{ font: "700 12.5px/1.2 var(--m-display)", color: "var(--ms-text)" }}>{heading}</div>
                      <div style={{ font: "500 10.5px/1.25 var(--m-ui)", color: "var(--ms-muted)", marginTop: 2 }}>{sub}</div>
                    </div>
                    {isOpen ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
                  </button>

                  {isOpen && (
                    <div style={{ padding: 12, display: "flex", flexDirection: "column", gap: 11, borderTop: "1px solid var(--ms-border)" }}>
                      {key === "A" && (() => {
                        const rangeActive = !!(draftFilters.seasonFrom || draftFilters.seasonTo);
                        const singleActive = !rangeActive && draftFilters.season !== "All Seasons";
                        const fromOptions = state.seasonList
                          .slice()
                          .reverse()
                          .filter((yr) => !draftFilters.seasonTo || yr <= draftFilters.seasonTo);
                        const toOptions = state.seasonList.filter(
                          (yr) => !draftFilters.seasonFrom || yr >= draftFilters.seasonFrom,
                        );
                        return (
                        <>
                          <div>
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 6, marginBottom: 6 }}>
                              <span className="ms3-scope-label">Season or Range</span>
                              {rangeActive ? (
                                <span
                                  data-testid="ms3-season-mode-badge"
                                  style={{
                                    display: "inline-flex",
                                    alignItems: "center",
                                    gap: 5,
                                    font: "700 10px/1 var(--m-mono)",
                                    color: "var(--ms-accent)",
                                  }}
                                >
                                  Range Active ({draftFilters.seasonFrom || "Start"}–{draftFilters.seasonTo || "End"})
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setDraftFilters((p) => ({ ...p, seasonFrom: "", seasonTo: "" }))
                                    }
                                    style={{
                                      padding: "2px 6px",
                                      borderRadius: 999,
                                      border: "1px solid var(--ms-border-strong)",
                                      background: "var(--ms-surface-2)",
                                      color: "var(--ms-text)",
                                      font: "700 9.5px/1.1 var(--m-mono)",
                                    }}
                                  >
                                    Clear
                                  </button>
                                </span>
                              ) : singleActive ? (
                                <span
                                  data-testid="ms3-season-mode-badge"
                                  style={{
                                    display: "inline-flex",
                                    alignItems: "center",
                                    gap: 5,
                                    font: "700 10px/1 var(--m-mono)",
                                    color: "var(--ms-accent)",
                                  }}
                                >
                                  Season {draftFilters.season} Active
                                </span>
                              ) : (
                                <span
                                  data-testid="ms3-season-mode-badge"
                                  style={{ font: "600 10px/1 var(--m-mono)", color: "var(--ms-muted)" }}
                                >
                                  All Seasons Active
                                </span>
                              )}
                            </div>

                            <select
                              className="ms3-select"
                              aria-label="Single Season"
                              data-active={singleActive}
                              data-testid="ms3-single-season"
                              value={rangeActive ? "__select__" : draftFilters.season}
                              onChange={(e) => {
                                const val = e.target.value;
                                if (val === "__select__") return;
                                setDraftFilters((p) => ({
                                  ...p,
                                  season: val,
                                  seasonFrom: "",
                                  seasonTo: "",
                                }));
                              }}
                            >
                              {rangeActive && <option value="__select__">Select a Season</option>}
                              <option value="All Seasons">All Seasons (2008–2026)</option>
                              {state.seasonList.map((yr) => (
                                <option key={yr} value={yr}>{yr}</option>
                              ))}
                            </select>

                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginTop: 6 }}>
                              <select
                                className="ms3-select"
                                aria-label="Season From"
                                data-active={rangeActive && !!draftFilters.seasonFrom}
                                data-testid="ms3-season-from"
                                value={draftFilters.seasonFrom}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setDraftFilters((p) => ({
                                    ...p,
                                    season: val ? "All Seasons" : p.season,
                                    seasonFrom: val,
                                  }));
                                }}
                              >
                                <option value="">From Year (Any)</option>
                                {fromOptions.map((yr) => (
                                  <option key={yr} value={yr}>{yr}</option>
                                ))}
                              </select>
                              <select
                                className="ms3-select"
                                aria-label="Season To"
                                data-active={rangeActive && !!draftFilters.seasonTo}
                                data-testid="ms3-season-to"
                                value={draftFilters.seasonTo}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setDraftFilters((p) => ({
                                    ...p,
                                    season: val ? "All Seasons" : p.season,
                                    seasonTo: val,
                                  }));
                                }}
                              >
                                <option value="">To Year (Any)</option>
                                {toOptions.map((yr) => (
                                  <option key={yr} value={yr}>{yr}</option>
                                ))}
                              </select>
                            </div>
                          </div>

                          <div>
                            <div className="ms3-scope-label" style={{ marginBottom: 5 }}>Franchise (Multi-select)</div>
                            <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                              <button
                                type="button"
                                className="ms3-pill"
                                data-active={draftFilters.team === "All Teams"}
                                onClick={() => setDraftFilters((p) => ({ ...p, team: "All Teams" }))}
                              >
                                All
                              </button>
                              {state.teamOptions.map((t) => {
                                const on = sliceList(draftFilters.team).includes(t);
                                return (
                                  <button
                                    key={t}
                                    type="button"
                                    className="ms3-pill"
                                    data-active={on}
                                    onClick={() =>
                                      setDraftFilters((p) => ({
                                        ...p,
                                        team: toggleCsvSelection(p.team, "All Teams", t),
                                      }))
                                    }
                                  >
                                    {t}
                                  </button>
                                );
                              })}
                            </div>
                          </div>

                          <div>
                            <div className="ms3-scope-label" style={{ marginBottom: 5 }}>Opposition (Multi-select)</div>
                            <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                              <button
                                type="button"
                                className="ms3-pill"
                                data-active={draftFilters.opposition === "All Opponents"}
                                onClick={() => setDraftFilters((p) => ({ ...p, opposition: "All Opponents" }))}
                              >
                                All
                              </button>
                              {state.teamOptions.map((t) => {
                                const on = sliceList(draftFilters.opposition).includes(t);
                                return (
                                  <button
                                    key={t}
                                    type="button"
                                    className="ms3-pill"
                                    data-active={on}
                                    onClick={() =>
                                      setDraftFilters((p) => ({
                                        ...p,
                                        opposition: toggleCsvSelection(p.opposition, "All Opponents", t),
                                      }))
                                    }
                                  >
                                    {t}
                                  </button>
                                );
                              })}
                            </div>
                          </div>

                          <div>
                            <div className="ms3-scope-label" style={{ marginBottom: 5 }}>Venue (Search & Select)</div>
                            <div className="ms3-search-wrap" style={{ marginBottom: 6 }}>
                              <Search size={13} className="ms3-search-icon" />
                              <input
                                type="text"
                                className="ms3-input ms3-input--search"
                                placeholder="Filter stadiums..."
                                value={venueFilterText}
                                onChange={(e) => setVenueFilterText(e.target.value)}
                              />
                            </div>
                            <select
                              className="ms3-select"
                              value={draftFilters.venue}
                              onChange={(e) => setDraftFilters((p) => ({ ...p, venue: e.target.value }))}
                            >
                              <option value="All Venues">All Venues</option>
                              {filteredVenues.map((v) => (
                                <option key={v} value={v}>{v}</option>
                              ))}
                            </select>
                          </div>

                          <div>
                            <div className="ms3-scope-label" style={{ marginBottom: 5 }}>Nationality</div>
                            <div style={{ display: "flex", gap: 6 }}>
                              {(
                                [
                                  ["all", "All Players"],
                                  ["indian", "Indian"],
                                  ["overseas", "Overseas"],
                                ] as const
                              ).map(([val, lbl]) => (
                                <button
                                  key={val}
                                  type="button"
                                  className="ms3-pill"
                                  data-active={draftFilters.nationality === val}
                                  onClick={() => setDraftFilters((p) => ({ ...p, nationality: val }))}
                                >
                                  {lbl}
                                </button>
                              ))}
                            </div>
                          </div>
                        </>
                        );
                      })()}

                      {key === "B" && (
                        <>
                          <div>
                            <div className="ms3-scope-label" style={{ marginBottom: 5 }}>Innings</div>
                            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                              {(
                                [
                                  ["All Innings", "All Innings"],
                                  ["1st Innings (Setting)", "1st Setting"],
                                  ["2nd Innings (Chasing)", "2nd Chasing"],
                                ] as const
                              ).map(([val, lbl]) => {
                                const testKey = val.includes("1st") ? "1" : val.includes("2nd") ? "2" : "all";
                                return (
                                  <button
                                    key={val}
                                    type="button"
                                    className="ms3-pill"
                                    data-active={draftFilters.innings === val}
                                    onClick={() => setDraftFilters((p) => ({ ...p, innings: val }))}
                                    data-testid={`ms3-innings-${testKey}`}
                                  >
                                    {lbl}
                                  </button>
                                );
                              })}
                            </div>
                          </div>

                          <div>
                            <div className="ms3-scope-label" style={{ marginBottom: 5 }}>Match Stage</div>
                            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                              {["All Matches", "League Stage", "Playoffs", "Final"].map((stage) => (
                                <button
                                  key={stage}
                                  type="button"
                                  className="ms3-pill"
                                  data-active={draftFilters.match_context === stage}
                                  onClick={() => setDraftFilters((p) => ({ ...p, match_context: stage }))}
                                >
                                  {stage}
                                </button>
                              ))}
                            </div>
                          </div>

                          <div>
                            <div className="ms3-scope-label" style={{ marginBottom: 5 }}>Match Result</div>
                            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                              {(
                                [
                                  ["all", "Any Result"],
                                  ["won", "Won"],
                                  ["lost", "Lost"],
                                  ["no result", "No Result"],
                                ] as const
                              ).map(([val, lbl]) => (
                                <button
                                  key={val}
                                  type="button"
                                  className="ms3-pill"
                                  data-active={draftFilters.matchResult === val}
                                  onClick={() => setDraftFilters((p) => ({ ...p, matchResult: val }))}
                                >
                                  {lbl}
                                </button>
                              ))}
                            </div>
                          </div>

                          <div>
                            <div className="ms3-scope-label" style={{ marginBottom: 5 }}>Representation</div>
                            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                              {(
                                [
                                  ["overall", "Overall Career"],
                                  ["franchise-legacy", "Franchise Legacy"],
                                ] as [RepresentationMode, string][]
                              ).map(([val, lbl]) => (
                                <button
                                  key={val}
                                  type="button"
                                  className="ms3-pill"
                                  data-active={draftFilters.representation === val}
                                  onClick={() => setDraftFilters((p) => ({ ...p, representation: val }))}
                                >
                                  {lbl}
                                </button>
                              ))}
                            </div>
                          </div>
                        </>
                      )}

                      {key === "C" && (
                        <>
                          <div>
                            <div className="ms3-scope-label" style={{ marginBottom: 5 }}>Innings Phase</div>
                            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                              {["All Phases", "Powerplay", "Middle", "Death"].map((ph) => (
                                <button
                                  key={ph}
                                  type="button"
                                  className="ms3-pill"
                                  data-active={draftFilters.phase === ph}
                                  onClick={() => setDraftFilters((p) => ({ ...p, phase: ph, overRange: "All" }))}
                                >
                                  {ph}
                                </button>
                              ))}
                            </div>
                          </div>

                          <div>
                            <div className="ms3-scope-label" style={{ marginBottom: 5 }}>Custom Over Range (1–20)</div>
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                              <input
                                type="number"
                                min={1}
                                max={20}
                                placeholder="From over (e.g. 7)"
                                className="ms3-input"
                                value={overFrom}
                                onChange={(e) => setOverBounds(e.target.value, overTo)}
                              />
                              <input
                                type="number"
                                min={1}
                                max={20}
                                placeholder="To over (e.g. 15)"
                                className="ms3-input"
                                value={overTo}
                                onChange={(e) => setOverBounds(overFrom, e.target.value)}
                              />
                            </div>
                          </div>

                          <div>
                            <div className="ms3-scope-label" style={{ marginBottom: 5 }}>Bowler Type & Detailed Style</div>
                            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 6 }}>
                              {["All Bowlers", "Pace", "Spin"].map((bt) => (
                                <button
                                  key={bt}
                                  type="button"
                                  className="ms3-pill"
                                  data-active={draftFilters.bowler_type === bt}
                                  onClick={() => setDraftFilters((p) => ({ ...p, bowler_type: bt }))}
                                >
                                  {bt}
                                </button>
                              ))}
                            </div>
                            <select
                              className="ms3-select"
                              value={draftFilters.bowlStyle}
                              onChange={(e) => setDraftFilters((p) => ({ ...p, bowlStyle: e.target.value }))}
                            >
                              {DETAILED_STYLE_OPTIONS.map(([id, lbl]) => (
                                <option key={id} value={id}>{lbl}</option>
                              ))}
                            </select>
                          </div>

                          <div>
                            <div className="ms3-scope-label" style={{ marginBottom: 5 }}>Batter Handedness</div>
                            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                              {["All Batters", "RHB", "LHB"].map((hand) => (
                                <button
                                  key={hand}
                                  type="button"
                                  className="ms3-pill"
                                  data-active={draftFilters.batterHandedness === hand}
                                  onClick={() => setDraftFilters((p) => ({ ...p, batterHandedness: hand }))}
                                >
                                  {hand === "All Batters" ? "All Hands" : `vs ${hand}`}
                                </button>
                              ))}
                            </div>
                          </div>

                          <div>
                            <div className="ms3-scope-label" style={{ marginBottom: 5 }}>Batter Faced</div>
                            <div className="ms3-search-wrap" style={{ marginBottom: 5 }}>
                              <Search size={13} className="ms3-search-icon" />
                              <input
                                type="text"
                                className="ms3-input ms3-input--search"
                                placeholder="Search batter name..."
                                value={batterFilterText}
                                onChange={(e) => setBatterFilterText(e.target.value)}
                              />
                            </div>
                            <select
                              className="ms3-select"
                              value={draftFilters.batter}
                              onChange={(e) => setDraftFilters((p) => ({ ...p, batter: e.target.value }))}
                            >
                              <option value="All Batters">All Batters Faced</option>
                              {filteredBatters.map((name) => (
                                <option key={name} value={name}>{state.formatName(name)}</option>
                              ))}
                            </select>
                          </div>

                          <div>
                            <div className="ms3-scope-label" style={{ marginBottom: 5 }}>Bowler Faced</div>
                            <div className="ms3-search-wrap" style={{ marginBottom: 5 }}>
                              <Search size={13} className="ms3-search-icon" />
                              <input
                                type="text"
                                className="ms3-input ms3-input--search"
                                placeholder="Search bowler name..."
                                value={bowlerFilterText}
                                onChange={(e) => setBowlerFilterText(e.target.value)}
                              />
                            </div>
                            <select
                              className="ms3-select"
                              value={draftFilters.bowler}
                              onChange={(e) => setDraftFilters((p) => ({ ...p, bowler: e.target.value }))}
                            >
                              <option value="All Bowlers">All Bowlers Faced</option>
                              {filteredBowlers.map((name) => (
                                <option key={name} value={name}>{state.formatName(name)}</option>
                              ))}
                            </select>
                          </div>
                        </>
                      )}

                      {key === "D" && (
                        <>
                          <div style={{ font: "500 11px/1.35 var(--m-ui)", color: "var(--ms-muted)" }}>
                            <strong>Rule-based ball pressure</strong> slices deliveries by pressure tag, while <strong>Chase & Match-State</strong> presets slice verified live chase telemetry via <code>/api/stats/query</code>.
                          </div>
                          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                            {SITUATIONS.map((sit) => {
                              const scopeActive = Object.entries(sit.scope).every(
                                ([k, v]) => (draftFilters as unknown as Record<string, unknown>)[k] === v,
                              );
                              const msActive = sit.ms
                                ? Object.entries(sit.ms).every(([k, v]) => (draftMatchState as Record<string, unknown>)[k] === v)
                                : true;
                              const on = sit.id !== "all" && scopeActive && msActive;
                              return (
                                <button
                                  key={sit.id}
                                  type="button"
                                  onClick={() => {
                                    setDraftFilters((p) => ({
                                      ...p,
                                      pressure_state: defaultAnalyticsFilters.pressure_state,
                                      phase: "All Phases",
                                      innings: "All Innings",
                                      ...sit.scope,
                                    }));
                                    setDraftMatchState(sit.ms ? { ...sit.ms } : {});
                                  }}
                                  style={{
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "space-between",
                                    gap: 8,
                                    padding: "9px 11px",
                                    borderRadius: 8,
                                    border: `1px solid ${on ? "var(--ms-accent)" : "var(--ms-border)"}`,
                                    background: on ? "var(--ms-accent-soft)" : "var(--ms-muted-bg)",
                                    color: "var(--ms-text)",
                                    textAlign: "left",
                                  }}
                                >
                                  <div>
                                    <div style={{ font: "700 12px/1.2 var(--m-ui)" }}>{sit.label}</div>
                                    <div style={{ font: "500 10.5px/1.25 var(--m-ui)", color: "var(--ms-muted)", marginTop: 2 }}>
                                      {sit.ms ? "Chase & match-state telemetry preset" : "Rule-based pressure & phase slice"}
                                    </div>
                                  </div>
                                  <span style={{ font: "700 10px/1 var(--m-mono)", color: on ? "var(--ms-accent)" : "var(--ms-muted)" }}>
                                    {on ? "ACTIVE" : "SELECT"}
                                  </span>
                                </button>
                              );
                            })}
                          </div>
                        </>
                      )}

                      {key === "E" && (
                        <>
                          <div>
                            <div className="ms3-scope-label" style={{ marginBottom: 5 }}>Batting Position</div>
                            <select
                              className="ms3-select"
                              value={draftFilters.battingPosition}
                              onChange={(e) => setDraftFilters((p) => ({ ...p, battingPosition: e.target.value }))}
                            >
                              {BATTING_POSITIONS.map(([val, lbl]) => (
                                <option key={val} value={val}>{lbl}</option>
                              ))}
                            </select>
                          </div>

                          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 6 }}>
                            <div>
                              <div className="ms3-scope-label" style={{ marginBottom: 4 }}>Min Balls</div>
                              <input
                                type="number"
                                min={0}
                                step={10}
                                className="ms3-input"
                                value={draftMinBalls || ""}
                                placeholder="0"
                                onChange={(e) => setDraftMinBalls(Math.max(0, Number(e.target.value || 0)))}
                              />
                            </div>
                            <div>
                              <div className="ms3-scope-label" style={{ marginBottom: 4 }}>Min Inns</div>
                              <input
                                type="number"
                                min={0}
                                step={1}
                                className="ms3-input"
                                value={draftMinInnings || ""}
                                placeholder="0"
                                onChange={(e) => setDraftMinInnings(Math.max(0, Number(e.target.value || 0)))}
                              />
                            </div>
                            <div>
                              <div className="ms3-scope-label" style={{ marginBottom: 4 }}>Min Matches</div>
                              <input
                                type="number"
                                min={0}
                                step={1}
                                className="ms3-input"
                                value={draftMinMatches || ""}
                                placeholder="0"
                                onChange={(e) => setDraftMinMatches(Math.max(0, Number(e.target.value || 0)))}
                              />
                            </div>
                          </div>

                          <div style={{ borderTop: "1px solid var(--ms-border)", paddingTop: 10 }}>
                            <div className="ms3-scope-label" style={{ marginBottom: 6 }}>
                              Ball-State Constraints (Min / Max)
                            </div>
                            <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                              {MATCH_STATE_FIELDS.map((f) => {
                                const minKey = `min${f.key}` as keyof MatchState;
                                const maxKey = `max${f.key}` as keyof MatchState;
                                const minV = draftMatchState[minKey] ?? "";
                                const maxV = draftMatchState[maxKey] ?? "";
                                return (
                                  <div
                                    key={f.key}
                                    style={{
                                      display: "grid",
                                      gridTemplateColumns: "1.2fr 0.9fr 0.9fr",
                                      alignItems: "center",
                                      gap: 6,
                                    }}
                                  >
                                    <span style={{ font: "600 11px/1.2 var(--m-ui)", color: "var(--ms-text)" }}>
                                      {f.label}{f.chase ? " (Chase)" : ""}
                                    </span>
                                    <input
                                      type="number"
                                      min={0}
                                      max={f.max}
                                      step={f.step ?? 1}
                                      className="ms3-input"
                                      style={{ height: 34, fontSize: 12 }}
                                      placeholder="Min"
                                      aria-label={`${f.label} min`}
                                      value={minV}
                                      onChange={(e) => {
                                        const raw = e.target.value;
                                        setDraftMatchState((prev) => {
                                          const next = { ...prev };
                                          if (raw === "") delete next[minKey];
                                          else next[minKey] = Number(raw);
                                          return next;
                                        });
                                      }}
                                    />
                                    <input
                                      type="number"
                                      min={0}
                                      max={f.max}
                                      step={f.step ?? 1}
                                      className="ms3-input"
                                      style={{ height: 34, fontSize: 12 }}
                                      placeholder="Max"
                                      aria-label={`${f.label} max`}
                                      value={maxV}
                                      onChange={(e) => {
                                        const raw = e.target.value;
                                        setDraftMatchState((prev) => {
                                          const next = { ...prev };
                                          if (raw === "") delete next[maxKey];
                                          else next[maxKey] = Number(raw);
                                          return next;
                                        });
                                      }}
                                    />
                                  </div>
                                );
                              })}
                            </div>
                            {draftImpliedRR !== null && (
                              <div style={{ marginTop: 8, font: "600 11px/1.3 var(--m-mono)", color: "var(--ms-accent)" }}>
                                {draftImpliedRR}
                              </div>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </div>
              );
            })}

            <div className="ms3-sheet-footer ms3-page">
              {draftProblems.length > 0 && (
                <div
                  role="alert"
                  data-testid="ms3-validation-error"
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 8,
                    padding: "9px 11px",
                    borderRadius: 8,
                    border: "1px solid rgba(251, 113, 133, 0.5)",
                    background: "rgba(251, 113, 133, 0.14)",
                    color: "#fb7185",
                    font: "600 11.5px/1.35 var(--m-ui)",
                  }}
                >
                  <AlertTriangle size={15} style={{ flexShrink: 0, marginTop: 1 }} />
                  <div>{draftProblems.join(" · ")}</div>
                </div>
              )}

              <div style={{ display: "grid", gridTemplateColumns: "1fr auto auto", gap: 8 }}>
                <button
                  type="button"
                  className="ms3-btn ms3-btn-primary"
                  disabled={draftProblems.length > 0}
                  onClick={applyDraft}
                  style={{ opacity: draftProblems.length > 0 ? 0.45 : 1 }}
                  data-testid="ms3-apply-filters"
                >
                  Apply Filters ({draftActiveCount})
                </button>
                <button type="button" className="ms3-btn" onClick={clearDraft} data-testid="ms3-clear-all-draft">
                  Clear All
                </button>
                <button type="button" className="ms3-btn" onClick={() => setOpen(false)}>
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </Sheet>
      )}
    </div>
  );
}
