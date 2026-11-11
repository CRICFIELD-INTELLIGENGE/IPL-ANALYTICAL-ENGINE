// The reader surface: insight cards, and a swipeable story mode for them.
//
// Two ways into the same cards, because they get consumed in two ways. The feed
// is for someone browsing on a laptop; the story deck is for a phone and for a
// screenshot that goes onto a social post. Both render the identical card data
// coming from /api/ipl/insights — nothing is written twice.
//
// Every card carries its sample size on the face. An insight without one is a
// claim; with one it is a finding, and the reader can tell the difference.

import { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { trackOutbound } from "@/lib/analytics";
import {
  ChevronLeft, ChevronRight, ExternalLink, Share2, Check,
  Database, BookOpen, Sparkles, Pause, Play,
} from "lucide-react";

export interface InsightCardData {
  id: string;
  kind: "computed" | "sourced";
  category: string;
  headline: string;
  stat: string;
  statLabel: string;
  body: string;
  sample: string;
  compare?: { stat: string; statLabel: string };
  testsSlug?: string;
  source?: string;
}

export interface ArticleData {
  slug: string;
  title: string;
  deck: string;
  author: string;
  platform: string;
  url: string;
  own: boolean;
  tags: string[];
  published?: string;
}

/**
 * Category accents, drawn from hues already in the app so the deck reads as one
 * system rather than a new palette.
 */
const ACCENT: Record<string, { text: string; bg: string; border: string; glow: string }> = {
  "Rules & scoring": { text: "text-amber-300", bg: "bg-amber-400/10", border: "border-amber-400/30", glow: "shadow-amber-400/10" },
  Batting: { text: "text-primary", bg: "bg-primary/10", border: "border-primary/30", glow: "shadow-primary/10" },
  Bowling: { text: "text-sky-300", bg: "bg-sky-400/10", border: "border-sky-400/30", glow: "shadow-sky-400/10" },
  Conditions: { text: "text-emerald-300", bg: "bg-emerald-400/10", border: "border-emerald-400/30", glow: "shadow-emerald-400/10" },
};
const accentOf = (c: string) => ACCENT[c] ?? ACCENT.Batting;

/** One stable internal link per article; the server counts it and redirects. */
export const goLink = (slug: string) => `${import.meta.env.BASE_URL}api/ipl/insights/go/${slug}`;

/* ────────────────────────────── FEED CARD ────────────────────────────── */

export function InsightFeedCard({ card, article }: { card: InsightCardData; article?: ArticleData }) {
  const a = accentOf(card.category);
  return (
    <article className={`relative bg-[#0B1020] border border-white/10 rounded-[24px] overflow-hidden hover:border-white/25 transition-all group`}>
      {/* The accent rail is the card's only ornament — it encodes the category
          without spending a colour on a chart that isn't there. */}
      <div className={`absolute left-0 top-0 bottom-0 w-1 ${a.bg.replace("/10", "/60")}`} />
      <div className="p-6 pl-7 flex flex-col gap-4">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`px-2.5 py-1 rounded-full border text-[9px] font-black uppercase tracking-widest ${a.bg} ${a.border} ${a.text}`}>
            {card.category}
          </span>
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full border border-white/10 bg-white/5 text-[9px] font-black uppercase tracking-widest text-white/40">
            {card.kind === "computed" ? <><Database className="w-3 h-3" /> Computed</> : <><BookOpen className="w-3 h-3" /> Sourced</>}
          </span>
        </div>

        <h3 className="text-[19px] md:text-[21px] font-black text-white leading-[1.15]">{card.headline}</h3>

        <div className="flex items-end gap-5 flex-wrap">
          <div>
            <div className={`text-[40px] font-black leading-none tabular-nums ${a.text}`}>{card.stat}</div>
            <div className="text-[10px] font-black uppercase tracking-widest text-white/35 mt-1.5">{card.statLabel}</div>
          </div>
          {card.compare && (
            <>
              <div className="text-white/15 text-[22px] font-black pb-4">vs</div>
              <div className="pb-0.5">
                <div className="text-[26px] font-black leading-none tabular-nums text-white/45">{card.compare.stat}</div>
                <div className="text-[10px] font-black uppercase tracking-widest text-white/25 mt-1.5">{card.compare.statLabel}</div>
              </div>
            </>
          )}
        </div>

        <p className="text-[13px] text-white/60 leading-relaxed">{card.body}</p>

        <div className="pt-3 border-t border-white/5 flex items-center justify-between gap-3 flex-wrap">
          <span className="text-[10px] font-mono text-white/25">n = {card.sample}</span>
          {article && (
            <a
              href={goLink(article.slug)}
              onClick={() => trackOutbound(article.slug, article.title, article.platform)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-white/40 hover:text-primary transition-colors"
            >
              Tests “{article.title}” <ExternalLink className="w-3 h-3" />
            </a>
          )}
        </div>
      </div>
    </article>
  );
}

/* ───────────────────────────── STORY DECK ───────────────────────────── */

export function InsightStoryDeck({
  cards,
  articles,
}: {
  cards: InsightCardData[];
  articles: ArticleData[];
}) {
  const [i, setI] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [copied, setCopied] = useState(false);
  const touchX = useRef<number | null>(null);

  const total = cards.length;
  const card = cards[i];
  const article = card?.testsSlug ? articles.find(a => a.slug === card.testsSlug) : undefined;

  const next = useCallback(() => setI(v => (v + 1) % Math.max(total, 1)), [total]);
  const prev = useCallback(() => setI(v => (v - 1 + Math.max(total, 1)) % Math.max(total, 1)), [total]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === " ") { e.preventDefault(); next(); }
      if (e.key === "ArrowLeft") { e.preventDefault(); prev(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [next, prev]);

  // Autoplay advances the deck like a story reel; any manual move pauses it so
  // the reader is never fighting the timer.
  useEffect(() => {
    if (!playing || total === 0) return;
    const t = setTimeout(next, 6500);
    return () => clearTimeout(t);
  }, [playing, i, next, total]);

  const share = async () => {
    if (!card) return;
    const text = `${card.headline} — ${card.stat} ${card.statLabel} (n = ${card.sample})`;
    try {
      if (navigator.share) await navigator.share({ text, url: window.location.href });
      else { await navigator.clipboard.writeText(`${text}\n${window.location.href}`); setCopied(true); setTimeout(() => setCopied(false), 1800); }
    } catch { /* the reader dismissed the share sheet */ }
  };

  if (!card) {
    return (
      <div className="rounded-[28px] border border-white/10 bg-[#0B1020] p-12 text-center text-white/40 font-mono text-sm">
        No insights available.
      </div>
    );
  }

  const a = accentOf(card.category);

  return (
    <div className="flex flex-col gap-3 select-none">
      {/* Progress rail, one segment per card. */}
      <div className="flex gap-1.5">
        {cards.map((_, n) => (
          <button
            key={n}
            onClick={() => { setPlaying(false); setI(n); }}
            className="flex-1 h-1 rounded-full bg-white/10 overflow-hidden"
            aria-label={`Insight ${n + 1}`}
          >
            <div className={`h-full transition-all duration-300 ${n <= i ? "bg-primary" : "bg-transparent"}`} style={{ width: n <= i ? "100%" : "0%" }} />
          </button>
        ))}
      </div>

      <div
        className={`relative rounded-[28px] border border-white/10 bg-[#0B1020] overflow-hidden shadow-2xl ${a.glow}`}
        onTouchStart={e => { touchX.current = e.changedTouches[0].clientX; }}
        onTouchEnd={e => {
          if (touchX.current == null) return;
          const dx = e.changedTouches[0].clientX - touchX.current;
          if (Math.abs(dx) > 45) { setPlaying(false); dx < 0 ? next() : prev(); }
          touchX.current = null;
        }}
      >
        <div className={`absolute inset-0 bg-gradient-to-br ${a.bg} via-transparent to-transparent pointer-events-none`} />
        <div className="absolute inset-0 grid-bg opacity-[0.07] pointer-events-none" />

        {/* Click zones: left third goes back, the rest goes forward. */}
        <button className="absolute left-0 top-0 bottom-0 w-1/3 z-10" onClick={() => { setPlaying(false); prev(); }} aria-label="Previous insight" />
        <button className="absolute right-0 top-0 bottom-0 w-2/3 z-10" onClick={() => { setPlaying(false); next(); }} aria-label="Next insight" />

        <AnimatePresence mode="popLayout">
          <motion.div
            key={card.id}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.28, ease: "easeOut" }}
            className="relative px-7 md:px-12 py-10 md:py-14 min-h-[440px] md:min-h-[500px] flex flex-col"
          >
            <div className="flex items-center gap-2 flex-wrap mb-7">
              <span className={`px-2.5 py-1 rounded-full border text-[9px] font-black uppercase tracking-widest ${a.bg} ${a.border} ${a.text}`}>
                {card.category}
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full border border-white/10 bg-white/5 text-[9px] font-black uppercase tracking-widest text-white/40">
                <Database className="w-3 h-3" /> From {card.kind === "computed" ? "the ball record" : "published data"}
              </span>
            </div>

            <div className={`text-[64px] md:text-[92px] font-black leading-[0.85] tabular-nums ${a.text}`}>
              {card.stat}
            </div>
            <div className="text-[11px] md:text-[12px] font-black uppercase tracking-[0.2em] text-white/35 mt-3">
              {card.statLabel}
            </div>

            {card.compare && (
              <div className="mt-4 inline-flex items-center gap-3 self-start px-4 py-2 rounded-xl bg-white/[0.04] border border-white/10">
                <span className="text-[10px] font-black uppercase tracking-widest text-white/30">was</span>
                <span className="text-[20px] font-black tabular-nums text-white/60">{card.compare.stat}</span>
                <span className="text-[10px] text-white/30 leading-tight max-w-[180px]">{card.compare.statLabel}</span>
              </div>
            )}

            <h2 className="text-[24px] md:text-[32px] font-black text-white leading-[1.1] mt-8 max-w-3xl">
              {card.headline}
            </h2>
            <p className="text-[14px] md:text-[15px] text-white/60 leading-relaxed mt-4 max-w-3xl">
              {card.body}
            </p>

            <div className="mt-auto pt-8 flex items-end justify-between gap-4 flex-wrap">
              <div className="flex flex-col gap-1.5">
                <span className="text-[10px] font-mono text-white/25">n = {card.sample}</span>
                {article && (
                  <a
                    href={goLink(article.slug)}
              onClick={() => trackOutbound(article.slug, article.title, article.platform)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="relative z-20 inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-white/45 hover:text-primary transition-colors"
                  >
                    Tests “{article.title}” by {article.author} <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
              <span className="text-[11px] font-black tabular-nums text-white/25">{i + 1} / {total}</span>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Controls sit below the card so they never overlap the tap zones. */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex gap-2">
          <button onClick={() => { setPlaying(false); prev(); }} className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-white/50 hover:text-white hover:bg-white/10 transition-all" aria-label="Previous">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button onClick={() => { setPlaying(false); next(); }} className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-white/50 hover:text-white hover:bg-white/10 transition-all" aria-label="Next">
            <ChevronRight className="w-4 h-4" />
          </button>
          <button onClick={() => setPlaying(p => !p)} className={`px-4 h-10 rounded-xl border flex items-center gap-2 text-[10px] font-black uppercase tracking-widest transition-all ${playing ? "bg-primary/15 border-primary/30 text-primary" : "bg-white/5 border-white/10 text-white/50 hover:text-white"}`}>
            {playing ? <><Pause className="w-3.5 h-3.5" /> Pause</> : <><Play className="w-3.5 h-3.5" /> Autoplay</>}
          </button>
        </div>
        <button onClick={share} className="px-4 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-white/50 hover:text-white hover:border-primary/40 transition-all">
          {copied ? <><Check className="w-3.5 h-3.5 text-emerald-400" /> Copied</> : <><Share2 className="w-3.5 h-3.5" /> Share</>}
        </button>
      </div>

      <p className="text-[10px] text-white/20 font-mono text-center">
        Swipe, tap the sides, or use ← →
      </p>
    </div>
  );
}

/* ───────────────────────────── ARTICLE CARD ───────────────────────────── */

export function ArticleCard({ article }: { article: ArticleData }) {
  return (
    <a
      href={goLink(article.slug)}
              onClick={() => trackOutbound(article.slug, article.title, article.platform)}
      target="_blank"
      rel="noopener noreferrer"
      className="bg-[#0B1020] border border-white/10 rounded-[24px] overflow-hidden hover:border-primary/40 transition-all group flex flex-col"
    >
      {/* No stock imagery. The plate is built from the piece's own metadata, so
          nothing on the card implies content the article does not contain. */}
      <div className="relative h-28 bg-gradient-to-br from-primary/20 via-primary/5 to-transparent border-b border-white/5 flex items-end p-5">
        <div className="absolute inset-0 grid-bg opacity-10" />
        <div className="relative flex items-center gap-2">
          <span className="px-2.5 py-1 rounded-full bg-black/40 border border-white/15 text-[9px] font-black uppercase tracking-widest text-white/70">
            {article.platform}
          </span>
          {article.own && (
            <span className="px-2.5 py-1 rounded-full bg-primary/20 border border-primary/40 text-[9px] font-black uppercase tracking-widest text-primary inline-flex items-center gap-1">
              <Sparkles className="w-3 h-3" /> Mine
            </span>
          )}
        </div>
      </div>
      <div className="p-5 flex flex-col gap-3 flex-1">
        <h3 className="text-[16px] font-black text-white leading-tight group-hover:text-primary transition-colors">
          {article.title}
        </h3>
        <p className="text-[12px] text-white/50 leading-relaxed flex-1">{article.deck}</p>
        <div className="flex flex-wrap gap-1.5">
          {article.tags.map(t => (
            <span key={t} className="px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-[9px] font-bold uppercase tracking-wider text-white/35">
              {t}
            </span>
          ))}
        </div>
        <div className="pt-3 border-t border-white/5 flex items-center justify-between gap-2">
          <span className="text-[10px] font-black uppercase tracking-widest text-white/30 truncate">{article.author}</span>
          <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-primary shrink-0">
            Read <ExternalLink className="w-3 h-3" />
          </span>
        </div>
      </div>
    </a>
  );
}
