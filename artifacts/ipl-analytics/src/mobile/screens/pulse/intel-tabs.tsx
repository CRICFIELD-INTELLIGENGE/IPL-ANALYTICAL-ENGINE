import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "wouter";
import {
  Maximize2,
  Minimize2,
  Network,
  RotateCcw,
  Search,
  Shuffle,
  Users,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { Sheet } from "@/mobile/shell";
import { playerSlug, useSquadsBySeason } from "@/lib/aggregates";
import {
  TRANSFER_TEAM_NAMES,
  getPlayerTransferBackstory,
} from "@/components/visualizations/sankey-diagram";
import {
  RAW_EDGES,
  RAW_NODES,
  TYPE_CONFIG,
  initPositions,
  tick,
  type GraphNode,
  type NodeType,
} from "@/components/visualizations/knowledge-graph";

interface TransferLink {
  source: string;
  target: string;
  year: number;
  value: number;
  players: string[];
  sourceColor: string;
  targetColor: string;
}

const TEAM_COLORS_MAP: Record<string, string> = {
  "Deccan Chargers": "#f97316",
  "Mumbai Indians": "#1d4ed8",
  "Chennai Super Kings": "#eab308",
  "Royal Challengers Bengaluru": "#dc2626",
  "Royal Challengers Bangalore": "#dc2626",
  "Sunrisers Hyderabad": "#ea580c",
  "Gujarat Titans": "#1e293b",
  "Lucknow Super Giants": "#0284c7",
  "Kolkata Knight Riders": "#6b21a8",
  "Delhi Capitals": "#2563eb",
  "Delhi Daredevils": "#2563eb",
  "Rajasthan Royals": "#db2777",
  "Punjab Kings": "#DD1F2D",
  "Kings XI Punjab": "#DD1F2D",
  "Rising Pune Supergiant": "#9333ea",
  "Gujarat Lions": "#f97316",
};

const LEGACY_SHORT_NAMES: Record<string, string> = {
  ...TRANSFER_TEAM_NAMES,
  DCG: "Deccan Chargers",
  GL: "Gujarat Lions",
  RPS: "Rising Pune Supergiant",
  PWI: "Pune Warriors",
  KTK: "Kochi Tuskers",
  RCB_OLD: "Royal Challengers Bangalore",
  DC_OLD: "Delhi Daredevils",
  PBKS_OLD: "Kings XI Punjab",
};

const SHORT_TEAMS = Object.keys(TRANSFER_TEAM_NAMES);

function matchesTeamFilter(nodeLabel: string, teamFilter: string) {
  if (teamFilter === "All") return true;
  const full = TRANSFER_TEAM_NAMES[teamFilter]?.toLowerCase() ?? "";
  const lower = nodeLabel.toLowerCase();
  return lower.includes(teamFilter.toLowerCase()) || (full !== "" && lower.includes(full));
}

/* ═══════════════════════════════════════════════════════════════════════════
   TRANSFERS TAB (Mobile Touch Sankey + Source/Destination Filter + Sheet)
   ═══════════════════════════════════════════════════════════════════════════ */
export function MobileTransfersTab({ activeSeason }: { activeSeason: number }) {
  const boundedDefaultTo = String(Math.min(2026, Math.max(2009, activeSeason)));
  const [fromYear, setFromYear] = useState("2008");
  const [toYear, setToYear] = useState(boundedDefaultTo);
  const [sourceTeam, setSourceTeam] = useState("All");
  const [destTeam, setDestTeam] = useState("All");
  const [searchPlayer, setSearchPlayer] = useState("");
  const [zoom, setZoom] = useState(1);
  const [fullscreen, setFullscreen] = useState(false);
  const [selectedIdx, setSelectedIdx] = useState<number>(0);
  const [showAllGrid, setShowAllGrid] = useState(false);
  const [playerSheet, setPlayerSheet] = useState<{ name: string; link: TransferLink } | null>(
    null,
  );
  const [staticLinks, setStaticLinks] = useState<TransferLink[]>([]);

  const squadsQuery = useSquadsBySeason();
  const ALL_YEARS = useMemo(() => Array.from({ length: 19 }, (_, i) => String(2008 + i)), []);

  const computedSquadTransfers = useMemo<TransferLink[]>(() => {
    if (!squadsQuery.data) return [];
    const journeys = new Map<string, Array<{ season: number; team: string }>>();
    for (const [seasonStr, teamsObj] of Object.entries(squadsQuery.data)) {
      const yr = parseInt(seasonStr, 10);
      if (isNaN(yr)) continue;
      for (const [teamName, playerList] of Object.entries(teamsObj as Record<string, any[]>)) {
        for (const p of playerList) {
          const pname = p.name || p.cricsheetName;
          if (!pname) continue;
          if (!journeys.has(pname)) journeys.set(pname, []);
          journeys.get(pname)!.push({ season: yr, team: teamName });
        }
      }
    }

    const map = new Map<
      string,
      {
        source: string;
        target: string;
        year: number;
        players: Set<string>;
        sourceColor: string;
        targetColor: string;
      }
    >();

    for (const [pname, journey] of journeys.entries()) {
      journey.sort((a, b) => a.season - b.season);
      for (let i = 0; i < journey.length - 1; i++) {
        const curr = journey[i];
        const next = journey[i + 1];
        if (curr.team !== next.team) {
          const key = `${curr.team}_${curr.season}->${next.team}_${next.season}`;
          if (!map.has(key)) {
            map.set(key, {
              source: `${curr.team} '${String(curr.season).slice(2)}`,
              target: `${next.team} '${String(next.season).slice(2)}`,
              year: next.season,
              players: new Set<string>(),
              sourceColor: TEAM_COLORS_MAP[curr.team] || "#3b82f6",
              targetColor: TEAM_COLORS_MAP[next.team] || "#a855f7",
            });
          }
          map.get(key)!.players.add(pname);
        }
      }
    }

    return Array.from(map.values()).map((l) => ({
      source: l.source,
      target: l.target,
      year: l.year,
      value: l.players.size,
      players: Array.from(l.players),
      sourceColor: l.sourceColor,
      targetColor: l.targetColor,
    }));
  }, [squadsQuery.data]);

  useEffect(() => {
    if (computedSquadTransfers.length > 0) return;
    fetch("/data/sankey.json")
      .then((res) => (res.ok ? res : fetch("/api/ipl/sankey")))
      .then((res) => res.json())
      .then((data) => {
        if (data?.nodes && data?.links) {
          const nodeMap = new Map(data.nodes.map((n: any) => [n.id, n]));
          const parsed: TransferLink[] = data.links.map((l: any) => {
            const srcNode: any = nodeMap.get(l.source) || { name: l.source, season: "2011" };
            const tgtNode: any = nodeMap.get(l.target) || { name: l.target, season: "2012" };
            const srcYr = parseInt(srcNode.season, 10) || 2011;
            const tgtYr = parseInt(tgtNode.season, 10) || 2012;
            const srcName = srcNode.name || l.source;
            const tgtName = tgtNode.name || l.target;
            return {
              source: `${srcName} '${String(srcYr).slice(2)}`,
              target: `${tgtName} '${String(tgtYr).slice(2)}`,
              value: l.value || (l.players ? l.players.length : 1),
              players: l.players || [],
              sourceColor: TEAM_COLORS_MAP[srcName] || "#3b82f6",
              targetColor: TEAM_COLORS_MAP[tgtName] || "#a855f7",
              year: tgtYr,
            };
          });
          setStaticLinks(parsed);
        }
      })
      .catch(() => {
        // leave empty if unavailable
      });
  }, [computedSquadTransfers.length]);

  const dataset = computedSquadTransfers.length > 0 ? computedSquadTransfers : staticLinks;

  const filteredLinks = useMemo(() => {
    const fYr = parseInt(fromYear, 10);
    const tYr = parseInt(toYear, 10);
    const q = searchPlayer.toLowerCase().trim();
    return dataset
      .filter((l) => {
        const yearMatch = l.year >= Math.min(fYr, tYr) && l.year <= Math.max(fYr, tYr);
        const srcMatch = matchesTeamFilter(l.source, sourceTeam);
        const dstMatch = matchesTeamFilter(l.target, destTeam);
        const qMatch =
          !q ||
          l.players.some((p) => p.toLowerCase().includes(q)) ||
          l.source.toLowerCase().includes(q) ||
          l.target.toLowerCase().includes(q);
        return yearMatch && srcMatch && dstMatch && qMatch;
      })
      .sort((a, b) => b.value - a.value);
  }, [dataset, fromYear, toYear, sourceTeam, destTeam, searchPlayer]);

  const topFlows = useMemo(() => filteredLinks.slice(0, 10), [filteredLinks]);
  const activeLink = topFlows[selectedIdx] ?? filteredLinks[0] ?? null;
  const stepY = topFlows.length > 1 ? 248 / (topFlows.length - 1) : 0;

  const renderSvgFlow = (tall: boolean) => (
    <div
      className="mp-viz-frame"
      style={{ height: tall ? "100%" : 340, flex: tall ? 1 : undefined }}
    >
      <div className="mp-viz-toolbar">
        <button
          type="button"
          onClick={() => setZoom((z) => Math.max(0.8, +(z - 0.2).toFixed(2)))}
          className="mp-viz-ctrl"
          aria-label="Zoom out transfers diagram"
        >
          <ZoomOut className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => setZoom((z) => Math.min(2.0, +(z + 0.2).toFixed(2)))}
          className="mp-viz-ctrl"
          aria-label="Zoom in transfers diagram"
        >
          <ZoomIn className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => setZoom(1)}
          className="mp-viz-ctrl"
          aria-label="Reset transfers zoom"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onClick={() => setFullscreen((f) => !f)}
          className="mp-viz-ctrl"
          aria-label={fullscreen ? "Exit fullscreen" : "Open fullscreen"}
        >
          {fullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
        </button>
      </div>

      <div className="w-full h-full overflow-auto">
        {topFlows.length > 0 ? (
          <svg
            viewBox="0 0 380 340"
            className="w-full h-full block"
            style={{
              transform: `scale(${zoom})`,
              transformOrigin: "center center",
              transition: "transform 160ms ease",
            }}
          >
            <defs>
              {topFlows.map((link, idx) => (
                <linearGradient
                  key={idx}
                  id={`mpSankeyGrad-${idx}`}
                  x1="0%"
                  y1="0%"
                  x2="100%"
                  y2="0%"
                >
                  <stop offset="0%" stopColor={link.sourceColor} stopOpacity={0.95} />
                  <stop offset="50%" stopColor="#e2e8f0" stopOpacity={0.55} />
                  <stop offset="100%" stopColor={link.targetColor} stopOpacity={0.95} />
                </linearGradient>
              ))}
            </defs>

            {topFlows.map((link, idx) => {
              const y = 62 + idx * stepY;
              const isSel = selectedIdx === idx;
              const strokeW = Math.min(14, Math.max(4, link.value * 2.2));
              const shortSrc = link.source.replace(/\s+'\d{2}$/, (m) => m);
              const shortDst = link.target.replace(/\s+'\d{2}$/, (m) => m);
              const compactLabel = (s: string) => {
                const match = Object.entries(LEGACY_SHORT_NAMES).find(([, full]) =>
                  s.toLowerCase().includes(full.toLowerCase()),
                );
                const yrMatch = s.match(/'(\d{2})$/);
                if (match && yrMatch) {
                  const code = match[0].replace(/_OLD$/, "");
                  return `${code} '${yrMatch[1]}`;
                }
                return s.length > 13 ? `${s.slice(0, 12)}…` : s;
              };

              return (
                <g
                  key={`${link.source}-${link.target}-${idx}`}
                  onClick={() => setSelectedIdx(idx)}
                  style={{ cursor: "pointer" }}
                >
                  <path
                    d={`M 98 ${y} C 165 ${y}, 215 ${y}, 282 ${y}`}
                    fill="none"
                    stroke={`url(#mpSankeyGrad-${idx})`}
                    strokeWidth={strokeW}
                    opacity={isSel ? 1 : 0.45}
                  />
                  <rect x={86} y={y - 8} width={10} height={16} rx={3} fill={link.sourceColor} />
                  <rect x={284} y={y - 8} width={10} height={16} rx={3} fill={link.targetColor} />
                  <text
                    x={80}
                    y={y + 3}
                    textAnchor="end"
                    fill={isSel ? "#ffffff" : "#94a3b8"}
                    fontSize="9.5"
                    fontWeight="800"
                    fontFamily="monospace"
                  >
                    {compactLabel(shortSrc)}
                  </text>
                  <text
                    x={300}
                    y={y + 3}
                    textAnchor="start"
                    fill={isSel ? "#ffffff" : "#94a3b8"}
                    fontSize="9.5"
                    fontWeight="800"
                    fontFamily="monospace"
                  >
                    {compactLabel(shortDst)}
                  </text>
                  <rect
                    x={168}
                    y={y - 8}
                    width={44}
                    height={16}
                    rx={8}
                    fill="#0f172a"
                    stroke={isSel ? "#f59e0b" : "#334155"}
                    strokeWidth="1"
                  />
                  <text
                    x={190}
                    y={y + 3}
                    textAnchor="middle"
                    fill="#fbbf24"
                    fontSize="8.5"
                    fontWeight="800"
                    fontFamily="monospace"
                  >
                    {link.value}P
                  </text>
                </g>
              );
            })}
          </svg>
        ) : (
          <div className="h-full grid place-items-center text-xs text-slate-400 p-4 text-center">
            {squadsQuery.isLoading
              ? "Loading IPL transfer telemetry…"
              : "No franchise transfers match these filters."}
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="space-y-3" data-testid="pulse-tab-transfers">
      <section className="mp-card">
        <div className="mp-card-head">
          <h2 className="mp-card-title">
            <Shuffle className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span>Franchise Transfer Flow</span>
          </h2>
          <span className="mp-card-sub">{filteredLinks.length} paths</span>
        </div>

        {/* Filter Controls */}
        <div className="space-y-2">
          <div className="relative">
            <Search
              className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
              style={{ color: "var(--mp-muted)" }}
            />
            <input
              type="search"
              value={searchPlayer}
              onChange={(e) => {
                setSearchPlayer(e.target.value);
                setSelectedIdx(0);
              }}
              placeholder="Search transferred player or team…"
              aria-label="Search transferred player or team"
              className="mp-input mp-input--search"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <select
              value={fromYear}
              onChange={(e) => setFromYear(e.target.value)}
              aria-label="From season"
              className="mp-select"
            >
              {ALL_YEARS.map((y) => (
                <option key={y} value={y}>
                  From: {y}
                </option>
              ))}
            </select>
            <select
              value={toYear}
              onChange={(e) => setToYear(e.target.value)}
              aria-label="To season"
              className="mp-select"
            >
              {ALL_YEARS.map((y) => (
                <option key={y} value={y}>
                  To: {y}
                </option>
              ))}
            </select>
            <select
              value={sourceTeam}
              onChange={(e) => {
                setSourceTeam(e.target.value);
                setSelectedIdx(0);
              }}
              aria-label="Source franchise"
              className="mp-select"
            >
              <option value="All">Origin: All</option>
              {SHORT_TEAMS.map((t) => (
                <option key={t} value={t}>
                  From: {t}
                </option>
              ))}
            </select>
            <select
              value={destTeam}
              onChange={(e) => {
                setDestTeam(e.target.value);
                setSelectedIdx(0);
              }}
              aria-label="Destination franchise"
              className="mp-select"
            >
              <option value="All">Dest: All</option>
              {SHORT_TEAMS.map((t) => (
                <option key={t} value={t}>
                  To: {t}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Interactive Touch Flow Diagram */}
        {renderSvgFlow(false)}

        {/* Active Flow Telemetry Inspector */}
        {activeLink && (
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/[0.06] p-3 space-y-2">
            <div className="flex items-center justify-between gap-2 text-xs">
              <div className="font-black truncate">
                <span style={{ color: activeLink.sourceColor }}>{activeLink.source}</span>{" "}
                <span style={{ color: "var(--mp-muted)" }}>→</span>{" "}
                <span style={{ color: activeLink.targetColor }}>{activeLink.target}</span>
              </div>
              <span className="font-mono font-bold text-[11px] text-amber-400 shrink-0">
                {activeLink.value} players
              </span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {activeLink.players.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPlayerSheet({ name: p, link: activeLink })}
                  className="px-2.5 py-1 rounded-md border border-white/15 bg-white/[0.05] text-[11px] font-semibold"
                  style={{ color: "var(--mp-text)" }}
                >
                  {p}
                </button>
              ))}
            </div>
            <div className="text-[10px] font-mono" style={{ color: "var(--mp-muted)" }}>
              Tap any flow ribbon above or player pill to inspect transfer story.
            </div>
          </div>
        )}
      </section>

      {/* Movement Cards List */}
      <section className="mp-card">
        <div className="mp-card-head">
          <h2 className="mp-card-title">
            <Users className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span>Movement Ledger</span>
          </h2>
          <span className="mp-card-sub">{filteredLinks.length} paths</span>
        </div>

        <div className="space-y-2">
          {(showAllGrid ? filteredLinks : filteredLinks.slice(0, 12)).map((link, idx) => (
            <div
              key={`${link.source}-${link.target}-${idx}`}
              className="rounded-lg border border-white/10 bg-white/[0.025] p-2.5 space-y-2"
            >
              <div className="flex items-center justify-between gap-2 text-xs">
                <div className="font-bold truncate">
                  <span style={{ color: link.sourceColor }}>{link.source}</span>{" "}
                  <span style={{ color: "var(--mp-muted)" }}>→</span>{" "}
                  <span style={{ color: link.targetColor }}>{link.target}</span>
                </div>
                <span className="font-mono font-bold text-[11px] text-amber-400 shrink-0">
                  {link.value}P
                </span>
              </div>
              <div className="flex flex-wrap gap-1">
                {link.players.slice(0, 8).map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPlayerSheet({ name: p, link })}
                    className="px-2 py-0.5 rounded border border-white/10 bg-white/[0.04] text-[10.5px] font-medium"
                    style={{ color: "var(--mp-muted)" }}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        {filteredLinks.length > 12 && (
          <button
            type="button"
            onClick={() => setShowAllGrid((v) => !v)}
            className="mp-chip-btn w-full"
          >
            {showAllGrid ? "Collapse list" : `Show all ${filteredLinks.length} paths`}
          </button>
        )}
      </section>

      {fullscreen && (
        <div className="mp-fullscreen-overlay" role="dialog" aria-label="Transfer Flow Fullscreen">
          <div className="flex items-center justify-between gap-2">
            <span className="font-mono font-bold text-xs uppercase tracking-wider">
              Transfer Flow ({filteredLinks.length} paths)
            </span>
            <button
              type="button"
              onClick={() => setFullscreen(false)}
              className="mp-chip-btn"
            >
              Done
            </button>
          </div>
          {renderSvgFlow(true)}
        </div>
      )}

      {playerSheet && (() => {
        const info = getPlayerTransferBackstory(playerSheet.name, playerSheet.link);
        return (
          <Sheet title={playerSheet.name} onClose={() => setPlayerSheet(null)}>
            <div className="space-y-3 pb-2 text-xs">
              <div className="text-[11px] font-mono font-bold text-amber-400">{info.type}</div>
              <div className="rounded-lg border border-white/10 bg-white/[0.03] p-2.5 flex items-center justify-between gap-2">
                <span className="font-bold" style={{ color: playerSheet.link.sourceColor }}>
                  {playerSheet.link.source}
                </span>
                <span>→</span>
                <span className="font-bold" style={{ color: playerSheet.link.targetColor }}>
                  {playerSheet.link.target}
                </span>
              </div>
              <p className="leading-relaxed m-0" style={{ color: "var(--mp-text)" }}>
                {info.story}
              </p>
              <div className="grid grid-cols-2 gap-2">
                <div className="mp-kpi">
                  <div className="mp-kpi-label">Role</div>
                  <div className="text-xs font-bold mt-1">{info.role}</div>
                </div>
                <div className="mp-kpi">
                  <div className="mp-kpi-label">Value / Bracket</div>
                  <div className="text-xs font-bold mt-1 text-emerald-400">{info.price}</div>
                </div>
              </div>
              <Link
                href={`/players/${playerSlug(playerSheet.name)}`}
                onClick={() => setPlayerSheet(null)}
                className="mp-chip-btn w-full"
                style={{
                  background: "var(--mp-accent)",
                  borderColor: "var(--mp-accent)",
                  color: "#050816",
                }}
              >
                Open Full Player Profile →
              </Link>
            </div>
          </Sheet>
        );
      })()}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   KNOWLEDGE GRAPH TAB (Graph-first Touch Pan/Zoom + Bottom-Sheet Node Detail)
   ═══════════════════════════════════════════════════════════════════════════ */
export function MobileKnowledgeGraphTab() {
  const [nodes, setNodes] = useState<GraphNode[]>([]);
  const [, setFrame] = useState(0);
  const [filterType, setFilterType] = useState<NodeType | "all">("all");
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [fullscreen, setFullscreen] = useState(false);
  const dragRef = useRef<{ active: boolean; x: number; y: number; moved: boolean }>({
    active: false,
    x: 0,
    y: 0,
    moved: false,
  });

  const W = 540;
  const H = 440;

  useEffect(() => {
    const ns: GraphNode[] = RAW_NODES.map((n) => ({
      ...n,
      x: W / 2,
      y: H / 2,
      vx: 0,
      vy: 0,
    }));
    initPositions(ns, W, H);
    setNodes(ns);
  }, []);

  useEffect(() => {
    if (!nodes.length) return;
    let alpha = 1;
    let iter = 0;
    let raf: number | null = null;
    const step = () => {
      if (iter <= 260) {
        alpha *= 0.99;
        tick(nodes, RAW_EDGES, W, H, alpha);
        setFrame((f) => f + 1);
        iter++;
        raf = requestAnimationFrame(step);
      }
    };
    raf = requestAnimationFrame(step);
    return () => {
      if (raf) cancelAnimationFrame(raf);
    };
  }, [nodes]);

  const matchedIds = useMemo(() => {
    const q = query.toLowerCase().trim();
    const list = nodes.filter(
      (n) =>
        (filterType === "all" || n.type === filterType) &&
        (!q ||
          n.label.toLowerCase().includes(q) ||
          (n.sublabel ?? "").toLowerCase().includes(q)),
    );
    return new Set(list.map((n) => n.id));
  }, [nodes, filterType, query]);

  const connectedSet = useCallback((id: string) => {
    const s = new Set<string>([id]);
    for (const e of RAW_EDGES) {
      if (e.source === id) s.add(e.target);
      if (e.target === id) s.add(e.source);
    }
    return s;
  }, []);

  const focusedConn = selectedId ? connectedSet(selectedId) : null;
  const nodeMap = new Map(nodes.map((n) => [n.id, n]));
  const visibleNodes = nodes.filter((n) => matchedIds.has(n.id));
  const visibleEdges = RAW_EDGES.filter(
    (e) => matchedIds.has(e.source) && matchedIds.has(e.target),
  );

  const openNode = (id: string) => {
    setSelectedId(id);
    setSheetOpen(true);
  };

  const renderGraphCanvas = (tall: boolean) => (
    <div
      className="mp-viz-frame"
      style={{ height: tall ? "100%" : 380, flex: tall ? 1 : undefined }}
      onPointerDown={(e) => {
        dragRef.current = { active: true, x: e.clientX, y: e.clientY, moved: false };
      }}
      onPointerMove={(e) => {
        if (!dragRef.current.active) return;
        const dx = e.clientX - dragRef.current.x;
        const dy = e.clientY - dragRef.current.y;
        if (Math.abs(dx) + Math.abs(dy) > 4) dragRef.current.moved = true;
        dragRef.current.x = e.clientX;
        dragRef.current.y = e.clientY;
        setPan((p) => ({ x: p.x + dx, y: p.y + dy }));
      }}
      onPointerUp={() => {
        dragRef.current.active = false;
      }}
      onPointerCancel={() => {
        dragRef.current.active = false;
      }}
    >
      <div className="mp-viz-toolbar">
        <button
          type="button"
          onClick={() => setZoom((z) => Math.max(0.7, +(z - 0.2).toFixed(2)))}
          className="mp-viz-ctrl"
          aria-label="Zoom out graph"
        >
          <ZoomOut className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => setZoom((z) => Math.min(2.4, +(z + 0.2).toFixed(2)))}
          className="mp-viz-ctrl"
          aria-label="Zoom in graph"
        >
          <ZoomIn className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => {
            setZoom(1);
            setPan({ x: 0, y: 0 });
            setSelectedId(null);
          }}
          className="mp-viz-ctrl"
          aria-label="Reset graph view"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onClick={() => setFullscreen((f) => !f)}
          className="mp-viz-ctrl"
          aria-label={fullscreen ? "Close fullscreen graph" : "Open fullscreen graph"}
        >
          {fullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
        </button>
      </div>

      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full h-full block select-none"
        onClick={() => {
          if (!dragRef.current.moved) setSelectedId(null);
        }}
      >
        <g
          transform={`translate(${pan.x}, ${pan.y}) translate(${W / 2}, ${H / 2}) scale(${zoom}) translate(${-W / 2}, ${-H / 2})`}
        >
          {visibleEdges.map((edge, i) => {
            const a = nodeMap.get(edge.source);
            const b = nodeMap.get(edge.target);
            if (!a || !b) return null;
            const isFocused = focusedConn
              ? focusedConn.has(edge.source) && focusedConn.has(edge.target)
              : true;
            const opacity = selectedId ? (isFocused ? 0.8 : 0.08) : 0.32 * edge.strength;
            return (
              <line
                key={`${edge.source}-${edge.target}-${i}`}
                x1={a.x}
                y1={a.y}
                x2={b.x}
                y2={b.y}
                stroke={
                  selectedId && isFocused ? TYPE_CONFIG[a.type].color : "rgba(255,255,255,0.45)"
                }
                strokeWidth={selectedId && isFocused ? 2 : 1}
                strokeOpacity={opacity}
                strokeDasharray={edge.strength < 0.7 ? "4 4" : undefined}
              />
            );
          })}

          {visibleNodes.map((node) => {
            const cfg = TYPE_CONFIG[node.type];
            const r = 10 + node.weight * 1.4;
            const isSel = selectedId === node.id;
            const isFocused = focusedConn ? focusedConn.has(node.id) : true;
            return (
              <g
                key={node.id}
                transform={`translate(${node.x}, ${node.y})`}
                style={{ opacity: selectedId ? (isFocused ? 1 : 0.2) : 1, cursor: "pointer" }}
                onClick={(e) => {
                  e.stopPropagation();
                  if (!dragRef.current.moved) openNode(node.id);
                }}
              >
                {isSel && (
                  <circle
                    r={r + 6}
                    fill="none"
                    stroke={cfg.color}
                    strokeWidth="1.5"
                    strokeDasharray="3 3"
                  />
                )}
                <circle
                  r={r}
                  fill={cfg.bg}
                  stroke={cfg.color}
                  strokeWidth={isSel ? 2.5 : 1.5}
                />
                <text
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fontSize="9"
                  fontWeight="800"
                  fill="#ffffff"
                  fontFamily="system-ui"
                >
                  {node.label.split(" ").map((w) => w[0]).join("").slice(0, 3)}
                </text>
                <text
                  y={r + 10}
                  textAnchor="middle"
                  fontSize="8.5"
                  fontWeight="600"
                  fill="rgba(255,255,255,0.8)"
                  fontFamily="system-ui"
                >
                  {node.label.length > 12 ? `${node.label.slice(0, 11)}…` : node.label}
                </text>
              </g>
            );
          })}
        </g>
      </svg>

      <div className="absolute bottom-2 left-2.5 right-2.5 pointer-events-none flex items-center justify-between text-[10px] font-mono text-white/55">
        <span>Drag to pan · Tap node to inspect</span>
        <span>
          {visibleNodes.length}/{RAW_NODES.length} entities
        </span>
      </div>
    </div>
  );

  const selectedNode = selectedId ? nodeMap.get(selectedId) : null;

  return (
    <div className="space-y-3" data-testid="pulse-tab-kg">
      <section className="mp-card">
        <div className="mp-card-head">
          <h2 className="mp-card-title">
            <Network className="w-3.5 h-3.5 text-purple-400 shrink-0" />
            <span>IPL Knowledge Graph</span>
          </h2>
          <span className="mp-card-sub">
            {RAW_NODES.length} nodes · {RAW_EDGES.length} links
          </span>
        </div>

        {/* Entity Search + Filter Pills */}
        <div className="relative">
          <Search
            className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
            style={{ color: "var(--mp-muted)" }}
          />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search player, team, venue, concept…"
            aria-label="Search knowledge graph entities"
            className="mp-input mp-input--search"
          />
        </div>

        <div className="mp-hscroll" role="tablist" aria-label="Filter graph entity type">
          <button
            type="button"
            onClick={() => setFilterType("all")}
            data-active={filterType === "all" ? "true" : "false"}
            className="mp-filter-pill"
          >
            All ({RAW_NODES.length})
          </button>
          {(Object.entries(TYPE_CONFIG) as [NodeType, (typeof TYPE_CONFIG)[NodeType]][]).map(
            ([type, cfg]) => {
              const count = RAW_NODES.filter((n) => n.type === type).length;
              return (
                <button
                  key={type}
                  type="button"
                  onClick={() => setFilterType(filterType === type ? "all" : type)}
                  data-active={filterType === type ? "true" : "false"}
                  className="mp-filter-pill capitalize"
                  style={
                    filterType === type ? { borderColor: cfg.color, color: cfg.color } : undefined
                  }
                >
                  {type} ({count})
                </button>
              );
            },
          )}
        </div>

        {renderGraphCanvas(false)}

        {/* Quick Tappable Entity Chips for fast mobile focus */}
        <div className="mp-hscroll pt-1">
          {visibleNodes.slice(0, 14).map((n) => (
            <button
              key={n.id}
              type="button"
              onClick={() => openNode(n.id)}
              data-active={selectedId === n.id ? "true" : "false"}
              className="mp-filter-pill"
            >
              <span
                className="w-2 h-2 rounded-full inline-block"
                style={{ background: TYPE_CONFIG[n.type].color }}
              />
              <span>{n.label}</span>
            </button>
          ))}
        </div>
      </section>

      {fullscreen && (
        <div className="mp-fullscreen-overlay" role="dialog" aria-label="Knowledge Graph Fullscreen">
          <div className="flex items-center justify-between gap-2">
            <span className="font-mono font-bold text-xs uppercase tracking-wider">
              Knowledge Graph ({visibleNodes.length} entities)
            </span>
            <button
              type="button"
              onClick={() => setFullscreen(false)}
              className="mp-chip-btn"
            >
              Done
            </button>
          </div>
          {renderGraphCanvas(true)}
        </div>
      )}

      {sheetOpen && selectedNode && (
        <Sheet title={selectedNode.label} onClose={() => setSheetOpen(false)}>
          <div className="space-y-3 pb-2 text-xs">
            <div className="flex items-center gap-2">
              <span
                className="px-2.5 py-0.5 rounded-full text-[10px] font-mono uppercase font-black border"
                style={{
                  color: TYPE_CONFIG[selectedNode.type].color,
                  borderColor: TYPE_CONFIG[selectedNode.type].border,
                  background: TYPE_CONFIG[selectedNode.type].bg,
                }}
              >
                {selectedNode.type}
              </span>
              {selectedNode.sublabel && (
                <span style={{ color: "var(--mp-muted)" }}>{selectedNode.sublabel}</span>
              )}
            </div>

            <div className="space-y-1.5">
              <div className="text-[10px] font-mono uppercase font-bold" style={{ color: "var(--mp-muted)" }}>
                Connected Entities
              </div>
              {RAW_EDGES.filter(
                (e) => e.source === selectedNode.id || e.target === selectedNode.id,
              ).map((edge, idx) => {
                const otherId = edge.source === selectedNode.id ? edge.target : edge.source;
                const other = nodeMap.get(otherId);
                if (!other) return null;
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setSelectedId(other.id)}
                    className="w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg border border-white/10 bg-white/[0.03] text-left"
                    style={{ color: "var(--mp-text)" }}
                  >
                    <span className="font-bold">{other.label}</span>
                    <span className="text-[10.5px] font-mono" style={{ color: TYPE_CONFIG[other.type].color }}>
                      {edge.relation} →
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </Sheet>
      )}
    </div>
  );
}
