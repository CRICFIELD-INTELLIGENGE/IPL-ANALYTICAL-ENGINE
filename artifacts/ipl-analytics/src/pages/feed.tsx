import { useEffect, useMemo, useState, useRef, type ReactNode } from "react";
import { Link } from "wouter";
import {
  ArrowRight, CalendarDays, Users, Gavel, Shield, Star, MapPin, Flame, ShieldCheck,
  Search, Shirt, Wallet, Sparkles, Activity, Trophy, ExternalLink, ChevronLeft, ChevronRight,
  ChevronUp, ChevronDown,
} from "lucide-react";
import { Layout } from "@/components/layout";
import { AdVessel } from "@/components/ad-vessel";
import { EditorialCardMedia } from "@/components/dugout/editorial-image-figure";
import { getLocalEmbedImages, getPublishedArticleImages, PUBLIC_MANIFEST, isPublishable, isLocalPreviewable, getArticleHeroImage } from "@/lib/editorial-images";
import { EDITORIAL_ARTICLES } from "@/data/editorial-magazine-data";
import { useEmbedConsent } from "@/lib/embed-consent";
import { TeamLogo } from "@/components/team-logo";
import { NewsCard, newsroomOrder } from "@/components/feed-newsroom";
import { getV2Index, STORY_TYPE_LABEL } from "@/lib/editorial-v2";
import { HUB_EVENTS, HUB_TEAMS } from "@/lib/ipl-2027";
import { TEAM_REGISTRY, useTeamTheme, type TeamCode } from "@/lib/team-context";
import { useIpl2027Desk, stamp } from "@/lib/ipl-2027-desk";
import { EDITORIAL_AUTHOR, EDITORIAL_ASPECTS, type IndexEntry } from "@/data/editorial/schema";
import { cn } from "@/lib/utils";
import { EditorialCoverCanvas } from "@/components/dugout/editorial-cover-canvas";

export type CardId = "squad" | "auction" | "tactics" | "stars" | "venues" | "storylines";

interface CardDef {
  id: CardId;
  title: string;
  subtitle: string;
  img: string;
  color: string;
  icon: typeof Users;
}

export const CARDS: CardDef[] = [
  { id: "squad", title: "SQUAD BUILDING", subtitle: "Retentions, releases, core and gaps", img: "/milestone-photos/final-2024-kkr.jpg", color: "text-amber-500 dark:text-[var(--team-accent)]", icon: Users },
  { id: "auction", title: "AUCTION", subtitle: "Purse, market and strategy", img: "/auction-art.jpg", color: "text-amber-500 dark:text-[var(--team-accent)]", icon: Gavel },
  { id: "tactics", title: "TACTICS", subtitle: "Evolving game styles", img: "/assets/tactical-board-hero.png", color: "text-emerald-500 dark:text-emerald-400", icon: Shield },
  { id: "stars", title: "STAR WATCH", subtitle: "Rising names to watch", img: "/milestone-photos/highest-total-2024-srh.jpg", color: "text-rose-500 dark:text-rose-400", icon: Star },
  { id: "venues", title: "VENUES", subtitle: "Conditions and trends", img: "/branding/auth/stadium-sunset-v1.png", color: "text-sky-500 dark:text-sky-400", icon: MapPin },
  { id: "storylines", title: "STORYLINES", subtitle: "Rivalries, narratives and more", img: "/milestone-photos/final-2023-csk.jpg", color: "text-orange-500 dark:text-orange-400", icon: Flame },
];

const TOOLS = [
  { label: "Retention Lab", desc: "Model retain/release calls against each squad", href: "/feed/ipl-2027?module=retention", icon: ShieldCheck, tint: "bg-violet-600" },
  { label: "Auction War Room", desc: "Purse, needs and targets by franchise", href: "/ai-analyst/auction-war-room", icon: Wallet, tint: "bg-lime-500" },
  { label: "Playing XI Builder", desc: "Create balanced combinations", href: "/ai-analyst/playing-xi", icon: Shirt, tint: "bg-sky-500" },
  { label: "Scout Engine", desc: "Find players by role, league and metrics", href: "/scout", icon: Search, tint: "bg-fuchsia-600" },
];

const legacyEntries: IndexEntry[] = EDITORIAL_ARTICLES.map((art) => ({
  id: art.id,
  title: art.title,
  dek: art.subtitle,
  slug: art.slug,
  franchise: art.teamCode as TeamCode,
  aspect: (art.parameter ? art.parameter.toLowerCase().replace(/\s+/g, "-") : "history") as any,
  storyType: art.isCoverStory ? "investigation" : "explainer",
  publishedDate: art.publishedDate || "2024-10-16",
  readMinutes: parseInt(art.readTime, 10) || 5,
  featured: Boolean(art.isCoverStory || art.featured),
  status: "published",
  players: [],
  seasons: [],
}));

// Story types that exist in the article schema; no "news"/"opinion" tab until such content exists.
export const STORY_TABS = [
  { id: "featured", label: "Featured" },
  { id: "investigation", label: "Analysis" },
  { id: "explainer", label: "Explainers" },
  { id: "player-story", label: "Player stories" },
] as const;

const dateLabel = (d: string) => new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
const kicker = (e: IndexEntry) => (STORY_TYPE_LABEL[e.storyType] ?? e.storyType).toUpperCase();

/** Use exactly the hero selected by the article page, including local Getty previews. */
function articleHeaderImage(articleId: string) {
  return getPublishedArticleImages(articleId).hero
    ?? (import.meta.env.DEV ? getLocalEmbedImages(articleId).hero : undefined);
}

/** Prefer a mix of subjects and franchises, then fill from the remaining stories. */
function getDiverseByTeam(entries: IndexEntry[], count: number): IndexEntry[] {
  const result: IndexEntry[] = [];
  const seenTeams = new Set<string>();
  const seenImages = new Set<string>();
  const seenAspects = new Set<string>();

  for (const entry of entries) {
    const image = articleHeaderImage(entry.id)?.assetId ?? entry.id;
    if (seenTeams.has(entry.franchise) || seenImages.has(image) || seenAspects.has(entry.aspect)) continue;
    seenTeams.add(entry.franchise);
    seenImages.add(image);
    seenAspects.add(entry.aspect);
    result.push(entry);
    if (result.length >= count) return result;
  }
  for (const entry of entries) {
    if (!seenTeams.has(entry.franchise)) {
      seenTeams.add(entry.franchise);
      result.push(entry);
      if (result.length >= count) return result;
    }
  }

  if (result.length < count) {
    for (const entry of entries) {
      if (!result.includes(entry)) {
        result.push(entry);
        if (result.length >= count) break;
      }
    }
  }

  return result;
}

export function selectFeedRetentionPhoto(selectedTeam: TeamCode | null, used: ReadonlySet<string | undefined> = new Set<string>()) {
    const teamName = selectedTeam ? TEAM_REGISTRY[selectedTeam].name : null;
    const candidates = PUBLIC_MANIFEST.images.filter(image => image.source === "getty"
      && (isPublishable(image) || isLocalPreviewable(image))
      && (!teamName || image.depicts?.includes(teamName))
      && !used.has(image.assetId));
    // For RR, prioritize Yashasvi Jaiswal (Priority Retain cornerstone) over Sanju Samson
    if (selectedTeam === "RR") {
      const jaiswalHero = candidates.find(image => (image.caption?.includes("Jaiswal") || image.altText?.includes("Jaiswal")) && image.sectionId === "hero")
        ?? candidates.find(image => image.caption?.includes("Jaiswal") || image.altText?.includes("Jaiswal"));
      if (jaiswalHero) return jaiswalHero;
    }
    return candidates.find(image => image.sectionId === "hero") ?? candidates[0];
}

function RetentionHeroVisual({ team }: { team: TeamCode | null }) {
  const teamArtwork: Partial<Record<TeamCode, { src: string; alt: string; name: string }>> = {
    RCB: { src: "/rcb-winner-2026.jpg", alt: "RCB IPL 2026 Champions", name: "Royal Challengers Bengaluru" },
    CSK: { src: "/msd.jpg", alt: "MS Dhoni CSK", name: "Chennai Super Kings" },
    MI: { src: "/rohit sharma.jpg", alt: "Rohit Sharma MI", name: "Mumbai Indians" },
    RR: { src: "/sanju samson.jpg", alt: "Sanju Samson RR", name: "Rajasthan Royals" },
    SRH: { src: "/bhuvaneswar kumar.jpg", alt: "Sunrisers Hyderabad", name: "Sunrisers Hyderabad" },
    KKR: { src: "/s narine.jpg", alt: "Sunil Narine KKR", name: "Kolkata Knight Riders" },
    DC: { src: "/hero-players.png", alt: "Delhi Capitals", name: "Delhi Capitals" },
    GT: { src: "/rashid khan.jpg", alt: "Rashid Khan GT", name: "Gujarat Titans" },
    LSG: { src: "/kl rahul.jpg", alt: "Lucknow Super Giants", name: "Lucknow Super Giants" },
    PBKS: { src: "/hero-players.png", alt: "Punjab Kings", name: "Punjab Kings" },
  };

  const selected = team && teamArtwork[team] ? teamArtwork[team] : null;
  const imgSrc = selected?.src ?? "/hero-players.png";
  const imgAlt = selected?.alt ?? "IPL Retention Stars & Captains";
  const label = selected?.name ?? "IPL 2027 Franchise Roster Hub";

  return (
    <div className="relative w-full h-full min-h-[220px] sm:min-h-[340px] overflow-hidden flex items-center justify-center bg-[#070C16] group">
      <img
        src={imgSrc}
        alt={imgAlt}
        className="absolute inset-0 w-full h-full object-cover object-top opacity-85 group-hover:scale-105 transition-transform duration-700 pointer-events-none"
      />
      {/* Precision gradient scrims matching card background */}
      <div className="absolute inset-0 bg-gradient-to-r from-[#0B1020] via-black/40 to-transparent pointer-events-none" />
      <div className="absolute inset-0 bg-gradient-to-t from-[#0B1020] via-transparent to-transparent pointer-events-none" />
      <div className="absolute bottom-3 right-3 text-[10px] font-mono font-bold uppercase tracking-wider text-white/70 bg-black/60 backdrop-blur-xs px-2.5 py-1 rounded-lg border border-white/10 pointer-events-none shadow-sm">
        {label}
      </div>
    </div>
  );
}

export default function FeedPage() {
  const { selectedTeam } = useTeamTheme();
  const [team, setTeam] = useState<TeamCode | null>(selectedTeam);
  const [tab, setTab] = useState<(typeof STORY_TABS)[number]["id"]>("featured");
  const { data: desk } = useIpl2027Desk();
  useEffect(() => { setTeam(selectedTeam); }, [selectedTeam]);

  const all = useMemo(() => {
    const v2 = getV2Index();
    const existingSlugs = new Set(v2.map((e) => e.slug));
    const legacy = legacyEntries.filter((e) => !existingSlugs.has(e.slug));
    return [...v2, ...legacy];
  }, []);

  // Top stories: 1 lead card + 4 sidebar cards. When a franchise is selected, show only that franchise's stories. Only when ALL is selected do stories mix across franchises.
  const top = useMemo(() => {
    const tabFiltered = tab === "featured" ? all : all.filter((e) => e.storyType === tab);
    const pool = tabFiltered.length ? tabFiltered : all;
    if (team) {
      const teamStories = newsroomOrder(pool.filter((e) => e.franchise === team));
      return teamStories.slice(0, 5);
    }
    return getDiverseByTeam(newsroomOrder(pool), 5);
  }, [all, tab, team]);

  // Diverse featured stories across the league for the scrolling editorial rail
  const picks = useMemo(() => {
    const featured = all.filter((e) => e.featured);
    return getDiverseByTeam(newsroomOrder(featured), 8);
  }, [all]);

  // Latest stories: filtered by active franchise, or diverse league-wide stories when ALL
  const latest = useMemo(() => {
    // Getty's signed viewer cannot mount twice with the same widget ID.
    const topIds = new Set(top.map((e) => e.id));
    const remaining = all.filter((e) => !topIds.has(e.id));
    if (team) {
      return [...remaining]
        .filter((e) => e.franchise === team)
        .sort((a, b) => b.publishedDate.localeCompare(a.publishedDate))
        .slice(0, 8);
    }
    const sorted = [...remaining].sort((a, b) => b.publishedDate.localeCompare(a.publishedDate));
    return getDiverseByTeam(sorted, 8);
  }, [all, team, top]);

  const announcements = desk?.announcements.slice(0, 3) ?? [];
  const retentionPhoto = useMemo(() => {
    const used = new Set([...top, ...picks, ...latest].map(entry => articleHeaderImage(entry.id)?.assetId).filter(Boolean));
    return selectFeedRetentionPhoto(selectedTeam, used);
  }, [selectedTeam, top, picks, latest]);

  return (
    <Layout>
      <div data-feed-part="page" className="space-y-6 p-4 bg-[#050816] min-h-screen">
        {/* ROW 1: LEAD + RETENTION COUNTDOWN */}
        <div data-feed-part="opening" className="grid gap-4 xl:grid-cols-[1fr_260px]">
          <section data-feed-part="retention-hero" className="relative overflow-hidden rounded-[24px] border border-white/10 bg-[#0B1020] min-h-[340px] grid sm:grid-cols-2">
            <div className="relative min-h-[220px] sm:min-h-[340px] flex items-center bg-[#0B1020] order-last">
              {retentionPhoto ? (
                <EditorialCardMedia
                  key={`${selectedTeam ?? "all"}-${retentionPhoto.assetId}`}
                  image={retentionPhoto}
                  allowUnpublished={import.meta.env.DEV}
                  preserveAspectRatio
                  fallback={<RetentionHeroVisual team={selectedTeam} />}
                />
              ) : (
                <RetentionHeroVisual team={selectedTeam} />
              )}
            </div>
            <div className="relative z-10 flex h-full flex-col justify-center p-6 sm:p-8 max-w-xl order-first">
              <div className="franchise-eyebrow text-[11px] font-black uppercase tracking-[0.25em]">IPL 2027 / Squad Building</div>
              <h1 className="mt-2 font-black uppercase leading-[0.9] tracking-tight text-white text-[28px] sm:text-5xl lg:text-6xl">
                The <br />Retention <br /><span className="text-[var(--team-accent)]">Room</span>
              </h1>
              <p className="mt-3 max-w-sm text-sm text-white/70">Who stays, who leaves, and what's missing for the 2027 title race?</p>
              <Link href="/feed/squad" className="franchise-action mt-4 inline-flex w-fit items-center gap-2 rounded-xl bg-[var(--team-accent)] px-4 py-2 text-xs font-black text-black hover:brightness-110">
                Read the full analysis <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </section>

          <div data-feed-part="deadline" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
            <RetentionCountdown />
            <div className="relative overflow-hidden rounded-[20px] border border-white/10 min-h-[150px]">
              <img src="/rcb-winner-2026.jpg" alt="RCB, IPL 2026 champions" className="absolute inset-0 h-full w-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
              <div className="absolute bottom-3 left-3 flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-[var(--team-accent)]">
                <Trophy className="w-3.5 h-3.5" /> RCB enter 2027 as champions
              </div>
            </div>

          </div>
        </div>

        {/* OFFICIAL UPDATES (only once something official exists) */}
        {announcements.length > 0 && (
          <section className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-2">
            {announcements.map((a) => (
              <div key={a.id} className="flex flex-wrap items-baseline gap-x-3 py-1.5 text-xs">
                <span className="text-[9px] font-black uppercase tracking-widest text-pink-400">Official</span>
                <span className="font-mono text-white/40">{stamp(a.firstRecordedAt)}</span>
                {a.team && <span className="font-black text-white/70">{a.team}</span>}
                <Link href="/pulse#auction" className="flex-1 min-w-[12rem] font-bold text-white hover:underline">{a.headline}</Link>
                <span className={`text-[9px] font-black uppercase ${a.verification === "confirmed" ? "text-emerald-400" : "text-[var(--team-accent)]"}`}>{a.verification}</span>
                <a href={a.sourceUrl} target="_blank" rel="noreferrer" className="text-primary inline-flex items-center gap-0.5">source <ExternalLink className="w-3 h-3" /></a>
              </div>
            ))}
          </section>
        )}

        {/* EXPLORE COVERAGE */}
        <section>
          <SectionHead title="Explore IPL 2027 coverage" sub="Analyses, stories and tools to help you make sense of the road to the auction." />
          <div data-feed-part="coverage" className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3">
            {CARDS.map((c) => (
              <Link
                key={c.id}
                href={`/feed/${c.id}`}
                className="group overflow-hidden rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0B1020] hover:border-slate-300 dark:hover:border-white/30 shadow-xs hover:shadow-md transition-all flex flex-col"
              >
                <div className="h-28 overflow-hidden relative bg-slate-900 shrink-0">
                  <img
                    src={c.img}
                    alt={c.title}
                    className="h-full w-full object-cover object-center group-hover:scale-105 transition-transform duration-500"
                  />
                </div>
                <div className="p-3 flex-1 flex flex-col justify-between bg-white dark:bg-[#0B1020]">
                  <div className="flex items-center gap-2">
                    <c.icon className={`hidden sm:block w-4 h-4 shrink-0 ${c.color}`} />
                    <span className="text-[12px] font-black text-slate-900 dark:text-white leading-tight">{c.title}</span>
                  </div>
                  <div className="mt-1 flex items-end justify-between gap-2">
                    <span className="text-[11px] text-slate-500 dark:text-white/60 line-clamp-1">{c.subtitle}</span>
                    <ArrowRight className={`w-3.5 h-3.5 shrink-0 ${c.color} transition-transform group-hover:translate-x-0.5`} />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* MAIN COLUMN + EDITORIAL RAIL */}
        <div data-feed-part="newsroom" className="grid gap-6 xl:grid-cols-[1fr_270px]">
          <div className="@container min-w-0 space-y-6">
            <section>
              <SectionHead title="Franchise coverage" sub="Pick a team to see its stories." />
              <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Filter stories by franchise">
                <TeamChip active={!team} onClick={() => setTeam(null)} teamCode="ALL" />
                {HUB_TEAMS.map((t) => (
                  <TeamChip
                    key={t}
                    teamCode={t}
                    accent={TEAM_REGISTRY[t].accent}
                    active={team === t}
                    onClick={() => setTeam(t)}
                  />
                ))}
                {team && (
                  <Link
                    href={`/dugout/${team.toLowerCase()}`}
                    className="inline-flex items-center gap-1.5 h-9 px-3 rounded-xl text-xs font-bold transition-all ml-1 border shadow-xs hover:brightness-110 active:scale-95"
                    style={{
                      backgroundColor: `${TEAM_REGISTRY[team].accent}18`,
                      borderColor: `${TEAM_REGISTRY[team].accent}40`,
                      color: TEAM_REGISTRY[team].accent,
                    }}
                  >
                    <div className="w-4 h-4 rounded-full bg-white p-0.5 flex items-center justify-center overflow-hidden shrink-0">
                      <img src={TEAM_REGISTRY[team].logoImg} alt="" className="w-full h-full object-contain" />
                    </div>
                    <span>{TEAM_REGISTRY[team].name} Dugout</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                )}
              </div>
            </section>

            <section>
              <div className="mb-3 flex flex-wrap items-center gap-3">
                <h2 className="text-[13px] font-black uppercase tracking-[0.2em] text-slate-900 dark:text-white">Top stories</h2>
                <div className="flex flex-wrap gap-1 sm:ml-auto" role="tablist">
                  {STORY_TABS.map((t) => (
                    <button
                      key={t.id}
                      role="tab"
                      aria-selected={tab === t.id}
                      onClick={() => setTab(t.id)}
                      className={`rounded-xl px-3 py-1 text-xs font-semibold transition-all ${
                        tab === t.id
                          ? "bg-primary text-white shadow-xs font-bold"
                          : "text-slate-600 dark:text-white/60 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5 border border-transparent"
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>
              {top.length === 0 ? (
                <p className="text-sm text-slate-500 dark:text-white/50">No published stories here{team ? ` for ${team}` : ""} yet.</p>
              ) : (
                <div data-feed-part="top-stories" className="grid gap-4 grid-cols-1 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] items-stretch">
                  <div className="flex w-full min-w-0">
                    <NewsCard
                      entry={top[0]}
                      lead
                      media={<div className="shrink-0"><EntryMedia entry={top[0]} preserveAspectRatio /></div>}
                    />
                  </div>
                  <div className="flex flex-col min-w-0 divide-y divide-slate-200 dark:divide-white/5 rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/[0.03] shadow-xs overflow-hidden justify-between">
                    {top.slice(1).map((e) => <CompactStory key={e.id} entry={e} />)}
                  </div>
                </div>
              )}
            </section>

            {latest.length > 0 && (
              <section>
                <div className="mb-3 flex items-center justify-between gap-3 flex-wrap">
                  <div className="flex items-center gap-2.5">
                    <h2 className="text-[13px] font-black uppercase tracking-[0.2em] text-slate-900 dark:text-white">Latest Stories</h2>
                    {team ? (
                      <div
                        className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold border"
                        style={{
                          backgroundColor: `${TEAM_REGISTRY[team].accent}18`,
                          borderColor: `${TEAM_REGISTRY[team].accent}40`,
                          color: TEAM_REGISTRY[team].accent,
                        }}
                      >
                        <div className="w-3.5 h-3.5 rounded-full bg-white p-0.5 flex items-center justify-center overflow-hidden shrink-0">
                          <img src={TEAM_REGISTRY[team].logoImg} alt="" className="w-full h-full object-contain" />
                        </div>
                        <span>{TEAM_REGISTRY[team].name}</span>
                      </div>
                    ) : (
                      <span className="text-[11px] font-semibold text-slate-500 dark:text-white/40">League-wide updates</span>
                    )}
                  </div>
                  {team && (
                    <button
                      type="button"
                      onClick={() => setTeam(null)}
                      className="text-[11px] font-bold text-slate-500 hover:text-slate-900 dark:text-white/50 dark:hover:text-white transition-colors cursor-pointer"
                    >
                      Show all teams
                    </button>
                  )}
                </div>
                <ul className="divide-y divide-slate-200 dark:divide-white/5">
                  {latest.map((e) => {
                    const t = TEAM_REGISTRY[e.franchise as TeamCode];
                    return (
                      <li key={e.id}>
                        <Link href={`/dugout/articles/${e.slug}`} className="flex items-center gap-3.5 py-3 px-2 rounded-xl group hover:bg-slate-100/60 dark:hover:bg-white/[0.03] transition-colors">
                          <div className="relative aspect-video w-28 sm:w-32 shrink-0 overflow-hidden rounded-xl bg-slate-100 dark:bg-black/50 ring-1 ring-slate-200 dark:ring-white/10 shadow-sm flex items-center justify-center">
                            <EntryMedia entry={e} compact />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest">
                              <span className="text-primary font-bold">{kicker(e)}</span>
                              <span className="text-slate-300 dark:text-white/20">•</span>
                              <span style={{ color: t?.accent ?? "var(--team-accent)" }}>{e.franchise}</span>
                            </div>
                            <div className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-white group-hover:underline line-clamp-2 mt-0.5">{e.title}</div>
                            <div className="mt-1 text-[10px] text-slate-500 dark:text-white/40">{EDITORIAL_AUTHOR} · {dateLabel(e.publishedDate)} · {e.readMinutes} min read</div>
                          </div>
                          <span className="hidden sm:block shrink-0 text-[11px] text-slate-500 dark:text-white/40">{dateLabel(e.publishedDate)}</span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </section>
            )}
          </div>

          <aside data-feed-part="editorial-rail" className="space-y-4">
            <ScrollingEditorialPicks picks={picks} />

            <RailCard title="CricField tools">
              <ul className="space-y-2.5">
                {TOOLS.map((t) => (
                  <li key={t.href}>
                    <Link href={t.href} className="flex items-center gap-3 group">
                      <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${t.tint}`}>
                        <t.icon className="w-4 h-4 text-white" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-xs font-bold text-white">{t.label}</span>
                        <span className="block text-[11px] text-white/50 leading-snug">{t.desc}</span>
                      </span>
                      <ArrowRight className="w-3.5 h-3.5 text-white/40 group-hover:text-white" />
                    </Link>
                  </li>
                ))}
              </ul>
            </RailCard>

            <RailCard title="Ask the AI Analyst">
              <div className="rounded-xl border border-violet-400/30 bg-violet-600/10 p-3">
                <Sparkles className="w-4 h-4 text-[var(--team-accent)]" />
                <p className="mt-1.5 text-xs text-white/85">Which teams most need an Indian death bowler going into the auction?</p>
                <Link
                  href={`/ai-analyst/ask?q=${encodeURIComponent("Which teams most need an Indian death bowler going into the auction?")}`}
                  className="mt-2.5 inline-flex items-center gap-1.5 rounded-lg border border-violet-400/40 px-3 py-1.5 text-xs font-bold text-white hover:bg-violet-600/30"
                >
                  Ask AI Analyst <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
            </RailCard>

            {/* MEGA AUCTION BRIEFING */}
            <RailCard title="Mega Auction Briefing">
              <div className="space-y-2.5 text-xs">
                <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                  <div className="flex items-center justify-between text-white/90">
                    <span className="font-bold flex items-center gap-1.5">
                      <Wallet className="w-3.5 h-3.5 text-[var(--team-accent)]" /> Purse Cap
                    </span>
                    <span className="font-mono font-black text-[var(--team-accent)]">₹120 Cr</span>
                  </div>
                  <div className="mt-1.5 text-[11px] text-white/50 leading-relaxed">
                    Total budget ceiling allocated per franchise for the 2027 cycle.
                  </div>
                </div>

                <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                  <div className="flex items-center justify-between text-white/90">
                    <span className="font-bold flex items-center gap-1.5">
                      <ShieldCheck className="w-3.5 h-3.5 text-sky-400" /> Max Retentions
                    </span>
                    <span className="font-mono font-black text-sky-400">6 Slots</span>
                  </div>
                  <div className="mt-1.5 text-[11px] text-white/50 leading-relaxed">
                    Up to 5 capped + uncapped combos, with RTM cards deployed in room.
                  </div>
                </div>

                <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                  <div className="flex items-center justify-between text-white/90">
                    <span className="font-bold flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-amber-400" /> Uncapped Fee
                    </span>
                    <span className="font-mono font-black text-amber-400">₹4 Cr</span>
                  </div>
                  <div className="mt-1.5 text-[11px] text-white/50 leading-relaxed">
                    Applies to un-capped domestic talent and 5+ yr retired internationals.
                  </div>
                </div>

                <Link
                  href="/feed/ipl-2027?module=retention"
                  className="flex items-center justify-between rounded-xl bg-violet-600/20 border border-violet-500/40 p-2.5 text-xs font-bold text-white hover:bg-violet-600/30 transition-colors"
                >
                  <span>Simulate in Retention Lab</span>
                  <ArrowRight className="w-3.5 h-3.5 text-[var(--team-accent)]" />
                </Link>
              </div>
            </RailCard>

            {/* FAN PULSE POLL */}
            <FanPulsePoll />
          </aside>
        </div>

        {/* PULSE + PREDICT */}
        <div className="grid gap-4 md:grid-cols-2">
          <CtaBand icon={Activity} kicker="Connected to Pulse" text="Follow official updates, retention announcements and auction developments." href="/pulse#auction" cta="Go to Pulse" />
          <CtaBand icon={Trophy} kicker="Make your call" text="Model your own retain-or-release calls for every franchise in the Retention Lab." href="/feed/ipl-2027?module=retention" cta="Make your picks" />
        </div>

        <AdVessel slot="1029384759" format="horizontal" label="2027 Intelligence Partner · Mega Auction Briefing" minHeight={84} />
      </div>
    </Layout>
  );
}

/** Live countdown to the retention deadline from the verified event timeline; shows its verification status. */
function RetentionCountdown() {
  const event = HUB_EVENTS.find((e) => e.id === "retention");
  // shortcut: no official time of day is published, so this counts to the start of the day in IST.
  const target = event?.date ? Date.parse(`${event.date}T00:00:00+05:30`) : null;
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  const left = target ? Math.max(0, target - now) : 0;
  const parts = [
    [Math.floor(left / 86_400_000), "Days"],
    [Math.floor(left / 3_600_000) % 24, "Hrs"],
    [Math.floor(left / 60_000) % 60, "Mins"],
    [Math.floor(left / 1000) % 60, "Secs"],
  ] as const;

  return (
    <section className="rounded-[20px] border border-slate-200/80 dark:border-white/10 bg-white dark:bg-[#0B1020] p-4 shadow-xs" aria-label="Retention deadline countdown">
      <div className="flex items-start justify-between">
        <div>
          <div className="text-[10px] font-black uppercase tracking-widest text-indigo-600 dark:text-[var(--team-accent)]">IPL 2027</div>
          <div className="text-sm font-black uppercase text-slate-900 dark:text-white">Retention deadline</div>
        </div>
        <CalendarDays className="w-5 h-5 text-indigo-600 dark:text-[var(--team-accent)]" />
      </div>
      {target ? (
        <>
          <div className="mt-3.5 grid grid-cols-4 gap-2 text-center" aria-live="off">
            {parts.map(([v, l]) => (
              <div key={l} className="py-2 px-1 rounded-xl bg-slate-50 dark:bg-white/[0.04] border border-slate-100 dark:border-white/[0.06] shadow-2xs">
                <div className="text-2xl font-black tabular-nums text-slate-900 dark:text-white leading-none">{String(v).padStart(2, "0")}</div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-white/60 mt-1">{l}</div>
              </div>
            ))}
          </div>
          <p className="mt-2.5 text-[11px] font-medium text-slate-500 dark:text-white/60">
            {dateLabel(event!.date!)}{event!.status === "confirmed" ? "" : " · reported date, not yet officially confirmed"}
          </p>
        </>
      ) : (
        <p className="mt-3 text-sm text-slate-600 dark:text-white/60">Date to be announced.</p>
      )}
      <Link href="/pulse#auction" className="mt-3 flex items-center justify-center gap-2 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-violet-700 dark:hover:bg-violet-600 py-2.5 text-xs font-bold text-white shadow-xs transition-colors">
        View key dates <ArrowRight className="w-3.5 h-3.5" />
      </Link>
    </section>
  );
}

export function getArticleVisualUrl(entry: IndexEntry): string {
  // If article has a valid direct local licensed image, prefer it
  const directImage = articleHeaderImage(entry.id);
  if (directImage?.licensedImageUrl && !directImage.licensedImageUrl.startsWith("http")) {
    return directImage.licensedImageUrl;
  }

  const text = `${entry.title} ${entry.slug} ${entry.aspect} ${entry.dek}`.toLowerCase();
  
  // 1. Star Players mentioned in title/slug/dek
  if (text.includes("kohli")) return "/virat-kohli.png";
  if (text.includes("dhoni") || text.includes("msd")) return "/msd.jpg";
  if (text.includes("rohit") || (text.includes("sharma") && entry.franchise === "MI")) return "/rohit sharma.jpg";
  if (text.includes("bumrah")) return "/bumrah.jpg";
  if (text.includes("narine") || text.includes("rinku")) return "/s narine.jpg";
  if (text.includes("samson") || text.includes("jaiswal")) return "/sanju samson.jpg";
  if (text.includes("rashid") || text.includes("gill")) return "/rashid khan.jpg";
  if (text.includes("mayank") || text.includes("yadav")) return "/mayank yadav.jpg";
  if (text.includes("rahul")) return "/kl rahul.jpg";
  if (text.includes("bhuvneshwar") || text.includes("bhuvi")) return "/bhuvaneswar kumar.jpg";
  if (text.includes("abhishek") || (text.includes("sharma") && entry.franchise === "SRH")) return "/abhisek sharma.jpg";
  if (text.includes("dhawan") || text.includes("arshdeep")) return "/shikhar dhawan.jpg";
  if (text.includes("devilliers") || text.includes("de villiers")) return "/ab devillers.jpg";
  if (text.includes("gayle")) return "/c gayle.jpg";
  if (text.includes("warner")) return "/d warner.jpg";
  if (text.includes("jadeja")) return "/r jadeja.jpg";
  if (text.includes("ashwin")) return "/r ashwin.jpg";
  if (text.includes("chahal")) return "/y chahal.jpg";
  if (text.includes("raina")) return "/suresh raina.jpg";

  // 2. Specific Franchise Venues / Stadiums
  if (text.includes("chinnaswamy")) return "/rcb-winner-2026.jpg";
  if (text.includes("chepauk")) return "/csk insight.jpg";
  if (text.includes("wankhede")) return "/rohit sharma.jpg";
  if (text.includes("eden")) return "/s narine.jpg";
  if (text.includes("ahmedabad") || text.includes("narendra modi")) return "/rashid khan.jpg";
  if (text.includes("kotla") || text.includes("arun jaitley")) return "/hero-players.png";
  if (text.includes("mohali") || text.includes("mullanpur")) return "/shikhar dhawan.jpg";
  if (text.includes("ekana")) return "/kl rahul.jpg";
  if (text.includes("uppal")) return "/bhuvaneswar kumar.jpg";
  if (text.includes("sawai mansingh")) return "/sanju samson.jpg";

  // 3. Thematic topics
  if (entry.aspect === "auction-economics" || entry.title.toLowerCase().includes("auction") || entry.slug.includes("auction") || entry.title.toLowerCase().includes("purse")) {
    return "/auction-art.jpg";
  }
  if (entry.aspect === "bowling-fielding" || text.includes("yorker") || text.includes("bowling") || text.includes("wicket") || text.includes("death over") || text.includes("slower ball")) {
    if (text.includes("bumrah")) return "/bumrah.jpg";
    if (text.includes("bhuvi") || text.includes("bhuvneshwar")) return "/bhuvaneswar kumar.jpg";
    if (text.includes("rashid")) return "/rashid khan.jpg";
    return "/tactical-yorker.jpg";
  }
  if (text.includes("tactical") || text.includes("powerplay") || text.includes("equation") || text.includes("blueprint") || text.includes("anchor") || entry.aspect === "tactical") {
    return "/tactics-board.jpg";
  }
  if (text.includes("venue") || text.includes("pitch") || text.includes("surface") || text.includes("ground") || text.includes("stadium") || entry.aspect === "venues") {
    return "/venues-stadium.jpg";
  }
  if (text.includes("squad") || text.includes("retention") || text.includes("rebuild") || text.includes("season") || entry.aspect === "history") {
    if (entry.franchise === "RCB") return "/rcb-winner-2026.jpg";
    if (entry.franchise === "CSK") return "/csk insight.jpg";
    return "/squad-building.jpg";
  }
  if (text.includes("boundary") || text.includes("scoring") || text.includes("velocity") || entry.aspect === "batting") {
    return "/milestone-photos/highest-total-2024-srh.jpg";
  }

  // 4. Franchise Marquee Photography Default
  const franchiseMarquee: Record<string, string> = {
    RCB: "/rcb-winner-2026.jpg",
    CSK: "/csk insight.jpg",
    MI: "/rohit sharma.jpg",
    KKR: "/s narine.jpg",
    RR: "/sanju samson.jpg",
    SRH: "/bhuvaneswar kumar.jpg",
    GT: "/rashid khan.jpg",
    LSG: "/kl rahul.jpg",
    DC: "/hero-players.png",
    PBKS: "/shikhar dhawan.jpg",
  };

  return franchiseMarquee[entry.franchise] ?? "/hero-players.png";
}

export function EntryMedia({
  entry,
  aspect = "video",
  compact = false,
}: {
  entry: IndexEntry;
  aspect?: "video" | "wide";
  compact?: boolean;
}) {
  const t = TEAM_REGISTRY[entry.franchise as TeamCode];
  const accent = t?.accent ?? "#FF6B00";
  const imageSrc = getArticleVisualUrl(entry);
  const kickerLabel = kicker(entry);

  return (
    <div
      className={`relative w-full h-full overflow-hidden bg-slate-900 group ${
        aspect === "video" ? "aspect-video" : "aspect-[16/9]"
      }`}
    >
      <img
        src={imageSrc}
        alt={entry.title}
        loading="lazy"
        className="absolute inset-0 w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500 pointer-events-none"
      />
      {/* High contrast gradient scrims */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-black/10 pointer-events-none" />
      <div className="absolute inset-0 bg-gradient-to-r from-black/40 via-transparent to-transparent pointer-events-none" />

      {/* Franchise Crest & Badge */}
      <div className="absolute top-2.5 left-2.5 z-10 flex items-center gap-1.5 pointer-events-none">
        <div className="w-6 h-6 rounded-full bg-white dark:bg-slate-900 p-0.5 shadow-md flex items-center justify-center shrink-0 border border-black/10 dark:border-white/20">
          <img
            src={t?.logoImg ?? "/favicon.svg"}
            alt={entry.franchise}
            className="w-full h-full object-contain"
          />
        </div>
        {!compact && (
          <span
            className="text-[9px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded shadow-sm backdrop-blur-md border"
            style={{
              backgroundColor: `${accent}25`,
              color: accent,
              borderColor: `${accent}50`,
            }}
          >
            {entry.franchise}
          </span>
        )}
      </div>

      {/* Story Type Tag in Top-Right */}
      {!compact && (
        <div className="absolute top-2.5 right-2.5 z-10 pointer-events-none">
          <span className="text-[9px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-black/60 text-white/90 border border-white/15 backdrop-blur-md shadow-sm">
            {kickerLabel}
          </span>
        </div>
      )}

      {/* Subtle Team Accent Bottom Edge Indicator */}
      <div
        className="absolute bottom-0 inset-x-0 h-1 z-10 opacity-80 group-hover:opacity-100 transition-opacity"
        style={{ backgroundColor: accent }}
      />
    </div>
  );
}


function CompactStory({ entry }: { entry: IndexEntry }) {
  const t = TEAM_REGISTRY[entry.franchise as TeamCode];
  return (
    <Link href={`/dugout/articles/${entry.slug}`} className="flex items-center gap-3 p-3 group hover:bg-slate-100/60 dark:hover:bg-white/[0.04] transition-colors">
      <div className="relative aspect-video w-28 sm:w-32 shrink-0 overflow-hidden rounded-xl bg-slate-100 dark:bg-black/50 ring-1 ring-slate-200 dark:ring-white/10 shadow-sm flex items-center justify-center">
        <EntryMedia entry={entry} compact />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest">
          <span className="text-primary font-bold">{kicker(entry)}</span>
          <span className="text-slate-300 dark:text-white/20">•</span>
          <span style={{ color: t?.accent ?? "var(--team-accent)" }}>{entry.franchise}</span>
        </div>
        <div className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white leading-snug group-hover:underline line-clamp-2 mt-0.5">{entry.title}</div>
        <div className="mt-1 text-[10px] text-slate-500 dark:text-white/40">{EDITORIAL_AUTHOR} · {entry.readMinutes} min read</div>
      </div>
    </Link>
  );
}

function isLightHex(hex: string): boolean {
  const clean = (hex || "").replace("#", "");
  if (clean.length < 6) return false;
  const r = parseInt(clean.substring(0, 2), 16) || 0;
  const g = parseInt(clean.substring(2, 4), 16) || 0;
  const b = parseInt(clean.substring(4, 6), 16) || 0;
  const yiq = (r * 299 + g * 587 + b * 114) / 1000;
  return yiq >= 150;
}

function ScrollingEditorialPicks({ picks }: { picks: IndexEntry[] }) {
  if (picks.length === 0) return null;

  const containerRef = useRef<HTMLDivElement>(null);
  const scrollPosRef = useRef<number>(0);
  const [isHovered, setIsHovered] = useState(false);
  const isHoveredRef = useRef(false);
  const resumeTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Triple items for seamless infinite looping in both directions
  const displayItems = useMemo(() => [...picks, ...picks, ...picks], [picks]);

  // Keep ref synchronized with state for requestAnimationFrame
  isHoveredRef.current = isHovered;

  useEffect(() => {
    const container = containerRef.current;
    if (!container || picks.length === 0) return;

    // Set initial scroll position to start of middle set (Set 2)
    const singleHeight = container.scrollHeight / 3;
    if (container.scrollTop < 10 && singleHeight > 0) {
      container.scrollTop = singleHeight;
    }
    scrollPosRef.current = container.scrollTop;

    let lastTime = performance.now();
    let animationId: number;
    const scrollSpeed = 24; // smooth 24 pixels per second

    const animate = (currentTime: number) => {
      const deltaTime = Math.min((currentTime - lastTime) / 1000, 0.1);
      lastTime = currentTime;

      if (!isHoveredRef.current && container) {
        const singleH = container.scrollHeight / 3;
        if (singleH > 0) {
          scrollPosRef.current += scrollSpeed * deltaTime;

          // Seamless wrap-around
          if (scrollPosRef.current >= singleH * 2) {
            scrollPosRef.current -= singleH;
          } else if (scrollPosRef.current <= 10) {
            scrollPosRef.current += singleH;
          }

          container.scrollTop = Math.round(scrollPosRef.current);
        }
      } else if (container) {
        // While paused or hovered, keep the accumulator aligned with manual scroll
        scrollPosRef.current = container.scrollTop;
      }

      animationId = requestAnimationFrame(animate);
    };

    animationId = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animationId);
      if (resumeTimeoutRef.current) {
        clearTimeout(resumeTimeoutRef.current);
      }
    };
  }, [picks]);

  const handleScroll = () => {
    const container = containerRef.current;
    if (!container) return;

    // When the user manually wheels or drags, update the position accumulator
    if (isHoveredRef.current) {
      scrollPosRef.current = container.scrollTop;
    }

    const singleH = container.scrollHeight / 3;
    if (singleH > 0) {
      if (container.scrollTop >= singleH * 2.1) {
        container.scrollTop -= singleH;
        scrollPosRef.current = container.scrollTop;
      } else if (container.scrollTop <= 10) {
        container.scrollTop += singleH;
        scrollPosRef.current = container.scrollTop;
      }
    }
  };

  const handleMouseEnter = () => {
    if (resumeTimeoutRef.current) clearTimeout(resumeTimeoutRef.current);
    setIsHovered(true);
    isHoveredRef.current = true;
    if (containerRef.current) {
      scrollPosRef.current = containerRef.current.scrollTop;
    }
  };

  const handleMouseLeave = () => {
    if (resumeTimeoutRef.current) clearTimeout(resumeTimeoutRef.current);
    resumeTimeoutRef.current = setTimeout(() => {
      setIsHovered(false);
      isHoveredRef.current = false;
      if (containerRef.current) {
        scrollPosRef.current = containerRef.current.scrollTop;
      }
    }, 750);
  };

  const scrollByDirection = (direction: "up" | "down") => {
    const container = containerRef.current;
    if (!container) return;
    const delta = direction === "up" ? -130 : 130;
    container.scrollBy({ top: delta, behavior: "smooth" });
    setTimeout(() => {
      if (containerRef.current) {
        scrollPosRef.current = containerRef.current.scrollTop;
      }
    }, 350);
  };

  return (
    <RailCard
      title="Editor's picks"
      action={
        <div className="flex items-center gap-1.5">
          <span
            className={cn(
              "text-[9px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded-md transition-colors flex items-center gap-1.5",
              isHovered
                ? "bg-orange-500/15 text-orange-600 dark:text-orange-400 border border-orange-500/30"
                : "bg-slate-200/60 dark:bg-white/5 text-slate-500 dark:text-white/40 border border-transparent"
            )}
            title={isHovered ? "Scroll with mouse wheel, trackpad or arrows" : "Auto-scrolling. Hover to pause and scroll up/down."}
          >
            <span
              className={cn(
                "w-1.5 h-1.5 rounded-full shrink-0",
                isHovered ? "bg-orange-500 dark:bg-orange-400" : "bg-emerald-500 dark:bg-emerald-400 animate-pulse"
              )}
            />
            {isHovered ? "Scrollable" : "Auto"}
          </span>
          <div className="flex items-center gap-0.5">
            <button
              type="button"
              onClick={() => scrollByDirection("up")}
              aria-label="Scroll up"
              title="Scroll up"
              className="w-5 h-5 rounded flex items-center justify-center text-slate-500 dark:text-white/50 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-white/10 transition-colors cursor-pointer"
            >
              <ChevronUp className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => scrollByDirection("down")}
              aria-label="Scroll down"
              title="Scroll down"
              className="w-5 h-5 rounded flex items-center justify-center text-slate-500 dark:text-white/50 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-white/10 transition-colors cursor-pointer"
            >
              <ChevronDown className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      }
    >
      <div
        className="relative group"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onTouchStart={handleMouseEnter}
        onTouchEnd={handleMouseLeave}
      >
        <div
          ref={containerRef}
          onScroll={handleScroll}
          className="editorial-picks-scroll relative h-[340px] overflow-y-auto overscroll-contain pr-1 space-y-2 pt-1 pb-1"
        >
          {displayItems.map((e, idx) => {
            const t = TEAM_REGISTRY[e.franchise as TeamCode];
            const rank = (idx % picks.length) + 1;
            const accent = t?.accent ?? "var(--team-accent)";
            return (
              <Link
                key={`${e.id}-${idx}`}
                href={`/dugout/articles/${e.slug}`}
                className="flex items-start gap-2.5 rounded-xl p-2.5 transition-all hover:bg-slate-200/50 dark:hover:bg-white/[0.08] border border-transparent hover:border-slate-300 dark:hover:border-white/10 group"
              >
                <span
                  className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md text-[10px] font-black shadow-xs"
                  style={{ backgroundColor: accent, color: isLightHex(accent) ? "#0A101D" : "#FFFFFF" }}
                >
                  {rank}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-wider">
                    <span style={{ color: accent }}>{e.franchise}</span>
                    <span className="text-slate-400 dark:text-white/40">•</span>
                    <span className="text-primary font-bold">{kicker(e)}</span>
                  </div>
                  <h4 className="line-clamp-2 text-xs font-bold text-slate-900 dark:text-white leading-snug group-hover:text-primary dark:group-hover:text-cyan-300 mt-0.5 transition-colors">
                    {e.title}
                  </h4>
                  <span className="mt-1 block text-[10px] text-slate-500 dark:text-white/60">
                    {e.readMinutes} min read
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </RailCard>
  );
}

interface PollQuestion {
  id: string;
  kicker: string;
  question: string;
  options: { id: string; label: string; pct: number }[];
}

const FAN_PULSE_QUESTIONS: PollQuestion[] = [
  {
    id: "q1",
    kicker: "Franchise Rebuild",
    question: "Which franchise faces the biggest squad overhaul heading into 2027?",
    options: [
      { id: "pbks", label: "PBKS (Complete Core Rebuild)", pct: 44 },
      { id: "dc", label: "DC (Middle-Order Reset)", pct: 26 },
      { id: "lsg", label: "LSG (Pace Department Overhaul)", pct: 18 },
      { id: "gt", label: "GT (Power Hitting Rebalance)", pct: 12 },
    ],
  },
  {
    id: "q2",
    kicker: "CSK Strategy",
    question: "Will MS Dhoni play IPL 2027 under the uncapped player retention rule?",
    options: [
      { id: "uncapped", label: "Yes, retained in ₹4 Cr bracket", pct: 68 },
      { id: "auction", label: "Yes, but enters auction paddle", pct: 18 },
      { id: "mentor", label: "Transitions to dugout mentor role", pct: 14 },
    ],
  },
  {
    id: "q3",
    kicker: "Marquee Retentions",
    question: "Which superstar should command the highest retention fee for 2027?",
    options: [
      { id: "bumrah", label: "Jasprit Bumrah (MI)", pct: 41 },
      { id: "kohli", label: "Virat Kohli (RCB)", pct: 34 },
      { id: "klaasen", label: "Heinrich Klaasen (SRH)", pct: 15 },
      { id: "rashid", label: "Rashid Khan (GT)", pct: 10 },
    ],
  },
  {
    id: "q4",
    kicker: "Auction Economics",
    question: "Should franchises exhaust all 6 retention slots or save purse?",
    options: [
      { id: "max", label: "Retain 5–6 (Lock core strength)", pct: 52 },
      { id: "rtm", label: "Retain 3–4 + use RTM cards", pct: 36 },
      { id: "reset", label: "Heavy purse reset (Retain ≤2)", pct: 12 },
    ],
  },
  {
    id: "q5",
    kicker: "Breakout Talent",
    question: "Who is the top young domestic talent to lock in before auction?",
    options: [
      { id: "mayank", label: "Mayank Yadav (LSG Pace)", pct: 45 },
      { id: "abhishek", label: "Abhishek Sharma (SRH Firepower)", pct: 32 },
      { id: "shashank", label: "Shashank Singh (PBKS Finisher)", pct: 14 },
      { id: "harshit", label: "Harshit Rana (KKR Death Overs)", pct: 9 },
    ],
  },
];

function FanPulsePoll() {
  const [activeIdx, setActiveIdx] = useState(0);
  const [votes, setVotes] = useState<Record<string, string>>({});
  const [isPaused, setIsPaused] = useState(false);

  // Auto-cycles questions every 7 seconds, pauses when hovered
  useEffect(() => {
    if (isPaused) return;
    const timer = setInterval(() => {
      setActiveIdx((prev) => (prev + 1) % FAN_PULSE_QUESTIONS.length);
    }, 7000);
    return () => clearInterval(timer);
  }, [isPaused]);

  const currentQ = FAN_PULSE_QUESTIONS[activeIdx];
  const votedOption = votes[currentQ.id];

  const handleVote = (optionId: string) => {
    setVotes((prev) => ({ ...prev, [currentQ.id]: optionId }));
  };

  const handlePrev = (e: React.MouseEvent) => {
    e.stopPropagation();
    setActiveIdx((prev) => (prev === 0 ? FAN_PULSE_QUESTIONS.length - 1 : prev - 1));
  };

  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    setActiveIdx((prev) => (prev + 1) % FAN_PULSE_QUESTIONS.length);
  };

  return (
    <section
      className="rounded-[20px] border border-white/10 bg-[#0B1020] p-4 transition-all group"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      aria-label="Live Fan Pulse Poll"
    >
      <div className="flex items-center justify-between mb-2.5">
        <div className="flex items-center gap-2">
          <h2 className="text-[12px] font-black uppercase tracking-[0.2em] text-white">Fan Pulse</h2>
          <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-violet-600/30 text-[var(--team-accent)] border border-violet-400/30 font-bold">
            {activeIdx + 1}/{FAN_PULSE_QUESTIONS.length}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={handlePrev}
            aria-label="Previous question"
            className="p-1 rounded-md text-white/50 hover:text-white hover:bg-white/10 transition-colors"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={handleNext}
            aria-label="Next question"
            className="p-1 rounded-md text-white/50 hover:text-white hover:bg-white/10 transition-colors"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <div className="text-[9px] font-black uppercase tracking-wider text-[var(--team-accent)] mb-1">
        {currentQ.kicker}
      </div>
      <p className="text-xs text-white/90 font-semibold mb-3 leading-snug min-h-[34px]">
        {currentQ.question}
      </p>

      <div className="space-y-2">
        {currentQ.options.map((opt) => {
          const isSelected = votedOption === opt.id;
          const displayPct = votedOption ? (isSelected ? opt.pct + 2 : opt.pct) : opt.pct;
          return (
            <button
              key={opt.id}
              onClick={() => handleVote(opt.id)}
              className={`w-full text-left p-2.5 rounded-xl border transition-all relative overflow-hidden ${
                isSelected
                  ? "border-[var(--team-accent)] bg-[var(--team-accent)]/15 text-white ring-1 ring-[var(--team-accent)]/40"
                  : "border-white/10 bg-white/[0.02] hover:border-white/25 text-white/80"
              }`}
            >
              {votedOption && (
                <div
                  className="absolute inset-y-0 left-0 bg-white/[0.08] transition-all duration-500"
                  style={{ width: `${displayPct}%` }}
                />
              )}
              <div className="relative z-10 flex items-center justify-between gap-2 text-xs">
                <span className="font-semibold leading-tight">{opt.label}</span>
                {votedOption && <span className="font-mono text-[11px] font-black text-[var(--team-accent)] shrink-0">{displayPct}%</span>}
              </div>
            </button>
          );
        })}
      </div>

      {/* Footer controls: pagination dots & timer status */}
      <div className="mt-3 flex items-center justify-between pt-2 border-t border-white/5 text-[10px]">
        <div className="flex items-center gap-1.5">
          {FAN_PULSE_QUESTIONS.map((q, idx) => (
            <button
              key={q.id}
              onClick={() => setActiveIdx(idx)}
              aria-label={`Jump to question ${idx + 1}`}
              className={`h-1.5 rounded-full transition-all ${
                activeIdx === idx ? "w-4 bg-[var(--team-accent)]" : "w-1.5 bg-white/20 hover:bg-white/40"
              }`}
            />
          ))}
        </div>
        <span className="text-white/40 text-[9px]">
          {isPaused ? "Paused on hover" : "Auto-rotating • 7s"}
        </span>
      </div>
    </section>
  );
}

function SectionHead({ title, sub }: { title: string; sub?: string }) {
  return (
    <div className="mb-3">
      <h2 className="text-[13px] font-black uppercase tracking-[0.2em] text-slate-900 dark:text-white">{title}</h2>
      {sub && <p className="text-xs text-slate-500 dark:text-white/55 mt-0.5">{sub}</p>}
    </div>
  );
}

function TeamChip({
  active,
  onClick,
  teamCode,
  accent,
}: {
  active: boolean;
  onClick: () => void;
  teamCode?: TeamCode | "ALL";
  accent?: string;
}) {
  const isAll = !teamCode || teamCode === "ALL";
  const teamData = !isAll ? TEAM_REGISTRY[teamCode as TeamCode] : null;
  const teamAccent = accent || teamData?.accent || "#2563eb";

  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`inline-flex items-center gap-2 h-9 px-3 rounded-xl border text-xs tracking-wide transition-all cursor-pointer select-none active:scale-95 ${
        active
          ? isAll
            ? "border-slate-900 dark:border-white bg-slate-900 dark:bg-white text-white dark:text-slate-950 font-black shadow-xs"
            : "text-slate-950 dark:text-white font-black shadow-xs"
          : "border-slate-200 dark:border-white/10 bg-white dark:bg-white/[0.04] text-slate-700 dark:text-slate-200 hover:border-slate-300 dark:hover:border-white/25 hover:bg-slate-50 dark:hover:bg-white/[0.08] font-bold"
      }`}
      style={
        active && !isAll
          ? {
              backgroundColor: `${teamAccent}18`,
              borderColor: teamAccent,
              boxShadow: `0 0 10px ${teamAccent}30`,
            }
          : undefined
      }
    >
      {isAll ? (
        <div
          className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 border transition-all ${
            active
              ? "bg-white/10 text-white dark:text-slate-950 dark:bg-black/10 border-transparent"
              : "bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-white/10"
          }`}
        >
          <Shield size={11} className="stroke-[2.5]" />
        </div>
      ) : (
        <div
          className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 p-0.5 overflow-hidden border transition-all bg-white ${
            active ? "shadow-xs" : "border-slate-200/80 dark:border-white/10 shadow-2xs"
          }`}
          style={active ? { borderColor: teamAccent } : undefined}
        >
          <img src={teamData?.logoImg} alt="" className="w-full h-full object-contain" />
        </div>
      )}
      <span>{isAll ? "ALL" : teamCode}</span>
    </button>
  );
}

function RailCard({ title, children, action }: { title: string; children: ReactNode; action?: ReactNode }) {
  return (
    <section className="rounded-[20px] border border-slate-200 dark:border-white/10 bg-slate-50/80 dark:bg-[#0B1020] p-4 shadow-xs">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="text-[12px] font-black uppercase tracking-[0.2em] text-slate-900 dark:text-white">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

function CtaBand({ icon: Icon, kicker, text, href, cta }: { icon: typeof Users; kicker: string; text: string; href: string; cta: string }) {
  return (
    <div className="flex flex-wrap items-center gap-4 rounded-[20px] border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#0B1020] p-4 shadow-xs">
      <Icon className="w-8 h-8 shrink-0 text-[var(--team-accent)]" />
      <div className="min-w-0 flex-1">
        <div className="text-[10px] font-black uppercase tracking-widest text-[var(--team-accent)]">{kicker}</div>
        <p className="text-xs text-slate-600 dark:text-white/70">{text}</p>
      </div>
      <Link
        href={href}
        className="inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-black border border-primary/40 bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
      >
        {cta} <ArrowRight className="w-3.5 h-3.5" />
      </Link>
    </div>
  );
}

