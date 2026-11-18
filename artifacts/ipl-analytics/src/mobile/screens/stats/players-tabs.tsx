import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { AlertCircle, ArrowDownUp, ChevronDown, ChevronRight, ExternalLink, Info, RotateCcw } from "lucide-react";
import { PlayerAvatar } from "@/components/player-avatar";
import { TeamLogo } from "@/components/team-logo";
import { playerSlug, teamColor, teamShort } from "@/lib/aggregates";
import { useLensRankings } from "@/lib/batter-lens-data";
import {
  fmtDec,
  fmtInt,
  type BatterSortField,
  type BowlerSortField,
  type MobileStatsHook,
} from "./use-mobile-stats";

const BATTER_SORT_OPTIONS: { value: BatterSortField; label: string }[] = [
  { value: "runs", label: "Runs" },
  { value: "sr", label: "Strike Rate" },
  { value: "avg", label: "Average" },
  { value: "boundaryPct", label: "Boundary %" },
  { value: "highest", label: "Highest Score" },
  { value: "sixes", label: "Sixes (6s)" },
  { value: "fours", label: "Fours (4s)" },
  { value: "balls", label: "Balls Faced" },
  { value: "hundreds", label: "Centuries (100s)" },
  { value: "fifties", label: "Fifties (50s)" },
  { value: "matches", label: "Matches" },
  { value: "innings", label: "Innings" },
  { value: "player", label: "Player Name" },
];

const BOWLER_SORT_OPTIONS: { value: BowlerSortField; label: string }[] = [
  { value: "wickets", label: "Wickets" },
  { value: "econ", label: "Economy" },
  { value: "trueEconomy", label: "True Economy" },
  { value: "avg", label: "Average" },
  { value: "sr", label: "Strike Rate" },
  { value: "dotPct", label: "Dot %" },
  { value: "boundaryPct", label: "Boundary %" },
  { value: "ballsPerBoundary", label: "Balls / Boundary" },
  { value: "matches", label: "Matches" },
  { value: "innings", label: "Innings" },
  { value: "player", label: "Player Name" },
];

function PlayerDrilldownSection({ player, state }: { player: string; state: MobileStatsHook }) {
  const [dimension, setDimension] = useState<"phase" | "bowler">("phase");
  const season = state.filters.season !== "All Seasons" ? state.filters.season : "";
  const team = state.filters.team !== "All Teams" ? state.filters.team : "";

  const query = useQuery({
    queryKey: ["ms3-drilldown", player, dimension, season, team],
    queryFn: async ({ signal }) => {
      const p = new URLSearchParams({ player, dimension });
      if (season) p.set("season", season);
      if (team) p.set("team", team);
      const res = await fetch(`/api/stats/drilldown?${p.toString()}`, { signal });
      const ct = res.headers.get("content-type") || "";
      if (!res.ok || !ct.includes("application/json")) {
        throw new Error("Drilldown telemetry unavailable in static mode");
      }
      const data = await res.json();
      if (!Array.isArray(data)) throw new Error("Invalid drilldown response");
      return data as { label: string; runs: number; balls: number; dismissals: number; dots: number; boundaries: number }[];
    },
    staleTime: 1000 * 60 * 5,
    retry: 0,
  });

  return (
    <div style={{ marginTop: 10, paddingTop: 10, borderTop: "1px solid var(--ms-border)" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 6, marginBottom: 8 }}>
        <span className="ms3-scope-label">Situation Drilldown</span>
        <div style={{ display: "flex", gap: 5 }}>
          {(["phase", "bowler"] as const).map((dim) => (
            <button
              key={dim}
              type="button"
              className="ms3-pill"
              style={{ height: 26, padding: "0 9px", fontSize: 10.5 }}
              data-active={dimension === dim}
              onClick={() => setDimension(dim)}
            >
              {dim === "phase" ? "By Phase" : "vs Bowlers"}
            </button>
          ))}
        </div>
      </div>

      {query.isLoading && (
        <div style={{ font: "500 11px/1.3 var(--m-ui)", color: "var(--ms-muted)" }}>
          Loading {dimension} breakdown…
        </div>
      )}

      {query.isError && (
        <div style={{ font: "500 11px/1.3 var(--m-ui)", color: "var(--ms-muted)" }}>
          Ball-level {dimension} drilldown requires live API server connection.
        </div>
      )}

      {!query.isLoading && !query.isError && query.data && query.data.length === 0 && (
        <div style={{ font: "500 11px/1.3 var(--m-ui)", color: "var(--ms-muted)" }}>
          No recorded deliveries for this breakdown in current filter scope.
        </div>
      )}

      {query.data && query.data.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
          {query.data.slice(0, 6).map((row) => {
            const sr = row.balls > 0 ? ((row.runs / row.balls) * 100).toFixed(1) : "—";
            return (
              <div
                key={row.label}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 8,
                  padding: "6px 8px",
                  borderRadius: 7,
                  background: "var(--ms-muted-bg)",
                  border: "1px solid var(--ms-border)",
                  fontSize: 11.5,
                }}
              >
                <span style={{ fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {row.label}
                </span>
                <span style={{ fontFamily: "var(--m-mono)", color: "var(--ms-muted)", flexShrink: 0 }}>
                  <strong style={{ color: "var(--ms-text)" }}>{row.runs}</strong> ({row.balls}b) · SR {sr}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function QueryStatusBox({
  state,
  count,
  kind,
}: {
  state: MobileStatsHook;
  count: number;
  kind: "batters" | "bowlers";
}) {
  if (state.loadingLeaderboard && count === 0) {
    return (
      <div className="ms3-card" style={{ gap: 8 }}>
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            style={{
              height: 54,
              borderRadius: 8,
              background: "var(--ms-muted-bg)",
              opacity: 0.7 - i * 0.12,
            }}
          />
        ))}
      </div>
    );
  }

  if (state.slicedApiUnavailable) {
    return (
      <div className="ms3-card">
        <div style={{ display: "flex", alignItems: "flex-start", gap: 9 }}>
          <AlertCircle size={18} style={{ color: "var(--ms-amber)", flexShrink: 0, marginTop: 2 }} />
          <div style={{ minWidth: 0 }}>
            <div style={{ font: "700 13px/1.2 var(--m-display)", color: "var(--ms-text)" }}>
              Live dimensional backend unavailable
            </div>
            <p style={{ margin: "4px 0 8px", font: "500 12px/1.4 var(--m-ui)", color: "var(--ms-muted)" }}>
              Multi-dimensional ball queries require the CricField `/api/stats/query` telemetry server. You can retry or reset back to cached career/season views.
            </p>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button type="button" className="ms3-btn" onClick={state.refetchDynamic}>
                Retry Query
              </button>
              <button type="button" className="ms3-btn ms3-btn-primary" onClick={state.resetAllFilters}>
                <RotateCcw size={12} /> Reset Filters
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (count === 0) {
    return (
      <div className="ms3-card">
        <div style={{ font: "700 13px/1.2 var(--m-display)" }}>
          No matching {kind} found
        </div>
        <p style={{ margin: 0, font: "500 12px/1.4 var(--m-ui)", color: "var(--ms-muted)" }}>
          Try relaxing your search query, minimum sample thresholds, or active dimensional filters.
        </p>
        <div>
          <button type="button" className="ms3-btn" onClick={state.resetAllFilters}>
            <RotateCcw size={12} /> Clear All Filters
          </button>
        </div>
      </div>
    );
  }

  return null;
}

export function MobileBattersTab({ state }: { state: MobileStatsHook }) {
  const [limit, setLimit] = useState(30);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [showDrilldown, setShowDrilldown] = useState(false);

  const rows = state.activeData.batters;
  const visible = rows.slice(0, limit);

  const primaryBatterValue = (b: any) => {
    switch (state.batterSortField) {
      case "sr":
        return fmtDec(b.sr, 1);
      case "avg":
        return fmtDec(b.avg, 1);
      case "boundaryPct":
        return `${fmtDec(b.boundaryPct, 1)}%`;
      case "highest":
        return fmtInt(b.highest);
      case "sixes":
        return fmtInt(b.sixes);
      case "fours":
        return fmtInt(b.fours);
      case "balls":
        return fmtInt(b.balls);
      case "hundreds":
        return fmtInt(b.hundreds);
      case "fifties":
        return fmtInt(b.fifties);
      case "matches":
        return fmtInt(b.matches);
      case "innings":
        return fmtInt(b.innings);
      default:
        return fmtInt(b.runs);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <div className="ms3-card" style={{ padding: "9px 11px", gap: 8 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 7, alignItems: "center" }}>
          <select
            className="ms3-select"
            aria-label="Sort batters by"
            value={state.batterSortField}
            onChange={(e) => state.handleBatterSort(e.target.value as BatterSortField)}
            data-testid="ms3-batter-sort"
          >
            {BATTER_SORT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>Sort: {o.label}</option>
            ))}
          </select>
          <button
            type="button"
            className="ms3-btn"
            style={{ minHeight: 38 }}
            onClick={() => state.handleBatterSort(state.batterSortField)}
            data-testid="ms3-batter-sort-dir"
            title="Toggle sort order"
          >
            <ArrowDownUp size={13} />
            {state.batterSortOrder === "desc" ? "DESC" : "ASC"}
          </button>
        </div>
      </div>

      <QueryStatusBox state={state} count={rows.length} kind="batters" />

      {visible.length > 0 && (
        <div className="ms3-card ms3-divider" style={{ padding: "4px 12px" }}>
          {visible.map((b, idx) => {
            const name = state.formatName(b.player);
            const team = state.getPlayerTeam(b.player, b);
            const short = teamShort(team);
            const color = teamColor(short);
            const isOpen = expanded === b.player;
            return (
              <div key={`${b.player}-${idx}`}>
                <button
                  type="button"
                  className="ms3-row-btn"
                  onClick={() => {
                    setExpanded(isOpen ? null : b.player);
                    setShowDrilldown(false);
                  }}
                  aria-expanded={isOpen}
                  data-testid={`ms3-batter-row-${idx}`}
                >
                  <span
                    style={{
                      width: 24,
                      textAlign: "center",
                      font: "700 11px/1 var(--m-mono)",
                      color: idx < 3 ? "var(--ms-accent)" : "var(--ms-muted)",
                      flexShrink: 0,
                    }}
                  >
                    {idx + 1}
                  </span>
                  <PlayerAvatar
                    name={b.player}
                    teamId={short}
                    playerImages={state.playerImages}
                    bio={state.getBioFor(b.player)}
                    className="w-9 h-9 rounded-full shrink-0"
                    disableHover
                  />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        font: "700 13px/1.2 var(--m-display)",
                        color: "var(--ms-text)",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {name}
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 3 }}>
                      <TeamLogo team={short} size="w-3.5 h-3.5" />
                      <span style={{ font: "700 10px/1 var(--m-mono)", color }}>{short}</span>
                      <span style={{ font: "500 10.5px/1 var(--m-ui)", color: "var(--ms-muted)" }}>
                        · {fmtInt(b.matches)}m · SR {fmtDec(b.sr, 1)}
                      </span>
                    </div>
                  </div>
                  <div style={{ textAlign: "right", flexShrink: 0 }}>
                    <div style={{ font: "800 14.5px/1.1 var(--m-display)", color: "var(--ms-text)" }}>
                      {primaryBatterValue(b)}
                    </div>
                    <div style={{ font: "600 10px/1.2 var(--m-mono)", color: "var(--ms-muted)", marginTop: 2 }}>
                      {state.batterSortField === "runs" ? `Avg ${fmtDec(b.avg, 1)}` : `${fmtInt(b.runs)}r`}
                    </div>
                  </div>
                  {isOpen ? (
                    <ChevronDown size={15} style={{ color: "var(--ms-muted)", flexShrink: 0 }} />
                  ) : (
                    <ChevronRight size={15} style={{ color: "var(--ms-muted)", flexShrink: 0 }} />
                  )}
                </button>

                {isOpen && (
                  <div style={{ paddingBottom: 12 }}>
                    <div className="ms3-kpi-grid-3">
                      <div className="ms3-kpi">
                        <div className="ms3-kpi-k">Runs / Balls</div>
                        <div className="ms3-kpi-v">{fmtInt(b.runs)} ({fmtInt(b.balls)})</div>
                      </div>
                      <div className="ms3-kpi">
                        <div className="ms3-kpi-k">Highest</div>
                        <div className="ms3-kpi-v">{fmtInt(b.highest)}</div>
                      </div>
                      <div className="ms3-kpi">
                        <div className="ms3-kpi-k">Avg / SR</div>
                        <div className="ms3-kpi-v">{fmtDec(b.avg, 1)} · {fmtDec(b.sr, 1)}</div>
                      </div>
                      <div className="ms3-kpi">
                        <div className="ms3-kpi-k">4s / 6s</div>
                        <div className="ms3-kpi-v">{fmtInt(b.fours)} / {fmtInt(b.sixes)}</div>
                      </div>
                      <div className="ms3-kpi">
                        <div className="ms3-kpi-k">100s / 50s</div>
                        <div className="ms3-kpi-v">{fmtInt(b.hundreds)} / {fmtInt(b.fifties)}</div>
                      </div>
                      <div className="ms3-kpi">
                        <div className="ms3-kpi-k">Boundary %</div>
                        <div className="ms3-kpi-v">{fmtDec(b.boundaryPct, 1)}%</div>
                      </div>
                    </div>

                    {showDrilldown && <PlayerDrilldownSection player={b.player} state={state} />}

                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginTop: 10 }}>
                      <button
                        type="button"
                        className="ms3-pill"
                        onClick={() => setShowDrilldown((v) => !v)}
                      >
                        {showDrilldown ? "Hide Drilldown" : "Phase & Bowler Drilldown"}
                      </button>
                      <Link
                        href={`/players/${playerSlug(b.player)}`}
                        className="ms3-pill"
                        style={{ textDecoration: "none", color: "var(--ms-accent)", borderColor: "var(--ms-accent-line)" }}
                      >
                        Full Profile <ExternalLink size={11} />
                      </Link>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {rows.length > limit && (
        <button
          type="button"
          className="ms3-btn"
          onClick={() => setLimit((n) => n + 30)}
          data-testid="ms3-batters-more"
        >
          Show 30 more batters ({rows.length - limit} remaining)
        </button>
      )}
    </div>
  );
}

export function MobileBowlersTab({ state }: { state: MobileStatsHook }) {
  const [limit, setLimit] = useState(30);
  const [expanded, setExpanded] = useState<string | null>(null);

  const rows = state.activeData.bowlers;
  const visible = rows.slice(0, limit);

  const primaryBowlerValue = (b: any) => {
    switch (state.bowlerSortField) {
      case "econ":
        return fmtDec(b.econ, 2);
      case "trueEconomy":
        return fmtDec(b.trueEconomy, 2);
      case "avg":
        return fmtDec(b.avg, 1);
      case "sr":
        return fmtDec(b.sr, 1);
      case "dotPct":
        return `${fmtDec(b.dotPct, 1)}%`;
      case "boundaryPct":
        return `${fmtDec(b.boundaryPct, 1)}%`;
      case "ballsPerBoundary":
        return fmtDec(b.ballsPerBoundary, 1);
      case "matches":
        return fmtInt(b.matches);
      case "innings":
        return fmtInt(b.innings);
      default:
        return fmtInt(b.wickets);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <div className="ms3-card" style={{ padding: "9px 11px", gap: 8 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 7, alignItems: "center" }}>
          <select
            className="ms3-select"
            aria-label="Sort bowlers by"
            value={state.bowlerSortField}
            onChange={(e) => state.handleBowlerSort(e.target.value as BowlerSortField)}
            data-testid="ms3-bowler-sort"
          >
            {BOWLER_SORT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>Sort: {o.label}</option>
            ))}
          </select>
          <button
            type="button"
            className="ms3-btn"
            style={{ minHeight: 38 }}
            onClick={() => state.handleBowlerSort(state.bowlerSortField)}
            data-testid="ms3-bowler-sort-dir"
          >
            <ArrowDownUp size={13} />
            {state.bowlerSortOrder === "desc" ? "DESC" : "ASC"}
          </button>
        </div>
      </div>

      <QueryStatusBox state={state} count={rows.length} kind="bowlers" />

      {visible.length > 0 && (
        <div className="ms3-card ms3-divider" style={{ padding: "4px 12px" }}>
          {visible.map((b, idx) => {
            const name = state.formatName(b.player);
            const team = state.getPlayerTeam(b.player, b);
            const short = teamShort(team);
            const color = teamColor(short);
            const isOpen = expanded === b.player;
            const bestFig =
              b.bestBowling ||
              (b.best_wickets !== undefined ? `${b.best_wickets}/${b.best_runs ?? 0}` : "—");
            return (
              <div key={`${b.player}-${idx}`}>
                <button
                  type="button"
                  className="ms3-row-btn"
                  onClick={() => setExpanded(isOpen ? null : b.player)}
                  aria-expanded={isOpen}
                  data-testid={`ms3-bowler-row-${idx}`}
                >
                  <span
                    style={{
                      width: 24,
                      textAlign: "center",
                      font: "700 11px/1 var(--m-mono)",
                      color: idx < 3 ? "var(--ms-accent)" : "var(--ms-muted)",
                      flexShrink: 0,
                    }}
                  >
                    {idx + 1}
                  </span>
                  <PlayerAvatar
                    name={b.player}
                    teamId={short}
                    playerImages={state.playerImages}
                    bio={state.getBioFor(b.player)}
                    className="w-9 h-9 rounded-full shrink-0"
                    disableHover
                  />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        font: "700 13px/1.2 var(--m-display)",
                        color: "var(--ms-text)",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {name}
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 3 }}>
                      <TeamLogo team={short} size="w-3.5 h-3.5" />
                      <span style={{ font: "700 10px/1 var(--m-mono)", color }}>{short}</span>
                      <span style={{ font: "500 10.5px/1 var(--m-ui)", color: "var(--ms-muted)" }}>
                        · {fmtInt(b.matches)}m · Econ {fmtDec(b.econ, 2)}
                      </span>
                    </div>
                  </div>
                  <div style={{ textAlign: "right", flexShrink: 0 }}>
                    <div style={{ font: "800 14.5px/1.1 var(--m-display)", color: "var(--ms-text)" }}>
                      {primaryBowlerValue(b)}
                    </div>
                    <div style={{ font: "600 10px/1.2 var(--m-mono)", color: "var(--ms-muted)", marginTop: 2 }}>
                      {state.bowlerSortField === "wickets" ? `SR ${fmtDec(b.sr, 1)}` : `${fmtInt(b.wickets)}w`}
                    </div>
                  </div>
                  {isOpen ? (
                    <ChevronDown size={15} style={{ color: "var(--ms-muted)", flexShrink: 0 }} />
                  ) : (
                    <ChevronRight size={15} style={{ color: "var(--ms-muted)", flexShrink: 0 }} />
                  )}
                </button>

                {isOpen && (
                  <div style={{ paddingBottom: 12 }}>
                    <div className="ms3-kpi-grid-3">
                      <div className="ms3-kpi">
                        <div className="ms3-kpi-k">Wickets / Best</div>
                        <div className="ms3-kpi-v">{fmtInt(b.wickets)} ({bestFig})</div>
                      </div>
                      <div className="ms3-kpi">
                        <div className="ms3-kpi-k">Econ / True</div>
                        <div className="ms3-kpi-v">{fmtDec(b.econ, 2)} / {fmtDec(b.trueEconomy, 2)}</div>
                      </div>
                      <div className="ms3-kpi">
                        <div className="ms3-kpi-k">Avg / SR</div>
                        <div className="ms3-kpi-v">{fmtDec(b.avg, 1)} · {fmtDec(b.sr, 1)}</div>
                      </div>
                      <div className="ms3-kpi">
                        <div className="ms3-kpi-k">Dot %</div>
                        <div className="ms3-kpi-v">{fmtDec(b.dotPct, 1)}%</div>
                      </div>
                      <div className="ms3-kpi">
                        <div className="ms3-kpi-k">Bnd %</div>
                        <div className="ms3-kpi-v">{fmtDec(b.boundaryPct, 1)}%</div>
                      </div>
                      <div className="ms3-kpi">
                        <div className="ms3-kpi-k">4W / 5W</div>
                        <div className="ms3-kpi-v">{fmtInt(b.fourW ?? b.fourWickets)} / {fmtInt(b.fiveW ?? b.fiveWickets)}</div>
                      </div>
                    </div>

                    <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 10 }}>
                      <Link
                        href={`/players/${playerSlug(b.player)}`}
                        className="ms3-pill"
                        style={{ textDecoration: "none", color: "var(--ms-accent)", borderColor: "var(--ms-accent-line)" }}
                      >
                        Full Profile <ExternalLink size={11} />
                      </Link>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {rows.length > limit && (
        <button type="button" className="ms3-btn" onClick={() => setLimit((n) => n + 30)}>
          Show 30 more bowlers ({rows.length - limit} remaining)
        </button>
      )}
    </div>
  );
}

export function MobileBatterLensTab({ state }: { state: MobileStatsHook }) {
  const { data, isLoading, isError, refetch } = useLensRankings(true);

  const [bowlerFilter, setBowlerFilter] = useState<"all" | "pace" | "spin">("all");
  const [phaseFilter, setPhaseFilter] = useState<"all" | "pp" | "mid" | "death">("all");
  const [minBalls, setMinBalls] = useState<number>(250);
  const [sortBy, setSortBy] = useState<"raa" | "sr" | "balls">("raa");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [limit, setLimit] = useState(30);

  // Sync season bounds seamlessly from global filters when chosen
  const sFrom =
    state.filters.seasonFrom
      ? Number(state.filters.seasonFrom)
      : state.filters.season !== "All Seasons"
        ? Number(state.filters.season)
        : 2008;
  const sTo =
    state.filters.seasonTo
      ? Number(state.filters.seasonTo)
      : state.filters.season !== "All Seasons"
        ? Number(state.filters.season)
        : 2026;

  const ranked = useMemo(() => {
    if (!data) return [];
    const wantType = bowlerFilter === "pace" ? 1 : bowlerFilter === "spin" ? 2 : null;
    const wantPhase = phaseFilter === "pp" ? 0 : phaseFilter === "mid" ? 1 : phaseFilter === "death" ? 2 : null;
    const acc = new Map<number, { balls: number; runs: number; outs: number; raaTotal: number; dots: number; bnd: number }>();

    for (const row of data.rows) {
      const [nameIdx, season, t, ph, balls, runs, outs, raa, dots, bnd] = row;
      if (season < sFrom || season > sTo) continue;
      if (wantType !== null && t !== wantType) continue;
      if (wantPhase !== null && ph !== wantPhase) continue;
      const prev = acc.get(nameIdx) ?? { balls: 0, runs: 0, outs: 0, raaTotal: 0, dots: 0, bnd: 0 };
      prev.balls += balls;
      prev.runs += runs;
      prev.outs += outs;
      prev.raaTotal += raa;
      prev.dots += dots;
      prev.bnd += bnd;
      acc.set(nameIdx, prev);
    }

    const q = state.debouncedSearch.trim().toLowerCase();
    const out: {
      name: string;
      balls: number;
      runs: number;
      outs: number;
      sr: number;
      raa100: number;
      raaTotal: number;
      dotPct: number;
      bndPct: number;
      avg: number | null;
    }[] = [];

    for (const [idx, v] of acc.entries()) {
      if (v.balls < minBalls) continue;
      const name = data.names[idx] || "";
      if (!name) continue;
      if (q && !name.toLowerCase().includes(q) && !state.formatName(name).toLowerCase().includes(q)) continue;
      out.push({
        name,
        balls: v.balls,
        runs: v.runs,
        outs: v.outs,
        sr: v.balls ? (v.runs / v.balls) * 100 : 0,
        raa100: v.balls ? v.raaTotal / v.balls : 0,
        raaTotal: v.raaTotal / 100,
        dotPct: v.balls ? (v.dots / v.balls) * 100 : 0,
        bndPct: v.balls ? (v.bnd / v.balls) * 100 : 0,
        avg: v.outs > 0 ? v.runs / v.outs : null,
      });
    }

    out.sort((a, b) => {
      if (sortBy === "sr") return b.sr - a.sr;
      if (sortBy === "balls") return b.balls - a.balls;
      return b.raa100 - a.raa100;
    });

    return out;
  }, [data, bowlerFilter, phaseFilter, sFrom, sTo, minBalls, sortBy, state]);

  const visible = ranked.slice(0, limit);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <div className="ms3-card" style={{ gap: 9 }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
          <Info size={14} style={{ color: "var(--ms-accent)", flexShrink: 0, marginTop: 2 }} />
          <div style={{ font: "500 11.5px/1.35 var(--m-ui)", color: "var(--ms-muted)" }}>
            <strong style={{ color: "var(--ms-text)" }}>Batter Lens (RAA / 100):</strong> Ball-by-ball Runs Above Average after subtracting league phase & bowling baseline ({sFrom}–{sTo}), separate from raw career totals.
          </div>
        </div>

        <div className="ms3-hscroll">
          {(["all", "pace", "spin"] as const).map((bt) => (
            <button
              key={bt}
              type="button"
              className="ms3-pill"
              data-active={bowlerFilter === bt}
              onClick={() => setBowlerFilter(bt)}
            >
              {bt === "all" ? "All Bowlers" : bt === "pace" ? "vs Pace" : "vs Spin"}
            </button>
          ))}
          {(
            [
              ["all", "All Phases"],
              ["pp", "Powerplay"],
              ["mid", "Middle"],
              ["death", "Death"],
            ] as const
          ).map(([ph, lbl]) => (
            <button
              key={ph}
              type="button"
              className="ms3-pill"
              data-active={phaseFilter === ph}
              onClick={() => setPhaseFilter(ph)}
            >
              {lbl}
            </button>
          ))}
        </div>

        <div className="ms3-hscroll">
          {[100, 250, 500, 1000].map((m) => (
            <button
              key={m}
              type="button"
              className="ms3-pill"
              data-active={minBalls === m}
              onClick={() => setMinBalls(m)}
            >
              Min {m}b
            </button>
          ))}
          {(
            [
              ["raa", "Rank: RAA/100"],
              ["sr", "Rank: SR"],
              ["balls", "Rank: Balls"],
            ] as const
          ).map(([k, lbl]) => (
            <button
              key={k}
              type="button"
              className="ms3-pill"
              data-active={sortBy === k}
              onClick={() => setSortBy(k)}
            >
              {lbl}
            </button>
          ))}
        </div>
      </div>

      {isLoading && (
        <div className="ms3-card" style={{ font: "500 12px/1.4 var(--m-ui)", color: "var(--ms-muted)" }}>
          Loading Batter Lens ratings index…
        </div>
      )}

      {isError && (
        <div className="ms3-card">
          <div style={{ font: "700 13px/1.2 var(--m-display)" }}>Batter Lens data failed to load</div>
          <button type="button" className="ms3-btn" onClick={() => void refetch()}>
            Retry
          </button>
        </div>
      )}

      {!isLoading && !isError && ranked.length === 0 && (
        <div className="ms3-card">
          <div style={{ font: "700 13px/1.2 var(--m-display)" }}>No Batter Lens entries pass current threshold</div>
          <p style={{ margin: 0, font: "500 12px/1.35 var(--m-ui)", color: "var(--ms-muted)" }}>
            Lower Minimum Balls or broaden Season / Search filters.
          </p>
        </div>
      )}

      {visible.length > 0 && (
        <div className="ms3-card ms3-divider" style={{ padding: "4px 12px" }}>
          {visible.map((r, idx) => {
            const name = state.formatName(r.name);
            const team = state.getPlayerTeam(r.name);
            const short = teamShort(team);
            const isOpen = expanded === r.name;
            const raaPositive = r.raa100 >= 0;
            return (
              <div key={r.name}>
                <button
                  type="button"
                  className="ms3-row-btn"
                  onClick={() => setExpanded(isOpen ? null : r.name)}
                  aria-expanded={isOpen}
                  data-testid={`ms3-lens-row-${idx}`}
                >
                  <span style={{ width: 24, textAlign: "center", font: "700 11px/1 var(--m-mono)", color: "var(--ms-muted)", flexShrink: 0 }}>
                    {idx + 1}
                  </span>
                  <PlayerAvatar
                    name={r.name}
                    teamId={short}
                    playerImages={state.playerImages}
                    bio={state.getBioFor(r.name)}
                    className="w-9 h-9 rounded-full shrink-0"
                    disableHover
                  />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ font: "700 13px/1.2 var(--m-display)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {name}
                    </div>
                    <div style={{ font: "500 10.5px/1.2 var(--m-ui)", color: "var(--ms-muted)", marginTop: 2 }}>
                      {short} · {fmtInt(r.balls)}b · SR {r.sr.toFixed(1)}
                    </div>
                  </div>
                  <div style={{ textAlign: "right", flexShrink: 0 }}>
                    <div
                      style={{
                        font: "800 14px/1.1 var(--m-mono)",
                        color: raaPositive ? "var(--ms-ok)" : "var(--ms-bad)",
                      }}
                    >
                      {raaPositive ? "+" : ""}{r.raa100.toFixed(1)}
                    </div>
                    <div style={{ font: "600 9.5px/1.2 var(--m-mono)", color: "var(--ms-muted)", marginTop: 2 }}>
                      RAA / 100
                    </div>
                  </div>
                  {isOpen ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
                </button>

                {isOpen && (
                  <div style={{ paddingBottom: 12 }}>
                    <div className="ms3-kpi-grid-3">
                      <div className="ms3-kpi">
                        <div className="ms3-kpi-k">Runs / Outs</div>
                        <div className="ms3-kpi-v">{fmtInt(r.runs)} / {fmtInt(r.outs)}</div>
                      </div>
                      <div className="ms3-kpi">
                        <div className="ms3-kpi-k">Avg</div>
                        <div className="ms3-kpi-v">{r.avg !== null ? r.avg.toFixed(1) : "—"}</div>
                      </div>
                      <div className="ms3-kpi">
                        <div className="ms3-kpi-k">Total RAA</div>
                        <div className="ms3-kpi-v">{r.raaTotal >= 0 ? "+" : ""}{r.raaTotal.toFixed(0)}</div>
                      </div>
                      <div className="ms3-kpi">
                        <div className="ms3-kpi-k">Dot %</div>
                        <div className="ms3-kpi-v">{r.dotPct.toFixed(1)}%</div>
                      </div>
                      <div className="ms3-kpi">
                        <div className="ms3-kpi-k">Boundary %</div>
                        <div className="ms3-kpi-v">{r.bndPct.toFixed(1)}%</div>
                      </div>
                      <div className="ms3-kpi">
                        <div className="ms3-kpi-k">Strike Rate</div>
                        <div className="ms3-kpi-v">{r.sr.toFixed(1)}</div>
                      </div>
                    </div>
                    <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 10 }}>
                      <Link
                        href={`/players/${playerSlug(r.name)}`}
                        className="ms3-pill"
                        style={{ textDecoration: "none", color: "var(--ms-accent)", borderColor: "var(--ms-accent-line)" }}
                      >
                        Full Profile <ExternalLink size={11} />
                      </Link>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {ranked.length > limit && (
        <button type="button" className="ms3-btn" onClick={() => setLimit((n) => n + 30)}>
          Show 30 more ({ranked.length - limit} remaining)
        </button>
      )}
    </div>
  );
}
