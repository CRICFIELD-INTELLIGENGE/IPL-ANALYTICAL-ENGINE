import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";

type Competition = { code: string; name: string; format: string; matches: number; through: string };
type Team = { id: number; name: string; season: string };
type Evidence = {
  competition: string;
  seasons: string[];
  phase: string;
  discipline: "batting" | "bowling";
  balls: number;
  matches: number;
  count: number;
  value: number | null;
  baseline: number | null;
  partialSeasons: string[];
};
type Candidate = { id: string; name: string; score: number; balls: number; evidence: Evidence[] };
type Coverage = { competitions: Competition[]; teams: Team[] };
type Suggestions = { team: Team; candidates: Candidate[] };

const needs = {
  opener: "Opener",
  middle_order: "Middle-order batter",
  finisher: "Finisher",
  powerplay_bowler: "Powerplay bowler",
  middle_overs_bowler: "Middle-overs bowler",
  death_bowler: "Death bowler",
};
const phases: Record<string, string> = { all: "All overs", powerplay: "Powerplay", middle: "Middle overs", death: "Death overs" };
const panel = "rounded-2xl border border-slate-200 bg-white p-4 text-slate-900 dark:border-white/10 dark:bg-[#0B1020] dark:text-slate-100 sm:p-5";
// Explicit colours on the select and its options: a transparent select leaves the open list white with light text in dark mode.
const selectStyle = "block w-full cursor-pointer rounded-lg border border-slate-300 bg-white p-2 text-slate-900 disabled:cursor-not-allowed disabled:opacity-60 "
  + "dark:border-slate-600 dark:bg-[#0B1020] dark:text-slate-100 dark:[color-scheme:dark] "
  + "[&>option]:bg-white [&>option]:text-slate-900 dark:[&>option]:bg-[#0B1020] dark:[&>option]:text-slate-100";
const quiet = "text-sm text-slate-600 dark:text-slate-400";

async function fetchT20<T>(path: string, signal: AbortSignal): Promise<T> {
  const response = await fetch(`/api/scout/t20/${path}`, { signal });
  if (!response.ok) throw new Error(String(response.status));
  return response.json() as Promise<T>;
}

function EvidenceTable({ rows, competitions }: { rows: Evidence[]; competitions: Competition[] }) {
  const labels = new Map(competitions.map(item => [item.code, item.name]));
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm tabular-nums">
        <thead className={quiet}>
          <tr>{["Competition", "Phase", "Sample", "Output", "Player rate", "League baseline"].map(label =>
            <th key={label} scope="col" className="whitespace-nowrap px-2 py-2">{label}</th>,
          )}</tr>
        </thead>
        <tbody>
          {rows.map(row => {
            const metric = row.discipline === "batting" ? "SR" : "econ";
            return (
              <tr key={`${row.competition}-${row.discipline}-${row.phase}`} className="border-t border-slate-200 dark:border-white/10">
                <td className="px-2 py-2">
                  {labels.get(row.competition) ?? row.competition}
                  <span className={`block ${quiet}`}>
                    {row.seasons.join(", ")}{row.partialSeasons.length ? " · Partial archive" : ""}
                  </span>
                </td>
                <td className="whitespace-nowrap px-2 py-2">{phases[row.phase]}</td>
                <td className="whitespace-nowrap px-2 py-2">{row.balls.toLocaleString()} balls · {row.matches} matches</td>
                <td className="whitespace-nowrap px-2 py-2">{row.count.toLocaleString()} {row.discipline === "batting" ? "runs" : "wickets"}</td>
                <td className="whitespace-nowrap px-2 py-2">{row.value == null ? "—" : `${row.value.toFixed(2)} ${metric}`}</td>
                <td className="whitespace-nowrap px-2 py-2">{row.baseline == null ? "—" : row.baseline.toFixed(2)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export function TeamT20Scouting() {
  const [team, setTeam] = useState("");
  const [need, setNeed] = useState("finisher");
  const [source, setSource] = useState("all");
  const [seasons, setSeasons] = useState("3");
  const coverage = useQuery({
    queryKey: ["scout-t20-coverage"],
    queryFn: ({ signal }) => fetchT20<Coverage>("coverage", signal),
    staleTime: 300_000,
  });
  const query = new URLSearchParams({ team, need, source, seasons }).toString();
  const shortlist = useQuery({
    queryKey: ["scout-t20-suggestions", query],
    queryFn: ({ signal }) => fetchT20<Suggestions>(`suggestions?${query}`, signal),
    enabled: Boolean(team),
    staleTime: 300_000,
  });
  return (
    <section id="team-t20-scouting" className={panel}>
      <h2 className="text-xl font-bold">Team T20 scouting</h2>
      <p className={quiet}>Pick an IPL team and a role to shortlist players from T20Is and domestic T20s.</p>
      <div className="my-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <label className="text-sm font-medium">Franchise
          <select className={selectStyle} value={team} onChange={event => setTeam(event.target.value)} disabled={!coverage.data?.teams.length}>
            <option value="">Choose a team</option>
            {coverage.data?.teams.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
          </select>
        </label>
        <label className="text-sm font-medium">Squad need
          <select className={selectStyle} value={need} onChange={event => setNeed(event.target.value)}>
            {Object.entries(needs).map(([id, label]) => <option key={id} value={id}>{label}</option>)}
          </select>
        </label>
        <label className="text-sm font-medium">Match pool
          <select className={selectStyle} value={source} onChange={event => setSource(event.target.value)}>
            <option value="all">All available T20</option>
            <option value="international">Men’s T20Is</option>
            <option value="domestic">Domestic &amp; franchise T20</option>
          </select>
        </label>
        <label className="text-sm font-medium">Window per competition
          <select className={selectStyle} value={seasons} onChange={event => setSeasons(event.target.value)}>
            {[1, 2, 3, 4, 5].map(count => <option key={count} value={count}>{count} recent {count === 1 ? "season" : "seasons"}</option>)}
          </select>
        </label>
      </div>
      {coverage.isPending && <p role="status" className={quiet}>Loading warehouse coverage…</p>}
      {coverage.isError && <p role="status" className={quiet}>The T20 warehouse could not be loaded.</p>}
      {coverage.data && (
        <details className={`mb-4 ${quiet}`}>
          <summary className="cursor-pointer">Warehouse coverage · {coverage.data.competitions.length} competitions</summary>
          <ul className="mt-2 space-y-1">
            {coverage.data.competitions.map(item => <li key={item.code}>{item.name} · {item.matches.toLocaleString()} archived matches · through {item.through}</li>)}
          </ul>
        </details>
      )}
      {team && shortlist.isPending && <p role="status" className={quiet}>Ranking candidates…</p>}
      {shortlist.isError && <p role="status" className={quiet}>The shortlist could not be loaded. <button type="button" className="underline" onClick={() => void shortlist.refetch()}>Retry</button></p>}
      {shortlist.data && (
        <>
          <p className={`mb-3 ${quiet}`}>
            Excludes players with a {shortlist.data.team.season} appearance for {shortlist.data.team.name}.
            Rankings use competition-adjusted {need.endsWith("bowler") ? "economy" : "strike rate"} with at least 120 balls in the selected phase.
            Opponent strength and auction availability require separate review.
          </p>
          {shortlist.data.candidates.length ? (
            <ol className="divide-y divide-slate-200 dark:divide-white/10">
              {shortlist.data.candidates.map(candidate => (
                <li key={candidate.id} className="py-3">
                  <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                    <Link className="font-semibold underline-offset-4 hover:underline" href={`/scout/player/${encodeURIComponent(candidate.id)}`}>{candidate.name}</Link>
                    <span className={quiet}>+{candidate.score.toFixed(1)} index points · {candidate.balls.toLocaleString()} balls</span>
                  </div>
                  <details className="mt-1">
                    <summary className={`cursor-pointer ${quiet}`}>Competition breakdown</summary>
                    <EvidenceTable rows={candidate.evidence} competitions={coverage.data?.competitions ?? []} />
                  </details>
                </li>
              ))}
            </ol>
          ) : <p className={quiet}>No candidates meet the sample and performance thresholds for these filters.</p>}
        </>
      )}
    </section>
  );
}

export function PlayerT20Evidence({ playerRef }: { playerRef: string }) {
  const [open, setOpen] = useState(false);
  const [discipline, setDiscipline] = useState<Evidence["discipline"]>("batting");
  const [phase, setPhase] = useState("all");
  const evidence = useQuery({
    queryKey: ["scout-t20-player", playerRef],
    queryFn: ({ signal }) => fetchT20<{ evidence: Evidence[]; competitions: Competition[] }>(
      `player/${encodeURIComponent(playerRef)}`, signal,
    ),
    enabled: open && Boolean(playerRef),
    staleTime: 300_000,
  });
  if (!playerRef) return null;
  const rows = evidence.data?.evidence.filter(row => row.discipline === discipline && row.phase === phase) ?? [];
  return (
    <details className={panel} onToggle={event => setOpen(event.currentTarget.open)}>
      <summary className="cursor-pointer text-lg font-bold">T20 performance by competition</summary>
      {open && (
        <div className="mt-3 space-y-3">
          <div className="grid grid-cols-2 gap-3 sm:max-w-sm">
            <label className="text-sm font-medium">Discipline
              <select className={selectStyle} value={discipline} onChange={event => setDiscipline(event.target.value as Evidence["discipline"])}>
                <option value="batting">Batting</option><option value="bowling">Bowling</option>
              </select>
            </label>
            <label className="text-sm font-medium">Phase
              <select className={selectStyle} value={phase} onChange={event => setPhase(event.target.value)}>
                {Object.entries(phases).map(([id, label]) => <option key={id} value={id}>{label}</option>)}
              </select>
            </label>
          </div>
          {evidence.isPending && <p role="status" className={quiet}>Loading T20 records…</p>}
          {evidence.isError && <p role="status" className={quiet}>{evidence.error.message === "404" ? "No unique warehouse player match." : "T20 records could not be loaded."}</p>}
          {evidence.data && (rows.length ? <EvidenceTable rows={rows} competitions={evidence.data.competitions} /> : <p className={quiet}>No recorded balls for this selection.</p>)}
        </div>
      )}
    </details>
  );
}
