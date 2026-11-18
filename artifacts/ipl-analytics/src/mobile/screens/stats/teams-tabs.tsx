import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { BookOpen, ChevronDown, ChevronRight, Crosshair, ExternalLink, Search, Trophy } from "lucide-react";
import { PlayerAvatar } from "@/components/player-avatar";
import { TeamLogo } from "@/components/team-logo";
import { isMatchingTeam, playerSlug, teamColor, teamShort, usePlayerBios } from "@/lib/aggregates";
import { buildClientMatchupSummary, resolveScorecardName, useRecordedDeliveries } from "@/lib/delivery-data";
import { HeadToHeadGroundVisual } from "@/components/player-intelligence-sections";
import { getV2ForFranchise } from "@/lib/editorial-v2";
import { TEAM_CODE_TO_SLUG, type TeamCode } from "@/lib/team-context";
import { fmtDec, fmtInt, type MobileStatsHook } from "./use-mobile-stats";

function teamSlugFor(short: string): string | undefined {
  return TEAM_CODE_TO_SLUG[short.toUpperCase() as TeamCode];
}

export function MobileTeamsTab({ state }: { state: MobileStatsHook }) {
  const [selectedShort, setSelectedShort] = useState<string>("");
  const [sectionOpen, setSectionOpen] = useState<"seasons" | "matches" | "stories">("seasons");

  const cards = useMemo(() => {
    const q = state.debouncedSearch.trim().toLowerCase();
    return state.teamCards.filter(
      (t) =>
        !q ||
        t.short.toLowerCase().includes(q) ||
        t.name.toLowerCase().includes(q),
    );
  }, [state.teamCards, state.debouncedSearch]);

  const activeTeam = useMemo(() => {
    if (!cards.length) return null;
    if (selectedShort) {
      const hit = cards.find((c) => c.short === selectedShort);
      if (hit) return hit;
    }
    if (state.filters.team !== "All Teams") {
      const first = state.filters.team.split(",")[0];
      const hit = cards.find((c) => c.short === first);
      if (hit) return hit;
    }
    return cards[0];
  }, [cards, selectedShort, state.filters.team]);

  const teamMatches = useMemo(() => {
    if (!activeTeam) return [];
    return state.activeMatches
      .filter((m: any) => isMatchingTeam(m.team1, activeTeam.short) || isMatchingTeam(m.team2, activeTeam.short))
      .slice()
      .sort((a: any, b: any) => String(b.date || "").localeCompare(String(a.date || "")));
  }, [state.activeMatches, activeTeam]);

  const seasonalBreakdown = useMemo(() => {
    if (!activeTeam) return [];
    const byYear = new Map<string, { year: string; matches: number; wins: number; nr: number }>();
    for (const m of teamMatches) {
      const yr = String(m.date || "").slice(0, 4);
      if (!/^\d{4}$/.test(yr)) continue;
      const prev = byYear.get(yr) ?? { year: yr, matches: 0, wins: 0, nr: 0 };
      prev.matches += 1;
      if (!m.winner) prev.nr += 1;
      else if (isMatchingTeam(m.winner, activeTeam.short)) prev.wins += 1;
      byYear.set(yr, prev);
    }
    return [...byYear.values()].sort((a, b) => b.year.localeCompare(a.year));
  }, [teamMatches, activeTeam]);

  const stories = useMemo(
    () => (activeTeam ? getV2ForFranchise(activeTeam.short).slice(0, 4) : []),
    [activeTeam],
  );

  if (!cards.length) {
    return (
      <div className="ms3-card">
        <div style={{ font: "700 13px/1.2 var(--m-display)" }}>No franchises match current filters</div>
        <button type="button" className="ms3-btn" onClick={state.resetAllFilters}>
          Reset Filters
        </button>
      </div>
    );
  }

  const slug = activeTeam ? teamSlugFor(activeTeam.short) : undefined;
  const accent = activeTeam ? teamColor(activeTeam.short) : "var(--ms-accent)";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 11 }}>
      {/* Horizontal Franchise Selector */}
      <div className="ms3-hscroll" aria-label="Select franchise">
        {cards.map((t) => {
          const on = activeTeam?.short === t.short;
          const color = teamColor(t.short);
          return (
            <button
              key={t.short}
              type="button"
              className="ms3-pill"
              data-active={on}
              onClick={() => setSelectedShort(t.short)}
              style={{
                borderColor: on ? color : undefined,
                gap: 6,
              }}
              data-testid={`ms3-team-chip-${t.short}`}
            >
              <TeamLogo team={t.short} size="w-4 h-4" />
              <span>{t.short}</span>
              <span style={{ fontFamily: "var(--m-mono)", fontSize: 10, opacity: 0.8 }}>
                {t.winPct.toFixed(0)}%
              </span>
            </button>
          );
        })}
      </div>

      {/* Selected Franchise Detail Card */}
      {activeTeam && (
        <div
          className="ms3-card"
          style={{
            borderColor: `color-mix(in srgb, ${accent} 40%, var(--ms-border))`,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <TeamLogo team={activeTeam.short} size="w-11 h-11" />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ font: "800 15px/1.15 var(--m-display)", color: "var(--ms-text)" }}>
                {activeTeam.name}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4, flexWrap: "wrap" }}>
                <span style={{ font: "700 11px/1 var(--m-mono)", color: accent }}>{activeTeam.short}</span>
                {activeTeam.titles > 0 && (
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 3, font: "700 11px/1 var(--m-mono)", color: "var(--ms-amber)" }}>
                    <Trophy size={11} /> {activeTeam.titles}x Titles
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="ms3-kpi-grid-3">
            <div className="ms3-kpi">
              <div className="ms3-kpi-k">Matches</div>
              <div className="ms3-kpi-v">{fmtInt(activeTeam.matches)}</div>
            </div>
            <div className="ms3-kpi">
              <div className="ms3-kpi-k">Wins / Losses</div>
              <div className="ms3-kpi-v">
                {fmtInt(activeTeam.wins)} / {fmtInt(activeTeam.losses)}
              </div>
            </div>
            <div className="ms3-kpi">
              <div className="ms3-kpi-k">Win Rate</div>
              <div className="ms3-kpi-v" style={{ color: accent }}>{activeTeam.winPct.toFixed(1)}%</div>
            </div>
          </div>

          {slug && (
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              <Link
                href={`/teams/${slug}`}
                className="ms3-pill"
                style={{ textDecoration: "none", color: "var(--ms-text)" }}
              >
                Franchise Hub <ExternalLink size={11} />
              </Link>
              <Link
                href={`/dugout/${slug}`}
                className="ms3-pill"
                style={{ textDecoration: "none", color: accent, borderColor: accent }}
              >
                Dugout HQ <ExternalLink size={11} />
              </Link>
            </div>
          )}

          {/* Sub-section Switcher */}
          <div style={{ display: "flex", gap: 6, paddingTop: 4, borderTop: "1px solid var(--ms-border)" }}>
            {(
              [
                ["seasons", `Seasons (${seasonalBreakdown.length})`],
                ["matches", `Fixtures (${teamMatches.length})`],
                ["stories", `Desk (${stories.length})`],
              ] as const
            ).map(([k, lbl]) => (
              <button
                key={k}
                type="button"
                className="ms3-pill"
                data-active={sectionOpen === k}
                onClick={() => setSectionOpen(k)}
              >
                {lbl}
              </button>
            ))}
          </div>

          {sectionOpen === "seasons" && (
            <div className="ms3-divider">
              {seasonalBreakdown.map((s) => {
                const losses = Math.max(0, s.matches - s.wins - s.nr);
                const pct = s.matches ? ((s.wins / s.matches) * 100).toFixed(0) : "0";
                return (
                  <div
                    key={s.year}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "7px 2px",
                      fontSize: 12,
                    }}
                  >
                    <span style={{ fontFamily: "var(--m-mono)", fontWeight: 700 }}>{s.year}</span>
                    <span style={{ color: "var(--ms-muted)" }}>
                      {s.matches}M · <strong style={{ color: "var(--ms-ok)" }}>{s.wins}W</strong> · {losses}L
                    </span>
                    <span style={{ fontFamily: "var(--m-mono)", fontWeight: 700, color: accent }}>{pct}%</span>
                  </div>
                );
              })}
            </div>
          )}

          {sectionOpen === "matches" && (
            <div className="ms3-divider">
              {teamMatches.slice(0, 15).map((m: any) => {
                const won = m.winner && isMatchingTeam(m.winner, activeTeam.short);
                return (
                  <Link
                    key={m.id}
                    href={`/match/${m.id}`}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 8,
                      padding: "8px 2px",
                      textDecoration: "none",
                      color: "var(--ms-text)",
                    }}
                  >
                    <div style={{ minWidth: 0 }}>
                      <div style={{ font: "700 12px/1.2 var(--m-ui)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {teamShort(m.team1)} vs {teamShort(m.team2)}
                      </div>
                      <div style={{ font: "500 10.5px/1.2 var(--m-ui)", color: "var(--ms-muted)", marginTop: 2 }}>
                        {String(m.date || "").slice(0, 10)} · {(m.venue || "").split(",")[0]}
                      </div>
                    </div>
                    <span
                      style={{
                        font: "700 10.5px/1 var(--m-mono)",
                        color: !m.winner ? "var(--ms-muted)" : won ? "var(--ms-ok)" : "var(--ms-bad)",
                        flexShrink: 0,
                      }}
                    >
                      {!m.winner ? "NR" : won ? "WON" : "LOST"}
                    </span>
                  </Link>
                );
              })}
            </div>
          )}

          {sectionOpen === "stories" && (
            <div className="ms3-divider">
              {stories.length === 0 ? (
                <div style={{ font: "500 12px/1.4 var(--m-ui)", color: "var(--ms-muted)", padding: "6px 0" }}>
                  No editorial dispatches published for {activeTeam.short} yet.
                </div>
              ) : (
                stories.map((st) => (
                  <Link
                    key={st.id}
                    href={`/dugout/articles/${st.slug}`}
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      gap: 8,
                      padding: "8px 2px",
                      textDecoration: "none",
                      color: "var(--ms-text)",
                    }}
                  >
                    <BookOpen size={13} style={{ color: accent, marginTop: 2, flexShrink: 0 }} />
                    <div style={{ minWidth: 0 }}>
                      <div style={{ font: "700 12px/1.25 var(--m-ui)" }}>{st.title}</div>
                      <div style={{ font: "500 11px/1.3 var(--m-ui)", color: "var(--ms-muted)", marginTop: 2 }}>
                        {st.aspect}
                      </div>
                    </div>
                  </Link>
                ))
              )}
            </div>
          )}
        </div>
      )}

      {/* Standings Overview List */}
      <div className="ms3-card ms3-divider" style={{ padding: "8px 12px" }}>
        <div className="ms3-card-head" style={{ paddingBottom: 6 }}>
          <h3 className="ms3-card-title">Franchise Comparison ({cards.length})</h3>
        </div>
        {cards.map((t) => {
          const on = activeTeam?.short === t.short;
          return (
            <button
              key={t.short}
              type="button"
              className="ms3-row-btn"
              style={{ minHeight: 50 }}
              onClick={() => setSelectedShort(t.short)}
            >
              <TeamLogo team={t.short} size="w-7 h-7" />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ font: "700 12.5px/1.2 var(--m-display)", color: on ? "var(--ms-accent)" : "var(--ms-text)" }}>
                  {t.name}
                </div>
                <div style={{ font: "500 10.5px/1.2 var(--m-ui)", color: "var(--ms-muted)", marginTop: 2 }}>
                  {t.matches}M · {t.wins}W · {t.losses}L
                </div>
              </div>
              <div style={{ textAlign: "right", flexShrink: 0 }}>
                <div style={{ font: "800 13px/1.1 var(--m-mono)" }}>{t.winPct.toFixed(1)}%</div>
                {t.titles > 0 && (
                  <div style={{ font: "700 10px/1.1 var(--m-mono)", color: "var(--ms-amber)", marginTop: 2 }}>
                    {t.titles}🏆
                  </div>
                )}
              </div>
              <ChevronRight size={14} style={{ color: "var(--ms-muted)" }} />
            </button>
          );
        })}
      </div>
    </div>
  );
}

function CompareRow({
  label,
  leftVal,
  rightVal,
  leftNum,
  rightNum,
  lowerBetter = false,
}: {
  label: string;
  leftVal: string;
  rightVal: string;
  leftNum: number;
  rightNum: number;
  lowerBetter?: boolean;
}) {
  const leftWins = lowerBetter ? leftNum < rightNum : leftNum > rightNum;
  const rightWins = lowerBetter ? rightNum < leftNum : rightNum > leftNum;
  const equal = leftNum === rightNum;
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "1fr auto 1fr",
        alignItems: "center",
        gap: 8,
        padding: "7px 0",
        borderTop: "1px solid var(--m-line-soft, rgba(255,255,255,0.06))",
      }}
    >
      <div
        style={{
          font: "800 13px/1.1 var(--m-mono)",
          color: !equal && leftWins ? "var(--ms-ok)" : "var(--ms-text)",
        }}
      >
        {leftVal}
      </div>
      <div style={{ font: "700 10px/1 var(--m-mono)", color: "var(--ms-muted)", textTransform: "uppercase" }}>
        {label}
      </div>
      <div
        style={{
          textAlign: "right",
          font: "800 13px/1.1 var(--m-mono)",
          color: !equal && rightWins ? "var(--ms-ok)" : "var(--ms-text)",
        }}
      >
        {rightVal}
      </div>
    </div>
  );
}

export function MobileHeadToHeadTab({
  state,
  onOpenTactics,
}: {
  state: MobileStatsHook;
  onOpenTactics: () => void;
}) {
  const bios = usePlayerBios();
  const [mode, setMode] = useState<"players" | "teams" | "duel">("players");
  const [playerRole, setPlayerRole] = useState<"batters" | "bowlers">("batters");

  const list = useMemo(() => {
    const raw = playerRole === "batters" ? state.activeData.batters : state.activeData.bowlers;
    const key = playerRole === "batters" ? "runs" : "wickets";
    return [...raw].sort((a, b) => Number(b[key] || 0) - Number(a[key] || 0));
  }, [playerRole, state.activeData.batters, state.activeData.bowlers]);
  const [p1Name, setP1Name] = useState<string>("");
  const [p2Name, setP2Name] = useState<string>("");
  const [filterA, setFilterA] = useState("");
  const [filterB, setFilterB] = useState("");
  const [openA, setOpenA] = useState(false);
  const [openB, setOpenB] = useState(false);

  const p1 = useMemo(() => {
    if (!list.length) return null;
    return list.find((r) => r.player === p1Name) ?? list[0];
  }, [list, p1Name]);

  const p2 = useMemo(() => {
    if (!list.length) return null;
    return list.find((r) => r.player === p2Name) ?? list[Math.min(1, list.length - 1)];
  }, [list, p2Name]);

  // Duel (Batter vs Bowler) — Synced with Desktop Head-to-Head + Client Ball-by-Ball Fallback
  const [duelBatter, setDuelBatter] = useState<string>("");
  const [duelBowler, setDuelBowler] = useState<string>("");
  const [duelSearchBat, setDuelSearchBat] = useState("");
  const [duelSearchBowl, setDuelSearchBowl] = useState("");
  const [openDuelBat, setOpenDuelBat] = useState(false);
  const [openDuelBowl, setOpenDuelBowl] = useState(false);
  const [duelPhase, setDuelPhase] = useState<"all" | "pp" | "middle" | "death">("all");
  const [duelInnings, setDuelInnings] = useState<"all" | "1st" | "2nd">("all");

  const activeDuelBatter = duelBatter || state.batterOptionNames[0] || "V Kohli";
  const activeDuelBowler = duelBowler || state.bowlerOptionNames[0] || "JJ Bumrah";

  const filteredDuelBatters = useMemo(() => {
    const q = duelSearchBat.toLowerCase().trim();
    return state.batterOptionNames.filter((n) => !q || n.toLowerCase().includes(q) || state.formatName(n).toLowerCase().includes(q));
  }, [state.batterOptionNames, duelSearchBat, state]);

  const filteredDuelBowlers = useMemo(() => {
    const q = duelSearchBowl.toLowerCase().trim();
    return state.bowlerOptionNames.filter((n) => !q || n.toLowerCase().includes(q) || state.formatName(n).toLowerCase().includes(q));
  }, [state.bowlerOptionNames, duelSearchBowl, state]);

  const duelApiQuery = useQuery({
    queryKey: ["ms3-duel", activeDuelBatter, activeDuelBowler, state.filters.season, duelPhase, duelInnings],
    queryFn: async ({ signal }) => {
      const p = new URLSearchParams({
        batter: resolveScorecardName(activeDuelBatter, bios.data),
        bowler: resolveScorecardName(activeDuelBowler, bios.data),
      });
      if (state.filters.season !== "All Seasons") p.set("season", state.filters.season);
      if (duelPhase !== "all") p.set("phase", duelPhase === "pp" ? "Powerplay" : duelPhase === "middle" ? "Middle" : "Death");
      if (duelInnings !== "all") p.set("innings", duelInnings === "1st" ? "1st Innings" : "2nd Innings");
      try {
        const res = await fetch(`/api/stats/matchup?${p.toString()}`, { signal });
        const ct = res.headers.get("content-type") || "";
        if (!res.ok || !ct.includes("application/json")) return null;
        return await res.json();
      } catch {
        return null;
      }
    },
    enabled: mode === "duel" && Boolean(activeDuelBatter && activeDuelBowler),
    retry: 0,
    staleTime: 1000 * 60 * 5,
  });

  const duelRecordedDeliveries = useRecordedDeliveries(
    mode === "duel" && activeDuelBatter ? activeDuelBatter : "",
  );

  const duelClientSummary = useMemo(() => {
    if (mode !== "duel" || !activeDuelBatter || !activeDuelBowler) return null;
    return buildClientMatchupSummary(duelRecordedDeliveries.data, activeDuelBatter, activeDuelBowler, bios.data, {
      phase: duelPhase,
      innings: duelInnings,
      matchIds: state.filters.season !== "All Seasons" ? state.slicedMatchIds : undefined,
    });
  }, [mode, duelRecordedDeliveries.data, activeDuelBatter, activeDuelBowler, bios.data, duelPhase, duelInnings, state.filters.season, state.slicedMatchIds]);

  const duelData = useMemo(() => {
    const api = duelApiQuery.data;
    if (api && Number(api.balls || 0) > 0) return api;
    if (duelClientSummary && duelClientSummary.balls > 0) return duelClientSummary;
    return api ?? duelClientSummary;
  }, [duelApiQuery.data, duelClientSummary]);

  const duelDominanceIndex =
    duelData && Number(duelData.balls || 0) > 0 && duelData.dominanceIndex != null
      ? Number(duelData.dominanceIndex)
      : 50;

  // Teams H2H
  const [teamA, setTeamA] = useState<string>("CSK");
  const [teamB, setTeamB] = useState<string>("MI");

  const teamH2H = useMemo(() => {
    const games = state.activeMatches.filter(
      (m: any) =>
        (isMatchingTeam(m.team1, teamA) && isMatchingTeam(m.team2, teamB)) ||
        (isMatchingTeam(m.team1, teamB) && isMatchingTeam(m.team2, teamA)),
    );
    let aWins = 0;
    let bWins = 0;
    let nr = 0;
    for (const m of games) {
      if (!m.winner) nr += 1;
      else if (isMatchingTeam(m.winner, teamA)) aWins += 1;
      else if (isMatchingTeam(m.winner, teamB)) bWins += 1;
    }
    return { games: games.slice().reverse(), total: games.length, aWins, bWins, nr };
  }, [state.activeMatches, teamA, teamB]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <div className="ms3-hscroll">
        {(
          [
            ["players", "Player Comparison"],
            ["duel", "Batter vs Bowler Duel"],
            ["teams", "Team Rivalry"],
          ] as const
        ).map(([m, lbl]) => (
          <button
            key={m}
            type="button"
            className="ms3-pill"
            data-active={mode === m}
            onClick={() => setMode(m)}
            data-testid={`ms3-h2h-mode-${m}`}
          >
            {lbl}
          </button>
        ))}
      </div>

      {mode === "players" && (
        <div className="ms3-card">
          <div style={{ display: "flex", gap: 6 }}>
            <button
              type="button"
              className="ms3-pill"
              data-active={playerRole === "batters"}
              onClick={() => setPlayerRole("batters")}
            >
              Compare Batters
            </button>
            <button
              type="button"
              className="ms3-pill"
              data-active={playerRole === "bowlers"}
              onClick={() => setPlayerRole("bowlers")}
            >
              Compare Bowlers
            </button>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            <div style={{ position: "relative" }}>
              <div className="ms3-search-wrap" style={{ marginBottom: 5 }}>
                <Search size={12} className="ms3-search-icon" />
                <input
                  type="text"
                  className="ms3-input ms3-input--search"
                  style={{ height: 34, fontSize: 12 }}
                  placeholder="Filter A..."
                  value={filterA}
                  onFocus={() => setOpenA(true)}
                  onBlur={() => setTimeout(() => setOpenA(false), 160)}
                  onChange={(e) => {
                    const val = e.target.value;
                    setFilterA(val);
                    setOpenA(true);
                    const q = val.toLowerCase().trim();
                    if (q) {
                      const hits = list.filter((r) => r.player.toLowerCase().includes(q) || state.formatName(r.player).toLowerCase().includes(q));
                      if (hits.length === 1) setP1Name(hits[0].player);
                    }
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      const q = filterA.toLowerCase().trim();
                      const hit = list.find((r) => !q || r.player.toLowerCase().includes(q) || state.formatName(r.player).toLowerCase().includes(q));
                      if (hit) setP1Name(hit.player);
                      setOpenA(false);
                    }
                  }}
                />
              </div>
              {openA && filterA.trim().length > 0 && (
                <div
                  style={{
                    position: "absolute",
                    left: 0,
                    right: 0,
                    top: 38,
                    zIndex: 40,
                    maxHeight: 190,
                    overflowY: "auto",
                    background: "rgba(8,11,22,0.97)",
                    border: "1px solid rgba(255,255,255,0.16)",
                    borderRadius: 10,
                    padding: 4,
                    boxShadow: "0 12px 28px rgba(0,0,0,0.65)",
                  }}
                >
                  {list
                    .filter((r) => r.player.toLowerCase().includes(filterA.toLowerCase().trim()) || state.formatName(r.player).toLowerCase().includes(filterA.toLowerCase().trim()))
                    .slice(0, 30)
                    .map((r) => (
                      <button
                        key={r.player}
                        type="button"
                        onMouseDown={(e) => {
                          e.preventDefault();
                          setP1Name(r.player);
                          setOpenA(false);
                        }}
                        style={{
                          width: "100%",
                          textAlign: "left",
                          padding: "6px 8px",
                          fontSize: 11,
                          fontWeight: 700,
                          color: "var(--ms-text)",
                          background: r.player === p1?.player ? "rgba(56,189,248,0.18)" : "transparent",
                          border: "none",
                          borderRadius: 7,
                          cursor: "pointer",
                        }}
                      >
                        {state.formatName(r.player)}
                      </button>
                    ))}
                </div>
              )}
              <select
                className="ms3-select"
                value={p1?.player ?? ""}
                onChange={(e) => setP1Name(e.target.value)}
              >
                {p1 && !list.filter((r) => !filterA || r.player.toLowerCase().includes(filterA.toLowerCase()) || state.formatName(r.player).toLowerCase().includes(filterA.toLowerCase())).slice(0, 60).some((r) => r.player === p1.player) && (
                  <option value={p1.player}>{state.formatName(p1.player)}</option>
                )}
                {list
                  .filter((r) => !filterA || r.player.toLowerCase().includes(filterA.toLowerCase()) || state.formatName(r.player).toLowerCase().includes(filterA.toLowerCase()))
                  .slice(0, 60)
                  .map((r) => (
                    <option key={r.player} value={r.player}>{state.formatName(r.player)}</option>
                  ))}
              </select>
            </div>

            <div style={{ position: "relative" }}>
              <div className="ms3-search-wrap" style={{ marginBottom: 5 }}>
                <Search size={12} className="ms3-search-icon" />
                <input
                  type="text"
                  className="ms3-input ms3-input--search"
                  style={{ height: 34, fontSize: 12 }}
                  placeholder="Filter B..."
                  value={filterB}
                  onFocus={() => setOpenB(true)}
                  onBlur={() => setTimeout(() => setOpenB(false), 160)}
                  onChange={(e) => {
                    const val = e.target.value;
                    setFilterB(val);
                    setOpenB(true);
                    const q = val.toLowerCase().trim();
                    if (q) {
                      const hits = list.filter((r) => r.player.toLowerCase().includes(q) || state.formatName(r.player).toLowerCase().includes(q));
                      if (hits.length === 1) setP2Name(hits[0].player);
                    }
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      const q = filterB.toLowerCase().trim();
                      const hit = list.find((r) => !q || r.player.toLowerCase().includes(q) || state.formatName(r.player).toLowerCase().includes(q));
                      if (hit) setP2Name(hit.player);
                      setOpenB(false);
                    }
                  }}
                />
              </div>
              {openB && filterB.trim().length > 0 && (
                <div
                  style={{
                    position: "absolute",
                    left: 0,
                    right: 0,
                    top: 38,
                    zIndex: 40,
                    maxHeight: 190,
                    overflowY: "auto",
                    background: "rgba(8,11,22,0.97)",
                    border: "1px solid rgba(255,255,255,0.16)",
                    borderRadius: 10,
                    padding: 4,
                    boxShadow: "0 12px 28px rgba(0,0,0,0.65)",
                  }}
                >
                  {list
                    .filter((r) => r.player.toLowerCase().includes(filterB.toLowerCase().trim()) || state.formatName(r.player).toLowerCase().includes(filterB.toLowerCase().trim()))
                    .slice(0, 30)
                    .map((r) => (
                      <button
                        key={r.player}
                        type="button"
                        onMouseDown={(e) => {
                          e.preventDefault();
                          setP2Name(r.player);
                          setOpenB(false);
                        }}
                        style={{
                          width: "100%",
                          textAlign: "left",
                          padding: "6px 8px",
                          fontSize: 11,
                          fontWeight: 700,
                          color: "var(--ms-text)",
                          background: r.player === p2?.player ? "rgba(56,189,248,0.18)" : "transparent",
                          border: "none",
                          borderRadius: 7,
                          cursor: "pointer",
                        }}
                      >
                        {state.formatName(r.player)}
                      </button>
                    ))}
                </div>
              )}
              <select
                className="ms3-select"
                value={p2?.player ?? ""}
                onChange={(e) => setP2Name(e.target.value)}
              >
                {p2 && !list.filter((r) => !filterB || r.player.toLowerCase().includes(filterB.toLowerCase()) || state.formatName(r.player).toLowerCase().includes(filterB.toLowerCase())).slice(0, 60).some((r) => r.player === p2.player) && (
                  <option value={p2.player}>{state.formatName(p2.player)}</option>
                )}
                {list
                  .filter((r) => !filterB || r.player.toLowerCase().includes(filterB.toLowerCase()) || state.formatName(r.player).toLowerCase().includes(filterB.toLowerCase()))
                  .slice(0, 60)
                  .map((r) => (
                    <option key={r.player} value={r.player}>{state.formatName(r.player)}</option>
                  ))}
              </select>
            </div>
          </div>

          {p1 && p2 && (
            <>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, paddingTop: 4 }}>
                {[p1, p2].map((p, i) => {
                  const sh = teamShort(state.getPlayerTeam(p.player, p));
                  return (
                    <Link
                      key={`${p.player}-${i}`}
                      href={`/players/${playerSlug(p.player)}`}
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        gap: 5,
                        padding: 8,
                        borderRadius: 9,
                        background: "var(--ms-muted-bg)",
                        border: "1px solid var(--ms-border)",
                        textDecoration: "none",
                        color: "var(--ms-text)",
                        textAlign: "center",
                      }}
                    >
                      <PlayerAvatar
                        name={p.player}
                        teamId={sh}
                        playerImages={state.playerImages}
                        bio={state.getBioFor(p.player)}
                        className="w-11 h-11 rounded-full"
                        disableHover
                      />
                      <div style={{ font: "700 12px/1.2 var(--m-display)" }}>{state.formatName(p.player)}</div>
                      <span style={{ font: "700 10px/1 var(--m-mono)", color: teamColor(sh) }}>{sh}</span>
                    </Link>
                  );
                })}
              </div>

              {playerRole === "batters" ? (
                <div>
                  <CompareRow label="Matches" leftVal={fmtInt(p1.matches)} rightVal={fmtInt(p2.matches)} leftNum={p1.matches || 0} rightNum={p2.matches || 0} />
                  <CompareRow label="Runs" leftVal={fmtInt(p1.runs)} rightVal={fmtInt(p2.runs)} leftNum={p1.runs || 0} rightNum={p2.runs || 0} />
                  <CompareRow label="Average" leftVal={fmtDec(p1.avg, 1)} rightVal={fmtDec(p2.avg, 1)} leftNum={p1.avg || 0} rightNum={p2.avg || 0} />
                  <CompareRow label="Strike Rate" leftVal={fmtDec(p1.sr, 1)} rightVal={fmtDec(p2.sr, 1)} leftNum={p1.sr || 0} rightNum={p2.sr || 0} />
                  <CompareRow label="Highest" leftVal={fmtInt(p1.highest)} rightVal={fmtInt(p2.highest)} leftNum={p1.highest || 0} rightNum={p2.highest || 0} />
                  <CompareRow label="Sixes" leftVal={fmtInt(p1.sixes)} rightVal={fmtInt(p2.sixes)} leftNum={p1.sixes || 0} rightNum={p2.sixes || 0} />
                  <CompareRow label="Boundary %" leftVal={`${fmtDec(p1.boundaryPct, 1)}%`} rightVal={`${fmtDec(p2.boundaryPct, 1)}%`} leftNum={p1.boundaryPct || 0} rightNum={p2.boundaryPct || 0} />
                </div>
              ) : (
                <div>
                  <CompareRow label="Matches" leftVal={fmtInt(p1.matches)} rightVal={fmtInt(p2.matches)} leftNum={p1.matches || 0} rightNum={p2.matches || 0} />
                  <CompareRow label="Wickets" leftVal={fmtInt(p1.wickets)} rightVal={fmtInt(p2.wickets)} leftNum={p1.wickets || 0} rightNum={p2.wickets || 0} />
                  <CompareRow label="Economy" leftVal={fmtDec(p1.econ, 2)} rightVal={fmtDec(p2.econ, 2)} leftNum={p1.econ ?? 99} rightNum={p2.econ ?? 99} lowerBetter />
                  <CompareRow label="Average" leftVal={fmtDec(p1.avg, 1)} rightVal={fmtDec(p2.avg, 1)} leftNum={p1.avg ?? 999} rightNum={p2.avg ?? 999} lowerBetter />
                  <CompareRow label="Strike Rate" leftVal={fmtDec(p1.sr, 1)} rightVal={fmtDec(p2.sr, 1)} leftNum={p1.sr ?? 999} rightNum={p2.sr ?? 999} lowerBetter />
                  <CompareRow label="Dot %" leftVal={`${fmtDec(p1.dotPct, 1)}%`} rightVal={`${fmtDec(p2.dotPct, 1)}%`} leftNum={p1.dotPct || 0} rightNum={p2.dotPct || 0} />
                </div>
              )}
            </>
          )}
        </div>
      )}

      {mode === "duel" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div className="ms3-card" style={{ overflow: "visible" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              {/* Searchable Batter with Dropdown */}
              <div style={{ position: "relative" }}>
                <div className="ms3-scope-label" style={{ marginBottom: 4 }}>Batter</div>
                <div className="ms3-search-wrap" style={{ marginBottom: 5 }}>
                  <Search size={12} className="ms3-search-icon" />
                  <input
                    type="text"
                    className="ms3-input ms3-input--search"
                    style={{ height: 34, fontSize: 12 }}
                    placeholder="Search batter..."
                    value={duelSearchBat}
                    onFocus={() => setOpenDuelBat(true)}
                    onBlur={() => setTimeout(() => setOpenDuelBat(false), 160)}
                    onChange={(e) => {
                      const val = e.target.value;
                      setDuelSearchBat(val);
                      setOpenDuelBat(true);
                      const q = val.toLowerCase().trim();
                      if (q) {
                        const hits = state.batterOptionNames.filter((n) => n.toLowerCase().includes(q) || state.formatName(n).toLowerCase().includes(q));
                        if (hits.length === 1) setDuelBatter(hits[0]);
                        else {
                          const ex = hits.find((n) => n.toLowerCase() === q || state.formatName(n).toLowerCase() === q);
                          if (ex) setDuelBatter(ex);
                        }
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && filteredDuelBatters.length > 0) {
                        setDuelBatter(filteredDuelBatters[0]);
                        setOpenDuelBat(false);
                      }
                    }}
                  />
                </div>
                {openDuelBat && duelSearchBat.trim().length > 0 && (
                  <div
                    style={{
                      position: "absolute",
                      left: 0,
                      right: 0,
                      top: 56,
                      zIndex: 40,
                      maxHeight: 190,
                      overflowY: "auto",
                      background: "rgba(8,11,22,0.97)",
                      border: "1px solid rgba(255,255,255,0.16)",
                      borderRadius: 10,
                      padding: 4,
                      boxShadow: "0 12px 28px rgba(0,0,0,0.65)",
                    }}
                  >
                    {filteredDuelBatters.slice(0, 35).map((n) => (
                      <button
                        key={n}
                        type="button"
                        onMouseDown={(e) => {
                          e.preventDefault();
                          setDuelBatter(n);
                          setOpenDuelBat(false);
                        }}
                        style={{
                          width: "100%",
                          textAlign: "left",
                          padding: "6px 8px",
                          fontSize: 11,
                          fontWeight: 700,
                          color: "var(--ms-text)",
                          background: n === activeDuelBatter ? "rgba(56,189,248,0.18)" : "transparent",
                          border: "none",
                          borderRadius: 7,
                          cursor: "pointer",
                        }}
                      >
                        {state.formatName(n)}
                      </button>
                    ))}
                  </div>
                )}
                <select className="ms3-select" value={activeDuelBatter} onChange={(e) => setDuelBatter(e.target.value)}>
                  {!filteredDuelBatters.slice(0, 80).includes(activeDuelBatter) && (
                    <option value={activeDuelBatter}>{state.formatName(activeDuelBatter)}</option>
                  )}
                  {filteredDuelBatters.slice(0, 80).map((n) => (
                    <option key={n} value={n}>{state.formatName(n)}</option>
                  ))}
                </select>
              </div>

              {/* Searchable Bowler with Dropdown */}
              <div style={{ position: "relative" }}>
                <div className="ms3-scope-label" style={{ marginBottom: 4 }}>Bowler</div>
                <div className="ms3-search-wrap" style={{ marginBottom: 5 }}>
                  <Search size={12} className="ms3-search-icon" />
                  <input
                    type="text"
                    className="ms3-input ms3-input--search"
                    style={{ height: 34, fontSize: 12 }}
                    placeholder="Search bowler..."
                    value={duelSearchBowl}
                    onFocus={() => setOpenDuelBowl(true)}
                    onBlur={() => setTimeout(() => setOpenDuelBowl(false), 160)}
                    onChange={(e) => {
                      const val = e.target.value;
                      setDuelSearchBowl(val);
                      setOpenDuelBowl(true);
                      const q = val.toLowerCase().trim();
                      if (q) {
                        const hits = state.bowlerOptionNames.filter((n) => n.toLowerCase().includes(q) || state.formatName(n).toLowerCase().includes(q));
                        if (hits.length === 1) setDuelBowler(hits[0]);
                        else {
                          const ex = hits.find((n) => n.toLowerCase() === q || state.formatName(n).toLowerCase() === q);
                          if (ex) setDuelBowler(ex);
                        }
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && filteredDuelBowlers.length > 0) {
                        setDuelBowler(filteredDuelBowlers[0]);
                        setOpenDuelBowl(false);
                      }
                    }}
                  />
                </div>
                {openDuelBowl && duelSearchBowl.trim().length > 0 && (
                  <div
                    style={{
                      position: "absolute",
                      left: 0,
                      right: 0,
                      top: 56,
                      zIndex: 40,
                      maxHeight: 190,
                      overflowY: "auto",
                      background: "rgba(8,11,22,0.97)",
                      border: "1px solid rgba(255,255,255,0.16)",
                      borderRadius: 10,
                      padding: 4,
                      boxShadow: "0 12px 28px rgba(0,0,0,0.65)",
                    }}
                  >
                    {filteredDuelBowlers.slice(0, 35).map((n) => (
                      <button
                        key={n}
                        type="button"
                        onMouseDown={(e) => {
                          e.preventDefault();
                          setDuelBowler(n);
                          setOpenDuelBowl(false);
                        }}
                        style={{
                          width: "100%",
                          textAlign: "left",
                          padding: "6px 8px",
                          fontSize: 11,
                          fontWeight: 700,
                          color: "var(--ms-text)",
                          background: n === activeDuelBowler ? "rgba(56,189,248,0.18)" : "transparent",
                          border: "none",
                          borderRadius: 7,
                          cursor: "pointer",
                        }}
                      >
                        {state.formatName(n)}
                      </button>
                    ))}
                  </div>
                )}
                <select className="ms3-select" value={activeDuelBowler} onChange={(e) => setDuelBowler(e.target.value)}>
                  {!filteredDuelBowlers.slice(0, 80).includes(activeDuelBowler) && (
                    <option value={activeDuelBowler}>{state.formatName(activeDuelBowler)}</option>
                  )}
                  {filteredDuelBowlers.slice(0, 80).map((n) => (
                    <option key={n} value={n}>{state.formatName(n)}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Phase & Innings Slicers */}
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 4 }}>
              {(
                [
                  ["all", "All Phases"],
                  ["pp", "PP"],
                  ["middle", "Mid"],
                  ["death", "Death"],
                ] as const
              ).map(([ph, lbl]) => (
                <button
                  key={ph}
                  type="button"
                  className="ms3-pill"
                  data-active={duelPhase === ph}
                  style={{ height: 26, fontSize: 10.5 }}
                  onClick={() => setDuelPhase(ph)}
                >
                  {lbl}
                </button>
              ))}
              {(
                [
                  ["all", "All Inn"],
                  ["1st", "1st Inn"],
                  ["2nd", "Chase"],
                ] as const
              ).map(([inn, lbl]) => (
                <button
                  key={inn}
                  type="button"
                  className="ms3-pill"
                  data-active={duelInnings === inn}
                  style={{ height: 26, fontSize: 10.5 }}
                  onClick={() => setDuelInnings(inn)}
                >
                  {lbl}
                </button>
              ))}
            </div>

            {/* Matchup Battleground Header */}
            {(() => {
              const batTeam = state.getPlayerTeam(activeDuelBatter, {}) || "IPL";
              const bowlTeam = state.getPlayerTeam(activeDuelBowler, {}) || "IPL";
              return (
                <div style={{ padding: "10px 8px", borderRadius: 10, background: "rgba(255,255,255,0.02)", border: "1px solid var(--ms-border)", display: "flex", flexDirection: "column", gap: 8 }}>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", alignItems: "center", gap: 8 }}>
                    <Link href={`/players/${playerSlug(activeDuelBatter)}`} style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", gap: 3, textDecoration: "none", color: "var(--ms-text)" }}>
                      <PlayerAvatar name={activeDuelBatter} playerImages={state.playerImages} bio={state.getBioFor(activeDuelBatter)} className="w-11 h-11 rounded-full" disableHover />
                      <span style={{ font: "700 11.5px/1.15 var(--m-display)" }}>{state.formatName(activeDuelBatter)}</span>
                      <span style={{ font: "700 9.5px/1 var(--m-mono)", color: teamColor(batTeam) }}>{teamShort(batTeam)} · BAT</span>
                    </Link>

                    <div style={{ textAlign: "center" }}>
                      <div style={{ font: "700 9px/1 var(--m-mono)", color: "var(--ms-muted)", textTransform: "uppercase" }}>Dominance</div>
                      <div style={{ font: "800 18px/1.2 var(--m-mono)", color: "var(--ms-text)" }}>{duelDominanceIndex}%</div>
                      <div style={{ font: "700 9px/1 var(--m-mono)", color: duelDominanceIndex > 52 ? "var(--ms-ok)" : duelDominanceIndex < 48 ? "var(--ms-bad)" : "var(--ms-accent)" }}>
                        {duelDominanceIndex > 52 ? "Batter Edge" : duelDominanceIndex < 48 ? "Bowler Edge" : "Even Contest"}
                      </div>
                    </div>

                    <Link href={`/players/${playerSlug(activeDuelBowler)}`} style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", gap: 3, textDecoration: "none", color: "var(--ms-text)" }}>
                      <PlayerAvatar name={activeDuelBowler} playerImages={state.playerImages} bio={state.getBioFor(activeDuelBowler)} className="w-11 h-11 rounded-full" disableHover />
                      <span style={{ font: "700 11.5px/1.15 var(--m-display)" }}>{state.formatName(activeDuelBowler)}</span>
                      <span style={{ font: "700 9.5px/1 var(--m-mono)", color: teamColor(bowlTeam) }}>{teamShort(bowlTeam)} · BOWL</span>
                    </Link>
                  </div>
                  <div style={{ height: 6, borderRadius: 999, background: "rgba(255,255,255,0.07)", overflow: "hidden" }}>
                    <div
                      style={{
                        height: "100%",
                        width: `${duelDominanceIndex}%`,
                        background: `linear-gradient(90deg, ${teamColor(bowlTeam)}, ${teamColor(batTeam)})`,
                      }}
                    />
                  </div>
                </div>
              );
            })()}

            {duelApiQuery.isLoading && !duelClientSummary && (
              <div style={{ font: "500 12px/1.3 var(--m-ui)", color: "var(--ms-muted)" }}>Querying ball-by-ball duel telemetry…</div>
            )}

            {duelData ? (
              <div className="ms3-kpi-grid-3">
                <div className="ms3-kpi">
                  <div className="ms3-kpi-k">Runs (Balls)</div>
                  <div className="ms3-kpi-v">{duelData.runs} ({duelData.balls}b)</div>
                </div>
                <div className="ms3-kpi">
                  <div className="ms3-kpi-k">Dismissals</div>
                  <div className="ms3-kpi-v" style={{ color: "var(--ms-bad)" }}>{duelData.dismissals}</div>
                </div>
                <div className="ms3-kpi">
                  <div className="ms3-kpi-k">Strike Rate</div>
                  <div className="ms3-kpi-v">{Number(duelData.sr ?? 0).toFixed(1)}</div>
                </div>
                <div className="ms3-kpi">
                  <div className="ms3-kpi-k">Dot %</div>
                  <div className="ms3-kpi-v">{duelData.dotPct ?? 0}%</div>
                </div>
                <div className="ms3-kpi">
                  <div className="ms3-kpi-k">4s / 6s</div>
                  <div className="ms3-kpi-v">{duelData.fours ?? 0} / {duelData.sixes ?? 0}</div>
                </div>
              </div>
            ) : (
              <div style={{ font: "500 12px/1.35 var(--m-ui)", color: "var(--ms-muted)" }}>
                No recorded IPL deliveries between these two players under this filter.
              </div>
            )}

            {duelData?.phaseSplit && Number(duelData.balls || 0) > 0 && (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 6 }}>
                {(
                  [
                    ["powerplay", "Powerplay"],
                    ["middle", "Middle"],
                    ["death", "Death"],
                  ] as const
                ).map(([k, lbl]) => {
                  const s = duelData.phaseSplit[k];
                  return (
                    <div key={k} style={{ padding: "7px 8px", borderRadius: 8, background: "rgba(255,255,255,0.02)", border: "1px solid var(--ms-border)" }}>
                      <div style={{ font: "700 9.5px/1 var(--m-mono)", color: "var(--ms-muted)", textTransform: "uppercase" }}>{lbl}</div>
                      <div style={{ font: "800 12px/1.3 var(--m-mono)", color: "var(--ms-text)", marginTop: 3 }}>
                        {s?.balls > 0 ? `${s.runs} (${s.balls})` : "—"}
                      </div>
                      <div style={{ font: "600 9.5px/1 var(--m-mono)", color: "var(--ms-accent)" }}>
                        {s?.balls > 0 ? `SR ${s.sr}` : "0 balls"}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <button type="button" className="ms3-btn ms3-btn-primary" onClick={onOpenTactics}>
              <Crosshair size={14} /> Inspect Pitch Grid &amp; Shot Map →
            </button>
          </div>

          <div className="stats-tool" style={{ maxWidth: "100%", overflow: "hidden" }}>
            <HeadToHeadGroundVisual
              batterName={state.formatName(activeDuelBatter)}
              bowlerName={state.formatName(activeDuelBowler)}
              matchupData={duelData}
              matchIds={state.filters.season !== "All Seasons" ? state.slicedMatchIds : undefined}
              phaseFilter={duelPhase}
              inningsFilter={duelInnings}
            />
          </div>
        </div>
      )}

      {mode === "teams" && (
        <div className="ms3-card">
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            <select className="ms3-select" value={teamA} onChange={(e) => setTeamA(e.target.value)} aria-label="Franchise A">
              {state.teamOptions.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
            <select className="ms3-select" value={teamB} onChange={(e) => setTeamB(e.target.value)} aria-label="Franchise B">
              {state.teamOptions.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>

          <div className="ms3-kpi-grid-3">
            <div className="ms3-kpi">
              <div className="ms3-kpi-k">{teamA} Wins</div>
              <div className="ms3-kpi-v" style={{ color: teamColor(teamA) }}>{teamH2H.aWins}</div>
            </div>
            <div className="ms3-kpi">
              <div className="ms3-kpi-k">Played</div>
              <div className="ms3-kpi-v">{teamH2H.total}</div>
            </div>
            <div className="ms3-kpi">
              <div className="ms3-kpi-k">{teamB} Wins</div>
              <div className="ms3-kpi-v" style={{ color: teamColor(teamB) }}>{teamH2H.bWins}</div>
            </div>
          </div>

          {teamH2H.games.length === 0 ? (
            <div style={{ font: "500 12px/1.3 var(--m-ui)", color: "var(--ms-muted)" }}>
              No {teamA} vs {teamB} fixtures in current filter scope.
            </div>
          ) : (
            <div className="ms3-divider">
              {teamH2H.games.slice(0, 12).map((m: any) => (
                <Link
                  key={m.id}
                  href={`/match/${m.id}`}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 8,
                    padding: "8px 0",
                    textDecoration: "none",
                    color: "var(--ms-text)",
                  }}
                >
                  <div style={{ minWidth: 0 }}>
                    <div style={{ font: "700 12px/1.2 var(--m-ui)" }}>
                      {String(m.date || "").slice(0, 10)} · {m.winner ? `${teamShort(m.winner)} won` : "No Result"}
                    </div>
                    <div style={{ font: "500 10.5px/1.2 var(--m-ui)", color: "var(--ms-muted)", marginTop: 2 }}>
                      {(m.venue || "").split(",")[0]}
                    </div>
                  </div>
                  <ChevronDown size={14} style={{ transform: "rotate(-90deg)", color: "var(--ms-muted)" }} />
                </Link>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
