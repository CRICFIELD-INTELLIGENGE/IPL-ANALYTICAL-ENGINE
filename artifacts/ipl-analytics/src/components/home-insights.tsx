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

  return (
    <>
      {cards.slice(0, limit).map(({ item, code }) => {
        const meta = FRANCHISE_METADATA[code];
        const aspect = EDITORIAL_ASPECTS.find((a) => a.id === item.aspect)?.name;
        return (
          <Link key={item.key} href={item.href!} className="home-lead-story h-full min-h-0">
            <div className="bg-[#0B1020] rounded-[18px] border border-white/10 overflow-hidden flex flex-col group hover:border-primary/30 transition-all cursor-pointer min-w-0 shadow-xl h-full">
              <div className="home-story-media">
                <LibraryMedia imageId={item.imageId} title={item.title} accent={meta.accent} code={code} teamName={meta.name} aspect={item.aspect} preserveAspectRatio />
              </div>
              <div className="flex-1 min-h-0 p-3 flex flex-col justify-center border-t border-white/5 bg-white/[0.01]">
                <p className="font-black text-[10px] leading-tight text-white/90 uppercase group-hover:text-primary transition-colors line-clamp-2 mb-1 tracking-tight">{item.title}</p>
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[8px] font-bold truncate" style={{ color: meta.accent }}>{aspect}</p>
                  <p className="text-[8px] text-primary font-black uppercase tracking-widest shrink-0">{item.meta}</p>
                </div>
              </div>
            </div>
          </Link>
        );
      })}
    </>
  );
}
