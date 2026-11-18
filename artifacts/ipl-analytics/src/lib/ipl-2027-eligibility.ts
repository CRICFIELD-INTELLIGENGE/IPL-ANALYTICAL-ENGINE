import official2027 from "@/data/official-2027.json";

export function normPoolName(name: string): string {
  return (name || "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

export interface Released2027Player {
  name: string;
  releasedFrom: string;
  country: string | null;
  overseas: boolean | null;
  role: string | null;
}

const retainedNames = new Set<string>();
const unavailableMap = new Map<string, { status: string; note: string }>();
const releasedList: Released2027Player[] = [];
const releasedByName = new Map<string, Released2027Player>();

const identities = (official2027.identities ?? {}) as Record<
  string,
  { canonicalId: string | null; country: string | null; overseas: boolean | null; role: string | null }
>;

for (const team of official2027.teams ?? []) {
  for (const name of team.retained ?? []) {
    retainedNames.add(normPoolName(name));
  }
  for (const name of team.released ?? []) {
    const idMeta = identities[name];
    const entry: Released2027Player = {
      name,
      releasedFrom: team.team,
      country: idMeta?.country ?? null,
      overseas: idMeta?.overseas ?? null,
      role: idMeta?.role ?? null,
    };
    const key = normPoolName(name);
    if (!releasedByName.has(key)) {
      releasedByName.set(key, entry);
      releasedList.push(entry);
    }
  }
}

for (const item of official2027.availability ?? []) {
  unavailableMap.set(normPoolName(item.name), {
    status: item.status,
    note: item.note,
  });
}

// Include common aliases for retained / unavailable players so variants are also filtered.
for (const [alias, canonical] of Object.entries((official2027.aliases ?? {}) as Record<string, string>)) {
  const canonNorm = normPoolName(canonical);
  if (retainedNames.has(canonNorm)) retainedNames.add(normPoolName(alias));
  const unavail = unavailableMap.get(canonNorm);
  if (unavail) unavailableMap.set(normPoolName(alias), unavail);
}

export const RETAINED_2027_COUNT = official2027.teams.reduce((sum, t) => sum + (t.retained?.length ?? 0), 0);
export const RELEASED_2027_PLAYERS = releasedList;
export const UNAVAILABLE_2027_COUNT = unavailableMap.size;

export function getReleased2027Info(name: string): Released2027Player | undefined {
  return releasedByName.get(normPoolName(name));
}

export function isRetainedFor2027(name: string): boolean {
  return retainedNames.has(normPoolName(name));
}

export function getUnavailable2027Reason(name: string, country?: string | null, status?: string | null): string | null {
  const key = normPoolName(name);
  if (retainedNames.has(key)) return "Retained for IPL 2027";
  const unavail = unavailableMap.get(key);
  if (unavail) return `${unavail.status}: ${unavail.note}`;
  if (country && /pakistan/i.test(country)) return "Not eligible for IPL";
  if (status && /retire|ban|ruled[\s_-]?out|unavail/i.test(status)) return status;
  return null;
}

export function isEligibleFor2027Auction(name: string, country?: string | null, status?: string | null): boolean {
  return getUnavailable2027Reason(name, country, status) === null;
}
