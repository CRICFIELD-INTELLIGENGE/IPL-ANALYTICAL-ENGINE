import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { GameShell } from "@/components/arcade/kit";
import { fetchOfficialRoom, formatPurse } from "@/lib/retention-official-api";
import { TEAM_REGISTRY, isTeamCode } from "@/lib/team-context";
import { OfficialProvenance } from "./official-overview";

/** Current-cycle handoff. The historical arcade simulation must never silently
 * receive released players as registered auction lots or an estimated purse. */
export function OfficialAuctionReadiness({team:requested}:{team:string}) {
  const team=isTeamCode(requested)?requested:"RCB",theme=TEAM_REGISTRY[team];
  const q=useQuery({queryKey:["retention-official",2027,team],queryFn:()=>fetchOfficialRoom(2027,team),staleTime:300_000,retry:false});
  return <GameShell game="auction-room" theme="pav-auction" wide><div className="space-y-5 p-4" style={{"--team-accent":theme.accent} as React.CSSProperties}>
    <Link className="ret-link" href={`/retention-room/${team}`}>← Back to Retention Room</Link>
    <section className="ret-panel"><p className="ret-eyebrow">IPL 2027 · {team}</p><h1 className="text-2xl font-black mt-2">Auction Readiness</h1>
      {q.isPending&&<p role="status">Checking retained squad, purse and registration sources…</p>}
      {q.isError&&<div role="alert"><p>Official auction inputs could not be loaded.</p><button className="ret-action" onClick={()=>void q.refetch()}>Retry inputs</button></div>}
      {q.data&&<><div className="ret-composition"><div><strong>{q.data.summary.retained}</strong><span>Retained squad</span></div><div><strong>{formatPurse(q.data.auction.purseLakh)}</strong><span>Verified remaining purse</span></div><div><strong>{q.data.summary.slots}</strong><span>Slots to fill</span></div><div><strong>{q.data.auction.registeredPool.length}</strong><span>Verified registered auction lots</span></div></div>
        <p className="font-bold">Official 2027 auction initialization is pending.</p><p>{q.data.auction.note} {q.data.auction.registeredPool.length===0?"The official registration list is not available in the verified dataset.":"The current auction game uses historical simulation rules; current-cycle inputs require a reviewed game configuration before starting."}</p>
        <p className="ret-small mt-3">The retained IDs and confirmed purse are carried into this review. No bids or auction room have been created.</p>
        <details className="mt-4 text-sm"><summary className="cursor-pointer">Retained squad input</summary><p className="mt-2">{q.data.players.filter(p=>["retained","traded_in"].includes(p.decision)).map(p=>p.name).join(" · ")}</p></details>
        <div className="flex flex-wrap gap-5 mt-5"><Link className="ret-link" href={`/scout?team=${team.toLowerCase()}`}>Continue scouting →</Link></div>
      </>}
    </section>{q.data&&<OfficialProvenance data={q.data}/>}</div></GameShell>;
}
