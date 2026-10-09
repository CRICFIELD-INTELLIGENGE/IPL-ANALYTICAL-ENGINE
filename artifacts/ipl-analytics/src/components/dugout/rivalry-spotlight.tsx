// Rivalry spotlight: the head-to-head record against the franchise's rival and
// its recent meetings, from the ball-by-ball record. The rival pairing is the
// one set in the team registry.

import { Link } from "wouter";
import type { TeamTheme } from "@/lib/team-context";
import type { FranchiseRecord } from "@/lib/dugout-api";

export function RivalrySpotlight({ team, rival, record }: { team: TeamTheme; rival: TeamTheme; record: FranchiseRecord | undefined }) {
  const h2h = record?.headToHead;
  return (
    <section id="rivalry" className="scroll-mt-24 rounded-2xl border border-white/10 bg-white/[0.03] p-4 sm:p-6 space-y-5 min-w-0">
      <header>
        <div className="text-[10px] font-mono uppercase tracking-widest text-white/40">Head to head · every meeting in the record</div>
        <h2 className="font-display font-black text-xl uppercase tracking-tight text-white">
          {team.shortName} vs {rival.shortName}
        </h2>
      </header>

      <div className="grid md:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-4">
        <RivalSide team={team} won={h2h?.won} />
        <div className="text-center">
          <div className="font-display font-black text-3xl text-white/40">{h2h ? `${h2h.played}` : "—"}</div>
          <div className="text-[10px] uppercase tracking-wider text-white/40">meetings</div>
        </div>
        <RivalSide team={rival} won={h2h?.lost} />
      </div>

      {h2h && h2h.recent.length > 0 && (
        <div className="space-y-1.5">
          <div className="text-[10px] font-black uppercase tracking-widest text-white/40">Most recent</div>
          <ul className="space-y-1.5 text-xs">
            {h2h.recent.map((m) => (
              <li key={m.matchId} className="flex flex-wrap gap-x-3 gap-y-0.5 text-white/75">
                <span className="tabular-nums text-white/45">{m.date}</span>
                <span className="truncate min-w-0 flex-1">{m.venue}</span>
                <span className="font-bold">{m.winner ?? "No result"}</span>
                {m.stage && <span className="text-amber-200/80 uppercase text-[10px]">{m.stage}</span>}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div>
        <Link href={`/ai-analyst/opposition-map?team=${team.id}&opp=${rival.id}`} className="text-xs font-bold text-white/75 hover:text-white underline underline-offset-4">
          Open the head-to-head briefing →
        </Link>
      </div>
    </section>
  );
}

function RivalSide({ team, won }: { team: TeamTheme; won: number | undefined }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.02] p-3 min-w-0">
      <div className="w-12 h-12 rounded-xl p-1.5 border shrink-0" style={{ borderColor: `${team.accent}55`, backgroundColor: team.surfaceTint }}>
        <img src={team.logoImg} alt={team.name} className="w-full h-full object-contain" />
      </div>
      <div className="min-w-0">
        <div className="font-bold text-sm text-white truncate">{team.name}</div>
        <div className="font-display font-black text-2xl tabular-nums" style={{ color: team.accent }}>{won ?? "—"}</div>
        <div className="text-[10px] uppercase tracking-wider text-white/40">wins</div>
      </div>
    </div>
  );
}
