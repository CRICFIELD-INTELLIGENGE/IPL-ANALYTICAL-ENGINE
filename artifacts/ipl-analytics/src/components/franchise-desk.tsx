import { Link, useSearch } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { fetchOfficialRoom, formatPurse } from "@/lib/retention-official-api";
import { isTeamCode, useTeamTheme } from "@/lib/team-context";

const desks = [["Retention Room", "/retention-room"], ["Auction", "/auction"], ["Tactics", "/tactics"], ["Pulse", "/pulse"], ["Storylines", "/storylines"]] as const;

export function FranchiseDesk({ team, summary = true }: { team?: string; summary?: boolean }) {
  const requested = new URLSearchParams(useSearch()).get("team")?.toUpperCase() ?? "";
  const { selectedTeam } = useTeamTheme();
  const code = team ?? (isTeamCode(requested) ? requested : selectedTeam ?? "CSK");
  const room = useQuery({
    queryKey: ["retention-official", 2027, code],
    queryFn: () => fetchOfficialRoom(2027, code),
    enabled: summary,
    staleTime: 300_000,
  });
  return <section className="my-3 rounded-xl border border-current/15 p-3" aria-label="Franchise desk">
    <nav className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm" aria-label="IPL franchise pages">
      <strong>{code} · IPL 2027</strong>
      {desks.map(([label, path]) => <Link key={path} className="underline underline-offset-4" href={path === "/retention-room" ? `/retention-room/${code}` : `${path}?team=${code}`}>{label}</Link>)}
    </nav>
    {summary && (room.data ? <details className="mt-2 text-sm"><summary className="cursor-pointer">
      {room.data.summary.retained} retained · {room.data.summary.released} released · Purse {formatPurse(room.data.purse.valueLakh)} ({room.data.purse.status})
    </summary><p className="mt-2">Decisions verified against official sources: {room.data.summary.verifiedDecisions}. Open Retention Room for each source and trade.</p>
    <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1">{room.data.players.filter(p => p.decision === "retained" || p.decision === "traded_in").map(p => <li key={p.id}>{p.name} ({p.verification})</li>)}</ul></details>
    : <p role="status" className="mt-2 text-sm">{room.isError ? <button onClick={() => room.refetch()}>Retry retention data</button> : "Loading retention decisions…"}</p>)}
  </section>;
}
