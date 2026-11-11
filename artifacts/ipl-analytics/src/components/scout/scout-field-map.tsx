import type { ScoutRating, Discipline } from "@/lib/scout-api";

export function ScoutFieldMap({ rows, discipline, selected, onSelect }: { rows: ScoutRating[]; discipline: Discipline; selected: ScoutRating | null; onSelect: (row: ScoutRating) => void }) {
  const metric = discipline === "batting" ? "strike_rate" : "economy";
  const points=rows.filter(r=>r.balls>0 && r.metrics[metric]?.value!=null);
  const rates=points.map(r=>r.metrics[metric].value!);
  const lo=Math.min(...rates), hi=Math.max(...rates);
  const maxBalls=Math.max(1,...points.map(r=>r.balls));
  return <section className="scout-field-sheet" aria-labelledby="field-map-title">
    <header><div><span className="scout-sheet-label">FIELD NOTES / CURRENT RESULTS</span><h2 id="field-map-title">Where the evidence sits.</h2></div><p>Raw {discipline==='batting'?'strike rate':'economy'} × balls<br/>Current page only · leagues remain distinct</p></header>
    {points.length ? <><div className="scout-field-map"><span className="scout-field-y">MORE BALLS →</span><div className="scout-field-dots">{points.map((r,i)=>{
      const x=hi===lo?50:8+84*(r.metrics[metric].value!-lo)/(hi-lo); const y=88-76*r.balls/maxBalls;
      return <button key={`${r.cricsheet_id}-${r.competition}`} style={{left:`${x}%`,top:`${y}%`}} className={selected?.cricsheet_id===r.cricsheet_id && selected?.competition===r.competition?'selected':''} onClick={()=>onSelect(r)} aria-label={`Inspect ${r.name}, ${r.competition}, ${r.balls} balls, ${metric} ${r.metrics[metric].value!.toFixed(1)}`} title={`${r.name} · ${r.competition.toUpperCase()} · ${r.metrics[metric].value!.toFixed(1)} · ${r.balls} balls`}><span>{String(i+1).padStart(2,'0')}</span>{(i<4 || selected?.cricsheet_id===r.cricsheet_id) && <small>{r.name}</small>}</button>;
    })}</div><div className="scout-field-axis"><span>{Number.isFinite(lo)?lo.toFixed(1):'—'}</span><span>{discipline==='batting'?'STRIKE RATE →':'ECONOMY → (LOWER IS BETTER)'}</span><span>{Number.isFinite(hi)?hi.toFixed(1):'—'}</span></div></div><p className="scout-field-footnote">Each mark is a player–competition record. Select a mark to inspect the dossier below. Raw rates describe this sample; they do not establish cross-league player quality.</p></> : <div className="scout-map-empty">No plottable records yet. Run a scouting brief or adjust your filters.</div>}
  </section>;
}
