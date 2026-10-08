/**
 * Cricket Knowledge Graph — Interactive Entity Map
 *
 * A fully interactive SVG force-simulation knowledge graph showing
 * relationships between players, teams, venues, roles and match concepts.
 *
 * Features:
 *  - Physics-based force layout (spring + repulsion, pure JS — no D3 dep)
 *  - Animated edges with relationship labels
 *  - Node types: Player · Team · Venue · Role · Concept
 *  - Click to focus a node — connected edges highlight, unconnected dim
 *  - Hover tooltip with entity details
 *  - Animated entry (nodes spring in, edges draw in sequence)
 *  - Legend + stats bar
 *  - Responsive SVG that fills its container
 */

import React, { useRef, useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";

/* ─────────────────────────────────────────────────────────────────
   DATA MODEL
───────────────────────────────────────────────────────────────── */

type NodeType = "player" | "team" | "venue" | "role" | "concept";

interface GraphNode {
  id: string;
  type: NodeType;
  label: string;
  sublabel?: string;
  weight: number;   // 1–10 → controls radius
  // layout (mutable — physics)
  x: number;
  y: number;
  vx: number;
  vy: number;
}

interface GraphEdge {
  source: string;
  target: string;
  relation: string;
  strength: number; // 0–1 → line opacity / thickness
}

/* ─────────────────────────────────────────────────────────────────
   GRAPH DATASET
───────────────────────────────────────────────────────────────── */

const RAW_NODES: Omit<GraphNode, "x" | "y" | "vx" | "vy">[] = [
  // Teams
  { id: "rcb",  type: "team",    label: "RCB",       sublabel: "Royal Challengers",   weight: 9 },
  { id: "mi",   type: "team",    label: "MI",        sublabel: "Mumbai Indians",       weight: 9 },
  { id: "csk",  type: "team",    label: "CSK",       sublabel: "Chennai Super Kings",  weight: 9 },
  { id: "kkr",  type: "team",    label: "KKR",       sublabel: "Kolkata Knight Riders",weight: 8 },
  { id: "srh",  type: "team",    label: "SRH",       sublabel: "Sunrisers Hyderabad",  weight: 7 },
  { id: "gt",   type: "team",    label: "GT",        sublabel: "Gujarat Titans",       weight: 7 },
  { id: "rr",   type: "team",    label: "RR",        sublabel: "Rajasthan Royals",     weight: 7 },
  { id: "lsg",  type: "team",    label: "LSG",       sublabel: "Lucknow Super Giants", weight: 6 },
  { id: "pbks", type: "team",    label: "PBKS",      sublabel: "Punjab Kings",         weight: 6 },
  { id: "dc",   type: "team",    label: "DC",        sublabel: "Delhi Capitals",       weight: 6 },

  // Players
  { id: "virat",   type: "player", label: "V Kohli",    sublabel: "RCB · Batter",       weight: 10 },
  { id: "bumrah",  type: "player", label: "J Bumrah",   sublabel: "MI · Pacer",         weight: 9  },
  { id: "dhoni",   type: "player", label: "MS Dhoni",   sublabel: "CSK · WK Batter",    weight: 10 },
  { id: "narine",  type: "player", label: "S Narine",   sublabel: "KKR · Spinner",      weight: 8  },
  { id: "rohit",   type: "player", label: "RG Sharma",  sublabel: "MI · Batter",        weight: 9  },
  { id: "sky",     type: "player", label: "SA Yadav",   sublabel: "MI · Batter",        weight: 8  },
  { id: "rashid",  type: "player", label: "Rashid Khan",sublabel: "GT · Spinner",       weight: 8  },
  { id: "pant",    type: "player", label: "R Pant",     sublabel: "LSG · WK Batter",    weight: 8  },
  { id: "jadeja",  type: "player", label: "RA Jadeja",  sublabel: "CSK · All-rounder",  weight: 7  },
  { id: "warner",  type: "player", label: "DA Warner",  sublabel: "DC · Batter",        weight: 7  },

  // Venues
  { id: "wankhede",   type: "venue", label: "Wankhede",     sublabel: "Mumbai · High-scoring", weight: 8 },
  { id: "chepauk",    type: "venue", label: "MA Chidambaram",sublabel: "Chennai · Spin-friendly",weight: 8 },
  { id: "chinnaswamy",type: "venue", label: "Chinnaswamy",  sublabel: "Bengaluru · Batters' den",weight: 7 },
  { id: "edengarden", type: "venue", label: "Eden Gardens",  sublabel: "Kolkata · Fast outfield",weight: 7 },
  { id: "narendra",   type: "venue", label: "Narendra Modi", sublabel: "Ahmedabad · Largest",    weight: 8 },

  // Roles
  { id: "role_wk",     type: "role",    label: "Wicketkeeper",  sublabel: "Batting + Keeping",   weight: 5 },
  { id: "role_pacer",  type: "role",    label: "Fast Bowler",   sublabel: "Pace & Swing",        weight: 5 },
  { id: "role_spinner",type: "role",    label: "Spinner",       sublabel: "Turn & Control",      weight: 5 },
  { id: "role_ar",     type: "role",    label: "All-Rounder",   sublabel: "Bat + Bowl",          weight: 5 },
  { id: "role_bat",    type: "role",    label: "Top-order Bat", sublabel: "Anchor / Striker",    weight: 5 },

  // Concepts
  { id: "powerplay",  type: "concept", label: "Powerplay",      sublabel: "Overs 1–6",     weight: 6 },
  { id: "death",      type: "concept", label: "Death Overs",    sublabel: "Overs 16–20",   weight: 6 },
  { id: "impact",     type: "concept", label: "Impact Player",  sublabel: "2023 Rule",     weight: 6 },
  { id: "auction",    type: "concept", label: "Mega Auction",   sublabel: "₹27 Cr record", weight: 7 },
  { id: "title",      type: "concept", label: "IPL Title",      sublabel: "Champion",      weight: 7 },
];

const RAW_EDGES: GraphEdge[] = [
  // Player → Team
  { source: "virat",   target: "rcb",  relation: "plays for",    strength: 1.0 },
  { source: "bumrah",  target: "mi",   relation: "plays for",    strength: 1.0 },
  { source: "dhoni",   target: "csk",  relation: "plays for",    strength: 1.0 },
  { source: "narine",  target: "kkr",  relation: "plays for",    strength: 0.9 },
  { source: "rohit",   target: "mi",   relation: "plays for",    strength: 0.9 },
  { source: "sky",     target: "mi",   relation: "plays for",    strength: 0.9 },
  { source: "rashid",  target: "gt",   relation: "plays for",    strength: 0.9 },
  { source: "pant",    target: "lsg",  relation: "plays for",    strength: 0.9 },
  { source: "jadeja",  target: "csk",  relation: "plays for",    strength: 0.8 },
  { source: "warner",  target: "dc",   relation: "plays for",    strength: 0.7 },

  // Player → Role
  { source: "virat",   target: "role_bat",    relation: "archetype",  strength: 0.8 },
  { source: "dhoni",   target: "role_wk",     relation: "archetype",  strength: 0.8 },
  { source: "bumrah",  target: "role_pacer",  relation: "archetype",  strength: 0.8 },
  { source: "narine",  target: "role_ar",     relation: "archetype",  strength: 0.8 },
  { source: "narine",  target: "role_spinner",relation: "archetype",  strength: 0.7 },
  { source: "rashid",  target: "role_spinner",relation: "archetype",  strength: 0.8 },
  { source: "jadeja",  target: "role_ar",     relation: "archetype",  strength: 0.8 },
  { source: "pant",    target: "role_wk",     relation: "archetype",  strength: 0.8 },

  // Team → Venue (home)
  { source: "mi",  target: "wankhede",    relation: "home ground", strength: 0.9 },
  { source: "csk", target: "chepauk",     relation: "home ground", strength: 0.9 },
  { source: "rcb", target: "chinnaswamy", relation: "home ground", strength: 0.9 },
  { source: "kkr", target: "edengarden",  relation: "home ground", strength: 0.9 },
  { source: "gt",  target: "narendra",    relation: "home ground", strength: 0.9 },

  // Player → Concept
  { source: "bumrah", target: "death",   relation: "specialist",  strength: 0.8 },
  { source: "virat",  target: "impact",  relation: "exploits",    strength: 0.6 },
  { source: "pant",   target: "auction", relation: "record buy",  strength: 0.9 },
  { source: "dhoni",  target: "title",   relation: "5× winner",   strength: 1.0 },
  { source: "rohit",  target: "title",   relation: "5× winner",   strength: 1.0 },

  // Team → Concept
  { source: "csk", target: "title",    relation: "5 titles",   strength: 1.0 },
  { source: "mi",  target: "title",    relation: "5 titles",   strength: 1.0 },
  { source: "rcb", target: "title",    relation: "2026 champs",strength: 0.9 },
  { source: "mi",  target: "impact",   relation: "deployed",   strength: 0.6 },
  { source: "gt",  target: "title",    relation: "2 titles",   strength: 0.8 },

  // Matchup edges
  { source: "virat",  target: "bumrah", relation: "rivalry",    strength: 0.9 },
  { source: "rohit",  target: "bumrah", relation: "partners",   strength: 0.7 },
  { source: "dhoni",  target: "jadeja", relation: "partnership",strength: 0.8 },

  // Phase edges
  { source: "powerplay", target: "role_pacer",  relation: "dominates", strength: 0.7 },
  { source: "death",     target: "role_pacer",  relation: "key phase",  strength: 0.8 },
  { source: "death",     target: "bumrah",      relation: "master of",  strength: 0.9 },
  { source: "impact",    target: "auction",     relation: "drives",     strength: 0.6 },
];

/* ─────────────────────────────────────────────────────────────────
   VISUAL CONFIG
───────────────────────────────────────────────────────────────── */

const TYPE_CONFIG: Record<NodeType, { color: string; glow: string; bg: string; border: string; emoji: string }> = {
  player:  { color: "#a78bfa", glow: "rgba(167,139,250,0.4)", bg: "rgba(167,139,250,0.12)", border: "rgba(167,139,250,0.5)", emoji: "🏏" },
  team:    { color: "#fbbf24", glow: "rgba(251,191,36,0.4)",  bg: "rgba(251,191,36,0.12)",  border: "rgba(251,191,36,0.5)",  emoji: "🛡️" },
  venue:   { color: "#34d399", glow: "rgba(52,211,153,0.4)",  bg: "rgba(52,211,153,0.12)",  border: "rgba(52,211,153,0.5)",  emoji: "🏟️" },
  role:    { color: "#f87171", glow: "rgba(248,113,113,0.4)", bg: "rgba(248,113,113,0.12)", border: "rgba(248,113,113,0.5)", emoji: "📋" },
  concept: { color: "#38bdf8", glow: "rgba(56,189,248,0.4)",  bg: "rgba(56,189,248,0.12)",  border: "rgba(56,189,248,0.5)",  emoji: "💡" },
};

/* ─────────────────────────────────────────────────────────────────
   FORCE SIMULATION (pure JS, no D3)
───────────────────────────────────────────────────────────────── */

function initPositions(nodes: GraphNode[], w: number, h: number) {
  // Arrange by type in rough zones
  const zones: Record<NodeType, [number, number]> = {
    team:    [w * 0.5, h * 0.5],
    player:  [w * 0.5, h * 0.25],
    venue:   [w * 0.15, h * 0.7],
    role:    [w * 0.85, h * 0.7],
    concept: [w * 0.5, h * 0.85],
  };
  const counts: Partial<Record<NodeType, number>> = {};
  nodes.forEach(n => {
    const c = (counts[n.type] ?? 0);
    counts[n.type] = c + 1;
    const [zx, zy] = zones[n.type];
    const angle = (c / 10) * Math.PI * 2;
    const r = 80 + c * 15;
    n.x = zx + Math.cos(angle) * r + (Math.random() - 0.5) * 30;
    n.y = zy + Math.sin(angle) * r + (Math.random() - 0.5) * 30;
    n.vx = 0;
    n.vy = 0;
  });
}

function tick(nodes: GraphNode[], edges: GraphEdge[], w: number, h: number, alpha: number) {
  const REPULSION = 1200;
  const SPRING_LEN = 120;
  const SPRING_K   = 0.04;
  const DAMPING    = 0.88;
  const CENTER_G   = 0.008;

  // Repulsion between all pairs
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      const a = nodes[i], b = nodes[j];
      const dx = a.x - b.x, dy = a.y - b.y;
      const dist2 = dx * dx + dy * dy + 1;
      const dist = Math.sqrt(dist2);
      const force = (REPULSION / dist2) * alpha;
      const fx = (dx / dist) * force;
      const fy = (dy / dist) * force;
      a.vx += fx; a.vy += fy;
      b.vx -= fx; b.vy -= fy;
    }
  }

  // Spring attraction along edges
  const nodeMap = new Map(nodes.map(n => [n.id, n]));
  for (const edge of edges) {
    const a = nodeMap.get(edge.source), b = nodeMap.get(edge.target);
    if (!a || !b) continue;
    const dx = b.x - a.x, dy = b.y - a.y;
    const dist = Math.sqrt(dx * dx + dy * dy) || 1;
    const force = (dist - SPRING_LEN) * SPRING_K * edge.strength * alpha;
    const fx = (dx / dist) * force;
    const fy = (dy / dist) * force;
    a.vx += fx; a.vy += fy;
    b.vx -= fx; b.vy -= fy;
  }

  // Gravity toward center
  const cx = w / 2, cy = h / 2;
  for (const n of nodes) {
    n.vx += (cx - n.x) * CENTER_G * alpha;
    n.vy += (cy - n.y) * CENTER_G * alpha;
    n.vx *= DAMPING;
    n.vy *= DAMPING;
    n.x += n.vx;
    n.y += n.vy;
    // Hard boundary
    const r = 8 + n.weight * 2;
    n.x = Math.max(r, Math.min(w - r, n.x));
    n.y = Math.max(r, Math.min(h - r, n.y));
  }
}

/* ─────────────────────────────────────────────────────────────────
   COMPONENT
───────────────────────────────────────────────────────────────── */

export function KnowledgeGraphSimple() {
  const svgRef = useRef<SVGSVGElement>(null);
  const rafRef = useRef<number | null>(null);

  const [nodes, setNodes] = useState<GraphNode[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<NodeType | "all">("all");
  const [frame, setFrame] = useState(0);
  const [dims, setDims] = useState({ w: 800, h: 520 });

  const edges = RAW_EDGES;

  // Init nodes with positions
  useEffect(() => {
    const { w, h } = dims;
    const ns: GraphNode[] = RAW_NODES.map(n => ({ ...n, x: w/2, y: h/2, vx: 0, vy: 0 }));
    initPositions(ns, w, h);
    setNodes(ns);
  }, []);

  // Measure SVG container
  useEffect(() => {
    const el = svgRef.current?.parentElement;
    if (!el) return;
    const obs = new ResizeObserver(e => {
      const r = e[0].contentRect;
      setDims({ w: r.width || 800, h: Math.max(480, r.width * 0.62) });
    });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  // Physics loop
  useEffect(() => {
    if (nodes.length === 0) return;
    let alpha = 1;
    let iter = 0;

    const loop = () => {
      if (iter > 300) { alpha = 0.0; }
      if (iter <= 300) {
        alpha *= 0.992;
        tick(nodes, edges, dims.w, dims.h, alpha);
        setFrame(f => f + 1); // trigger re-render
      }
      iter++;
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [nodes, dims]);

  // Get connected node IDs for a selected node
  const connectedIds = useCallback((id: string) => {
    const set = new Set<string>();
    set.add(id);
    for (const e of edges) {
      if (e.source === id) set.add(e.target);
      if (e.target === id) set.add(e.source);
    }
    return set;
  }, [edges]);

  const focusedConn = selectedId ? connectedIds(selectedId) : null;
  const activeNode = hoveredId ?? selectedId;

  // Filter visible nodes
  const visibleNodes = filterType === "all" ? nodes : nodes.filter(n => n.type === filterType);
  const visibleIds = new Set(visibleNodes.map(n => n.id));
  const visibleEdges = edges.filter(e => visibleIds.has(e.source) && visibleIds.has(e.target));

  const nodeMap = new Map(nodes.map(n => [n.id, n]));

  const getNodeRadius = (n: GraphNode) => 10 + n.weight * 1.8;

  const NODE_COUNTS: Record<NodeType, number> = {
    player: RAW_NODES.filter(n => n.type === "player").length,
    team:   RAW_NODES.filter(n => n.type === "team").length,
    venue:  RAW_NODES.filter(n => n.type === "venue").length,
    role:   RAW_NODES.filter(n => n.type === "role").length,
    concept:RAW_NODES.filter(n => n.type === "concept").length,
  };

  return (
    <div className="w-full flex flex-col gap-4">
      {/* Stats bar */}
      <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
        {(Object.entries(TYPE_CONFIG) as [NodeType, typeof TYPE_CONFIG[NodeType]][]).map(([type, cfg]) => (
          <div
            key={type}
            onClick={() => setFilterType(filterType === type ? "all" : type)}
            className="flex flex-col items-center gap-1 px-3 py-2 rounded-xl border cursor-pointer transition-all hover:scale-105"
            style={{
              background: filterType === type ? cfg.bg : "rgba(255,255,255,0.02)",
              borderColor: filterType === type ? cfg.border : "rgba(255,255,255,0.08)",
              boxShadow: filterType === type ? `0 0 16px ${cfg.glow}` : "none",
            }}
          >
            <span className="text-base leading-none">{cfg.emoji}</span>
            <span className="text-[10px] font-black uppercase tracking-widest" style={{ color: cfg.color }}>
              {type}
            </span>
            <span className="text-[11px] font-bold text-white/60">{NODE_COUNTS[type]}</span>
          </div>
        ))}
      </div>

      {/* Graph canvas */}
      <div className="relative w-full rounded-2xl border border-white/10 bg-[#06091a] overflow-hidden">
        <svg
          ref={svgRef}
          width="100%"
          height={dims.h}
          className="block"
          onClick={() => setSelectedId(null)}
        >
          <defs>
            {(Object.entries(TYPE_CONFIG) as [NodeType, typeof TYPE_CONFIG[NodeType]][]).map(([type, cfg]) => (
              <filter key={type} id={`glow-${type}`} x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur in="SourceGraphic" stdDeviation="3" result="blur" />
                <feColorMatrix in="blur" type="saturate" values="2" result="colored" />
                <feMerge><feMergeNode in="colored" /><feMergeNode in="SourceGraphic" /></feMerge>
              </filter>
            ))}
            <marker id="arrowhead" markerWidth="6" markerHeight="4" refX="6" refY="2" orient="auto">
              <polygon points="0 0, 6 2, 0 4" fill="rgba(255,255,255,0.2)" />
            </marker>
          </defs>

          {/* Grid background */}
          <pattern id="grid" x="0" y="0" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(255,255,255,0.025)" strokeWidth="0.5" />
          </pattern>
          <rect width="100%" height="100%" fill="url(#grid)" />

          {/* Edges */}
          {visibleEdges.map((edge, i) => {
            const a = nodeMap.get(edge.source), b = nodeMap.get(edge.target);
            if (!a || !b) return null;
            const isFocused = focusedConn ? (focusedConn.has(edge.source) && focusedConn.has(edge.target)) : true;
            const isHovered = hoveredId === edge.source || hoveredId === edge.target;
            const opacity = selectedId ? (isFocused ? 0.7 * edge.strength : 0.04) : (hoveredId ? (isHovered ? 0.75 : 0.08) : 0.25 * edge.strength);

            // Midpoint for label
            const mx = (a.x + b.x) / 2;
            const my = (a.y + b.y) / 2;

            return (
              <g key={`${edge.source}-${edge.target}-${i}`}>
                <line
                  x1={a.x} y1={a.y} x2={b.x} y2={b.y}
                  stroke={isFocused && (selectedId || isHovered) ? TYPE_CONFIG[a.type].color : "rgba(255,255,255,0.3)"}
                  strokeWidth={isFocused && (selectedId || isHovered) ? 2 : 1}
                  strokeOpacity={opacity}
                  strokeDasharray={edge.strength < 0.7 ? "4 4" : "none"}
                  markerEnd="url(#arrowhead)"
                />
                {(selectedId ? isFocused : isHovered) && (
                  <text x={mx} y={my - 4} textAnchor="middle" fontSize="8" fill="rgba(255,255,255,0.55)" fontFamily="monospace" fontWeight="bold">
                    {edge.relation}
                  </text>
                )}
              </g>
            );
          })}

          {/* Nodes */}
          {visibleNodes.map((node) => {
            const cfg = TYPE_CONFIG[node.type];
            const r = getNodeRadius(node);
            const isFocused = focusedConn ? focusedConn.has(node.id) : true;
            const isSelected = selectedId === node.id;
            const isHov = hoveredId === node.id;
            const opacity = selectedId ? (isFocused ? 1 : 0.15) : 1;

            return (
              <g
                key={node.id}
                transform={`translate(${node.x},${node.y})`}
                style={{ opacity, cursor: "pointer" }}
                onClick={e => { e.stopPropagation(); setSelectedId(selectedId === node.id ? null : node.id); }}
                onMouseEnter={() => setHoveredId(node.id)}
                onMouseLeave={() => setHoveredId(null)}
                filter={isSelected || isHov ? `url(#glow-${node.type})` : undefined}
              >
                {/* Outer pulse ring for selected */}
                {isSelected && (
                  <circle r={r + 8} fill="none" stroke={cfg.color} strokeWidth="1.5" strokeOpacity={0.35} strokeDasharray="4 4" />
                )}
                {/* Background circle */}
                <circle r={r} fill={cfg.bg} stroke={cfg.color} strokeWidth={isSelected ? 2.5 : isHov ? 2 : 1.5} strokeOpacity={isHov || isSelected ? 1 : 0.7} />
                {/* Emoji / initial */}
                <text textAnchor="middle" dominantBaseline="middle" fontSize={r > 22 ? "11" : "9"} fill="white" fontWeight="bold" fontFamily="system-ui">
                  {node.label.split(" ").map(w => w[0]).join("").slice(0, 3)}
                </text>
                {/* Label below */}
                <text y={r + 11} textAnchor="middle" fontSize="8.5" fill="rgba(255,255,255,0.75)" fontFamily="system-ui" fontWeight="600">
                  {node.label.length > 14 ? node.label.slice(0, 13) + "…" : node.label}
                </text>
              </g>
            );
          })}
        </svg>

        {/* Tooltip */}
        <AnimatePresence>
          {activeNode && (() => {
            const node = nodeMap.get(activeNode);
            if (!node) return null;
            const cfg = TYPE_CONFIG[node.type];
            const nodeEdges = edges.filter(e => e.source === activeNode || e.target === activeNode);
            return (
              <motion.div
                key={activeNode}
                initial={{ opacity: 0, scale: 0.9, y: 8 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.15 }}
                className="absolute bottom-4 right-4 rounded-2xl border p-4 backdrop-blur-xl max-w-[240px]"
                style={{ background: cfg.bg, borderColor: cfg.border, boxShadow: `0 8px 32px ${cfg.glow}` }}
              >
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xl">{cfg.emoji}</span>
                  <div>
                    <div className="text-[13px] font-black text-white leading-tight">{node.label}</div>
                    {node.sublabel && <div className="text-[10px] font-bold" style={{ color: cfg.color }}>{node.sublabel}</div>}
                  </div>
                </div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest border" style={{ background: cfg.bg, borderColor: cfg.border, color: cfg.color }}>
                    {node.type}
                  </span>
                  <span className="text-[10px] text-white/50">{nodeEdges.length} connections</span>
                </div>
                <div className="flex flex-col gap-1 max-h-[120px] overflow-y-auto">
                  {nodeEdges.slice(0, 6).map((e, i) => {
                    const otherId = e.source === activeNode ? e.target : e.source;
                    const other = nodeMap.get(otherId);
                    if (!other) return null;
                    const oc = TYPE_CONFIG[other.type];
                    return (
                      <div key={i} className="flex items-center gap-1.5 text-[10px]">
                        <span style={{ color: oc.color }}>●</span>
                        <span className="text-white/60">{e.relation}</span>
                        <span className="text-white/80 font-bold">{other.label}</span>
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            );
          })()}
        </AnimatePresence>

        {/* Instructions overlay */}
        {nodes.length > 0 && !selectedId && !hoveredId && (
          <div className="absolute bottom-4 left-4 text-[10px] text-white/25 font-mono">
            Click node to focus · hover to preview · filter by type above
          </div>
        )}
      </div>

      {/* Legend row */}
      <div className="flex flex-wrap items-center gap-4 px-2">
        {(Object.entries(TYPE_CONFIG) as [NodeType, typeof TYPE_CONFIG[NodeType]][]).map(([type, cfg]) => (
          <div key={type} className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full" style={{ background: cfg.color }} />
            <span className="text-[10px] font-bold text-white/50 capitalize">{type}</span>
          </div>
        ))}
        <div className="flex items-center gap-1.5 ml-auto">
          <div className="w-8 h-px border-t border-white/30" />
          <span className="text-[10px] text-white/30">solid = strong link</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-8 h-px border-t-2 border-dashed border-white/30" />
          <span className="text-[10px] text-white/30">dashed = weaker link</span>
        </div>
      </div>

      <div className="text-[10px] text-white/20 text-center font-mono">
        {RAW_NODES.length} entities · {RAW_EDGES.length} relationships · force-simulated layout
      </div>
    </div>
  );
}

// Keep old export for any other page that might import it
export function KnowledgeGraph({ nodes: _n, links: _l }: { nodes: unknown[]; links: unknown[] }) {
  return <KnowledgeGraphSimple />;
}