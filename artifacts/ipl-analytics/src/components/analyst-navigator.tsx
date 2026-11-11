// AI Analyst Navigator — the right-hand panel. Replaces the old "Intelligence Feed" of hard-coded alerts.
// Three parts, all honest about their source:
//   1. Where you are: what the current page answers and the best next pages.
//   2. Insight metrics: the selected franchise's record and form, computed from CricField match data.
//   3. Ask the AI Analyst: questions tailored to the page and franchise, handed to /ai-analyst/ask?q=…
import { useMemo } from "react";
import { Link, useLocation, useSearch } from "wouter";
import { ArrowRight, Compass, Gauge, MessageSquareText, Sparkles } from "lucide-react";
import { teamShort, useMatches, useTeams } from "@/lib/aggregates";
import { TEAM_REGISTRY, useTeamTheme, type TeamCode } from "@/lib/team-context";

type Guide = { title: string; answers: string; next: { label: string; href: string }[]; ask: (team: string) => string[] };

const DEFAULT_ASK = (t: string) => [`How did ${t} perform last season, phase by phase?`, `Which ${t} players carried the batting since 2024?`, `Where does ${t} concede most runs at the death?`];

// Route prefix → guidance. The first matching prefix wins, so more specific prefixes come first.
const GUIDES: [string, Guide][] = [
  ["/feed/ipl-2027", { title: "IPL 2027 Intelligence Hub", answers: "Historical squad evidence and local scenarios. Reported dates, confirmed facts and analytical conclusions are labeled separately.", next: [
    { label: "IPL 2027 Overview", href: "/feed/ipl-2027?module=overview" },
    { label: "Retention Lab", href: "/feed/ipl-2027?module=retention" },
    { label: "Squad Gap Analyzer", href: "/feed/ipl-2027?module=gaps" },
    { label: "Franchise Intelligence Briefs", href: "/feed/ipl-2027?module=brief" },
    { label: "Scout Radar", href: "/scout" },
    { label: "Tactical Intelligence", href: "/feed/ipl-2027?module=tools" },
    { label: "Existing Auction War Room", href: "/ai-analyst/auction-war-room" },
    { label: "Retention Room", href: "/retention-room" },
  ], ask: t => [`Which historical role gaps should ${t} review for 2027?`, `Compare ${t}'s recent batting and bowling phases using warehouse data.`, `Which ${t} players have sufficient evidence for a retention scenario?`] }],
  ["/dugout/articles", { title: "Reading an article", answers: "One question about the franchise, argued from ball-by-ball evidence. Every number links to the method behind it.", next: [{ label: "All 100 franchise articles", href: "/intelligence" }, { label: "Back to the Dugout", href: "/dugout" }, { label: "Check a player in Stats", href: "/stats" }], ask: (t) => [`Is this article's finding about ${t} still true in the latest season?`, `What would change this conclusion for ${t}?`, `Which ${t} players drive this result?`] }],
  ["/dugout", { title: "Franchise Dugout", answers: "A franchise at a glance: season record, squad, rivalries and its ten latest stories.", next: [{ label: "All articles on Intelligence", href: "/intelligence" }, { label: "Scout replacement players", href: "/scout" }, { label: "Compare teams in Stats", href: "/stats" }], ask: DEFAULT_ASK }],
  ["/intelligence", { title: "Intelligence hub", answers: "Every article for the franchise, filterable by angle: batting, bowling, tactics, auction, history, data science and more.", next: [{ label: "Franchise Dugout", href: "/dugout" }, { label: "Open the AI Analyst", href: "/ai-analyst" }, { label: "Visual dashboards", href: "/visualizations" }], ask: (t) => [`Summarise the strongest evidence-led findings about ${t}.`, `What is ${t}'s biggest weakness by phase?`, `How does ${t} compare with the league since 2024?`] }],
  ["/ai-analyst", { title: "AI Analyst", answers: "Ask the warehouse directly, or use a tool: weakness finder, pressure map, strategy simulator, auction war room.", next: [{ label: "Ask a question", href: "/ai-analyst/ask" }, { label: "Weakness finder", href: "/ai-analyst/weakness" }, { label: "Auction war room", href: "/ai-analyst/auction-war-room" }], ask: DEFAULT_ASK }],
  ["/scout", { title: "Scout Lab", answers: "Find players by role and evidence, and test how they would fit a squad.", next: [{ label: "Auction war room", href: "/ai-analyst/auction-war-room" }, { label: "Player stats", href: "/stats" }, { label: "Franchise Dugout", href: "/dugout" }], ask: (t) => [`Which death-overs hitters would suit ${t}?`, `Which low-cost Indian bowlers outperformed their price since 2024?`, `What role is ${t} missing most?`] }],
  ["/stats", { title: "Stats", answers: "Season, team and player tables straight from the ball-by-ball warehouse.", next: [{ label: "Visual dashboards", href: "/visualizations" }, { label: "Ask the AI Analyst", href: "/ai-analyst/ask" }, { label: "Scout Lab", href: "/scout" }], ask: (t) => [`Who are ${t}'s most efficient batters since 2024?`, `Rank ${t}'s bowlers by death-overs economy.`, `How has ${t}'s run rate changed by season?`] }],
  ["/scores", { title: "Scores", answers: "Live and recent scorecards.", next: [{ label: "Match pulse", href: "/pulse" }, { label: "Franchise Dugout", href: "/dugout" }], ask: (t) => [`What usually decides ${t}'s chases?`, `How does ${t} bat in the last five overs?`, DEFAULT_ASK(t)[0]] }],
  ["/pulse", { title: "Pulse", answers: "Momentum and pressure moments across matches.", next: [{ label: "Pressure map", href: "/ai-analyst/pressure" }, { label: "Scores", href: "/scores" }], ask: (t) => [`When does ${t} lose momentum in a chase?`, `Which overs hurt ${t} most?`, DEFAULT_ASK(t)[2]] }],
  ["/feed", { title: "2027 Intel", answers: "Forward look at the next season: squads, gaps and priorities.", next: [{ label: "Strategy simulator", href: "/ai-analyst/strategy-sim" }, { label: "Auction war room", href: "/ai-analyst/auction-war-room" }], ask: (t) => [`What should ${t} prioritise for 2027?`, `Which ${t} phase gap is largest relative to the league?`, DEFAULT_ASK(t)[1]] }],
  ["/visualizations", { title: "Visuals", answers: "Charts of the same warehouse data, for comparing teams and seasons at a glance.", next: [{ label: "Stats tables", href: "/stats" }, { label: "Ask the AI Analyst", href: "/ai-analyst/ask" }], ask: DEFAULT_ASK }],
  ["/home", { title: "Home", answers: "Start here: pick a franchise, then open its Dugout or ask the AI Analyst a question.", next: [{ label: "Franchise Dugout", href: "/dugout" }, { label: "Intelligence hub", href: "/intelligence" }, { label: "AI Analyst", href: "/ai-analyst" }], ask: DEFAULT_ASK }],
];
const FALLBACK: Guide = { title: "Explore CricField", answers: "Every page draws on the same ball-by-ball IPL warehouse (2008–2026).", next: [{ label: "Franchise Dugout", href: "/dugout" }, { label: "Intelligence hub", href: "/intelligence" }, { label: "AI Analyst", href: "/ai-analyst" }], ask: DEFAULT_ASK };

const seasonYear = (s: string) => Number(String(s).slice(0, 4));

/** Record, win rate and form for one franchise, from CricField's match list (newest first). */
function useFranchiseMetrics(code: TeamCode | null) {
  const { data: matches } = useMatches();
  const { data: teams } = useTeams();
  return useMemo(() => {
    if (!code || !matches?.length) return null;
    const mine = matches.filter((m) => teamShort(m.team1) === code || teamShort(m.team2) === code).sort((a, b) => b.date.localeCompare(a.date));
    if (!mine.length) return null;
    const latest = Math.max(...mine.map((m) => seasonYear(m.season)));
    const season = mine.filter((m) => seasonYear(m.season) === latest && m.winner);
    const won = season.filter((m) => teamShort(m.winner) === code).length;
    const form = mine.filter((m) => m.winner).slice(0, 5).map((m) => (teamShort(m.winner) === code ? "W" : "L"));
    const last = mine.find((m) => m.winner);
    const allTime = teams?.find((t) => teamShort(t.team) === code);
    return {
      latest,
      won,
      lost: season.length - won,
      winPct: season.length ? Math.round((won / season.length) * 100) : null,
      form,
      last: last ? { opp: teamShort(teamShort(last.team1) === code ? last.team2 : last.team1), won: teamShort(last.winner) === code, margin: last.margin, date: last.date } : null,
      allTimePct: allTime ? Math.round(allTime.winPct * (allTime.winPct <= 1 ? 100 : 1)) : null,
    };
  }, [code, matches, teams]);
}

export function AnalystNavigator() {
  const [location] = useLocation();
  const search = useSearch();
  const hubModule = new URLSearchParams(search).get("module") ?? "overview";
  const { selectedTeam } = useTeamTheme();
  const guide = GUIDES.find(([p]) => location === p || location.startsWith(`${p}/`) || location.startsWith(`${p}?`))?.[1] ?? FALLBACK;
  const teamName = selectedTeam ? TEAM_REGISTRY[selectedTeam]?.name ?? selectedTeam : null;
  const metrics = useFranchiseMetrics(selectedTeam ?? null);
  const questions = guide.ask(teamName ?? "a franchise");
  const askContext = location.startsWith("/feed/ipl-2027") ? ` Context: IPL 2027 ${hubModule}; use historical evidence only, label hypotheses, and state when official 2027 information is unavailable.` : "";

  return (
    <div className="flex h-full flex-col gap-4 overflow-y-auto p-4 no-scrollbar">
      <Link href="/ai-analyst">
        <div className="group mr-8 flex cursor-pointer items-center gap-2 border-b border-white/5 pb-3">
          <Sparkles className="h-4 w-4 text-primary transition-transform group-hover:scale-110" />
          <span className="text-[11px] font-black uppercase tracking-[0.2em] transition-colors group-hover:text-primary">AI Analyst Navigator</span>
        </div>
      </Link>

      {/* 1. Where you are */}
      <section className="space-y-2">
        <div className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-[0.2em] text-white/30">
          <Compass className="h-3 w-3" /> You are on
        </div>
        <div className="rounded-xl border border-white/5 bg-white/[0.03] p-3">
          <div className="text-[12px] font-bold text-white">{guide.title}</div>
          <p className="mt-1 text-[10px] leading-relaxed text-white/55">{guide.answers}</p>
        </div>
        <div className="space-y-1">
          {guide.next.map((n) => (
            <Link key={n.href + n.label} href={location.startsWith("/feed/ipl-2027") && n.href.startsWith("/feed/ipl-2027") && selectedTeam ? `${n.href}&team=${selectedTeam}` : n.href}>
              <div className="group flex cursor-pointer items-center justify-between rounded-lg px-2.5 py-1.5 text-[10px] font-semibold text-white/70 transition-colors hover:bg-white/5 hover:text-white">
                {n.label}
                <ArrowRight className="h-3 w-3 text-primary/60 transition-transform group-hover:translate-x-0.5" />
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* 2. Insight metrics */}
      <section className="space-y-2">
        <div className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-[0.2em] text-white/30">
          <Gauge className="h-3 w-3" /> {teamName ? `${selectedTeam} at a glance` : "Insight metrics"}
        </div>
        {!teamName ? (
          <p className="rounded-xl border border-dashed border-white/10 p-3 text-[10px] leading-relaxed text-white/50">Choose a franchise with the team switcher at the top to see its record and form here.</p>
        ) : !metrics ? (
          <p className="rounded-xl border border-white/5 p-3 text-[10px] text-white/40">Loading match data…</p>
        ) : (
          <div className="space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <Metric label={`${metrics.latest} record`} value={`${metrics.won}–${metrics.lost}`} />
              <Metric label={`${metrics.latest} win rate`} value={metrics.winPct == null ? "—" : `${metrics.winPct}%`} />
              <Metric label="All-time win rate" value={metrics.allTimePct == null ? "—" : `${metrics.allTimePct}%`} />
              <div className="rounded-xl border border-white/5 bg-white/[0.03] p-2.5">
                <div className="text-[8px] font-black uppercase tracking-widest text-white/35">Last 5</div>
                <div className="mt-1 flex gap-1">
                  {metrics.form.map((r, i) => (
                    <span key={i} className={`flex h-4 w-4 items-center justify-center rounded text-[8px] font-black ${r === "W" ? "bg-emerald-500/20 text-emerald-300" : "bg-red-500/15 text-red-300"}`}>{r}</span>
                  ))}
                </div>
              </div>
            </div>
            {metrics.last && (
              <p className="text-[10px] leading-relaxed text-white/55">
                Latest result: <span className={metrics.last.won ? "text-emerald-300" : "text-red-300"}>{metrics.last.won ? "won" : "lost"}</span> v {metrics.last.opp}
                {metrics.last.margin ? ` by ${metrics.last.margin}` : ""} ({metrics.last.date}).
              </p>
            )}
            <p className="text-[8px] uppercase tracking-wider text-white/25">Source: CricField ball-by-ball match data</p>
          </div>
        )}
      </section>

      {/* 3. Ask the AI Analyst */}
      <section className="space-y-2">
        <div className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-[0.2em] text-white/30">
          <MessageSquareText className="h-3 w-3" /> Ask the AI Analyst
        </div>
        {questions.map((q) => (
          <Link key={q} href={`/ai-analyst/ask?q=${encodeURIComponent(q + askContext)}`}>
            <div className="cursor-pointer rounded-xl border border-white/5 bg-gradient-to-br from-primary/[0.07] to-transparent p-2.5 text-[10px] leading-snug text-white/75 transition-all hover:border-primary/40 hover:text-white">
              {q}
            </div>
          </Link>
        ))}
      </section>

      <div className="mt-auto border-t border-white/5 pt-3">
        <Link href="/ai-analyst">
          <button className="w-full rounded-xl border border-primary/20 bg-primary/10 py-2.5 text-[9px] font-black uppercase tracking-widest text-primary transition-all hover:bg-primary/20">
            Open AI Analyst
          </button>
        </Link>
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/5 bg-white/[0.03] p-2.5">
      <div className="text-[8px] font-black uppercase tracking-widest text-white/35">{label}</div>
      <div className="mt-0.5 text-sm font-black text-white">{value}</div>
    </div>
  );
}
