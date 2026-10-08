/**
 * DATA SOURCES — provenance for everything on the site: what each source
 * supplies, coverage, how it is used and on what terms, plus the warehouse's
 * live coverage and reconciliation checks.
 */

import { useQuery } from "@tanstack/react-query";
import { Bullets, Callout, ExtLink, Field, InLink, InfoPage, Panel, Section } from "@/components/site/info-page";
import { fetchHistoryOverview } from "@/lib/ask-api";
import { MOCK_OVERVIEW } from "@/components/decision/ask-mock";

const TOC = [
  { id: "coverage", label: "Coverage" },
  { id: "cricsheet", label: "Cricsheet" },
  { id: "commentary", label: "ESPNcricinfo commentary" },
  { id: "auctions", label: "Auction records" },
  { id: "auction-list", label: "2026 auction list" },
  { id: "attributes", label: "Player attributes" },
  { id: "live", label: "Live scores and news" },
  { id: "images", label: "Images and logos" },
  { id: "health", label: "Data health checks" },
];

const STATUS_TONE: Record<string, string> = { ok: "text-emerald-300", warn: "text-amber-300", info: "text-slate-400" };

export default function DataSourcesPage() {
  const q = useQuery({ queryKey: ["history-overview"], queryFn: fetchHistoryOverview, retry: 1, staleTime: 30 * 60_000 });
  const live = Boolean(q.data);
  const o = q.data ?? MOCK_OVERVIEW;
  const c = o.coverage;
  return (
    <InfoPage
      eyebrow="Data Sources"
      title="Where the data comes from"
      intro={<>Every figure on the site traces back to one of the sources below. For each: what it supplies, how much of the IPL it covers, how it is used and the terms it is used under. How the numbers are then calculated is on the <InLink href="/methodology">Methodology</InLink> page.</>}
      updated="8 October 2026"
      toc={TOC}
    >
      <Section id="coverage" title="Coverage">
        <dl className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            ["Deliveries", c.deliveries.toLocaleString("en-US")],
            ["Matches", c.matches.toLocaleString("en-US")],
            ["Seasons", `${c.firstSeason}–${c.lastSeason}`],
            ["Players", c.players.toLocaleString("en-US")],
            ["Venues", c.venues.toLocaleString("en-US")],
            ["Franchises", c.franchises.toLocaleString("en-US")],
            ["First match", c.firstMatch ?? "—"],
            ["Latest match", c.lastMatch ?? "—"],
          ].map(([label, value]) => (
            <div key={label} className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3">
              <dd className="font-display font-bold text-lg text-white tabular-nums">{value}</dd>
              <dt className="text-[11px] text-slate-400 mt-0.5">{label}</dt>
            </div>
          ))}
        </dl>
        <p className="text-xs text-slate-500">{live ? "Read live from the warehouse." : "The analytics API isn't reachable right now, so these are the figures from the last saved snapshot."}</p>
      </Section>

      <Panel id="cricsheet" kicker="Primary source" title="Cricsheet — ball-by-ball match data">
        <Field label="Supplies">Every delivery of every IPL match: batter, bowler, non-striker, runs, extras, dismissals, fielders, match result, toss, venue, playoff stage and revised (DLS) targets.</Field>
        <Field label="Coverage">All {c.matches.toLocaleString("en-US")} IPL matches from {c.firstSeason} to {c.lastSeason} that Cricsheet records, in JSON and CSV.</Field>
        <Field label="Used for">The warehouse behind every stat, model and page: scorecards, leaderboards, impact ratings, win probability, simulations, Squad DNA, player similarity. Stumpings in the raw files also identify recent wicketkeepers.</Field>
        <Field label="Changes made">Loaded into a relational warehouse (matches, innings, deliveries, dismissals, players, venues); super overs excluded from statistics; seasons labelled by the year played; renamed franchises and venues given one identity.</Field>
        <Field label="Terms">Data from <ExtLink href="https://cricsheet.org/">Cricsheet</ExtLink>, used under the <ExtLink href="https://opendatacommons.org/licenses/by/1-0/">Open Data Commons Attribution License</ExtLink> (see <ExtLink href="https://cricsheet.org/licensing/">Cricsheet licensing</ExtLink>).</Field>
      </Panel>

      <Panel id="commentary" kicker="Enrichment" title="ESPNcricinfo — ball-by-ball commentary">
        <Field label="Supplies">The written commentary for each ball, from which line, length, delivery variation, shot, scoring zone and (where stated) ball speed are parsed.</Field>
        <Field label="Coverage">Joined to the deliveries table innings by innings. An innings is joined only when the two records agree: over numbers match on every aligned ball and runs on all of them. Any innings that disagrees is left out rather than attached to the wrong balls.</Field>
        <Field label="Used for">The Commentary tab on match pages, delivery-type and scoring-area breakdowns, and pace-or-spin classification (a bowler's fastest recorded ball).</Field>
        <Field label="Terms">Commentary text is written and owned by <ExtLink href="https://www.espncricinfo.com/">ESPNcricinfo</ExtLink> and is credited wherever it is shown.</Field>
      </Panel>

      <Panel id="auctions" kicker="Market data" title="Wikipedia — IPL auction and retention records">
        <Field label="Supplies">Sold-player tables (player, buying franchise, fee) and retention lists from the IPL auction articles, 2008–2026.</Field>
        <Field label="Coverage">Fees in rupees (₹ lakh) from 2014 onward; earlier auctions were priced in US dollars and are kept separate. The source has no retention tables for 2014–2017.</Field>
        <Field label="Used for">Auction fees on player and team pages, season squads, and the <InLink href="/ai-analyst/auction-war-room">Auction War Room</InLink>'s comparable-sales model and 2026 backtest.</Field>
        <Field label="Changes made">Parsed from the raw article source rather than a summary, so no rows are dropped. Names matched to the ball-by-ball record by exact name, or initial + surname only when exactly one player fits.</Field>
        <Field label="Terms">Compiled from <ExtLink href="https://en.wikipedia.org/wiki/Indian_Premier_League">Wikipedia</ExtLink>'s IPL season and auction articles, available under <ExtLink href="https://creativecommons.org/licenses/by-sa/4.0/">CC BY-SA 4.0</ExtLink>.</Field>
      </Panel>

      <Panel id="auction-list" kicker="Market data" title="2026 IPL auction player list">
        <Field label="Supplies">The 369 players registered for the 2026 auction: set, specialism, batting hand, bowling style, nationality, international and IPL caps, capped or uncapped, and reserve price.</Field>
        <Field label="Used for">The pool and reserve prices in the War Room's 2026 backtest, and a fallback for nationality and playing style.</Field>
        <Field label="Terms">The published auction list belongs to the IPL.</Field>
      </Panel>

      <Panel id="attributes" kicker="Reference" title="Player attributes">
        <Field label="Supplies">Full names, batting hand and bowling style.</Field>
        <Field label="Used for">Player profiles, left/right-hand splits and bowling-type matchups.</Field>
        <Field label="Checks">Bowling type is overridden by recorded ball speeds where they exist. Overseas status comes from season squad lists matched by exact name; it is never inferred from a fuzzy match, because it drives the four-overseas rule.</Field>
      </Panel>

      <Panel id="live" kicker="Live" title="Live scores and news">
        <Field label="Supplies">In-season live scores from <ExtLink href="https://www.cricbuzz.com/">Cricbuzz</ExtLink> and headlines from the <ExtLink href="https://www.espncricinfo.com/">ESPNcricinfo</ExtLink> RSS feed.</Field>
        <Field label="Used for">The Scores page, the live score in the header and the news desk. Requests are cached on the server (30 seconds for scores, 60 for news), and headlines link back to the original story.</Field>
        <Field label="Terms">Scores and articles belong to their publishers. Nothing from the live feed goes into the historical warehouse or the models.</Field>
      </Panel>

      <Panel id="images" kicker="Media" title="Images and logos">
        <Field label="Supplies">Player photographs, franchise logos and venue images.</Field>
        <Field label="Terms">These belong to their respective owners, including the IPL, the franchises and the photographers, and are used only to identify players, teams and grounds. See the <InLink href="/disclaimer">Disclaimer</InLink>.</Field>
      </Panel>

      <Section id="health" title="Data health checks">
        <p>The warehouse is reconciled against itself every time the server starts. These are the current results:</p>
        <ul className="space-y-2">
          {o.health.map((h) => (
            <li key={h.id} className="rounded-xl border border-white/10 bg-white/[0.02] px-4 py-3 text-sm">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <span className="font-semibold text-white">{h.label}</span>
                <span className={`tabular-nums font-semibold ${STATUS_TONE[h.status] ?? "text-slate-300"}`}>{h.value}</span>
              </div>
              <div className="text-[13px] text-slate-400 mt-0.5">{h.detail}</div>
            </li>
          ))}
        </ul>
        <Callout>Spotted something wrong? Corrections to the underlying match data are best reported to Cricsheet so everyone benefits; anything specific to this site can go through the <InLink href="/contact">Contact</InLink> page.</Callout>
      </Section>

      <Section title="Not used">
        <Bullets items={[
          "No betting odds, private data or data from paywalled services.",
          <>No personal data about visitors goes into any model (see <InLink href="/privacy">Privacy</InLink>).</>,
        ]} />
      </Section>
    </InfoPage>
  );
}
