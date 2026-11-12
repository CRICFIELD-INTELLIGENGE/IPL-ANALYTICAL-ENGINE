// Franchise Library: the 100-title plan for one franchise, organised by the ten editorial aspects
// and paginated (never all 100 at once). Shows live v2 articles and legacy Dugout articles; planned
// titles are listed only on localhost, for the editorial team.
import { useEffect, useMemo, useState } from "react";
import { Link } from "wouter";
import { ArrowRight, ChevronLeft, ChevronRight, Library, Search, Sparkles } from "lucide-react";
import { getArticlesForFranchise, type EditorialArticle } from "@/data/editorial-magazine-data";
import legacyDecisions from "@/data/editorial/plan/legacy-decisions.json";
import { EDITORIAL_ASPECTS, type EditorialAspectId, type IndexEntry, type PlanEntry } from "@/data/editorial/schema";
import { STORY_TYPE_LABEL, getV2ForFranchise, loadPlan } from "@/lib/editorial-v2";
import { getArticleHeroImage } from "@/lib/editorial-images";
import { EditorialCardMedia } from "./editorial-image-figure";
import { EditorialCoverCanvas } from "./editorial-cover-canvas";

const PAGE_SIZE = 9;
const GLASS = "border border-white/[0.08] bg-[rgba(18,24,38,0.7)] backdrop-blur-xl";

function isLightHex(hex: string): boolean {
  const clean = (hex || "").replace("#", "");
  if (clean.length < 6) return false;
  const r = parseInt(clean.substring(0, 2), 16) || 0;
  const g = parseInt(clean.substring(2, 4), 16) || 0;
  const b = parseInt(clean.substring(4, 6), 16) || 0;
  const yiq = (r * 299 + g * 587 + b * 114) / 1000;
  return yiq >= 150;
}

// Legacy parameters → nearest aspect, used only for legacy articles with no reviewed plan slot.
const PARAM_ASPECT: Record<string, EditorialAspectId> = {
  "Franchise DNA": "history",
  "Batting Intelligence": "batting",
  "Bowling Intelligence": "bowling-fielding",
  "Player Psychology": "tactical",
  "Venue Intelligence": "tactical",
  "Auction Economics": "auction-economics",
  "Tactical Intelligence": "tactical",
  "Historical Evolution": "history",
  "Hidden Statistical Stories": "data-science",
  "Future Intelligence": "future",
};

export type FranchiseArticleItem = {
  key: string;
  title: string;
  dek: string;
  aspect: EditorialAspectId;
  kind: "live" | "legacy" | "planned";
  href?: string;
  imageId?: string;
  storyType?: string;
  meta?: string;
  number?: number;
};
type Item = FranchiseArticleItem;

/**
 * Every readable article for one franchise — evidence-led v2 stories plus legacy Dugout articles not
 * superseded by a revision — ordered live first, then by plan number. Shared by the Dugout library and
 * the Intelligence hub so both list the same articles. Planned titles are added only when asked (localhost).
 */
export function useFranchiseArticles(code: string, showPlanned = false) {
  const [plan, setPlan] = useState<PlanEntry[] | null>(null);
  useEffect(() => {
    let live = true;
    loadPlan().then((p) => live && setPlan(p));
    return () => {
      live = false;
    };
  }, []);

  const v2 = useMemo(() => getV2ForFranchise(code), [code]);
  const items = useMemo<Item[]>(() => {
    const own = (plan ?? []).filter((p) => p.franchise === code.toUpperCase());
    const byPlan = new Map<string, IndexEntry>(v2.map((e) => [e.id, e]));
    const out: Item[] = [];
    for (const e of v2) {
      out.push({ key: e.id, title: e.title, dek: e.dek, aspect: e.aspect, kind: "live", href: `/dugout/articles/${e.slug}`, imageId: e.id, storyType: e.storyType, meta: `${e.readMinutes} min read`, number: own.find((p) => p.planId === e.id)?.franchiseNumber });
    }
    const supersededSlugs = new Set(v2.map((e) => e.supersedes).filter(Boolean));
    for (const art of getArticlesForFranchise(code) as EditorialArticle[]) {
      if (supersededSlugs.has(art.slug)) continue;
      const d = legacyDecisions.decisions.find((x) => x.legacyId === art.id && x.reviewed && x.planId);
      const slot = d?.planId ? own.find((p) => p.planId === d.planId) : undefined;
      out.push({ key: art.id, title: art.title, dek: art.subtitle, aspect: slot?.aspect ?? PARAM_ASPECT[art.parameter] ?? "history", kind: "legacy", href: `/dugout/articles/${art.slug}`, imageId: art.id, storyType: "archive", meta: art.readTime, number: slot?.franchiseNumber });
    }
    if (import.meta.env.DEV && showPlanned) {
      const taken = new Set([...byPlan.keys(), ...legacyDecisions.decisions.filter((d) => d.reviewed && d.planId).map((d) => d.planId!)]);
      for (const p of own) if (!taken.has(p.planId)) out.push({ key: p.planId, title: p.title, dek: "", aspect: p.aspect, kind: "planned", number: p.franchiseNumber });
    }
    const rank = { live: 0, legacy: 1, planned: 2 };
    return out.sort((a, b) => rank[a.kind] - rank[b.kind] || (a.number ?? 999) - (b.number ?? 999));
  }, [plan, v2, code, showPlanned]);

  const featured = v2.find((e) => e.featured && e.storyType === "investigation") ?? v2[0];
  return { items, v2, featured };
}

/** `preview`: show only that many stories (featured first) and link to the Intelligence hub for the rest. */
export function FranchiseLibrary({ code, teamName, accent, preview }: { code: string; teamName: string; accent: string; preview?: number }) {
  const [aspect, setAspect] = useState<EditorialAspectId | "all">("all");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(0);
  const [showPlanned, setShowPlanned] = useState(false);
  useEffect(() => setPage(0), [code, aspect, query, showPlanned]);
  const { items, v2, featured } = useFranchiseArticles(code, showPlanned);

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: items.length };
    for (const i of items) c[i.aspect] = (c[i.aspect] ?? 0) + 1;
    return c;
  }, [items]);

  const showFeatured = Boolean(featured) && aspect === "all" && !query.trim();
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter(
      (i) =>
        (aspect === "all" || i.aspect === aspect) &&
        (!q || i.title.toLowerCase().includes(q) || i.dek.toLowerCase().includes(q)) &&
        !(showFeatured && i.key === featured?.id), // the featured story is shown above the grid
    );
  }, [items, aspect, query, showFeatured, featured]);
  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const visible = filtered.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);
  const liveCount = items.filter((i) => i.kind === "live").length;
  const readable = items.filter((i) => i.kind !== "planned");
  const previewItems = preview ? readable.filter((i) => !(showFeatured && i.key === featured?.id)).slice(0, showFeatured ? preview - 1 : preview) : [];
  const gridItems = preview ? previewItems : visible;

  if (!v2.length && !items.length) return null;

  return (
    <section id="library" className="relative scroll-mt-24 space-y-5 overflow-hidden rounded-3xl border border-white/10 bg-[#070C15] p-4 text-slate-100 shadow-2xl sm:p-6 lg:p-7" aria-labelledby="library-title">
      <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full opacity-10 blur-3xl" style={{ backgroundColor: accent }} />

      <div className="relative flex flex-col justify-between gap-3 border-b border-white/10 pb-3 md:flex-row md:items-end">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-widest" style={{ color: accent }}>
            <Library className="h-3.5 w-3.5" />
            <span>CricField Franchise Library</span>
            <span className="text-white/30">•</span>
            <span className="font-bold text-slate-400">
              {liveCount ? `${liveCount} new evidence-led ${liveCount === 1 ? "story" : "stories"}` : `${items.length} ${items.length === 1 ? "story" : "stories"}`}
            </span>
          </div>
          <h3 id="library-title" className="flex items-center gap-2 text-xl font-black tracking-tight text-white sm:text-2xl">
            <span style={{ color: accent }}>›</span> {teamName} <span className="text-base font-light text-slate-400 sm:text-lg">Library</span>
          </h3>
        </div>
        {preview ? (
          <Link href={`/intelligence?franchise=${code.toLowerCase()}`} onClick={() => window.scrollTo({ top: 0, behavior: "instant" })} className="inline-flex w-fit items-center gap-1.5 text-xs font-semibold hover:opacity-85 transition-opacity" style={{ color: accent }}>
            All {readable.length} articles <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        ) : (
          <div className="relative w-full md:w-64">
            <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search the library…" aria-label="Search the library" className="w-full rounded-xl border border-white/10 bg-white/[0.04] py-1.5 pl-8 pr-3 text-xs text-white placeholder:text-slate-500 focus:border-white/30 focus:outline-none" />
          </div>
        )}
      </div>

      {/* Featured investigation */}
      {featured && showFeatured && page === 0 && (
        <Link href={`/dugout/articles/${featured.slug}`} className={`group relative grid grid-cols-1 gap-5 overflow-hidden rounded-2xl p-4 transition-colors hover:border-white/20 sm:p-5 lg:grid-cols-12 ${GLASS}`}>
          <div className="overflow-hidden rounded-xl lg:col-span-7">
            <LibraryMedia imageId={featured.id} title={featured.title} accent={accent} code={code} teamName={teamName} aspect={featured.aspect} />
          </div>
          <div className="flex flex-col justify-center gap-3 lg:col-span-5">
            <span className="flex items-center gap-1.5 text-[10px] font-mono font-bold uppercase tracking-widest" style={{ color: accent }}>
              <Sparkles className="h-3.5 w-3.5" /> {STORY_TYPE_LABEL[featured.storyType] ?? "Featured"}
            </span>
            <h4 className="text-xl font-extrabold leading-snug text-white sm:text-2xl">{featured.title}</h4>
            <p className="text-sm leading-relaxed text-slate-400 line-clamp-4">{featured.dek}</p>
            {featured.headlineStat && (
              <span className="w-fit rounded-full border border-white/[0.08] bg-white/[0.03] px-2.5 py-1 text-[11px] font-mono text-slate-400">
                {featured.headlineStat.label}: <span className="text-slate-100">{featured.headlineStat.display}</span>
              </span>
            )}
            <span className="inline-flex items-center gap-1 text-sm font-semibold" style={{ color: accent }}>
              Read the investigation <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </span>
          </div>
        </Link>
      )}

      {/* Aspect tabs */}
      {!preview && <div role="tablist" aria-label="Editorial aspects" className="relative flex gap-1.5 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {[{ id: "all" as const, name: "All aspects" }, ...EDITORIAL_ASPECTS].map((a) => {
          const active = aspect === a.id;
          const n = counts[a.id] ?? 0;
          return (
            <button
              key={a.id}
              role="tab"
              aria-selected={active}
              onClick={() => setAspect(a.id)}
              className={`shrink-0 whitespace-nowrap rounded-xl border px-3 py-1 text-[11px] font-bold transition-all ${
                active 
                  ? "border-white/20 bg-white/10 text-white shadow-sm" 
                  : "border-white/5 bg-white/[0.03] text-slate-400 hover:border-white/15 hover:text-white"
              }`}
              style={active ? { borderColor: `${accent}80`, color: accent } : undefined}
            >
              {a.name} <span className="ml-1 font-mono text-[10px] opacity-70">{n}</span>
            </button>
          );
        })}
      </div>}

      {import.meta.env.DEV && !preview && (
        <label className="relative flex w-fit cursor-pointer items-center gap-2 text-[11px] text-slate-400">
          <input type="checkbox" checked={showPlanned} onChange={(e) => setShowPlanned(e.target.checked)} className="accent-amber-400" />
          Show planned titles (editorial view, localhost only)
        </label>
      )}

      {/* Grid */}
      {gridItems.length === 0 ? (
        !preview && <p className="rounded-2xl border border-dashed border-white/15 p-8 text-center text-xs text-slate-400">No stories in this aspect yet.</p>
      ) : (
        <div className="relative grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {gridItems.map((i) => (
            <LibraryCard key={i.key} item={i} accent={accent} code={code} teamName={teamName} />
          ))}
        </div>
      )}

      {/* Preview: the rest of the franchise's articles live on the Intelligence hub */}
      {preview && readable.length > gridItems.length + (showFeatured ? 1 : 0) && (
        <div className="relative flex flex-col sm:flex-row items-center justify-between gap-4 rounded-2xl border border-white/10 bg-gradient-to-r from-white/[0.04] via-white/[0.02] to-white/[0.04] p-5 text-center sm:text-left mt-3">
          <div className="space-y-1">
            <p className="text-xs font-semibold text-slate-200">
              Showing <span className="font-bold text-white">{gridItems.length + (showFeatured ? 1 : 0)}</span> of <span className="font-bold text-white">{readable.length}</span> {teamName} articles.
            </p>
            <p className="text-[11px] text-slate-400">
              Complete analytical dossiers, auction telemetry, and tactical breakdowns available on Intelligence.
            </p>
          </div>
          <Link
            href={`/intelligence?franchise=${code.toLowerCase()}`}
            onClick={() => window.scrollTo({ top: 0, behavior: "instant" })}
            className="inline-flex shrink-0 items-center gap-2 rounded-xl px-5 py-2.5 text-xs font-bold uppercase tracking-wider transition-all shadow-lg hover:brightness-110 active:scale-[0.98]"
            style={{
              backgroundColor: accent,
              color: isLightHex(accent) ? "#0A101D" : "#FFFFFF",
              boxShadow: `0 8px 24px -4px ${accent}40`,
            }}
          >
            View all {readable.length} articles on Intelligence <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      )}

      {/* Pagination */}
      {!preview && pages > 1 && (
        <nav className="relative flex items-center justify-between gap-3 border-t border-white/10 pt-4 text-xs" aria-label="Library pages">
          <span className="text-slate-500">
            {page * PAGE_SIZE + 1}–{Math.min(filtered.length, (page + 1) * PAGE_SIZE)} of {filtered.length}
          </span>
          <div className="flex items-center gap-1.5">
            <button onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0} aria-label="Previous page" className="rounded-lg border border-white/10 p-1.5 text-slate-300 hover:bg-white/5 disabled:opacity-30">
              <ChevronLeft className="h-4 w-4" />
            </button>
            {Array.from({ length: pages }, (_, n) => (
              <button 
                key={n} 
                onClick={() => setPage(n)} 
                aria-current={n === page ? "page" : undefined} 
                className={`h-7 min-w-7 rounded-lg px-2 font-mono transition-colors ${n === page ? "font-bold shadow-sm" : "text-slate-400 hover:bg-white/5"}`}
                style={n === page ? { backgroundColor: `${accent}25`, color: accent } : undefined}
              >
                {n + 1}
              </button>
            ))}
            <button onClick={() => setPage((p) => Math.min(pages - 1, p + 1))} disabled={page >= pages - 1} aria-label="Next page" className="rounded-lg border border-white/10 p-1.5 text-slate-300 hover:bg-white/5 disabled:opacity-30">
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </nav>
      )}
    </section>
  );
}

/** An article's header photo for a card (Getty embed or licensed file), with the CricField illustration as fallback. */
export function LibraryMedia({ imageId, title, accent, code, teamName, aspect, preserveAspectRatio = false }: { imageId?: string; title: string; accent: string; code: string; teamName: string; aspect: EditorialAspectId; preserveAspectRatio?: boolean }) {
  const hero = imageId ? getArticleHeroImage(imageId) : undefined;
  const a = EDITORIAL_ASPECTS.find((x) => x.id === aspect) ?? EDITORIAL_ASPECTS[0];
  const teamCover = code === "CSK" ? "/csk insight.jpg" : code === "RCB" ? "/virat-kohli.png" : code === "MI" ? "/rohit sharma.jpg" : "/TITLE BANNER.png";
  const illustration = (
    <div className="aspect-video w-full overflow-hidden [&>div]:rounded-none [&>div]:border-0">
      <EditorialCoverCanvas franchiseName={teamName} teamCode={code} parameter={a.name} parameterNumber={a.number} title={title} accent={accent} coverImage={teamCover} aspectRatio="video" edition="CricField Library" />
    </div>
  );
  // On card thumbnails, only use direct licensed images; never let brittle third-party embeds break cards
  if (hero && hero.licensedImageUrl) {
    return <EditorialCardMedia key={hero.assetId} image={hero} preserveAspectRatio={preserveAspectRatio} aspect="video" allowUnpublished={import.meta.env.DEV} fallback={illustration} />;
  }
  return illustration;
}

function LibraryCard({ item, accent, code, teamName }: { item: Item; accent: string; code: string; teamName: string }) {
  const aspectName = EDITORIAL_ASPECTS.find((x) => x.id === item.aspect)?.name;
  const badge = item.kind === "live" ? (STORY_TYPE_LABEL[item.storyType ?? ""] ?? "New") : item.kind === "legacy" ? "From the archive" : "Planned";
  const body = (
    <>
      <div className="flex items-center justify-between gap-2 px-4 pb-2.5 pt-3 text-[10px] font-mono uppercase tracking-wider">
        <span className="truncate font-bold" style={{ color: accent }}>{aspectName}</span>
        <span 
          className="shrink-0 rounded px-1.5 py-0.5 border text-[10px] font-mono uppercase"
          style={item.kind === "live" ? { backgroundColor: `${accent}15`, borderColor: `${accent}40`, color: accent } : { borderColor: "rgba(255,255,255,0.08)", color: "#94a3b8" }}
        >
          {badge}
        </span>
      </div>
      {item.kind !== "planned" && <LibraryMedia imageId={item.imageId} title={item.title} accent={accent} code={code} teamName={teamName} aspect={item.aspect} />}
      <div className="flex flex-1 flex-col gap-2 p-4">
        <h4 className="line-clamp-3 text-[15px] font-semibold leading-snug text-slate-100 group-hover:text-white">{item.title}</h4>
        {item.dek && <p className="line-clamp-2 text-sm leading-relaxed text-slate-400">{item.dek}</p>}
        <div className="mt-auto flex items-center justify-between pt-2 text-[11px]">
          <span className="font-mono text-slate-500">{item.number ? `No. ${item.number}` : ""}{item.meta ? `${item.number ? " · " : ""}${item.meta}` : ""}</span>
          {item.href && (
            <span className="inline-flex items-center gap-1 font-semibold" style={{ color: accent }}>
              Read <ArrowRight className="h-3 w-3" />
            </span>
          )}
        </div>
      </div>
    </>
  );
  const cls = `group flex h-full flex-col overflow-hidden rounded-xl transition-colors hover:border-white/20 ${GLASS} ${item.kind === "planned" ? "opacity-60" : ""}`;
  return item.href ? (
    <Link href={item.href} onClick={() => window.scrollTo({ top: 0, behavior: "instant" })} className={cls} data-library-item={item.key}>
      {body}
    </Link>
  ) : (
    <article className={cls} data-library-item={item.key}>{body}</article>
  );
}
