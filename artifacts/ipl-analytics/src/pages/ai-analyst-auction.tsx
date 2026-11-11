/**
 * AUCTION WAR ROOM — Decision Intelligence OS, Phase 4 (Intelligence)
 * ─────────────────────────────────────────────────────────────────────────────
 * Two boards, each built only from data available at the time:
 *   • Next auction — the shared Player Intelligence model: expected price with
 *     an 80% range, a performance-against-price rank read and franchise fit.
 *     These are the same numbers shown on player profiles and in Scout Lab.
 *   • 2026 auction backtest — the real 369-player list valued on data to
 *     2025, checked against what each player sold for and delivered, using the
 *     earlier comparable-sales benchmark.
 */

import { RetentionFeedCard } from "@/components/retention/retention-widgets";
import { Fragment, useEffect, useState } from "react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { BadgeCheck, ChevronDown, ChevronRight, FlaskConical, Gavel, Scale, Search, Target } from "lucide-react";
import { Layout } from "@/components/layout";
import { Card, ErrorBanner, Loading, ModuleHeader, Pill, SectionTitle, Segmented, Select, Tile, signed } from "@/components/decision/module-shell";
import { LineChart } from "@/components/decision/sim-widgets";
import { readParams, writeParams } from "@/lib/discovery-api";
import { fetchModelStatus } from "@/lib/intelligence-api";
import { ModelConfidenceIndicator } from "@/components/intelligence/intel-components";
import { fetchAuctionPlayer, fetchBoard, money, type AuctionBoard, type AuctionRole, type AuctionRow, type AuctionView, type BoardQuery, type Signal } from "@/lib/sim-api";

const SIGNAL_TONE: Record<Signal, "good" | "neutral" | "bad" | "info"> = { BUY: "good", HOLD: "neutral", AVOID: "bad", SCOUT: "info" };
const SIGNAL_HELP: Record<Signal, string> = {
  BUY: "Performance ranks at least 20 percentile points above expected price, within the role",
  HOLD: "Performance and expected price rank about level, within the role",
  AVOID: "Expected price ranks at least 20 percentile points above performance, within the role",
  SCOUT: "Too little IPL play to compare; judge on scouting",
};
const LEGACY_SIGNAL_HELP: Record<Signal, string> = {
  BUY: "Value at least 1.25× the benchmark price and at least ₹1 Cr above it",
  HOLD: "Fairly priced on the benchmark",
  AVOID: "Below replacement level, or priced well over the output's worth on the benchmark",
  SCOUT: "Fewer than 5 IPL matches",
};

export default function AuctionWarRoomPage() {
  const p = readParams();
  const [view, setView] = useState<AuctionView>(p.get("view") === "backtest" ? "backtest" : "live");
  const [team, setTeam] = useState(p.get("team") ?? "");
  const [role, setRole] = useState<AuctionRole | "">((p.get("role") as AuctionRole) || "");
  const [overseas, setOverseas] = useState<"" | "only" | "exclude">((p.get("overseas") as "only" | "exclude") || "");
  const [maxPrice, setMaxPrice] = useState(Number(p.get("max") ?? 0));
  const [signal, setSignal] = useState<Signal | "">((p.get("signal") as Signal) || "");
  const [q, setQ] = useState(p.get("q") ?? "");
  const [debouncedQ, setDebouncedQ] = useState(q);
  const [open, setOpen] = useState<string | null>(p.get("player"));
  const [shown, setShown] = useState(60);
  useEffect(() => { const t = setTimeout(() => setDebouncedQ(q.trim()), 250); return () => clearTimeout(t); }, [q]);

  const query: BoardQuery = { view, team: team || undefined, role: role || undefined, overseas: overseas || undefined, maxPrice: maxPrice || undefined, signal: signal || undefined, q: debouncedQ || undefined };
  const board = useQuery({ queryKey: ["war-room", query], queryFn: () => fetchBoard(query), placeholderData: (x) => x, retry: 1 });
  useEffect(() => {
    writeParams({ view, team: team || null, role: role || null, overseas: overseas || null, max: maxPrice || null, signal: signal || null, q: debouncedQ || null });
    setShown(60);
  }, [view, team, role, overseas, maxPrice, signal, debouncedQ]);

  const b = board.data;
  return (
    <Layout hideRightPanel>
      <div className="space-y-6 pb-16 max-w-7xl mx-auto w-full min-w-0">
        <ModuleHeader phase="Phase 4 · Intelligence" title="Auction War Room" tagline="Expected price, performance against price, comparable sales and franchise fit, kept as separate questions." icon={<Gavel className="w-5 h-5 text-green-400" />}>
          <Segmented label="Board" value={view} onChange={(v) => { setView(v); setOpen(null); }} options={[{ value: "live", label: `Next auction` }, { value: "backtest", label: "2026 auction backtest" }]} />
        </ModuleHeader>

        <RetentionFeedCard />
        <Card>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 items-end">
            <Select label="Fit for franchise" value={team} onChange={setTeam} options={[{ value: "", label: "No franchise" }, ...(b?.teams ?? []).map((t) => ({ value: t.short, label: `${t.short} · ${t.name}` }))]} />
            <Select label="Role" value={role} onChange={setRole} options={[{ value: "", label: "Any role" }, ...(["Batter", "Wicketkeeper", "All-rounder", "Bowler"] as AuctionRole[]).map((r) => ({ value: r, label: r }))]} />
            <Select label="Overseas" value={overseas} onChange={setOverseas} options={[{ value: "", label: "All players" }, { value: "only", label: "Overseas only" }, { value: "exclude", label: "Indian only" }]} />
            <Select label="Expected price up to" value={maxPrice} onChange={setMaxPrice} options={[{ value: 0, label: "Any" }, ...[100, 200, 500, 1000, 1500].map((v) => ({ value: v, label: money(v) }))]} />
            <label className="flex flex-col gap-1 text-[10px] uppercase tracking-wider text-muted-foreground col-span-2 min-w-0">
              Search
              <span className="flex items-center gap-2 rounded-lg border border-white/10 bg-[#0B1020] px-2.5">
                <Search className="w-3.5 h-3.5" />
                <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Name, country or archetype" className="flex-1 bg-transparent outline-none py-2 text-sm normal-case tracking-normal text-white min-w-0" />
              </span>
            </label>
          </div>
          {b && (
            <div className="flex flex-wrap gap-2 mt-3" role="group" aria-label="Signal filter">
              {(["BUY", "HOLD", "AVOID", "SCOUT"] as Signal[]).map((s) => (
                <button key={s} onClick={() => setSignal(signal === s ? "" : s)} aria-pressed={signal === s} title={SIGNAL_HELP[s]}
                  className={`rounded-full border px-3 py-1 text-xs font-semibold transition-colors ${signal === s ? "border-white/50 bg-white/15" : "border-white/10 bg-white/5 text-muted-foreground hover:text-white"}`}>
                  {s} <span className="tabular-nums opacity-70">{b.counts[s]}</span>
                </button>
              ))}
              <span className="text-[11px] text-muted-foreground self-center ml-1">{view === "live" ? `Valued on data to ${b.asOf}, for the ${b.target} auction` : `Valued on data to ${b.asOf} — before the ${b.target} auction`}</span>
            </div>
          )}
        </Card>

        {board.isError && <ErrorBanner error={board.error} />}
        {board.isLoading && <Loading label="Valuing the pool…" />}
        {b && (
          <>
            <div className="grid lg:grid-cols-2 gap-5">
              {view === "live" ? <LiveModelCard /> : <ModelCard b={b} />}
              {b.backtest ? <BacktestCard b={b} /> : b.team ? <NeedsCard b={b} /> : <HowToCard />}
            </div>
            {b.backtest && b.team && <NeedsCard b={b} />}
            {open && !b.rows.slice(0, shown).some((r) => (r.playerId !== null ? String(r.playerId) : r.key) === open) && (
              <Standalone k={open} view={view} onClose={() => { setOpen(null); writeParams({ player: null }); }} />
            )}
            <Card className={board.isFetching ? "opacity-70" : ""}>
              <SectionTitle icon={<Scale className="w-4 h-4 text-green-400" />} title={`${b.total} players`} sub={view === "live" ? (b.team ? `sorted by runs per match added to ${b.team.short}'s best XII` : "sorted by performance rank against price rank") : b.team ? `sorted by fit for ${b.team.short}, then value for money` : "sorted by value for money (value ÷ expected price)"} />
              <div className="overflow-x-auto mt-3 -mx-4 px-4">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/10 text-[11px] uppercase tracking-wider text-muted-foreground">
                      {["", "Player", "Role", "IPL M", "Above repl.", "Expected price", view === "live" ? "Rank gap" : "Value", "Signal", view === "live" ? "80% range" : "Max bid", ...(b.team ? [view === "live" ? "Fit (runs/match)" : "Fit"] : []), ...(view === "backtest" ? ["Actually"] : ["Last sale · outlook"])].map((h, i) => (
                        <th key={i} className={`py-2 px-2 font-semibold whitespace-nowrap ${[3, 4, 5, 6, 8].includes(i) ? "text-right" : "text-left"}`}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {b.rows.slice(0, shown).map((r) => {
                      const key = r.playerId !== null ? String(r.playerId) : r.key;
                      const isOpen = open === key;
                      return (
                        <Fragment key={r.key}>
                          <Row r={r} view={view} withFit={Boolean(b.team)} open={isOpen} onToggle={() => { setOpen(isOpen ? null : key); writeParams({ player: isOpen ? null : key }); }} />
                          {isOpen && <tr><td colSpan={b.team ? 11 : 10} className="p-0"><Detail k={key} view={view} /></td></tr>}
                        </Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {b.rows.length > shown && <button onClick={() => setShown((s) => s + 60)} className="mt-3 text-xs text-green-300 hover:underline">Show {Math.min(60, b.rows.length - shown)} more of {b.rows.length - shown}</button>}
              {!b.rows.length && <p className="text-sm text-muted-foreground mt-3">No players match these filters.</p>}
            </Card>
          </>
        )}
      </div>
    </Layout>
  );
}

function Row({ r, view, withFit, open, onToggle }: { r: AuctionRow; view: AuctionView; withFit: boolean; open: boolean; onToggle: () => void }) {
  return (
    <tr className="border-b border-white/[0.05] tabular-nums align-top hover:bg-white/[0.02]">
      <td className="py-2 pl-2"><button onClick={onToggle} aria-expanded={open} aria-label={`${open ? "Hide" : "Show"} details for ${r.name}`} className="text-muted-foreground hover:text-white">{open ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}</button></td>
      <td className="py-2 px-2 whitespace-nowrap">
        <button onClick={onToggle} className="font-semibold hover:underline text-left">{r.name}</button>
        <div className="text-[11px] text-muted-foreground">{r.country}{r.overseas ? " · overseas" : ""}{r.age ? ` · ${r.age}` : ""}{r.team ? ` · last ${r.team}` : ""}</div>
      </td>
      <td className="py-2 px-2 text-xs"><div>{r.role}</div>{r.archetype && <div className="text-[11px] text-muted-foreground max-w-[180px] truncate" title={r.archetype}>{r.archetype}</div>}</td>
      <td className="py-2 px-2 text-right">{r.iplMatches}</td>
      <td className="py-2 px-2 text-right" title="Runs per match above a replacement-level player">{r.iar === null ? "—" : signed(r.iar)}<div className="text-[10px] text-muted-foreground">{r.confidence}</div></td>
      <td className="py-2 px-2 text-right">{money(r.market)}{r.marketBasis > 0 && r.marketBasis < 3 && <div className="text-[10px] text-amber-300" title="Few comparable sales behind this estimate">thin data</div>}{r.reserve !== null && <div className="text-[10px] text-muted-foreground">reserve {money(r.reserve)}</div>}</td>
      <td className="py-2 px-2 text-right" title={view === "live" ? "Performance percentile minus price percentile, within the role" : undefined}>{view === "live" ? (r.valueGap === null || r.valueGap === undefined ? "—" : signed(r.valueGap, 0)) : money(r.value)}</td>
      <td className="py-2 px-2"><Pill tone={SIGNAL_TONE[r.signal]} title={view === "live" ? SIGNAL_HELP[r.signal] : LEGACY_SIGNAL_HELP[r.signal]}>{r.signal}</Pill></td>
      <td className="py-2 px-2 text-right whitespace-nowrap">{view === "live" ? (r.marketRange ? `${money(r.marketRange.low)}–${money(r.marketRange.high)}` : "—") : money(r.maxBid)}</td>
      {withFit && <td className="py-2 px-2 text-xs min-w-[150px]">{r.fit ? <><b className="tabular-nums">{view === "live" ? signed(r.fit.score) : r.fit.score}</b>{r.fit.reasons[0] && <div className="text-[11px] text-muted-foreground leading-snug">{r.fit.reasons[0]}</div>}</> : <span className="text-muted-foreground">—</span>}</td>}
      {view === "backtest" ? (
        <td className="py-2 px-2 text-xs min-w-[150px]">
          {r.actual?.price ? <div>{r.actual.soldTo} · <b>{money(r.actual.price)}</b></div> : <div className="text-muted-foreground">Unsold</div>}
          <div className="text-[11px] text-muted-foreground">{r.actual?.matches ? `${r.actual.matches} M · ${r.actual.impact === null ? "—" : signed(r.actual.impact)} r/m` : "did not play"}{r.actual?.price ? ` · ${r.actual.verdict}` : ""}</div>
        </td>
      ) : (
        <td className="py-2 px-2 text-xs min-w-[150px]">
          {r.lastSale ? <div>{r.lastSale.season} {r.lastSale.team} · {money(r.lastSale.price)}</div> : <div className="text-muted-foreground">No auction fee on record</div>}
          {r.contract && <div className={`text-[11px] ${/kept/i.test(r.contract) ? "text-emerald-300" : /risk/i.test(r.contract) ? "text-rose-300" : "text-amber-200"}`} title="Provisional retention index, not a probability">{r.contract}</div>}
          {r.retentionPick && <div className="text-[11px] text-muted-foreground">CRICFIELD Pick {r.retentionPick.index.toFixed(0)}/100 · {r.retentionPick.category}</div>}
        </td>
      )}
    </tr>
  );
}

function Detail({ k, view }: { k: string; view: AuctionView }) {
  const d = useQuery({ queryKey: ["war-room-player", k, view], queryFn: () => fetchAuctionPlayer(k, view), retry: 1 });
  if (d.isLoading) return <div className="p-4"><Loading label="Pulling comparables…" /></div>;
  if (d.isError) return <div className="p-4"><ErrorBanner error={d.error} /></div>;
  const x = d.data!;
  return (
    <div className="bg-white/[0.03] border-y border-white/10 p-4 grid lg:grid-cols-3 gap-4 text-xs">
      <div className="space-y-2 min-w-0">
        <div className="font-semibold text-sm">Comparable sales</div>
        <p className="text-muted-foreground">The most similar players (Player Pool) bought in the last five auctions, and what they did that season.</p>
        <ul className="space-y-1">
          {x.comparables.map((c) => (
            <li key={c.playerId} className="flex flex-wrap gap-x-2">
              <Link href={`/ai-analyst/player-pool?player=${c.playerId}`} className="font-semibold hover:underline">{c.name}</Link>
              <span className="text-muted-foreground">{c.similarity}% · {c.sale.season} {c.sale.team} {money(c.sale.price)}</span>
              <span className="tabular-nums">{c.nextSeason ? `→ ${c.nextSeason.matches} M, ${signed(c.nextSeason.impact)} r/m` : "→ not played yet"}</span>
            </li>
          ))}
          {!x.comparables.length && <li className="text-muted-foreground">Not enough IPL balls to place this player in the similarity space.</li>}
        </ul>
      </div>
      <div className="space-y-2 min-w-0">
        <div className="font-semibold text-sm">Best franchise fits</div>
        <p className="text-muted-foreground">{view === "live" ? "Runs per match added to each franchise's best XII." : "Ranked by how well the player covers each squad's weakest winning-linked dimensions (Squad DNA)."}</p>
        <ul className="space-y-1.5">
          {x.bestFits.map((f) => (
            <li key={f.short}>
              <div className="flex justify-between"><Link href={`/ai-analyst/squad-dna?team=${f.short}`} className="font-semibold hover:underline">{f.name}</Link><b className="tabular-nums">{view === "live" ? signed(f.score) : f.score}</b></div>
              {f.reasons.map((r) => <div key={r} className="text-muted-foreground">{r}</div>)}
            </li>
          ))}
          {!x.bestFits.length && <li className="text-muted-foreground">No franchise gap this player clearly fills.</li>}
        </ul>
      </div>
      <div className="space-y-2 min-w-0">
        <div className="font-semibold text-sm">Record</div>
        <table className="w-full tabular-nums">
          <thead><tr className="text-[10px] uppercase tracking-wider text-muted-foreground"><th className="text-left">Season</th><th className="text-right">M</th><th className="text-right">Runs/match vs avg</th></tr></thead>
          <tbody>{x.history.map((h) => <tr key={h.season}><td>{h.season}</td><td className="text-right">{h.matches}</td><td className="text-right">{h.impact === null ? "—" : signed(h.impact)}</td></tr>)}</tbody>
        </table>
        {x.sales.length > 0 && <div className="text-muted-foreground">Auction history: {x.sales.map((s) => `${s.season} ${s.team} ${money(s.price)}`).join(" · ")}</div>}
        {x.row.playerId !== null && (
          <div className="flex flex-wrap gap-3 pt-1">
            <Link href={`/ai-analyst/pressure?player=${x.row.playerId}`} className="text-fuchsia-300 hover:underline">Pressure genome</Link>
            <Link href={`/ai-analyst/weakness?player=${x.row.playerId}`} className="text-amber-300 hover:underline">Weaknesses</Link>
          </div>
        )}
      </div>
    </div>
  );
}

/** A player opened by link who isn't in the visible rows (filtered out, or not active). */
function Standalone({ k, view, onClose }: { k: string; view: AuctionView; onClose: () => void }) {
  const d = useQuery({ queryKey: ["war-room-player", k, view], queryFn: () => fetchAuctionPlayer(k, view), retry: 1 });
  const r = d.data?.row;
  return (
    <Card>
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <h2 className="font-display font-black text-lg">{r?.name ?? "Player"}</h2>
        {r && <><Pill tone={SIGNAL_TONE[r.signal]} title={SIGNAL_HELP[r.signal]}>{r.signal}</Pill>
          <span className="text-xs text-muted-foreground tabular-nums">expected {money(r.market)}{r.marketRange ? ` (${money(r.marketRange.low)}–${money(r.marketRange.high)})` : ""}{view === "backtest" ? ` · value ${money(r.value)} · max bid ${money(r.maxBid)}` : ""} · {r.iar === null ? "—" : signed(r.iar)} runs/match above replacement{r.contract ? ` · ${r.contract}` : ""}</span></>}
        <button onClick={onClose} className="ml-auto text-xs text-muted-foreground hover:text-white">Close</button>
      </div>
      <div className="-mx-4 mt-3"><Detail k={k} view={view} /></div>
    </Card>
  );
}

function LiveModelCard() {
  const q = useQuery({ queryKey: ["intel-models"], queryFn: fetchModelStatus, retry: 1, staleTime: 5 * 60_000 });
  const a = q.data?.models.auction;
  if (!a) return <Card><p className="text-xs text-muted-foreground">Reading the model record…</p></Card>;
  const h = a.validation.holdout;
  return (
    <Card>
      <SectionTitle icon={<Scale className="w-4 h-4 text-green-400" />} title="How prices are set" sub={`${a.method}, tested on ${h.n} sales from ${h.seasons.join(", ")}`} />
      <div className="flex flex-wrap gap-3 mt-3">
        <Tile label="Mean miss" value={`₹${h.maeCr.toFixed(2)} Cr`} sub={`role median ₹${a.validation.benchmarks.roleMedian.maeCr.toFixed(2)} Cr`} />
        <Tile label="Median miss" value={`₹${h.medianAeCr.toFixed(2)} Cr`} sub={`typical ×${h.typicalMultiple.toFixed(2)}`} />
        <Tile label="Range coverage" value={`${Math.round(a.validation.intervalCoverage.measured * 100)}%`} sub="of real prices in the 80% range" />
      </div>
      <div className="flex items-center gap-2 mt-3"><ModelConfidenceIndicator status={a.status} /><Link href="/ai-analyst/squad-builder" className="text-xs text-green-300 hover:underline">Full model record</Link></div>
      <p className="text-[11px] text-muted-foreground mt-2 leading-relaxed">Expected price if sold, tested season by season on auctions the model had not seen. Above ₹5 Cr the mean miss rises to ₹{(a.validation.byBand.find((x) => x.band.startsWith("over"))?.maeCr ?? 0).toFixed(2)} Cr, so read top-end prices as a range. CricField estimate, not an official valuation. Runs are not converted to rupees: no validated conversion exists.</p>
    </Card>
  );
}

function ModelCard({ b }: { b: AuctionBoard }) {
  const m = b.model;
  return (
    <Card>
      <SectionTitle icon={<Scale className="w-4 h-4 text-green-400" />} title="How prices and value are set" sub={m.trainedOn} />
      <div className="flex flex-wrap gap-3 mt-3">
        <Tile label="Price model miss" value={`×${m.typicalMiss.toFixed(2)}`} sub={`typical, leave-one-out · R² ${m.looR2.toFixed(2)}`} />
        <Tile label="Going rate" value={money(m.rate.domestic)} sub={`per run/match above repl. · overseas ${money(m.rate.overseas)}`} />
        <Tile label="Replacement level" value={signed(m.replacement)} sub="runs/match vs average (20th-pct regular)" />
      </div>
      <div className="mt-3">
        <LineChart label="Expected auction price by output" xLabel="runs/match above replacement" yLabel="₹ Cr" height={150}
          series={[
            { name: "Indian", color: "#34d399", points: m.curve.map((c) => ({ x: c.iar, y: Math.round(c.domestic) / 100 })) },
            { name: "Overseas", color: "#60a5fa", points: m.curve.map((c) => ({ x: c.iar, y: Math.round(c.overseas) / 100 })) },
          ]} />
      </div>
      <p className="text-[11px] text-muted-foreground mt-2 leading-relaxed">
        Expected price = weighted average of the 15 most similar sales (output, overseas, experience, role). Value = output above replacement × the going rate, discounted for small samples, and capped at the record fee in these auctions ({money(m.cap)}).
        Prices for similar output vary a lot — reputation, scarcity and bidding wars — so treat the price as a range of roughly ×{m.typicalMiss.toFixed(1)} either way. Few stars reach the auction, so top-end prices are least certain.
      </p>
    </Card>
  );
}

function BacktestCard({ b }: { b: AuctionBoard }) {
  const t = b.backtest!;
  return (
    <Card>
      <SectionTitle icon={<FlaskConical className="w-4 h-4 text-amber-400" />} title="Backtest: the real 2026 auction" sub={`${t.sold} sold · ${t.matched} with enough IPL history to value`} />
      <div className="flex flex-wrap gap-3 mt-3">
        <Tile label="Price ranking" value={t.priceRankCorrelation.toFixed(2)} sub="rank correlation, expected vs actual price" />
        <Tile label="Typical price miss" value={`×${t.typicalMiss.toFixed(2)}`} sub="players sold in 2026" />
        <Tile label="Output projection" value={t.projection.n >= 5 ? t.projection.correlation.toFixed(2) : "—"} sub={`rank corr. with 2026 output · n=${t.projection.n}`} />
      </div>
      <div className="overflow-x-auto mt-3 -mx-4 px-4">
        <table className="w-full text-xs tabular-nums">
          <thead><tr className="border-b border-white/10 text-[10px] uppercase tracking-wider text-muted-foreground">{["Signal", "Listed", "Sold", "Played 4+", "Avg price", "Avg 2026 r/m", "Delivered"].map((h, i) => <th key={h} className={`py-1.5 px-2 ${i ? "text-right" : "text-left"}`}>{h}</th>)}</tr></thead>
          <tbody>{t.groups.map((g) => (
            <tr key={g.signal} className="border-b border-white/[0.05]"><td className="py-1.5 px-2"><Pill tone={SIGNAL_TONE[g.signal]}>{g.signal}</Pill></td><td className="py-1.5 px-2 text-right">{g.listed}</td><td className="py-1.5 px-2 text-right">{g.sold}</td><td className="py-1.5 px-2 text-right">{g.played}</td><td className="py-1.5 px-2 text-right">{money(g.avgPrice)}</td><td className="py-1.5 px-2 text-right">{g.avgImpact === null ? "—" : signed(g.avgImpact)}</td><td className="py-1.5 px-2 text-right">{g.deliveredShare === null ? "—" : `${g.deliveredShare}%`}</td></tr>
          ))}</tbody>
        </table>
      </div>
      <div className="grid sm:grid-cols-2 gap-3 mt-3 text-xs">
        <div><div className="font-semibold text-emerald-300 flex items-center gap-1"><BadgeCheck className="w-3.5 h-3.5" /> Called right</div>{t.hits.length ? t.hits.map((h) => <div key={h.name} className="mt-1"><b>{h.name}</b> <span className="text-muted-foreground">{h.note}</span></div>) : <div className="text-muted-foreground mt-1">None with enough 2026 games.</div>}</div>
        <div><div className="font-semibold text-rose-300 flex items-center gap-1"><Target className="w-3.5 h-3.5" /> Called wrong</div>{t.misses.length ? t.misses.map((h) => <div key={h.name} className="mt-1"><b>{h.name}</b> <span className="text-muted-foreground">{h.note}</span></div>) : <div className="text-muted-foreground mt-1">None with enough 2026 games.</div>}</div>
      </div>
      <p className="text-[11px] text-muted-foreground mt-3">Most of the list had little IPL history (SCOUT) and many buys barely played in 2026, so the output test is small — read it as a sanity check, not proof. "Delivered" = output above replacement worth at least 80% of the fee at the going rate.</p>
    </Card>
  );
}

function NeedsCard({ b }: { b: AuctionBoard }) {
  const t = b.team!;
  return (
    <Card>
      <SectionTitle icon={<Target className="w-4 h-4 text-emerald-400" />} title={`${t.name}: what to buy for`} sub={`Squad DNA ${t.season} — weakest dimensions that track winning`} />
      <ul className="mt-3 space-y-1.5 text-sm">
        {t.gaps.map((g) => <li key={g.label} className="flex justify-between gap-2"><span>{g.label}</span><span className="text-xs tabular-nums text-muted-foreground">{g.score}th pct · r={g.importance.toFixed(2)}</span></li>)}
        {!t.gaps.length && <li className="text-xs text-muted-foreground">No dimension linked with winning sits below the 45th percentile — fit scores are flat, so sort by value.</li>}
      </ul>
      <p className="text-[11px] text-muted-foreground mt-2">Fit 50 = neutral; above 50 the player is better than the pool average on the features that would fix these gaps. <Link href={`/ai-analyst/squad-dna?team=${t.short}&season=${t.season}`} className="text-emerald-300 hover:underline">Full DNA →</Link></p>
    </Card>
  );
}

function HowToCard() {
  return (
    <Card>
      <SectionTitle icon={<Gavel className="w-4 h-4 text-green-400" />} title="Reading the board" sub="What each column means" />
      <ul className="mt-3 space-y-1.5 text-xs text-muted-foreground">
        <li><b className="text-white">Above repl.</b> — CricField Runs Above Replacement per match.</li>
        <li><b className="text-white">Expected price</b> — what the auction is likely to pay if the player sells, with an 80% range.</li>
        <li><b className="text-white">Rank gap</b> — performance percentile minus price percentile, within the role.</li>
        {(["BUY", "HOLD", "AVOID", "SCOUT"] as Signal[]).map((s) => <li key={s}><Pill tone={SIGNAL_TONE[s]}>{s}</Pill> {SIGNAL_HELP[s]}.</li>)}
        <li>Pick a franchise above to rank players by the runs per match they add to that team's best XII.</li>
      </ul>
    </Card>
  );
}
