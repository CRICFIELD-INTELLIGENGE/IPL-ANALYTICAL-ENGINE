import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Link } from "wouter";
import {
  ArrowRight, CalendarDays, Users, Gavel, Shield, Star, MapPin, Flame, ShieldCheck,
  Search, Shirt, Wallet, Sparkles, Activity, Trophy, ExternalLink, ChevronLeft, ChevronRight,
} from "lucide-react";
import { Layout } from "@/components/layout";
import { AdVessel } from "@/components/ad-vessel";
import { EditorialCardMedia } from "@/components/dugout/editorial-image-figure";
import { getLocalEmbedImages, getPublishedArticleImages, PUBLIC_MANIFEST, isPublishable, isLocalPreviewable } from "@/lib/editorial-images";
import { useEmbedConsent } from "@/lib/embed-consent";
import { TeamLogo } from "@/components/team-logo";
import { NewsCard, newsroomOrder } from "@/components/feed-newsroom";
import { getV2Index, STORY_TYPE_LABEL } from "@/lib/editorial-v2";
import { HUB_EVENTS, HUB_TEAMS } from "@/lib/ipl-2027";
import { TEAM_REGISTRY, useTeamTheme, type TeamCode } from "@/lib/team-context";
import { useIpl2027Desk, stamp } from "@/lib/ipl-2027-desk";
import { EDITORIAL_AUTHOR, type IndexEntry } from "@/data/editorial/schema";

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
  { id: "squad", title: "SQUAD BUILDING", subtitle: "Retentions, releases, core and gaps", img: "/squad-building.jpg", color: "text-[var(--team-accent)]", icon: Users },
  { id: "auction", title: "AUCTION", subtitle: "Purse, market and strategy", img: "/auction-gavel.jpg", color: "text-[var(--team-accent)]", icon: Gavel },
  { id: "tactics", title: "TACTICS", subtitle: "Evolving game styles", img: "/tactics-board.jpg", color: "text-emerald-300", icon: Shield },
  { id: "stars", title: "STAR WATCH", subtitle: "Rising names to watch", img: "/star-watch.jpg", color: "text-rose-300", icon: Star },
  { id: "venues", title: "VENUES", subtitle: "Conditions and trends", img: "/venues-stadium.jpg", color: "text-sky-300", icon: MapPin },
  { id: "storylines", title: "STORYLINES", subtitle: "Rivalries, narratives and more", img: "/storylines.jpg", color: "text-[var(--team-accent)]", icon: Flame },
];

const TOOLS = [
  { label: "Retention Lab", desc: "Model retain/release calls against each squad", href: "/feed/ipl-2027?module=retention", icon: ShieldCheck, tint: "bg-violet-600" },
  { label: "Auction War Room", desc: "Purse, needs and targets by franchise", href: "/ai-analyst/auction-war-room", icon: Wallet, tint: "bg-lime-500" },
  { label: "Playing XI Builder", desc: "Create balanced combinations", href: "/arcade/build-your-xi", icon: Shirt, tint: "bg-sky-500" },
  { label: "Scout Engine", desc: "Find players by role, league and metrics", href: "/scout", icon: Search, tint: "bg-fuchsia-600" },
];

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
  const [team, setTeam] = useState<TeamCode | null>(null);
  const [tab, setTab] = useState<(typeof STORY_TABS)[number]["id"]>("featured");
  const [latestTeam, setLatestTeam] = useState<TeamCode | null>(null);
  const { data: desk } = useIpl2027Desk();
  useEffect(() => { setTeam(selectedTeam); setLatestTeam(selectedTeam); }, [selectedTeam]);

  const all = useMemo(() => getV2Index(), []);
  const forTeam = useMemo(() => all.filter((e) => !team || e.franchise === team), [all, team]);

  // Top stories: 1 lead card + 4 sidebar cards. Diverse teams unless a team is explicitly selected.
  const top = useMemo(() => {
    const pool = tab === "featured" ? forTeam : forTeam.filter((e) => e.storyType === tab);
    const ordered = newsroomOrder(pool);
    if (team) {
      return ordered.slice(0, 5);
    }
    return getDiverseByTeam(ordered, 5);
  }, [forTeam, tab, team]);

  // Diverse featured stories across the league for the scrolling editorial rail
  const picks = useMemo(() => {
    const featured = all.filter((e) => e.featured);
    return getDiverseByTeam(newsroomOrder(featured), 8);
  }, [all]);

  // Latest stories: When opted ALL, pop stories from different teams
  const latest = useMemo(() => {
    // Getty's signed viewer cannot mount twice with the same widget ID.
    const topIds = new Set(top.map((e) => e.id));
    const remaining = all.filter((e) => !topIds.has(e.id));
    if (latestTeam) {
      return [...remaining]
        .filter((e) => e.franchise === latestTeam)
        .sort((a, b) => b.publishedDate.localeCompare(a.publishedDate))
        .slice(0, 8);
    }
    const sorted = [...remaining].sort((a, b) => b.publishedDate.localeCompare(a.publishedDate));
    return getDiverseByTeam(sorted, 8);
  }, [all, latestTeam, top]);

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
              <Link key={c.id} href={`/feed/${c.id}`} className="group overflow-hidden rounded-2xl border border-white/10 bg-[#0B1020] hover:border-white/30 transition-colors">
                <div className="h-24 overflow-hidden">
                  {/* zoom from the top pushes the caption baked into these images out of view */}
                  <img src={c.img} alt="" className="h-full w-full object-cover object-top origin-top scale-[1.45] group-hover:scale-[1.55] transition-transform duration-500" />
                </div>
                <div className="p-3">
                  <div className="flex items-center gap-2">
                    <c.icon className={`hidden sm:block w-4 h-4 shrink-0 ${c.color}`} />
                    <span className="text-[12px] font-black text-white leading-tight">{c.title}</span>
                  </div>
                  <div className="mt-1 flex items-end justify-between gap-2">
                    <span className="text-[11px] text-white/55">{c.subtitle}</span>
                    <ArrowRight className={`w-3.5 h-3.5 shrink-0 ${c.color}`} />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* MAIN COLUMN + EDITORIAL RAIL */}
        <div data-feed-part="newsroom" className="grid gap-6 xl:grid-cols-[1fr_270px]">
          <div className="space-y-6 min-w-0">
            <section>
              <SectionHead title="Franchise coverage" sub="Pick a team to see its stories." />
              <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Filter stories by franchise">
                <TeamChip active={!team} onClick={() => setTeam(null)}>ALL</TeamChip>
                {HUB_TEAMS.map((t) => (
                  <TeamChip color={TEAM_REGISTRY[t].accent} key={t} active={team === t} onClick={() => setTeam(t)}>
                    <img src={TEAM_REGISTRY[t].logoImg} alt="" className="w-4 h-4 object-contain" /> {t}
                  </TeamChip>
                ))}
                {team && (
                  <Link
                    href={`/dugout/${team.toLowerCase()}`}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all ml-1 border shadow-xs hover:brightness-110 active:scale-95"
                    style={{
                      backgroundColor: `${TEAM_REGISTRY[team].accent}18`,
                      borderColor: `${TEAM_REGISTRY[team].accent}40`,
                      color: TEAM_REGISTRY[team].accent,
                    }}
                  >
                    <img src={TEAM_REGISTRY[team].logoImg} alt="" className="w-3.5 h-3.5 object-contain" />
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
                      media={<EntryMedia entry={top[0]} />}
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
                <div className="mb-3 flex flex-wrap items-center gap-2">
                  <h2 className="text-[13px] font-black uppercase tracking-[0.2em] text-slate-900 dark:text-white mr-2">Latest</h2>
                  {[null, ...HUB_TEAMS].map((t) => (
                    <button
                      key={t ?? "all"}
                      onClick={() => setLatestTeam(t)}
                      aria-pressed={latestTeam === t}
                      className={`rounded-lg px-2.5 py-1 text-[11px] font-semibold transition-all ${
                        latestTeam === t
                          ? "bg-primary text-white shadow-xs font-bold"
                          : "text-slate-600 dark:text-white/50 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5"
                      }`}
                    >
                      {t ?? "All"}
                    </button>
                  ))}
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
    <section className="rounded-[20px] border border-white/10 bg-[#0B1020] p-4" aria-label="Retention deadline countdown">
      <div className="flex items-start justify-between">
        <div>
          <div className="text-[10px] font-black uppercase tracking-widest text-[var(--team-accent)]">IPL 2027</div>
          <div className="text-sm font-black uppercase text-white">Retention deadline</div>
        </div>
        <CalendarDays className="w-5 h-5 text-[var(--team-accent)]" />
      </div>
      {target ? (
        <>
          <div className="mt-3 grid grid-cols-4 gap-1 text-center" aria-live="off">
            {parts.map(([v, l]) => (
              <div key={l}>
                <div className="text-2xl font-black tabular-nums text-white">{String(v).padStart(2, "0")}</div>
                <div className="text-[9px] uppercase text-white/45">{l}</div>
              </div>
            ))}
          </div>
          <p className="mt-2 text-[10px] text-white/45">
            {dateLabel(event!.date!)}{event!.status === "confirmed" ? "" : " · reported date, not yet officially confirmed"}
          </p>
        </>
      ) : (
        <p className="mt-3 text-sm text-white/60">Date to be announced.</p>
      )}
      <Link href="/pulse#auction" className="franchise-action mt-3 flex items-center justify-center gap-2 rounded-xl bg-violet-700 py-2 text-xs font-bold text-white hover:bg-violet-600">
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
  if (text.includes("auction") || text.includes("purse") || text.includes("price") || entry.aspect === "auction-economics") {
    return "/auction-art.jpg";
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
    return "/tactical-yorker.jpg";
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
  const displayItems = [...picks, ...picks];

  return (
    <RailCard title="Editor's picks">
      <div className="relative h-[320px] overflow-hidden group">
        <div className="pointer-events-none absolute inset-x-0 top-0 z-10 h-8 bg-gradient-to-b from-slate-50 dark:from-[#0B1020] via-slate-50/80 dark:via-[#0B1020]/80 to-transparent" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-8 bg-gradient-to-t from-slate-50 dark:from-[#0B1020] via-slate-50/80 dark:via-[#0B1020]/80 to-transparent" />
        <div className="animate-vertical-scroll space-y-2.5 will-change-transform group-hover:[animation-play-state:paused] pt-1">
          {displayItems.map((e, idx) => {
            const t = TEAM_REGISTRY[e.franchise as TeamCode];
            const rank = (idx % picks.length) + 1;
            const accent = t?.accent ?? "var(--team-accent)";
            return (
              <Link
                key={`${e.id}-${idx}`}
                href={`/dugout/articles/${e.slug}`}
                className="flex items-start gap-2.5 rounded-xl p-2.5 transition-all hover:bg-slate-200/50 dark:hover:bg-white/[0.06] border border-transparent hover:border-slate-300 dark:hover:border-white/10"
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
                    <span className="text-slate-400 dark:text-white/25">•</span>
                    <span className="text-primary font-bold">{kicker(e)}</span>
                  </div>
                  <h4 className="line-clamp-2 text-xs font-bold text-slate-800 dark:text-slate-100 leading-snug group-hover:text-primary dark:group-hover:text-white mt-0.5">
                    {e.title}
                  </h4>
                  <span className="mt-1 block text-[10px] text-slate-500 dark:text-slate-400">
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
              <div className="relative z-10 flex items-center justify-between text-xs">
                <span className="font-semibold">{opt.label}</span>
                {votedOption && <span className="font-mono text-[11px] font-black text-[var(--team-accent)]">{displayPct}%</span>}
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

function TeamChip({ active, onClick, children, color = "#8ba7ff" }: { active: boolean; onClick: () => void; children: ReactNode; color?: string }) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      style={active ? { backgroundColor: `${color}28`, borderColor: color, color } : undefined}
      className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-black transition-all ${
        active 
          ? "border-[var(--team-accent)] bg-[var(--team-accent)] text-black shadow-xs" 
          : "border-slate-300 dark:border-white/15 bg-white/60 dark:bg-white/5 text-slate-700 dark:text-white/75 hover:border-slate-400 dark:hover:border-white/40 hover:text-slate-900 dark:hover:text-white"
      }`}
    >
      {children}
    </button>
  );
}

function RailCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-[20px] border border-slate-200 dark:border-white/10 bg-slate-50/80 dark:bg-[#0B1020] p-4 shadow-xs">
      <h2 className="mb-3 text-[12px] font-black uppercase tracking-[0.2em] text-slate-900 dark:text-white">{title}</h2>
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

