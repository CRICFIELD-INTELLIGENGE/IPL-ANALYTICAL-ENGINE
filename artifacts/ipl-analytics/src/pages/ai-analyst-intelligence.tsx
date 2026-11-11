/**
 * PLAYER INTELLIGENCE — squad planning and the public record of the models:
 * what each one is allowed to claim, how it was validated, and what is missing.
 */

import { useQuery } from "@tanstack/react-query";
import { ShieldCheck } from "lucide-react";
import { Layout } from "@/components/layout";
import { Card, ErrorBanner, Loading, ModuleHeader, SectionTitle, Tile } from "@/components/decision/module-shell";
import { ModelConfidenceIndicator, SquadIntelligencePanel } from "@/components/intelligence/intel-components";
import { fetchDiagnostics, fetchModelStatus, type Diagnostics, type ModelStatus } from "@/lib/intelligence-api";

const cr = (n: number) => `₹${n.toFixed(2)} Cr`;

function Models({ m }: { m: ModelStatus }) {
  const { performance: p, auction: a, retention: r, franchiseFit: f, soldLikelihood: s, seasonSimulation: sim, fairValue: fv } = m.models;
  const h = a.validation.holdout, rh = r.validation.holdout;
  return (
    <Card>
      <SectionTitle icon={<ShieldCheck className="w-4 h-4 text-violet-300" />} title="Model record" sub={`${m.modelVersion} · data to ${m.dataCutoff} · published ${m.generatedAt.slice(0, 10)}`} />
      <div className="grid md:grid-cols-2 gap-3 mt-3 text-xs">
        <section className="rounded-xl border border-white/10 p-3 space-y-1"><div className="flex justify-between gap-2"><b>{a.name}</b><ModelConfidenceIndicator status={a.status} /></div>
          <p className="text-muted-foreground">{a.method}. On {h.n} sales in {h.seasons.join(", ")}, none used in training or model choice, the mean miss was {cr(h.maeCr)} and the median miss {cr(h.medianAeCr)}.</p>
          <p className="text-muted-foreground">The role median missed by {cr(a.validation.benchmarks.roleMedian.maeCr)}, the previous contract by {cr(a.validation.benchmarks.previousContract.maeCr)}. The 80% range held {Math.round(a.validation.intervalCoverage.measured * 100)}% of real prices.</p>
          <table className="w-full tabular-nums mt-1"><tbody>{a.validation.byBand.map((b) => <tr key={b.band}><td>{b.band}</td><td className="text-right">{b.n} sales</td><td className="text-right">mean miss {cr(b.maeCr)}</td></tr>)}</tbody></table>
        </section>
        <section className="rounded-xl border border-white/10 p-3 space-y-1"><div className="flex justify-between gap-2"><b>{r.name}</b><ModelConfidenceIndicator status={r.status} /></div>
          <p className="text-muted-foreground">{r.method}. {r.validation.scope} On the {rh.seasons.join(", ")} holdout, Brier score was {rh.brier} against {rh.baseRateBrier} for the base rate, and calibration error {rh.ece}.</p>
          <p className={r.validation.probabilityGate.passed ? "text-emerald-300" : "text-amber-200"}>{r.validation.probabilityGate.passed ? "Passed" : "Failed"} the probability gate: {r.validation.probabilityGate.rule.toLowerCase()}. {r.validation.probabilityGate.passed ? "" : "It is published as a ranking, not a percentage."}</p>
          <table className="w-full tabular-nums mt-1"><thead><tr className="text-muted-foreground"><th className="text-left font-normal">Scored</th><th className="text-right font-normal">Players</th><th className="text-right font-normal">Actually kept</th></tr></thead><tbody>{rh.calibration.map((c) => <tr key={c.from}><td>{Math.round(c.from * 100)}–{Math.round(c.to * 100)}%</td><td className="text-right">{c.n}</td><td className="text-right">{Math.round(c.observed * 100)}%</td></tr>)}</tbody></table>
        </section>
        <section className="rounded-xl border border-white/10 p-3 space-y-1"><div className="flex justify-between gap-2"><b>{p.name}</b><ModelConfidenceIndicator status={p.status} /></div>
          <p className="text-muted-foreground">Rank correlation with next-season output is {p.validation.rankCorrelationWithNextSeason} across {p.validation.n} player-seasons, against {p.validation.previousModelRankCorrelation} for the previous impact model. The 80% interval held {Math.round(p.validation.intervalCoverage.measured * 100)}%. {p.validation.label}</p>
        </section>
        <section className="rounded-xl border border-white/10 p-3 space-y-1"><div className="flex justify-between gap-2"><b>{f.name}</b><ModelConfidenceIndicator status={f.status} /></div>
          <p className="text-muted-foreground">Best-XII strength measures squad composition. It has not been shown to predict results: across {f.validation.teamSeasons} team-seasons its rank correlation with wins is {f.validation.teamSeasonRankCorrelationWithWins}.</p>
        </section>
        <section className="rounded-xl border border-white/10 p-3 space-y-1"><div className="flex justify-between gap-2"><b>{sim.name}</b><ModelConfidenceIndicator status={sim.status} /></div><p className="text-muted-foreground">{sim.reason}</p></section>
        <section className="rounded-xl border border-white/10 p-3 space-y-1"><div className="flex justify-between gap-2"><b>{fv.name}</b><ModelConfidenceIndicator status={fv.status} /></div><p className="text-muted-foreground">{fv.reason}</p></section>
        <section className="rounded-xl border border-white/10 p-3 space-y-1 md:col-span-2"><div className="flex justify-between gap-2"><b>{s.name}</b><ModelConfidenceIndicator status={s.status} /></div><p className="text-muted-foreground">{s.validation.note} AUC {s.validation.sameAuctionCv.auc} on {s.validation.rows} listed players with a record.</p></section>
      </div>
    </Card>
  );
}

function Coverage({ d }: { d: Diagnostics }) {
  return (
    <Card>
      <SectionTitle icon={<ShieldCheck className="w-4 h-4 text-violet-300" />} title="Data coverage" sub={d.stale ?? "Snapshot is current"} />
      <div className="flex flex-wrap gap-3 mt-3">
        <Tile label="Identities" value={String(d.identity.totalPlayers)} sub={`${d.identity.verifiedIdentities} verified · ${d.identity.nameOnlyIdentities} name only`} />
        <Tile label="Ambiguous names" value={String(d.identity.ambiguousAliases)} sub="Never guessed" />
        <Tile label="Sales linked" value={`${d.identity.salesBySquadRow + d.identity.salesByUniqueAlias}/${d.identity.rupeeSales}`} sub={`${d.identity.salesUnresolved} unresolved`} />
        <Tile label="In current pool" value={String(d.coverage.players)} sub={`${d.coverage.withEvidence} with enough evidence`} />
        <Tile label="No IPL record" value={String(d.coverage.withoutIplRecord)} sub="Shown as limited evidence" />
      </div>
      <p className="text-xs text-muted-foreground mt-3">Not available yet: {d.missingMetrics.join("; ")}.</p>
    </Card>
  );
}

export default function PlayerIntelligencePage() {
  const m = useQuery({ queryKey: ["intel-models"], queryFn: fetchModelStatus, retry: 1 });
  const d = useQuery({ queryKey: ["intel-diagnostics"], queryFn: fetchDiagnostics, retry: 1 });
  return (
    <Layout hideRightPanel>
      <div className="space-y-6 pb-16 max-w-7xl mx-auto w-full min-w-0">
        <ModuleHeader phase="Player Intelligence" title="Squad Builder" tagline="Performance, market price, franchise value and retention, kept as four separate questions." icon={<ShieldCheck className="w-5 h-5 text-violet-300" />} />
        <SquadIntelligencePanel />
        {(m.isLoading || d.isLoading) && <Loading label="Reading the model record…" />}
        {m.isError && <ErrorBanner error={m.error} />}
        {d.data && <Coverage d={d.data} />}
        {m.data && <Models m={m.data} />}
      </div>
    </Layout>
  );
}
