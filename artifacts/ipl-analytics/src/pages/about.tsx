/**
 * ABOUT — what the project is, what's inside, how it's built, and who built it.
 */

import { useQuery } from "@tanstack/react-query";
import { Bullets, ExtLink, InLink, InfoPage, Section } from "@/components/site/info-page";
import { fetchHistoryOverview } from "@/lib/ask-api";
import { MOCK_OVERVIEW } from "@/components/decision/ask-mock";
import { SITE, hasLink } from "@/lib/site-profile";

const MODULES: { phase: string; items: { href: string; name: string; what: string }[] }[] = [
  {
    phase: "Foundation",
    items: [
      { href: "/ai-analyst/ask", name: "Ask the database", what: "Plain-English questions compiled into structured stat queries over every ball." },
      { href: "/ai-analyst/ask?tab=database", name: "Historical database", what: "Season-by-season coverage of the warehouse, with its data-health checks." },
    ],
  },
  {
    phase: "Discovery",
    items: [
      { href: "/ai-analyst/feed", name: "AI Insight Feed", what: "Daily findings: player rises, venue patterns, matchup anomalies, auction value, tactical trends." },
      { href: "/ai-analyst/weakness", name: "Hidden Weakness Detector", what: "Statistically tested weak spots in any player's record." },
      { href: "/ai-analyst/pressure", name: "Pressure Genome", what: "How a player changes in death overs, knockouts and close finishes." },
    ],
  },
  {
    phase: "Simulation",
    items: [
      { href: "/ai-analyst/strategy-sim", name: "Strategy Simulator", what: "Set a chase and compare bowling plans over thousands of simulated finishes." },
      { href: "/ai-analyst/alt-universe", name: "Alternate Universe", what: "Replay a real innings with one decision changed." },
      { href: "/ai-analyst/opposition-map", name: "Opposition Exploit Map", what: "A pre-match briefing on any opponent." },
      { href: "/ai-analyst/decision-replay", name: "Captain's Decision Replay", what: "Make the bowling calls at a real chase's turning points." },
    ],
  },
  {
    phase: "Intelligence",
    items: [
      { href: "/ai-analyst/auction-war-room", name: "Auction War Room", what: "Buy, hold or avoid, with a max bid and comparable sales, backtested on the 2026 auction." },
      { href: "/ai-analyst/squad-dna", name: "Squad DNA", what: "Any franchise-season on 38 dimensions, judged against its own season." },
      { href: "/ai-analyst/player-pool", name: "Player Pool Graph", what: "Every player's nearest matches across eras." },
    ],
  },
];

export default function AboutPage() {
  const { data } = useQuery({ queryKey: ["history-overview"], queryFn: fetchHistoryOverview, retry: 1, staleTime: 30 * 60_000 });
  const c = (data ?? MOCK_OVERVIEW).coverage;
  const stats = [
    { label: "Ball-by-ball deliveries", value: c.deliveries.toLocaleString("en-US") },
    { label: "Matches", value: c.matches.toLocaleString("en-US") },
    { label: "Seasons", value: `${c.firstSeason}–${c.lastSeason}` },
    { label: "Players", value: c.players.toLocaleString("en-US") },
  ];
  return (
    <InfoPage
      eyebrow="About"
      title={SITE.projectName}
      intro={<>An end-to-end cricket analytics project. Every IPL ball since 2008 goes into a warehouse; statistical models are built on top; and each tool answers a question a team analyst actually faces — who to bowl, who to buy, where an opponent is weak.</>}
    >
      <dl className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {stats.map((s) => (
          <div key={s.label} className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3">
            <dd className="font-display font-black text-xl text-white tabular-nums">{s.value}</dd>
            <dt className="text-[11px] text-slate-400 mt-0.5">{s.label}</dt>
          </div>
        ))}
      </dl>

      <Section title="What it does">
        <p>Most cricket sites stop at scorecards and leaderboards. This one is built around decisions: each module starts from a question, answers it from the ball-by-ball record, and shows how confident it is.</p>
        <div className="grid sm:grid-cols-2 gap-3 pt-1">
          {MODULES.map((g) => (
            <div key={g.phase} className="rounded-xl border border-white/10 bg-white/[0.02] p-4 space-y-2">
              <div className="text-[10px] font-bold uppercase tracking-widest text-cyan-300">{g.phase}</div>
              <ul className="space-y-2">
                {g.items.map((m) => (
                  <li key={m.href} className="text-sm">
                    <InLink href={m.href}>{m.name}</InLink>
                    <div className="text-slate-400 text-[13px] leading-snug">{m.what}</div>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <p>Alongside these sit the scores, stats, team, player, venue and match pages, which draw on the same warehouse.</p>
      </Section>

      <Section title="How it's built">
        <Bullets items={[
          <><b className="text-white">Data.</b> Cricsheet ball-by-ball files loaded into a SQLite warehouse, enriched with ball-by-ball commentary (line, length, shot, speed) and auction records, with exact-match rules wherever sources are joined. <InLink href="/data-sources">Data Sources</InLink> lists everything.</>,
          <><b className="text-white">Models.</b> Impact ratings, a calibrated chase win-probability model, a Monte Carlo match simulator, significance-tested weakness scans, a mixed-integer team optimiser, similarity search and an auction valuation model. <InLink href="/methodology">Methodology</InLink> gives the formula for each.</>,
          <><b className="text-white">Back end.</b> Node.js, Express and TypeScript, with Zod-validated APIs and an in-memory column store over the warehouse so simulations run in well under a second.</>,
          <><b className="text-white">Front end.</b> React, Vite, TanStack Query and Tailwind, with charts drawn as plain SVG.</>,
        ]} />
      </Section>

      <Section title="Principles">
        <Bullets items={[
          "No invented numbers. Placeholder and synthetic data have been replaced with values computed from the record, and a figure the data can't support is shown as unavailable.",
          "No look-ahead. Backtests and historical what-ifs use only data available at the time.",
          "Show the uncertainty. Models report their sample sizes, error ranges and their own validation, so a number can be weighed properly.",
        ]} />
      </Section>

      <Section title="Who built it">
        <p>
          Designed and built end to end — data pipeline, models, API and interface — by <b className="text-white">{SITE.fullName}</b>.
        </p>
        <p className="flex flex-wrap gap-x-4 gap-y-1">
          {hasLink(SITE.github) && <ExtLink href={SITE.github}>GitHub</ExtLink>}
          {hasLink(SITE.linkedin) && <ExtLink href={SITE.linkedin}>LinkedIn</ExtLink>}
          {hasLink(SITE.repo) && <ExtLink href={SITE.repo}>Source code</ExtLink>}
          <InLink href="/contact">Contact</InLink>
        </p>
      </Section>
    </InfoPage>
  );
}
