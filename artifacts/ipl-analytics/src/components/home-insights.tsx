// Home "Insights That Matter": the same article banners and photos the Intelligence hub shows.
// Loaded lazily from the home page because the article library pulls in the 1.7 MB editorial dataset.
import { Link } from "wouter";
import { ArrowRight } from "lucide-react";
import { FRANCHISE_METADATA } from "@/data/editorial-magazine-data";
import { LibraryMedia, useFranchiseArticles, type FranchiseArticleItem } from "@/components/dugout/franchise-library";
import { EDITORIAL_ASPECTS } from "@/data/editorial/schema";

// One lead story from each of four franchises when no team is picked, for variety.
const SPREAD = ["CSK", "MI", "RCB", "KKR"] as const;

export default function HomeInsights({ team, limit = 4 }: { team?: string | null; limit?: number }) {
  const own = useFranchiseArticles(team && FRANCHISE_METADATA[team] ? team : "CSK");
  const spread = [useFranchiseArticles(SPREAD[0]), useFranchiseArticles(SPREAD[1]), useFranchiseArticles(SPREAD[2]), useFranchiseArticles(SPREAD[3])];
  const readable = (items: FranchiseArticleItem[]) => items.filter((i) => i.kind !== "planned" && i.href);

  // Every franchise's library leads with the same story templates, so take a different topic (aspect) per card.
  const used = new Set<string>();
  const pick = (items: FranchiseArticleItem[]) => {
    const item = readable(items).find((i) => !used.has(i.aspect)) ?? readable(items).find((i) => !used.has(i.key));
    if (item) used.add(item.aspect).add(item.key);
    return item;
  };
  const ownItems = team && FRANCHISE_METADATA[team] ? own.items : [];
  const cards = ownItems.length
    ? [0, 1, 2, 3].map(() => pick(ownItems)).filter((i): i is FranchiseArticleItem => !!i).map((item) => ({ item, code: team! }))
    : SPREAD.map((code, i) => ({ item: pick(spread[i].items), code })).filter((c): c is { item: FranchiseArticleItem; code: (typeof SPREAD)[number] } => !!c.item);

  if (!cards.length) return <div className="col-span-full flex items-center justify-center text-[10px] text-white/40">Loading articles…</div>;

  // Single featured top-story lead layout (Home page Top Story hero card)
  if (limit === 1 && cards[0]) {
    const { item, code } = cards[0];
    const meta = FRANCHISE_METADATA[code];
    const aspect = EDITORIAL_ASPECTS.find((a) => a.id === item.aspect)?.name;
    return (
      <Link href={item.href!} className="home-lead-story h-full min-h-0 block group">
        <div className="bg-white dark:bg-[#081622] rounded-[16px] border border-slate-200 dark:border-[#19303c] overflow-hidden flex flex-col group-hover:border-primary/50 transition-all cursor-pointer min-w-0 shadow-lg dark:shadow-2xl h-full">
          {/* Cover Media */}
          <div className="home-story-media relative w-full aspect-[16/9] sm:aspect-[21/9] lg:aspect-[16/9] overflow-hidden bg-slate-950 dark:bg-[#06111a] shrink-0">
            <LibraryMedia
              imageId={item.imageId}
              title={item.title}
              accent={meta.accent}
              code={code}
              teamName={meta.name}
              aspect={item.aspect}
              preserveAspectRatio={false}
              isCoverStory={true}
            />
          </div>

          {/* Story Body & Editorial Enrichment */}
          <div className="flex-1 min-h-0 p-5 sm:p-6 flex flex-col justify-between border-t border-slate-100 dark:border-white/10 bg-slate-50/60 dark:bg-white/[0.02]">
            <div className="space-y-3">
              {/* Category & Badge Ribbon */}
              <div className="flex items-center gap-2 flex-wrap">
                <span
                  className="px-2.5 py-0.5 rounded-md text-[10px] font-mono font-bold uppercase tracking-wider border shadow-sm"
                  style={{
                    backgroundColor: `${meta.accent}15`,
                    color: meta.accent,
                    borderColor: `${meta.accent}35`,
                  }}
                >
                  {meta.name}
                </span>
                <span className="text-slate-300 dark:text-white/20 text-xs">•</span>
                <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider font-mono">
                  {aspect}
                </span>
                <span className="text-slate-300 dark:text-white/20 text-xs">•</span>
                <span className="text-[11px] font-mono text-emerald-600 dark:text-emerald-400 font-bold uppercase">
                  Featured Investigation
                </span>
              </div>

              {/* Title */}
              <h3 className="font-black text-lg sm:text-xl lg:text-2xl leading-tight text-slate-900 dark:text-white group-hover:text-primary transition-colors tracking-tight">
                {item.title}
              </h3>

              {/* Synopsis / Dek */}
              {item.dek && (
                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300/90 leading-relaxed line-clamp-3">
                  {item.dek}
                </p>
              )}
            </div>

            {/* Bottom Action Strip & Telemetry Footprint */}
            <div className="mt-5 pt-3.5 border-t border-slate-200/80 dark:border-white/10 flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-2.5 text-xs font-mono text-slate-500 dark:text-slate-400">
                <span className="font-semibold text-primary">{item.meta || "3 min read"}</span>
                <span className="text-slate-300 dark:text-white/20">•</span>
                <span>Ball-by-ball model</span>
                <span className="text-slate-300 dark:text-white/20 hidden sm:inline">•</span>
                <span className="hidden sm:inline">2008–2026 Archive</span>
              </div>

              <span className="inline-flex items-center gap-1.5 text-xs font-bold px-3.5 py-1.5 rounded-lg bg-primary/10 text-primary border border-primary/25 group-hover:bg-primary group-hover:text-slate-950 transition-all shadow-sm">
                Read Story
                <ArrowRight size={13} className="group-hover:translate-x-0.5 transition-transform" />
              </span>
            </div>
          </div>
        </div>
      </Link>
    );
  }

  return (
    <>
      {cards.slice(0, limit).map(({ item, code }) => {
        const meta = FRANCHISE_METADATA[code];
        const aspect = EDITORIAL_ASPECTS.find((a) => a.id === item.aspect)?.name;
        return (
          <Link key={item.key} href={item.href!} className="home-lead-story h-full min-h-0 block">
            <div className="bg-white dark:bg-[#081622] rounded-[14px] border border-slate-200 dark:border-[#19303c] overflow-hidden flex flex-col group hover:border-primary/40 transition-all cursor-pointer min-w-0 shadow-md dark:shadow-xl h-full">
              <div className="home-story-media relative w-full aspect-video overflow-hidden bg-slate-950 dark:bg-[#06111a]">
                <LibraryMedia imageId={item.imageId} title={item.title} accent={meta.accent} code={code} teamName={meta.name} aspect={item.aspect} preserveAspectRatio={false} />
              </div>
              <div className="flex-1 min-h-0 p-4 flex flex-col justify-between border-t border-slate-100 dark:border-white/10 bg-slate-50/50 dark:bg-white/[0.02]">
                <p className="font-bold text-sm sm:text-base leading-snug text-slate-900 dark:text-white/95 group-hover:text-primary transition-colors line-clamp-2 mb-2 tracking-tight">{item.title}</p>
                <div className="flex items-center justify-between gap-2 mt-auto pt-1">
                  <p className="text-[11px] font-bold truncate tracking-wide" style={{ color: meta.accent }}>{aspect}</p>
                  <p className="text-[11px] text-primary font-mono font-bold uppercase tracking-wider shrink-0">{item.meta}</p>
                </div>
              </div>
            </div>
          </Link>
        );
      })}
    </>
  );
}
