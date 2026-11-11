import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  useSquadsBySeason,
  usePlayerBios,
  usePlayerSeasonStats,
} from "./aggregates";
import { TEAM_REGISTRY } from "./team-context";
import {
  buildRoster,
  HUB_TEAMS,
  type HubTeam,
  type OfficialSquads,
} from "./ipl-2027";

export function useIpl2027(team: HubTeam, season = "2026") {
  const squads = useSquadsBySeason();
  const bios = usePlayerBios();
  const stats = usePlayerSeasonStats();
  const official = useQuery<OfficialSquads>({
    queryKey: ["ipl-2027", "official-squads"],
    staleTime: 60_000,
    retry: 1,
    queryFn: async () => {
      const res = await fetch(
        `${import.meta.env.BASE_URL}data/official-squads.json`,
      );
      if (!res.ok) throw new Error("Official squad snapshot unavailable");
      const data = await res.json();
      if (!data?.seasons || typeof data.seasons !== "object")
        throw new Error("Invalid squad snapshot");
      return data;
    },
  });
  const allRosters = useMemo(
    () =>
      Object.fromEntries(
        HUB_TEAMS.map((code) => [
          code,
          buildRoster(
            TEAM_REGISTRY[code].name,
            squads.data ?? {},
            official.data,
            bios.data ?? {},
            season,
          ),
        ]),
      ),
    [squads.data, official.data, bios.data, season],
  );
  const candidates = useMemo(
    () => [
      ...new Map(
        Object.values(allRosters)
          .flat()
          .map((p) => [p.id, p]),
      ).values(),
    ],
    [allRosters],
  );
  return {
    roster: allRosters[team] ?? [],
    allRosters,
    candidates,
    stats: stats.data,
    isPending:
      squads.isPending ||
      bios.isPending ||
      stats.isPending ||
      official.isPending,
    rosterUnavailable: squads.isError && official.isError,
    statsUnavailable: stats.isError,
    source: official.data
      ? "official-squads.json (IPL squad snapshot)"
      : "squads-by-season.json (historical fallback)",
    retrievedAt: official.data?.retrievedAt ?? null,
    refetch: () =>
      Promise.all([
        squads.refetch(),
        bios.refetch(),
        stats.refetch(),
        official.refetch(),
      ]),
  };
}
