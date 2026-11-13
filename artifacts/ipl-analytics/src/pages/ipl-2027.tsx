import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Link, useLocation, useSearch } from "wouter";
import {
  ArrowLeft,
  ArrowRight,
  Copy,
  Printer,
  Save,
  RotateCcw,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Layout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PlayerAvatar } from "@/components/player-avatar";
import {
  useMatches,
  useTeamAnalytics,
  type PlayerSeasonStats,
} from "@/lib/aggregates";
import { TEAM_REGISTRY, useTeamTheme } from "@/lib/team-context";
import { useIpl2027 } from "@/lib/use-ipl-2027";
import {
  DEFAULT_MODEL,
  DEFAULT_TARGETS,
  HUB_EVENTS,
  HUB_TEAMS,
  keyOf,
  parseScenario,
  playerHistory,
  retentionModel,
  squadGaps,
  type Decision,
  type HubPlayer,
  type HubTeam,
  type ModelConfig,
  type RoleTargets,
} from "@/lib/ipl-2027";
import "./ipl-2027.css";

const MODULES = [
  ["overview", "Overview"],
  ["retention", "Retention Lab"],
  ["gaps", "Squad Gap Analyzer"],
  ["brief", "Franchise Brief"],
  ["tools", "Scout & Tactics"],
] as const;
const EMPTY_STATS: PlayerSeasonStats = { batters: [], bowlers: [] };
const format = (n: number | null | undefined, dp = 1) =>
  n == null || !Number.isFinite(n) ? "Unavailable" : n.toFixed(dp);
const fieldClass =
  "rounded-lg border border-white/10 bg-background px-3 py-2 text-sm max-w-full";

function Section({
  title,
  description,
  children,
  id,
}: {
  title: string;
  description?: string;
  children: ReactNode;
  id?: string;
}) {
  return (
    <Card id={id} className="border-white/10 bg-white/[0.03] min-w-0">
      <CardHeader>
        <CardTitle
          role="heading"
          aria-level={2}
          className="text-lg font-display"
        >
          {title}
        </CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}
function Metric({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 font-display text-2xl font-bold">{value}</div>
    </div>
  );
}

export default function Ipl2027Page() {
  const search = useSearch();
  const [, navigate] = useLocation();
  const { selectedTeam } = useTeamTheme();
  const params = new URLSearchParams(search);
  const requestedTeam = params.get("team")?.toUpperCase();
  const team: HubTeam = HUB_TEAMS.includes(requestedTeam as HubTeam)
    ? (requestedTeam as HubTeam)
    : (selectedTeam ?? "RR");
  const requestedModule = params.get("module") ?? "overview";
  const module = MODULES.some(([id]) => id === requestedModule)
    ? requestedModule
    : "overview";
  const theme = TEAM_REGISTRY[team];
  const data = useIpl2027(team);
  const stats = data.stats ?? EMPTY_STATS;
  const matches = useMatches();
  const analytics = useTeamAnalytics(theme.name, 2024, 2026);
  const [targets, setTargets] = useState<RoleTargets>({ ...DEFAULT_TARGETS });
  const [model, setModel] = useState<ModelConfig>({ ...DEFAULT_MODEL });
  const [decisions, setDecisions] = useState<Record<string, Decision>>({});
  const [selectedId, setSelectedId] = useState("");
  const [filter, setFilter] = useState("");
  const [role, setRole] = useState("all");
  const [notice, setNotice] = useState("");
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const storageKey = `cricfield:ipl-2027:retention:${team}:v1`;
  const lastTeamSync = useRef<{ route: string; team: HubTeam } | null>(null);
  useEffect(() => {
    const route = requestedTeam ?? "";
    const previous = lastTeamSync.current;
    if (!previous || previous.route !== route) {
      lastTeamSync.current = { route, team };
    } else if (selectedTeam && selectedTeam !== previous.team) {
      // The existing header switcher also controls this workspace.
      lastTeamSync.current = { route, team: selectedTeam };
      navigate(
        `/feed/ipl-2027?${new URLSearchParams({ team: selectedTeam, module })}`,
      );
    }
  }, [requestedTeam, team, selectedTeam, module, navigate]);
  useEffect(() => {
    setDecisions({});
    setSelectedId("");
    setFilter("");
    setRole("all");
    setSavedAt(null);
    setNotice("");
    if (data.isPending) return;
    try {
      const raw = localStorage.getItem(storageKey);
      const saved = parseScenario(raw, team, data.roster);
      if (saved) {
        setDecisions(saved.decisions);
        setSavedAt(saved.savedAt);
      } else if (raw)
        setNotice(
          "Saved scenario could not be read; the source squad has been restored.",
        );
    } catch {
      setNotice(
        "Local storage unavailable. You can still use the lab in this session.",
      );
    }
  }, [team, storageKey, data.isPending]);
  const active = data.roster.filter(
    (p) => !["release", "trade"].includes(decisions[p.id]),
  );
  const gaps = squadGaps(active, targets);
  const selected =
    data.roster.find((p) => p.id === selectedId) ?? data.roster[0];
  const recommendation = selected
    ? retentionModel(selected, active, stats, data.candidates, model, targets)
    : null;
  const latestMatches = (matches.data ?? []).filter(
    (m) =>
      String(m.season).startsWith("2026") &&
      [m.team1, m.team2].includes(theme.name),
  );
  const knownCountries = active.filter((p) => p.overseas != null);
  const overseas = active.filter((p) => p.overseas === true).length;
  const indian = active.filter((p) => p.overseas === false).length;
  const pace = active.filter((p) =>
    /fast|medium|pace/i.test(p.bowlStyle ?? ""),
  ).length;
  const spin = active.filter((p) =>
    /spin|break|orthodox/i.test(p.bowlStyle ?? ""),
  ).length;
  const left = active.filter((p) => /left/i.test(p.batStyle ?? "")).length;
  const visible = data.roster.filter(
    (p) =>
      p.name.toLowerCase().includes(filter.toLowerCase()) &&
      (role === "all" || p.role === role),
  );
  const sourceDate = data.retrievedAt ?? "not recorded";
  function go(next: { team?: HubTeam; module?: string }) {
    navigate(
      `/feed/ipl-2027?${new URLSearchParams({ team: next.team ?? team, module: next.module ?? module })}`,
    );
  }
  function save() {
    try {
      const now = new Date().toISOString();
      localStorage.setItem(
        storageKey,
        JSON.stringify({ version: 1, team, savedAt: now, decisions }),
      );
      setSavedAt(now);
      setNotice("Scenario saved on this device.");
    } catch {
      setNotice("Could not save: browser storage is unavailable or full.");
    }
  }
  function reset() {
    setDecisions({});
    setSavedAt(null);
    try {
      localStorage.removeItem(storageKey);
      setNotice("Decisions reset and saved scenario removed.");
    } catch {
      setNotice(
        "Decisions reset for this session; browser storage could not be cleared.",
      );
    }
  }
  async function shareBrief() {
    const url = new URL(
      `${import.meta.env.BASE_URL}feed/ipl-2027?team=${team}&module=brief`,
      window.location.origin,
    ).href;
    try {
      await navigator.clipboard.writeText(url);
      setNotice(
        "Franchise brief link copied. Local scenario decisions are not included.",
      );
    } catch {
      setNotice(`Share this baseline brief: ${url}`);
    }
  }
  const evidenceLink = (
    <Link
      className="text-primary underline"
      href={`/teams/${keyOf(theme.name)}`}
    >
      Open franchise analytics
    </Link>
  );
  const gapContent = (
    <>
      <p className="text-sm text-muted-foreground mb-4">
        {active.length} options remain in your scenario. Role counts come from
        the squad snapshot; targets are adjustable planning assumptions.
      </p>
      <div className="h-[260px] min-w-0" aria-label="Squad role coverage chart">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={gaps}>
            <CartesianGrid strokeDasharray="3 3" stroke="#ffffff12" />
            <XAxis dataKey="role" tick={{ fill: "#94a3b8", fontSize: 11 }} />
            <YAxis
              allowDecimals={false}
              tick={{ fill: "#94a3b8", fontSize: 11 }}
            />
            <Tooltip
              contentStyle={{
                background: "#0B1020",
                border: "1px solid #ffffff20",
                borderRadius: 12,
              }}
            />
            <Bar
              dataKey="count"
              name="Scenario options"
              fill={theme.accent}
              radius={[4, 4, 0, 0]}
            />
            <Bar
              dataKey="target"
              name="Planning target"
              fill="#64748b"
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="grid sm:grid-cols-2 gap-3 mt-4">
        {gaps.map((g) => (
          <div key={g.role} className="rounded-xl border border-white/10 p-3">
            <div className="flex justify-between gap-2">
              <strong className="capitalize">{g.role}</strong>
              <Badge variant="outline">
                {g.count}/{g.target}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              {g.missing
                ? `${g.missing} more options needed under this target.`
                : "Target met; quality and phase suitability still require review."}
            </p>
          </div>
        ))}
      </div>
      <p className="mt-4 text-xs text-muted-foreground">
        Batting depth includes{" "}
        {
          active.filter(
            (p) =>
              p.role === "batter" ||
              p.role === "wicketkeeper" ||
              p.role === "all-rounder",
          ).length
        }{" "}
        batting-role options. Bowling coverage includes {pace} known pace and{" "}
        {spin} known spin profiles; {active.filter((p) => !p.bowlStyle).length}{" "}
        bowling styles unavailable. {left} known left-handed batting profiles.
        These are roster counts, not a predicted XI.
      </p>
    </>
  );

  return (
    <Layout>
      <div className="ipl-2027-page mx-auto max-w-7xl p-4 sm:p-6 space-y-6">
        <div className="flex flex-wrap justify-between items-center gap-3 print:hidden">
          <Link
            href="/feed"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Feed
          </Link>
          <Badge variant="outline">Historical evidence · 2027 scenarios</Badge>
        </div>
        <header className="rounded-3xl border border-white/10 bg-[#0B1020] p-5 sm:p-8 flex flex-wrap items-center gap-5">
          <img
            src={theme.logoImg}
            alt={team}
            className="w-16 h-16 object-contain"
          />
          <div className="flex-1 min-w-0">
            <p className="text-xs text-primary uppercase tracking-widest font-bold">
              The road to IPL 2027
            </p>
            <h1 className="text-2xl sm:text-4xl font-display font-black mt-2">
              IPL 2027 Intelligence Hub
            </h1>
            <p className="text-sm text-muted-foreground mt-2">
              {theme.name} · Plan from evidence. Keep predictions separate from
              facts.
            </p>
          </div>
          <label className="grid gap-1 text-xs print:hidden min-w-0 w-full sm:w-auto">
            Franchise
            <select
              aria-label="Franchise"
              value={team}
              onChange={(e) => go({ team: e.target.value as HubTeam })}
              className={fieldClass}
            >
              {HUB_TEAMS.map((code) => (
                <option key={code} value={code}>
                  {code} — {TEAM_REGISTRY[code].name}
                </option>
              ))}
            </select>
          </label>
        </header>
        <p className="text-xs text-muted-foreground rounded-xl border border-white/10 p-3">
          Baseline: 2026 listed squad, including season replacements; 2027
          eligibility and subsequent transfers require review. Source:{" "}
          {data.source}; retrieved {sourceDate}. Performance:
          player-season-stats.json, 2024–2026; update timestamp not recorded. No
          confirmed 2027 purse, contracts or auction entrant list is loaded.
        </p>
        {notice && (
          <p
            role="status"
            className="text-sm border border-primary/30 bg-primary/10 p-3 rounded-xl break-words"
          >
            {notice}
          </p>
        )}
        {data.isPending ? (
          <p role="status">Loading squad and historical evidence…</p>
        ) : data.rosterUnavailable || !data.roster.length ? (
          <Section title="Squad data unavailable">
            <p>
              No 2026 squad snapshot is available for {team}. No player
              assumptions have been added.
            </p>
            <Button onClick={() => void data.refetch()} className="mt-3">
              Retry data
            </Button>
          </Section>
        ) : (
          <>
            {data.statsUnavailable && (
              <p role="alert" className="text-amber-300 text-sm">
                Performance data unavailable. Composition and scenario controls
                still work; performance recommendations are withheld.
              </p>
            )}
            <Tabs
              value={module}
              onValueChange={(value) => go({ module: value })}
            >
              <div className="overflow-x-auto print:hidden">
                <TabsList className="w-max">
                  {MODULES.map(([id, label]) => (
                    <TabsTrigger value={id} key={id}>
                      {label}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </div>
              <TabsContent value="overview" className="space-y-6 mt-5">
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                  <Metric
                    label="Listed 2026 options"
                    value={data.roster.length}
                  />
                  <Metric
                    label="Scenario Indian / overseas"
                    value={`${indian} / ${overseas}`}
                  />
                  <Metric
                    label="Unknown nationality"
                    value={active.length - knownCountries.length}
                  />
                  <Metric
                    label="2027 confirmed retentions"
                    value="Unavailable"
                  />
                </div>
                <Section
                  title="Tournament preparation timeline"
                  description="Dates retain their verification status. No unverified countdown is shown."
                >
                  <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-3">
                    {HUB_EVENTS.map((event) => (
                      <article
                        key={event.id}
                        className="rounded-xl border border-white/10 p-4"
                      >
                        <Badge
                          variant="outline"
                          className={
                            event.status === "reported"
                              ? "text-amber-300"
                              : "text-muted-foreground"
                          }
                        >
                          {event.status}
                        </Badge>
                        <h3 className="font-semibold mt-3">{event.title}</h3>
                        <p className="font-mono text-sm mt-1">
                          {event.date
                            ? new Date(
                                `${event.date}T12:00:00+05:30`,
                              ).toLocaleDateString("en-IN", {
                                day: "numeric",
                                month: "long",
                                year: "numeric",
                                timeZone: "Asia/Kolkata",
                              })
                            : "Date unavailable"}
                        </p>
                        <p className="text-xs text-muted-foreground mt-2">
                          {event.note}
                        </p>
                        <p className="text-xs mt-2">
                          {event.sourceUrl ? (
                            <a
                              href={event.sourceUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="text-primary underline"
                            >
                              Reported source
                            </a>
                          ) : (
                            "Awaiting official source"
                          )}{" "}
                          · Checked {event.lastVerified}
                        </p>
                      </article>
                    ))}
                  </div>
                </Section>
                <Section
                  title="Squad composition & questions"
                  description="Analytical conclusions from the loaded roster, updated by your local decisions."
                >
                  {gapContent}
                  <div className="mt-4 flex flex-wrap gap-3">
                    <Button onClick={() => go({ module: "retention" })}>
                      Open Retention Lab
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => go({ module: "brief" })}
                    >
                      Read franchise brief
                    </Button>
                  </div>
                </Section>
              </TabsContent>
              <TabsContent value="gaps" className="space-y-5 mt-5">
                <Section
                  title="Squad Gap Analyzer"
                  description="Structural coverage is measured against your targets. There is no arbitrary overall squad score."
                >
                  {gapContent}
                </Section>
                <Section
                  title="Planning targets"
                  description="Editable role depth assumptions, not official squad limits."
                >
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {(Object.keys(targets) as Array<keyof RoleTargets>).map(
                      (r) => (
                        <label key={r} className="text-xs capitalize">
                          {r}
                          <Input
                            aria-label={`${r} target`}
                            type="number"
                            min={1}
                            max={15}
                            value={targets[r]}
                            onChange={(e) =>
                              setTargets((t) => ({
                                ...t,
                                [r]: Math.max(
                                  1,
                                  Math.min(15, Number(e.target.value) || 1),
                                ),
                              }))
                            }
                          />
                        </label>
                      ),
                    )}
                  </div>
                </Section>
                <Section title="Top three auction questions">
                  <ol className="space-y-3 list-decimal pl-5">
                    {gaps.slice(0, 3).map((g) => (
                      <li key={g.role}>
                        <strong className="capitalize">
                          {g.missing
                            ? `Add depth: ${g.role}`
                            : `Validate quality: ${g.role}`}
                        </strong>
                        <p className="text-sm text-muted-foreground">
                          {g.reason}
                        </p>
                        <Link
                          className="text-primary text-sm underline"
                          href="/scout"
                        >
                          Compare historical scouting candidates
                        </Link>
                      </li>
                    ))}
                  </ol>
                  <p className="text-xs text-muted-foreground mt-4">
                    Phase coverage, pace/spin matchups, home advantage and
                    injury contingencies cannot be inferred from role counts.{" "}
                    {evidenceLink}
                  </p>
                </Section>
              </TabsContent>
              <TabsContent value="retention" className="space-y-5 mt-5">
                <Section
                  title="Retention Decision Lab"
                  description="Hypothetical retain, release and trade decisions. Trade means removal in this scenario; a trade partner, consent and official eligibility are not assumed."
                >
                  <div className="flex flex-wrap items-center gap-2 mb-4">
                    <Button onClick={save}>
                      <Save className="h-4 w-4 mr-2" />
                      Save scenario
                    </Button>
                    <Button variant="outline" onClick={reset}>
                      <RotateCcw className="h-4 w-4 mr-2" />
                      Reset decisions
                    </Button>
                    {savedAt && (
                      <span className="text-xs text-muted-foreground">
                        Saved{" "}
                        {new Date(savedAt).toLocaleString("en-IN", {
                          timeZone: "Asia/Kolkata",
                        })}
                      </span>
                    )}
                  </div>
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
                    <Metric label="Remaining options" value={active.length} />
                    <Metric
                      label="Retain / release / trade"
                      value={`${Object.values(decisions).filter((v) => v === "retain").length} / ${Object.values(decisions).filter((v) => v === "release").length} / ${Object.values(decisions).filter((v) => v === "trade").length}`}
                    />
                    <Metric
                      label="Verified financial savings"
                      value="Unavailable"
                    />
                    <Metric label="Available 2027 purse" value="Unavailable" />
                  </div>
                  <div className="flex flex-wrap gap-3 mb-4">
                    <Input
                      aria-label="Search squad players"
                      placeholder="Search players…"
                      value={filter}
                      onChange={(e) => setFilter(e.target.value)}
                      className="sm:max-w-xs"
                    />
                    <select
                      aria-label="Filter player role"
                      value={role}
                      onChange={(e) => setRole(e.target.value)}
                      className={fieldClass}
                    >
                      <option value="all">All roles</option>
                      {[...Object.keys(DEFAULT_TARGETS), "unknown"].map((r) => (
                        <option key={r}>{r}</option>
                      ))}
                    </select>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <caption className="text-left text-xs text-muted-foreground mb-2">
                        2026 listed players; choose a name for evidence and
                        alternatives.
                      </caption>
                      <thead>
                        <tr className="border-b border-white/10 text-left">
                          <th className="p-2">Player</th>
                          <th className="p-2">Role</th>
                          <th className="p-2">Scenario decision</th>
                        </tr>
                      </thead>
                      <tbody>
                        {visible.map((p) => (
                          <tr
                            key={p.id}
                            className={`border-b border-white/5 ${selected?.id === p.id ? "bg-primary/10" : ""}`}
                          >
                            <td className="p-2">
                              <button
                                className="text-primary hover:underline text-left"
                                onClick={() => setSelectedId(p.id)}
                              >
                                {p.name}
                              </button>
                              <span className="block text-xs text-muted-foreground">
                                {p.country ?? "Nationality unavailable"}
                              </span>
                            </td>
                            <td className="p-2 capitalize">{p.role}</td>
                            <td className="p-2">
                              <select
                                aria-label={`Decision for ${p.name}`}
                                value={decisions[p.id] ?? "undecided"}
                                className={fieldClass}
                                onChange={(e) =>
                                  setDecisions((d) => ({
                                    ...d,
                                    [p.id]: e.target.value as Decision,
                                  }))
                                }
                              >
                                {[
                                  "undecided",
                                  "retain",
                                  "release",
                                  "trade",
                                ].map((v) => (
                                  <option key={v} value={v}>
                                    {v}
                                  </option>
                                ))}
                              </select>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {!visible.length && (
                      <p className="p-4 text-muted-foreground">
                        No players match these filters.
                      </p>
                    )}
                  </div>
                </Section>
                {selected && recommendation && (
                  <Section
                    title={`${selected.name} — player intelligence`}
                    description="CricField analytical model, not an official franchise recommendation."
                  >
                    <div className="flex gap-4 items-center mb-4">
                      <PlayerAvatar
                        name={selected.statsName ?? selected.name}
                        framing="chest"
                        disableHover
                        className="w-24 h-24 shrink-0"
                      />
                      <div>
                        <p className="font-semibold">
                          {recommendation.recommendation}
                          {recommendation.score != null
                            ? ` · ${recommendation.score}/100`
                            : ""}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          2026 acquisition fee recorded:{" "}
                          {selected.historicalFee ?? "Unavailable"}. This is not
                          a verified 2027 salary or release saving.
                        </p>
                        <Link
                          className="text-primary text-sm underline"
                          href={`/players/${selected.id}?from=${encodeURIComponent(`/feed/ipl-2027?team=${team}&module=retention`)}`}
                        >
                          Existing player profile
                        </Link>
                      </div>
                    </div>
                    <div className="grid sm:grid-cols-2 gap-3">
                      {recommendation.factors.map((f) => (
                        <div
                          key={f.label}
                          className="border border-white/10 rounded-xl p-3"
                        >
                          <strong className="text-sm">
                            {f.label}:{" "}
                            {f.value == null
                              ? "Unavailable"
                              : `${Math.round(f.value)}/100`}
                          </strong>
                          <p className="text-xs text-muted-foreground mt-1">
                            Weight {f.weight}. {f.note}
                          </p>
                        </div>
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground mt-3">
                      Unavailable factors are excluded and remaining weights are
                      re-normalized. No score without a qualifying performance
                      sample. Age, contract efficiency and injury information
                      are excluded because verified inputs are incomplete.
                    </p>
                    <PerformanceHistory player={selected} stats={stats} />
                    <h3 className="font-semibold mt-5">
                      Same-role comparison options
                    </h3>
                    <p className="text-xs text-muted-foreground mb-2">
                      Qualifying IPL sample in 2024–2026; alphabetical, not
                      ranked. Auction availability unverified. Current contracts
                      and team membership may prevent acquisition.
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {[...recommendation.replacements]
                        .sort((a, b) => a.name.localeCompare(b.name))
                        .slice(0, 8)
                        .map((p) => (
                          <Link
                            key={p.id}
                            href={`/players/${p.id}`}
                            className="text-sm text-primary border border-white/10 rounded-lg px-3 py-2"
                          >
                            {p.name}
                          </Link>
                        ))}
                      {!recommendation.replacements.length && (
                        <p className="text-sm text-muted-foreground">
                          No qualifying comparison options in the loaded squads.
                        </p>
                      )}
                    </div>
                  </Section>
                )}
                <Section
                  title="Explainable model settings"
                  description="Rate comparisons are descriptive and sample-adjusted through minimum balls. They are not a valuation model."
                >
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {(Object.keys(model) as Array<keyof ModelConfig>).map(
                      (k) => (
                        <label className="text-xs" key={k}>
                          {
                            {
                              minBatBalls: "Minimum batting balls",
                              minBowlBalls: "Minimum bowling balls",
                              performance: "Performance weight",
                              consistency: "Consistency weight",
                              scarcity: "Role scarcity weight",
                              replacement: "Replacement scarcity weight",
                            }[k]
                          }
                          <Input
                            aria-label={k}
                            type="number"
                            min={k.startsWith("min") ? 1 : 0}
                            max={k.startsWith("min") ? 2000 : 100}
                            value={model[k]}
                            onChange={(e) =>
                              setModel((m) => ({
                                ...m,
                                [k]: Math.max(
                                  k.startsWith("min") ? 1 : 0,
                                  Math.min(
                                    k.startsWith("min") ? 2000 : 100,
                                    Number(e.target.value) || 0,
                                  ),
                                ),
                              }))
                            }
                          />
                        </label>
                      ),
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-3">
                    Score = sum(available factor × weight) / sum(available
                    weights). Thresholds: ≥65 review retention; 40–64 compare
                    alternatives; below 40 review release. All decisions remain
                    your scenario.
                  </p>
                </Section>
              </TabsContent>
              <TabsContent value="brief" className="mt-5 space-y-5">
                <div className="flex flex-wrap gap-2 print:hidden">
                  <Button variant="outline" onClick={() => void shareBrief()}>
                    <Copy className="w-4 h-4 mr-2" />
                    Copy brief link
                  </Button>
                  <Button variant="outline" onClick={() => window.print()}>
                    <Printer className="w-4 h-4 mr-2" />
                    Print brief
                  </Button>
                </div>
                <Section
                  title={`${team} — 2027 Franchise Intelligence Brief`}
                  description="Generated analytical briefing from the source snapshot, not an editorial article or official franchise plan."
                >
                  <div className="space-y-5 text-sm">
                    <div>
                      <h3 className="font-semibold">
                        1. Current squad overview
                      </h3>
                      <p className="text-muted-foreground">
                        {data.roster.length} listed 2026 players. The baseline
                        is historical; official 2027 eligibility is not
                        verified. Your local scenario leaves {active.length}{" "}
                        options.
                      </p>
                    </div>
                    <div>
                      <h3 className="font-semibold">
                        2. Previous-season context
                      </h3>
                      <p className="text-muted-foreground">
                        {latestMatches.length
                          ? `Loaded 2026 results: ${latestMatches.length} matches, ${latestMatches.filter((m) => m.winner === theme.name).length} wins; ${latestMatches.filter((m) => !m.winner).length} without a recorded winner. This describes dataset coverage, not a claim of season completeness.`
                          : "No 2026 match results loaded; requires review."}
                      </p>
                    </div>
                    <div>
                      <h3 className="font-semibold">
                        3–4. Batting and bowling resources
                      </h3>
                      <p className="text-muted-foreground">
                        {
                          active.filter((p) =>
                            ["batter", "wicketkeeper"].includes(p.role),
                          ).length
                        }{" "}
                        specialist batting/keeping options;{" "}
                        {active.filter((p) => p.role === "bowler").length}{" "}
                        specialist bowlers and{" "}
                        {active.filter((p) => p.role === "all-rounder").length}{" "}
                        all-rounders. Phase strengths require statistical
                        review; role counts alone cannot establish performance
                        quality.
                      </p>
                    </div>
                    <div>
                      <h3 className="font-semibold">5. Squad balance</h3>
                      {gapContent}
                    </div>
                    <div>
                      <h3 className="font-semibold">6. Retention questions</h3>
                      <p className="text-muted-foreground">
                        Which departures would remove role coverage? Which
                        players have enough recent evidence? Use the Retention
                        Lab to compare documented factors. Confirmed 2027
                        decisions: unavailable.
                      </p>
                    </div>
                    <div>
                      <h3 className="font-semibold">
                        7. Top auction priorities
                      </h3>
                      <ul className="list-disc pl-5 text-muted-foreground">
                        {gaps.slice(0, 3).map((g) => (
                          <li key={g.role}>
                            {g.missing
                              ? `Review ${g.missing} additional ${g.role} options`
                              : `Validate ${g.role} quality and phase suitability`}
                            : {g.count} options against planning target{" "}
                            {g.target}.
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <h3 className="font-semibold">8. Scouting candidates</h3>
                      <p className="text-muted-foreground">
                        Compare same-role candidates in the Retention Lab and
                        existing Scout Lab. Historical comparisons do not imply
                        2027 registration.
                      </p>
                      <Link href="/scout" className="text-primary underline">
                        Open Global Scout Engine
                      </Link>
                    </div>
                    <div>
                      <h3 className="font-semibold">
                        9. Tactical considerations
                      </h3>
                      <p className="text-muted-foreground">
                        Review phase batting, bowling combinations, pace/spin
                        resources and venue splits in the existing analytics.
                        Unsupported dimensions require review.
                      </p>
                      {evidenceLink}
                    </div>
                    <div>
                      <h3 className="font-semibold">
                        10. Evidence & limitations
                      </h3>
                      <p className="text-muted-foreground">
                        {data.source}, retrieved {sourceDate};
                        squads-by-season.json for recorded aliases and
                        historical fees; player-bio.json for player attributes;
                        player-season-stats.json for historical performance;
                        matches.json for results. No verified 2027 salary,
                        purse, registration or injury feed. Shared URLs show the
                        baseline; local decisions are device-specific.
                      </p>
                    </div>
                  </div>
                </Section>
              </TabsContent>
              <TabsContent value="tools" className="space-y-5 mt-5">
                <Section
                  title="Scout Radar & Tactical Intelligence"
                  description="Continue in the existing data-backed tools. No duplicate scouting database or analytics dashboard is introduced."
                >
                  <div className="grid sm:grid-cols-2 gap-3">
                    {[
                      [
                        "/scout",
                        "Cross-league Scout Lab",
                        "Compare roles, league context, samples and dossiers. Auction registration remains unverified.",
                      ],
                      [
                        "/ai-analyst/squad-dna",
                        "Squad DNA",
                        "Phase strengths, pace/spin, balance and historical benchmarks.",
                      ],
                      [
                        "/visualizations",
                        "Venues & conditions",
                        "Explore venue and phase dashboards.",
                      ],
                      [
                        "/ai-analyst/weakness",
                        "Weakness finder",
                        "Inspect statistical weaknesses and sample evidence.",
                      ],
                      [
                        "/ai-analyst/auction-war-room",
                        "Existing Auction War Room",
                        "Historical decision tool. A dedicated 2027 rules-aware auction simulator is deferred.",
                      ],
                      [
                        "/ai-analyst/ask",
                        "Ask the AI Analyst",
                        "Warehouse-backed questions. Official 2027 announcements are not inferred.",
                      ],
                    ].map(([href, title, note]) => (
                      <Link
                        key={href}
                        href={href}
                        className="rounded-xl border border-white/10 p-4 hover:bg-white/5"
                      >
                        <h3 className="font-semibold flex items-center gap-2">
                          {title}
                          <ArrowRight className="h-4 w-4 text-primary" />
                        </h3>
                        <p className="mt-2 text-xs text-muted-foreground">
                          {note}
                        </p>
                      </Link>
                    ))}
                  </div>
                  <p className="mt-4 text-xs text-muted-foreground">
                    The public immutable prediction tracker, 2027 auction
                    scenarios and post-auction comparison are later phases. No
                    editorial predictions or confirmed transactions have been
                    generated.
                  </p>
                </Section>
                <Section
                  title="Historical phase evidence"
                  description="Existing franchise analytics API, 2024–2026. Rates are shown only when the API returns a supported sample."
                >
                  {analytics.isPending ? (
                    <p>Loading phase analytics…</p>
                  ) : analytics.isError ? (
                    <p className="text-sm text-muted-foreground">
                      Phase analytics unavailable from the current backend.
                      Squad structure remains available. {evidenceLink}
                    </p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="text-left">
                            <th className="p-2">Phase</th>
                            <th className="p-2">Batting run rate</th>
                            <th className="p-2">Batting balls</th>
                            <th className="p-2">Bowling run rate conceded</th>
                            <th className="p-2">Bowling balls</th>
                          </tr>
                        </thead>
                        <tbody>
                          {analytics.data?.battingPhases.map((p) => {
                            const bowl = analytics.data.bowlingPhases.find(
                              (b) => b.phase === p.phase,
                            );
                            return (
                              <tr
                                key={p.phase}
                                className="border-t border-white/10"
                              >
                                <td className="p-2">{p.phase}</td>
                                <td className="p-2">
                                  {p.balls >= 120
                                    ? format(p.runRate, 2)
                                    : "Insufficient sample"}
                                </td>
                                <td className="p-2">{p.balls}</td>
                                <td className="p-2">
                                  {bowl && bowl.balls >= 120
                                    ? format(bowl.runRate, 2)
                                    : "Insufficient sample"}
                                </td>
                                <td className="p-2">
                                  {bowl?.balls ?? "Unavailable"}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </Section>
              </TabsContent>
            </Tabs>
          </>
        )}
      </div>
    </Layout>
  );
}

function PerformanceHistory({
  player,
  stats,
}: {
  player: HubPlayer;
  stats: PlayerSeasonStats;
}) {
  const history = useMemo(() => playerHistory(player, stats), [player, stats]);
  const seasons = [
    ...new Set([
      ...history.batting.map((p) => p.season),
      ...history.bowling.map((p) => p.season),
    ]),
  ]
    .sort((a, b) => Number(b) - Number(a))
    .slice(0, 5);
  return (
    <div className="mt-5 overflow-x-auto">
      <table className="w-full text-xs">
        <caption className="text-left text-muted-foreground mb-2">
          Recent season history. Phase strike rates are descriptive; per-phase
          sample sizes are unavailable in this file. No phase recommendation is
          calculated from them.
        </caption>
        <thead>
          <tr className="text-left">
            {[
              "Season",
              "Runs",
              "Avg",
              "SR",
              "Bat balls",
              "PP / middle / death SR",
              "Wickets",
              "Economy",
              "Bowl SR",
              "Bowl balls",
            ].map((h) => (
              <th className="p-2 whitespace-nowrap" key={h}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {seasons.map((year) => {
            const bat = history.batting.find((p) => p.season === year);
            const bowl = history.bowling.find((p) => p.season === year);
            return (
              <tr key={year} className="border-t border-white/10">
                {[
                  year,
                  bat?.runs ?? "—",
                  bat ? format(bat.avg) : "—",
                  bat ? format(bat.sr) : "—",
                  bat?.balls ?? "—",
                  bat
                    ? [bat.ppSr, bat.middleSr, bat.deathSr]
                        .map((v) => (v > 0 ? format(v) : "Unavailable"))
                        .join(" / ")
                    : "—",
                  bowl?.wickets ?? "—",
                  bowl ? format(bowl.econ, 2) : "—",
                  bowl ? format(bowl.sr) : "—",
                  bowl?.balls ?? "—",
                ].map((v, i) => (
                  <td className="p-2 whitespace-nowrap" key={i}>
                    {v}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
      {!seasons.length && (
        <p className="text-sm text-muted-foreground">
          No matched IPL season record. No statistics have been inferred from
          the player’s name.
        </p>
      )}
      <p className="text-xs text-muted-foreground mt-2">
        Bowling phase economy and phase balls are unavailable in this
        player-season export; use the existing player dossier for supported
        ball-level detail.
      </p>
    </div>
  );
}
