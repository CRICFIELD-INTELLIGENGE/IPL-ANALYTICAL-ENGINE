import React, { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import {
  ArrowRight,
  Bookmark,
  CheckCircle2,
  Compass,
  Filter,
  Gavel,
  Globe,
  Search,
  Shield,
  Sparkles,
  TrendingUp,
  UserCheck,
  Users,
  X,
} from "lucide-react";
import { Layout } from "@/components/layout";
import { PlayerAvatar } from "@/components/player-avatar";
import { TeamLogo } from "@/components/team-logo";
import {
  playerSlug,
  usePlayerAuctions,
  usePlayerCareerStats,
  usePlayerImages,
  type AuctionRecord,
  type BatterRow,
  type BowlerRow,
} from "@/lib/aggregates";
import { resolveTeamCode, TEAM_REGISTRY, useTeamTheme, type TeamCode } from "@/lib/team-context";
import { loadScenario, saveScenario, type SquadRoleGroup } from "@/lib/squad-hq-scenario";
import lotSheet2026 from "@/data/auction-2026-lots.json";
import {
  getReleased2027Info,
  isEligibleFor2027Auction,
  RELEASED_2027_PLAYERS,
  RETAINED_2027_COUNT,
  UNAVAILABLE_2027_COUNT,
} from "@/lib/ipl-2027-eligibility";

type PoolFilter = "all" | "released" | "auctioned" | "unauctioned";
type RoleFilter = "all" | "Batter" | "Bowler" | "All-Rounder" | "Wicketkeeper";
type OriginFilter = "all" | "Indian" | "Overseas";
type SortKey = "price" | "runs" | "wickets" | "sr" | "econ" | "assessment";

interface PoolPlayerJson {
  id: number;
  name: string;
  role: string | null;
  country: string | null;
  basePrice: number | null;
  img: string | null;
  form: number | null;
  clutch: number | null;
  versatility: number | null;
  expectedValue: number | null;
  rarity: string | null;
  status: string | null;
  team: string | null;
  currentTeam: string | null;
}

interface ScoutLabEntry {
  key: string;
  name: string;
  slug: string;
  auctionStatus: "released" | "auctioned" | "unauctioned";
  releasedFrom: string | null;
  role: Exclude<RoleFilter, "all">;
  country: string;
  isOverseas: boolean;
  teamName: string | null;
  teamCode: TeamCode | null;
  soldLakh: number | null;
  baseLakh: number | null;
  expectedCr: number | null;
  iplMatches: number;
  formScore: number | null;
  clutchScore: number | null;
  versatilityScore: number | null;
  rarity: string | null;
  bat: BatterRow | null;
  bowl: BowlerRow | null;
  assessmentScore: number;
  assessmentHeadline: string;
  assessmentSummary: string;
  strengthTags: string[];
}

function normName(name: string): string {
  return (name || "").toLowerCase().replace(/[^a-z0-9 ]/g, "").replace(/\s+/g, " ").trim();
}

function lastNameKey(name: string): string {
  const parts = normName(name).split(" ").filter(Boolean);
  return parts.length > 1 ? `${parts[0][0]} ${parts[parts.length - 1]}` : parts[0] ?? "";
}

function formatLakh(lakh: number | null): string {
  if (lakh == null || lakh <= 0) return "—";
  if (lakh >= 100) return `₹${(lakh / 100).toFixed(2)} Cr`;
  return `₹${lakh} L`;
}

function classifyRole(rawRole: string | null, bat: BatterRow | null, bowl: BowlerRow | null): Exclude<RoleFilter, "all"> {
  const r = (rawRole || "").toLowerCase();
  if (r.includes("keep") || r === "wk") return "Wicketkeeper";
  if (r.includes("all")) return "All-Rounder";
  if (r.includes("bowl")) return "Bowler";
  if (r.includes("bat")) return "Batter";
  const batRuns = bat?.runs ?? 0;
  const bowlWkts = bowl?.wickets ?? 0;
  if (batRuns >= 300 && bowlWkts >= 20) return "All-Rounder";
  if (bowlWkts > 10 && batRuns < 250) return "Bowler";
  if (bowlWkts >= 15 && (bowl?.balls ?? 0) > (bat?.balls ?? 0)) return "Bowler";
  return "Batter";
}

function buildAssessment(
  name: string,
  auctionStatus: "released" | "auctioned" | "unauctioned",
  role: Exclude<RoleFilter, "all">,
  bat: BatterRow | null,
  bowl: BowlerRow | null,
  pool: PoolPlayerJson | null,
  teamName: string | null,
): { score: number; headline: string; summary: string; tags: string[] } {
  const tags: string[] = [];
  let score = 50;

  if (pool?.form != null) score = Math.round(pool.form * 0.45 + (pool.clutch ?? 50) * 0.35 + (pool.versatility ?? 50) * 0.2);
  else {
    const batSignal = bat ? Math.min(35, (bat.sr / 155) * 18 + Math.min(17, bat.runs / 180)) : 0;
    const bowlSignal = bowl ? Math.min(35, Math.max(0, (10 - bowl.econ) * 5.5) + Math.min(18, bowl.wickets / 5)) : 0;
    score = Math.round(45 + Math.max(batSignal, bowlSignal) + (bat && bowl ? 8 : 0));
  }
  score = Math.max(35, Math.min(98, score));

  if (bat) {
    if (bat.deathSr >= 155 && bat.balls >= 60) tags.push("Death Hitter");
    if (bat.ppSr >= 138 && bat.balls >= 80) tags.push("Powerplay Intent");
    if (bat.avg >= 32 && bat.runs >= 400) tags.push("High Consistency");
  }
  if (bowl) {
    if (bowl.econ <= 7.6 && bowl.balls >= 120) tags.push("Run Containment");
    if (bowl.deathWickets >= 12) tags.push("Death Overs Option");
    if (bowl.ppWickets >= 15) tags.push("New-Ball Threat");
  }
  if (pool?.rarity) tags.push(pool.rarity);
  if (tags.length === 0) tags.push(role);

  const batLine = bat
    ? `${bat.runs.toLocaleString("en-IN")} IPL runs at SR ${bat.sr.toFixed(1)} (Avg ${bat.avg.toFixed(1)})`
    : null;
  const bowlLine = bowl
    ? `${bowl.wickets} IPL wickets at Econ ${bowl.econ.toFixed(2)}`
    : null;

  const statSnippet = [batLine, bowlLine].filter(Boolean).join(" and ");
  const headline =
    auctionStatus === "released"
      ? `2027 Released (${teamName ?? "IPL"}) · ${role}`
      : auctionStatus === "auctioned"
      ? `${teamName ?? "IPL 2026"} Acquisition · ${role}`
      : `Unauctioned Pool · ${role}`;

  const summary = statSnippet
    ? `${name} carries ${statSnippet} in the CricField warehouse${
        pool?.form != null ? `, with a dataset form rating of ${pool.form}/100 and clutch index ${pool.clutch ?? "—"}/100` : ""
      }.`
    : `${name} is listed in the ${
        auctionStatus === "auctioned" ? "IPL 2026 auction ledger" : "CricField players pool"
      } as a ${role.toLowerCase()}; ball-by-ball IPL sample is limited or pending.`;

  return { score, headline, summary, tags: tags.slice(0, 3) };
}

export default function ScoutLabPage() {
  const { selectedTeam } = useTeamTheme();
  const activeTeam: TeamCode = selectedTeam ?? "CSK";
  const [poolFilter, setPoolFilter] = useState<PoolFilter>("all");
  const [roleFilter, setRoleFilter] = useState<RoleFilter>("all");
  const [originFilter, setOriginFilter] = useState<OriginFilter>("all");
  const [sortKey, setSortKey] = useState<SortKey>("price");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<ScoutLabEntry | null>(null);
  const [addedToSquad, setAddedToSquad] = useState<string | null>(null);
  const [shortlist, setShortlist] = useState<string[]>(() => {
    try {
      const raw = localStorage.getItem("cricfield:scout-lab-shortlist");
      return raw ? (JSON.parse(raw) as string[]) : [];
    } catch {
      return [];
    }
  });

  const auctionsQuery = usePlayerAuctions();
  const careerQuery = usePlayerCareerStats();
  const imagesQuery = usePlayerImages();

  const poolQuery = useQuery<PoolPlayerJson[]>({
    queryKey: ["agg", "players-registry"],
    queryFn: async ({ signal }) => {
      const res = await fetch(`${import.meta.env.BASE_URL}data/players.json`, { signal });
      const ct = (res.headers.get("content-type") || "").toLowerCase();
      if (!res.ok || ct.includes("text/html")) throw new Error("Failed to load players dataset");
      return res.json();
    },
    staleTime: 60 * 60 * 1000,
  });

  const entries = useMemo<ScoutLabEntry[]>(() => {
    const auctions2026 = (auctionsQuery.data ?? []).filter((r) => r.season === 2026);
    const poolList = poolQuery.data ?? [];
    const batters = careerQuery.data?.batters ?? [];
    const bowlers = careerQuery.data?.bowlers ?? [];

    const batByName = new Map<string, BatterRow>();
    const batByInitial = new Map<string, BatterRow>();
    for (const b of batters) {
      batByName.set(normName(b.player), b);
      const lk = lastNameKey(b.player);
      if (lk && !batByInitial.has(lk)) batByInitial.set(lk, b);
    }

    const bowlByName = new Map<string, BowlerRow>();
    const bowlByInitial = new Map<string, BowlerRow>();
    for (const b of bowlers) {
      bowlByName.set(normName(b.player), b);
      const lk = lastNameKey(b.player);
      if (lk && !bowlByInitial.has(lk)) bowlByInitial.set(lk, b);
    }

    const poolByName = new Map<string, PoolPlayerJson>();
    for (const p of poolList) {
      poolByName.set(normName(p.name), p);
    }

    const seen = new Set<string>();
    const combined: ScoutLabEntry[] = [];

    const findStats = (name: string) => {
      const n = normName(name);
      const lk = lastNameKey(name);
      return {
        bat: batByName.get(n) ?? (lk ? batByInitial.get(lk) ?? null : null),
        bowl: bowlByName.get(n) ?? (lk ? bowlByInitial.get(lk) ?? null : null),
      };
    };

    const auc2026ByName = new Map<string, AuctionRecord>();
    for (const rec of auctions2026) {
      auc2026ByName.set(normName(rec.player), rec);
    }

    // 1. All IPL 2027 Released players (excluding retired / unavailable / Pakistan)
    for (const rel of RELEASED_2027_PLAYERS) {
      const n = normName(rel.name);
      if (!n || seen.has(n)) continue;
      const pool = poolByName.get(n) ?? null;
      const country = rel.country ?? pool?.country ?? "India";
      if (!isEligibleFor2027Auction(rel.name, country, pool?.status)) continue;
      seen.add(n);

      const rec = auc2026ByName.get(n);
      const { bat, bowl } = findStats(rel.name);
      const role = classifyRole(rel.role ?? rec?.role ?? pool?.role ?? null, bat, bowl);
      const isOverseas = rel.overseas ?? country.toLowerCase() !== "india";
      const teamCode = resolveTeamCode(rel.releasedFrom) ?? null;
      const assess = buildAssessment(rel.name, "released", role, bat, bowl, pool, rel.releasedFrom);

      combined.push({
        key: `rel-${n}`,
        name: rel.name,
        slug: playerSlug(rel.name),
        auctionStatus: "released",
        releasedFrom: rel.releasedFrom,
        role,
        country,
        isOverseas,
        teamName: rel.releasedFrom,
        teamCode,
        soldLakh: rec?.soldLakh ?? rec?.soldPrice ?? null,
        baseLakh: rec?.baseLakh ?? rec?.basePrice ?? pool?.basePrice ?? null,
        expectedCr: pool?.expectedValue ?? null,
        iplMatches: (rec as (AuctionRecord & { iplMatches?: number | null }) | undefined)?.iplMatches ?? Math.max(bat?.matches ?? 0, bowl?.matches ?? 0),
        formScore: pool?.form ?? null,
        clutchScore: pool?.clutch ?? null,
        versatilityScore: pool?.versatility ?? null,
        rarity: pool?.rarity ?? null,
        bat,
        bowl,
        assessmentScore: assess.score,
        assessmentHeadline: assess.headline,
        assessmentSummary: assess.summary,
        strengthTags: assess.tags,
      });
    }

    // 2. IPL 2026 Auctioned (Sold) players not retained/unavailable
    for (const rec of auctions2026) {
      const n = normName(rec.player);
      if (!n || seen.has(n)) continue;
      const pool = poolByName.get(n) ?? null;
      const country = rec.country ?? pool?.country ?? "India";
      if (!isEligibleFor2027Auction(rec.player, country, pool?.status)) continue;
      seen.add(n);

      const { bat, bowl } = findStats(rec.player);
      const role = classifyRole(rec.role ?? pool?.role ?? null, bat, bowl);
      const isOverseas = country.toLowerCase() !== "india";
      const teamName = rec.teamCanonical || rec.team || pool?.currentTeam || null;
      const teamCode = teamName ? resolveTeamCode(teamName) : null;
      const assess = buildAssessment(rec.player, "auctioned", role, bat, bowl, pool, teamName);

      combined.push({
        key: `auc-${n}`,
        name: rec.player,
        slug: playerSlug(rec.player),
        auctionStatus: "auctioned",
        releasedFrom: getReleased2027Info(rec.player)?.releasedFrom ?? null,
        role,
        country,
        isOverseas,
        teamName,
        teamCode,
        soldLakh: rec.soldLakh ?? rec.soldPrice ?? null,
        baseLakh: rec.baseLakh ?? rec.basePrice ?? pool?.basePrice ?? null,
        expectedCr: pool?.expectedValue ?? null,
        iplMatches: (rec as AuctionRecord & { iplMatches?: number | null }).iplMatches ?? Math.max(bat?.matches ?? 0, bowl?.matches ?? 0),
        formScore: pool?.form ?? null,
        clutchScore: pool?.clutch ?? null,
        versatilityScore: pool?.versatility ?? null,
        rarity: pool?.rarity ?? null,
        bat,
        bowl,
        assessmentScore: assess.score,
        assessmentHeadline: assess.headline,
        assessmentSummary: assess.summary,
        strengthTags: assess.tags,
      });
    }

    // 3. IPL 2026 Unsold lots (auction-2026-lots.json) + Unauctioned Players (players.json)
    for (const lot of (lotSheet2026.lots ?? []).filter((l) => l.status === "unsold")) {
      const n = normName(lot.player);
      if (!n || seen.has(n)) continue;
      const pool = poolByName.get(n) ?? null;
      const country = lot.country ?? pool?.country ?? "India";
      if (!isEligibleFor2027Auction(lot.player, country, pool?.status)) continue;
      seen.add(n);

      const { bat, bowl } = findStats(lot.player);
      const role = classifyRole(lot.role ?? pool?.role ?? null, bat, bowl);
      const isOverseas = country.toLowerCase() !== "india";
      const assess = buildAssessment(lot.player, "unauctioned", role, bat, bowl, pool, null);

      combined.push({
        key: `unsold-${n}`,
        name: lot.player,
        slug: playerSlug(lot.player),
        auctionStatus: "unauctioned",
        releasedFrom: null,
        role,
        country,
        isOverseas,
        teamName: null,
        teamCode: null,
        soldLakh: null,
        baseLakh: lot.baseLakh ?? pool?.basePrice ?? null,
        expectedCr: pool?.expectedValue ?? null,
        iplMatches: Math.max(bat?.matches ?? 0, bowl?.matches ?? 0),
        formScore: pool?.form ?? null,
        clutchScore: pool?.clutch ?? null,
        versatilityScore: pool?.versatility ?? null,
        rarity: pool?.rarity ?? null,
        bat,
        bowl,
        assessmentScore: assess.score,
        assessmentHeadline: assess.headline,
        assessmentSummary: assess.summary,
        strengthTags: assess.tags,
      });
    }

    for (const p of poolList) {
      const n = normName(p.name);
      if (!n || seen.has(n)) continue;
      const country = p.country ?? "India";
      if (!isEligibleFor2027Auction(p.name, country, p.status)) continue;
      seen.add(n);

      const { bat, bowl } = findStats(p.name);
      const role = classifyRole(p.role, bat, bowl);
      const isOverseas = country.toLowerCase() !== "india";
      const teamName = p.currentTeam || p.team || null;
      const teamCode = teamName ? resolveTeamCode(teamName) : null;
      const assess = buildAssessment(p.name, "unauctioned", role, bat, bowl, p, teamName);

      combined.push({
        key: `pool-${n}`,
        name: p.name,
        slug: playerSlug(p.name),
        auctionStatus: "unauctioned",
        releasedFrom: null,
        role,
        country,
        isOverseas,
        teamName,
        teamCode,
        soldLakh: null,
        baseLakh: p.basePrice ?? null,
        expectedCr: p.expectedValue ?? null,
        iplMatches: Math.max(bat?.matches ?? 0, bowl?.matches ?? 0),
        formScore: p.form ?? null,
        clutchScore: p.clutch ?? null,
        versatilityScore: p.versatility ?? null,
        rarity: p.rarity ?? null,
        bat,
        bowl,
        assessmentScore: assess.score,
        assessmentHeadline: assess.headline,
        assessmentSummary: assess.summary,
        strengthTags: assess.tags,
      });
    }

    return combined;
  }, [auctionsQuery.data, poolQuery.data, careerQuery.data]);

  const counts = useMemo(() => {
    const released = entries.filter((e) => e.auctionStatus === "released").length;
    const auctioned = entries.filter((e) => e.auctionStatus === "auctioned").length;
    const unauctioned = entries.filter((e) => e.auctionStatus === "unauctioned").length;
    return { total: entries.length, released, auctioned, unauctioned };
  }, [entries]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return entries
      .filter((e) => {
        if (poolFilter !== "all" && e.auctionStatus !== poolFilter) return false;
        if (roleFilter !== "all" && e.role !== roleFilter) return false;
        if (originFilter === "Indian" && e.isOverseas) return false;
        if (originFilter === "Overseas" && !e.isOverseas) return false;
        if (q) {
          const hay = `${e.name} ${e.teamName ?? ""} ${e.country} ${e.role}`.toLowerCase();
          if (!hay.includes(q)) return false;
        }
        return true;
      })
      .sort((a, b) => {
        if (sortKey === "price") {
          const pa = a.soldLakh ?? (a.expectedCr ? a.expectedCr * 100 : a.baseLakh ?? 0);
          const pb = b.soldLakh ?? (b.expectedCr ? b.expectedCr * 100 : b.baseLakh ?? 0);
          return pb - pa || b.assessmentScore - a.assessmentScore;
        }
        if (sortKey === "runs") return (b.bat?.runs ?? 0) - (a.bat?.runs ?? 0);
        if (sortKey === "wickets") return (b.bowl?.wickets ?? 0) - (a.bowl?.wickets ?? 0);
        if (sortKey === "sr") return (b.bat?.sr ?? 0) - (a.bat?.sr ?? 0);
        if (sortKey === "econ") return (a.bowl?.econ ?? 99) - (b.bowl?.econ ?? 99);
        return b.assessmentScore - a.assessmentScore;
      });
  }, [entries, poolFilter, roleFilter, originFilter, search, sortKey]);

  const toggleShortlist = (key: string) => {
    setShortlist((prev) => {
      const next = prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key];
      try {
        localStorage.setItem("cricfield:scout-lab-shortlist", JSON.stringify(next));
      } catch {
        // ignore storage errors
      }
      return next;
    });
  };

  const addToSquadHq = (item: ScoutLabEntry) => {
    const scenario = loadScenario(activeTeam);
    if (scenario.additions.some((a) => a.name.toLowerCase() === item.name.toLowerCase())) {
      setAddedToSquad(`${item.name} is already in ${activeTeam} Squad HQ`);
      return;
    }
    const groupMap: Record<ScoutLabEntry["role"], SquadRoleGroup> = {
      Batter: "batter",
      Bowler: "bowler",
      "All-Rounder": "all-rounder",
      Wicketkeeper: "wicketkeeper",
    };
    saveScenario({
      ...scenario,
      additions: [
        ...scenario.additions,
        {
          id: `scout-${item.slug}`,
          name: item.name,
          role: item.role,
          group: groupMap[item.role],
          overseas: item.isOverseas,
          country: item.country,
          source: "shortlist",
          addedAt: new Date().toISOString(),
        },
      ],
    });
    setAddedToSquad(`Added ${item.name} to ${activeTeam} Squad HQ`);
  };

  const isLoading = auctionsQuery.isPending || poolQuery.isPending;

  return (
    <Layout hideRightPanel>
      <div className="min-h-screen bg-[#050816] text-white px-4 sm:px-6 py-6 max-w-7xl mx-auto space-y-6">
        {/* Hero Header */}
        <section className="relative overflow-hidden rounded-3xl border border-white/10 bg-[#081322] p-5 sm:p-7 shadow-2xl">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
            <div className="space-y-2 max-w-2xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-cyan-400/30 bg-cyan-400/10 px-3 py-1 text-[10px] font-mono font-bold uppercase tracking-widest text-cyan-300">
                <Compass className="h-3.5 w-3.5" />
                Scout Lab · IPL 2026 Auction &amp; Player Pool
              </div>
              <h1 className="text-2xl sm:text-4xl font-black tracking-tight text-white">
                CRICFIELD <span className="text-cyan-400">SCOUT LAB</span>
              </h1>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                Eligible auction pool combining all 2027 released players, IPL 2026 acquisitions, and unauctioned players. Retained ({RETAINED_2027_COUNT}), retired/unavailable ({UNAVAILABLE_2027_COUNT}), and ineligible players are automatically excluded.
              </p>
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <Link
                  href={`/squad-hq/${activeTeam}`}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-white/15 bg-white/[0.04] px-3 py-1.5 text-[11px] font-bold text-slate-200 hover:border-cyan-400/40 hover:text-white"
                >
                  <Shield className="h-3.5 w-3.5 text-cyan-400" /> {activeTeam} Squad HQ
                </Link>
                <Link
                  href={`/tactics?team=${activeTeam}`}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-white/15 bg-white/[0.04] px-3 py-1.5 text-[11px] font-bold text-slate-200 hover:border-emerald-400/40 hover:text-white"
                >
                  <TrendingUp className="h-3.5 w-3.5 text-emerald-400" /> Match Lab
                </Link>
                <Link
                  href="/ai-analyst/auction-war-room"
                  className="inline-flex items-center gap-1.5 rounded-xl border border-white/15 bg-white/[0.04] px-3 py-1.5 text-[11px] font-bold text-slate-200 hover:border-amber-400/40 hover:text-white"
                >
                  <Gavel className="h-3.5 w-3.5 text-amber-400" /> Auction War Room
                </Link>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 shrink-0">
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-3.5 py-3 text-center">
                <div className="font-mono text-xl font-black text-white">{counts.total}</div>
                <div className="text-[10px] font-mono uppercase text-slate-400 mt-0.5">Eligible Pool</div>
              </div>
              <div className="rounded-2xl border border-cyan-400/25 bg-cyan-500/10 px-3.5 py-3 text-center">
                <div className="font-mono text-xl font-black text-cyan-300">{counts.released}</div>
                <div className="text-[10px] font-mono uppercase text-cyan-200/80 mt-0.5">2027 Released</div>
              </div>
              <div className="rounded-2xl border border-emerald-400/25 bg-emerald-500/10 px-3.5 py-3 text-center">
                <div className="font-mono text-xl font-black text-emerald-300">{counts.auctioned}</div>
                <div className="text-[10px] font-mono uppercase text-emerald-200/80 mt-0.5">2026 Sold</div>
              </div>
              <div className="rounded-2xl border border-amber-400/25 bg-amber-500/10 px-3.5 py-3 text-center">
                <div className="font-mono text-xl font-black text-amber-300">{counts.unauctioned}</div>
                <div className="text-[10px] font-mono uppercase text-amber-200/80 mt-0.5">Unauctioned</div>
              </div>
            </div>
          </div>
        </section>

        {/* Controls & Filters */}
        <section className="rounded-2xl border border-white/10 bg-[#081322] p-4 space-y-3">
          <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
            {/* Status Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
              {(
                [
                  ["all", `All Eligible (${counts.total})`],
                  ["released", `2027 Released (${counts.released})`],
                  ["auctioned", `2026 Sold (${counts.auctioned})`],
                  ["unauctioned", `Unauctioned (${counts.unauctioned})`],
                ] as [PoolFilter, string][]
              ).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setPoolFilter(id)}
                  className={`rounded-xl px-3.5 py-2 text-xs font-bold whitespace-nowrap transition-all border ${
                    poolFilter === id
                      ? "bg-cyan-400 text-slate-950 border-cyan-400"
                      : "bg-white/[0.03] text-slate-300 border-white/10 hover:bg-white/[0.07]"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* Search */}
            <div className="relative md:w-72">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search player, team, country…"
                className="w-full rounded-xl border border-white/10 bg-[#0D1B2E] py-2 pl-9 pr-3 text-xs text-white placeholder:text-slate-400 focus:border-cyan-400/50 focus:outline-none"
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2.5 pt-2 border-t border-white/10">
            <div className="flex flex-wrap items-center gap-1.5">
              {(["all", "Batter", "Bowler", "All-Rounder", "Wicketkeeper"] as RoleFilter[]).map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRoleFilter(r)}
                  className={`rounded-lg px-2.5 py-1 text-[11px] font-bold border transition-colors ${
                    roleFilter === r
                      ? "border-cyan-400/50 bg-cyan-400/15 text-cyan-200"
                      : "border-white/10 bg-white/[0.02] text-slate-400 hover:text-white"
                  }`}
                >
                  {r === "all" ? "All Roles" : r}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <select
                aria-label="Origin filter"
                value={originFilter}
                onChange={(e) => setOriginFilter(e.target.value as OriginFilter)}
                className="rounded-lg border border-white/10 bg-[#0D1B2E] px-2.5 py-1.5 text-xs text-slate-200"
              >
                <option value="all">All Origins</option>
                <option value="Indian">Indian</option>
                <option value="Overseas">Overseas</option>
              </select>

              <select
                aria-label="Sort players"
                value={sortKey}
                onChange={(e) => setSortKey(e.target.value as SortKey)}
                className="rounded-lg border border-white/10 bg-[#0D1B2E] px-2.5 py-1.5 text-xs text-slate-200"
              >
                <option value="price">Sort: Auction / Est. Value</option>
                <option value="assessment">Sort: General Assessment</option>
                <option value="runs">Sort: Career Runs</option>
                <option value="wickets">Sort: Career Wickets</option>
                <option value="sr">Sort: Strike Rate</option>
                <option value="econ">Sort: Economy</option>
              </select>
            </div>
          </div>
        </section>

        {/* Loading State */}
        {isLoading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="h-44 animate-pulse rounded-2xl border border-white/10 bg-white/[0.03]" />
            ))}
          </div>
        )}

        {/* Player Cards Grid */}
        {!isLoading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.slice(0, 60).map((item) => {
              const saved = shortlist.includes(item.key);
              const tTheme = item.teamCode ? TEAM_REGISTRY[item.teamCode] : null;
              return (
                <div
                  key={item.key}
                  onClick={() => {
                    setAddedToSquad(null);
                    setSelected(item);
                  }}
                  className="group cursor-pointer rounded-2xl border border-white/10 bg-[#081322] p-4 hover:border-cyan-400/40 transition-all flex flex-col justify-between gap-3"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <PlayerAvatar
                          name={item.name}
                          teamId={item.teamCode ?? undefined}
                          playerImages={imagesQuery.data}
                          className="h-12 w-12 shrink-0 rounded-full"
                        />
                        <div className="min-w-0">
                          <h2 className="truncate text-sm font-black text-white group-hover:text-cyan-300 transition-colors">
                            {item.name}
                          </h2>
                          <p className="text-[11px] text-slate-400 truncate">
                            {item.role} · {item.country}
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        aria-label={saved ? "Remove from shortlist" : "Add to shortlist"}
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleShortlist(item.key);
                        }}
                        className={`rounded-lg border p-1.5 transition-colors ${
                          saved
                            ? "border-cyan-400/50 bg-cyan-400/15 text-cyan-300"
                            : "border-white/10 text-slate-400 hover:text-white"
                        }`}
                      >
                        <Bookmark className={`h-3.5 w-3.5 ${saved ? "fill-current" : ""}`} />
                      </button>
                    </div>

                    {/* Status & Value Strip */}
                    <div className="flex items-center justify-between gap-2 rounded-xl border border-white/10 bg-[#0D1B2E] px-3 py-2 text-xs">
                      <div className="flex items-center gap-2 min-w-0">
                        {item.teamCode && <TeamLogo team={item.teamCode} className="h-4 w-4 shrink-0 object-contain" />}
                        <span
                          className={`truncate font-bold ${
                            item.auctionStatus === "released"
                              ? "text-cyan-300"
                              : item.auctionStatus === "auctioned"
                              ? "text-emerald-300"
                              : "text-amber-300"
                          }`}
                        >
                          {item.auctionStatus === "released"
                            ? `Released (${item.teamCode ?? item.releasedFrom ?? "2027"})`
                            : item.auctionStatus === "auctioned"
                            ? `${item.teamCode ?? item.teamName ?? "Sold"} · 2026 Sold`
                            : "Unauctioned / Pool"}
                        </span>
                      </div>
                      <span className="font-mono font-black text-white shrink-0">
                        {item.auctionStatus === "auctioned"
                          ? formatLakh(item.soldLakh)
                          : item.baseLakh
                          ? `Base ${formatLakh(item.baseLakh)}`
                          : item.expectedCr
                          ? `Est ₹${item.expectedCr.toFixed(2)} Cr`
                          : "—"}
                      </span>
                    </div>

                    {/* Career + Assessment Snippet */}
                    <div className="grid grid-cols-3 gap-2 text-center rounded-xl border border-white/5 bg-white/[0.02] p-2">
                      <div>
                        <span className="block text-[9px] font-mono uppercase text-slate-400">Assessment</span>
                        <span className="font-mono text-xs font-black" style={{ color: tTheme?.accent ?? "#22D3EE" }}>
                          {item.assessmentScore}/100
                        </span>
                      </div>
                      <div>
                        <span className="block text-[9px] font-mono uppercase text-slate-400">
                          {item.role === "Bowler" ? "Wickets" : "Runs"}
                        </span>
                        <span className="font-mono text-xs font-black text-white">
                          {item.role === "Bowler" ? item.bowl?.wickets ?? "—" : item.bat?.runs ?? "—"}
                        </span>
                      </div>
                      <div>
                        <span className="block text-[9px] font-mono uppercase text-slate-400">
                          {item.role === "Bowler" ? "Econ" : "Strike Rate"}
                        </span>
                        <span className="font-mono text-xs font-black text-white">
                          {item.role === "Bowler"
                            ? item.bowl
                              ? item.bowl.econ.toFixed(2)
                              : "—"
                            : item.bat
                            ? item.bat.sr.toFixed(1)
                            : "—"}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-2 pt-2 border-t border-white/5">
                    <div className="flex items-center gap-1 flex-wrap">
                      {item.strengthTags.slice(0, 2).map((tag) => (
                        <span
                          key={tag}
                          className="rounded-md border border-white/10 bg-white/[0.03] px-2 py-0.5 text-[10px] font-mono text-slate-300"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                    <span className="text-[11px] font-bold text-cyan-400 inline-flex items-center gap-1 shrink-0">
                      Assess <ArrowRight className="h-3 w-3" />
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {!isLoading && filtered.length === 0 && (
          <div className="rounded-2xl border border-white/10 bg-[#081322] p-10 text-center text-sm text-slate-400">
            No players matched your current Scout Lab filters.
          </div>
        )}

        {/* Scout Assessment Modal */}
        {selected && (
          <div
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm p-3 sm:p-6"
            onClick={() => setSelected(null)}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-lg max-h-[82dvh] overflow-y-auto rounded-3xl border border-white/15 bg-[#081322] p-5 space-y-4 shadow-2xl"
            >
              <div className="flex items-start justify-between gap-3 border-b border-white/10 pb-3">
                <div className="flex items-center gap-3 min-w-0">
                  <PlayerAvatar
                    name={selected.name}
                    teamId={selected.teamCode ?? undefined}
                    playerImages={imagesQuery.data}
                    className="h-14 w-14 shrink-0 rounded-full"
                  />
                  <div className="min-w-0">
                    <h2 className="text-lg font-black text-white truncate">{selected.name}</h2>
                    <p className="text-xs text-slate-400">
                      {selected.assessmentHeadline} · {selected.country}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  aria-label="Close assessment"
                  onClick={() => setSelected(null)}
                  className="rounded-full border border-white/10 bg-white/5 p-1.5 text-slate-300 hover:text-white"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="rounded-2xl border border-cyan-400/20 bg-cyan-500/5 p-3.5 space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-mono font-bold uppercase tracking-wider text-cyan-300">
                    General Scouting Assessment
                  </span>
                  <span className="font-mono font-black text-white">{selected.assessmentScore} / 100</span>
                </div>
                <p className="text-xs text-slate-200 leading-relaxed">{selected.assessmentSummary}</p>
              </div>

              <div className="grid grid-cols-2 gap-2.5 text-xs">
                <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3">
                  <span className="block text-[10px] font-mono uppercase text-slate-400">2026 Auction Status</span>
                  <span className="font-bold text-white mt-0.5 block">
                    {selected.auctionStatus === "auctioned"
                      ? `Sold · ${formatLakh(selected.soldLakh)}`
                      : `Unauctioned · Base ${formatLakh(selected.baseLakh)}`}
                  </span>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3">
                  <span className="block text-[10px] font-mono uppercase text-slate-400">IPL Experience</span>
                  <span className="font-bold text-white mt-0.5 block">{selected.iplMatches || "—"} matches</span>
                </div>
              </div>

              {(selected.bat || selected.bowl) && (
                <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3.5 space-y-2 text-xs">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400">
                    Warehouse Career Splits
                  </span>
                  {selected.bat && (
                    <div className="flex items-center justify-between border-b border-white/5 pb-1.5">
                      <span className="text-slate-300">Batting</span>
                      <span className="font-mono font-bold text-white">
                        {selected.bat.runs} runs · Avg {selected.bat.avg.toFixed(1)} · SR {selected.bat.sr.toFixed(1)}
                      </span>
                    </div>
                  )}
                  {selected.bowl && (
                    <div className="flex items-center justify-between">
                      <span className="text-slate-300">Bowling</span>
                      <span className="font-mono font-bold text-white">
                        {selected.bowl.wickets} wkts · Econ {selected.bowl.econ.toFixed(2)} · SR {selected.bowl.sr.toFixed(1)}
                      </span>
                    </div>
                  )}
                </div>
              )}

              {addedToSquad && (
                <div className="rounded-xl border border-emerald-400/30 bg-emerald-500/10 px-3 py-2 text-xs font-bold text-emerald-200">
                  {addedToSquad}
                </div>
              )}

              <div className="space-y-2 pt-1">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => addToSquadHq(selected)}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl bg-cyan-400 py-2.5 text-xs font-black text-slate-950 hover:bg-cyan-300"
                  >
                    <UserCheck className="h-3.5 w-3.5" /> Add to {activeTeam} Squad HQ
                  </button>
                  <Link
                    href={`/players/${selected.slug}`}
                    onClick={() => setSelected(null)}
                    className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-white/15 bg-white/5 px-4 py-2.5 text-xs font-bold text-white hover:bg-white/10"
                  >
                    Profile <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>

                <div className="grid grid-cols-3 gap-2 text-[11px]">
                  <Link
                    href={`/squad-hq/${activeTeam}`}
                    onClick={() => setSelected(null)}
                    className="rounded-xl border border-white/10 bg-white/[0.03] py-2 text-center font-bold text-slate-200 hover:border-cyan-400/40"
                  >
                    Squad HQ
                  </Link>
                  <Link
                    href={`/tactics?team=${activeTeam}`}
                    onClick={() => setSelected(null)}
                    className="rounded-xl border border-white/10 bg-white/[0.03] py-2 text-center font-bold text-slate-200 hover:border-emerald-400/40"
                  >
                    Match Lab
                  </Link>
                  <Link
                    href="/ai-analyst/auction-war-room"
                    onClick={() => setSelected(null)}
                    className="rounded-xl border border-white/10 bg-white/[0.03] py-2 text-center font-bold text-slate-200 hover:border-amber-400/40"
                  >
                    War Room
                  </Link>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
