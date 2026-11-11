// Mobile AI — "the press box": a chat over the existing Ask service (/api/ask). Questions are compiled into a typed
// stat query on the server, so every answer is a table from the warehouse with its qualification and caveats.
// The composer sits above the tab bar and keeps working with the on-screen keyboard.
import { useEffect, useRef, useState } from "react";
import { Link } from "wouter";
import { ArrowUp } from "lucide-react";
import { askQuestion, type AskResponse } from "@/lib/ask-api";

const SUGGEST = [
  "Most sixes in the death overs since 2022",
  "Best economy in the powerplay in IPL 2026 (min 30 overs)",
  "Highest strike rate against spin, career",
  "Most wickets for Mumbai Indians",
];
const TOOLS: [string, string][] = [["Weakness map", "/ai-analyst/weakness"], ["Pressure genome", "/ai-analyst/pressure"], ["Playing XI", "/ai-analyst/playing-xi"], ["Strategy sim", "/ai-analyst/strategy-sim"], ["Opposition map", "/ai-analyst/opposition-map"], ["Squad DNA", "/ai-analyst/squad-dna"]];
type Turn = { q: string; a?: AskResponse; error?: string };
const fmt = (v: number | string | null, f: string) => (v == null ? "—" : typeof v === "string" ? v : f === "int" ? Math.round(v).toLocaleString("en-IN") : v.toFixed(f === "dec2" ? 2 : 1));

export default function MobileAi() {
  const [turns, setTurns] = useState<Turn[]>([]);
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  const end = useRef<HTMLDivElement>(null);
  useEffect(() => { end.current?.scrollIntoView({ behavior: "smooth", block: "end" }); }, [turns]);

  async function ask(text: string) {
    const question = text.trim();
    if (!question || busy) return;
    setQ(""); setBusy(true);
    setTurns((t) => [...t, { q: question }]);
    try {
      const a = await askQuestion(question);
      setTurns((t) => t.map((x, i) => (i === t.length - 1 ? { ...x, a } : x)));
    } catch {
      setTurns((t) => t.map((x, i) => (i === t.length - 1 ? { ...x, error: "The analyst could not answer just now. Check your connection and try again." } : x)));
    } finally { setBusy(false); }
  }

  return (
    <div className="ma">
      <div className="ma-log" aria-live="polite">
        {turns.length === 0 && (
          <div className="ma-intro">
            <div className="cfm-kicker">CRICFIELD AI analyst</div>
            <h1>Ask the press box</h1>
            <p className="cfm-small" style={{ fontSize: 14 }}>Plain-English questions become exact queries over every IPL ball. Answers show the qualification used, so you can trust the number.</p>
            <div className="ma-suggest">{SUGGEST.map((s) => <button key={s} type="button" onClick={() => void ask(s)}>{s}</button>)}</div>
            <div className="cfm-kicker" style={{ marginTop: 22 }}>Analyst tools</div>
            <div className="cfm-strip" style={{ marginTop: 8 }}>{TOOLS.map(([l, h]) => <Link key={h} href={h} className="cfm-chip">{l}</Link>)}</div>
          </div>
        )}
        {turns.map((t, i) => (
          <div key={i} style={{ display: "grid", gap: 8 }}>
            <div className="ma-q">{t.q}</div>
            {t.error ? <div className="ma-a" role="alert"><p>{t.error}</p></div> : !t.a ? <div className="ma-a"><div className="cfm-skel" style={{ height: 70 }} /></div> : t.a.understood ? (
              <div className="ma-a">
                <p><strong>{t.a.result.title}</strong></p>
                <p>{t.a.result.answer}</p>
                <ol className="ma-table">
                  {t.a.result.rows.slice(0, 8).map((r, k) => { const res = (t.a as Extract<AskResponse, { understood: true }>).result; const col = res.columns.find((c) => c.highlight) ?? res.columns[0]; return (
                    <li key={r.key}><span className="cfm-num" style={{ color: "var(--m-slate)" }}>{k + 1}</span><span>{r.label}{r.sub && <small className="cfm-small" style={{ display: "block" }}>{r.sub}</small>}</span>{col && <b>{fmt(r.values[col.key] ?? null, col.format)}</b>}</li>
                  ); })}
                </ol>
                {t.a.result.qualification && <p className="cfm-small" style={{ marginTop: 8 }}>{t.a.result.qualification}</p>}
                {t.a.result.caveats.map((c) => <p key={c} className="cfm-small">{c}</p>)}
              </div>
            ) : (
              <div className="ma-a"><p>I couldn't turn that into a stat question{t.a.notes[0] ? `: ${t.a.notes[0]}` : "."}</p>{t.a.suggestions.length > 0 && <div className="ma-suggest">{t.a.suggestions.slice(0, 3).map((s) => <button key={s} type="button" onClick={() => void ask(s)}>{s}</button>)}</div>}</div>
            )}
          </div>
        ))}
        <div ref={end} />
      </div>
      <form className="ma-compose" onSubmit={(e) => { e.preventDefault(); void ask(q); }}>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Ask about any player, team or phase" aria-label="Ask the analyst" enterKeyHint="send" />
        <button type="submit" aria-label="Send question" disabled={busy || !q.trim()}><ArrowUp size={20} /></button>
      </form>
    </div>
  );
}
