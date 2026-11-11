// Mobile Journal — "the cricket journal": a typographic magazine cover for the lead story (no stock photography),
// franchise filters, and a reading list. Articles open in the existing long-form reader.
import { useMemo, useState } from "react";
import { Link } from "wouter";
import { getV2Index } from "@/lib/editorial-v2";
import { TEAM_REGISTRY, useTeamTheme, type TeamCode } from "@/lib/team-context";

export default function MobileJournal() {
  const { selectedTeam } = useTeamTheme();
  const all = useMemo(() => getV2Index(), []);
  const [team, setTeam] = useState<TeamCode | "ALL">(selectedTeam ?? "ALL");
  const [shown, setShown] = useState(20);
  const list = team === "ALL" ? all : all.filter((a) => a.franchise === team);
  const [lead, ...rest] = list;
  const accent = (f: string) => TEAM_REGISTRY[f as TeamCode]?.accent ?? "#e6bd68";
  return (
    <div>
      {lead ? (
        <Link href={`/dugout/articles/${lead.slug}`} className="mj-cover" style={{ ["--c" as string]: accent(lead.franchise) }}>
          <span className="band" aria-hidden="true" />
          <div className="mast"><span>The CRICFIELD Journal</span><span>{lead.franchise}</span></div>
          <div><h2>{lead.title}</h2><p>{lead.dek}</p></div>
          <span style={{ font: "700 12px var(--m-ui)", letterSpacing: ".18em", textTransform: "uppercase" }}>Read the story →</span>
        </Link>
      ) : <div className="cfm-empty">No published stories yet.</div>}
      <div className="mj-filter" role="group" aria-label="Franchise">
        <button type="button" className="cfm-chip" aria-pressed={team === "ALL"} onClick={() => { setTeam("ALL"); setShown(20); }}>All</button>
        {(Object.keys(TEAM_REGISTRY) as TeamCode[]).map((c) => <button key={c} type="button" className="cfm-chip" aria-pressed={team === c} onClick={() => { setTeam(c); setShown(20); }}>{c}</button>)}
      </div>
      <section className="cfm-pad">
        {rest.slice(0, shown).map((a) => (
          <Link key={a.id} href={`/dugout/articles/${a.slug}`} className="mj-item">
            <span className="cfm-kicker" style={{ fontSize: 10, color: accent(a.franchise) }}>{a.franchise} · {a.aspect}</span>
            <h3>{a.title}</h3>
            <p>{a.dek}</p>
          </Link>
        ))}
        {rest.length > shown && <button type="button" className="cfm-btn" style={{ width: "100%", marginTop: 14 }} onClick={() => setShown((n) => n + 20)}>More stories ({rest.length - shown})</button>}
      </section>
      <p className="cfm-provenance">Stories from the CRICFIELD editorial desk. Pieces still under editorial review appear only in development builds.</p>
    </div>
  );
}
