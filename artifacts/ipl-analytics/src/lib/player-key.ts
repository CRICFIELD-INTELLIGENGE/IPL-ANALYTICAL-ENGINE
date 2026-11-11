import { displayPlayerName, normalizePlayerName, playerSlug } from "@/lib/aggregates";
import type { PlayerIdentityIndex } from "@/lib/player-recent-matches";

type BioNames = { playerName?: string; fullName?: string };

/**
 * Resolves a player page's URL slug to a bio key (player-bio.json), or null when no single player matches.
 *
 * Every step must identify one player unambiguously. The old resolver ended
 * with `Object.keys(bios)[0]`, so any slug it could not place silently
 * rendered whichever player happened to be first in the file — complete with
 * their photo — instead of reporting that the player was not found.
 *
 * `identity` (data/player-recent-matches/index.json) is checked before any name rule: when the slug is a
 * written IPL name or a squad name tied to one Cricsheet registry id, the page opens the bio verified as that
 * id, or none. Without it, "MD Choudhary" (Mukul) opened Mukesh Choudhary's bio by initial + surname.
 */
export function resolvePlayerKey(bios: Record<string, BioNames>, slug: string, identity?: PlayerIdentityIndex | null): string | null {
  const s = slug.toLowerCase().trim();
  const keys = Object.keys(bios);

  if (bios[s]) return s;

  const exactKey = keys.find(k => k.toLowerCase() === s);
  if (exactKey) return exactKey;

  const slugAsName = normalizePlayerName(s.replace(/-/g, " "));
  const nameMatches = (k: string) =>
    normalizePlayerName(bios[k].playerName) === slugAsName || normalizePlayerName(bios[k].fullName) === slugAsName;

  // A link the registry identifies: the bio verified as that registry id (a duplicate bio by name, else the
  // first key), or not found when that player has no verified bio.
  const registryId = identity?.pages?.[s];
  if (registryId) {
    const verified = keys.filter(k => bios[k] && identity!.keys[k]?.[0] === registryId).sort();
    return verified.find(nameMatches) ?? verified[0] ?? null;
  }

  // Match the slug against the names themselves ("v-kohli" -> "V Kohli").
  const byName = keys.filter(nameMatches);
  if (byName.length === 1) return byName[0];

  // Initial + surname, accepted only when exactly one player can match.
  const parts = s.split("-").filter(Boolean);
  if (parts.length >= 2) {
    const initial = parts[0][0];
    const surname = parts[parts.length - 1];
    const near = keys.filter(k => {
      const kp = k.toLowerCase().split("-").filter(Boolean);
      return kp.length >= 2 && kp[0][0] === initial && kp[kp.length - 1] === surname;
    });
    if (near.length === 1) return near[0];
  }

  return null;
}

/**
 * The name in a player page's heading: the name people use (squad lists, see usePlayerDisplayNames) for the
 * bio's scorecard name — unless the registry ties that name to a different player. The display names are
 * keyed by scorecard name, and the squad file tags some players with another person's scorecard name:
 * Ravi Bishnoi's rows say "R Bishnoi", which is Rajesh Bishnoi in the scorecards, so Rajesh's page was
 * headed "Ravi Bishnoi". Then the bio's full name is shown instead.
 */
export function resolveProfileName(
  bio: BioNames & { playerName: string },
  bioKey: string | null | undefined,
  displayNames: Map<string, string> | null | undefined,
  identity?: PlayerIdentityIndex | null,
): string {
  const shown = displayPlayerName(bio.playerName, displayNames);
  const own = bioKey ? identity?.keys[bioKey]?.[0] : undefined;
  const slug = playerSlug(shown);
  const named = identity?.keys[slug]?.[0] ?? identity?.pages?.[slug];
  return own && named && named !== own ? bio.fullName || bio.playerName : shown;
}
