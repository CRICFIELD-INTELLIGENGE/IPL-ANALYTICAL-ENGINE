// Mobile Scout Lab — "the scout's notebook": a parchment brief, then discovery cards from the server-side
// rankings (paged; the 18k-player registry is never loaded in the browser). Each card carries an evidence stamp
// (rankable / low / insufficient), league-relative indices, and a save-to-shortlist action shared with desktop.
import { useEffect, useState } from "react";
import { Link } from "wouter";
import { Bookmark, BookmarkCheck, Search } from "lucide-react";
import { fetchScoutRankings, isLowerBetter, type Discipline, type MatchPhase, type ScoutRankingsResponse, type ScoutRating } from "@/lib/scout-api";
import { useScoutShortlist } from "@/lib/scout-shortlist";
import { ErrorBox, Loading } from "../shell";

const METRICS: Record<Discipline, [string, string][]> = {
  batting: [["strike_rate", "Strike rate"], ["boundary_pct", "Boundary %"], ["dot_pct", "Dot %"]],
  bowling: [["economy", "Economy"], ["dot_pct", "Dot %"], ["boundary_pct", "Boundary %"]],
};
const TIER: Record<ScoutRating["tier"], string> = { rankable: "Rankable", low: "Thin sample", insufficient: "Insufficient" };

export default function MobileScout() {
  const initialQ = typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("q") ?? "" : "";
  const [discipline, setDiscipline] = useState<Discipline>("batting");
  const [phase, setPhase] = useState<MatchPhase>("all");
  const [q, setQ] = useState(initialQ);
  const [term, setTerm] = useState(initialQ);
  const [page, setPage] = useState(1);
  const [data, setData] = useState<ScoutRankingsResponse | null>(null);
  const [rows, setRows] = useState<ScoutRating[]>([]);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [retry, setRetry] = useState(0);
  const { isShortlisted, toggleShortlist, shortlist } = useScoutShortlist();

  useEffect(() => { const t = setTimeout(() => { setTerm(q.trim()); setPage(1); }, 300); return () => clearTimeout(t); }, [q]);
  useEffect(() => {
    let live = true;
    setState("loading");
    fetchScoutRankings({ discipline, phase, search: term || undefined, page, limit: 15, competitions: "ipl" })
      .then((r) => { if (!live) return; setData(r); setRows((prev) => (page === 1 ? r.data : [...prev, ...r.data])); setState("ready"); })
      .catch(() => live && setState("error"));
    return () => { live = false; };
  }, [discipline, phase, term, page, retry]);
  const reset = (fn: () => void) => { fn(); setPage(1); };

  return (
    <div>
      <section className="mx-notebook">
        <h2>Scout's notebook</h2>
        <p>IPL players rated against the league for the same balls — 100 is league average. Thin samples are stamped, never hidden.</p>
      </section>
      <label className="md-search" style={{ marginTop: 12 }}><Search size={18} aria-hidden="true" /><input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search a player" aria-label="Search the scouting registry" style={{ flex: 1, background: "transparent", border: 0, color: "var(--m-ivory)", fontSize: 16, minHeight: 46 }} /></label>
      <div className="mx-filters" role="group" aria-label="Filters">
        {(["batting", "bowling"] as Discipline[]).map((d) => <button key={d} type="button" className="cfm-chip" aria-pressed={discipline === d} onClick={() => reset(() => setDiscipline(d))}>{d === "batting" ? "Batters" : "Bowlers"}</button>)}
        <span aria-hidden="true" style={{ borderLeft: "1px solid var(--m-line)" }} />
        {(["all", "powerplay", "middle", "death"] as MatchPhase[]).map((p) => <button key={p} type="button" className="cfm-chip" aria-pressed={phase === p} onClick={() => reset(() => setPhase(p))}>{p === "all" ? "All phases" : p[0].toUpperCase() + p.slice(1)}</button>)}
      </div>
      {shortlist.length > 0 && <p className="cfm-small cfm-pad">{shortlist.length} on your shortlist · <Link href="/scout/compare" style={{ color: "var(--m-gold)" }}>compare</Link></p>}
      {state === "error" && rows.length === 0 ? <ErrorBox message="The scouting service is unavailable right now." onRetry={() => setRetry((n) => n + 1)} /> : state === "loading" && rows.length === 0 ? <Loading rows={4} h={120} /> : rows.length === 0 ? <div className="cfm-empty">No players match these filters.</div> : (
        <>
          {rows.map((r) => (
            <article key={`${r.cricsheet_id}-${r.discipline}`} className="mx-card">
              <div className="mx-card-top">
                <div><strong>{r.name}</strong><small>{r.teams.slice(-2).join(" · ") || "—"} · {r.matches} matches · {r.balls} balls · {r.seasons.at(-1)}</small></div>
                <span className={`mx-stamp ${r.tier}`}>{TIER[r.tier]}</span>
              </div>
              <div className="mx-metrics">
                {METRICS[r.discipline].map(([id, label]) => { const m = r.metrics[id]; const better = m?.index != null && (isLowerBetter(r.discipline, id) ? m.index < 100 : m.index > 100); return (
                  <div key={id}><small>{label}</small><b>{m?.value != null ? m.value.toFixed(1) : "—"}</b>{m?.index != null && <i style={{ color: better ? "var(--m-ok)" : "var(--m-red)" }}>{Math.round(m.index)}</i>}</div>
                ); })}
              </div>
              {(r.strengths?.length || r.weaknesses?.length) ? <p className="cfm-small" style={{ margin: 0 }}>{r.strengths?.[0] && <>✓ {r.strengths[0]} </>}{r.weaknesses?.[0] && <>· ✗ {r.weaknesses[0]}</>}</p> : null}
              <div style={{ display: "flex", gap: 8 }}>
                <Link href={`/scout/player/${r.cricsheet_id}`} className="cfm-btn" style={{ flex: 1, minHeight: 40 }}>Scout report</Link>
                <button type="button" className="cfm-btn" style={{ minHeight: 40 }} aria-pressed={isShortlisted(r.cricsheet_id)} onClick={() => toggleShortlist(r)} aria-label={isShortlisted(r.cricsheet_id) ? `Remove ${r.name} from shortlist` : `Add ${r.name} to shortlist`}>{isShortlisted(r.cricsheet_id) ? <BookmarkCheck size={18} /> : <Bookmark size={18} />}</button>
              </div>
            </article>
          ))}
          {data && page < data.pagination.totalPages && <div className="cfm-pad" style={{ marginTop: 14 }}><button type="button" className="cfm-btn" style={{ width: "100%" }} disabled={state === "loading"} onClick={() => setPage((p) => p + 1)}>{state === "loading" ? "Loading…" : `Show more (${data.pagination.total - rows.length} left)`}</button></div>}
        </>
      )}
      <p className="cfm-provenance">Ratings from the CRICFIELD Scout service: index = 100 × the player's rate ÷ the league rate for the same competition, season and phase. Colour shows above or below average.</p>
    </div>
  );
}
