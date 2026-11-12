import { CricFieldMascot } from "@/components/CricFieldMascot";
/**
 * ASK THE IPL DATABASE — Decision Intelligence OS, Phase 1 (Foundation)
 * ─────────────────────────────────────────────────────────────────────────────
 *   • Ask: plain-English stats questions → a typed query → SQL over 295k
 *     ball-by-ball deliveries. Every answer shows how the question was read
 *     as removable chips, so a wrong guess is one click to fix.
 *   • Historical database: coverage, season-by-season summary and live
 *     data-health checks for the warehouse every module is built on.
 * Falls back to a saved demo answer / overview when the API is unreachable.
 */

import { useEffect, useRef, useState, type FormEvent } from "react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertTriangle, ArrowLeft, CheckCircle2, Database, Info, Loader2, MessageSquareText,
  Search, Sparkles, Trophy, X,
} from "lucide-react";
import { Layout } from "@/components/layout";
import {
  askQuestion, fetchHistoryOverview, runQuery, withoutChip,
  type AskResponse, type Chip, type HistoryOverview, type StatColumn, type StatResult,
} from "@/lib/ask-api";
import { MOCK_ANSWER, MOCK_OVERVIEW, MOCK_QUESTION } from "@/components/decision/ask-mock";
import { askGeminiAnalyst, type GeminiAnalysisResult } from "@/lib/gemini-client";
import { Key, Bot } from "lucide-react";

const EXAMPLES = [
  "Most runs in IPL 2025",
  "Best economy in the death overs since 2022",
  "Kohli vs Bumrah",
  "Highest individual scores",
  "CSK vs MI head to head",
  "Which venue is best for spinners?",
  "Most runs against spin since 2023",
  "Best bowling figures in finals",
  "Who is the best finisher?",
  "Most titles",
];

interface Entry {
  id: number;
  question: string;
  status: "loading" | "done" | "error";
  response?: AskResponse;
  error?: string;
  demo?: boolean;
  edited?: boolean;
}

let nextId = 1;

export default function AskPage() {
  // ?tab=database deep-links from the roadmap's "Historical IPL database" item.
  const [tab, setTab] = useState<"ask" | "gemini" | "database">(() => {
    const qTab = new URLSearchParams(window.location.search).get("tab");
    if (qTab === "database") return "database";
    if (qTab === "gemini") return "gemini";
    return "ask";
  });
  const [input, setInput] = useState("");
  const [entries, setEntries] = useState<Entry[]>([]);

  // CricField AI State
  const [geminiInput, setGeminiInput] = useState("");
  const [geminiLoading, setGeminiLoading] = useState(false);
  const [geminiResult, setGeminiResult] = useState<GeminiAnalysisResult | null>(null);

  const overviewQ = useQuery({ queryKey: ["history-overview"], queryFn: fetchHistoryOverview, retry: 1, staleTime: 30 * 60_000 });
  const overview: HistoryOverview = overviewQ.data ?? MOCK_OVERVIEW;

  const update = (id: number, patch: Partial<Entry>) => setEntries((es) => es.map((e) => (e.id === id ? { ...e, ...patch } : e)));

  async function ask(question: string) {
    const q = question.trim();
    if (q.length < 2) return;
    setTab("ask");
    setInput("");
    const id = nextId++;
    setEntries((es) => [{ id, question: q, status: "loading" as const }, ...es].slice(0, 12));
    try {
      update(id, { status: "done", response: await askQuestion(q) });
    } catch (err) {
      // API down or an older server without /api/ask: show the saved demo instead of nothing.
      update(id, { status: "error", error: (err as Error).message, response: MOCK_ANSWER, demo: true });
    }
  }

  async function handleGeminiSubmit(promptText: string) {
    const p = promptText.trim();
    if (p.length < 3) return;
    setGeminiLoading(true);
    try {
      const res = await askGeminiAnalyst(p);
      setGeminiResult(res);
    } catch (err) {
      console.error(err);
    } finally {
      setGeminiLoading(false);
    }
  }

  async function removeChip(entry: Entry, chip: Chip) {
    if (!entry.response?.understood || entry.demo) return;
    const query = withoutChip(entry.response.result.query, chip.field);
    update(entry.id, { status: "loading" });
    try {
      const response = await runQuery(query);
      update(entry.id, { status: "done", response: { ...response, notes: [] }, edited: true });
    } catch (err) {
      update(entry.id, { status: "done", error: (err as Error).message });
    }
  }

  // ?q=… (links from the Insight Feed) asks the question on arrival, once.
  const askedFromUrl = useRef(false);
  useEffect(() => {
    if (askedFromUrl.current) return;
    askedFromUrl.current = true;
    const q = new URLSearchParams(window.location.search).get("q");
    if (q) void ask(q);
  }, []);

  const onSubmit = (e: FormEvent) => { e.preventDefault(); void ask(input); };
  const onGeminiSubmit = (e: FormEvent) => { e.preventDefault(); void handleGeminiSubmit(geminiInput); };
  const c = overview.coverage;

  const GEMINI_SUGGESTIONS = [
    "How to defend 22 runs in overs 19–20 at Chepauk?",
    "Analyze Kohli vs Bumrah historical dismissal mechanics",
    "Optimal death bowling field setting for Andre Russell",
    "Auction bid ceiling valuation for a mystery spinner",
  ];

  return (
    <Layout hideRightPanel>
      <div className="space-y-6 pb-20 max-w-5xl mx-auto w-full min-w-0">
        {/* Header */}
        <div className="space-y-3">
          <Link href="/ai-analyst" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-white">
            <ArrowLeft className="w-3.5 h-3.5" /> AI Analyst
          </Link>
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <div className="text-[10px] font-bold uppercase tracking-widest text-cyan-400">Phase 1 · Foundation</div>
              <h1 className="font-display font-black text-2xl sm:text-3xl text-white">Ask CricField</h1>
              <p className="text-sm text-muted-foreground mt-1">
                Plain-English database stats queries · Evidence-backed AI analysis · IPL {c.firstSeason}–{c.lastSeason}
              </p>
            </div>
            <div className="flex rounded-xl border border-white/10 bg-white/5 p-1 text-xs font-semibold" role="tablist">
              {([
                ["ask", "SQL Database", MessageSquareText],
                ["gemini", "CricField AI", Sparkles],
                ["database", "Warehouse Summary", Database],
              ] as const).map(([key, label, Icon]) => (
                <button
                  key={key}
                  role="tab"
                  aria-selected={tab === key}
                  onClick={() => setTab(key)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors ${tab === key ? "bg-cyan-500/25 text-cyan-300 border border-cyan-500/30" : "text-muted-foreground hover:text-white border border-transparent"}`}
                >
                  <Icon className="w-3.5 h-3.5" /> {label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* TAB 1: SQL WAREHOUSE ASK */}
        {tab === "ask" && (
          <>
            <form onSubmit={onSubmit} className="rounded-2xl border border-white/10 bg-white/[0.04] focus-within:border-cyan-400/60 transition-colors p-2 flex items-center gap-2">
              <Search className="w-4 h-4 text-muted-foreground ml-2 shrink-0" />
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="e.g. Most sixes at the death since 2023"
                aria-label="Ask a stats question"
                className="flex-1 bg-transparent outline-none text-base py-2 placeholder:text-muted-foreground min-w-0"
              />
              <button type="submit" disabled={input.trim().length < 2} className="px-4 py-2 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 text-sm font-semibold disabled:opacity-40 transition-colors">
                Ask
              </button>
            </form>

            <div className="flex flex-wrap gap-1.5">
              {EXAMPLES.map((q) => (
                <button key={q} onClick={() => void ask(q)} className="px-2.5 py-1 rounded-full text-xs border border-white/10 bg-white/5 text-muted-foreground hover:text-white hover:border-white/25 transition-colors">
                  {q}
                </button>
              ))}
            </div>

            {!entries.length && (
              <div className="rounded-2xl border border-dashed border-white/10 p-8 text-center text-sm text-muted-foreground">
                <Sparkles className="w-5 h-5 mx-auto mb-2 text-cyan-400" />
                Ask about runs, wickets, strike rates, economy, sixes, team records, titles or head-to-heads —
                filtered by season, phase, venue, team, opponent, pace vs spin, chasing or playoffs.
              </div>
            )}

            <div className="space-y-4">
              <AnimatePresence initial={false}>
                {entries.map((e) => (
                  <motion.div key={e.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                    <AnswerCard entry={e} onRemoveChip={(chip) => void removeChip(e, chip)} onAsk={(q) => void ask(q)} />
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </>
        )}

        {/* TAB 2: GEMINI LLM REASONING */}
        {tab === "gemini" && (
          <div className="space-y-6">
            <div className="p-4 rounded-2xl bg-cyan-950/30 border border-cyan-500/30 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center shrink-0">
                  <CricFieldMascot activity="analyst" size={28} />
                </div>
                <div>
                  <div className="text-sm font-bold text-white flex items-center gap-2">
                    <span>CricField AI</span>
                    <span className="text-[9px] font-mono px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                      OPTIONAL AI
                    </span>
                  </div>
                  <p className="text-xs text-white/60 mt-0.5">
                    Free-text reasoning from an external language model. Its answers are not computed from CricField's data and may contain wrong numbers — use the SQL Database tab for statistics.
                  </p>
                </div>
              </div>

              <span className="text-xs text-white/60">Available when enabled by CricField</span>
            </div>

            {/* Input Form */}
            <form onSubmit={onGeminiSubmit} className="rounded-2xl border border-cyan-500/30 bg-white/[0.04] focus-within:border-cyan-400 transition-colors p-2 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-cyan-400 ml-2 shrink-0" />
              <input
                value={geminiInput}
                onChange={(e) => setGeminiInput(e.target.value)}
                maxLength={2000}
                placeholder="Ask CricField: e.g. Who scored the most runs in IPL 2025?"
                className="flex-1 bg-transparent outline-none text-base py-2 placeholder:text-muted-foreground min-w-0"
              />
              <button
                type="submit"
                disabled={geminiInput.trim().length < 3 || geminiLoading}
                className="px-5 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-bold text-sm shadow-[0_0_15px_rgba(6,182,212,0.3)] disabled:opacity-40 transition-all flex items-center gap-1.5"
              >
                {geminiLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>Analyze</span>
              </button>
            </form>

            {/* Suggested prompts */}
            <div className="flex flex-wrap gap-1.5">
              {GEMINI_SUGGESTIONS.map((q) => (
                <button
                  key={q}
                  onClick={() => {
                    setGeminiInput(q);
                    void handleGeminiSubmit(q);
                  }}
                  className="px-3 py-1.5 rounded-full text-xs border border-cyan-500/20 bg-cyan-500/5 text-cyan-300 hover:bg-cyan-500/15 hover:border-cyan-500/40 transition-all text-left"
                >
                  ⚡ {q}
                </button>
              ))}
            </div>

            {/* Gemini Output Card */}
            {geminiResult && geminiResult.source === "unavailable" && (
              <div role="status" className="rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
                {geminiResult.error ?? "AI Analyst is unavailable."}
              </div>
            )}

            {geminiResult && geminiResult.source === "live_api" && (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-3xl p-6 bg-gradient-to-br from-[#0B1226] via-[#070B18] to-[#100D28] border border-cyan-500/40 shadow-[0_0_35px_rgba(6,182,212,0.15)] space-y-4"
              >
                <div className="flex items-center justify-between pb-3 border-b border-white/10">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-cyan-400" />
                    <span className="font-mono text-xs font-bold text-white uppercase tracking-wider">
                      Gemini response — unverified AI text
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-[10px] font-mono text-white/50">
                    <span className="px-2 py-0.5 rounded bg-white/5 border border-white/10">
                      {geminiResult.model}
                    </span>
                    <span>{geminiResult.ms}ms</span>
                  </div>
                </div>

                <div className="text-sm text-white/85 leading-relaxed whitespace-pre-line font-sans space-y-2">
                  {geminiResult.text}
                </div>
                <p className="text-xs text-slate-400">AI interpretation may contain errors. Inspect the retrieved records below.</p>
                {geminiResult.evidence?.map(item => <details key={item.id} className="text-xs border border-white/10 rounded p-3"><summary>[{item.id}] {item.tool} � {item.source}</summary><pre className="overflow-auto max-h-80 whitespace-pre-wrap mt-3">{JSON.stringify(item.data, null, 2)}</pre></details>)}
              </motion.div>
            )}
          </div>
        )}

        {/* TAB 3: WAREHOUSE DATABASE SUMMARY */}
        {tab === "database" && (
          <DatabaseView overview={overview} demo={overviewQ.isError} loading={overviewQ.isLoading} onAsk={(q) => void ask(q)} />
        )}

        {/* ── Native AdSense Sponsored Intelligence Vessel ── */}
        <div className="pt-4">
                  </div>
      </div>
    </Layout>
  );
}

/* ─── Answer card ────────────────────────────────────────────────────────── */

function AnswerCard({ entry, onRemoveChip, onAsk }: { entry: Entry; onRemoveChip: (c: Chip) => void; onAsk: (q: string) => void }) {
  const r = entry.response;
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] overflow-hidden">
      <div className="px-4 pt-3 pb-2 flex items-center gap-2 text-xs text-muted-foreground border-b border-white/[0.06]">
        <MessageSquareText className="w-3.5 h-3.5" />
        <span className="truncate">{entry.question}</span>
        {entry.edited && <span className="ml-auto shrink-0 text-[10px] text-violet-300">edited</span>}
        {entry.status === "loading" && <CricFieldMascot activity="analyzing" size={26} className="ml-auto" />}
      </div>

      {entry.status === "loading" && !r && <div className="p-6 text-sm text-muted-foreground"><CricFieldMascot activity="analyzing" size={40} className="mr-3 align-middle" />Querying the database…</div>}

      {entry.demo && (
        <div className="mx-4 mt-3 flex items-start gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>Couldn't reach the stats API ({entry.error}). Showing a saved demo answer for "{MOCK_QUESTION}". Start the api-server to ask live questions.</span>
        </div>
      )}

      {r && !r.understood && (
        <div className="p-4 space-y-3">
          <p className="text-sm">I couldn't map that question to the database yet. Try naming a stat (runs, wickets, strike rate, economy, sixes, wins…) and, optionally, a player, team, season or venue.</p>
          <Notes notes={r.notes} />
          <div className="flex flex-wrap gap-1.5">
            {r.suggestions.map((s) => (
              <button key={s} onClick={() => onAsk(s)} className="px-2.5 py-1 rounded-full text-xs border border-violet-400/30 bg-violet-500/10 text-violet-300 hover:bg-violet-500/20">{s}</button>
            ))}
          </div>
        </div>
      )}

      {r?.understood && <ResultBody result={r.result} notes={r.notes} demo={Boolean(entry.demo)} onRemoveChip={onRemoveChip} />}
      {entry.error && !entry.demo && <div className="px-4 pb-3 text-xs text-red-300">Couldn't re-run that query: {entry.error}</div>}
    </div>
  );
}

function ResultBody({ result, notes, demo, onRemoveChip }: { result: StatResult; notes: string[]; demo: boolean; onRemoveChip: (c: Chip) => void }) {
  const ranked = result.query.sortBy === "metric";
  return (
    <div className="p-4 space-y-3">
      <p className="text-base sm:text-lg font-semibold leading-snug">{result.answer}</p>

      {result.chips.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground mr-1">Read as</span>
          {result.chips.map((chip) => (
            <span key={`${chip.field}:${chip.label}`} className="inline-flex items-center gap-1 pl-2.5 pr-1 py-0.5 rounded-full text-[11px] border border-violet-400/30 bg-violet-500/10 text-violet-300">
              {chip.label}
              {!demo && (
                <button onClick={() => onRemoveChip(chip)} title={`Remove "${chip.label}" and re-run`} aria-label={`Remove ${chip.label}`} className="p-0.5 rounded-full hover:bg-violet-500/25">
                  <X className="w-3 h-3" />
                </button>
              )}
            </span>
          ))}
        </div>
      )}

      <Notes notes={[...notes, ...result.caveats]} />

      {result.rows.length > 0 && (
        <div className="overflow-x-auto -mx-4 px-4">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10 text-[11px] uppercase tracking-wider text-muted-foreground">
                {ranked && <th className="text-left py-2 pr-2 font-semibold w-8">#</th>}
                <th className="text-left py-2 pr-4 font-semibold">{result.query.groupBy === "innings" ? (result.query.perspective === "team_innings" ? "Team" : "Player") : groupLabel(result.query.groupBy)}</th>
                {result.columns.map((col) => (
                  <th key={col.key} className={`py-2 px-2 font-semibold whitespace-nowrap ${col.format === "text" ? "text-left" : "text-right"} ${col.highlight ? "text-violet-300" : ""}`}>{col.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {result.rows.map((row, i) => (
                <tr key={row.key} className="border-b border-white/[0.05] hover:bg-white/[0.03]">
                  {ranked && <td className="py-2 pr-2 font-mono text-xs text-muted-foreground">{i + 1}</td>}
                  <td className="py-2 pr-4">
                    <div className="font-semibold whitespace-nowrap">{row.label}</div>
                    {row.sub && <div className="text-[10px] text-muted-foreground whitespace-nowrap">{row.sub}</div>}
                  </td>
                  {result.columns.map((col) => (
                    <td key={col.key} className={`py-2 px-2 whitespace-nowrap ${col.format === "text" ? "text-left text-xs" : "text-right font-mono"} ${col.highlight ? "text-violet-300 font-semibold" : ""}`}>
                      {formatCell(row.values[col.key], col)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="text-[10px] font-mono text-muted-foreground">
        {result.ms} ms{result.query.groupBy !== "innings" && result.groupsConsidered > result.rows.length ? ` · top ${result.rows.length} of ${result.groupsConsidered.toLocaleString("en-US")} ${groupLabel(result.query.groupBy).toLowerCase()}s` : ""}
        {result.qualification ? ` · ${result.qualification}` : ""}
      </div>
    </div>
  );
}

function Notes({ notes }: { notes: string[] }) {
  if (!notes.length) return null;
  return (
    <div className="space-y-1">
      {notes.map((n) => (
        <div key={n} className="flex items-start gap-1.5 text-[11px] text-amber-200/80">
          <Info className="w-3.5 h-3.5 shrink-0 mt-px text-amber-400" /> {n}
        </div>
      ))}
    </div>
  );
}

function groupLabel(g: StatResult["query"]["groupBy"]): string {
  return { player: "Player", season: "Season", team: "Team", opponent: "Opponent", venue: "Venue", phase: "Phase", innings: "Innings" }[g];
}

function formatCell(v: number | string | null | undefined, col: StatColumn): string {
  if (v === null || v === undefined) return "—";
  if (typeof v === "string") return v;
  if (col.format === "dec1") return v.toFixed(1);
  if (col.format === "dec2") return v.toFixed(2);
  return v.toLocaleString("en-US");
}

/* ─── Historical database ────────────────────────────────────────────────── */

function DatabaseView({ overview, demo, loading, onAsk }: { overview: HistoryOverview; demo: boolean; loading: boolean; onAsk: (q: string) => void }) {
  const c = overview.coverage;
  const tiles = [
    { label: "Seasons", value: `${c.firstSeason}–${c.lastSeason}`, sub: `${c.seasons} editions` },
    { label: "Matches", value: c.matches.toLocaleString("en-US"), sub: "every one ball-by-ball" },
    { label: "Deliveries", value: c.deliveries.toLocaleString("en-US"), sub: "incl. super overs" },
    { label: "Players", value: c.players.toLocaleString("en-US"), sub: "batted or bowled" },
    { label: "Venues", value: c.venues.toLocaleString("en-US"), sub: "renamed grounds merged" },
    { label: "Franchises", value: c.franchises.toLocaleString("en-US"), sub: "renames merged" },
  ];
  const statusIcon = { ok: CheckCircle2, warn: AlertTriangle, info: Info };
  const statusColor = { ok: "text-emerald-400", warn: "text-amber-400", info: "text-sky-400" };

  return (
    <div className="space-y-6">
      {demo && (
        <div className="flex items-start gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" /> Can't reach the API — showing a saved snapshot of the database overview.
        </div>
      )}
      {loading && <div className="text-xs text-muted-foreground flex items-center gap-1.5"><Loader2 className="w-3 h-3 animate-spin" /> Loading live overview…</div>}

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {tiles.map((t) => (
          <div key={t.label} className="rounded-2xl border border-white/10 bg-white/[0.03] p-3">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{t.label}</div>
            <div className="font-display font-black text-lg mt-0.5">{t.value}</div>
            <div className="text-[10px] text-muted-foreground">{t.sub}</div>
          </div>
        ))}
      </div>

      <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
        <div className="flex items-center gap-2 mb-3">
          <Trophy className="w-4 h-4 text-amber-400" />
          <h2 className="font-display font-bold text-sm uppercase tracking-wider">Season by season</h2>
          <span className="text-[11px] text-muted-foreground ml-auto hidden sm:inline">Click a season to ask about it</span>
        </div>
        <div className="overflow-x-auto -mx-4 px-4">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10 text-[11px] uppercase tracking-wider text-muted-foreground">
                {["Season", "Champion", "Runner-up", "M", "Runs", "RR", "Avg 1st inns", "6s", "Orange cap", "Purple cap"].map((h, i) => (
                  <th key={h} className={`py-2 px-2 font-semibold whitespace-nowrap ${i >= 3 && i <= 7 ? "text-right" : "text-left"}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {overview.seasons.map((s) => (
                <tr key={s.season} className="border-b border-white/[0.05] hover:bg-white/[0.04] cursor-pointer" onClick={() => onAsk(`Most runs in IPL ${s.season}`)} title={`Ask: Most runs in IPL ${s.season}`}>
                  <td className="py-2 px-2 font-mono font-semibold">{s.season}</td>
                  <td className="py-2 px-2 whitespace-nowrap text-amber-200">{s.champion ?? "—"}</td>
                  <td className="py-2 px-2 whitespace-nowrap text-muted-foreground">{s.runnerUp ?? "—"}</td>
                  <td className="py-2 px-2 text-right font-mono">{s.matches}</td>
                  <td className="py-2 px-2 text-right font-mono">{s.runs.toLocaleString("en-US")}</td>
                  <td className="py-2 px-2 text-right font-mono">{s.runRate?.toFixed(2) ?? "—"}</td>
                  <td className="py-2 px-2 text-right font-mono">{s.avgFirstInnings?.toFixed(1) ?? "—"}</td>
                  <td className="py-2 px-2 text-right font-mono">{s.sixes.toLocaleString("en-US")}</td>
                  <td className="py-2 px-2 whitespace-nowrap">{s.orangeCap ? <>{s.orangeCap.player} <span className="text-orange-300 font-mono">{s.orangeCap.runs}</span></> : "—"}</td>
                  <td className="py-2 px-2 whitespace-nowrap">{s.purpleCap ? <>{s.purpleCap.player} <span className="text-purple-300 font-mono">{s.purpleCap.wickets}</span></> : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
        <div className="flex items-center gap-2 mb-1">
          <Database className="w-4 h-4 text-violet-300" />
          <h2 className="font-display font-bold text-sm uppercase tracking-wider">Data health</h2>
        </div>
        <p className="text-[11px] text-muted-foreground mb-3">Checked live against the warehouse tables each time the API starts — not a static claim.</p>
        <div className="grid sm:grid-cols-2 gap-2">
          {overview.health.map((h) => {
            const Icon = statusIcon[h.status];
            return (
              <div key={h.id} className="rounded-xl border border-white/[0.07] bg-background/40 p-3">
                <div className="flex items-center gap-2">
                  <Icon className={`w-4 h-4 shrink-0 ${statusColor[h.status]}`} />
                  <span className="font-semibold text-sm">{h.label}</span>
                  <span className={`ml-auto text-xs font-mono ${statusColor[h.status]}`}>{h.value}</span>
                </div>
                <p className="text-[11px] text-muted-foreground mt-1.5 leading-relaxed">{h.detail}</p>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
