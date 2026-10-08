// Site footer: the utility pages, then who built it. Links that aren't set in
// site-profile.ts are left out rather than shown as dead links.

import { Link } from "wouter";
import { SITE, hasLink } from "@/lib/site-profile";

const PAGES = [
  { href: "/about", label: "About" },
  { href: "/methodology", label: "Methodology" },
  { href: "/data-sources", label: "Data Sources" },
  { href: "/contact", label: "Contact" },
  { href: "/disclaimer", label: "Disclaimer" },
];

const sep = <span aria-hidden className="text-white/20">·</span>;

export function SiteFooter() {
  const people = [
    hasLink(SITE.github) && { href: SITE.github, label: "GitHub" },
    hasLink(SITE.linkedin) && { href: SITE.linkedin, label: "LinkedIn" },
  ].filter(Boolean) as { href: string; label: string }[];
  return (
    <footer className="mt-10 border-t border-white/5 px-4 py-6 text-center text-xs text-slate-400">
      <nav aria-label="Site" className="flex flex-wrap items-center justify-center gap-x-2.5 gap-y-1">
        {PAGES.map((p, i) => (
          <span key={p.href} className="inline-flex items-center gap-2.5">
            {i > 0 && sep}
            <Link href={p.href} className="hover:text-white transition-colors">{p.label}</Link>
          </span>
        ))}
      </nav>
      <div className="mt-2 flex flex-wrap items-center justify-center gap-x-2.5 gap-y-1 text-slate-500">
        <span>Built by {SITE.name}</span>
        {people.map((l) => (
          <span key={l.href} className="inline-flex items-center gap-2.5">
            {sep}
            <a href={l.href} target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">{l.label}</a>
          </span>
        ))}
        {sep}
        <Link href="/privacy" className="hover:text-white transition-colors">Privacy</Link>
      </div>
    </footer>
  );
}
