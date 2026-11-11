// Recent matches for the player page, loaded per player and checked against the player's identity.
//
// scripts/generate-player-recent-matches.mjs writes:
//   data/player-recent-matches/index.json        { keys: { [bioKey]: [registryId, matchCount] }, pages: { [slug]: registryId } }
//   data/player-recent-matches/<registryId>.json  one player's match log, built per Cricsheet registry id
// A bio key is in `keys` only when exact rules tie that bio to one registry id (scripts/lib/player-identity.mjs);
// `pages` gives the registry id behind /players/<slug> links that are not bio keys (see resolvePlayerKey).
// The page resolves its URL to a bio first, then looks up that bio key here — no name, initials, surname or
// URL-slug matching — so a player whose identity cannot be verified gets the empty state rather than someone
// else's matches.

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type RecentMatch = any;
export interface PlayerIdentityIndex {
  keys: Record<string, [string, number]>;
  pages?: Record<string, string>;
}

const EMPTY: RecentMatch[] = [];
const HOUR = 1000 * 60 * 60;

/** The identity index (shared by the URL → bio step and the recent matches). Null when it cannot be loaded. */
export function usePlayerIdentityIndex() {
  const base = import.meta.env.BASE_URL;
  return useQuery<PlayerIdentityIndex | null>({
    queryKey: ["player-recent-matches-index"],
    queryFn: async () => {
      const res = await fetch(`${base}data/player-recent-matches/index.json`);
      if (!res.ok) {
        console.warn(`player-recent-matches index unavailable (${res.status}); recent matches will be empty`);
        return null;
      }
      return res.json();
    },
    staleTime: HOUR,
  });
}

/**
 * The index key for a player page: its bio key (player-bio.json), exactly. `lengths` maps every key to its
 * match count. Returns null when the bio key has no identity-checked matches.
 */
export function resolveRecentMatchesKey(lengths: Record<string, number>, bioKey: string | null | undefined): string | null {
  return bioKey && (lengths[bioKey] ?? 0) > 0 ? bioKey : null;
}

/** The player's recent matches, newest first. Empty when the identity is not verified or the index is missing. */
export function usePlayerRecentMatches(bioKey: string | null | undefined): RecentMatch[] {
  const base = import.meta.env.BASE_URL;
  const index = usePlayerIdentityIndex();
  const lengths = useMemo(
    () => (index.data ? Object.fromEntries(Object.entries(index.data.keys).map(([k, v]) => [k, v[1]])) : null),
    [index.data],
  );
  const key = lengths ? resolveRecentMatchesKey(lengths, bioKey) : null;
  const shardId = key && index.data ? index.data.keys[key]?.[0] ?? null : null;
  const shard = useQuery<RecentMatch[]>({
    queryKey: ["player-recent-matches-shard", shardId],
    queryFn: async () => {
      const res = await fetch(`${base}data/player-recent-matches/${shardId}.json`);
      return res.ok ? res.json() : [];
    },
    enabled: !!shardId,
    staleTime: HOUR,
  });
  return shardId ? shard.data ?? EMPTY : EMPTY;
}
