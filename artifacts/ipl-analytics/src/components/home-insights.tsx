// Home "Insights That Matter": the same article banners and photos the Intelligence hub shows.
// Loaded lazily from the home page because the article library pulls in the 1.7 MB editorial dataset.
import { Link } from "wouter";
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

  const isSingle = limit === 1;

  return (
    <>
      {cards.slice(0, limit).map(({ item, code }) => {
        const meta = FRANCHISE_METADATA[code];
        const aspect = EDITORIAL_ASPECTS.find((a) => a.id === item.aspect)?.name;
        return (
          <Link key={item.key} href={item.href!} className="home-lead-story h-full flex-1 flex flex-col min-h-0 block">
            <div
              className={`bg-[#081622] rounded-[16px] border border-[#19303c] overflow-hidden group hover:border-primary/50 transition-all cursor-pointer min-w-0 shadow-xl h-full flex-1 ${
                isSingle ? "flex flex-col sm:flex-row" : "flex flex-col"
              }`}
            >
              <div
                className={`home-story-media relative overflow-hidden bg-[#06111a] flex items-center justify-center ${
                  isSingle
                    ? "w-full sm:w-[42%] md:w-[40%] h-64 sm:h-full shrink-0"
                    : "w-full aspect-video"
                }`}
              >
                <LibraryMedia
                  imageId={item.imageId}
                  title={item.title}
                  accent={meta.accent}
                  code={code}
                  teamName={meta.name}
                  aspect={item.aspect}
                  preserveAspectRatio={false}
                  aspectRatio={isSingle ? "fill" : "video"}
                />
              </div>
              <div
                className={`flex-1 min-h-0 flex flex-col justify-between ${
                  isSingle
                    ? "p-5 sm:p-6 border-t sm:border-t-0 sm:border-l border-white/10 bg-white/[0.02]"
                    : "p-4 border-t border-white/10 bg-white/[0.02]"
                }`}
              >
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span
                      className="text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded"
                      style={{
                        backgroundColor: `${meta.accent}20`,
                        color: meta.accent,
                        border: `1px solid ${meta.accent}40`,
                      }}
                    >
                      {code} · {aspect}
                    </span>
                  </div>
                  <p
                    className={`font-bold leading-snug text-white/95 group-hover:text-primary transition-colors tracking-tight mb-2 ${
                      isSingle ? "text-base sm:text-lg lg:text-xl line-clamp-3" : "text-sm sm:text-base line-clamp-2"
                    }`}
                  >
                    {item.title}
                  </p>
                  {isSingle && item.dek && (
                    <p className="text-xs sm:text-sm text-slate-300 leading-relaxed line-clamp-2 sm:line-clamp-3 mb-3">
                      {item.dek}
                    </p>
                  )}
                </div>
                <div className="flex items-center justify-between gap-2 mt-auto pt-2 border-t border-white/5">
                  <span className="text-xs font-semibold text-primary group-hover:underline flex items-center gap-1">
                    Read full story →
                  </span>
                  <p className="text-[11px] text-white/40 font-mono font-bold uppercase tracking-wider shrink-0">
                    {item.meta}
                  </p>
                </div>
              </div>
            </div>
          </Link>
        );
      })}
    </>
  );
}
