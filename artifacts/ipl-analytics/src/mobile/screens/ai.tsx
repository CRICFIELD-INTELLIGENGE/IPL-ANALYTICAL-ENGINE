// Mobile AI — "the press box": full 12-module Decision Engine directory (matching desktop /ai-analyst)
// plus the Ask the IPL Database conversational SQL press box (/api/ask).
import { useEffect, useRef, useState } from "react";
import { Link } from "wouter";
import {
  Activity,
  ArrowRight,
  ArrowUp,
  Dna,
  Droplets,
  Eye,
  Gavel,
  GitBranch,
  HeartPulse,
  Map,
  Network,
  Rewind,
  Sparkles,
  Swords,
  Users,
} from "lucide-react";
import { askQuestion, type AskResponse } from "@/lib/ask-api";
import { DewImpactModal } from "@/components/decision/dew-impact-modal";

const SUGGEST = [
  "Most sixes in the death overs since 2022",
  "Best economy in the powerplay in IPL 2026 (min 30 overs)",
  "Highest strike rate against spin, career",
  "Most wickets for Mumbai Indians",
];

type EngineCategory = "all" | "tactics" | "squad" | "profiling";

interface MobileEngine {
  id: string;
  name: string;
  badge: string;
  tagline: string;
  category: Exclude<EngineCategory, "all">;
  href?: string;
  icon: typeof Swords;
  accent: string;
}

const ENGINES: MobileEngine[] = [
  {
    id: "strategy-sim",
    name: "Strategy Simulator",
    badge: "FLAGSHIP",
    tagline: "Simulate 3 bowling plans with win-probability deltas.",
    category: "tactics",
    href: "/ai-analyst/strategy-sim",
    icon: Swords,
    accent: "#22d3ee",
  },
  {
    id: "alt-universe",
    name: "Alternate Universe",
    badge: "MONTE CARLO",
    tagline: "Replay real IPL innings with 1,000 parallel runs.",
    category: "tactics",
    href: "/ai-analyst/alt-universe",
    icon: GitBranch,
    accent: "#a78bfa",
  },
  {
    id: "opposition-map",
    name: "Opposition Exploit Map",
    badge: "MATCHUPS",
    tagline: "Spot tactical weaknesses and bowling matchup grids.",
    category: "tactics",
    href: "/ai-analyst/opposition-map",
    icon: Map,
    accent: "#fb7185",
  },
  {
    id: "decision-replay",
    name: "Captain's Decision Replay",
    badge: "TURNING POINTS",
    tagline: "Step into real IPL chases and test captaincy calls.",
    category: "tactics",
    href: "/ai-analyst/decision-replay",
    icon: Rewind,
    accent: "#fbbf24",
  },
  {
    id: "dew-impact-matrix",
    name: "Dew & Ball Wear Matrix",
    badge: "CONDITIONS",
    tagline: "Evening humidity, grip decay & chasing par shifts.",
    category: "tactics",
    icon: Droplets,
    accent: "#38bdf8",
  },
  {
    id: "auction-war-room",
    name: "Auction War Room",
    badge: "BIDDING",
    tagline: "Purse planning, live targets & squad budget math.",
    category: "squad",
    href: "/ai-analyst/auction-war-room",
    icon: Gavel,
    accent: "#34d399",
  },
  {
    id: "playing-xi",
    name: "Build Playing XI",
    badge: "OPTIMIZER",
    tagline: "Balance overseas slots, phases & role coverage.",
    category: "squad",
    href: "/ai-analyst/playing-xi",
    icon: Users,
    accent: "#60a5fa",
  },
  {
    id: "squad-dna",
    name: "Squad DNA",
    badge: "BLUEPRINT",
    tagline: "Franchise composition, phase strengths & gaps.",
    category: "squad",
    href: "/ai-analyst/squad-dna",
    icon: Dna,
    accent: "#2dd4bf",
  },
  {
    id: "player-pool",
    name: "Player Pool Graph",
    badge: "MARKET",
    tagline: "Explore role clusters, availability & value tiers.",
    category: "squad",
    href: "/ai-analyst/player-pool",
    icon: Network,
    accent: "#38bdf8",
  },
  {
    id: "pressure",
    name: "Pressure Genome",
    badge: "CLUTCH",
    tagline: "Measure nerve and execution under chase pressure.",
    category: "profiling",
    href: "/ai-analyst/pressure",
    icon: HeartPulse,
    accent: "#e879f9",
  },
  {
    id: "weakness",
    name: "Hidden Weakness Detector",
    badge: "ANOMALIES",
    tagline: "Surface recurring matchup traps & phase drop-offs.",
    category: "profiling",
    href: "/ai-analyst/weakness",
    icon: Eye,
    accent: "#f87171",
  },
  {
    id: "insight-feed",
    name: "Daily Insight Feed",
    badge: "DISCOVERY",
    tagline: "Automated daily findings from the ball warehouse.",
    category: "profiling",
    href: "/ai-analyst/feed",
    icon: Sparkles,
    accent: "#c084fc",
  },
];

type Turn = { q: string; a?: AskResponse; error?: string };
const fmt = (v: number | string | null, f: string) =>
  v == null
    ? "—"
    : typeof v === "string"
    ? v
    : f === "int"
    ? Math.round(v).toLocaleString("en-IN")
    : v.toFixed(f === "dec2" ? 2 : 1);

export default function MobileAi() {
  const [turns, setTurns] = useState<Turn[]>([]);
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  const [category, setCategory] = useState<EngineCategory>("all");
  const [dewOpen, setDewOpen] = useState(false);
  const end = useRef<HTMLDivElement>(null);

  useEffect(() => {
    end.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [turns]);

  async function ask(text: string) {
    const question = text.trim();
    if (!question || busy) return;
    setQ("");
    setBusy(true);
    setTurns((t) => [...t, { q: question }]);
    try {
      const a = await askQuestion(question);
      setTurns((t) => t.map((x, i) => (i === t.length - 1 ? { ...x, a } : x)));
    } catch {
      setTurns((t) =>
        t.map((x, i) =>
          i === t.length - 1
            ? { ...x, error: "The analyst could not answer just now. Check your connection and try again." }
            : x,
        ),
      );
    } finally {
      setBusy(false);
    }
  }

  const visibleEngines = ENGINES.filter((e) => category === "all" || e.category === category);

  return (
    <div className="ma">
      <div className="ma-log" aria-live="polite">
        {turns.length === 0 && (
          <div className="ma-intro space-y-4">
            <div>
              <div className="cfm-kicker">CRICFIELD Decision Engine</div>
              <h1>Ask the press box</h1>
              <p className="cfm-small ma-sub">
                Plain-English questions become deterministic SQL queries over every IPL ball, or launch any of the 12 desktop decision engines below.
              </p>
              <div className="ma-suggest">
                {SUGGEST.map((s) => (
                  <button key={s} type="button" onClick={() => void ask(s)}>
                    {s}
                  </button>
                ))}
              </div>
            </div>

            <div className="pt-2 space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                <span className="cfm-kicker">All 12 Decision Engines</span>
                <Link href="/ai-analyst/ask" className="text-[11px] font-bold text-cyan-400 inline-flex items-center gap-1">
                  Full Ask <ArrowRight className="h-3 w-3" />
                </Link>
              </div>

              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
                {(
                  [
                    ["all", "All (12)"],
                    ["tactics", "Tactics (5)"],
                    ["squad", "Squad (4)"],
                    ["profiling", "Profiling (3)"],
                  ] as [EngineCategory, string][]
                ).map(([id, label]) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setCategory(id)}
                    className={`rounded-full border px-3 py-1 text-[11px] font-bold whitespace-nowrap transition-colors ${
                      category === id
                        ? "border-cyan-400/50 bg-cyan-400/15 text-cyan-200"
                        : "border-white/10 bg-white/[0.03] text-slate-400"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-1 gap-2">
                {visibleEngines.map((eng) => {
                  const Icon = eng.icon;
                  const cardBody = (
                    <div className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-[#0B1426]/80 p-3 text-left transition-colors active:scale-[0.99]">
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border"
                          style={{
                            borderColor: `${eng.accent}40`,
                            backgroundColor: `${eng.accent}18`,
                            color: eng.accent,
                          }}
                        >
                          <Icon className="h-4 w-4" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="truncate text-xs font-black text-white">{eng.name}</span>
                            <span
                              className="rounded-full px-1.5 py-0.5 text-[8px] font-mono font-bold uppercase tracking-wider"
                              style={{ backgroundColor: `${eng.accent}1a`, color: eng.accent }}
                            >
                              {eng.badge}
                            </span>
                          </div>
                          <p className="truncate text-[11px] text-slate-400 mt-0.5">{eng.tagline}</p>
                        </div>
                      </div>
                      <ArrowRight className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                    </div>
                  );

                  return eng.href ? (
                    <Link key={eng.id} href={eng.href}>
                      {cardBody}
                    </Link>
                  ) : (
                    <button key={eng.id} type="button" onClick={() => setDewOpen(true)} className="w-full">
                      {cardBody}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {turns.map((t, i) => (
          <div
            key={i}
            className="ma-turn"
            style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr)", gap: 8, minWidth: 0 }}
          >
            <div className="ma-q">{t.q}</div>
            {t.error ? (
              <div className="ma-a" role="alert">
                <p>{t.error}</p>
              </div>
            ) : !t.a ? (
              <div className="ma-a">
                <div className="cfm-skel" style={{ height: 70 }} />
              </div>
            ) : t.a.understood ? (
              <div className="ma-a">
                <p>
                  <strong>{t.a.result.title}</strong>
                </p>
                <p>{t.a.result.answer}</p>
                <ol className="ma-table">
                  {t.a.result.rows.slice(0, 8).map((r, k) => {
                    const res = (t.a as Extract<AskResponse, { understood: true }>).result;
                    const col = res.columns.find((c) => c.highlight) ?? res.columns[0];
                    return (
                      <li key={r.key}>
                        <span className="cfm-num" style={{ color: "var(--m-slate)" }}>
                          {k + 1}
                        </span>
                        <span>
                          {r.label}
                          {r.sub && (
                            <small className="cfm-small" style={{ display: "block" }}>
                              {r.sub}
                            </small>
                          )}
                        </span>
                        {col && <b>{fmt(r.values[col.key] ?? null, col.format)}</b>}
                      </li>
                    );
                  })}
                </ol>
                {t.a.result.qualification && (
                  <p className="cfm-small" style={{ marginTop: 8 }}>
                    {t.a.result.qualification}
                  </p>
                )}
                {t.a.result.caveats.map((c) => (
                  <p key={c} className="cfm-small">
                    {c}
                  </p>
                ))}
              </div>
            ) : (
              <div className="ma-a">
                <p>I couldn't turn that into a stat question{t.a.notes[0] ? `: ${t.a.notes[0]}` : "."}</p>
                {t.a.suggestions.length > 0 && (
                  <div className="ma-suggest">
                    {t.a.suggestions.slice(0, 3).map((s) => (
                      <button key={s} type="button" onClick={() => void ask(s)}>
                        {s}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
        <div ref={end} />
      </div>

      <form
        className="ma-compose"
        onSubmit={(e) => {
          e.preventDefault();
          void ask(q);
        }}
      >
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Ask about any player, team or phase"
          aria-label="Ask the analyst"
          enterKeyHint="send"
        />
        <button type="submit" aria-label="Send question" disabled={busy || !q.trim()}>
          <ArrowUp size={20} />
        </button>
      </form>

      <DewImpactModal open={dewOpen} onOpenChange={setDewOpen} />
    </div>
  );
}
