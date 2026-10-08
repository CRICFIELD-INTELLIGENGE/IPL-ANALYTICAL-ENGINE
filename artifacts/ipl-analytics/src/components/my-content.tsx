// Your own writing, grouped by platform.
//
// This lives on /insights rather than /intelligence. The two pages answer
// different questions: /intelligence is the public desk — live wire, computed
// findings, who to follow — while this is the author's own shelf. Mixing them
// meant a first-time reader landed on somebody's post archive instead of the
// news.
//
// Posts come from the content hub API, so adding one is a server-side edit and
// the page needs no change. An empty platform stays visibly empty rather than
// being hidden, because a shelf with nothing on it is a fact worth showing.

import type { SocialPost, SocialPlatform } from "@/lib/aggregates";
import {
  ArrowUpRight, Linkedin, Twitter, FileText, Mail, Calendar, PenSquare,
} from "lucide-react";

export const PLATFORM_META: Record<SocialPlatform, {
  Icon: typeof Linkedin;
  color: string;
  bg: string;
  border: string;
  label: string;
  profileBase: string;
}> = {
  LinkedIn: { Icon: Linkedin, color: "text-sky-400", bg: "bg-sky-400/10", border: "border-sky-400/30", label: "LinkedIn", profileBase: "https://linkedin.com/in/" },
  X: { Icon: Twitter, color: "text-white/80", bg: "bg-white/5", border: "border-white/20", label: "X (Twitter)", profileBase: "https://x.com/" },
  Medium: { Icon: FileText, color: "text-emerald-400", bg: "bg-emerald-400/10", border: "border-emerald-400/30", label: "Medium", profileBase: "https://medium.com/@" },
  Substack: { Icon: Mail, color: "text-orange-400", bg: "bg-orange-400/10", border: "border-orange-400/30", label: "Substack", profileBase: "https://substack.com/" },
};

export const PLATFORMS: SocialPlatform[] = ["LinkedIn", "X", "Medium", "Substack"];

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <div className="text-[10px] font-black uppercase tracking-[0.25em] text-white/30 mb-3">{children}</div>;
}

function TagChip({ text }: { text: string }) {
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border bg-white/5 border-white/10 text-white/40 text-[9px] font-black uppercase tracking-widest">
      {text}
    </span>
  );
}

function DateBadge({ iso }: { iso: string }) {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return (
    <span className="inline-flex items-center gap-1 text-[9px] text-white/30 font-bold uppercase tracking-widest">
      <Calendar className="w-3 h-3" />
      {d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
    </span>
  );
}

function PostCard({ post }: { post: SocialPost }) {
  const meta = PLATFORM_META[post.platform];
  const Icon = meta.Icon;
  return (
    <a
      href={post.url}
      target="_blank"
      rel="noopener noreferrer"
      className={`group block bg-[#0B1020] border rounded-[20px] p-5 transition-all hover:shadow-xl hover:shadow-primary/10 ${meta.border} hover:border-opacity-70`}
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[9px] font-black uppercase tracking-widest ${meta.bg} ${meta.border} ${meta.color}`}>
          <Icon className="w-3 h-3" />
          {meta.label}
          {post.isLongform && post.readMins && <span className="text-white/30">· {post.readMins}m read</span>}
        </div>
        <ArrowUpRight className="w-4 h-4 text-white/20 group-hover:text-white/60 transition-colors shrink-0 mt-0.5" />
      </div>
      <h3 className="text-[15px] font-black text-white leading-snug mb-1.5 group-hover:text-primary transition-colors">
        {post.title}
      </h3>
      <p className="text-[12px] text-white/50 leading-relaxed mb-3">{post.blurb}</p>
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex flex-wrap gap-1">
          {post.tags.slice(0, 3).map(t => <TagChip key={t} text={t} />)}
        </div>
        <DateBadge iso={post.published} />
      </div>
    </a>
  );
}

function PlatformSection({ platform, posts }: { platform: SocialPlatform; posts: SocialPost[] }) {
  const meta = PLATFORM_META[platform];
  const Icon = meta.Icon;

  return (
    <div className="flex flex-col gap-4">
      <div className={`flex items-center justify-between bg-[#0B1020] border rounded-[20px] px-5 py-4 ${meta.border}`}>
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${meta.bg} border ${meta.border}`}>
            <Icon className={`w-5 h-5 ${meta.color}`} />
          </div>
          <div>
            <div className={`text-[15px] font-black ${meta.color}`}>{meta.label}</div>
            <div className="text-[10px] text-white/30 font-bold uppercase tracking-widest">
              {posts.length === 0 ? "No posts linked yet" : `${posts.length} post${posts.length > 1 ? "s" : ""}`}
            </div>
          </div>
        </div>
        {posts.length === 0 && (
          <span className="text-[9px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-white/30">
            Not linked
          </span>
        )}
      </div>

      {posts.length === 0 ? (
        <div className="rounded-[20px] border border-dashed border-white/10 bg-white/[0.015] px-6 py-8 text-center">
          <PenSquare className={`w-8 h-8 mx-auto mb-3 ${meta.color} opacity-30`} />
          <div className="text-[12px] text-white/25 font-mono">
            Posts on {meta.label} appear here once linked.
          </div>
          <div className="mt-2 text-[10px] text-white/15 font-mono">
            Edit <span className="text-white/30">api-server/src/services/content-hub.ts</span> → MY_POSTS
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {posts.map(p => <PostCard key={p.id} post={p} />)}
        </div>
      )}
    </div>
  );
}

export function MyContentTab({ byPlatform }: { byPlatform: Record<SocialPlatform, SocialPost[]> }) {
  const totalPosts = Object.values(byPlatform).flat().length;

  return (
    <div className="flex flex-col gap-8">
      <div className="bg-[#0B1020] border border-white/10 rounded-[24px] p-6">
        <SectionLabel>My writing across platforms</SectionLabel>
        <p className="text-[13px] text-white/60 leading-relaxed max-w-3xl">
          Every post, article and thread published from this project, grouped by platform and
          newest first. Each card links straight to where the piece lives.
          {totalPosts === 0 && (
            <span className="block mt-2 text-white/30 text-[12px] font-mono">
              → Add entries to MY_POSTS in{" "}
              <span className="text-white/50">api-server/src/services/content-hub.ts</span>, restart
              the server, and they appear here.
            </span>
          )}
        </p>
      </div>

      {PLATFORMS.map(p => (
        <PlatformSection key={p} platform={p} posts={byPlatform[p] ?? []} />
      ))}
    </div>
  );
}
