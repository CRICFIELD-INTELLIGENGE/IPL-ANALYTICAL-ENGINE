import { Link } from "wouter";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { Layout } from "@/components/layout";
import { HUB_TEAMS } from "@/lib/ipl-2027";
import { TEAM_REGISTRY } from "@/lib/team-context";
import { publishedOfficialRoom, publishedRetentionSources } from "@/lib/retention-published";
import { formatPurse } from "@/lib/retention-official-api";

export default function Ipl2027RetentionsPage() {
  return (
    <Layout>
      <article className="max-w-5xl mx-auto space-y-6 p-4 sm:p-6 bg-[#050816] min-h-screen text-white">
        <Link href="/home" className="inline-flex items-center gap-1.5 text-xs text-white/60 hover:text-white"><ArrowLeft size={14} /> Home</Link>
        <header className="space-y-3">
          <p className="text-xs font-bold uppercase tracking-widest text-primary">IPL 2027 · Official retention records</p>
          <h1 className="text-2xl sm:text-4xl font-black leading-tight">IPL 2027 Retained and Released Players</h1>
          <p className="text-sm text-white/70">184 retained players, 89 releases and ₹297.95 Cr available across all ten teams. Checked against IPLT20 on 18 November 2026.</p>
          <p className="text-xs text-white/50">Player salaries and team salary-cap debits are separate values. Purses below follow the official team summary.</p>
          <div className="flex flex-wrap gap-3 text-xs">{publishedRetentionSources.map((source, i) => <a key={source.url} href={source.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-primary underline">{["IPLT20 announcement", "Retained player salary list", "Released player list"][i]}<ExternalLink size={12} /></a>)}</div>
        </header>
        <nav aria-label="Jump to franchise" className="flex flex-wrap gap-2">{HUB_TEAMS.map((team) => <a href={`#retentions-${team}`} key={team} className="rounded-lg border border-white/15 px-3 py-2 text-xs font-bold hover:bg-white/10">{team}</a>)}</nav>
        {HUB_TEAMS.map((team) => {
          const room = publishedOfficialRoom(team);
          const kept = room.players.filter((p) => p.decision === "retained" || p.decision === "traded_in");
          const released = room.players.filter((p) => p.decision === "released");
          return <section id={`retentions-${team}`} key={team} className="scroll-mt-24 space-y-4 border-t border-white/15 pt-6">
            <h2 className="text-xl font-black">{TEAM_REGISTRY[team].name}</h2>
            <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-white/80"><span>{room.summary.retained} retained · {room.summary.overseas} overseas</span><strong className="text-emerald-300">{formatPurse(room.purse.valueLakh)} remaining</strong><span>{room.summary.slots} slots · {room.summary.overseasSlots} overseas slots</span></div>
            <div className="grid gap-5 md:grid-cols-2">
              <div><h3 className="text-xs font-black uppercase tracking-widest text-emerald-400">Retained squad</h3><ul className="mt-3 divide-y divide-white/5">{kept.map((p) => <li key={p.id} className="flex items-baseline justify-between gap-3 py-2 text-sm"><span>{p.name}{p.overseas ? " *" : ""}{p.decision === "traded_in" ? " (T)" : ""}</span><span className="shrink-0 font-mono text-white/65">{formatPurse(p.contractLakh)}</span></li>)}</ul></div>
              <div><h3 className="text-xs font-black uppercase tracking-widest text-rose-400">Released</h3><ul className="mt-3 space-y-2 text-sm text-white/80">{released.map((p) => <li key={p.id}>{p.name}{p.overseas ? " *" : ""}</li>)}</ul><p className="mt-4 text-xs text-white/50">* Overseas · (T) Traded in. These are retained squads ahead of the auction.</p></div>
            </div>
            {room.notes.filter((note) => note.includes("do not reconcile")).map((note) => <p className="text-xs text-amber-200" key={note}>{note}</p>)}
            <div className="flex gap-4 text-sm"><Link href={`/retention-room/${team}`} className="text-primary underline">Open {team} Squad HQ</Link><Link href={`/tactics?team=${team}`} className="text-primary underline">Plan tactics</Link></div>
          </section>;
        })}
      </article>
    </Layout>
  );
}
