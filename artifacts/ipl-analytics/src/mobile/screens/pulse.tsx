import "./pulse.css";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Calendar, Check, ChevronDown, Gavel, Search } from "lucide-react";
import { Sheet } from "@/mobile/shell";
import { HUB_EVENTS } from "@/lib/ipl-2027";
import { useIpl2027Desk } from "@/lib/ipl-2027-desk";
import { PULSE_TABS, usePulseAuction, type PulseTab } from "@/lib/pulse-auction";
import { auctionPhase } from "@/lib/pulse-helpers";
import { PULSE_CATEGORIES, categoryForTab, type PulseCategoryId } from "./pulse/nav-config";
import { MobileOverviewTab } from "./pulse/overview-tab";
import { MobileLiveAuctionTab, MobilePlayerPoolTab } from "./pulse/auction-tabs";
import {
  MobileFranchisesTab,
  MobileResultsTab,
  MobileRetentionsTab,
} from "./pulse/teams-tabs";
import { MobileKnowledgeGraphTab, MobileTransfersTab } from "./pulse/intel-tabs";
import { MobileArchiveTab, MobileLiveBlogTab } from "./pulse/coverage-tabs";

function parseInitialTab(): PulseTab {
  if (typeof window === "undefined") return "Overview";
  const p = new URLSearchParams(window.location.search).get("tab");
  if (p) {
    const normalized = p.replace(/[-_]/g, " ").toLowerCase();
    const match = PULSE_TABS.find(
      (t) => t.toLowerCase() === p.toLowerCase() || t.toLowerCase() === normalized,
    );
    if (match) return match;
  }
  return "Overview";
}

function parseInitialSeason(): number | null {
  if (typeof window === "undefined") return null;
  const s = new URLSearchParams(window.location.search).get("season");
  if (s && !isNaN(Number(s))) return Number(s);
  return null;
}

export default function MobilePulse() {
  const pageRef = useRef<HTMLDivElement>(null);
  const phase = useMemo(auctionPhase, []);

  const [season, setSeasonState] = useState<number | null>(parseInitialSeason);
  const [tab, setTabState] = useState<PulseTab>(parseInitialTab);
  const [lastTabByCat, setLastTabByCat] = useState<Record<PulseCategoryId, PulseTab>>({
    auction: "Overview",
    teams: "Franchises",
    intel: "Transfers",
    coverage: "Live Blog",
  });
  const [seasonSheetOpen, setSeasonSheetOpen] = useState(false);

  const probe = useIpl2027Desk();
  const active = season ?? (probe.data?.lots.length ? 2027 : 2026);
  const pulse = usePulseAuction(active);
  const { model } = pulse;

  const activeCategory = useMemo(() => categoryForTab(tab), [tab]);

  // Measure actual height of .cfm-top so sticky two-level nav docks seamlessly underneath
  useEffect(() => {
    const topBar = document.querySelector<HTMLElement>(".cfm-top");
    const node = pageRef.current;
    if (!topBar || !node) return;
    const syncTop = () => {
      const h = Math.round(topBar.getBoundingClientRect().height);
      if (h > 0) node.style.setProperty("--mp-sticky-top", `${h}px`);
    };
    syncTop();
    if (typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(syncTop);
    ro.observe(topBar);
    return () => ro.disconnect();
  }, []);

  const setTab = useCallback((nextTab: PulseTab, pushHistory = true) => {
    setTabState(nextTab);
    const cat = categoryForTab(nextTab);
    setLastTabByCat((prev) => ({ ...prev, [cat.id]: nextTab }));
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, left: 0, behavior: "instant" });
      const url = new URL(window.location.href);
      if (nextTab === "Overview") url.searchParams.delete("tab");
      else url.searchParams.set("tab", nextTab);
      const nextUrl = url.pathname + (url.search ? url.search : "");
      const currUrl = window.location.pathname + window.location.search;
      if (pushHistory && currUrl !== nextUrl) {
        window.history.pushState({ tab: nextTab }, "", nextUrl);
      }
    }
  }, []);

  const setSeason = useCallback((nextSeason: number, pushHistory = true) => {
    setSeasonState(nextSeason);
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.searchParams.set("season", String(nextSeason));
      const nextUrl = url.pathname + url.search;
      if (pushHistory) window.history.pushState({ season: nextSeason }, "", nextUrl);
      else window.history.replaceState({ season: nextSeason }, "", nextUrl);
    }
  }, []);

  // Browser Back / Forward synchronization
  useEffect(() => {
    const onPopState = () => {
      const nextTab = parseInitialTab();
      const nextSeason = parseInitialSeason();
      setTabState(nextTab);
      setSeasonState(nextSeason);
      const cat = categoryForTab(nextTab);
      setLastTabByCat((prev) => ({ ...prev, [cat.id]: nextTab }));
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  const handleCategoryClick = (catId: PulseCategoryId) => {
    if (catId === activeCategory.id) return;
    const target = lastTabByCat[catId] ?? PULSE_CATEGORIES.find((c) => c.id === catId)!.tabs[0];
    setTab(target, true);
  };

  const upcomingAuction = HUB_EVENTS.find((e) => e.id === "auction");
  const daysLeft = useMemo(() => {
    if (!upcomingAuction?.date) return null;
    const today = new Date().toLocaleDateString("en-CA");
    return Math.ceil((Date.parse(upcomingAuction.date) - Date.parse(today)) / 86_400_000);
  }, [upcomingAuction?.date]);

  const seasonOptions = useMemo(
    () => [2027, ...pulse.seasons.filter((s) => s !== 2027)],
    [pulse.seasons],
  );

  return (
    <div ref={pageRef} className="mp-page" data-testid="mobile-pulse-page">
      {/* Compact Contextual Auction Pulse Header */}
      <header className="mp-ctx-header">
        <div className="mp-ctx-row">
          <div className="mp-title-wrap">
            <h1 className="mp-title">
              <span>Auction</span>
              <span className="mp-title-accent">Pulse</span>
            </h1>
            <div className="mp-meta-line">
              <span className="mp-phase-badge">{phase.name}</span>
              <span>
                {active === 2027
                  ? "Live Intelligence Desk"
                  : `Archive · ${model.sold} Sold`}
              </span>
            </div>
          </div>

          <div className="mp-ctx-actions">
            <button
              type="button"
              onClick={() => setSeasonSheetOpen(true)}
              className="mp-season-btn"
              aria-label={`Select IPL season, currently IPL ${active}`}
              data-testid="mp-season-trigger"
            >
              <Calendar className="w-3.5 h-3.5 text-orange-400" />
              <span>IPL {active}</span>
              <ChevronDown className="w-3.5 h-3.5 opacity-70" />
            </button>
            <button
              type="button"
              onClick={() => setTab("Player Pool")}
              className="mp-icon-btn"
              aria-label="Search auction player pool"
              title="Jump to Player Pool search"
            >
              <Search className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Compact Upcoming Event Banner */}
        <div className="mp-upcoming-bar">
          <div className="mp-upcoming-info">
            <div className="mp-upcoming-kicker">
              <Gavel className="w-3 h-3" />
              <span>
                IPL 2027 Auction
                {daysLeft != null && daysLeft > 0 ? ` · ${daysLeft}d left` : ""}
              </span>
            </div>
            <div className="mp-upcoming-sub">
              {active === 2027
                ? "Viewing upcoming 2027 tracking desk"
                : `${upcomingAuction?.date ?? "Date TBA"} · 2026 shown as reference`}
            </div>
          </div>
          <button
            type="button"
            onClick={() => setSeason(active === 2027 ? 2026 : 2027)}
            className="mp-upcoming-cta"
          >
            {active === 2027 ? "View 2026" : "Open 2027"}
          </button>
        </div>
      </header>

      {/* Sticky Two-Level Navigation System */}
      <nav className="mp-nav-sticky" aria-label="Auction Pulse navigation">
        {/* LEVEL 1: 4 Rectangular Category Tiles */}
        <div className="mp-l1-bar" role="tablist" aria-label="Auction Pulse categories">
          {PULSE_CATEGORIES.map((cat) => {
            const on = cat.id === activeCategory.id;
            const Icon = cat.icon;
            return (
              <button
                key={cat.id}
                type="button"
                role="tab"
                aria-selected={on}
                data-active={on ? "true" : "false"}
                data-category-id={cat.id}
                onClick={() => handleCategoryClick(cat.id)}
                className="mp-l1-btn"
              >
                <Icon className="w-3 h-3" />
                <span className="mp-l1-label">{cat.shortLabel}</span>
              </button>
            );
          })}
        </div>

        {/* LEVEL 2: Rounded Capsule Subtabs */}
        <div
          className="mp-l2-bar"
          role="tablist"
          aria-label={`${activeCategory.label} subtabs`}
        >
          {activeCategory.tabs.map((subTab) => {
            const on = subTab === tab;
            return (
              <button
                key={subTab}
                type="button"
                role="tab"
                aria-selected={on}
                data-active={on ? "true" : "false"}
                data-subtab={subTab}
                onClick={() => setTab(subTab)}
                className="mp-l2-pill"
              >
                <span>{subTab}</span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* Active Subtab Content */}
      <div className="mp-body">
        {pulse.loading ? (
          <section className="mp-card py-8 text-center text-xs" style={{ color: "var(--mp-muted)" }}>
            Loading IPL {active} auction records…
          </section>
        ) : pulse.error ? (
          <section className="mp-card py-8 text-center text-xs" style={{ color: "var(--mp-bad)" }}>
            Auction records are unavailable right now. Please try again shortly.
          </section>
        ) : (
          <AnimatePresence mode="wait">
            <motion.div
              key={`${active}-${tab}`}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.14, ease: "easeOut" }}
            >
              {tab === "Overview" && (
                <MobileOverviewTab
                  model={model}
                  pulse={pulse}
                  phase={phase.name}
                  go={(t) => setTab(t)}
                />
              )}
              {tab === "Live Auction" && (
                <MobileLiveAuctionTab
                  key={active}
                  model={model}
                  pulse={pulse}
                  active={active}
                />
              )}
              {tab === "Player Pool" && <MobilePlayerPoolTab model={model} />}
              {tab === "Franchises" && <MobileFranchisesTab model={model} />}
              {tab === "Retentions" && <MobileRetentionsTab model={model} pulse={pulse} />}
              {tab === "Results" && <MobileResultsTab model={model} />}
              {tab === "Transfers" && <MobileTransfersTab activeSeason={active} />}
              {tab === "Knowledge Graph" && <MobileKnowledgeGraphTab />}
              {tab === "Live Blog" && <MobileLiveBlogTab model={model} pulse={pulse} />}
              {tab === "Archive" && (
                <MobileArchiveTab
                  pulse={pulse}
                  active={active}
                  onSelectSeasonAndTab={(yr, targetTab) => {
                    setSeason(yr, false);
                    if (targetTab) setTab(targetTab, true);
                  }}
                />
              )}
            </motion.div>
          </AnimatePresence>
        )}
      </div>

      {/* Season Picker Bottom Sheet */}
      {seasonSheetOpen && (
        <Sheet title="Select IPL Season" onClose={() => setSeasonSheetOpen(false)}>
          <div className="space-y-1.5 pb-2">
            {seasonOptions.map((s) => {
              const on = s === active;
              return (
                <button
                  key={s}
                  type="button"
                  onClick={() => {
                    setSeason(s);
                    setSeasonSheetOpen(false);
                  }}
                  className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg border text-left"
                  style={{
                    borderColor: on ? "var(--mp-accent)" : "var(--mp-border)",
                    background: on ? "var(--mp-accent-soft)" : "var(--mp-surface-muted)",
                    color: "var(--mp-text)",
                    font: "700 13px/1.2 var(--m-ui)",
                  }}
                >
                  <span>
                    IPL {s} {s === 2027 ? "· Upcoming / Live" : "· Verified Archive"}
                  </span>
                  {on && <Check className="w-4 h-4" style={{ color: "var(--mp-accent)" }} />}
                </button>
              );
            })}
          </div>
        </Sheet>
      )}
    </div>
  );
}
