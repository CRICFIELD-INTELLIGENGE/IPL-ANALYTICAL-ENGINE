import { Layout } from "@/components/layout";
import { useLiveNews, timeAgo } from "@/lib/live";
import { useState } from "react";
import { RefreshCw } from "lucide-react";

export default function NewsPage() {
  const [cat, setCat] = useState<"general" | "ipl">("general");
  const q = useLiveNews(cat);
  const items = q.data?.items ?? [];
  const featured = items[0];
  const rest = items.slice(1);

  return (
    <Layout>
      <div className="mb-6 flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">Cricket News</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Live news feed from ESPN Cricinfo, updated every 5 minutes.
          </p>
        </div>
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <RefreshCw className="w-3.5 h-3.5" />
          {q.dataUpdatedAt > 0 && <span>Updated {new Date(q.dataUpdatedAt).toLocaleTimeString()}</span>}
        </div>
      </div>

      <div className="flex items-center gap-2 mb-6 border-b border-border">
        {(["general", "ipl"] as const).map((c) => (
          <button
            key={c}
            onClick={() => setCat(c)}
            className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors ${
              cat === c ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {c === "general" ? "All Cricket" : "IPL"}
          </button>
        ))}
      </div>

      {q.isLoading ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {Array.from({ length: 9 }).map((_, i) => (
            <div key={i} className="bg-card border border-border rounded-md h-72 animate-pulse" />
          ))}
        </div>
      ) : (
        <>
          {featured && (
            <a
              href={featured.link}
              target="_blank"
              rel="noopener noreferrer"
              className="block group relative rounded-md overflow-hidden bg-card border border-border min-h-[400px] mb-6"
            >
              {featured.image && (
                <img src={featured.image} alt="" className="absolute inset-0 w-full h-full object-cover" loading="eager" />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />
              <div className="absolute inset-0 flex flex-col justify-end p-8 text-white">
                <span className="bg-accent text-accent-foreground text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded w-fit mb-3">
                  Top Story
                </span>
                <h2 className="text-2xl md:text-4xl font-extrabold leading-tight mb-3 group-hover:underline">{featured.title}</h2>
                <p className="text-sm md:text-base text-gray-200 mb-3 max-w-3xl line-clamp-3">{featured.description}</p>
                <div className="text-xs text-gray-300">ESPN Cricinfo • {timeAgo(featured.pubDate)}</div>
              </div>
            </a>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {rest.map((n, i) => (
              <a
                key={i}
                href={n.link}
                target="_blank"
                rel="noopener noreferrer"
                className="block bg-card border border-border rounded-md overflow-hidden hover:shadow-md transition group"
              >
                <div className="h-44 bg-muted relative">
                  {n.image && <img src={n.image} alt="" className="w-full h-full object-cover" loading="lazy" />}
                </div>
                <div className="p-4">
                  <h3 className="font-bold leading-snug text-base group-hover:text-primary transition-colors mb-2 line-clamp-3">{n.title}</h3>
                  <p className="text-xs text-muted-foreground line-clamp-3 mb-3">{n.description}</p>
                  <div className="text-[11px] text-muted-foreground">ESPN Cricinfo • {timeAgo(n.pubDate)}</div>
                </div>
              </a>
            ))}
          </div>
        </>
      )}
    </Layout>
  );
}
