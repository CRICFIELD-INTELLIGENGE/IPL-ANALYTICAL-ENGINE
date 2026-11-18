import { Link } from "wouter";
import { publishedOfficialRoom, publishedRetentionSources } from "@/lib/retention-published";
import { formatPurse } from "@/lib/retention-official-api";
import { TEAM_REGISTRY, type TeamCode } from "@/lib/team-context";

export function CurrentSquadContext({ team, opponent }: { team: TeamCode; opponent: TeamCode }) {
  return <section className="tb-panel space-y-4" aria-labelledby="current-squads-title">
    <div className="tb-section-head"><h2 id="current-squads-title">IPL 2027 · Official retained squads</h2><Link href="/retentions">All teams</Link></div>
    <p className="text-xs text-white/65">Current squad membership and prices follow IPLT20, reviewed 18 November 2026. The simulator below uses the selected historical season; it is not a simulation of these 2027 squads.</p>
    <div className="grid gap-5 lg:grid-cols-2">{[team, opponent].map((code) => {
      const room = publishedOfficialRoom(code);
      const players = room.players.filter((p) => p.decision === "retained" || p.decision === "traded_in");
      return <div key={code} className="min-w-0 space-y-3 rounded-xl border border-white/10 p-4">
        <h3 className="font-bold">{TEAM_REGISTRY[code].name}</h3>
        <p className="text-xs text-white/65">{players.length} retained · {room.summary.overseas} overseas · {room.summary.slots} squad slots · {formatPurse(room.purse.valueLakh)} purse</p>
        <ul className="flex flex-wrap gap-2">{players.map((p) => <li key={p.id} className="rounded-lg border border-white/10 px-2 py-1 text-xs">{p.name}{p.overseas ? " *" : ""}{p.decision === "traded_in" ? " (T)" : ""}</li>)}</ul>
        <Link href={`/retention-room/${code}`} className="inline-block text-xs text-primary underline">Open {code} squad and prices</Link>
      </div>;
    })}</div>
    <p className="text-xs text-white/50">* Overseas · (T) Traded in. Final squads will change after the auction. <a className="text-primary underline" href={publishedRetentionSources[0].url} target="_blank" rel="noreferrer">IPLT20 source</a></p>
  </section>;
}
