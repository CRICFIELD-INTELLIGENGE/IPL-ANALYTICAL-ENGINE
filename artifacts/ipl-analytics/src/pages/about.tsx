/**
 * CricField's current coverage, tools, data approach and public profile.
 */
import { Bullets, ExtLink, InLink, InfoPage, Section } from "@/components/site/info-page";
import { useOverview } from "@/lib/aggregates";
import { SITE, hasLink } from "@/lib/site-profile";

const MODULES = [
  { phase: "Explore the game", items: [
    { href: "/stats", name: "Stats Centre", what: "Explore historical player, team and match records with filters for the question you want to answer." },
    { href: "/venues", name: "Venue Intelligence", what: "Compare innings patterns, pace and spin, player records and match history at each ground." },
    { href: "/scores", name: "Scores", what: "Follow fixtures and open match scorecards and commentary." },
  ] },
  { phase: "Scout with context", items: [
    { href: "/pressurelab", name: "Pressure Lab", what: "Study performance in specific match situations and compare players across your selected seasons." },
    { href: "/scout", name: "Scout Lab", what: "Explore player options through roles, performance filters and the available scouting data." },
    { href: "/ai-analyst", name: "Decision Intelligence", what: "Explore database questions, opposition analysis, simulations and auction valuation tools." },
  ] },
  { phase: "Build for IPL 2027", items: [
    { href: "/retentions", name: "Retentions", what: "Explore franchise retention and release information for the upcoming season." },
    { href: "/retention-room", name: "Retention Room", what: "Review the squad core, available places and recruitment needs." },
    { href: "/auction", name: "Auction", what: "Follow auction coverage, team updates and the live blog." },
    { href: "/auction-strategy", name: "Auction Strategy", what: "Connect player choices, budgets and squad needs to a recruitment plan." },
  ] },
  { phase: "Read the bigger picture", items: [
    { href: "/tactics", name: "Tactics", what: "Explore team combinations, roles and tactical choices." },
    { href: "/dugout", name: "Dugout", what: "Read CricField's cricket analysis, articles and franchise stories." },
    { href: "/storylines", name: "Storylines", what: "Follow the players, rivalries and decisions shaping the next season." },
  ] },
];
const number = (value?: number) => value == null ? "—" : value.toLocaleString("en-IN");

export default function AboutPage() {
  const overview = useOverview();
  const data = overview.data;
  const stats = [
    { label: "Historical matches", value: number(data?.totalMatches) },
    { label: "Seasons covered", value: data ? `${data.firstSeason}–${data.lastSeason}` : "—" },
    { label: "Runs recorded", value: number(data?.totalRuns) },
    { label: "Wickets recorded", value: number(data?.totalWickets) },
  ];
  return <InfoPage eyebrow="About CricField" title="Beyond the Boundary"
    intro={<>CricField brings cricket data, scouting, strategy and storytelling together. Explore the IPL record, understand what changes under pressure, and connect player performance to decisions about squads, auctions and tactics.</>}>
    <dl className="grid grid-cols-2 sm:grid-cols-4 gap-3" aria-label="Historical data coverage">
      {stats.map(s => <div key={s.label} className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3">
        <dd className="font-display font-black text-xl text-white tabular-nums">{s.value}</dd>
        <dt className="text-[11px] text-slate-400 mt-0.5">{s.label}</dt>
      </div>)}
    </dl>
    {overview.isLoading && <p role="status">Loading historical coverage…</p>}
    {overview.isError && <p role="alert">Historical coverage could not load. <button onClick={() => overview.refetch()} className="text-cyan-300 underline">Try again</button></p>}

    <Section title="Cricket intelligence, connected">
      <p>A player's numbers mean more when you know their role, the ground, the opposition and the match situation. CricField connects those views so you can move from a stat to a scouting question, a squad choice or a tactical idea.</p>
      <div className="grid sm:grid-cols-2 gap-3 pt-1">
        {MODULES.map(group => <div key={group.phase} className="rounded-xl border border-white/10 bg-white/[0.02] p-4 space-y-2">
          <h3 className="text-[10px] font-bold uppercase tracking-widest text-cyan-300">{group.phase}</h3>
          <ul className="space-y-3">{group.items.map(item => <li key={item.href} className="text-sm">
            <InLink href={item.href}>{item.name}</InLink>
            <p className="text-slate-400 text-[13px] leading-snug">{item.what}</p>
          </li>)}</ul>
        </div>)}
      </div>
    </Section>
    <Section title="How we use data">
      <Bullets items={[
        <>Historical analysis starts with Cricsheet ball-by-ball records in the CricField warehouse. Player profiles, squad updates and other records are joined where matching information is available. See <InLink href="/data-sources">Data Sources</InLink>.</>,
        <>Season, role and match-situation filters define the sample. Rates are calculated from that sample, and a small sample deserves more caution than a long record.</>,
        <>Reported retention and auction information is distinct from CricField's own scouting views and model outputs. An analytical recommendation is a judgement, not an official franchise decision.</>,
        <>Simulations and projections describe possible outcomes. Explore the assumptions and calculations on the <InLink href="/methodology">Methodology</InLink> page.</>,
      ]} />
    </Section>
    <Section title="Built by Srihari">
      <p>CricField is an independent cricket analytics project designed and built by <b className="text-white">{SITE.fullName}</b>, bringing together data engineering, product thinking and a love for the game.</p>
      <p>From the first ball in the database to a decision in the auction room, the aim is simple: make cricket analysis useful and clear.</p>
      <p className="flex flex-wrap gap-x-4 gap-y-2">
        {hasLink(SITE.github) && <ExtLink href={SITE.github}>GitHub</ExtLink>}
        {hasLink(SITE.linkedin) && <ExtLink href={SITE.linkedin}>LinkedIn</ExtLink>}
        {hasLink(SITE.repo) && <ExtLink href={SITE.repo}>Source code</ExtLink>}
        <InLink href="/contact">Contact</InLink>
      </p>
    </Section>
    <Section title="Follow CricField">
      <p>Follow <ExtLink href={SITE.instagram}>@cricfield.in on Instagram</ExtLink> for cricket stories, analysis and updates from the project.</p>
    </Section>
  </InfoPage>;
}
