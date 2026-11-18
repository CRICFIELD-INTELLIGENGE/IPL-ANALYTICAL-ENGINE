// What this person uses most, learned on this device only (localStorage; nothing is sent anywhere).
// Each visit adds 1 to a feature's score, and scores halve every 7 days, so recent habits outrank old ones.
// Until someone has a few visits, a fixed prior (a typical cricket-app order) fills the ranking.
import { useEffect } from "react";
import { useLocation } from "wouter";
import { Activity, BarChart3, BookOpen, Gavel, GitCompare, Lightbulb, Radio, Search, Shield, Sparkles, Users, CalendarClock, type LucideIcon } from "lucide-react";

export type FeatureId = "scores" | "stats" | "scout" | "compare" | "ai" | "teams" | "journal" | "intel" | "auction" | "retention" | "squad" | "ipl2027";
export type Feature = { id: FeatureId; label: string; line: string; href: string; icon: LucideIcon; prior: number; match: RegExp };

// Order matters: the first match wins, so the specific routes come before the general ones.
export const FEATURES: Feature[] = [
  { id: "compare", label: "Compare", line: "Two players on the same scale", href: "/pressurelab/compare", icon: GitCompare, prior: 1, match: /^\/scout\/compare/ },
  { id: "auction", label: "Auction War Room", line: "Model prices, value and fit", href: "/ai-analyst/auction-war-room", icon: Gavel, prior: 1.5, match: /^\/(ai-analyst\/auction-war-room|auction)/ },
  { id: "squad", label: "Squad Builder", line: "Build a squad, see its best XII", href: "/ai-analyst/squad-builder", icon: Users, prior: 1, match: /^\/ai-analyst\/squad-builder/ },
  { id: "ipl2027", label: "IPL 2027", line: "Retentions, trades, the road ahead", href: "/feed/ipl-2027", icon: CalendarClock, prior: 1, match: /^\/feed\/ipl-2027/ },
  { id: "scores", label: "Scores", line: "Live and recent matches", href: "/scores", icon: Radio, prior: 6, match: /^\/(scores|match\/)/ },
  { id: "stats", label: "Stats", line: "Leaders, seasons and records", href: "/stats", icon: BarChart3, prior: 5, match: /^\/stats/ },
  { id: "scout", label: "Pressure Lab", line: "Every player, ranked and searchable", href: "/pressurelab", icon: Search, prior: 4, match: /^\/(scout|players\/)/ },
  { id: "ai", label: "Decision Engine", line: "Ball-by-ball queries & simulations", href: "/ai-analyst", icon: Sparkles, prior: 3.5, match: /^\/ai-analyst/ },
  { id: "teams", label: "Teams", line: "Squads, titles and form", href: "/teams", icon: Shield, prior: 2.5, match: /^\/(teams|dugout\/(?!articles)[a-z-]+$)/ },
  { id: "journal", label: "Journal", line: "Long-form franchise analysis", href: "/reports", icon: BookOpen, prior: 2, match: /^\/(reports|dugout\/articles|articles|blogs)/ },
  { id: "intel", label: "Intelligence", line: "Computed insights, samples shown", href: "/intelligence", icon: Lightbulb, prior: 2, match: /^\/(intelligence|feed|pulse)/ },
  { id: "retention", label: "Retention Room", line: "Retain or release, explained", href: "/retention-room", icon: Activity, prior: 1.5, match: /^\/retention-room/ },
];

export type Recent = { href: string; label: string; kind: "player" | "team" };
type Store = { f: Partial<Record<FeatureId, { s: number; at: number }>>; visits: number; recent: Recent[] };

const KEY = "cfm-usage-v1";
const HALF_LIFE = 7 * 86400000;
const LEARNED_AFTER = 3;

export function featureFor(path: string) { return FEATURES.find((f) => f.match.test(path)); }

const titleCase = (slug: string) => decodeURIComponent(slug).split("-").filter(Boolean).map((w) => w[0].toUpperCase() + w.slice(1)).join(" ");

/** The entity a path points at (a player or franchise), for the "pick up where you left off" strip. */
export function recentFor(path: string): Recent | null {
  let m = path.match(/^\/players\/([^/?#]+)$/);
  if (m) return { href: path, label: titleCase(m[1]), kind: "player" };
  m = path.match(/^\/teams\/([^/?#]+)$/);
  if (m) return { href: path, label: titleCase(m[1]), kind: "team" };
  return null;
}

function read(): Store {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) ?? "null");
    if (v && typeof v === "object" && v.f) {
      const recent = Array.isArray(v.recent) ? v.recent.filter((r: any) => r?.kind !== "game" && !String(r?.href ?? "").startsWith("/arcade")) : [];
      return { f: v.f, visits: Number(v.visits) || 0, recent };
    }
  } catch { /* private window or blocked storage: fall back to the prior */ }
  return { f: {}, visits: 0, recent: [] };
}

const decayed = (e: { s: number; at: number } | undefined, now: number) => (e ? e.s * 0.5 ** ((now - e.at) / HALF_LIFE) : 0);

/** Pure: add one visit of `path` to `store` at time `now`. */
export function record(store: Store, path: string, now: number): Store {
  const f = featureFor(path);
  const next: Store = { f: { ...store.f }, visits: store.visits, recent: store.recent };
  if (f) { next.f[f.id] = { s: decayed(store.f[f.id], now) + 1, at: now }; next.visits += 1; }
  const r = recentFor(path);
  if (r) next.recent = [r, ...store.recent.filter((x) => x.href !== r.href)].slice(0, 8);
  return next;
}

/** Pure: features ranked by this person's decayed visits, with the prior breaking ties and filling gaps. */
export function rank(store: Store, now: number) {
  const learned = store.visits >= LEARNED_AFTER;
  const score = (f: Feature) => decayed(store.f[f.id], now) * 10 + f.prior;
  return { learned, features: [...FEATURES].sort((a, b) => score(b) - score(a)), score: (id: FeatureId) => score(FEATURES.find((f) => f.id === id)!) };
}

export function readUsage() { const store = read(); return { ...rank(store, Date.now()), recent: store.recent }; }

/** Mounted once in the mobile shell: records each route the person opens. */
export function UsageTracker() {
  const [location] = useLocation();
  useEffect(() => {
    try { localStorage.setItem(KEY, JSON.stringify(record(read(), location.split("?")[0], Date.now()))); } catch { /* storage unavailable: ranking stays on the prior */ }
  }, [location]);
  return null;
}
