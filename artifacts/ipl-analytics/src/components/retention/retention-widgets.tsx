// Retention Room pieces shared with the rest of the site. Each one reads the retention
// API and keeps CRICFIELD Picks, the forecast and fan votes visibly apart.

import { useState } from "react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { money } from "@/lib/sim-api";
import { signed } from "@/components/decision/module-shell";
import {
  fetchMyBallots, fetchPlayerRetention, fetchSummary, simulateRetention,
  type Category, type Scenario, type SavedBallot, type Simulation,
} from "@/lib/retention-api";
import "./retention.css";

export const LIVE_SEASON = 2027;

const TONE: Record<Category, string> = {
  "Icons": "rr-tone-icon",
  "Franchise Cornerstone": "rr-tone-core", "Priority Retain": "rr-tone-top", "Strong Retain": "rr-tone-good", "Retain": "rr-tone-retain", "Retention Dilemma": "rr-tone-mid",
  "Release / Buyback Review": "rr-tone-low", "Release Candidate": "rr-tone-bad", "Insufficient Evidence": "rr-tone-none",
};
export const CategoryTag = ({ category }: { category: Category }) => <span className={`rr-tag ${TONE[category] ?? "rr-tone-core"}`}>{category === "Icons" ? "👑 " : ""}{category}</span>;

const unavailable = <span className="rr-unavailable">Unavailable</span>;

/** Current Squad vs CRICFIELD Picks vs Fan Picks, plus the visitor's own list when there is one. */
export function ScenarioTable({ sim }: { sim: Simulation }) {
  const rows: [string, (s: Scenario) => React.ReactNode][] = [
    ["Retained", (s) => s.retained], ["Released", (s) => s.released], ["Squad places left", (s) => s.squadSlotsLeft], ["Overseas", (s) => `${s.overseas} of ${sim.rules.maxOverseas}`],
    ["Committed salary", (s) => (s.committedLakh === null ? <span title={`Salary missing for ${s.salaryMissing.join(", ")}`}>{money(s.salaryKnownLakh)} known · {s.salaryMissing.length} missing</span> : money(s.committedLakh))],
    ["Auction purse left", (s) => (s.remainingPurseLakh === null ? <span title={s.purseNote ?? undefined}>{unavailable}</span> : money(s.remainingPurseLakh))],
    ["Best XII strength", (s) => (s.strength === null ? <span title={s.strengthNote ?? undefined}>Not enough players</span> : s.strength.toFixed(2))],
    ["Batting", (s) => s.battingValue?.toFixed(2) ?? "—"], ["Bowling", (s) => s.bowlingValue?.toFixed(2) ?? "—"],
    ["Death overs covered", (s) => (s.composition ? `${s.composition.phaseCoverage.death}%` : "—")],
    ["Role mix", (s) => Object.entries(s.roles).map(([r, n]) => `${n} ${r}`).join(", ")],
  ];
  return (
    <div className="rr-scroll">
      <table className="rr-table rr-compare">
        <thead><tr><th>Measure</th>{sim.scenarios.map((s) => <th key={s.label}>{s.label}</th>)}</tr></thead>
        <tbody>
          {rows.map(([label, cell]) => <tr key={label}><th scope="row">{label}</th>{sim.scenarios.map((s) => <td key={s.label}>{cell(s)}</td>)}</tr>)}
          <tr><th scope="row">Roster check</th>{sim.scenarios.map((s) => <td key={s.label}>{s.violations.length ? s.violations.map((v) => <div key={v.code} className="rr-warn">{v.message}</div>) : "Within limits"}</td>)}</tr>
        </tbody>
      </table>
    </div>
  );
}

/** Squad Builder: load CRICFIELD's retained squad or the signed-in fan's own. */
export function RetentionLoadPanel({ team }: { team: string }) {
  const [sim, setSim] = useState<Simulation | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const load = async (mine: boolean) => {
    setNote(null);
    let ballot: SavedBallot | undefined;
    if (mine) {
      ballot = (await fetchMyBallots()).find((b) => b.team === team && b.season === LIVE_SEASON);
      if (!ballot) { setNote(`No saved ${team} fan picks on this account.`); return; }
    }
    setSim(await simulateRetention(LIVE_SEASON, team, ballot?.choices));
  };
  return (
    <div className="rr-load">
      <div className="rr-load-actions">
        <button type="button" onClick={() => void load(false)}>Load CRICFIELD retained squad</button>
        <button type="button" onClick={() => void load(true)}>Load my fan picks</button>
        <Link href={`/retention-room/${team}`}>Open Retention Room</Link>
      </div>
      {note && <p className="rr-note">{note}</p>}
      {sim && <ScenarioTable sim={sim} />}
    </div>
  );
}

/** Player profile: the three outputs, side by side and never merged. */
export function PlayerRetentionCard({ player, className = "" }: { player: string | number | null | undefined; className?: string }) {
  const q = useQuery({ queryKey: ["player-retention", player], queryFn: () => fetchPlayerRetention(player!), enabled: Boolean(player), retry: false, staleTime: 5 * 60_000 });
  const d = q.data;
  if (!d) return null;
  return (
    <section className={`rr-card ${className}`}>
      <header><h3>Retention Room · {d.team} · {d.season}</h3><Link href={`/retention-room/${d.team}`}>Open</Link></header>
      <div className="rr-card-grid">
        <div><h4>Retention rating (CRR)</h4><p className="rr-big">{d.pick.index.toFixed(1)}<small>/100</small></p><CategoryTag category={d.pick.category} /><p className="rr-note">{d.pick.granularRole} · {d.pick.confidence} confidence</p><p className="rr-note">{d.pick.reason}</p></div>
        <div><h4>Retention forecast</h4>{d.forecast.kind === "decision" ? <p className="rr-big rr-small">{d.forecast.band}</p> : <><p className="rr-note">{d.forecast.status.message ?? "Forecast available in the room."}</p>{d.forecast.band && <p className="rr-note">Provisional rank: {d.forecast.band}. Not a forecast.</p>}</>}</div>
        <div><h4>Franchise fit</h4>{d.pick.fitIncrement === null ? <p className="rr-note">No record to measure.</p> : <p className="rr-big">{signed(d.pick.fitIncrement)}<small> runs/match</small></p>}</div>
        <div><h4>Fan votes</h4>{d.fans.retainPct === null ? <p className="rr-note">No votes yet.</p> : <p className="rr-big">{d.fans.retainPct}%<small> retain</small></p>}<p className="rr-note">{d.fans.totalBallots} ballot{d.fans.totalBallots === 1 ? "" : "s"}. Votes, not odds.</p></div>
      </div>
      <p className="rr-foot">The rating is a recommendation, not a chance of being retained. {d.indexVersion}, model {d.modelVersion}, data to {d.dataCutoff}.</p>
    </section>
  );
}

/** Franchise page preview. */
export function RetentionFranchisePreview({ team }: { team: string }) {
  const q = useQuery({ queryKey: ["retention-summary"], queryFn: fetchSummary, staleTime: 5 * 60_000, retry: false });
  const t = q.data?.teams.find((x) => x.team === team);
  if (!t) return null;
  return (
    <section className="rr-card">
      <header><h3>Retention Room · {q.data!.season}</h3><Link href={`/retention-room/${team}`}>Who stays, who goes</Link></header>
      <p className="rr-note">CRICFIELD would prioritise {t.priority.slice(0, 3).join(", ") || "nobody yet"}. {t.dilemmas} dilemma{t.dilemmas === 1 ? "" : "s"}, {t.releaseCandidates} release option{t.releaseCandidates === 1 ? "" : "s"}, {t.ballots} fan ballot{t.ballots === 1 ? "" : "s"}. A recommendation, not a franchise decision.</p>
    </section>
  );
}

/** Feed and Auction Intelligence: league state with real timestamps. */
export function RetentionFeedCard() {
  const q = useQuery({ queryKey: ["retention-summary"], queryFn: fetchSummary, staleTime: 5 * 60_000, retry: false });
  const d = q.data;
  if (!d) return null;
  const deadline = d.rules.retentionDeadline;
  return (
    <section className="rr-card">
      <header><h3>Retention Room</h3><Link href="/retention-room">Who stays, who goes</Link></header>
      <p className="rr-note">Toughest calls on CRICFIELD's index: {d.toughest.map((t) => `${t.team} (${t.dilemmas})`).join(", ")}.{deadline.date ? ` Deadline ${deadline.date} (${deadline.status}).` : ""}</p>
      <p className="rr-foot">Model output, updated {d.generatedAt.slice(0, 10)}.{d.lastFreeze ? ` Predictions frozen ${d.lastFreeze.at.slice(0, 16).replace("T", " ")} UTC.` : ""} {d.forecastStatus.message ?? ""}</p>
    </section>
  );
}

/** Account → Saved Items. */
export function AccountRetentionPicks() {
  const q = useQuery({ queryKey: ["my-retention-ballots"], queryFn: fetchMyBallots, retry: false });
  if (!q.data?.length) return null;
  return (
    <section className="account-workspace">
      <h2>Your retention picks</h2>
      {q.data.map((b) => (
        <div key={`${b.season}-${b.team}`} className="account-identity">
          <strong>{b.team} · IPL {b.season}</strong>
          <p>{b.retained} retained, {b.released} released{b.agreesWithCricfield !== null ? `. ${b.agreesWithCricfield} calls match CRICFIELD` : ""}. Saved {new Date(b.updatedAt).toLocaleString()}.</p>
          <Link href={`/retention-room/${b.team}?tab=fans`}>{b.editable ? "Open and edit" : "Open"}</Link>
        </div>
      ))}
    </section>
  );
}
