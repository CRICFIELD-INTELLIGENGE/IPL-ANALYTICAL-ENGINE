import { HomeLatestMedia } from "@/components/home-latest-media";
import { distinctStoryPhotos } from "@/lib/home-story-photos";
import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { Link } from "wouter";
import {
  ArrowRight,
  BarChart3,
  BookOpen,
  Bookmark,
  ChevronRight,
  Layers,
  Mail,
  Play,
  Sparkles,
  Star,
  TrendingUp,
  Trophy,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { AdVessel } from "@/components/ad-vessel";
import { EDITORIAL_ASPECTS, type IndexEntry } from "@/data/editorial/schema";
import { getV2Index } from "@/lib/editorial-v2";
import { getArticleHeroImage } from "@/lib/editorial-images";
import { useMatches, useTopBatters } from "@/lib/aggregates";
import { fetchFranchiseRecord } from "@/lib/dugout-api";
import { buildFranchiseMilestones } from "@/lib/franchise-milestones";
import { milestonePhotography } from "@/lib/milestone-photography";
import { HUB_EVENTS } from "@/lib/ipl-2027";
import { pulseMoney, usePulseAuction } from "@/lib/pulse-auction";
import foundation2026 from "@/data/auction-2026-foundation.json";
import {
  CANONICAL_TEAM_CODES,
  TEAM_CODE_TO_SLUG,
  TEAM_REGISTRY,
  useTeamTheme,
} from "@/lib/team-context";
import { WORKSPACE_TILES } from "../home-workspaces";
import "./home-reference.css";

const SAVED_STORIES_KEY = "cf:storylines-reading-list:v1";

function readSavedStories(): string[] {
  try {
    const raw = JSON.parse(localStorage.getItem(SAVED_STORIES_KEY) || "[]");
    return Array.isArray(raw) ? raw.filter((v): v is string => typeof v === "string") : [];
  } catch {
    return [];
  }
}

function aspectLabel(aspect: string): string {
  return EDITORIAL_ASPECTS.find((a) => a.id === aspect)?.name ?? aspect.toUpperCase();
}

function formatEditorialDate(iso: string): string {
  const ts = Date.parse(`${iso}T12:00:00`);
  if (!Number.isFinite(ts)) return iso;
  return new Date(ts).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

function formatBannerDate(iso: string): string {
  const ts = Date.parse(`${iso}T12:00:00Z`);
  if (!Number.isFinite(ts)) return iso;
  return new Date(ts)
    .toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
    .toUpperCase();
}

function entryImage(entry: IndexEntry): string {
  return (
    getArticleHeroImage(entry.id)?.licensedImageUrl ||
    TEAM_REGISTRY[entry.franchise]?.bannerImg ||
    "/ipl-2027-banner.jpg"
  );
}

function articlePhotoKey(entry: IndexEntry): string {
  const image = getArticleHeroImage(entry.id);
  return image?.assetId ? `asset:${image.assetId}`
    : image?.licensedImageUrl ? `url:${image.licensedImageUrl.split("?")[0]}`
    : `cover:${entry.id}`;
}

/** Pick diverse featured slides led by selected franchise when set. */
function pickFeaturedSlides(all: IndexEntry[], selectedTeam: string | null): IndexEntry[] {
  const featured = all.filter((e) => e.featured);
  const pool = featured.length ? featured : all;
  const sorted = [...pool].sort(
    (a, b) =>
      Number(Boolean(selectedTeam && b.franchise === selectedTeam)) -
        Number(Boolean(selectedTeam && a.franchise === selectedTeam)) ||
      b.publishedDate.localeCompare(a.publishedDate),
  );
  const out: IndexEntry[] = [];
  const seenFranchise = new Set<string>();
  for (const item of sorted) {
    if (out.length >= 4) break;
    if (selectedTeam && item.franchise === selectedTeam && out.length === 0) {
      out.push(item);
      seenFranchise.add(item.franchise);
      continue;
    }
    if (!seenFranchise.has(item.franchise)) {
      out.push(item);
      seenFranchise.add(item.franchise);
    }
  }
  for (const item of sorted) {
    if (out.length >= 4) break;
    if (!out.some((x) => x.id === item.id)) out.push(item);
  }
  return out;
}

export default function MobileHome() {
  const { theme, selectedTeam } = useTeamTheme();
  const [savedIds, setSavedIds] = useState<string[]>(readSavedStories);
  const [activeSlide, setActiveSlide] = useState(0);
  const [latestLimit, setLatestLimit] = useState(5);
  const railRef = useRef<HTMLDivElement | null>(null);

  const v2All = useMemo(
    () => [...getV2Index()].sort((a, b) => b.publishedDate.localeCompare(a.publishedDate)),
    [],
  );

  // Section 2: Featured Intelligence Carousel
  const featuredSlides = useMemo(
    () => pickFeaturedSlides(v2All, selectedTeam),
    [v2All, selectedTeam],
  );
  const currentHero = featuredSlides[activeSlide] ?? featuredSlides[0];

  useEffect(() => {
    setActiveSlide(0);
    railRef.current?.scrollTo({ left: 0, behavior: "auto" });
  }, [selectedTeam]);

  const toggleSaveStory = (id: string) => {
    setSavedIds((prev) => {
      const next = prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id];
      try {
        localStorage.setItem(SAVED_STORIES_KEY, JSON.stringify(next));
      } catch {
        /* localStorage unavailable */
      }
      return next;
    });
  };

  // Section 5: Top Stories (excludes current featured slide + diversifies across teams)
  const topStories = useMemo(() => {
    const activeHeroId = currentHero?.id;
    const pool = v2All.filter((e) => e.id !== activeHeroId);
    const ranked = [...pool].sort(
      (a, b) =>
        Number(Boolean(selectedTeam && b.franchise === selectedTeam)) -
          Number(Boolean(selectedTeam && a.franchise === selectedTeam)) ||
        Number(b.featured) - Number(a.featured) ||
        b.publishedDate.localeCompare(a.publishedDate),
    );
    const picked: IndexEntry[] = [];
    const seen = new Set<string>();
    for (const item of ranked) {
      if (picked.length >= 6) break;
      if (!seen.has(item.franchise)) {
        picked.push(item);
        seen.add(item.franchise);
      }
    }
    for (const item of ranked) {
      if (picked.length >= 6) break;
      if (!picked.some((p) => p.id === item.id)) picked.push(item);
    }
    return picked;
  }, [v2All, currentHero?.id, selectedTeam]);

  // Section 10: Latest from CricField (excludes active hero + visible Top Stories; round-robin diverse across franchises in ALL mode)
  const latestPool = useMemo(() => {
    const exclude = new Set<string>();
    if (currentHero) exclude.add(currentHero.id);
    for (const s of topStories) exclude.add(s.id);
    const nonDup = v2All.filter((e) => !exclude.has(e.id));
    const pool = nonDup.length >= 4 ? nonDup : v2All.filter((e) => e.id !== currentHero?.id);

    // Prioritize articles with distinct approved/licensed photos over repeated banners
    const rankScore = (e: IndexEntry) =>
      (getArticleHeroImage(e.id) ? 2 : 0) + (e.featured ? 1 : 0);

    const shownStories = [...(currentHero ? [currentHero] : []), ...topStories];
    if (selectedTeam) {
      const club = pool.filter((e) => e.franchise === selectedTeam).sort((a, b) => rankScore(b) - rankScore(a));
      const rest = pool.filter((e) => e.franchise !== selectedTeam).sort((a, b) => rankScore(b) - rankScore(a));
      return distinctStoryPhotos([...club, ...rest], articlePhotoKey, shownStories);
    }

    const queues = CANONICAL_TEAM_CODES.map((code) =>
      pool
        .filter((e) => e.franchise === code)
        .sort((a, b) => rankScore(b) - rankScore(a) || b.publishedDate.localeCompare(a.publishedDate)),
    );
    const diverse: IndexEntry[] = [];
    const maxLen = Math.max(0, ...queues.map((q) => q.length));
    for (let i = 0; i < maxLen; i++) {
      for (const q of queues) {
        if (i < q.length) diverse.push(q[i]);
      }
    }
    return distinctStoryPhotos(diverse, articlePhotoKey, shownStories);
  }, [v2All, currentHero, topStories, selectedTeam]);

  // Section 3: Verified IPL 2027 Auction Event & Live Pulse state
  const pulse2027 = usePulseAuction(2027);
  const pulse2026 = usePulseAuction(2026);
  const auctionEvent = HUB_EVENTS.find((e) => e.id === "auction");
  const auctionCountdown = useMemo(() => {
    if (!auctionEvent?.date) return { label: "Target Date Pending", daysLeft: null as number | null };
    const today = new Date().toLocaleDateString("en-CA");
    const daysLeft = Math.ceil((Date.parse(auctionEvent.date) - Date.parse(today)) / 86_400_000);
    return { label: formatBannerDate(auctionEvent.date), daysLeft };
  }, [auctionEvent?.date]);
  const auctionPastOrDone =
    (auctionCountdown.daysLeft != null && auctionCountdown.daysLeft < 0) ||
    pulse2027.model.sold > 0;

  // Section 7: Inside Your Dugout (reactive to global selectedTeam; defaults visually to CSK when ALL)
  const dugoutCode = selectedTeam ?? "CSK";
  const dugoutClub = TEAM_REGISTRY[dugoutCode];
  const dugoutSlug = TEAM_CODE_TO_SLUG[dugoutCode];
  const rivalClub = TEAM_REGISTRY[dugoutClub.archRival];
  const dugoutRecord = useQuery({
    queryKey: ["dugout-franchise", dugoutClub.name, rivalClub?.name ?? null],
    queryFn: () => fetchFranchiseRecord(dugoutClub.name, rivalClub?.name),
    staleTime: 10 * 60_000,
    retry: 1,
  });
  const matches = useMatches();
  const dugoutMoments = useMemo(
    () => buildFranchiseMilestones(dugoutCode, dugoutRecord.data, matches.data ?? []),
    [dugoutCode, dugoutRecord.data, matches.data],
  );
  const dugoutMoment = useMemo(
    () =>
      dugoutMoments.find((m) => m.kind === "champion") ??
      dugoutMoments.find((m) => m.kind === "record") ??
      dugoutMoments[0] ??
      null,
    [dugoutMoments],
  );
  const dugoutPhoto = useMemo(() => {
    if (!dugoutMoment) return dugoutClub.bannerImg;
    const frames = milestonePhotography(dugoutClub, dugoutMoments).get(dugoutMoment.id);
    return frames?.[0]?.eventPhoto?.src ?? dugoutClub.bannerImg;
  }, [dugoutClub, dugoutMoments, dugoutMoment]);

  // Section 8: The Numbers Say — strictly verified / calculated metrics
  const topBatters = useTopBatters();
  const numbersInsights = useMemo(() => {
    const model27 = pulse2027.model;
    const model26 = pulse2026.model;
    const clubFoundation = foundation2026.teams[dugoutCode];

    // Card 1: Auction Trends
    let auctionStat = "Loading…";
    let auctionNote = "Spends, roles & patterns";
    if (model27.sold > 0 && model27.spent != null) {
      auctionStat = `${model27.sold} sold · ${pulseMoney(model27.spent)}`;
      auctionNote = "Recorded 2027 auction activity";
    } else if (!pulse2026.loading && model26.sold > 0) {
      const clubBought = selectedTeam
        ? model26.teams.find((t) => t.code === selectedTeam)?.purchases.length ?? null
        : null;
      auctionStat = clubBought != null
        ? `${clubBought} ${selectedTeam} buys`
        : `${model26.sold} Sold`;
      auctionNote = "2026 auction baseline";
    } else if (!pulse2026.loading) {
      auctionStat = "Unavailable";
      auctionNote = "Market archive unavailable";
    }

    // Card 2: Squad Gaps
    const team27 = model27.teams.find((t) => t.code === dugoutCode);
    let gapsStat = "Loading…";
    let gapsNote = "Key areas to address";
    if (team27?.retained != null) {
      const openSlots = Math.max(0, foundation2026.maxSquad - (team27.squad ?? team27.retained));
      gapsStat = `${dugoutCode} · ${openSlots} slots`;
      gapsNote = `${team27.retained} retained for 2027 cycle`;
    } else if (clubFoundation) {
      const openSlots = Math.max(0, foundation2026.maxSquad - clubFoundation.retained);
      gapsStat = `${dugoutCode} ${clubFoundation.retained}/${foundation2026.maxSquad}`;
      gapsNote = `${openSlots} open squad slots`;
    }

    // Card 3: Player Value
    let playerStat = "Loading…";
    let playerNote = "Form, impact & fit";
    const rows = topBatters.data?.runs ?? [];
    if (rows.length > 0) {
      const clubRow = selectedTeam
        ? rows.find((r) => (r.team ?? "").toUpperCase() === selectedTeam || (r.teamName ?? "").toUpperCase() === dugoutClub.name.toUpperCase())
        : undefined;
      const top = clubRow ?? rows[0];
      playerStat = `${top.player.split(" ").slice(-1)[0]} · ${Number(top.runs).toLocaleString("en-IN")}`;
      playerNote = `Runs · SR ${Number(top.sr ?? 0).toFixed(1)}`;
    } else if (!topBatters.isLoading) {
      playerStat = "Unavailable";
      playerNote = "Player telemetry loading later";
    }

    return { auctionStat, auctionNote, gapsStat, gapsNote, playerStat, playerNote };
  }, [pulse2027.model, pulse2026.model, pulse2026.loading, dugoutCode, dugoutClub.name, selectedTeam, topBatters.data, topBatters.isLoading]);

  const homeStyle = {
    "--ref-accent": theme?.accent ?? "#ffda7c",
    "--ref-secondary": theme?.secondary ?? "#f4b547",
  } as CSSProperties;

  return (
    <div className="ref-home" style={homeStyle} data-testid="mobile-home-page">
      {/* SECTION 2 — FEATURED INTELLIGENCE CAROUSEL */}
      <section className="ref-section" aria-label="Featured Intelligence" data-home-section="featured">
        <div className="ref-featured-wrap">
          <div
            ref={railRef}
            className="ref-featured-rail"
            onScroll={(e) => {
              const el = e.currentTarget;
              const width = el.clientWidth;
              if (width > 0) {
                const idx = Math.round(el.scrollLeft / width);
                if (idx !== activeSlide && idx >= 0 && idx < featuredSlides.length) {
                  setActiveSlide(idx);
                }
              }
            }}
          >
            {featuredSlides.map((entry, idx) => {
              const isSaved = savedIds.includes(entry.id);
              const imgSrc = entryImage(entry);
              const TitleTag = idx === 0 ? "h1" : "h2";
              return (
                <article key={entry.id} className="ref-hero-slide">
                  <img
                    src={imgSrc}
                    alt={entry.title}
                    className="ref-hero-img"
                    loading="eager"
                    onError={(e) => {
                      if (e.currentTarget.src.indexOf("/ipl-2027-banner.jpg") === -1) {
                        e.currentTarget.src = "/ipl-2027-banner.jpg";
                      }
                    }}
                  />
                  <div className="ref-hero-scrim" />
                  <div className="ref-hero-copy">
                    <span className="ref-hero-kicker">Featured Intelligence · {entry.franchise}</span>
                    <TitleTag>{entry.title}</TitleTag>
                    <p>{entry.dek}</p>
                    <div className="ref-hero-actions">
                      <Link href={`/dugout/articles/${entry.slug}`} className="ref-cta-pill">
                        <Play size={12} fill="currentColor" aria-hidden="true" />
                        Explore Analysis
                      </Link>
                      <button
                        type="button"
                        className="ref-save-btn"
                        aria-label={isSaved ? `Remove ${entry.title} from reading list` : `Save ${entry.title}`}
                        aria-pressed={isSaved}
                        onClick={() => toggleSaveStory(entry.id)}
                      >
                        <Bookmark size={16} fill={isSaved ? "currentColor" : "none"} />
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
          {featuredSlides.length > 1 && (
            <div className="ref-dots" role="tablist" aria-label="Featured intelligence slides">
              {featuredSlides.map((slide, idx) => (
                <button
                  key={slide.id}
                  type="button"
                  role="tab"
                  aria-label={`Slide ${idx + 1}: ${slide.title}`}
                  aria-selected={activeSlide === idx}
                  onClick={() => {
                    setActiveSlide(idx);
                    railRef.current?.scrollTo({
                      left: idx * (railRef.current?.clientWidth ?? 0),
                      behavior: "smooth",
                    });
                  }}
                />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* SECTION 3 — IPL 2027 AUCTION DEADLINE BANNER */}
      <section className="ref-section" aria-label="IPL 2027 Auction" data-home-section="auction-banner">
        <div className="ref-auction-card">
          <img src="/auction-gavel.jpg" alt="" className="ref-auction-art" />
          <div className="ref-auction-copy">
            <span className="ref-auction-pill">
              IPL 2027 Auction · {auctionEvent?.status === "reported" ? "Reported" : "Desk"}
            </span>
            <div className="ref-auction-date">
              {auctionPastOrDone
                ? pulse2027.model.sold > 0
                  ? `${pulse2027.model.sold} Players Sold`
                  : "Auction Summary"
                : auctionCountdown.label}
            </div>
            <p className="ref-auction-sub">
              {auctionPastOrDone
                ? "Completed lots • Franchise spends • Squad balance"
                : auctionCountdown.daysLeft != null && auctionCountdown.daysLeft > 0
                  ? `${auctionCountdown.daysLeft}d away (reported target) • Player pool • Squad impact`
                  : "Auction day • Player pool • Squad impact"}
            </p>
          </div>
          <Link href="/auction" className="ref-auction-cta">
            {auctionPastOrDone ? "View Results" : "Explore Auction Room"}{" "}
            <ArrowRight size={12} aria-hidden="true" />
          </Link>
        </div>
      </section>

      {/* SECTION 4 — CRICFIELD WORKSPACES */}
      <section className="ref-section" aria-labelledby="home-workspaces-h" data-home-section="workspaces">
        <div className="ref-section-head">
          <h2 id="home-workspaces-h" className="ref-section-title">
            <span className="ref-accent-bar" aria-hidden="true" />
            <span>CricField Workspaces</span>
          </h2>
        </div>
        <div className="ref-workspaces-grid">
          {WORKSPACE_TILES.map((ws) => {
            const Icon = ws.icon;
            return (
              <Link
                key={ws.id}
                href={ws.href}
                className="ref-ws-tile"
                data-tone={ws.tone}
                data-testid={`home-workspace-${ws.id}`}
              >
                <img src={ws.img} alt="" className="ref-ws-bg" />
                <div className="ref-ws-icon" aria-hidden="true">
                  <Icon size={17} />
                </div>
                <div className="ref-ws-text">
                  <strong>{ws.title}</strong>
                  <small>{ws.homeSub}</small>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* SECTION 5 — TOP STORIES (2-UP HORIZONTAL SNAP CAROUSEL) */}
      <section className="ref-section" aria-labelledby="home-top-stories-h" data-home-section="top-stories">
        <div className="ref-section-head">
          <h2 id="home-top-stories-h" className="ref-section-title">
            <span className="ref-accent-bar" aria-hidden="true" />
            <span>Top Stories</span>
          </h2>
          <Link href="/editorials" className="ref-head-link">
            See All <ArrowRight size={13} aria-hidden="true" />
          </Link>
        </div>
        <div className="ref-stories-rail">
          {topStories.map((story) => (
            <Link key={story.id} href={`/dugout/articles/${story.slug}`} className="ref-story-card">
              <div className="ref-story-media">
                <img
                  src={entryImage(story)}
                  alt={story.title}
                  onError={(e) => {
                    if (e.currentTarget.src.indexOf("/ipl-2027-banner.jpg") === -1) {
                      e.currentTarget.src = "/ipl-2027-banner.jpg";
                    }
                  }}
                />
              </div>
              <div className="ref-story-copy">
                <span className="ref-story-meta">
                  {story.franchise} · {aspectLabel(story.aspect)}
                </span>
                <h3>{story.title}</h3>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* SECTION 6 — ADVERTISEMENT PLACEMENT (Renders via commercial zone only when active) */}
      <section className="ref-ad-zone" aria-label="Sponsored placement" data-home-section="advertisement">
        <AdVessel slot="mobile_home_mid" format="compact" minHeight={90} />
      </section>

      {/* SECTION 7 — INSIDE YOUR DUGOUT */}
      <section className="ref-section" aria-labelledby="home-dugout-h" data-home-section="dugout">
        <div className="ref-section-head">
          <h2 id="home-dugout-h" className="ref-section-title">
            <span className="ref-accent-bar" aria-hidden="true" />
            <span>Inside Your Dugout</span>
          </h2>
          <Link href={`/dugout/${dugoutSlug}`} className="ref-head-link">
            Explore Dugout <ArrowRight size={13} aria-hidden="true" />
          </Link>
        </div>
        <div
          className="ref-dugout-card"
          style={{ "--dugout-accent": dugoutClub.accent } as CSSProperties}
        >
          <div className="ref-dugout-hero">
            <div className="ref-dugout-copy">
              <span className="ref-dugout-badge">
                {selectedTeam ? "Franchise Milestone" : `${dugoutCode} Showcase`}
              </span>
              <h3>
                {dugoutMoment
                  ? `${dugoutCode}: ${dugoutMoment.title}`
                  : `${dugoutCode}: A Legacy of Impact`}
              </h3>
              <p>
                {dugoutMoment?.description ??
                  `Iconic moments, title runs and the memories that built ${dugoutClub.name}.`}
              </p>
            </div>
            <Link href={`/dugout/${dugoutSlug}`} className="ref-dugout-photo" aria-label={`Open ${dugoutClub.name} Dugout`}>
              <img
                src={dugoutPhoto}
                alt={dugoutClub.name}
                onError={(e) => {
                  if (e.currentTarget.src.indexOf(dugoutClub.bannerImg) === -1) {
                    e.currentTarget.src = dugoutClub.bannerImg;
                  }
                }}
              />
            </Link>
          </div>
          <div className="ref-dugout-shortcuts">
            <Link href={`/dugout/${dugoutSlug}?tab=Squad`} className="ref-dugout-pill">
              <BookOpen size={13} aria-hidden="true" />
              <span>Squad Notebook</span>
            </Link>
            <Link href={`/dugout/${dugoutSlug}?tab=History`} className="ref-dugout-pill">
              <Trophy size={13} aria-hidden="true" />
              <span>Season History</span>
            </Link>
            <Link href={`/dugout/${dugoutSlug}?tab=Memories`} className="ref-dugout-pill">
              <Sparkles size={13} aria-hidden="true" />
              <span>Milestones</span>
            </Link>
            <Link href={`/dugout/${dugoutSlug}?tab=Analysis`} className="ref-dugout-pill">
              <Star size={13} aria-hidden="true" />
              <span>Rivalries</span>
            </Link>
          </div>
        </div>
      </section>

      {/* SECTION 8 — THE NUMBERS SAY */}
      <section className="ref-section" aria-labelledby="home-numbers-h" data-home-section="numbers">
        <div className="ref-section-head">
          <h2 id="home-numbers-h" className="ref-section-title">
            <span className="ref-accent-bar" aria-hidden="true" />
            <span>The Numbers Say</span>
          </h2>
        </div>
        <div className="ref-numbers-grid">
          <Link href="/auction" className="ref-num-card">
            <div className="ref-num-head">
              <BarChart3 size={14} aria-hidden="true" />
              <span>Auction Trends</span>
            </div>
            <strong className="ref-num-metric">{numbersInsights.auctionStat}</strong>
            <small>{numbersInsights.auctionNote}</small>
          </Link>
          <Link href="/retention-room" className="ref-num-card">
            <div className="ref-num-head">
              <TrendingUp size={14} aria-hidden="true" />
              <span>Squad Gaps</span>
            </div>
            <strong className="ref-num-metric">{numbersInsights.gapsStat}</strong>
            <small>{numbersInsights.gapsNote}</small>
          </Link>
          <Link href="/stats" className="ref-num-card">
            <div className="ref-num-head">
              <Layers size={14} aria-hidden="true" />
              <span>Player Value</span>
            </div>
            <strong className="ref-num-metric">{numbersInsights.playerStat}</strong>
            <small>{numbersInsights.playerNote}</small>
          </Link>
        </div>
      </section>

      {/* SECTION 9 — EXPLORE BY FRANCHISE */}
      <section className="ref-section" aria-labelledby="home-franchises-h" data-home-section="franchises">
        <div className="ref-section-head">
          <h2 id="home-franchises-h" className="ref-section-title">
            <span className="ref-accent-bar" aria-hidden="true" />
            <span>Explore by Franchise</span>
          </h2>
          <Link href="/teams" className="ref-head-link">
            All Teams <ArrowRight size={13} aria-hidden="true" />
          </Link>
        </div>
        <div className="ref-franchise-rail">
          {CANONICAL_TEAM_CODES.map((code) => {
            const club = TEAM_REGISTRY[code];
            return (
              <Link
                key={code}
                href={`/dugout/${TEAM_CODE_TO_SLUG[code]}`}
                className="ref-team-tile"
                aria-label={`Open ${club.name} Dugout`}
              >
                <span className="ref-team-crest">
                  <img src={club.logoImg} alt={`${club.shortName} crest`} />
                </span>
                <span>{club.shortName}</span>
              </Link>
            );
          })}
        </div>
      </section>

      {/* SECTION 10 — LATEST FROM CRICFIELD */}
      <section className="ref-section" aria-labelledby="home-latest-h" data-home-section="latest">
        <div className="ref-section-head">
          <h2 id="home-latest-h" className="ref-section-title">
            <span className="ref-accent-bar" aria-hidden="true" />
            <span>Latest from CricField</span>
          </h2>
          <Link href="/editorials" className="ref-head-link">
            More Articles <ArrowRight size={13} aria-hidden="true" />
          </Link>
        </div>
        <div className="ref-latest-list">
          {latestPool.slice(0, latestLimit).map((item) => (
            <article key={item.id} className="ref-latest-row">
              <HomeLatestMedia entry={item} />
              <Link href={`/dugout/articles/${item.slug}`} className="ref-latest-copy">
                <span className="ref-latest-tag">{item.franchise} · {aspectLabel(item.aspect)}</span>
                <h3>{item.title}</h3>
                <span className="ref-latest-meta">{formatEditorialDate(item.publishedDate)} · {item.readMinutes} min read</span>
              </Link>
              <Link href={`/dugout/articles/${item.slug}`} aria-label={`Read ${item.title}`} className="ref-latest-read">
                <ChevronRight size={16} aria-hidden="true" />
              </Link>
            </article>
          ))}
        </div>
        {latestLimit < latestPool.length && (
          <button
            type="button"
            className="ref-load-more"
            onClick={() => setLatestLimit((n) => n + 5)}
          >
            Load More Stories <ArrowRight size={13} aria-hidden="true" />
          </button>
        )}
      </section>

      {/* SECTION 11 — STAY AHEAD WITH CRICFIELD */}
      <section className="ref-section" aria-label="CricField account alerts" data-home-section="promo">
        <div className="ref-promo-card">
          <div className="ref-promo-left">
            <span className="ref-promo-ico" aria-hidden="true">
              <Mail size={17} />
            </span>
            <div>
              <strong>Stay Ahead with CricField</strong>
              <small>Match alerts, auction moves &amp; weekly insights via your account.</small>
            </div>
          </div>
          <Link href="/account?tab=notifications" className="ref-promo-cta">
            Manage Alerts <ArrowRight size={12} aria-hidden="true" />
          </Link>
        </div>
      </section>
    </div>
  );
}
