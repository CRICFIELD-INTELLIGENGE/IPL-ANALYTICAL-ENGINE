import { Link } from "wouter";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { Layout } from "@/components/layout";
import { HUB_TEAMS } from "@/lib/ipl-2027";
import { TEAM_REGISTRY } from "@/lib/team-context";
import { useIpl2027Desk, crore, stamp } from "@/lib/ipl-2027-desk";

// The retention-day lead story. Structure exists in advance; every row comes from a sourced desk record,
// so before official announcements the page says so instead of showing anything provisional as fact.
export default function Ipl2027RetentionsPage() {
  const { data: desk, isLoading, isError } = useIpl2027Desk();
  const rows = desk?.retentions ?? [];
  const latest = rows.reduce((a, r) => (r.recordedAt > a ? r.recordedAt : a), "");

  return (
    <Layout>
      <article className="max-w-4xl mx-auto space-y-6 p-4 bg-[#050816] min-h-screen">
        <Link href="/feed" className="inline-flex items-center gap-1.5 text-xs text-white/50 hover:text-white">
          <ArrowLeft className="w-3.5 h-3.5" /> IPL 2027 Feed
        </Link>
        <header>
          <div className="text-[10px] font-black uppercase tracking-[0.25em] text-primary">IPL 2027 / Squad Building</div>
          <h1 className="text-2xl sm:text-4xl font-black text-white mt-1 leading-tight">
            IPL 2027 Retentions: Full List of Retained and Released Players Across All 10 Teams
          </h1>
          <p className="text-white/60 text-sm mt-2">
            Every franchise's confirmed retained and released players, with the official source for each decision.
          </p>
          <div className="text-[11px] text-white/40 mt-2">
            CricField Editorial Desk{latest ? ` · Updated ${stamp(latest)}` : ""}
          </div>
        </header>

        {isLoading && <p className="text-sm text-white/50">Loading official records…</p>}
        {isError && <p className="text-sm text-white/50">Official records are unavailable right now. Try again shortly.</p>}
        {desk && rows.length === 0 && (
          <div className="rounded-2xl border border-amber-400/30 bg-amber-400/10 p-4 text-sm text-amber-100">
            <b>Awaiting official announcements.</b> No franchise has confirmed its retained players yet, so no names are listed.
            Team lists appear here as each one is officially announced.
          </div>
        )}

        {rows.length > 0 && HUB_TEAMS.map((team) => {
          const own = rows.filter((r) => r.team === team);
          return (
            <section key={team} className="border-t border-white/10 pt-4">
              <h2 className="text-lg font-black text-white">
                <Link href={`/dugout/${team.toLowerCase()}`}>{TEAM_REGISTRY[team].name}</Link>
              </h2>
              {own.length === 0 ? (
                <p className="text-sm text-white/50 mt-1">Not yet announced.</p>
              ) : (
                (["retained", "released"] as const).map((d) => {
                  const list = own.filter((r) => r.decision === d);
                  return list.length ? (
                    <div key={d} className="mt-2">
                      <h3 className={`text-[10px] font-black uppercase tracking-widest ${d === "retained" ? "text-emerald-400" : "text-red-400"}`}>{d}</h3>
                      <ul className="mt-1 space-y-1 text-sm text-white/80">
                        {list.map((r) => (
                          <li key={r.player} className="flex flex-wrap items-baseline gap-x-2">
                            <span className="font-semibold text-white">{r.player}</span>
                            {r.priceLakhs != null && <span className="text-white/50">{crore(r.priceLakhs)}</span>}
                            <a href={r.sourceUrl} target="_blank" rel="noreferrer" className="text-primary text-xs inline-flex items-center gap-0.5">
                              source <ExternalLink className="w-3 h-3" />
                            </a>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null;
                })
              )}
              <Link href={`/feed/squad?team=${team}`} className="text-xs text-primary mt-2 inline-block">{team} squad analysis</Link>
            </section>
          );
        })}

        <footer className="border-t border-white/10 pt-4 flex flex-wrap gap-4 text-xs">
          <Link href="/pulse#auction" className="text-primary">Latest official updates on Pulse</Link>
          <Link href="/feed/auction" className="text-primary">What the retentions mean for the auction</Link>
          <Link href="/retention-room" className="text-primary">Retention Room</Link>
        </footer>
      </article>
    </Layout>
  );
}
