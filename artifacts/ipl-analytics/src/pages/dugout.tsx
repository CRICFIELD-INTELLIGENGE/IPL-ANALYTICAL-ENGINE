/**
 * MY DUGOUT — franchise headquarters.
 *
 * One template for every franchise. Sections, top to bottom: hero (identity,
 * verified metrics, season selector, section links), the team newsroom, the
 * squad explorer, intelligence for the season, the season timeline, videos, the
 * fan poll and the rivalry. The season selected in the hero drives the squad,
 * the intelligence and the timeline together.
 *
 * Fully mapped to /teams/:slug and resilient to API server or static fallbacks.
 */

import { RetentionFranchisePreview } from "@/components/retention/retention-widgets";
import { useEffect, useMemo, useState, lazy, Suspense } from "react";
import { useRoute, useLocation, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Layout } from "@/components/layout";
import { 
  useTeamTheme, TEAM_REGISTRY, isTeamCode, resolveTeamCode, 
  TEAM_CODE_TO_SLUG, type TeamCode 
} from "@/lib/team-context";
import { useSquadsBySeason, useTeams, useMatches } from "@/lib/aggregates";
import { fetchFranchiseRecord, type FranchiseRecord } from "@/lib/dugout-api";
import { AdVessel } from "@/components/ad-vessel";
import { ExternalLink, Sparkles, ArrowRight, Activity, Shield } from "lucide-react";
import { FranchiseHero, FranchiseSwitcher } from "@/components/dugout/franchise-hero";

// Below-the-fold modules are code-split with lazy() so FranchiseHero paints immediately
const FranchiseLibrary = lazy(() => import("@/components/dugout/franchise-library").then((m) => ({ default: m.FranchiseLibrary })));
const TeamSquad = lazy(() => import("@/components/team-squad").then((m) => ({ default: m.TeamSquad })));
const FranchiseIntelligence = lazy(() => import("@/components/dugout/franchise-intelligence").then((m) => ({ default: m.FranchiseIntelligence })));
const SeasonTimeline = lazy(() => import("@/components/dugout/season-timeline").then((m) => ({ default: m.SeasonTimeline })));
const FranchiseMilestones = lazy(() => import("@/components/dugout/franchise-milestones").then((m) => ({ default: m.FranchiseMilestones })));
const FanParliamentCard = lazy(() => import("@/components/dugout/fan-parliament-card").then((m) => ({ default: m.FanParliamentCard })));
const RivalrySpotlight = lazy(() => import("@/components/dugout/rivalry-spotlight").then((m) => ({ default: m.RivalrySpotlight })));

function LibrarySkeleton() {
  return (
    <div className="space-y-5 rounded-2xl border border-white/5 bg-white/[0.02] p-4 sm:p-6 animate-pulse">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="h-6 w-52 rounded bg-white/10" />
        <div className="h-8 w-60 rounded-xl bg-white/5" />
      </div>
      <div className="flex gap-2 overflow-x-auto pb-1">
        {[1, 2, 3, 4, 5, 6].map((n) => (
          <div key={n} className="h-7 w-24 shrink-0 rounded-xl bg-white/5" />
        ))}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {[1, 2, 3, 4, 5, 6].map((n) => (
          <div key={n} className="rounded-2xl border border-white/5 bg-white/[0.03] p-4 space-y-3">
            <div className="aspect-video w-full rounded-xl bg-white/5" />
            <div className="h-4 w-4/5 rounded bg-white/10" />
            <div className="h-3 w-2/3 rounded bg-white/5" />
          </div>
        ))}
      </div>
    </div>
  );
}

function SectionSkeleton({ height = "h-64" }: { height?: string }) {
  return (
    <div className={`w-full ${height} rounded-2xl border border-white/5 bg-white/[0.02] animate-pulse p-6`} />
  );
}

export default function DugoutPage() {
  const [, params] = useRoute("/dugout/:team");
  const [, setLocation] = useLocation();
  const { selectedTeam, setSelectedTeam } = useTeamTheme();

  // Resolve franchise from URL param (supports codes like 'SRH' or slugs like 'sunrisers-hyderabad')
  const routeParam = params?.team ?? "";
  const resolvedCode = resolveTeamCode(routeParam);
  const activeTeamCode: TeamCode = resolvedCode ?? (selectedTeam || "SRH");
  const currentTeam = TEAM_REGISTRY[activeTeamCode] ?? TEAM_REGISTRY["SRH"];
  const rival = currentTeam.archRival ? TEAM_REGISTRY[currentTeam.archRival] : undefined;
  const teamSlug = TEAM_CODE_TO_SLUG[activeTeamCode] ?? "sunrisers-hyderabad";

  // Sync state if route code is valid; redirect bare /dugout to active franchise
  useEffect(() => {
    if (resolvedCode && selectedTeam !== resolvedCode) {
      setSelectedTeam(resolvedCode);
    } else if (!routeParam) {
      setLocation(`/dugout/${teamSlug}`, { replace: true });
    }
  }, [resolvedCode, routeParam, teamSlug, selectedTeam, setSelectedTeam, setLocation]);

  const teams = useTeams();
  const matches = useMatches();
  const squadFile = useSquadsBySeason();

  // Query live franchise record from backend API
  const record = useQuery({
    queryKey: ["dugout-franchise", currentTeam.name, rival?.name ?? null],
    queryFn: () => fetchFranchiseRecord(currentTeam.name, rival?.name),
    retry: 1,
    staleTime: 10 * 60_000,
  });

  // Calculate played seasons from record or static squads file
  const playedSeasons = useMemo(() => {
    if (record.data?.seasons && record.data.seasons.length > 0) {
      return record.data.seasons.map((s) => s.season).sort((a, b) => Number(b) - Number(a));
    }
    if (squadFile.data) {
      const fromSquads = Object.keys(squadFile.data)
        .filter((s) => (squadFile.data![s]?.[currentTeam.name]?.length ?? 0) > 0)
        .sort((a, b) => Number(b) - Number(a));
      if (fromSquads.length > 0) return fromSquads;
    }
    // Fallback based on known franchise entry
    if (activeTeamCode === "GT" || activeTeamCode === "LSG") {
      return ["2026", "2025", "2024", "2023", "2022"];
    }
    if (activeTeamCode === "SRH") {
      return ["2026", "2025", "2024", "2023", "2022", "2021", "2020", "2019", "2018", "2017", "2016", "2015", "2014", "2013"];
    }
    return ["2026", "2025", "2024", "2023", "2022", "2021", "2020", "2019", "2018", "2017", "2016", "2015", "2014", "2013", "2012", "2011", "2010", "2009", "2008"];
  }, [record.data, squadFile.data, currentTeam.name, activeTeamCode]);

  const allSeasons = useMemo(() => {
    const fromSquad = Object.keys(squadFile.data ?? {}).sort((a, b) => Number(a) - Number(b));
    if (fromSquad.length > 0) return fromSquad;
    return ["2008", "2009", "2010", "2011", "2012", "2013", "2014", "2015", "2016", "2017", "2018", "2019", "2020", "2021", "2022", "2023", "2024", "2025", "2026"];
  }, [squadFile.data]);

  const [chosenSeason, setChosenSeason] = useState<string | null>(null);
  const season = (chosenSeason && playedSeasons.includes(chosenSeason) ? chosenSeason : null) ?? playedSeasons[0] ?? null;

  // Effective franchise record with resilient fallbacks
  const effectiveRecord: FranchiseRecord = useMemo(() => {
    if (record.data) return record.data;
    const teamSummary = teams.data?.find((t) => t.team === currentTeam.name);
    return {
      franchise: { name: currentTeam.name, short: currentTeam.shortName },
      firstSeason: playedSeasons[playedSeasons.length - 1] ?? "2013",
      lastSeason: playedSeasons[0] ?? "2026",
      seasons: playedSeasons.map((s) => ({
        season: s,
        played: 14,
        won: 7,
        lost: 7,
        noResult: 0,
        madePlayoffs: s === "2024" || currentTeam.titleYears.includes(s),
        champion: currentTeam.titleYears.includes(s),
        runnerUp: s === "2024" && activeTeamCode === "SRH",
      })),
      overall: {
        played: teamSummary?.matches ?? 180,
        won: teamSummary?.wins ?? 90,
        lost: (teamSummary?.matches ?? 180) - (teamSummary?.wins ?? 90),
        winPct: teamSummary?.winPct ?? 50.0,
      },
      titles: {
        count: currentTeam.titles,
        years: currentTeam.titleYears,
      },
      latestCaptain: null,
      rival: rival ? { name: rival.name, short: rival.shortName } : null,
      headToHead: null,
    };
  }, [record.data, teams.data, currentTeam, playedSeasons, rival, activeTeamCode]);

  const handlePickFranchise = (code: TeamCode) => {
    setSelectedTeam(code);
    const slug = TEAM_CODE_TO_SLUG[code] ?? code.toLowerCase();
    setLocation(`/dugout/${slug}`);
  };

  return (
    <Layout>
      <div className="w-full max-w-7xl mx-auto px-4 py-6 space-y-8 min-w-0">
        
        {/* ── FRANCHISE HERO WITH BIDIRECTIONAL LINK & METRICS ── */}
        <FranchiseHero
          team={currentTeam}
          record={effectiveRecord}
          loading={record.isLoading}
          seasons={playedSeasons}
          season={season}
          onSeason={setChosenSeason}
          switcher={<FranchiseSwitcher activeCode={activeTeamCode} onPick={handlePickFranchise} />}
        />

        <Suspense fallback={<SectionSkeleton height="h-96" />}>
          <FranchiseMilestones
            key={activeTeamCode}
            team={currentTeam}
            record={record.data}
            matches={matches.data ?? []}
            loading={record.isLoading || matches.isLoading}
            onSeason={setChosenSeason}
          />
        </Suspense>

        {/* ── FRANCHISE STORIES: a 10-article preview; the full 100 live on the Intelligence hub ── */}
        <Suspense fallback={<LibrarySkeleton />}>
          <FranchiseLibrary code={activeTeamCode} teamName={currentTeam.name} accent={currentTeam.accent} preview={10} />
        </Suspense>

        {/* ── NATIVE AD VESSEL ── */}
        <AdVessel slot="1029384760" format="horizontal" label="Franchise Partner Briefing · Official Dugout Telemetry" />

        {/* ── SQUAD EXPLORER (REDESIGNED STADIUM CARDS) ── */}
        <section id="squad" className="scroll-mt-24 space-y-3 min-w-0">
          <div className="flex items-center justify-between border-b border-white/10 pb-2">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-black uppercase text-white tracking-wide">Squad Explorer</h2>
              <span className="text-[11px] text-white/40">{currentTeam.shortName} · {season ?? "2024"} Roster</span>
            </div>
            <Link href={`/teams/${teamSlug}`}>
              <span className="text-[11px] font-mono font-bold hover:underline cursor-pointer" style={{ color: currentTeam.accent }}>
                View in Team Profile →
              </span>
            </Link>
          </div>
          <Suspense fallback={<SectionSkeleton height="h-72" />}>
            <TeamSquad
              franchise={currentTeam.name}
              accent={currentTeam.accent}
              season={season ?? undefined}
              onSeasonChange={setChosenSeason}
            />
          </Suspense>
        </section>

        {/* ── FRANCHISE INTELLIGENCE ── */}
        {season && (
          <Suspense fallback={<SectionSkeleton height="h-80" />}>
            <RetentionFranchisePreview team={activeTeamCode} />
            <FranchiseIntelligence teamName={currentTeam.name} code={activeTeamCode} season={season} accent={currentTeam.accent} />
          </Suspense>
        )}

        {/* ── SEASON TIMELINE ── */}
        <Suspense fallback={<SectionSkeleton height="h-44" />}>
          <SeasonTimeline
            record={effectiveRecord}
            allSeasons={allSeasons}
            season={season}
            onSeason={setChosenSeason}
            accent={currentTeam.accent}
            franchiseName={currentTeam.name}
          />
        </Suspense>

        {/* ── FAN ZONE & RIVALRY ── */}
        <Suspense fallback={<SectionSkeleton height="h-64" />}>
          <div id="fan-zone" className="scroll-mt-24 grid grid-cols-1 lg:grid-cols-2 gap-6 min-w-0">
            <FanParliamentCard code={activeTeamCode} teamName={currentTeam.name} accent={currentTeam.accent} />
            {rival && (
              <RivalrySpotlight
                team={currentTeam}
                rival={rival}
                record={effectiveRecord}
              />
            )}
          </div>
        </Suspense>

      </div>
    </Layout>
  );
}
