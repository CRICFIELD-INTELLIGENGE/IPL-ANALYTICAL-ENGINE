// Team newsroom: the content-engine articles linked to this franchise (see
// lib/team-articles.ts). Nothing is shown that is not linked; with no links the
// section says so and points to the Insights hub.
//
// The articles carry no publication date or byline in the data, so the cards show
// their place in the series ("Day N") and not an invented date or author.

import { useMemo, useState } from "react";
import { Link } from "wouter";
import { BookOpen } from "lucide-react";
import { articlesForTeam } from "@/lib/team-articles";
import type { ContentArticle } from "@/lib/content-engine-100";

export function TeamNewsroom({ code, teamName, accent }: { code: string; teamName: string; accent: string }) {
  const articles = useMemo(() => articlesForTeam(code), [code]);
  const categories = useMemo(() => ["All", ...Array.from(new Set(articles.map((a) => a.dimension)))], [articles]);
  const [category, setCategory] = useState("All");
  const filtered = category === "All" ? articles : articles.filter((a) => a.dimension === category);
  const [featured, ...rest] = filtered;

  return (
    <section id="newsroom" className="scroll-mt-24 rounded-2xl border border-white/10 bg-white/[0.03] p-4 sm:p-6 space-y-5 min-w-0">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="text-[10px] font-mono uppercase tracking-widest text-white/40">Editorial hub</div>
          <h2 className="font-display font-black text-xl uppercase tracking-tight text-white flex items-center gap-2">
            <BookOpen className="w-5 h-5" style={{ color: accent }} />
            {teamName} stories &amp; intelligence
          </h2>
        </div>
        <Link href="/intelligence" className="text-xs font-bold text-white/70 hover:text-white underline underline-offset-4">
          All articles →
        </Link>
      </header>

      {articles.length === 0 ? (
        <div className="rounded-xl border border-dashed border-white/15 px-5 py-8 text-center space-y-2">
          <p className="text-sm font-bold text-white/70">No article in the series is about {teamName} yet.</p>
          <p className="text-xs text-white/45 max-w-md mx-auto">
            Articles appear here once they are linked to this franchise by hand. Browse the full series in the Insights hub in the meantime.
          </p>
        </div>
      ) : (
        <>
          <div role="group" aria-label="Filter articles by category" className="flex flex-wrap gap-1.5">
            {categories.map((c) => (
              <button
                key={c}
                onClick={() => setCategory(c)}
                aria-pressed={category === c}
                className={`px-2.5 py-1 rounded-full text-[11px] font-bold border transition-colors ${category === c ? "text-white border-white/40 bg-white/15" : "text-white/50 border-white/10 hover:text-white"}`}
              >
                {c}
              </button>
            ))}
          </div>

          {featured && <FeaturedCard article={featured} accent={accent} />}

          {rest.length > 0 && (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {rest.slice(0, 6).map((a) => <ArticleCard key={a.day} article={a} />)}
            </div>
          )}
        </>
      )}
    </section>
  );
}

function FeaturedCard({ article, accent }: { article: ContentArticle; accent: string }) {
  return (
    <Link href={`/intelligence?article=${article.day}`} className="group block rounded-2xl border border-white/10 bg-gradient-to-br from-white/[0.06] to-transparent p-5 hover:border-white/25 transition-colors">
      <div className="text-[10px] font-black uppercase tracking-widest" style={{ color: accent }}>{article.dimension}</div>
      <h3 className="font-display font-black text-xl sm:text-2xl text-white mt-2 leading-tight group-hover:underline underline-offset-4">{article.title}</h3>
      <p className="text-sm text-white/65 mt-2 leading-relaxed max-w-3xl">{article.summary}</p>
      <div className="mt-3 text-[11px] text-white/40 flex flex-wrap gap-x-3">
        <span>Day {article.day} of the series</span>
        {article.readTime && <span>{article.readTime}</span>}
      </div>
    </Link>
  );
}

function ArticleCard({ article }: { article: ContentArticle }) {
  return (
    <Link href={`/intelligence?article=${article.day}`} className="group block rounded-xl border border-white/10 bg-white/[0.02] p-4 hover:border-white/25 hover:bg-white/[0.04] transition-colors min-w-0">
      <div className="text-[9px] font-black uppercase tracking-widest text-white/40">{article.dimension}</div>
      <h4 className="font-display font-bold text-sm text-white mt-1.5 leading-snug group-hover:underline underline-offset-4">{article.title}</h4>
      <p className="text-xs text-white/55 mt-1.5 line-clamp-2">{article.subtitle}</p>
      <div className="mt-2.5 text-[10px] text-white/40">Day {article.day}{article.readTime ? ` · ${article.readTime}` : ""}</div>
    </Link>
  );
}
