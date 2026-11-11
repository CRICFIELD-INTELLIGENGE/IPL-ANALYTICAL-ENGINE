/**
 * CONTACT — routes to the builder. Every link comes from site-profile.ts and
 * is shown only when set.
 */

import type { ReactNode } from "react";
import { Github, Linkedin, Mail, Code2 } from "lucide-react";
import { InLink, InfoPage, Section } from "@/components/site/info-page";
import { SITE, hasLink } from "@/lib/site-profile";

function Card({ href, icon, label, detail }: { href: string; icon: ReactNode; label: string; detail: string }) {
  const external = !href.startsWith("mailto:");
  return (
    <a href={href} {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
      className="flex items-center gap-4 rounded-2xl border border-white/10 bg-white/[0.03] p-4 hover:border-cyan-400/50 hover:bg-white/[0.05] transition-colors">
      <span className="w-10 h-10 rounded-xl border border-white/10 bg-white/5 flex items-center justify-center shrink-0 text-cyan-300">{icon}</span>
      <span className="min-w-0">
        <span className="block font-semibold text-white">{label}</span>
        <span className="block text-sm text-slate-400 truncate">{detail}</span>
      </span>
    </a>
  );
}

const short = (url: string) => url.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "");

export default function ContactPage() {
  const cards = [
    hasLink(SITE.linkedin) && { href: SITE.linkedin, icon: <Linkedin className="w-5 h-5" />, label: "LinkedIn", detail: short(SITE.linkedin) },
    hasLink(SITE.github) && { href: SITE.github, icon: <Github className="w-5 h-5" />, label: "GitHub", detail: short(SITE.github) },
    hasLink(SITE.email) && { href: `mailto:${SITE.email}`, icon: <Mail className="w-5 h-5" />, label: "Email", detail: SITE.email },
    hasLink(SITE.repo) && { href: SITE.repo, icon: <Code2 className="w-5 h-5" />, label: "Source code", detail: short(SITE.repo) },
  ].filter(Boolean) as { href: string; icon: ReactNode; label: string; detail: string }[];

  return (
    <InfoPage
      eyebrow="Contact"
      title="Get in touch"
      intro={<>{SITE.projectName} is built and maintained by {SITE.fullName}. Questions about the data or the models, opportunities, or a correction — all welcome.</>}
    >
      <div className="grid sm:grid-cols-2 gap-3">
        {cards.map((c) => <Card key={c.label} {...c} />)}
      </div>

      <div id="corrections" className="scroll-mt-20" /><Section title="Reporting a data issue">
        <p>If a number looks wrong, it helps to include the page link, the player, team or match, and the figure you expected. Many issues trace back to the source scorecards; see <InLink href="/data-sources">Data Sources</InLink> for where each figure comes from and <InLink href="/methodology">Methodology</InLink> for how it is calculated.</p>
      </Section>
    </InfoPage>
  );
}
