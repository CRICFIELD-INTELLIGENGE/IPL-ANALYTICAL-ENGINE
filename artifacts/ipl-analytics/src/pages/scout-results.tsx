import { useState, type CSSProperties, type FormEvent } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useLocation, useSearch } from "wouter";
import { Layout } from "@/components/layout";
import { PlayerAvatar } from "@/components/player-avatar";
import { SCOUT_LEAGUES } from "@/components/scout/scout-cinematic-room";
import { RetentionAssessment } from "@/components/scout/retention-assessment";
import { ScoutBallLoader } from "@/components/scout/scout-ball-loader";
import { PreseasonRecruitment } from "@/components/scout/preseason-recruitment";
import { fetchScoutPlayer, fetchScoutRankings, scoutAgeRange, type MatchPhase, type ScoutRating } from "@/lib/scout-api";
import { askScoutConversation } from "@/lib/scout-conversation";
import { useScoutShortlist } from "@/lib/scout-shortlist";
import { TEAM_REGISTRY, isTeamCode } from "@/lib/team-context";
import "./scout-results.css";

const phases = { all: "All overs", powerplay: "Powerplay", middle: "Middle overs", death: "Death overs" } as const;
const titles: Record<string, string> = {
  finisher: "Find a Finisher",
  pace: "Find a Fast Bowler",
  young: "Find Young Talent",
  replacement: "Replace a Player",
};

const attribute = (row: ScoutRating, pattern: RegExp) =>
  row.verifiedAttributes?.provenance.find(item => pattern.test(item.attribute))?.value;
const rowKey = (row: ScoutRating) => [row.cricsheet_id, row.competition, row.discipline, row.phase].join(":");
const number = (value?: number | null) => value?.toFixed(1) ?? "Unavailable";
const primaryMetric = (row: ScoutRating) =>
  row.discipline === "batting" ? row.metrics.strike_rate : row.metrics.economy;

function PhasePerformance({ player }: { player: ScoutRating }) {
  const [open, setOpen] = useState(false);
  const profile = useQuery({
    queryKey: ["scout-workspace-profile", player.cricsheet_id],
    queryFn: () => fetchScoutPlayer(player.cricsheet_id),
    enabled: open,
    staleTime: 300_000,
    retry: false,
  });
  const ratings = profile.data?.ratings;
  return <details className="scout-phase-performance" onToggle={event => setOpen(event.currentTarget.open)}>
    <summary>Performance by phase</summary>
    {profile.isFetching && <p role="status">Loading phase ratings…</p>}
    {profile.error && <p role="alert">{profile.error.message}</p>}
    {ratings && <dl>
      {(["powerplay", "middle", "death"] as const).map(phase => {
        const sample = ratings.find(row => row.discipline === player.discipline && row.competition === player.competition && row.phase === phase);
        const metric = sample && primaryMetric(sample);
        return <div key={phase}>
          <dt>{phases[phase]}</dt>
          <dd>{number(metric?.value)} {metric?.value != null && (player.discipline === "batting" ? "SR" : "econ")}</dd>
          {metric?.percentile != null && <meter min={0} max={100} value={metric.percentile} aria-label={`${phases[phase]} league percentile`} />}
        </div>;
      })}
    </dl>}
  </details>;
}

export default function ScoutResultsPage() {
  const search = useSearch();
  return <ScoutWorkspace key={search} search={search} />;
}

function ScoutWorkspace({ search }: { search: string }) {
  const params = new URLSearchParams(search);
  const question = params.get("q") ?? "";
  const preset = params.get("preset") ?? "search";
  const teamCode = (params.get("team") ?? "").toUpperCase();
  const team = isTeamCode(teamCode) ? teamCode : undefined;
  const franchise = team ? TEAM_REGISTRY[team] : undefined;
  const discipline = (params.get("discipline") ?? (preset === "pace" ? "bowling" : "batting")) === "bowling"
    ? "bowling" : "batting";
  const requestedPhase = params.get("phase");
  const phase = requestedPhase && Object.hasOwn(phases, requestedPhase)
    ? requestedPhase as MatchPhase : "all";
  const competitions = (params.get("competitions") ?? "").split(",")
    .filter(code => code && code !== "smat").join(",");
  const battingRoles = ["opener", "top_order", "middle_order", "finisher", "lower_order"];
  const bowlingRoles = ["powerplay_specialist", "middle_specialist", "death_specialist", "multi_phase", "part_time"];
  const roles = discipline === "batting" ? battingRoles : bowlingRoles;
  const requestedRole = params.get("role") ?? "";
  const role = roles.includes(requestedRole) ? requestedRole : "";
  const minBalls = Math.min(10000, Math.max(0, Number(params.get("minBalls") ?? 60) || 0));
  const recentSeasons = Number(params.get("recentSeasons")) || 3;
  const page = Number(params.get("page")) || 1;
  const [, navigate] = useLocation();
  const [input, setInput] = useState(question);
  const [selection, setSelection] = useState<string>();
  const [view, setView] = useState<"players" | "shortlist">("players");
  const [compare, setCompare] = useState<ScoutRating[]>([]);
  const scoutingQuestion = /^(find|show|compare|recommend|who|which|best)\b|\b(under \d+|death overs|finishers|pace bowlers)\b/i.test(question);
  const [askAi, setAskAi] = useState(preset === "search" && (scoutingQuestion || question.length > 60));
  const { shortlist, toggleShortlist, isShortlisted } = useScoutShortlist();

  const filters = {
    discipline, phase, role, minBalls, recentSeasons, page, limit: 25,
    competitions: competitions || [...SCOUT_LEAGUES.map(league => league.code), "t20i"].join(","),
    search: question.length <= 60 ? question : undefined,
    country: params.get("country") || undefined,
    ...scoutAgeRange(preset === "young" ? "< 23" : params.get("age") ?? ""),
    bowlingType: preset === "pace" ? "pace" : undefined,
  } as const;
  const battingSearch = useQuery({
    queryKey: ["scout-workspace", filters],
    queryFn: () => fetchScoutRankings(filters),
    enabled: (preset !== "replacement" || !!question || !!role) && question.length <= 60,
    staleTime: 60_000,
    retry: false,
  });
  const otherDiscipline = discipline === "batting" ? "bowling" : "batting";
  const secondSearch = useQuery({
    queryKey: ["scout-workspace", filters, otherDiscipline],
    queryFn: () => fetchScoutRankings({ ...filters, discipline: otherDiscipline }),
    enabled: !!question && question.length <= 60 && !role && (preset === "search" || preset === "replacement"),
    staleTime: 60_000,
    retry: false,
  });
  const ai = useQuery({
    queryKey: ["scout-workspace-ai", question, team],
    queryFn: async () => {
      const response = await askScoutConversation(question, team, []);
      if (response.source !== "live_api") throw Error(response.error ?? "Scout AI unavailable");
      return response;
    },
    enabled: askAi,
    retry: false,
  });
  const ranked = [...(battingSearch.data?.data ?? []), ...(secondSearch.data?.data ?? [])];
  const sourcePlayer = params.get("sourcePlayer");
  const aiCandidates = !filters.country && filters.minAge == null && filters.maxAge == null
    ? ai.data?.candidates : undefined;
  const candidates = (aiCandidates?.length ? aiCandidates : ranked)
    .filter(row => row.competition !== "smat" && row.cricsheet_id !== sourcePlayer);
  const rows = view === "shortlist" ? shortlist : candidates;
  const active = rows.find(row => rowKey(row) === selection) ?? rows[0];
  const loading = view === "players" && (battingSearch.isFetching || secondSearch.isFetching || ai.isFetching);
  const error = battingSearch.error ?? secondSearch.error;
  const pages = Math.max(battingSearch.data?.pagination.totalPages ?? 0, secondSearch.data?.pagination.totalPages ?? 0);
  const total = (battingSearch.data?.pagination.total ?? 0) + (secondSearch.data?.pagination.total ?? 0);

  function update(changes: Record<string, string>) {
    const next = new URLSearchParams(params);
    next.delete("page");
    for (const [key, value] of Object.entries(changes)) {
      if (value) next.set(key, value);
      else next.delete(key);
    }
    navigate(`/pressurelab/results?${next}`);
  }

  function applyFilters(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const selected = Object.fromEntries([...data].map(([key, value]) => [key, String(value)]));
    const availableRoles = selected.discipline === "batting" ? battingRoles : bowlingRoles;
    if (!availableRoles.includes(selected.role)) selected.role = "";
    update(selected);
  }

  const compareIds = compare.map(row => row.cricsheet_id);
  const compareParams = new URLSearchParams({
    ids: compareIds.join(","),
    discipline: compare[0]?.discipline ?? discipline,
    phase: compare[0]?.phase ?? phase,
    competitions,
    recentSeasons: String(recentSeasons),
    ...(team ? { team } : {}),
  });
  const room = team ? `/pressurelab?team=${team.toLowerCase()}` : "/pressurelab";
  return (
    <Layout hideRightPanel>
      <main className="scout-results-page" style={{ "--team-accent": franchise?.accent ?? "#38bdf8" } as CSSProperties}>
        <nav aria-label="Scout breadcrumbs" className="scout-breadcrumb">
          <Link href={room}>Scout Room</Link><span aria-hidden="true">/</span><span aria-current="page">{titles[preset] ?? "Search Results"}</span>
        </nav>
        <header className="scout-strategy-brief">
          <p className="scout-results-eyebrow">{franchise?.name ?? "Global T20"} · Pressure Lab</p>
          <div className="scout-workspace-heading">
            <h1>{titles[preset] ?? "Scouting Results"}</h1>
            <span>{recentSeasons} recent seasons · {phases[phase]}</span>
          </div>
          <form className="scout-inside-search" onSubmit={event => { event.preventDefault(); update({ q: input.trim(), sourcePlayer: "" }); }}>
            <input aria-label="Search player name" placeholder={preset === "replacement" ? "Enter the player you want to replace" : "Search a player or enter a scouting question"} value={input} maxLength={1500} onChange={event => setInput(event.target.value)} />
            <button type="submit">Search</button>
          </form>
        </header>
        <div className="scout-results-workspace">
          <aside className="scout-filter-desk">
            <h2>Filter Desk</h2>
            <form onSubmit={applyFilters}>
              <label>Discipline<select name="discipline" defaultValue={discipline}><option value="batting">Batting</option><option value="bowling">Bowling</option></select></label>
              <label>Role<select name="role" defaultValue={role}>
                <option value="">All roles</option>
                <optgroup label="Batting"><option value="opener">Opener</option><option value="top_order">Top order</option><option value="middle_order">Middle order</option><option value="finisher">Finisher</option><option value="lower_order">Lower order</option></optgroup>
                <optgroup label="Bowling"><option value="powerplay_specialist">Powerplay specialist</option><option value="middle_specialist">Middle overs specialist</option><option value="death_specialist">Death specialist</option><option value="multi_phase">Multi-phase</option><option value="part_time">Part-time</option></optgroup>
              </select></label>
              <label>League<select name="competitions" defaultValue={competitions}><option value="">All leagues</option>
                {competitions.includes(",") && <option value={competitions}>Selected leagues</option>}
                {SCOUT_LEAGUES.map(league => <option key={league.code} value={league.code}>{league.name}</option>)}
                <option value="t20i">Men’s T20Is</option>
              </select></label>
              <label>Recent seasons<select name="recentSeasons" defaultValue={recentSeasons}><option value="1">Last season</option><option value="2">Last two seasons</option><option value="3">Last three seasons</option><option value="5">Last five seasons</option></select></label>
              <label>Match phase<select name="phase" defaultValue={phase}>{Object.entries(phases).map(([id, label]) => <option value={id} key={id}>{label}</option>)}</select></label>
              <label>Minimum balls<input name="minBalls" type="number" min="0" max="10000" defaultValue={minBalls} required /></label>
              <button type="submit">Apply Filters</button>
            </form>
          </aside>
          <section className="scout-candidate-panel" aria-label="Scouting Results">
            <div className="scout-result-tabs">
              <button type="button" aria-pressed={view === "players"} onClick={() => setView("players")}>Players ({aiCandidates?.length || total})</button>
              <button type="button" aria-pressed={view === "shortlist"} onClick={() => setView("shortlist")}>Shortlist ({shortlist.length})</button>
              {compare.length >= 2 && <Link href={`/pressurelab/compare?${compareParams}`}>Compare ({compare.length})</Link>}
            </div>
            <h2>Scouting Results</h2>
            {preset === "young" && <p className="scout-workspace-note">Shows players under 23 with a recorded date of birth.</p>}
            {preset === "pace" && <p className="scout-workspace-note">Shows death-over bowlers with recorded pace or seam style.</p>}
            {ai.error && <p role="status" className="scout-workspace-note">{ai.error.message} Database results remain available.</p>}
            {ai.data && <details className="scout-workspace-note"><summary>Scout AI brief</summary><p className="whitespace-pre-wrap">{ai.data.text}</p></details>}
            {error && view === "players" && <p role="alert" className="scout-workspace-note">{error.message} <button type="button" onClick={() => { if (battingSearch.isError) void battingSearch.refetch(); if (secondSearch.isError) void secondSearch.refetch(); }}>Retry</button></p>}
            {loading ? <div className="scout-results-loading" role="status"><ScoutBallLoader/><p>Loading scouting results</p></div> :
              rows.length ? <div className="scout-table-scroll"><table className="scout-results-table">
                <thead><tr><th>Player</th><th>Role / league</th><th>Sample</th><th>SR / Econ</th><th>Compare</th></tr></thead>
                <tbody>{rows.map(row => <tr key={rowKey(row)} data-selected={rowKey(row) === (active && rowKey(active))}>
                  <td><button type="button" className="scout-table-player" onClick={() => setSelection(rowKey(row))}><PlayerAvatar name={row.name} className="h-8 w-8 shrink-0 rounded-md" disableHover/>{row.name}</button></td>
                  <td>{row.role.label.replaceAll("_", " ")}<small>{SCOUT_LEAGUES.find(league => league.code === row.competition)?.name ?? row.competition.toUpperCase()}</small></td>
                  <td>{row.matches} matches<small>{row.balls} balls</small></td>
                  <td>{number(primaryMetric(row)?.value)}</td>
                  <td><input type="checkbox" aria-label={`Compare ${row.name}`}
                    checked={compareIds.includes(row.cricsheet_id)}
                    disabled={!compareIds.includes(row.cricsheet_id) && (compare.length >= 3 || (!!compare[0] && (compare[0].discipline !== row.discipline || compare[0].phase !== row.phase)))}
                    onChange={event => setCompare(event.target.checked ? [...compare, row] : compare.filter(item => item.cricsheet_id !== row.cricsheet_id))}/></td>
                </tr>)}</tbody>
              </table></div> : <p className="scout-workspace-note">{view === "shortlist" ? "Your shortlist is empty." : preset === "replacement" && !question && !role ? "Search for a player to find candidates in their recorded role." : "No players matched on this page. Broaden the filters or check the next page when available."}</p>}
            {view === "players" && !aiCandidates?.length && pages > 1 && <div className="scout-pagination">
              <button type="button" disabled={page <= 1} onClick={() => update({ page: String(page - 1) })}>Previous</button><span>Page {page} of {pages}</span><button type="button" disabled={page >= pages} onClick={() => update({ page: String(page + 1) })}>Next</button>
            </div>}
          </section>
          <aside className="scout-fit-panel">
            <h2>Player Scout Report</h2>
            {active ? <>
              <div className="scout-report-player"><PlayerAvatar name={active.name} className="h-14 w-14 shrink-0 rounded-xl" disableHover/><div><strong>{active.name}</strong><p>{active.role.label.replaceAll("_", " ")}</p></div></div>
              <dl className="scout-report-metrics">
                <div><dt>Matches</dt><dd>{active.matches}</dd></div><div><dt>Balls</dt><dd>{active.balls}</dd></div>
                <div><dt>{active.discipline === "batting" ? "Strike rate" : "Economy"}</dt><dd>{number(primaryMetric(active)?.value)}</dd></div>
                <div><dt>League percentile</dt><dd>{number(primaryMetric(active)?.percentile)}</dd></div>
                <div><dt>Dot ball %</dt><dd>{number(active.metrics.dot_pct?.value)}</dd></div>
                <div><dt>Boundary %</dt><dd>{number(active.metrics.boundary_pct?.value)}</dd></div>
              </dl>
              <dl className="scout-report-evidence">
                <div><dt>Phase</dt><dd>{phases[active.phase]}</dd></div>
                <div><dt>Seasons</dt><dd>{active.seasons.join(", ")}</dd></div>
                <div><dt>Nationality</dt><dd>{active.verifiedAttributes?.nationality?.value ?? "Unverified"}</dd></div>
                <div><dt>Bowling style</dt><dd>{attribute(active, /bowling_style/) ?? "Unverified"}</dd></div>
                <div><dt>Date of birth</dt><dd>{attribute(active, /^date_of_birth$/i) ?? "Unverified"}</dd></div>
              </dl>
              <PhasePerformance key={rowKey(active)} player={active}/>
              <RetentionAssessment player={active}/>
              <div className="scout-report-actions">
                <button type="button" onClick={() => toggleShortlist(active)}>{isShortlisted(active.cricsheet_id) ? "Remove from Shortlist" : "Add to Shortlist"}</button>
                <Link href={`/pressurelab/player/${encodeURIComponent(active.cricsheet_id)}`}>Full Player Profile</Link>
                {preset === "replacement" && !["insufficient","none"].includes(active.role.label) && <button type="button" onClick={() => update({ q: "", discipline: active.discipline, role: active.role.label, sourcePlayer: active.cricsheet_id })}>Find players in this role</button>}
              </div>
            </> : <p className="scout-workspace-note">Select a player to view their report.</p>}
          </aside>
        </div>
        <details className="scout-planning"><summary>2027 pre-season planning</summary><PreseasonRecruitment team={team}/></details>
      </main>
    </Layout>
  );
}
