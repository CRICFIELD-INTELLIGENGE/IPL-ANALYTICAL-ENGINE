// Mobile Discover — "the stands": every feature organised as four stands of a ground, each with its own colour,
// gate numbers and a one-line promise of what you will find there. Search opens the shared search sheet.
import { useMemo, useState } from "react";
import { Link } from "wouter";
import { ChevronRight, Search } from "lucide-react";
import { SearchSheet } from "../shell";
import { featureFor, readUsage } from "../usage";

const STANDS: { name: string; tag: string; stand: string; gates: [string, string, string][] }[] = [
  { name: "The numbers", tag: "STAND A", stand: "#103a38", gates: [
    ["Stats", "Leaders, seasons, phases and franchise records from every IPL ball", "/stats"],
    ["IPL Intelligence", "The data desk: computed insights with their samples shown", "/intelligence"],
    ["Scores", "Live and recent matches, scorecards and win probability", "/scores"],
  ] },
  { name: "The people", tag: "STAND B", stand: "#174a3a", gates: [
    ["Teams", "Ten franchises — squads, titles, form and story", "/teams"],
    ["Scout Lab", "Search the player registry and build shortlists", "/scout"],
    ["Compare players", "Two players, side by side, on the same scale", "/scout/compare"],
  ] },
  { name: "The market", tag: "STAND C", stand: "#3a2a12", gates: [
    ["Auction War Room", "Model prices, value and fit for the next auction", "/ai-analyst/auction-war-room"],
    ["Retention Room", "Retain or release — model, editorial and fan views kept apart", "/retention-room"],
    ["Squad Builder", "Build a squad and see the best XII it can field", "/ai-analyst/squad-builder"],
  ] },
  { name: "The stories", tag: "STAND D", stand: "#2b1d33", gates: [
    ["Journal", "Long-form franchise analysis from the CRICFIELD desk", "/reports"],
    ["Intelligence feed", "Daily stories from the data", "/feed"],
    ["IPL 2027", "Retentions, trades and the road to the next season", "/feed/ipl-2027"],
  ] },
];

export default function MobileDiscover() {
  const [search, setSearch] = useState(false);
  const [usage] = useState(readUsage);
  // Stands follow this person's usage: a stand ranks by its most-used gate.
  const stands = useMemo(() => {
    const gateScore = (href: string) => { const f = featureFor(href); return f ? usage.score(f.id) : 0; };
    return [...STANDS].sort((a, b) => Math.max(...b.gates.map((g) => gateScore(g[2]))) - Math.max(...a.gates.map((g) => gateScore(g[2]))));
  }, [usage]);
  return (
    <div>
      <button type="button" className="md-search" onClick={() => setSearch(true)}><Search size={18} aria-hidden="true" />Search players, franchises, features</button>
      <section className="md-mine" aria-labelledby="md-mine">
        <h2 id="md-mine" className="cfm-kicker">{usage.learned ? "Your most used" : "Popular to start"}</h2>
        <div className="cfm-strip">
          {usage.features.slice(0, 6).map((f) => <Link key={f.id} href={f.href} className="cfm-chip"><f.icon size={14} aria-hidden="true" />{f.label}</Link>)}
        </div>
      </section>
      {stands.map((s, si) => (
        <section key={s.name} className="md-stand" style={{ ["--stand" as string]: s.stand }} aria-labelledby={`stand-${si}`}>
          <div className="md-stand-head"><h2 id={`stand-${si}`}>{s.name}</h2><span>{s.tag}</span></div>
          {s.gates.map(([title, line, href], gi) => (
            <Link key={href} href={href} className="md-gate">
              <span><strong>{title}</strong><small>{line}</small></span>
              <span style={{ display: "flex", alignItems: "center", gap: 6 }}><span className="no">G{si + 1}{gi + 1}</span><ChevronRight size={18} aria-hidden="true" /></span>
            </Link>
          ))}
        </section>
      ))}
      {search && <SearchSheet onClose={() => setSearch(false)} />}
    </div>
  );
}
