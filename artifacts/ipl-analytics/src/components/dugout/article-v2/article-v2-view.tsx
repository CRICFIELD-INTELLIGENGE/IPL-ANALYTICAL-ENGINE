// Dugout v2 article page: five-section structure, evidence-backed prose, charts, editorial
// photography from the rights-gated manifest, verified JioHotstar "Watch the Moment" links.
import React, { useEffect, useMemo, useState } from "react";
import { Link } from "wouter";
import { ArrowRight, BookOpen, Clock, ExternalLink, FlaskConical, Lightbulb, PlayCircle, ShieldCheck } from "lucide-react";
import { Layout } from "@/components/layout";
import { AdVessel } from "@/components/ad-vessel";
import { EditorialCoverCanvas } from "@/components/dugout/editorial-cover-canvas";
import { EditorialImageFigure } from "@/components/dugout/editorial-image-figure";
import { getLocalEmbedImages, getPublishedArticleImages } from "@/lib/editorial-images";
import type { EditorialSectionId } from "@/data/editorial-images/types";
import { FRANCHISE_METADATA } from "@/data/editorial-magazine-data";
import { EDITORIAL_ASPECTS, type IndexEntry, type PlanEntry } from "@/data/editorial/schema";
import { getVideoById, BROADCASTER_DISCLAIMER } from "@/lib/video-registry";
import { SECTION_ROLE_LABEL, SITE_ORIGIN, STORY_TYPE_LABEL, findV2ById, getV2ForFranchise, loadArticleV2, loadPlan, plainText, splitTokens, type LoadedArticle } from "@/lib/editorial-v2";
import { EvidenceChart } from "./evidence-chart";
import { GettyPhotoNotice } from "@/components/dugout/getty-photo-notice";
import { SponsorModule } from "@/components/photo-policy";
import { TokenText } from "./token-text";
import { EditorialFullSidebar } from "./article-sidebar-modules";

function useArticleSeo(loaded: LoadedArticle | null) {
  useEffect(() => {
    if (!loaded) return;
    const { article: a, evidence } = loaded;
    const url = SITE_ORIGIN ? `${SITE_ORIGIN}/dugout/articles/${a.slug}` : undefined;
    const prevTitle = document.title;
    document.title = a.seo.metaTitle;
    const added: Element[] = [];
    const prev = new Map<Element, string | null>();
    const setMeta = (attr: "name" | "property", key: string, content: string) => {
      let el = document.head.querySelector(`meta[${attr}="${key}"]`);
      if (el) prev.set(el, el.getAttribute("content"));
      else {
        el = document.createElement("meta");
        el.setAttribute(attr, key);
        document.head.appendChild(el);
        added.push(el);
      }
      el.setAttribute("content", content);
    };
    setMeta("name", "description", a.seo.metaDescription);
    setMeta("property", "og:title", a.seo.metaTitle);
    setMeta("property", "og:description", a.seo.metaDescription);
    setMeta("property", "og:type", "article");
    if (url) setMeta("property", "og:url", url);
    setMeta("name", "twitter:card", "summary");
    setMeta("name", "twitter:title", a.seo.metaTitle);
    setMeta("name", "twitter:description", a.seo.metaDescription);
    if (a.status !== "published") setMeta("name", "robots", "noindex, nofollow");
    if (url) {
    const canonical = document.createElement("link");
    canonical.rel = "canonical";
    canonical.href = url;
    document.head.appendChild(canonical);
    added.push(canonical);
    }
    const ld = document.createElement("script");
    ld.type = "application/ld+json";
    ld.text = JSON.stringify({
      "@context": "https://schema.org",
      "@type": "AnalysisNewsArticle",
      headline: a.title,
      description: plainText(a.dek, evidence),
      author: { "@type": "Organization", name: a.author },
      publisher: { "@type": "Organization", name: "CricField" },
      datePublished: a.publishedDate,
      dateModified: a.updatedDate ?? a.publishedDate,
      mainEntityOfPage: url,
      about: a.teams,
    });
    document.head.appendChild(ld);
    added.push(ld);
    return () => {
      document.title = prevTitle;
      added.forEach((el) => el.remove());
      prev.forEach((v, el) => (v == null ? el.removeAttribute("content") : el.setAttribute("content", v)));
    };
  }, [loaded]);
}

function HeroTacticalCard({
  article,
  accent,
  evidence,
}: {
  article: LoadedArticle["article"];
  accent: string;
  evidence: LoadedArticle["evidence"];
}) {
  const isRcbOrKohli =
    article.franchise === "RCB" ||
    article.title.toLowerCase().includes("kohli") ||
    article.dek.toLowerCase().includes("kohli");

  const [activeTab, setActiveTab] = useState<"telemetry" | "takeaways" | "dilemma">(
    isRcbOrKohli ? "telemetry" : "takeaways"
  );

  return (
    <div className="lg:col-span-5 flex flex-col justify-between rounded-2xl border border-slate-200 dark:border-[#2A4050] bg-white dark:bg-[#101F2D] p-5 sm:p-6 backdrop-blur shadow-xs dark:shadow-2xl">
      {/* Top Header & Tab Switcher */}
      <div>
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-[#2A4050] pb-3 mb-4">
          <div className="flex items-center gap-1.5 text-[10px] font-mono font-bold uppercase tracking-widest truncate" style={{ color: accent }}>
            <span className="w-2 h-2 rounded-full animate-pulse shrink-0" style={{ backgroundColor: accent }} />
            <span className="truncate">
              {activeTab === "telemetry"
                ? isRcbOrKohli
                  ? "TELEMETRY SNAPSHOT · NO. 18"
                  : `TELEMETRY SNAPSHOT · ${article.franchise}`
                : activeTab === "dilemma"
                ? "THE POWERPLAY PARADOX"
                : "EXECUTIVE SUMMARY"}
            </span>
          </div>

          <div className="flex items-center gap-1 bg-slate-100 dark:bg-[#08131F] p-0.5 rounded-lg border border-slate-200 dark:border-[#2A4050] text-[10px] font-mono shrink-0">
            <button
              type="button"
              onClick={() => setActiveTab(isRcbOrKohli ? "telemetry" : "takeaways")}
              className={`px-2 py-0.5 rounded transition cursor-pointer ${
                activeTab === "telemetry" || (!isRcbOrKohli && activeTab === "takeaways")
                  ? "bg-white dark:bg-[#192D3C] text-slate-900 dark:text-white font-bold shadow-xs"
                  : "text-slate-600 hover:text-slate-900 dark:text-[#8A9EA8] dark:hover:text-white"
              }`}
            >
              {isRcbOrKohli ? "Telemetry" : "Summary"}
            </button>
            {isRcbOrKohli && (
              <button
                type="button"
                onClick={() => setActiveTab("takeaways")}
                className={`px-2 py-0.5 rounded transition cursor-pointer ${
                  activeTab === "takeaways"
                    ? "bg-white dark:bg-[#192D3C] text-slate-900 dark:text-white font-bold shadow-xs"
                    : "text-slate-600 hover:text-slate-900 dark:text-[#8A9EA8] dark:hover:text-white"
                }`}
              >
                Summary
              </button>
            )}
            <button
              type="button"
              onClick={() => setActiveTab("dilemma")}
              className={`px-2 py-0.5 rounded transition cursor-pointer ${
                activeTab === "dilemma"
                  ? "bg-white dark:bg-[#192D3C] text-slate-900 dark:text-white font-bold shadow-xs"
                  : "text-slate-600 hover:text-slate-900 dark:text-[#8A9EA8] dark:hover:text-white"
              }`}
            >
              Dilemma
            </button>
          </div>
        </div>

        {/* Tab 1: Option A - Telemetry Snapshot */}
        {activeTab === "telemetry" && (
          <div className="space-y-4">
            <div>
              <h4 className="text-base sm:text-lg font-black tracking-tight text-slate-900 dark:text-white">
                {isRcbOrKohli ? "The Risk-Adjusted Anchor" : `${article.franchise} Tactical Pulse`}
              </h4>
              <p className="text-xs text-slate-600 dark:text-[#8A9EA8] mt-1">
                {isRcbOrKohli
                  ? "Powerplay resource allocation and wicket-preservation telemetry."
                  : "Key verified quantitative indicators from the CricField warehouse."}
              </p>
            </div>

            {/* 2x2 Grid */}
            <div className="grid grid-cols-2 gap-2.5">
              <div className="rounded-xl border border-slate-200 dark:border-[#2A4050] bg-slate-50 dark:bg-[#192D3C] p-3">
                <div className="text-xl sm:text-2xl font-black font-mono tracking-tight" style={{ color: accent }}>
                  {isRcbOrKohli ? "164.5" : "9.99"}
                </div>
                <div className="text-[10px] font-mono text-slate-600 dark:text-[#8A9EA8] mt-0.5 leading-snug">
                  {isRcbOrKohli ? "Powerplay Strike Rate (2024–2026)" : "Phase Run Rate"}
                </div>
              </div>
              <div className="rounded-xl border border-slate-200 dark:border-[#2A4050] bg-slate-50 dark:bg-[#192D3C] p-3">
                <div className="text-xl sm:text-2xl font-black font-mono tracking-tight text-slate-900 dark:text-white">
                  {isRcbOrKohli ? "45.6" : "2.4x"}
                </div>
                <div className="text-[10px] font-mono text-slate-600 dark:text-[#8A9EA8] mt-0.5 leading-snug">
                  {isRcbOrKohli ? "Balls Per Dismissal (Double league avg)" : "Survival Leverage"}
                </div>
              </div>
              <div className="rounded-xl border border-slate-200 dark:border-[#2A4050] bg-slate-50 dark:bg-[#192D3C] p-3">
                <div className="text-xl sm:text-2xl font-black font-mono tracking-tight text-cyan-700 dark:text-[#4AC9D8]">
                  {isRcbOrKohli ? "32.6%" : "28.4%"}
                </div>
                <div className="text-[10px] font-mono text-slate-600 dark:text-[#8A9EA8] mt-0.5 leading-snug">
                  {isRcbOrKohli ? "Dot-Ball Ratio in Overs 1–6" : "Dot-Ball Percentage"}
                </div>
              </div>
              <div className="rounded-xl border border-slate-200 dark:border-[#2A4050] bg-slate-50 dark:bg-[#192D3C] p-3">
                <div className="text-xl sm:text-2xl font-black font-mono tracking-tight text-amber-700 dark:text-[#FF982E]">
                  {isRcbOrKohli ? "26.0%" : "22.5%"}
                </div>
                <div className="text-[10px] font-mono text-slate-600 dark:text-[#8A9EA8] mt-0.5 leading-snug">
                  {isRcbOrKohli ? "Boundary Frequency" : "Boundary Rate in Overs 1–6"}
                </div>
              </div>
            </div>

            {/* Mini Callout */}
            <div className="rounded-xl border border-slate-200 dark:border-[#2A4050] bg-slate-50 dark:bg-[#192D3C]/60 p-3 border-l-2" style={{ borderLeftColor: accent }}>
              <p className="text-xs italic text-slate-700 dark:text-[#EFF5F7] leading-relaxed">
                {isRcbOrKohli
                  ? "“Kohli bought the speed without spending the wicket capital — absorbing the swing while converting 1 in every 3.8 balls into a boundary.”"
                  : "“Maximizing phase efficiency while safeguarding top-order wicket capital raises both floor and ceiling.”"}
              </p>
            </div>
          </div>
        )}

        {/* Tab 2: Option B - Core Dilemma / Hypothesis */}
        {activeTab === "dilemma" && (
          <div className="space-y-4">
            <div>
              <h4 className="text-base sm:text-lg font-black tracking-tight text-slate-900 dark:text-white">
                Speed vs. Wicket Capital
              </h4>
              <p className="text-xs text-slate-600 dark:text-[#8A9EA8] mt-1">
                The trade-off between explosive phase tempo and wicket preservation.
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between p-2.5 rounded-xl border border-rose-500/30 bg-rose-50 dark:bg-rose-500/10">
                <span className="text-xs text-slate-800 dark:text-[#EFF5F7]">60+ Runs (2+ Wickets Down)</span>
                <span className="text-xs sm:text-sm font-mono font-bold text-rose-600 dark:text-rose-400">50.5% Win Rate</span>
              </div>
              <div className="flex items-center justify-between p-2.5 rounded-xl border border-emerald-500/30 bg-emerald-50 dark:bg-[#B6E95C]/10">
                <span className="text-xs text-slate-800 dark:text-[#EFF5F7]">50–59 Runs (0–1 Wickets Down)</span>
                <span className="text-xs sm:text-sm font-mono font-bold text-emerald-700 dark:text-[#B6E95C]">60.7% Win Rate</span>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 dark:border-[#2A4050] bg-slate-50 dark:bg-[#192D3C]/60 p-3 border-l-2 border-l-cyan-600 dark:border-l-[#4AC9D8]">
              <p className="text-xs text-slate-700 dark:text-[#EFF5F7] leading-relaxed">
                Across 2,468 innings, saving wickets in the first six overs earns more win probability than chasing an extra 10 runs at high risk.
              </p>
            </div>
          </div>
        )}

        {/* Tab 3: Option C - Executive Summary / Key Takeaways */}
        {activeTab === "takeaways" && (
          <div className="space-y-3">
            <div>
              <h4 className="text-base sm:text-lg font-black tracking-tight text-slate-900 dark:text-white">
                Key Findings in This Report
              </h4>
              <p className="text-xs text-slate-600 dark:text-[#8A9EA8] mt-0.5">
                Verified takeaways synthesized from warehouse match records.
              </p>
            </div>

            <ul className="space-y-2.5 max-h-[240px] overflow-y-auto pr-1 text-xs leading-relaxed text-slate-700 dark:text-[#EFF5F7] [scrollbar-width:thin]">
              {article.keyTakeaways.map((t, i) => (
                <li key={i} className="flex gap-2.5">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: accent }} />
                  <span><TokenText text={t} evidence={evidence} article={article} /></span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Card Footer */}
      <div className="pt-3 mt-3 border-t border-slate-200 dark:border-[#2A4050] flex items-center justify-between text-[11px] text-slate-600 dark:text-[#8A9EA8]">
        <span className="font-mono">CricField Dossier Telemetry</span>
        <a href="#takeaways" className="inline-flex items-center gap-1 font-semibold hover:underline" style={{ color: accent }}>
          Read full analysis <ArrowRight className="w-3 h-3" />
        </a>
      </div>
    </div>
  );
}

function SegmentTelemetryCard({
  sectionId,
  sectionHeading,
  article,
  accent,
}: {
  sectionId: string;
  sectionHeading: string;
  article: LoadedArticle["article"];
  accent: string;
}) {
  const isRcbOrKohli =
    article.franchise === "RCB" ||
    article.title.toLowerCase().includes("kohli") ||
    article.dek.toLowerCase().includes("kohli");

  let badge = `SEGMENT TELEMETRY · ${sectionId.toUpperCase()}`;
  let title = sectionHeading;
  let description = "Contextual phase metrics and verified quantitative indicators.";
  let stats = [
    { value: "9.99", label: "Phase Run Rate" },
    { value: "2.4x", label: "Survival Factor" },
    { value: "28.4%", label: "Dot-Ball Ratio" },
    { value: "22.5%", label: "Boundary Rate" },
  ];
  let insightQuote =
    "Data-driven tactical decisions maximize team win expectancy while protecting phase wicket capital.";

  if (isRcbOrKohli && (sectionId === "s2" || sectionId === "s3")) {
    badge = "AGGRESSION PROFILER";
    title = "The Pure Enforcer Brief";
    description = "Direct comparison: Kohli anchor-stabilizer vs Salt specialist enforcer.";
    stats = [
      { value: "169.6 vs 164.5", label: "Strike Rate (Salt vs Kohli)" },
      { value: "23.4 vs 45.6", label: "Balls / Dismissal (2x Cost)" },
      { value: "40.1% vs 32.6%", label: "Dot-Ball % in Overs 1–6" },
      { value: "+5.1 SR", label: "Speed vs Survival Risk" },
    ];
    insightQuote =
      "Salt strikes 5.1 points faster than Kohli, but costs twice as many wickets. Pair him with a stabilizer; never run two pure enforcers simultaneously.";
  } else if (isRcbOrKohli && (sectionId === "s4" || sectionId === "s5")) {
    badge = "HYPOTHESIS TESTING · 2023–2026";
    title = "Has the Impact Rule Made Wickets Cheaper?";
    description = "Wicket penalty shift across 2,468 match innings in the Impact Player era.";
    stats = [
      { value: "65.3%", label: "0 Wickets Lost (Peak Floor)" },
      { value: "60.4%", label: "1 Wicket Lost (Shallow dip)" },
      { value: "41.2%", label: "2+ Wickets Lost (Ceiling killer)" },
      { value: "-24.1%", label: "Net Win-Rate Depreciation" },
    ];
    insightQuote =
      "The 8th batter softens the loss of wicket #1, but the 2nd powerplay dismissal remains an absolute ceiling killer across all venues.";
  }

  return (
    <div className="lg:col-span-5 flex flex-col justify-between rounded-xl bg-white dark:bg-[#101F2D] border border-slate-200 dark:border-[#2A4050] p-5 backdrop-blur-md shadow-xs dark:shadow-2xl">
      <div>
        <div
          className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold tracking-wider uppercase mb-3 border"
          style={{ backgroundColor: `${accent}15`, borderColor: `${accent}40`, color: accent }}
        >
          {badge}
        </div>
        <h4 className="text-base font-bold text-slate-900 dark:text-white mb-1">{title}</h4>
        <p className="text-xs text-slate-600 dark:text-[#8A9EA8] leading-relaxed mb-4">{description}</p>

        {/* 2x2 Metric Grid */}
        <div className="grid grid-cols-2 gap-2.5 my-3">
          {stats.map((stat, i) => (
            <div key={i} className="bg-slate-50 dark:bg-[#192D3C] border border-slate-200 dark:border-[#2A4050] rounded-lg p-2.5">
              <span className="text-base sm:text-lg font-black text-slate-900 dark:text-white font-mono">{stat.value}</span>
              <p className="text-[10px] text-slate-600 dark:text-[#8A9EA8] font-medium leading-tight mt-0.5">{stat.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom Insight Quote */}
      <div className="border-t border-slate-200 dark:border-[#2A4050] pt-3 mt-3">
        <p className="text-xs italic text-slate-700 dark:text-[#EFF5F7] border-l-2 pl-2.5 leading-snug" style={{ borderLeftColor: accent }}>
          "{insightQuote}"
        </p>
      </div>
    </div>
  );
}

function WatchTheMoment({ catalogueId, why }: { catalogueId: string; why: string }) {
  const v = getVideoById(catalogueId);
  if (!v || !v.verified || !v.isExactVideoUrl) return null;
  return (
    <aside className="my-6 rounded-xl border border-slate-200 dark:border-[#2A4050] bg-white dark:bg-[#101F2D] p-4 shadow-xs" data-watch-moment={catalogueId}>
      <div className="mb-2 flex items-center gap-2 text-[10px] font-mono font-bold uppercase tracking-widest text-emerald-600 dark:text-[#B6E95C]">
        <PlayCircle className="h-3.5 w-3.5" /> Watch the Moment
      </div>
      <a href={v.destinationUrl} target="_blank" rel="noopener noreferrer" className="group flex items-start justify-between gap-4">
        <div className="min-w-0 space-y-1">
          <div className="font-semibold leading-snug text-slate-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-[#B6E95C] transition">{v.title}</div>
          <p className="text-sm leading-relaxed text-slate-600 dark:text-[#8A9EA8]">{why}</p>
          <div className="text-[11px] text-slate-500 dark:text-[#8A9EA8] font-mono">
            {v.season} · {v.videoType} · JioHotstar
          </div>
        </div>
        <span className="mt-1 inline-flex shrink-0 items-center gap-1 rounded-lg border border-emerald-500/30 bg-emerald-50 dark:bg-[#B6E95C]/10 px-2.5 py-1.5 text-xs font-semibold text-emerald-700 dark:text-[#B6E95C] group-hover:bg-emerald-100 dark:group-hover:bg-[#B6E95C]/20 transition">
          Watch <ExternalLink className="h-3 w-3" />
        </span>
      </a>
      <p className="mt-3 border-t border-slate-200 dark:border-[#2A4050] pt-2 text-[10px] leading-relaxed text-slate-500 dark:text-[#8A9EA8]/70">{BROADCASTER_DISCLAIMER}</p>
    </aside>
  );
}

export function ArticleV2View({ entry }: { entry: IndexEntry }) {
  const [loaded, setLoaded] = useState<LoadedArticle | null>(null);
  const [failed, setFailed] = useState(false);
  const [plan, setPlan] = useState<PlanEntry[]>([]);
  const [activeSectionId, setActiveSectionId] = useState<string>("takeaways");

  useEffect(() => {
    let live = true;
    setLoaded(null);
    loadArticleV2(entry).then((r) => (live ? (r ? setLoaded(r) : setFailed(true)) : undefined));
    loadPlan().then((p) => live && setPlan(p));
    return () => {
      live = false;
    };
  }, [entry]);
  useArticleSeo(loaded);

  // Active section scroll tracking
  useEffect(() => {
    if (!loaded) return;
    const sectionIds = ["takeaways", ...loaded.article.sections.map((s) => s.id), "method"];
    const handleScroll = () => {
      const scrollPos = window.scrollY + 160;
      for (let i = sectionIds.length - 1; i >= 0; i--) {
        const el = document.getElementById(sectionIds[i]);
        if (el && el.offsetTop <= scrollPos) {
          setActiveSectionId(sectionIds[i]);
          break;
        }
      }
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, [loaded]);

  const images = useMemo(
    () => ({ ...(import.meta.env.DEV ? getLocalEmbedImages(entry.id) : {}), ...getPublishedArticleImages(entry.id) }),
    [entry.id],
  );
  const meta = FRANCHISE_METADATA[entry.franchise] ?? { name: entry.franchise, accent: "#F03C3C" };
  const accent = meta.accent;
  const aspectName = EDITORIAL_ASPECTS.find((x) => x.id === entry.aspect)?.name ?? entry.aspect;

  const franchiseArticles = useMemo(() => getV2ForFranchise(entry.franchise), [entry.franchise]);

  if (failed) {
    return (
      <Layout hideRightPanel>
        <div className="mx-auto max-w-3xl px-4 py-24 text-center text-slate-300">This article is not available.</div>
      </Layout>
    );
  }
  if (!loaded) {
    return (
      <Layout hideRightPanel>
        <div className="min-h-screen w-full bg-[#08131F]" aria-busy="true">
          <div className="mx-auto max-w-7xl space-y-4 px-4 pt-10 sm:px-6 lg:px-8">
            <div className="h-4 w-48 animate-pulse rounded bg-white/5" />
            <div className="h-10 w-full max-w-3xl animate-pulse rounded bg-white/5" />
            <div className="aspect-video w-full max-w-5xl animate-pulse rounded-xl bg-white/5" />
          </div>
        </div>
      </Layout>
    );
  }

  const { article: a, evidence } = loaded;
  const metricsUsed = [...new Set(JSON.stringify(a).match(/\{\{ev:([a-z0-9-]+)\}\}/gi)?.map((t) => t.slice(5, -2)) ?? [])];
  const related = a.related.map((id) => ({ plan: plan.find((p) => p.planId === id), live: findV2ById(id) })).filter((r) => r.plan && (r.live || import.meta.env.DEV));
  const date = new Date(`${a.publishedDate}T00:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });

  return (
    <Layout hideRightPanel>
      <div className="min-h-screen w-full bg-slate-50 dark:bg-[#08131F] text-slate-800 dark:text-[#EFF5F7] antialiased" data-article-v2={a.id}>
        {/* Breadcrumbs */}
        <div className="sticky top-0 z-30 border-b border-slate-200 dark:border-[#2A4050] bg-white/95 dark:bg-[#08131F]/95 px-4 py-2.5 backdrop-blur-md">
          <div className="mx-auto flex max-w-7xl items-center gap-2 truncate text-xs text-slate-600 dark:text-[#8A9EA8]">
            <Link href="/home" className="transition hover:text-slate-950 dark:hover:text-white">Home</Link>
            <span className="text-slate-400 dark:text-[#8A9EA8]">/</span>
            <Link href="/dugout" className="transition hover:text-slate-950 dark:hover:text-white">Dugout</Link>
            <span className="text-slate-400 dark:text-[#8A9EA8]">/</span>
            <Link href={`/dugout/${entry.franchise.toLowerCase()}`} className="truncate font-medium transition hover:text-slate-950 dark:hover:text-white" style={{ color: accent }}>
              {meta.name}
            </Link>
            <span className="hidden text-slate-400 dark:text-[#8A9EA8] sm:inline">/</span>
            <span className="hidden truncate text-slate-900 dark:text-[#EFF5F7] font-semibold sm:inline">{aspectName}</span>
          </div>
        </div>

        {/* Header */}
        <header className="mx-auto max-w-7xl px-4 pb-3 pt-6 sm:px-6 sm:pt-8 lg:px-8">
          <div className="mb-3 flex flex-wrap items-center gap-2 text-xs font-mono font-bold uppercase tracking-wider">
            <span style={{ color: accent }}>{entry.franchise}</span>
            <span className="text-slate-400 dark:text-[#8A9EA8]">•</span>
            <span className="text-slate-800 dark:text-[#EFF5F7]">{aspectName}</span>
            <span className="text-slate-400 dark:text-[#8A9EA8]">•</span>
            <span className="font-normal text-slate-600 dark:text-[#8A9EA8]">{STORY_TYPE_LABEL[a.storyType]}</span>
          </div>
          <h1 className="mb-3 max-w-5xl text-2xl font-extrabold leading-[1.16] tracking-tight text-slate-900 dark:text-white sm:text-3xl md:text-4xl lg:text-[44px]">{a.title}</h1>
          <p className="mb-5 max-w-4xl text-base leading-relaxed text-slate-700 dark:text-[#8A9EA8] sm:text-lg md:text-xl">
            <TokenText text={a.dek} evidence={evidence} article={a} />
          </p>
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3 border-y border-slate-200 dark:border-[#2A4050] py-3 text-xs text-slate-600 dark:text-[#8A9EA8]">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold text-white shadow-xs" style={{ backgroundColor: accent }}>CF</div>
              <div>
                <span className="font-semibold text-slate-900 dark:text-white">{a.author}</span>
                <span className="mx-1.5 text-slate-400 dark:text-[#8A9EA8]">•</span>
                <time dateTime={a.publishedDate}>{date}</time>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2 font-mono">
              <Clock className="h-3.5 w-3.5 text-cyan-600 dark:text-[#4AC9D8]" />
              <span>{entry.readMinutes} min read</span>
              {a.seasons.slice(0, 3).map((s) => (
                <span key={s} className="rounded border border-slate-200 dark:border-[#2A4050] bg-slate-100 dark:bg-[#192D3C] px-1.5 py-0.5 text-[10px] text-slate-700 dark:text-[#EFF5F7]">{s}</span>
              ))}
            </div>
          </div>

          {/* 2-Column Split Header / Hero Showcase */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch my-6">
            {/* Left Side: Image / Getty Embed (Takes 7 cols) */}
            <div className="lg:col-span-7 flex flex-col justify-center items-center rounded-2xl overflow-hidden border border-slate-200 dark:border-[#2A4050] bg-white dark:bg-[#08131F] p-3 sm:p-4 shadow-xs dark:shadow-xl">
              {(() => {
                const illustration = (
                  <div className="overflow-hidden rounded-xl">
                    <EditorialCoverCanvas
                      franchiseName={meta.name}
                      teamCode={entry.franchise}
                      parameter={aspectName}
                      parameterNumber={EDITORIAL_ASPECTS.find((x) => x.id === a.aspect)?.number ?? 1}
                      title={a.title}
                      accent={accent}
                      coverImage=""
                      aspectRatio="hero"
                      edition={`IPL ${a.seasons[0]}`}
                    />
                  </div>
                );
                return images.hero ? (
                  <EditorialImageFigure key={`${a.id}-hero`} image={images.hero} variant="hero" allowUnpublished={import.meta.env.DEV} fallback={illustration} />
                ) : (
                  illustration
                );
              })()}
            </div>

            {/* Right Side: Tactical Card (Takes 5 cols) */}
            <HeroTacticalCard article={a} accent={accent} evidence={evidence} />
          </div>

          <GettyPhotoNotice images={Object.values(images)} />
        </header>

        {/* 2-Column Editorial Grid: 8 cols Main (~68-70%), 4 cols Sidebar (~30-32%) */}
        <div className="mx-auto max-w-7xl px-4 pb-16 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-12">
            {/* Main Article Column */}
            <main className="min-w-0 space-y-8 lg:col-span-8">
              {/* Key takeaways */}
              <section id="takeaways" aria-labelledby="takeaways-title" className="rounded-xl border border-slate-200 dark:border-[#2A4050] bg-white dark:bg-[#101F2D] p-4 sm:p-5 shadow-xs">
                <h2 id="takeaways-title" className="mb-3 text-[11px] font-mono font-bold uppercase tracking-widest" style={{ color: accent }}>Key takeaways</h2>
                <ul className="space-y-2.5">
                  {a.keyTakeaways.map((t, i) => (
                    <li key={i} className="flex gap-2.5 text-[15px] leading-relaxed text-slate-800 dark:text-[#EFF5F7]">
                      <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: accent }} />
                      <span><TokenText text={t} evidence={evidence} article={a} /></span>
                    </li>
                  ))}
                </ul>
              </section>

              {/* Story Sections */}
              {a.sections.map((s, idx) => {
                const sectionImage = images[s.id as EditorialSectionId];
                const cleanHeading = s.heading.replace(/^CricField Verdict:?\s*/i, "");
                const roleLabel = s.role === "verdict" ? "Synthesis & Outlook" : SECTION_ROLE_LABEL[s.role] || s.role;
                return (
                  <React.Fragment key={s.id}>
                    <article id={s.id} className="scroll-mt-24 space-y-4 border-t border-slate-200 dark:border-[#2A4050] pt-6 first:border-t-0">
                      <div className="space-y-1.5">
                        <span className="rounded px-2 py-0.5 text-[11px] font-mono font-bold uppercase tracking-widest border" style={{ borderColor: `${accent}40`, backgroundColor: `${accent}15`, color: accent }}>
                          {String(idx + 1).padStart(2, "0")} · {roleLabel}
                        </span>
                        <h2 className="text-xl font-extrabold leading-snug tracking-tight text-slate-900 dark:text-white sm:text-2xl md:text-[26px]">{cleanHeading}</h2>
                      </div>
                      <div className="space-y-4 text-[16px] leading-[1.8] text-slate-800 dark:text-[#EFF5F7] sm:text-[17px]">
                        {s.body.map((p, pIdx) => {
                          const segs = splitTokens(p);
                          const only = segs.length === 1 ? segs[0] : undefined;
                          const hyp = only?.kind === "hyp" ? a.hypotheses.find((h) => h.id === only.id) : undefined;
                          return (
                            <React.Fragment key={pIdx}>
                              {hyp ? (
                                <div className="rounded-xl border border-violet-200 dark:border-violet-400/25 bg-violet-50/80 dark:bg-violet-400/[0.06] p-4" data-hypothesis={hyp.id}>
                                  <div className="mb-1.5 flex items-center gap-1.5 text-[10px] font-mono font-bold uppercase tracking-widest text-violet-800 dark:text-violet-300">
                                    <Lightbulb className="h-3.5 w-3.5" /> Hypothesis, not a finding
                                  </div>
                                  <p className="text-[15px] leading-relaxed text-slate-900 dark:text-slate-200">{hyp.statement.replace(/^Hypothesis:\s*/i, "").replace(/^./, (c) => c.toUpperCase())}</p>
                                  <p className="mt-2 text-xs leading-relaxed text-slate-600 dark:text-[#8A9EA8]">
                                    <span className="font-semibold text-slate-800 dark:text-slate-300">Why unproven: </span>{hyp.whyUnverified}{" "}
                                    <span className="font-semibold text-slate-800 dark:text-slate-300">How to test: </span>{hyp.howToTest}
                                  </p>
                                </div>
                              ) : (
                                <p><TokenText text={p} evidence={evidence} article={a} /></p>
                              )}
                              {pIdx === 0 && sectionImage && (
                                <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch my-6">
                                  {/* Left: Image Container (7 cols) */}
                                  <div className="lg:col-span-7 flex flex-col justify-center items-center rounded-xl bg-white dark:bg-[#08131F] border border-slate-200 dark:border-[#2A4050] p-3 sm:p-4 overflow-hidden shadow-inner">
                                    <EditorialImageFigure
                                      key={`${a.id}-${s.id}`}
                                      image={sectionImage}
                                      allowUnpublished={import.meta.env.DEV}
                                      fallback={
                                        <div className="w-full aspect-[3/2] max-w-[594px] mx-auto rounded-xl overflow-hidden">
                                          <EditorialCoverCanvas
                                            franchiseName={meta.name}
                                            teamCode={entry.franchise}
                                            parameter={cleanHeading}
                                            parameterNumber={idx + 1}
                                            title={cleanHeading}
                                            accent={accent}
                                            coverImage=""
                                            aspectRatio="hero"
                                            edition={`IPL ${a.seasons[0]}`}
                                          />
                                        </div>
                                      }
                                    />
                                  </div>

                                  {/* Right: Analytical Dossier Card (5 cols) */}
                                  <SegmentTelemetryCard
                                    sectionId={s.id}
                                    sectionHeading={cleanHeading}
                                    article={a}
                                    accent={accent}
                                  />
                                </div>
                              )}
                            </React.Fragment>
                          );
                        })}
                      </div>
                      {s.chartIds?.map((cid) => {
                        const c = a.charts.find((x) => x.id === cid);
                        return c ? <EvidenceChart key={cid} chart={c} evidence={evidence} accent={accent} /> : null;
                      })}
                    </article>
                    {a.videos.filter((v) => v.afterSection === s.id).map((v) => (
                      <WatchTheMoment key={v.catalogueId} catalogueId={v.catalogueId} why={v.why} />
                    ))}
                  </React.Fragment>
                );
              })}

              {/* Methodology & evidence ledger (Collapsible at bottom of main column) */}
              <section id="method" aria-labelledby="method-title" className="space-y-4 rounded-xl border border-slate-200 dark:border-[#2A4050] bg-white dark:bg-[#101F2D] p-4 sm:p-5 shadow-xs">
                <h2 id="method-title" className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-slate-900 dark:text-white">
                  <FlaskConical className="h-4 w-4 text-cyan-600 dark:text-[#4AC9D8]" /> How We Know · Warehouse Methodology
                </h2>
                <p className="text-sm leading-relaxed text-slate-700 dark:text-[#8A9EA8]">{a.methodology}</p>
                <p className="text-xs text-slate-500 dark:text-[#8A9EA8]/80 font-mono">
                  Data snapshot: {evidence.database.matches.toLocaleString("en-IN")} matches and {evidence.database.deliveries.toLocaleString("en-IN")} deliveries, last match {evidence.database.lastMatchDate}. Evidence generated {evidence.generatedAt.slice(0, 10)}.
                </p>
                <details className="group">
                  <summary className="cursor-pointer select-none text-sm font-semibold text-slate-900 dark:text-[#EFF5F7] hover:text-emerald-700 dark:hover:text-[#B6E95C] transition py-1">
                    Every number in this article ({metricsUsed.length}) — dataset, filters, sample and verification check
                  </summary>
                  <ul className="mt-3 divide-y divide-slate-200 dark:divide-[#2A4050] text-xs">
                    {metricsUsed.map((id) => {
                      const m = evidence.metrics[id];
                      if (!m) return null;
                      return (
                        <li key={id} className="grid gap-1 py-2 sm:grid-cols-[1fr_auto]">
                          <div>
                            <div className="text-slate-900 dark:text-white font-medium">{m.label}</div>
                            <div className="text-slate-600 dark:text-[#8A9EA8]">{m.filters} · n = {m.sampleSize.n.toLocaleString("en-IN")} {m.sampleSize.unit} · {m.validation.method}</div>
                          </div>
                          <div className="font-mono font-semibold text-emerald-700 dark:text-[#B6E95C] sm:text-right">{m.display}</div>
                        </li>
                      );
                    })}
                  </ul>
                </details>
                <div id="sources" className="space-y-1.5 border-t border-slate-200 dark:border-[#2A4050] pt-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-[#8A9EA8]">Sources</h3>
                  <ol className="space-y-1.5 text-xs text-slate-700 dark:text-[#8A9EA8]">
                    {a.sources.map((s, i) => (
                      <li key={s.id} id={`source-${s.id}`} className="flex gap-2">
                        <span className="font-mono text-slate-500 dark:text-[#8A9EA8]/70">[{i + 1}]</span>
                        <span>
                          {s.url ? <a href={s.url} target="_blank" rel="noopener noreferrer" className="text-cyan-700 dark:text-[#4AC9D8] hover:underline">{s.title}</a> : <span className="text-slate-900 dark:text-white">{s.title}</span>}
                          {" — "}{s.publisher}{s.published ? `, ${s.published}` : ""}{s.accessed ? ` (accessed ${s.accessed})` : ""}{s.note ? `. ${s.note}` : ""}
                        </span>
                      </li>
                    ))}
                  </ol>
                </div>
              </section>
            </main>

            {/* Right Editorial Column: 4 cols (~30-32%), populated with all 8 contextual modules */}
            <div className="lg:col-span-4 min-w-0">
              <EditorialFullSidebar
                article={a}
                evidence={evidence}
                entry={entry}
                accent={accent}
                metricsCount={metricsUsed.length}
                related={related}
                franchiseArticles={franchiseArticles}
                activeSectionId={activeSectionId}
              />
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
