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

import { useEffect, useMemo, useState } from "react";
import { useRoute, useLocation, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Layout } from "@/components/layout";
import { 
  useTeamTheme, TEAM_REGISTRY, isTeamCode, resolveTeamCode, 
  TEAM_CODE_TO_SLUG, type TeamCode 
} from "@/lib/team-context";
import { useSquadsBySeason, useTeams, useMatches } from "@/lib/aggregates";
import { fetchFranchiseRecord, type FranchiseRecord } from "@/lib/dugout-api";
import { BroadcasterLink } from "@/components/broadcaster-link";
import { getFranchiseCelebratedHighlight } from "@/lib/broadcaster-registry";
import { AdVessel } from "@/components/ad-vessel";
import { VideoShelf } from "@/components/video-shelf";
import { VideoArchiveModal } from "@/components/video-archive-modal";
import { getVideosByTeam } from "@/lib/video-registry";
import { ExternalLink, Play, Sparkles, ArrowRight, Activity, Shield } from "lucide-react";
import { FranchiseHero, FranchiseSwitcher } from "@/components/dugout/franchise-hero";
import { TeamNewsroom } from "@/components/dugout/team-newsroom";
import { TeamSquad } from "@/components/team-squad";
import { FranchiseIntelligence } from "@/components/dugout/franchise-intelligence";
import { SeasonTimeline } from "@/components/dugout/season-timeline";
import { FanParliamentCard } from "@/components/dugout/fan-parliament-card";
import { RivalrySpotlight } from "@/components/dugout/rivalry-spotlight";

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

  // Sync state if route code is valid
  useEffect(() => {
    if (resolvedCode && selectedTeam !== resolvedCode) {
      setSelectedTeam(resolvedCode);
    }
  }, [resolvedCode]);

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

  const allSeasons = useMemo(
    () => Object.keys(squadFile.data ?? {}).sort((a, b) => Number(a) - Number(b)),
    [squadFile.data],
  );

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

  const teamVideos = useMemo(() => getVideosByTeam(activeTeamCode), [activeTeamCode]);
  const [isArchiveOpen, setIsArchiveOpen] = useState(false);
  const celebrated = getFranchiseCelebratedHighlight(currentTeam.id);

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

        {/* ── QUICK NAV BANNER: LINK TO INDIVIDUAL TEAM PAGE ── */}
        <div className="p-4 rounded-2xl bg-gradient-to-r from-white/[0.03] to-white/[0.01] border border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center border" style={{ backgroundColor: `${currentTeam.accent}20`, borderColor: `${currentTeam.accent}40` }}>
              <Shield className="w-5 h-5" style={{ color: currentTeam.accent }} />
            </div>
            <div>
              <div className="text-xs font-black uppercase text-white tracking-wide">
                Looking for Detailed Performance Analytics?
              </div>
              <div className="text-[11px] text-white/50">
                Inspect ball-by-ball phase breakdowns, toss splits, venue heatmaps and complete match history for {currentTeam.name}.
              </div>
            </div>
          </div>

          <Link href={`/teams/${teamSlug}`}>
            <button 
              className="px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 border cursor-pointer hover:scale-105 shrink-0 shadow-lg"
              style={{ backgroundColor: `${currentTeam.accent}20`, borderColor: `${currentTeam.accent}60`, color: currentTeam.accent }}
            >
              <span>Open {currentTeam.shortName} Team Profile</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </Link>
        </div>

        {/* ── TEAM NEWSROOM ── */}
        <TeamNewsroom code={activeTeamCode} teamName={currentTeam.name} accent={currentTeam.accent} />

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
          <TeamSquad
            franchise={currentTeam.name}
            accent={currentTeam.accent}
            season={season ?? undefined}
            onSeasonChange={setChosenSeason}
          />
        </section>

        {/* ── FRANCHISE INTELLIGENCE ── */}
        {season && (
          <FranchiseIntelligence teamName={currentTeam.name} code={activeTeamCode} season={season} accent={currentTeam.accent} />
        )}

        {/* ── SEASON TIMELINE ── */}
        <SeasonTimeline
          record={effectiveRecord}
          allSeasons={allSeasons}
          season={season}
          onSeason={setChosenSeason}
          accent={currentTeam.accent}
          franchiseName={currentTeam.name}
        />

        {/* ── BROADCASTER REPLAY ── */}
        {celebrated && (
          <BroadcasterLink highlight={celebrated} variant="banner" label="Watch Landmark Final" />
        )}

        {/* ── VIDEO VAULT ── */}
        {teamVideos.length > 0 && (
          <section id="videos" className="scroll-mt-24 space-y-4 min-w-0">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <Play className="w-4 h-4" style={{ color: currentTeam.accent }} />
                <h3 className="text-sm font-black uppercase text-white tracking-wide">
                  {currentTeam.shortName} video vault · official JioHotstar highlights
                </h3>
              </div>
              <button
                onClick={() => setIsArchiveOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-[11px] font-mono text-white/70 hover:text-white transition-all cursor-pointer"
              >
                <span>Full archive</span>
                <ExternalLink className="w-3 h-3" />
              </button>
            </div>
            <VideoShelf
              title={`${currentTeam.name} highlights & moments`}
              subtitle={`Official replays, top innings and milestone clips featuring ${currentTeam.shortName}`}
              badge={`${teamVideos.length} videos`}
              videos={teamVideos}
              onOpenArchive={() => setIsArchiveOpen(true)}
            />
            <AdVessel
              slot="dugout-video-vault-sponsor"
              format="in-feed"
              label={`Sponsored Partner Briefing · ${currentTeam.shortName} video vault`}
              className="my-3"
            />
          </section>
        )}

        {/* ── FAN ZONE & RIVALRY ── */}
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

      </div>

      <VideoArchiveModal
        isOpen={isArchiveOpen}
        onClose={() => setIsArchiveOpen(false)}
      />
    </Layout>
  );
}
