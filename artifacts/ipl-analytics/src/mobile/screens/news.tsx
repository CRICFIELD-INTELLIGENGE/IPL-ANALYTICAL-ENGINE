import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { Link } from "wouter";
import { AnimatePresence, MotionConfig, motion } from "framer-motion";
import {
  Activity,
  ArrowRight,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Compass,
  RotateCcw,
  Search,
  Shield,
  SlidersHorizontal,
  Sparkles,
  X,
} from "lucide-react";
import {
  CANONICAL_TEAM_CODES,
  TEAM_REGISTRY,
  isTeamCode,
  useTeamTheme,
  type TeamCode,
} from "@/lib/team-context";
import { FRANCHISE_METADATA, getArticlesForFranchise, type EditorialArticle } from "@/data/editorial-magazine-data";
import { EDITORIAL_ASPECTS, type EditorialAspectId } from "@/data/editorial/schema";
import { STORY_TYPE_LABEL, getV2Index } from "@/lib/editorial-v2";
import { getArticleHeroImage } from "@/lib/editorial-images";
import { useFranchiseArticles, type FranchiseArticleItem } from "@/components/dugout/franchise-library";
import {
  ANGLE_TO_ASPECT,
  FRANCHISE_INTELLIGENCE,
  INTELLIGENCE_ANGLES,
  SEASONS,
  type FranchiseIntelligenceData,
} from "@/data/franchise-intelligence";
import { TeamLogo } from "@/components/team-logo";
import "./news.css";

const aspectName = (id: EditorialAspectId) => EDITORIAL_ASPECTS.find((a) => a.id === id)?.name ?? "";

function isLightHex(hex: string): boolean {
  const clean = (hex || "").replace("#", "");
  if (clean.length < 6) return false;
  const r = parseInt(clean.substring(0, 2), 16) || 0;
  const g = parseInt(clean.substring(2, 4), 16) || 0;
  const b = parseInt(clean.substring(4, 6), 16) || 0;
  return (r * 299 + g * 587 + b * 114) / 1000 >= 150;
}

const PAGE_SIZE = 9;

type MobileArticleItem = FranchiseArticleItem & { franchise?: TeamCode };

const ALL_IPL_CONFIG: FranchiseIntelligenceData = {
  code: "ALL",
  name: "All IPL Franchises",
  motto: "Complete League Hub",
  heroImage: "/hero-players.png",
  stadiumImage: "/ipl-2027-banner.jpg",
  featuredPlayer: "League Archive",
  accent: "#38BDF8",
  venue: "All IPL Venues",
  players: Array.from(
    new Set([
      "Virat Kohli",
      "Rohit Sharma",
      "MS Dhoni",
      "Jasprit Bumrah",
      "Pat Cummins",
      "Sunil Narine",
      "Yashasvi Jaiswal",
      "Rishabh Pant",
      "Shubman Gill",
      "Nicholas Pooran",
      ...Object.values(FRANCHISE_INTELLIGENCE).flatMap((f) => f.players),
    ]),
  ),
  popularTags: ["Powerplay", "Death Overs", "Spin", "Auction", "Wankhede", "Chinnaswamy", "Chepauk", "Eden Gardens"],
  trendingTopics: [
    { rank: 1, title: "SRH's 125-Run Powerplay Blueprint", cat: "Batting Intelligence", views: "14.2K" },
    { rank: 2, title: "Jasprit Bumrah's Phase-Wise Economy Suppression", cat: "Bowling & Fielding", views: "15.1K" },
    { rank: 3, title: "RCB's Middle-Order Evolution", cat: "Batting Intelligence", views: "12.4K" },
    { rank: 4, title: "The Chepauk Spin Choke: Mathematical Analysis", cat: "Bowling & Fielding", views: "13.6K" },
    { rank: 5, title: "Sunil Narine: The Opener Renaissance Model", cat: "Batting Intelligence", views: "13.9K" },
  ],
};

/** Crisp mobile story visual: uses licensed self-hosted photo if available, otherwise local franchise artwork. */
function MobileThumb({
  imageId,
  title,
  fallbackBanner,
}: {
  imageId?: string;
  title: string;
  fallbackBanner: string;
}) {
  const hero = imageId ? getArticleHeroImage(imageId) : undefined;
  const initialSrc = hero?.licensedImageUrl || fallbackBanner;
  const [src, setSrc] = useState(initialSrc);

  useEffect(() => {
    setSrc(initialSrc);
  }, [initialSrc]);

  return (
    <>
      <img
        src={src}
        alt={title}
        loading="lazy"
        decoding="async"
        onError={() => {
          if (src !== "/ipl-2027-banner.jpg") setSrc("/ipl-2027-banner.jpg");
        }}
        className="mn-thumb-img"
      />
      <div className="mn-thumb-tint" />
    </>
  );
}

/** Compact pagination window matching laptop pages without overflowing a phone row. */
function pageWindow(current: number, total: number): Array<number | "..."> {
  if (total <= 6) return Array.from({ length: total }, (_, i) => i + 1);
  const out: Array<number | "..."> = [1];
  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);
  if (start > 2) out.push("...");
  for (let i = start; i <= end; i++) out.push(i);
  if (end < total - 1) out.push("...");
  out.push(total);
  return out;
}

/**
 * Mobile News (/intelligence) screen:
 * Controlled by the global Navbar team dropdown ("ALL" by default, or selected franchise).
 * Same data, filters, counters, trending topics & tools as desktop IntelligencePage in a compact phone layout.
 */
export default function MobileNews() {
  const { selectedTeam } = useTeamTheme();
  const [searchParamStr, setSearchParamStr] = useState(() => (typeof window !== "undefined" ? window.location.search : ""));

  useEffect(() => {
    const onPop = () => setSearchParamStr(window.location.search);
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  const searchParams = useMemo(() => new URLSearchParams(searchParamStr), [searchParamStr]);

  // Global navbar team takes precedence unless an explicit ?franchise= query param is present; defaults cleanly to ALL (null).
  const activeFranchiseCode = useMemo<TeamCode | null>(() => {
    const raw = searchParams.get("franchise");
    if (raw && isTeamCode(raw.toUpperCase())) return raw.toUpperCase() as TeamCode;
    if (selectedTeam && isTeamCode(selectedTeam)) return selectedTeam;
    return null;
  }, [searchParams, selectedTeam]);

  const isAllMode = activeFranchiseCode === null;

  const franchiseConfig = useMemo(
    () => (activeFranchiseCode ? FRANCHISE_INTELLIGENCE[activeFranchiseCode] : ALL_IPL_CONFIG),
    [activeFranchiseCode],
  );
  const teamTheme = activeFranchiseCode ? TEAM_REGISTRY[activeFranchiseCode] : null;
  const franchiseMeta = useMemo(() => {
    if (!activeFranchiseCode) {
      return {
        name: ALL_IPL_CONFIG.name,
        identity: ALL_IPL_CONFIG.motto,
        accent: ALL_IPL_CONFIG.accent,
        venue: "All IPL Venues",
      };
    }
    return (
      FRANCHISE_METADATA[activeFranchiseCode] || {
        name: franchiseConfig.name,
        identity: franchiseConfig.motto,
        accent: franchiseConfig.accent,
        venue: franchiseConfig.venue,
      }
    );
  }, [activeFranchiseCode, franchiseConfig]);

  const accent = franchiseMeta.accent || teamTheme?.accent || "#38BDF8";
  const accentInk = isLightHex(accent) ? "#050816" : "#FFFFFF";
  const heroFallbackBanner = teamTheme?.bannerImg ?? "/ipl-2027-banner.jpg";

  const [selectedAngle, setSelectedAngle] = useState<string>(() => searchParams.get("angle") || "all");
  const [selectedTag, setSelectedTag] = useState<string>("All Tags");
  const [selectedSeason, setSelectedSeason] = useState<string>("All Seasons");
  const [selectedPlayer, setSelectedPlayer] = useState<string>("All Players");
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [openFilterMenu, setOpenFilterMenu] = useState<"angle" | "tag" | "season" | "player" | null>(null);
  const [playerSearchQuery, setPlayerSearchQuery] = useState("");
  const [angleScroll, setAngleScroll] = useState({ left: false, right: true });

  const articlesTopRef = useRef<HTMLDivElement | null>(null);
  const angleStripRef = useRef<HTMLDivElement | null>(null);

  const syncAngleScroll = () => {
    const el = angleStripRef.current;
    if (!el) return;
    setAngleScroll({
      left: el.scrollLeft > 8,
      right: el.scrollLeft + el.clientWidth < el.scrollWidth - 8,
    });
  };

  useEffect(() => {
    syncAngleScroll();
    window.addEventListener("resize", syncAngleScroll);
    return () => window.removeEventListener("resize", syncAngleScroll);
  }, []);

  useEffect(() => {
    setSelectedAngle(searchParams.get("angle") || "all");
    setSelectedTag("All Tags");
    setSelectedSeason("All Seasons");
    setSelectedPlayer("All Players");
    setSearchQuery("");
    setPlayerSearchQuery("");
    setCurrentPage(1);
    setOpenFilterMenu(null);
  }, [activeFranchiseCode, searchParams]);

  useEffect(() => {
    if (openFilterMenu !== "player") setPlayerSearchQuery("");
  }, [openFilterMenu]);

  useEffect(() => {
    if (!openFilterMenu) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpenFilterMenu(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [openFilterMenu]);

  // Single-franchise data when a team is selected in navbar
  const singleFranchiseData = useFranchiseArticles(activeFranchiseCode ?? "RCB");

  // All-franchises league data when navbar is set to ALL: recent + featured mixed round-robin across all 10 teams
  const allLeagueArticles = useMemo<MobileArticleItem[]>(() => {
    if (!isAllMode) return [];
    const v2Sorted = [...getV2Index()].sort(
      (a, b) =>
        Number(b.featured) - Number(a.featured) ||
        b.publishedDate.localeCompare(a.publishedDate),
    );
    const superseded = new Set(v2Sorted.map((e) => e.supersedes).filter(Boolean));

    const perTeam = new Map<TeamCode, MobileArticleItem[]>();
    for (const code of CANONICAL_TEAM_CODES) perTeam.set(code, []);

    for (const e of v2Sorted) {
      if (!isTeamCode(e.franchise)) continue;
      perTeam.get(e.franchise)!.push({
        key: e.id,
        title: e.title,
        dek: e.dek,
        aspect: e.aspect,
        kind: "live" as const,
        href: `/dugout/articles/${e.slug}`,
        imageId: e.id,
        storyType: e.storyType,
        franchise: e.franchise,
      });
    }

    for (const code of CANONICAL_TEAM_CODES) {
      for (const art of getArticlesForFranchise(code) as EditorialArticle[]) {
        if (superseded.has(art.slug)) continue;
        perTeam.get(code)!.push({
          key: art.id,
          title: art.title,
          dek: art.subtitle,
          aspect: "history",
          kind: "legacy",
          href: `/dugout/articles/${art.slug}`,
          imageId: art.id,
          storyType: "archive",
          franchise: code,
        });
      }
    }

    // Round-robin interleave so recent articles from every franchise appear mixed on page 1
    const mixed: MobileArticleItem[] = [];
    const queues = CANONICAL_TEAM_CODES.map((code) => perTeam.get(code) ?? []);
    const maxLen = Math.max(0, ...queues.map((q) => q.length));
    for (let i = 0; i < maxLen; i++) {
      for (const q of queues) {
        if (i < q.length) mixed.push(q[i]);
      }
    }
    return mixed;
  }, [isAllMode]);

  const franchiseArticles = useMemo<MobileArticleItem[]>(() => {
    if (isAllMode) return allLeagueArticles;
    return singleFranchiseData.items
      .filter((i) => i.kind !== "planned")
      .map((i) => ({ ...i, franchise: activeFranchiseCode ?? undefined }));
  }, [isAllMode, allLeagueArticles, singleFranchiseData.items, activeFranchiseCode]);

  const featuredArticle = useMemo<MobileArticleItem | undefined>(() => {
    if (isAllMode) return allLeagueArticles[0];
    return franchiseArticles.find((i) => i.key === singleFranchiseData.featured?.id) ?? franchiseArticles[0];
  }, [isAllMode, allLeagueArticles, franchiseArticles, singleFranchiseData.featured]);

  const angleCounts = useMemo(() => {
    const c: Record<string, number> = { all: franchiseArticles.length };
    for (const [angle, aspect] of Object.entries(ANGLE_TO_ASPECT)) {
      c[angle] = franchiseArticles.filter((i) => i.aspect === aspect).length;
    }
    return c;
  }, [franchiseArticles]);

  const filteredArticles = useMemo(() => {
    return franchiseArticles.filter((art) => {
      if (selectedAngle !== "all" && art.aspect !== ANGLE_TO_ASPECT[selectedAngle]) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesExact =
          art.title.toLowerCase().includes(q) ||
          art.dek.toLowerCase().includes(q) ||
          aspectName(art.aspect).toLowerCase().includes(q);
        const tokens = q.split(/\s+/).filter((t) => t.length > 2);
        const matchesTokens =
          tokens.length > 0 && tokens.every((t) => art.title.toLowerCase().includes(t) || art.dek.toLowerCase().includes(t));
        if (!matchesExact && !matchesTokens) return false;
      }

      if (selectedPlayer !== "All Players") {
        const q = selectedPlayer.toLowerCase();
        if (!art.title.toLowerCase().includes(q) && !art.dek.toLowerCase().includes(q)) return false;
      }

      if (selectedTag !== "All Tags") {
        const t = selectedTag.toLowerCase();
        const hit =
          art.title.toLowerCase().includes(t) ||
          art.dek.toLowerCase().includes(t) ||
          aspectName(art.aspect).toLowerCase().includes(t);
        if (!hit) return false;
      }

      return true;
    });
  }, [franchiseArticles, selectedAngle, searchQuery, selectedPlayer, selectedTag]);

  const totalPages = Math.max(1, Math.ceil(filteredArticles.length / PAGE_SIZE));
  const displayedArticles = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredArticles.slice(start, start + PAGE_SIZE);
  }, [filteredArticles, currentPage]);

  const hasActiveFilter =
    selectedAngle !== "all" ||
    selectedTag !== "All Tags" ||
    selectedSeason !== "All Seasons" ||
    selectedPlayer !== "All Players" ||
    Boolean(searchQuery.trim());

  const resetAllFilters = () => {
    setSelectedAngle("all");
    setSelectedTag("All Tags");
    setSelectedSeason("All Seasons");
    setSelectedPlayer("All Players");
    setSearchQuery("");
    setPlayerSearchQuery("");
    setCurrentPage(1);
    setOpenFilterMenu(null);
  };

  const filterMenus = useMemo(
    () => [
      {
        id: "angle" as const,
        label: "Angle",
        ariaLabel: "Filter by angle",
        value: selectedAngle,
        displayValue: INTELLIGENCE_ANGLES.find((a) => a.id === selectedAngle)?.label ?? "All Articles",
        active: selectedAngle !== "all",
        options: INTELLIGENCE_ANGLES.map((a) => ({ value: a.id, label: a.label })),
        onSelect: (val: string) => {
          setSelectedAngle(val);
          setCurrentPage(1);
        },
      },
      {
        id: "tag" as const,
        label: "Tag",
        ariaLabel: "Filter by tag",
        value: selectedTag,
        displayValue: selectedTag,
        active: selectedTag !== "All Tags",
        options: ["All Tags", ...franchiseConfig.popularTags].map((tag) => ({ value: tag, label: tag })),
        onSelect: (val: string) => {
          setSelectedTag(val);
          setCurrentPage(1);
        },
      },
      {
        id: "season" as const,
        label: "Season",
        ariaLabel: "Filter by season",
        value: selectedSeason,
        displayValue: selectedSeason === "All Seasons" ? "All Seasons" : `${selectedSeason} Season`,
        active: selectedSeason !== "All Seasons",
        options: [
          { value: "All Seasons", label: "All Seasons" },
          ...SEASONS.map((s) => ({ value: s, label: `${s} Season` })),
        ],
        onSelect: (val: string) => {
          setSelectedSeason(val);
          setCurrentPage(1);
        },
      },
      {
        id: "player" as const,
        label: "Player",
        ariaLabel: "Filter by player",
        value: selectedPlayer,
        displayValue: selectedPlayer,
        active: selectedPlayer !== "All Players",
        options: ["All Players", ...franchiseConfig.players].map((p) => ({ value: p, label: p })),
        onSelect: (val: string) => {
          setSelectedPlayer(val);
          setCurrentPage(1);
        },
      },
    ],
    [selectedAngle, selectedTag, selectedSeason, selectedPlayer, franchiseConfig],
  );

  const activeFilterMenu = filterMenus.find((m) => m.id === openFilterMenu) ?? null;

  const jumpToArticles = () => {
    articlesTopRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const dugoutHref = activeFranchiseCode ? `/dugout/${activeFranchiseCode.toLowerCase()}` : "/dugout";

  return (
    <MotionConfig reducedMotion="user">
      <div
        className="mn-page"
        style={
          {
            "--mn-accent": accent,
            "--mn-accent-glow": `${accent}2b`,
          } as CSSProperties
        }
      >
        {/* ── 1. FRANCHISE INTELLIGENCE HUB HERO (Team follows Main Navbar Dropdown) ── */}
        <motion.section
          className="mn-header"
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
        >
          <img src={heroFallbackBanner} alt="" className="mn-header-bg" />
          <div className="mn-header-scrim" />

          <div className="mn-head-row">
            <div className="mn-brand">
              {activeFranchiseCode ? (
                <TeamLogo team={activeFranchiseCode} size="w-9 h-9" />
              ) : (
                <div className="mn-all-shield" aria-hidden="true">
                  <Shield size={18} />
                </div>
              )}
              <div className="mn-team-info">
                <div className="mn-eyebrow">
                  <span className="mn-dot" />
                  <span>Hub · "{franchiseConfig.motto}"</span>
                </div>
                <h1 className="mn-title">{franchiseMeta.name}</h1>
              </div>
            </div>

            <motion.button
              type="button"
              whileTap={{ scale: 0.94 }}
              className="mn-filter-btn"
              aria-label="Search and filter articles"
              aria-expanded={filtersOpen}
              onClick={() => {
                setFiltersOpen((o) => {
                  if (o) setOpenFilterMenu(null);
                  return !o;
                });
              }}
            >
              {filtersOpen ? <X size={13} /> : <SlidersHorizontal size={13} />}
              <span>{filtersOpen ? "Done" : "Filter"}</span>
              {!filtersOpen && hasActiveFilter && <span className="mn-filter-dot" />}
            </motion.button>
          </div>

          {/* Expandable Styled Filter & Search Drawer */}
          <AnimatePresence initial={false}>
            {filtersOpen && (
              <motion.div
                className="mn-filter-drawer"
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
              >
                <div className="mn-drawer-inner">
                  <div className="mn-search-input-wrap">
                    <Search size={14} className="mn-search-icon" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => {
                        setSearchQuery(e.target.value);
                        setCurrentPage(1);
                      }}
                      placeholder="Search articles, topics..."
                      className="mn-search-input"
                    />
                    {searchQuery && (
                      <button
                        type="button"
                        aria-label="Clear search"
                        onClick={() => setSearchQuery("")}
                        className="mn-clear-btn"
                      >
                        <X size={14} />
                      </button>
                    )}
                  </div>

                  <div className="mn-select-grid">
                    {filterMenus.map((menu) => {
                      const isOpen = openFilterMenu === menu.id;
                      return (
                        <button
                          key={menu.id}
                          type="button"
                          aria-label={menu.ariaLabel}
                          aria-expanded={isOpen}
                          aria-haspopup="listbox"
                          data-active={menu.active}
                          data-open={isOpen}
                          onClick={() => setOpenFilterMenu((prev) => (prev === menu.id ? null : menu.id))}
                          className="mn-field"
                        >
                          <div className="mn-field-top">
                            <span className="mn-field-lbl">{menu.label}</span>
                            <ChevronDown size={13} className="mn-select-chev" />
                          </div>
                          <span className="mn-field-val">{menu.displayValue}</span>
                        </button>
                      );
                    })}
                  </div>

                  <AnimatePresence initial={false} mode="wait">
                    {activeFilterMenu && (
                      <motion.div
                        key={activeFilterMenu.id}
                        className="mn-dd-panel"
                        role="listbox"
                        aria-label={activeFilterMenu.ariaLabel}
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
                      >
                        <div className="mn-dd-inner">
                          <div className="mn-dd-head">
                            <span>Select {activeFilterMenu.label}</span>
                            <button
                              type="button"
                              aria-label={`Close ${activeFilterMenu.label.toLowerCase()} menu`}
                              onClick={() => setOpenFilterMenu(null)}
                              className="mn-dd-close"
                            >
                              <X size={12} />
                            </button>
                          </div>
                          {activeFilterMenu.id === "player" && (
                            <div className="mn-dd-search-wrap">
                              <Search size={13} className="mn-dd-search-icon" />
                              <input
                                type="text"
                                value={playerSearchQuery}
                                onChange={(e) => setPlayerSearchQuery(e.target.value)}
                                placeholder="Search player..."
                                aria-label="Search player"
                                className="mn-dd-search-input"
                              />
                              {playerSearchQuery && (
                                <button
                                  type="button"
                                  aria-label="Clear player search"
                                  onClick={() => setPlayerSearchQuery("")}
                                  className="mn-dd-search-clear"
                                >
                                  <X size={12} />
                                </button>
                              )}
                            </div>
                          )}
                          {(() => {
                            const q = playerSearchQuery.trim().toLowerCase();
                            const visibleOptions =
                              activeFilterMenu.id === "player" && q
                                ? activeFilterMenu.options.filter((opt) => opt.label.toLowerCase().includes(q))
                                : activeFilterMenu.options;
                            if (visibleOptions.length === 0) {
                              return <div className="mn-dd-empty">No matching players</div>;
                            }
                            return (
                              <div className="mn-dd-list">
                                {visibleOptions.map((opt) => {
                                  const isSelected = activeFilterMenu.value === opt.value;
                                  return (
                                    <button
                                      key={opt.value}
                                      type="button"
                                      role="option"
                                      aria-selected={isSelected}
                                      data-selected={isSelected}
                                      onClick={() => {
                                        activeFilterMenu.onSelect(opt.value);
                                        setOpenFilterMenu(null);
                                      }}
                                      className="mn-dd-opt"
                                    >
                                      <span className="mn-dd-opt-lbl">{opt.label}</span>
                                      {isSelected && <Check size={12} className="mn-dd-check" />}
                                    </button>
                                  );
                                })}
                              </div>
                            );
                          })()}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <div className="mn-drawer-foot">
                    <span>{filteredArticles.length} matching stories</span>
                    {hasActiveFilter && (
                      <button type="button" onClick={resetAllFilters} className="mn-reset-btn">
                        <RotateCcw size={11} />
                        <span>Reset</span>
                      </button>
                    )}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.section>

        {/* ── 2. EXPLORE BY INTELLIGENCE ANGLE (Sticky 11 Pillars Strip) ── */}
        <div className="mn-angle-sticky">
          {angleScroll.left && (
            <button
              type="button"
              aria-label="Scroll intelligence angles left"
              onClick={() => angleStripRef.current?.scrollBy({ left: -170, behavior: "smooth" })}
              className="mn-angle-arrow mn-angle-arrow-left"
            >
              <ChevronLeft size={13} />
            </button>
          )}
          <div
            ref={angleStripRef}
            onScroll={syncAngleScroll}
            className="mn-angle-strip"
            role="tablist"
            aria-label="Explore by intelligence angle"
          >
            {INTELLIGENCE_ANGLES.map((angle) => {
              const Icon = angle.icon;
              const isActive = selectedAngle === angle.id;
              return (
                <motion.button
                  key={angle.id}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => {
                    setSelectedAngle(angle.id);
                    setCurrentPage(1);
                  }}
                  className="mn-angle-tab"
                >
                  <Icon
                    size={13}
                    style={{ color: isActive ? "var(--mn-accent-ink)" : "var(--m-muted)" }}
                  />
                  <span>{angle.shortLabel}</span>
                  <span className="mn-angle-count">{angleCounts[angle.id] ?? 0}</span>
                  {isActive && (
                    <motion.span
                      layoutId="mn-angle-line"
                      className="mn-angle-line"
                      style={{
                        backgroundColor: accent,
                        boxShadow: `0 0 10px ${accent}`,
                      }}
                      transition={{ type: "spring", stiffness: 460, damping: 35 }}
                    />
                  )}
                </motion.button>
              );
            })}
          </div>
          {angleScroll.right && (
            <button
              type="button"
              aria-label="More intelligence angles"
              onClick={() => angleStripRef.current?.scrollBy({ left: 170, behavior: "smooth" })}
              className="mn-angle-arrow mn-angle-arrow-right"
            >
              <ChevronRight size={13} />
            </button>
          )}
        </div>

        {/* ── 3. ARTICLES LIBRARY (Featured + Filtered 9-per-Page List + Pagination) ── */}
        <AnimatePresence mode="wait">
          <motion.div
            key={`${activeFranchiseCode ?? "ALL"}-${selectedAngle}-${currentPage}`}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            style={{ display: "flex", flexDirection: "column", gap: "10px" }}
          >
            <div ref={articlesTopRef} className="mn-meta-row">
              <h2 className="mn-section-title">
                {activeFranchiseCode ? `All ${activeFranchiseCode} Editorial Articles` : "All IPL Editorial Articles"}
              </h2>
              <span className="mn-meta-count">
                {filteredArticles.length > 0 ? (currentPage - 1) * PAGE_SIZE + 1 : 0}–
                {Math.min(currentPage * PAGE_SIZE, filteredArticles.length)} of {filteredArticles.length}
              </span>
            </div>

            {featuredArticle && currentPage === 1 && !hasActiveFilter && (
              <motion.article className="mn-lead" whileTap={{ scale: 0.99 }}>
                <Link
                  href={featuredArticle.href ?? "#"}
                  onClick={() => window.scrollTo({ top: 0, behavior: "instant" })}
                  className="block"
                >
                  <div className="mn-lead-media">
                    <MobileThumb
                      imageId={featuredArticle.imageId}
                      title={featuredArticle.title}
                      fallbackBanner={
                        featuredArticle.franchise
                          ? TEAM_REGISTRY[featuredArticle.franchise]?.bannerImg ?? heroFallbackBanner
                          : heroFallbackBanner
                      }
                    />
                    <div className="mn-lead-scrim" />
                    <div className="mn-lead-badges">
                      <span className="mn-badge" style={{ backgroundColor: accent, color: accentInk }}>
                        <Sparkles size={11} /> Featured
                      </span>
                      <span
                        className="mn-badge"
                        style={{
                          backgroundColor: "rgba(5, 8, 22, 0.75)",
                          color: "#F8FAFC",
                          border: "1px solid rgba(255, 255, 255, 0.14)",
                        }}
                      >
                        <Compass size={11} /> {aspectName(featuredArticle.aspect)}
                      </span>
                    </div>
                  </div>
                </Link>
                <div className="mn-lead-body">
                  <Link
                    href={featuredArticle.href ?? "#"}
                    onClick={() => window.scrollTo({ top: 0, behavior: "instant" })}
                  >
                    <h3 className="mn-lead-title">{featuredArticle.title}</h3>
                    <p className="mn-lead-dek">{featuredArticle.dek}</p>
                  </Link>
                  <div className="mn-lead-actions">
                    <Link
                      href={featuredArticle.href ?? "#"}
                      onClick={() => window.scrollTo({ top: 0, behavior: "instant" })}
                      className="mn-cta-primary"
                      style={{
                        backgroundColor: accent,
                        color: accentInk,
                        boxShadow: `0 6px 18px -4px ${accent}66`,
                      }}
                    >
                      <span>Read Article</span>
                      <ArrowRight size={13} />
                    </Link>
                    <Link href={dugoutHref} className="mn-cta-secondary">
                      <Activity size={13} style={{ color: "#22d3ee" }} />
                      <span>Deep Dive Analysis</span>
                    </Link>
                  </div>
                </div>
              </motion.article>
            )}

            {displayedArticles.length === 0 ? (
              <div className="mn-empty">
                <p>No articles match your selected filter criteria.</p>
                <button
                  type="button"
                  className="cfm-btn"
                  onClick={resetAllFilters}
                >
                  Reset all filters
                </button>
              </div>
            ) : (
              <div className="mn-list">
                {displayedArticles.map((art, idx) => {
                  const thumbFallback =
                    art.franchise && TEAM_REGISTRY[art.franchise]
                      ? TEAM_REGISTRY[art.franchise].bannerImg
                      : heroFallbackBanner;
                  return (
                    <Link
                      key={art.key}
                      href={art.href ?? "#"}
                      onClick={() => window.scrollTo({ top: 0, behavior: "instant" })}
                    >
                      <motion.article
                        className="mn-card"
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{
                          duration: 0.22,
                          delay: Math.min(idx * 0.025, 0.18),
                          ease: [0.22, 1, 0.36, 1],
                        }}
                        whileTap={{ scale: 0.985 }}
                      >
                        <div className="mn-card-copy">
                          <div className="mn-card-top">
                            {isAllMode && art.franchise && (
                              <span
                                className="mn-card-team"
                                style={{
                                  borderColor: `${TEAM_REGISTRY[art.franchise]?.accent ?? accent}66`,
                                  backgroundColor: `${TEAM_REGISTRY[art.franchise]?.accent ?? accent}18`,
                                }}
                              >
                                {art.franchise}
                              </span>
                            )}
                            <span
                              className="mn-card-cat"
                              style={{
                                backgroundColor: `${accent}18`,
                                color: "var(--mn-accent-ink)",
                                border: `1px solid ${accent}38`,
                              }}
                            >
                              {aspectName(art.aspect)}
                            </span>
                            {art.number && <span className="mn-card-no">No. {art.number}</span>}
                          </div>
                          <h3 className="mn-card-title">{art.title}</h3>
                          {art.dek && <p className="mn-card-dek">{art.dek}</p>}
                          <div className="mn-card-foot">
                            <span>
                              {art.kind === "legacy"
                                ? "From the archive"
                                : (STORY_TYPE_LABEL[art.storyType ?? ""] ?? "New")}
                            </span>
                            <span style={{ color: "var(--mn-accent-ink)", display: "inline-flex", alignItems: "center", gap: 3 }}>
                              Read <ArrowRight size={11} />
                            </span>
                          </div>
                        </div>
                        <div className="mn-card-thumb">
                          <MobileThumb
                            imageId={art.imageId}
                            title={art.title}
                            fallbackBanner={thumbFallback}
                          />
                        </div>
                      </motion.article>
                    </Link>
                  );
                })}
              </div>
            )}

            {totalPages > 1 && (
              <div className="mn-pages" aria-label="Article pages">
                <button
                  type="button"
                  disabled={currentPage === 1}
                  aria-label="Previous page"
                  onClick={() => {
                    setCurrentPage((p) => Math.max(1, p - 1));
                    jumpToArticles();
                  }}
                  className="mn-page-btn"
                >
                  <ChevronLeft size={14} />
                </button>
                {pageWindow(currentPage, totalPages).map((item, idx) =>
                  item === "..." ? (
                    <span key={`ellipsis-${idx}`} className="mn-meta-count" style={{ padding: "0 4px" }}>
                      …
                    </span>
                  ) : (
                    <button
                      key={item}
                      type="button"
                      aria-current={currentPage === item ? "page" : undefined}
                      onClick={() => {
                        setCurrentPage(item);
                        jumpToArticles();
                      }}
                      className="mn-page-btn"
                      style={
                        currentPage === item
                          ? {
                              backgroundColor: accent,
                              color: accentInk,
                              borderColor: accent,
                              boxShadow: `0 4px 12px -2px ${accent}55`,
                            }
                          : undefined
                      }
                    >
                      {item}
                    </button>
                  ),
                )}
                <button
                  type="button"
                  disabled={currentPage === totalPages}
                  aria-label="Next page"
                  onClick={() => {
                    setCurrentPage((p) => Math.min(totalPages, p + 1));
                    jumpToArticles();
                  }}
                  className="mn-page-btn"
                >
                  <ChevronRight size={14} />
                </button>
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        {/* ── 4. CROSS-FRANCHISE DIRECTORY LINK ── */}
        <section className="mn-dir" aria-label="Franchise directory">
          <div className="mn-dir-head">
            <div>
              <div className="mn-eyebrow">
                <Compass size={11} />
                <span>Franchise Directory</span>
              </div>
              <h3 className="mn-section-title" style={{ marginTop: 3 }}>
                Explore Rival Dugouts &amp; League Intel
              </h3>
            </div>
            <Link href="/teams" className="cfm-more" style={{ color: "var(--mn-accent-ink)" }}>
              All Teams <ArrowRight size={12} style={{ display: "inline" }} />
            </Link>
          </div>
        </section>
      </div>
    </MotionConfig>
  );
}
