// Shared shell for the site's utility pages (About, Methodology, Data Sources,
// Contact, Disclaimer, Privacy): a readable column on the dark surface, an
// optional table of contents, and a few prose primitives.

import type { ReactNode } from "react";
import { Link } from "wouter";
import { Layout } from "@/components/layout";

export function InfoPage({ eyebrow, title, intro, updated, toc, children }: {
  eyebrow: string;
  title: string;
  intro: ReactNode;
  updated?: string;
  toc?: { id: string; label: string }[];
  children: ReactNode;
}) {
  return (
    <Layout hideRightPanel>
      <div className="w-full min-w-0 max-w-6xl mx-auto px-4 sm:px-6 pt-8 pb-12">
        <header className="max-w-3xl space-y-3">
          <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-cyan-300">{eyebrow}</div>
          <h1 className="font-display font-black text-3xl sm:text-4xl leading-tight text-white">{title}</h1>
          <div className="text-[15px] leading-relaxed text-slate-300">{intro}</div>
          {updated && <div className="text-xs text-slate-500">Last updated {updated}</div>}
        </header>
        <div className={`mt-8 ${toc ? "lg:grid lg:grid-cols-[200px_minmax(0,1fr)] lg:gap-10" : ""}`}>
          {toc && (
            <nav aria-label="On this page" className="hidden lg:block">
              <div className="sticky top-24 space-y-1 text-sm">
                <div className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2">On this page</div>
                {toc.map((t) => (
                  <a key={t.id} href={`#${t.id}`} className="block py-1 text-slate-400 hover:text-white transition-colors">{t.label}</a>
                ))}
              </div>
            </nav>
          )}
          <div className="min-w-0 max-w-3xl space-y-10">{children}</div>
        </div>
      </div>
    </Layout>
  );
}

export function Section({ id, title, children }: { id?: string; title: string; children: ReactNode }) {
  return (
    <section id={id} className="scroll-mt-24 space-y-4">
      <h2 className="font-display font-bold text-xl text-white">{title}</h2>
      <div className="space-y-3 text-[15px] leading-relaxed text-slate-300">{children}</div>
    </section>
  );
}

/** A bordered block for a single item (a metric, a source). */
export function Panel({ id, title, kicker, children }: { id?: string; title: string; kicker?: string; children: ReactNode }) {
  return (
    <article id={id} className="scroll-mt-24 rounded-2xl border border-white/10 bg-white/[0.03] p-5 space-y-4">
      <header>
        {kicker && <div className="text-[10px] font-bold uppercase tracking-widest text-slate-500">{kicker}</div>}
        <h3 className="font-display font-bold text-lg text-white">{title}</h3>
      </header>
      <div className="space-y-4 text-sm leading-relaxed text-slate-300">{children}</div>
    </article>
  );
}

/** Labelled row inside a Panel: "Definition", "Formula", … */
export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid sm:grid-cols-[120px_minmax(0,1fr)] gap-1 sm:gap-4">
      <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 pt-0.5">{label}</div>
      <div className="min-w-0 space-y-2">{children}</div>
    </div>
  );
}

export function Formula({ children }: { children: ReactNode }) {
  // No wrapping: the formulas are column-aligned, so a long line scrolls instead of breaking.
  return <pre tabIndex={0} className="rounded-lg border border-white/10 bg-[#070b17] px-3 py-2.5 text-[12.5px] leading-relaxed text-cyan-100 font-mono whitespace-pre overflow-x-auto">{children}</pre>;
}

export function Chips({ items }: { items: string[] }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((i) => <code key={i} className="rounded-md border border-white/10 bg-white/5 px-1.5 py-0.5 text-[12px] text-slate-200">{i}</code>)}
    </div>
  );
}

export function Steps({ items }: { items: ReactNode[] }) {
  return <ol className="list-decimal pl-5 space-y-1.5 marker:text-slate-500">{items.map((x, i) => <li key={i}>{x}</li>)}</ol>;
}

export function Bullets({ items }: { items: ReactNode[] }) {
  return <ul className="list-disc pl-5 space-y-1.5 marker:text-slate-500">{items.map((x, i) => <li key={i}>{x}</li>)}</ul>;
}

export function Callout({ children }: { children: ReactNode }) {
  return <div className="rounded-xl border border-amber-400/25 bg-amber-400/[0.07] px-4 py-3 text-sm leading-relaxed text-amber-100">{children}</div>;
}

export function ExtLink({ href, children }: { href: string; children: ReactNode }) {
  return <a href={href} target="_blank" rel="noopener noreferrer" className="text-cyan-300 underline decoration-cyan-300/40 underline-offset-2 hover:decoration-cyan-300">{children}</a>;
}

export function InLink({ href, children }: { href: string; children: ReactNode }) {
  return <Link href={href} className="text-cyan-300 underline decoration-cyan-300/40 underline-offset-2 hover:decoration-cyan-300">{children}</Link>;
}
