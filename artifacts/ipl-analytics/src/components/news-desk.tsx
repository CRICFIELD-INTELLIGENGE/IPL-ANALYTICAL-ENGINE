// News-desk furniture: the pieces a cricket news front page is built from.
//
// Deliberately plain. A news page earns attention with headline hierarchy and
// whitespace, not with ornament — the reader is scanning for a story, and every
// decorative element is one more thing between them and it.
//
// Two rules run through all of it:
//   * Nothing is invented. Every story is a real item from a live feed, and a
//     missing image stays missing rather than being replaced by stock art.
//   * Time is shown as it is known. An item without a publish date says so
//     instead of being stamped with "now".

import type { NewsItem } from "@/lib/aggregates";
import { ExternalLink, AlertTriangle, Rss, Clock } from "lucide-react";

/* ─────────────────────────────── helpers ─────────────────────────────── */

export function timeAgo(iso: string | null): string {
  if (!iso) return "undated";
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return "undated";
  const mins = Math.round((Date.now() - t) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.round(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(t).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

const SECTION_TONE: Record<string, string> = {
  Data: "text-primary",
  Business: "text-amber-300",
  Media: "text-sky-300",
  Auction: "text-emerald-300",
  Wire: "text-white/50",
};
export const toneOf = (s: string) => SECTION_TONE[s] ?? "text-white/50";

/* ──────────────────────────────── lead ──────────────────────────────── */

export function NewsLead({ item }: { item: NewsItem }) {
  return (
    <a
      href={item.url}
      target="_blank"
      rel="noopener noreferrer"
      className="group block bg-[#0B1020] border border-white/10 rounded-[24px] overflow-hidden hover:border-primary/40 transition-all"
    >
      {item.image && (
        <div className="relative h-52 md:h-72 overflow-hidden bg-white/5">
          <img
            src={item.image}
            alt=""
            loading="lazy"
            className="w-full h-full object-cover opacity-80 group-hover:opacity-100 group-hover:scale-[1.02] transition-all duration-500"
            onError={e => { (e.currentTarget.parentElement as HTMLElement).style.display = "none"; }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0B1020] via-transparent to-transparent" />
        </div>
      )}
      <div className="p-6 md:p-7 flex flex-col gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`text-[9px] font-black uppercase tracking-[0.2em] ${toneOf(item.section)}`}>
            {item.section}
          </span>
          <span className="text-white/15">·</span>
          <span className="text-[10px] font-bold text-white/35">{item.publisher ?? item.source}</span>
          <span className="text-white/15">·</span>
          <span className="text-[10px] font-mono text-white/25">{timeAgo(item.publishedAt)}</span>
        </div>
        <h2 className="text-[24px] md:text-[32px] font-black text-white leading-[1.08] group-hover:text-primary transition-colors">
          {item.title}
        </h2>
        {item.summary && (
          <p className="text-[13px] md:text-[14px] text-white/55 leading-relaxed line-clamp-3">{item.summary}</p>
        )}
        <span className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-primary mt-1">
          Read at source <ExternalLink className="w-3.5 h-3.5" />
        </span>
      </div>
    </a>
  );
}

/* ──────────────────────────────── row ──────────────────────────────── */

export function NewsRow({ item, rank }: { item: NewsItem; rank?: number }) {
  return (
    <a
      href={item.url}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex gap-4 p-4 rounded-2xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.05] hover:border-white/15 transition-all"
    >
      {rank != null && (
        <span className="text-[20px] font-black text-white/12 tabular-nums leading-none w-7 shrink-0 pt-0.5">
          {String(rank).padStart(2, "0")}
        </span>
      )}
      {item.image && (
        <div className="w-20 h-20 md:w-24 md:h-24 rounded-xl overflow-hidden bg-white/5 shrink-0">
          <img
            src={item.image}
            alt=""
            loading="lazy"
            className="w-full h-full object-cover opacity-75 group-hover:opacity-100 transition-opacity"
            onError={e => { (e.currentTarget.parentElement as HTMLElement).style.display = "none"; }}
          />
        </div>
      )}
      <div className="flex-1 min-w-0 flex flex-col gap-1.5">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`text-[9px] font-black uppercase tracking-[0.18em] ${toneOf(item.section)}`}>{item.section}</span>
          <span className="text-white/15">·</span>
          <span className="text-[10px] font-bold text-white/30 truncate max-w-[150px]">{item.publisher ?? item.source}</span>
        </div>
        <h3 className="text-[14px] md:text-[15px] font-black text-white leading-snug group-hover:text-primary transition-colors line-clamp-2">
          {item.title}
        </h3>
        {item.summary && <p className="text-[11px] text-white/40 leading-snug line-clamp-2">{item.summary}</p>}
        <span className="text-[10px] font-mono text-white/20 inline-flex items-center gap-1 mt-auto">
          <Clock className="w-3 h-3" /> {timeAgo(item.publishedAt)}
        </span>
      </div>
    </a>
  );
}

/* ────────────────────────────── ticker ────────────────────────────── */

/** A marquee of one-line facts, each already computed from the ball record. */
export function StatTicker({ lines }: { lines: string[] }) {
  if (lines.length === 0) return null;
  const run = [...lines, ...lines];
  return (
    <div className="relative overflow-hidden border-y border-white/10 bg-white/[0.03]">
      <div className="flex items-center gap-2 absolute left-0 top-0 bottom-0 z-10 px-4 bg-primary">
        <span className="text-[9px] font-black uppercase tracking-[0.2em] text-white whitespace-nowrap">By the numbers</span>
      </div>
      <div className="ticker-track flex gap-10 py-2.5 pl-[150px] whitespace-nowrap">
        {run.map((l, i) => (
          <span key={i} className="text-[11px] font-bold text-white/50">
            <span className="text-primary mr-2">▍</span>{l}
          </span>
        ))}
      </div>
    </div>
  );
}

/* ────────────────────────── feed health ────────────────────────── */

export function FeedStatusStrip({
  statuses,
  fetchedAt,
}: {
  statuses: { id: string; name: string; ok: boolean; count: number; error?: string }[];
  fetchedAt: string;
}) {
  const down = statuses.filter(s => !s.ok);
  return (
    <div className="flex flex-wrap items-center gap-2 text-[10px]">
      <span className="inline-flex items-center gap-1.5 font-black uppercase tracking-widest text-white/30">
        <Rss className="w-3 h-3" /> {statuses.filter(s => s.ok).length}/{statuses.length} feeds live
      </span>
      <span className="text-white/15">·</span>
      <span className="font-mono text-white/25">updated {timeAgo(fetchedAt)}</span>
      {down.length > 0 && (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-500/10 border border-red-500/30 text-red-300 font-black uppercase tracking-widest">
          <AlertTriangle className="w-3 h-3" />
          {down.map(d => `${d.name}: ${d.error ?? "failed"}`).join(" · ")}
        </span>
      )}
    </div>
  );
}
