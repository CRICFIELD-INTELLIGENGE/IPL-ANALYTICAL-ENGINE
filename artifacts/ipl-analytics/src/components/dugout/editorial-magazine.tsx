import React, { useState, useMemo, useRef, useEffect } from "react";
import { Link } from "wouter";
import {
  BookOpen, Search, ArrowRight, ChevronLeft, ChevronRight,
  TrendingUp, Users, Target, ShieldCheck, Sparkles, Filter,
  Clock, Calendar, Award, Flame, BarChart3, Radio, Cpu, Layers
} from "lucide-react";
import {
  EditorialArticle,
  getArticlesForFranchise,
  EDITORIAL_PARAMETERS,
  FRANCHISE_METADATA,
} from "@/data/editorial-magazine-data";
import { EditorialCoverCanvas } from "./editorial-cover-canvas";
import { EditorialCardMedia } from "./editorial-image-figure";
import { getArticleHeroImage } from "@/lib/editorial-images";
import { findV2BySlug } from "@/lib/editorial-v2";

const GLASS = "border border-white/[0.08] bg-[rgba(18,24,38,0.7)] backdrop-blur-xl";

function ArticleCover({
  articleId,
  href,
  ...canvas
}: { articleId: string; href: string } & React.ComponentProps<typeof EditorialCoverCanvas>) {
  const hero = getArticleHeroImage(articleId);
  return (
    <Link
      href={href}
      onClick={() => window.scrollTo({ top: 0, behavior: "instant" })}
      className="block w-full aspect-video overflow-hidden relative group/cover [&>div]:rounded-none [&>div]:border-0 [&>div]:transition-transform [&>div]:duration-500 group-hover:[&>div]:scale-[1.03]"
    >
      {hero ? (
        <EditorialCardMedia key={hero.assetId} image={hero} aspect="video" allowUnpublished={import.meta.env.DEV} fallback={<EditorialCoverCanvas {...canvas} aspectRatio="video" />} />
      ) : (
        <EditorialCoverCanvas {...canvas} aspectRatio="video" />
      )}
    </Link>
  );
}

/** Compact carousel card for editorial stories */
function CarouselStoryCard({
  art,
  accent,
  teamName,
  code,
}: {
  art: EditorialArticle;
  accent: string;
  teamName: string;
  code: string;
}) {
  const href = `/dugout/articles/${art.slug}`;
  // A v2 revision that keeps this URL replaces the legacy card's title, standfirst and photo.
  const revision = findV2BySlug(art.slug);
  const stat = revision?.headlineStat ? { label: revision.headlineStat.label, value: revision.headlineStat.display } : art.keyStats?.[0];
  const title = revision?.title ?? art.title;
  const subtitle = revision?.dek ?? art.subtitle;

  return (
    <article className={`group flex h-full w-[290px] sm:w-[320px] shrink-0 snap-start flex-col overflow-hidden rounded-2xl ${GLASS} transition-all duration-300 hover:border-white/20 hover:shadow-xl hover:shadow-black/40`}>
      {/* Card Header: Category & Read Time */}
      <div className="flex items-center justify-between px-3.5 pt-3 pb-2.5 text-[10px] font-mono uppercase tracking-wider">
        <span className="font-bold truncate max-w-[190px]" style={{ color: accent }}>
          {art.parameter}
        </span>
        <span className="text-slate-500 font-medium shrink-0 flex items-center gap-1">
          <Clock className="w-2.5 h-2.5" />
          {art.readTime}
        </span>
      </div>

      {/* 16:9 Image Cover */}
      <ArticleCover
        articleId={revision?.id ?? art.id}
        href={href}
        franchiseName={teamName}
        teamCode={code}
        parameter={art.parameter}
        parameterNumber={art.parameterNumber}
        title={title}
        accent={accent}
        coverImage={art.coverImage}
      />

      {/* Card Body & Key Stats */}
      <div className="flex flex-1 flex-col p-3.5 space-y-2">
        <Link
          href={href}
          onClick={() => window.scrollTo({ top: 0, behavior: "instant" })}
          className="space-y-1 block"
        >
          <h4 className="font-bold text-sm leading-snug text-slate-100 line-clamp-2 transition-colors group-hover:text-white">
            {title}
          </h4>
          <p className="text-[11px] leading-relaxed text-slate-400 line-clamp-1">
            {subtitle}
          </p>
        </Link>

        {/* Footer: Stat Pill + Action */}
        <div className="mt-auto flex items-center justify-between gap-2 pt-2.5 border-t border-white/5">
          {stat ? (
            <span className="truncate rounded-md border border-white/[0.08] bg-white/[0.03] px-2 py-0.5 text-[9px] font-mono text-slate-400">
              {stat.label}: <span className="text-slate-200 font-bold">{stat.value}</span>
            </span>
          ) : (
            <span />
          )}

          <Link
            href={href}
            onClick={() => window.scrollTo({ top: 0, behavior: "instant" })}
            className="inline-flex shrink-0 items-center gap-1 text-[11px] font-bold transition-transform group-hover:translate-x-0.5"
            style={{ color: accent }}
          >
            Read <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      </div>
    </article>
  );
}

interface EditorialMagazineProps {
  code: string; // e.g. "SRH", "RCB", "CSK", "MI", etc.
  teamName: string;
  accent: string;
}

export function EditorialMagazine({ code, teamName, accent }: EditorialMagazineProps) {
  const [activeParameter, setActiveParameter] = useState<string>("All Stories");
  const [searchQuery, setSearchQuery] = useState("");
  const carouselRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  // Load franchise articles (10 dedicated stories)
  const articles = useMemo(() => getArticlesForFranchise(code), [code]);

  // Franchise editorial identity metadata
  const meta = useMemo(() => {
    return FRANCHISE_METADATA[code.toUpperCase()] || {
      name: teamName,
      identity: "Franchise cricket intelligence and strategic analysis",
      accent: accent || "#f97316",
      venue: "Home Fortress",
    };
  }, [code, teamName, accent]);

  // Filtered stories by parameter and search query
  const filteredArticles = useMemo(() => {
    return articles.filter((a) => {
      const matchParam =
        activeParameter === "All Stories" || a.parameter === activeParameter;
      const matchQuery =
        !searchQuery.trim() ||
        a.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        a.subtitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
        a.parameter.toLowerCase().includes(searchQuery.toLowerCase());
      return matchParam && matchQuery;
    });
  }, [articles, activeParameter, searchQuery]);

  const updateScrollButtons = () => {
    if (!carouselRef.current) return;
    const { scrollLeft, scrollWidth, clientWidth } = carouselRef.current;
    setCanScrollLeft(scrollLeft > 10);
    setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10);
  };

  useEffect(() => {
    updateScrollButtons();
  }, [filteredArticles]);

  const scrollCarousel = (direction: "left" | "right") => {
    if (!carouselRef.current) return;
    const scrollAmount = 340;
    carouselRef.current.scrollBy({
      left: direction === "left" ? -scrollAmount : scrollAmount,
      behavior: "smooth",
    });
  };

  return (
    <section
      id="newsroom"
      className="scroll-mt-24 rounded-3xl border border-white/10 bg-[#070C15] p-4 sm:p-6 lg:p-7 space-y-5 shadow-2xl relative overflow-hidden text-slate-100"
    >
      {/* Ambient background glow */}
      <div
        className="absolute -top-24 -left-24 w-80 h-80 rounded-full blur-3xl opacity-15 pointer-events-none"
        style={{ backgroundColor: meta.accent || accent || "#f97316" }}
      />
      <div className="absolute -bottom-24 -right-24 w-80 h-80 rounded-full bg-cyan-600/10 blur-3xl pointer-events-none" />

      {/* ── 1. Top Carousel Header & Controls ── */}
      <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4 pb-3 border-b border-white/10">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-[10px] font-mono tracking-widest uppercase text-cyan-400">
            <BookOpen className="w-3.5 h-3.5" />
            <span>CRICFIELD EDITORIAL MAGAZINE</span>
            <span className="text-white/30">•</span>
            <span className="text-slate-400 font-bold">{articles.length} DEDICATED CHAPTERS</span>
          </div>

          <h3 className="text-xl sm:text-2xl font-black font-display tracking-tight text-white flex items-center gap-2">
            <span style={{ color: meta.accent }}>›</span>
            <span>{teamName.toUpperCase()}</span>
            <span className="text-slate-400 font-light text-base sm:text-lg">Dossier</span>
          </h3>
        </div>

        {/* Action Controls: Intel Link & Carousel Nav */}
        <div className="flex items-center gap-3 self-end md:self-center">
          <Link href={`/intelligence?franchise=${code.toLowerCase()}&tab=insights`}>
            <button
              type="button"
              className="px-3 py-1.5 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 hover:border-cyan-400 text-xs font-mono font-bold flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
            >
              <Cpu className="w-3.5 h-3.5" />
              <span>Full Intel &amp; Insights</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </Link>

          {/* Carousel Arrows */}
          <div className="flex items-center gap-1.5 bg-black/40 border border-white/10 p-1 rounded-xl">
            <button
              type="button"
              onClick={() => scrollCarousel("left")}
              disabled={!canScrollLeft}
              className="p-1.5 rounded-lg text-white/70 hover:text-white hover:bg-white/10 disabled:opacity-30 disabled:hover:bg-transparent transition-all cursor-pointer"
              title="Previous Stories"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => scrollCarousel("right")}
              disabled={!canScrollRight}
              className="p-1.5 rounded-lg text-white/70 hover:text-white hover:bg-white/10 disabled:opacity-30 disabled:hover:bg-transparent transition-all cursor-pointer"
              title="Next Stories"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* ── 2. Parameter Filters & Search Ribbon ── */}
      <div className="relative z-10 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Scrollable Parameter Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none flex-1">
          {EDITORIAL_PARAMETERS.map((param) => {
            const active = activeParameter === param;
            return (
              <button
                key={param}
                onClick={() => setActiveParameter(param)}
                className={`px-3 py-1 rounded-xl text-[11px] font-bold whitespace-nowrap transition-all cursor-pointer ${
                  active
                    ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/50 shadow-sm"
                    : "text-slate-400 hover:text-white bg-white/[0.03] border border-white/5 hover:border-white/15"
                }`}
              >
                {param}
              </button>
            );
          })}
        </div>

        {/* Compact Search */}
        <div className="relative shrink-0 min-w-[200px]">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search stories..."
            className="w-full pl-8 pr-3 py-1 rounded-xl bg-white/[0.04] border border-white/10 hover:border-cyan-500/30 focus:border-cyan-400 focus:outline-none text-xs font-mono text-white placeholder:text-slate-500 transition-all"
          />
        </div>
      </div>

      {/* ── 3. Smooth Horizontal Story Carousel Track ── */}
      <div className="relative z-10">
        {filteredArticles.length === 0 ? (
          <div className="p-8 rounded-2xl border border-dashed border-white/15 text-center text-slate-400 text-xs font-mono">
            No stories matching current parameter filters.
          </div>
        ) : (
          <div
            ref={carouselRef}
            onScroll={updateScrollButtons}
            className="flex gap-4 overflow-x-auto pb-3 pt-1 scroll-smooth snap-x snap-mandatory custom-scrollbar"
            style={{ scrollbarWidth: "thin" }}
          >
            {/* Story Cards */}
            {filteredArticles.map((art) => (
              <CarouselStoryCard
                key={art.id}
                art={art}
                accent={meta.accent}
                teamName={teamName}
                code={code}
              />
            ))}

            {/* Final Slide: Deep-Link to Unified Intelligence & Insights Hub */}
            <article className={`flex h-full w-[290px] sm:w-[320px] shrink-0 snap-start flex-col justify-between overflow-hidden rounded-2xl border border-cyan-500/30 bg-gradient-to-br from-[#0B1426] via-[#0F1B35] to-[#1E1435] p-5 shadow-xl`}>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="px-2 py-0.5 rounded text-[9px] font-mono font-bold uppercase tracking-widest bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                    UNIFIED LAB
                  </span>
                  <Sparkles className="w-4 h-4 text-cyan-400" />
                </div>

                <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-300">
                  <Cpu className="w-5 h-5" />
                </div>

                <h4 className="font-extrabold text-base text-white tracking-tight leading-snug">
                  Explore Full Intelligence &amp; Insights
                </h4>

                <p className="text-xs text-slate-300 leading-relaxed">
                  Dive into the 9-Dimension tactical dossier, 100-Day Content Engine, and advanced analytics for {teamName}.
                </p>
              </div>

              <div className="pt-6">
                <Link href={`/intelligence?franchise=${code.toLowerCase()}&tab=insights`}>
                  <button
                    type="button"
                    className="w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-black font-black text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/20 cursor-pointer"
                  >
                    <span>Open Intel Hub</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </Link>
              </div>
            </article>
          </div>
        )}
      </div>
    </section>
  );
}
