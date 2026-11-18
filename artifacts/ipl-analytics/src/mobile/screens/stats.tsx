import "./stats-centre.css";
import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "wouter";
import { Search, X } from "lucide-react";
import { playerSlug, teamShort, venueHref, venueImage } from "@/lib/aggregates";
import { TEAM_CODE_TO_SLUG, type TeamCode } from "@/lib/team-context";
import { MobileChromeContext } from "../gate";
import { STATS_CATEGORIES, categoryForStatsTab, type StatsCategoryId, type StatsTabId } from "./stats/nav-config";
import { useMobileStats } from "./stats/use-mobile-stats";
import { MobileSlicingSystem } from "./stats/slicing-sheet";
import { MobileBatterLensTab, MobileBattersTab, MobileBowlersTab } from "./stats/players-tabs";
import { MobileHeadToHeadTab, MobileTeamsTab } from "./stats/teams-tabs";
import { MobileRecordBookTab, MobileVenuesTab } from "./stats/explore-tabs";
import { MobileTacticsTab } from "./stats/intel-tab";

export default function MobileStats() {
  const pageRef = useRef<HTMLDivElement>(null);
  const state = useMobileStats();
  const activeCat = useMemo(() => categoryForStatsTab(state.activeTab), [state.activeTab]);
  const [lastTabByCat, setLastTabByCat] = useState<Record<StatsCategoryId, StatsTabId>>({
    players: "batters",
    teams: "teams",
    explore: "venues",
    intelligence: "tactics",
  });

  // Measure sticky header clearance dynamically under .cfm-top
  useEffect(() => {
    const page = pageRef.current;
    if (!page) return;
    const syncTop = () => {
      const topBar = document.querySelector(".cfm-top") as HTMLElement | null;
      const h = topBar ? Math.round(topBar.getBoundingClientRect().height) : 54;
      page.style.setProperty("--ms3-sticky-top", `${h}px`);
    };
    syncTop();
    const topBar = document.querySelector(".cfm-top");
    const ro = typeof ResizeObserver !== "undefined" && topBar ? new ResizeObserver(syncTop) : null;
    if (ro && topBar) ro.observe(topBar);
    window.addEventListener("resize", syncTop);
    return () => {
      ro?.disconnect();
      window.removeEventListener("resize", syncTop);
    };
  }, []);

  const selectTab = (tab: StatsTabId) => {
    const cat = categoryForStatsTab(tab).id;
    setLastTabByCat((prev) => ({ ...prev, [cat]: tab }));
    state.setActiveTab(tab);
  };

  const selectCategory = (catId: StatsCategoryId) => {
    const cat = STATS_CATEGORIES.find((c) => c.id === catId);
    if (!cat) return;
    const remembered = lastTabByCat[catId];
    const target = cat.tabs.some((t) => t.id === remembered) ? remembered : cat.tabs[0].id;
    state.setActiveTab(target);
  };

  // Instant contextual quick-jump destinations when searching
  const quickDestinations = useMemo(() => {
    const q = state.searchQuery.trim().toLowerCase();
    if (q.length < 2) return [];
    const items: { label: string; kind: string; href: string }[] = [];

    const matchedTeam = state.teamOptions.find((t) => t.toLowerCase().includes(q));
    if (matchedTeam) {
      const slug = TEAM_CODE_TO_SLUG[matchedTeam.toUpperCase() as TeamCode];
      if (slug) items.push({ label: `${matchedTeam} Franchise`, kind: "Team", href: `/teams/${slug}` });
    }

    const matchedPlayer = state.batterOptionNames.find(
      (n) => n.toLowerCase().includes(q) || state.formatName(n).toLowerCase().includes(q),
    );
    if (matchedPlayer) {
      items.push({
        label: state.formatName(matchedPlayer),
        kind: "Player",
        href: `/players/${playerSlug(matchedPlayer)}`,
      });
    }

    const matchedVenue = state.venueOptions.find((v) => v.toLowerCase().includes(q));
    if (matchedVenue) {
      items.push({
        label: matchedVenue.split(",")[0],
        kind: "Venue",
        href: venueHref(matchedVenue),
      });
    }
    return items.slice(0, 3);
  }, [state.searchQuery, state.teamOptions, state.batterOptionNames, state.venueOptions, state]);

  const headerBg = venueImage("Wankhede Stadium, Mumbai");

  return (
    <MobileChromeContext.Provider value={true}>
      <div ref={pageRef} className="ms3-page" data-testid="ms3-page">
        {/* Compact Header */}
        <header className="ms3-header">
          {headerBg && <img src={headerBg} alt="" className="ms3-header-bg" aria-hidden="true" />}
          <div className="ms3-header-scrim" aria-hidden="true" />

          <div className="ms3-title-row">
            <div>
              <h1 className="ms3-title">STATS CENTRE</h1>
              <p className="ms3-subtitle">Every number tells a story.</p>
            </div>
            <span
              style={{
                font: "700 10px/1 var(--m-mono)",
                padding: "4px 7px",
                borderRadius: 6,
                border: "1px solid var(--ms-border)",
                background: "var(--ms-surface)",
                color: "var(--ms-accent)",
              }}
            >
              IPL WAREHOUSE
            </span>
          </div>

          <div className="ms3-search-wrap">
            <Search size={14} className="ms3-search-icon" />
            <input
              type="text"
              className="ms3-input ms3-input--search"
              placeholder="Search players, teams or venues..."
              value={state.searchQuery}
              onChange={(e) => state.setSearchQuery(e.target.value)}
              aria-label="Search Stats Centre"
              data-testid="ms3-search-input"
            />
            {state.searchQuery && (
              <button
                type="button"
                onClick={() => state.setSearchQuery("")}
                aria-label="Clear search"
                style={{
                  position: "absolute",
                  right: 8,
                  top: "50%",
                  transform: "translateY(-50%)",
                  padding: 4,
                  color: "var(--ms-muted)",
                }}
              >
                <X size={14} />
              </button>
            )}
          </div>

          {quickDestinations.length > 0 && (
            <div className="ms3-hscroll" style={{ position: "relative", zIndex: 1 }}>
              {quickDestinations.map((d) => (
                <Link
                  key={d.href}
                  href={d.href}
                  className="ms3-pill"
                  style={{ textDecoration: "none", color: "var(--ms-text)" }}
                >
                  <span style={{ color: "var(--ms-accent)", fontSize: 10 }}>{d.kind}:</span>
                  <span>{d.label}</span>
                </Link>
              ))}
            </div>
          )}

          {/* 3-in-row Global Selectors */}
          <div className="ms3-scope-row">
            <div className="ms3-scope-box">
              <span className="ms3-scope-label">Comp</span>
              <select
                className="ms3-select-inline"
                value="IPL"
                aria-label="Competition"
                onChange={() => {}}
              >
                <option value="IPL">IPL</option>
              </select>
            </div>

            <div className="ms3-scope-box">
              <span className="ms3-scope-label">
                {state.filters.seasonFrom || state.filters.seasonTo ? "Season (Range)" : "Season"}
              </span>
              <select
                className="ms3-select-inline"
                aria-label="Global Season"
                value={
                  state.filters.seasonFrom || state.filters.seasonTo
                    ? "__custom_range__"
                    : state.filters.season
                }
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === "__custom_range__") return;
                  state.setFilter("seasonFrom", "");
                  state.setFilter("seasonTo", "");
                  state.setFilter("season", val);
                }}
                data-testid="ms3-global-season"
              >
                {(state.filters.seasonFrom || state.filters.seasonTo) && (
                  <option value="__custom_range__">
                    {state.filters.seasonFrom || "2008"}–{state.filters.seasonTo || "2026"}
                  </option>
                )}
                <option value="All Seasons">All Seasons</option>
                {state.seasonList.map((yr) => (
                  <option key={yr} value={yr}>{yr}</option>
                ))}
              </select>
            </div>

            <div className="ms3-scope-box">
              <span className="ms3-scope-label">Franchise</span>
              <select
                className="ms3-select-inline"
                aria-label="Global Franchise"
                value={state.filters.team}
                onChange={(e) => state.setFilter("team", e.target.value)}
                data-testid="ms3-global-team"
              >
                <option value="All Teams">All Teams</option>
                {state.teamOptions.map((t) => (
                  <option key={t} value={t}>{teamShort(t)}</option>
                ))}
              </select>
            </div>
          </div>
        </header>

        {/* Sticky Two-Level Navigation */}
        <nav className="ms3-nav-sticky" aria-label="Stats Centre Sections">
          <div className="ms3-l1-bar" role="tablist" aria-label="Primary categories">
            {STATS_CATEGORIES.map((cat) => {
              const Icon = cat.icon;
              const on = activeCat.id === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  role="tab"
                  aria-selected={on}
                  className="ms3-l1-btn"
                  data-active={on}
                  onClick={() => selectCategory(cat.id)}
                  data-testid={`ms3-l1-${cat.id}`}
                >
                  <Icon size={15} strokeWidth={on ? 2.4 : 2} />
                  <span className="ms3-l1-label">{cat.label}</span>
                </button>
              );
            })}
          </div>

          <div className="ms3-l2-bar" role="tablist" aria-label="Sub-sections">
            {activeCat.tabs.map((tab) => {
              const on = state.activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={on}
                  className="ms3-l2-pill"
                  data-active={on}
                  onClick={() => selectTab(tab.id)}
                  data-testid={`ms3-l2-${tab.id}`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        </nav>

        {/* Always-Visible Universal Dimensional Slicing Bar */}
        <MobileSlicingSystem state={state} />

        {/* Active Tab View */}
        <section className="ms3-body" aria-label="Active Stats View">
          {state.activeTab === "batters" && <MobileBattersTab state={state} />}
          {state.activeTab === "bowlers" && <MobileBowlersTab state={state} />}
          {state.activeTab === "batter-lens" && <MobileBatterLensTab state={state} />}
          {state.activeTab === "teams" && <MobileTeamsTab state={state} />}
          {state.activeTab === "head2head" && (
            <MobileHeadToHeadTab state={state} onOpenTactics={() => selectTab("tactics")} />
          )}
          {state.activeTab === "venues" && <MobileVenuesTab state={state} />}
          {state.activeTab === "records" && <MobileRecordBookTab state={state} />}
          {state.activeTab === "tactics" && <MobileTacticsTab state={state} />}
        </section>
      </div>
    </MobileChromeContext.Provider>
  );
}
