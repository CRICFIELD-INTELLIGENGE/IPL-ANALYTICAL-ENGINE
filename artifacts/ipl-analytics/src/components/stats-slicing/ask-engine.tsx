// Ask AI (desktop): question → AskQuery (ask-parser) → the Stats Centre's own /api/stats/query → ranked, explained table.
// Numbers are only ever read from the API response; nothing is estimated in the browser.
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { defaultAnalyticsFilters, type AnalyticsFilters } from "@/lib/store";
import { playerSlug, usePlayerDisplayNames, displayPlayerName } from "@/lib/aggregates";
import { parseAsk, askParams, METRIC_FIELD, METRIC_LABEL, type AskContext, type AskQuery, type Metric } from "./ask-parser";
import type { MatchState } from "./match-state";
import { downloadCsv, toCsv } from "./slice-url";

type Turn = { question: string; query: AskQuery };

const EXAMPLES = [
  "Top 10 Indian death-over batters since 2022 with at least 250 balls",
  "Compare Jaiswal and Gill in powerplay strike rate between 2022 and 2026",
  "Show Kohli's performance against Rashid Khan",
  "Which leg-spinners perform best against left-handed batters?",
  "Which batters score fastest when the required rate exceeds 12?",
  "How has Riyan Parag's middle-over performance changed since 2022?",
];

const FILTER_LABEL: Partial<Record<keyof AnalyticsFilters, string>> = {
  season: "Season", seasonFrom: "From", seasonTo: "To", team: "Team", opposition: "Opponent", venue: "Venue", phase: "Phase",
  bowler_type: "Bowler type", bowlStyle: "Bowling style", batterHandedness: "Batter hand", nationality: "Nationality", innings: "Innings",
  match_context: "Match type", pressure_state: "Pressure", batter: "Batter", bowler: "Bowler", overRange: "Overs", dateFrom: "From date",
  dateTo: "To date", battingPosition: "Batting position", matchResult: "Result",
};

async function fetchStats(params: string, signal?: AbortSignal) {
  const res = await fetch(`/api/stats/query?${params}`, { signal });
  const type = res.headers.get("content-type") ?? "";
  if (!res.ok || !type.includes("application/json")) {
    const body = type.includes("application/json") ? (await res.json().catch(() => ({})))?.error : "";
    throw new Error(body || `Stats API returned ${res.status}`);
  }
  const json = await res.json();
  if (!Array.isArray(json?.batters) || !Array.isArray(json?.bowlers)) throw new Error("Invalid statistics response");
  return json as { batters: any[]; bowlers: any[] };
}

export function AskEngineView({ sliceFilters, sliceMatchState, minBalls, batterNames, bowlerNames, venues, onApply }: {
  sliceFilters: AnalyticsFilters; sliceMatchState: MatchState; minBalls: number;
  batterNames: string[]; bowlerNames: string[]; venues: string[];
  onApply: (patch: Partial<AnalyticsFilters>, ms: MatchState, tab: "batters" | "bowlers", engine?: "pressure" | "batter-lens") => void;
}) {
  const displayNames = usePlayerDisplayNames();
  const [input, setInput] = useState("");
  const [turns, setTurns] = useState<Turn[]>([]);
  const [useSlice, setUseSlice] = useState(true);
  const ctx = useMemo<AskContext>(() => ({
    players: [
      ...batterNames.map((name, i) => ({ name, display: displayPlayerName(name, displayNames), balls: batterNames.length - i, role: "batters" as const })),
      ...bowlerNames.map((name, i) => ({ name, display: displayPlayerName(name, displayNames), balls: bowlerNames.length - i, role: "bowlers" as const })),
    ],
    venues,
    years: Array.from({ length: new Date().getFullYear() - 2007 }, (_, i) => String(2008 + i)).filter(y => Number(y) <= 2026),
  }), [batterNames, bowlerNames, venues, displayNames]);

  const current = turns[turns.length - 1]?.query;
  // Dimensional Slicing is the base context; the question's own filters override it.
  const sliceBase = useMemo(() => {
    if (!useSlice) return {};
    return Object.fromEntries(Object.entries(sliceFilters).filter(([k, v]) => v !== (defaultAnalyticsFilters as any)[k])) as Partial<AnalyticsFilters>;
  }, [useSlice, sliceFilters]);
  const effective = current && {
    filters: { ...sliceBase, ...current.filters, ...(current.intent === "compare" && current.players.length ? { [current.role === "bowlers" ? "bowler" : "batter"]: current.players.join("|") } : {}) } as Partial<AnalyticsFilters>,
    matchState: { ...(useSlice ? sliceMatchState : {}), ...current.matchState },
  };
  if (effective && current?.intent === "player") (effective.filters as any)[current.role === "bowlers" ? "bowler" : "batter"] = current.players[0];
  const runnable = current && ["leaderboard", "player", "compare", "matchup"].includes(current.intent);
  const params = effective ? askParams(effective.filters, effective.matchState, defaultAnalyticsFilters) : "";

  const result = useQuery({
    queryKey: ["ask-stats", params],
    queryFn: ({ signal }) => fetchStats(params, signal),
    enabled: !!runnable,
    staleTime: 5 * 60_000,
  });

  // Trend: one query per season, same endpoint, same filters.
  const trendYears = current?.intent === "trend" ? ctx.years.filter(y => y >= (effective!.filters.seasonFrom || "2008") && y <= (effective!.filters.seasonTo || "2026")) : [];
  const trend = useQuery({
    queryKey: ["ask-trend", params, trendYears.join(",")],
    queryFn: async ({ signal }) => {
      const out: { season: string; row: any | null }[] = [];
      for (const season of trendYears) {
        const p = askParams({ ...effective!.filters, season, seasonFrom: "", seasonTo: "", [current!.role === "bowlers" ? "bowler" : "batter"]: current!.players[0] }, effective!.matchState, defaultAnalyticsFilters);
        const r = await fetchStats(p, signal);
        out.push({ season, row: (current!.role === "bowlers" ? r.bowlers : r.batters).find(x => x.player === current!.players[0]) ?? null });
      }
      return out;
    },
    enabled: current?.intent === "trend" && trendYears.length > 0 && trendYears.length <= 19,
    staleTime: 5 * 60_000,
  });

  const metric = current?.metric ?? "runs";
  const field = METRIC_FIELD[metric];
  const rows = useMemo(() => {
    if (!current || !result.data) return [];
    const list = (current.role === "bowlers" ? result.data.bowlers : result.data.batters)
      .filter(r => (r.balls ?? 0) >= Math.max(current.minBalls, minBalls) && (r.innings ?? 0) >= current.minInnings && Number.isFinite(Number(r[field])))
      .filter(r => !["compare", "player", "matchup"].includes(current.intent) || current.players.includes(r.player));
    // Bowling average / strike rate are 0 with no wickets; those rows can't rank on them.
    const ranked = (["bowlAvg", "bowlSr"] as Metric[]).includes(metric) ? list.filter(r => (r.wickets ?? 0) > 0) : list;
    ranked.sort((a, b) => (current.order === "asc" ? a[field] - b[field] : b[field] - a[field]) || (b.balls ?? 0) - (a.balls ?? 0));
    return ["compare", "player", "matchup"].includes(current.intent) ? ranked : ranked.slice(0, current.limit);
  }, [current, result.data, field, metric, minBalls]);

  const ask = (question: string) => {
    const text = question.trim().slice(0, 300);
    if (!text) return;
    const prevTop = rows.map(r => r.player);
    setTurns(t => [...t.slice(-9), { question: text, query: parseAsk(text, ctx, t[t.length - 1]?.query, prevTop) }]);
    setInput("");
  };
  const removeFilter = (key: string) => setTurns(t => {
    const last = t[t.length - 1];
    if (!last) return t;
    const filters = { ...last.query.filters, [key]: (defaultAnalyticsFilters as any)[key] };
    return [...t.slice(0, -1), { ...last, query: { ...last.query, filters } }];
  });

  const chips = effective ? Object.entries(effective.filters).filter(([k, v]) => v && v !== (defaultAnalyticsFilters as any)[k] && FILTER_LABEL[k as keyof AnalyticsFilters]) : [];
  const msChips = effective ? Object.entries(effective.matchState) : [];
  const role = current?.role ?? "batters";
  const cols: [string, string][] = role === "bowlers"
    ? [["balls", "Balls"], ["wickets", "Wkts"], ["econ", "Econ"], ["avg", "Avg"], ["sr", "SR"], ["dotPct", "Dot%"], ["matches", "Mts"]]
    : [["runs", "Runs"], ["balls", "Balls"], ["sr", "SR"], ["avg", "Avg"], ["dismissals", "Outs"], ["dotPct", "Dot%"], ["boundaryPct", "Bdry%"], ["matches", "Inns"]];
  const lowSample = rows.filter(r => (r.balls ?? 0) < 120).length;
  const answer = (() => {
    if (!current || !rows.length) return null;
    const top = rows[0];
    const name = displayPlayerName(top.player, displayNames);
    const val = (r: any) => Number(r[field]).toLocaleString("en-IN", { maximumFractionDigits: 2 });
    if (current.intent === "player" || current.intent === "matchup") {
      return current.intent === "matchup"
        ? `${name} against ${displayPlayerName(String(effective!.filters.bowler), displayNames)}: ${top.runs} runs off ${top.balls} balls, ${top.dismissals ?? "?"} dismissals, strike rate ${top.sr}.`
        : `${name}: ${METRIC_LABEL[metric].toLowerCase()} ${val(top)} (${top.balls} balls${role === "batters" ? `, ${top.runs} runs` : `, ${top.wickets} wickets`}).`;
    }
    if (current.intent === "compare") return rows.map(r => `${displayPlayerName(r.player, displayNames)} ${val(r)}`).join(" · ") + ` (${METRIC_LABEL[metric]})`;
    return `${name} leads on ${METRIC_LABEL[metric].toLowerCase()} with ${val(top)} from ${top.balls} balls.`;
  })();

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-4 pt-4">
      <div>
        <h2 className="text-[24px] font-black uppercase tracking-tight">Ask the Database</h2>
        <p className="text-sm text-slate-600 dark:text-white/60">Questions are translated into the Stats Centre's own filters and answered from the IPL ball-by-ball warehouse. No language model writes queries or numbers.</p>
      </div>
      <form className="flex gap-2" onSubmit={e => { e.preventDefault(); ask(input); }}>
        <input aria-label="Cricket question" value={input} onChange={e => setInput(e.target.value)} maxLength={300}
          placeholder={current ? "Follow up: “Only Indian players”, “Minimum 250 balls”, “Now rank by strike rate”…" : "Ask a cricket question…"}
          className="stats-tool-panel min-w-0 flex-1 px-4 py-2 text-sm" />
        <button className="rounded-xl bg-primary px-4 py-2 text-sm font-bold text-white" type="submit">Ask</button>
        {turns.length > 0 && <button type="button" className="rounded-xl border border-slate-200 dark:border-white/10 px-3 py-2 text-sm" onClick={() => setTurns([])}>New question</button>}
      </form>
      {!current && (
        <div className="flex flex-wrap gap-2">
          {EXAMPLES.map(e => <button key={e} type="button" className="stats-tool-chip rounded-lg px-3 py-1 text-xs text-left" onClick={() => ask(e)}>{e}</button>)}
        </div>
      )}
      <label className="flex items-center gap-2 text-xs">
        <input type="checkbox" checked={useSlice} onChange={e => setUseSlice(e.target.checked)} /> Start from the active Dimensional Slicing filters
      </label>

      {turns.length > 1 && (
        <ol className="text-xs text-slate-500 dark:text-white/50 list-decimal pl-5">{turns.map((t, i) => <li key={i}>{t.question}</li>)}</ol>
      )}

      {current && (
        <section aria-live="polite" className="stats-tool-panel p-4 flex flex-col gap-3 text-sm">
          <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
            <span className="font-black uppercase text-[10px] text-slate-500 dark:text-white/40 mr-1">Interpreted as</span>
            <span className="rounded-full bg-primary/10 px-2 py-0.5 font-bold">{current.intent}</span>
            <span className="rounded-full bg-primary/10 px-2 py-0.5 font-bold">{role}</span>
            {runnable && <span className="rounded-full bg-primary/10 px-2 py-0.5 font-bold">{METRIC_LABEL[metric]} {current.order === "asc" ? "↑" : "↓"}</span>}
            {chips.map(([k, v]) => (
              <button key={k} type="button" title="Remove this filter" onClick={() => removeFilter(k)}
                className="rounded-full border border-amber-400/40 bg-amber-400/10 px-2 py-0.5 font-bold hover:line-through">
                {FILTER_LABEL[k as keyof AnalyticsFilters]}: {String(v).split("|").join(", ")} ✕
              </button>
            ))}
            {msChips.map(([k, v]) => <span key={k} className="rounded-full border border-amber-400/40 px-2 py-0.5 font-bold">{k} {v}</span>)}
            {(current.minBalls || minBalls) > 0 && <span className="rounded-full border px-2 py-0.5">≥ {Math.max(current.minBalls, minBalls)} balls</span>}
          </div>
          {current.notes.map(n => <p key={n} className="text-[11px] text-slate-500 dark:text-white/50">Assumption: {n}</p>)}

          {current.intent === "unsupported" && <p role="status"><strong>Not answerable yet.</strong> {current.unsupported}</p>}
          {(current.intent === "pressure" || current.intent === "batter-lens") && (
            <div role="status" className="flex flex-wrap items-center gap-3">
              <p>{current.intent === "pressure"
                ? "Pressure reliability is ranked by the Scenario Intelligence engine (empirical-Bayes estimate with 90% intervals). Open it with these filters to see the real ranking."
                : "RAA / 100 comes from the Batter Lens engine's contextual expectations. Open it with these filters to see the ranking."}</p>
              <button type="button" className="rounded-lg bg-amber-400 px-3 py-1.5 text-xs font-black text-black"
                onClick={() => onApply(effective!.filters, effective!.matchState, current.role, current.intent === "pressure" ? "pressure" : "batter-lens")}>Open in Stats Centre</button>
            </div>
          )}

          {runnable && (result.isLoading ? <p role="status">Querying the warehouse…</p>
            : result.isError ? <p role="alert">The stats query failed: {(result.error as Error).message}</p>
            : !rows.length ? <p role="status">No player meets these filters{current.minBalls ? ` with at least ${current.minBalls} balls` : ""}. Try removing a filter.</p>
            : <>
              {answer && <p className="font-bold">{answer}</p>}
              <div className="overflow-x-auto">
                <table className="w-full text-[12px]">
                  <thead><tr className="text-left text-[10px] uppercase text-slate-500 dark:text-white/40">
                    <th className="py-1 pr-2">#</th><th className="py-1 pr-2">Player</th>{cols.map(([k, l]) => <th key={k} className={`py-1 pr-2 text-right ${k === field ? "text-amber-600 dark:text-amber-300" : ""}`}>{l}</th>)}
                  </tr></thead>
                  <tbody>{rows.map((r, i) => (
                    <tr key={r.player} className="border-t border-slate-100 dark:border-white/5">
                      <td className="py-1 pr-2">{i + 1}</td>
                      <td className="py-1 pr-2 font-bold"><Link href={`/players/${playerSlug(r.player)}`} className="hover:underline">{displayPlayerName(r.player, displayNames)}</Link></td>
                      {cols.map(([k]) => <td key={k} className={`py-1 pr-2 text-right tabular-nums ${k === field ? "font-black" : ""}`}>{r[k] ?? "—"}</td>)}
                    </tr>
                  ))}</tbody>
                </table>
              </div>
              {lowSample > 0 && <p className="text-[11px] text-amber-600 dark:text-amber-300">{lowSample} row(s) rest on fewer than 120 balls: treat rates as unstable.</p>}
              <p className="text-[11px] text-slate-500 dark:text-white/40">
                {METRIC_LABEL[metric]}: {role === "bowlers" ? "runs conceded exclude byes and leg-byes; economy uses legal balls; wickets exclude run-outs." : "batter runs only; strike rate per 100 legal balls; average = runs ÷ dismissals in the slice."}
                {" "}Coverage: IPL 2008–2026 ball-by-ball (Cricsheet), super overs excluded.
              </p>
              <div className="flex flex-wrap gap-2">
                <button type="button" className="rounded-lg bg-amber-400 px-3 py-1.5 text-xs font-black text-black" onClick={() => onApply(effective!.filters, effective!.matchState, current.role)}>Apply to Stats Centre</button>
                <button type="button" className="rounded-lg border border-slate-200 dark:border-white/10 px-3 py-1.5 text-xs font-bold"
                  onClick={() => downloadCsv("cricfield-ask.csv", toCsv(rows, ["player", ...cols.map(([k]) => k)], [`Question: ${turns[turns.length - 1].question}`, `Query: /api/stats/query?${params}`]))}>Export CSV</button>
              </div>
            </>)}

          {current.intent === "trend" && (trend.isLoading ? <p role="status">Querying {trendYears.length} seasons…</p>
            : trend.isError ? <p role="alert">The stats query failed: {(trend.error as Error).message}</p>
            : <table className="w-full text-[12px]"><thead><tr className="text-left text-[10px] uppercase text-slate-500 dark:text-white/40"><th>Season</th>{cols.map(([k, l]) => <th key={k} className="text-right">{l}</th>)}</tr></thead>
              <tbody>{(trend.data ?? []).map(({ season, row }) => (
                <tr key={season} className="border-t border-slate-100 dark:border-white/5"><td className="py-1">{season}</td>
                  {row ? cols.map(([k]) => <td key={k} className="text-right tabular-nums">{row[k] ?? "—"}</td>) : <td colSpan={cols.length} className="text-right text-slate-400">no balls in this slice</td>}
                </tr>))}</tbody></table>)}
        </section>
      )}
    </div>
  );
}
