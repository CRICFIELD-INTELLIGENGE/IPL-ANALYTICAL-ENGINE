import { useEffect, useState } from "react";
import { Link } from "wouter";
import type { OfficialPlayer } from "@/lib/retention-official-api";

/** A current-roster planning tool; no historical XI is presented as a 2027 selection. */
export function RetainedXiPlanner({ team, players }: { team: string; players: OfficialPlayer[] }) {
  const [selected, setSelected] = useState<string[]>([]);
  useEffect(() => { setSelected([]); }, [team]);
  const roster = players.filter((p) => p.decision === "retained" || p.decision === "traded_in");
  const chosen = roster.filter((p) => selected.includes(p.id));
  const overseas = chosen.filter((p) => p.overseas).length;
  const keepers = chosen.filter((p) => p.group === "wicketkeeper").length;
  return <div className="space-y-4">
    <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
      <div><strong>{team} · Build from the 2027 retained squad</strong><p className="mt-1 text-xs text-white/60">Your selection, not an official matchday XI or model recommendation.</p></div>
      <button type="button" onClick={() => setSelected([])} className="rounded-lg border border-white/20 px-3 py-2 text-xs">Reset XI</button>
    </div>
    <p role="status" className="text-xs text-white/75">{chosen.length}/11 players · {overseas}/4 overseas · {keepers} wicketkeeper{keepers === 1 ? "" : "s"}{chosen.length === 11 && keepers === 0 ? " · Add a wicketkeeper" : ""}</p>
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3">
      {roster.map((player) => {
        const isSelected = selected.includes(player.id);
        const unavailable = !isSelected && (chosen.length >= 11 || Boolean(player.overseas && overseas >= 4));
        return <button key={player.id} type="button" aria-pressed={isSelected} disabled={unavailable} onClick={() => setSelected((current) => isSelected ? current.filter((id) => id !== player.id) : [...current, player.id])}
          className={`rounded-xl border p-3 text-left transition-colors disabled:opacity-40 ${isSelected ? "border-[var(--team-accent)] bg-white/10" : "border-white/10 hover:bg-white/5"}`}>
          <strong className="block text-sm">{isSelected ? "✓ " : ""}{player.name}</strong>
          <span className="text-xs text-white/60">{player.role ?? "Role pending"} · {player.overseas ? "Overseas" : "Indian"}</span>
        </button>;
      })}
    </div>
    {!roster.length && <p className="text-xs text-white/60">Loading the published retained squad…</p>}
    <Link href={`/ai-analyst/playing-xi?team=${team}`} className="inline-block text-xs text-primary underline">Open the historical XI optimizer</Link>
  </div>;
}
