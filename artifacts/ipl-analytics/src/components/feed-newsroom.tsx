import type { ReactNode } from "react";
import { Link } from "wouter";
import { LibraryMedia } from "@/components/dugout/franchise-library";
import { TEAM_REGISTRY, type TeamCode } from "@/lib/team-context";
import { EDITORIAL_AUTHOR, EDITORIAL_ASPECTS, type IndexEntry } from "@/data/editorial/schema";

/** Visible (published, or review on localhost) articles, featured first, then newest. */
export function newsroomOrder(entries: IndexEntry[]) {
  return [...entries].sort((a, b) => Number(b.featured) - Number(a.featured) || b.publishedDate.localeCompare(a.publishedDate));
}

const dateLabel = (d: string) => new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

/** One article card: hero image (licence-gated via LibraryMedia), category, headline, standfirst, byline, date. */
export function NewsCard({ entry, lead = false, media }: { entry: IndexEntry; lead?: boolean; media?: ReactNode }) {
  const team = TEAM_REGISTRY[entry.franchise as TeamCode];
  const category = EDITORIAL_ASPECTS.find((a) => a.id === entry.aspect)?.name;
  return (
    <Link
      href={`/dugout/articles/${entry.slug}`}
      className={`group flex flex-col w-full h-full overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] hover:border-white/25 transition-colors ${lead ? "lg:col-span-2" : ""}`}
    >
      {media ? (
        media
      ) : (
        <LibraryMedia imageId={entry.id} title={entry.title} accent={team.accent} code={entry.franchise} teamName={team.name} aspect={entry.aspect} />
      )}
      <div className="flex flex-1 flex-col gap-1.5 p-4">
        <div className="text-[10px] font-black uppercase tracking-widest" style={{ color: team.accent }}>
          {entry.franchise} · {category}
        </div>
        <h3 className={`font-bold text-white leading-snug group-hover:underline ${lead ? "text-xl sm:text-2xl" : "text-[15px]"}`}>{entry.title}</h3>
        <p className={`text-sm text-white/60 ${lead ? "" : "line-clamp-2"}`}>{entry.dek}</p>
        <div className="mt-auto pt-2 text-[11px] text-white/40">
          {EDITORIAL_AUTHOR} · {dateLabel(entry.publishedDate)} · {entry.readMinutes} min read
        </div>
      </div>
    </Link>
  );
}
