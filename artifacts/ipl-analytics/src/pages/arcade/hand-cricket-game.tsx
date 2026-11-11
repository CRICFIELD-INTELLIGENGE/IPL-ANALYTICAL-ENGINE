import { HandGesture } from "@/components/arcade/hand-gesture";
import { useArcadeSoloActive } from "@/lib/arcade/solo-mode";
import { useEffect, useRef, useState } from "react";
import { hand } from "@workspace/arcade-rules";
import { ErrorNote, GameShell, Leaderboard, ResultPanel } from "@/components/arcade/kit";
import { startSession, submitSession, type Session, type Submitted } from "@/lib/arcade/session";
import { play, useReducedMotion } from "@/lib/arcade/feel";
import "./arcade-games.css";

type SeriesMode = "quick" | "best-of-three" | "tournament";


export default function HandCricketGame() {
  const soloActive=useArcadeSoloActive("hand-cricket");
  const [entry, setEntry] = useState<"bat"|"bowl"|null>(null);
  const [starting,setStarting]=useState(false);
  const startingRef=useRef(false), animation=useRef<ReturnType<typeof setTimeout>|null>(null);
  const [seriesMode, setSeriesMode] = useState<SeriesMode>("quick");
  const [personality, setPersonality] = useState<hand.Personality>("rookie");
  const [overs, setOvers] = useState<hand.Overs>(1);
  const [session, setSession] = useState<Session | null>(null);
  const [matchNo, setMatchNo] = useState(0);
  const [toss, setToss] = useState<null | "call" | "won" | "lost">(null);
  const [match, setMatch] = useState<hand.HandMatch | null>(null);
  const [picks, setPicks] = useState<number[]>([]);
  const [shake, setShake] = useState<{ you: number; cpu: number } | null>(null);
  const [series, setSeries] = useState<{ results: ("player" | "computer" | "tie")[]; submitted: Submitted | null | "offline"; over: boolean }>({ results: [], submitted: null, over: false });
  const [error, setError] = useState<string | null>(null);
  const reduced = useReducedMotion();
  const busy = useRef(false);

  const opponent = seriesMode === "tournament" ? hand.TOURNAMENT[matchNo] : personality;

  async function begin() {
    if(startingRef.current)return;startingRef.current=true;setStarting(true);
    setError(null);setShake(null);busy.current=false; setSeries({ results: [], submitted: null, over: false }); setMatchNo(0); setMatch(null); setToss(null);
    try { const created=await startSession("hand-cricket",seriesMode);setSession(created);setPicks([]);setMatch(hand.newHandMatch(`${created.seed}|m0`,seriesMode==="tournament"?hand.TOURNAMENT[0]:personality,overs,entry!=="bowl")); } catch(e){setError((e as Error).message);} finally{startingRef.current=false;setStarting(false);}
  }
  function callToss(call: "odd" | "even") {
    // The toss uses the match seed, so it is fixed before the call is made.
    const coin = (Number.parseInt(session!.seed.replace(/[^0-9a-f]/gi, "").slice(-6) || "1", 16) + matchNo) % 2 === 0 ? "even" : "odd";
    setToss(coin === call ? "won" : "lost");
    play("click");
  }
  function startMatch(batFirst: boolean) {
    setMatch(hand.newHandMatch(`${session!.seed}|m${matchNo}`, opponent, overs, batFirst));
    setPicks([]); setToss(null);
  }
  function throwHand(n: number) {
    if (!soloActive || !match || match.result || busy.current) return;
    busy.current = true;
    const cpu = hand.computerPick(match); // committed from previous balls only
    const next = hand.playHandBall(match, n, cpu);
    setShake({ you: n, cpu });
    play(next.log.at(-1)!.wicket ? "wicket" : "bat");
    animation.current=setTimeout(() => { setMatch(next); setPicks((p) => [...p, n]); busy.current = false; if (next.result) void finishMatch(next, [...picks, n]); }, reduced ? 0 : 380);
  }
  async function finishMatch(m: hand.HandMatch, allPicks: number[]) {
    const results = [...series.results, m.result!.winner];
    let submitted: Submitted | null | "offline" = null;
    let over = seriesMode === "quick" || (seriesMode === "best-of-three" ? results.filter(x=>x==="player").length>=2 || results.filter(x=>x==="computer").length>=2 || results.length>=5 : m.result!.winner!=="player" || results.length>=4);
    try {
      const r = await submitSession(session!, { personality: m.personality, overs: m.overs, batFirst: m.playerBatFirst, picks: allPicks, matchNo });
      submitted = r ?? "offline";
      over = r ? r.seriesOver : seriesMode === "quick" || (seriesMode === "best-of-three" ? results.filter((x) => x === "player").length >= 2 || results.filter((x) => x === "computer").length >= 2 || results.length >= 5 : m.result!.winner !== "player" || results.length >= 4);
    } catch (e) { setError((e as Error).message); submitted = "offline"; }
    setSeries({ results, submitted, over });
  }
  function nextMatch() { setMatchNo((k) => k + 1); setMatch(null);setShake(null); setToss("call"); }
  useEffect(()=>{if(!soloActive&&animation.current){clearTimeout(animation.current);busy.current=false;}return()=>{if(animation.current)clearTimeout(animation.current);};},[soloActive]);
  useEffect(() => {
    const k = (e: KeyboardEvent) => { if(!soloActive || (e.target instanceof HTMLElement&&e.target.closest("input,textarea,select")))return; const n = Number(e.key); if (n >= 1 && n <= 6) throwHand(n); };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  });

  const pb = match ? hand.playerBatting(match) : false;
  const wins = series.results.filter((r) => r === "player").length;
  const sub = series.submitted && series.submitted !== "offline" ? series.submitted : null;
  return (
    <GameShell game="hand-cricket" theme="theme-notebook">
      {!entry ? <section className="hc-entry"><span className="pav-kicker">THE SCHOOLYARD CLASSIC</span><h1>HAND<br />CRICKET</h1><p>Same hands. New rivals.</p><div><button onClick={()=>setEntry("bat")}><span>🏏</span><strong>BAT</strong><small>Set up your match</small></button><button onClick={()=>setEntry("bowl")}><span>🎾</span><strong>BOWL</strong><small>Set up your match</small></button></div></section> : <div className="nbk-page">
        <header className="nbk-head"><span className="nbk-margin">Rough work · Class VII-B</span><h1>Hand Cricket</h1><p>The back-bench classic. Show a number, read your rival, guard your wicket.</p></header>
        {!session && (
          <section className="nbk-card">
            <h2>The rules (copied neatly)</h2>
            <ol className="nbk-rules">
              <li>Both of you show 1 to 6 at the same moment.</li>
              <li>Same number → the batter is OUT. Different → the batter scores the number they showed.</li>
              <li>Innings ends when wickets are gone or overs run out ({overs} over{overs > 1 ? "s" : ""}, {hand.wicketsFor(overs)} wickets).</li>
              <li>Chasing side wins the moment it passes the target. Level at the end = tie.</li>
              <li>Fair play: your rival fixes its number from earlier balls only, before you choose.</li>
            </ol>
            <h3>Mode</h3>
            <div className="pav-modes" role="group" aria-label="Mode">{([["quick", "Quick Match"], ["best-of-three", "Best of Three"], ["tournament", "Schoolyard Tournament"]] as const).map(([m, l]) => <button key={m} type="button" aria-pressed={seriesMode === m} onClick={() => setSeriesMode(m)}>{l}</button>)}</div>
            {seriesMode !== "tournament" ? <><h3>Opponent</h3><div className="nbk-opps">{(Object.keys(hand.PERSONALITIES) as hand.Personality[]).map((p) => <button key={p} type="button" aria-pressed={personality === p} onClick={() => setPersonality(p)}><strong>{hand.PERSONALITIES[p].name}</strong><small>{hand.PERSONALITIES[p].blurb}</small></button>)}</div></> : <p className="nbk-note">Beat all four in order: Rookie → Pattern Reader → Aggressive Challenger → Adaptive Expert.</p>}
            <h3>Overs</h3>
            <div className="pav-modes" role="group" aria-label="Overs">{([1, 2, 5] as const).map((o) => <button key={o} type="button" aria-pressed={overs === o} onClick={() => setOvers(o)}>{o} over{o > 1 ? "s" : ""}</button>)}</div>
            <button type="button" className="nbk-btn" disabled={starting} onClick={() => void begin()}>{starting?"Preparing match":"Start"} →</button>
            <ErrorNote error={error} onRetry={() => void begin()} />
          </section>
        )}
        {session && toss && !series.over && (
          <section className="nbk-card nbk-toss">
            <h2>{seriesMode === "tournament" ? `Round ${matchNo + 1}: vs ${hand.PERSONALITIES[opponent].name}` : `Match ${matchNo + 1} vs ${hand.PERSONALITIES[opponent].name}`}</h2>
            {toss === "call" && <><p>Odd or even?</p><div className="nbk-row"><button type="button" className="nbk-btn" onClick={() => callToss("odd")}>Odd</button><button type="button" className="nbk-btn" onClick={() => callToss("even")}>Even</button></div></>}
            {toss === "won" && <><p>You won the toss!</p><div className="nbk-row"><button type="button" className="nbk-btn" onClick={() => startMatch(true)}>Bat first</button><button type="button" className="nbk-btn" onClick={() => startMatch(false)}>Bowl first</button></div></>}
            {toss === "lost" && <><p>{hand.PERSONALITIES[opponent].name} won the toss and will {opponent === "aggressive" ? "bat" : "bowl"} first.</p><button type="button" className="nbk-btn" onClick={() => startMatch(opponent !== "aggressive")}>Walk out →</button></>}
          </section>
        )}
        {match && (
          <section className="nbk-card nbk-match">
            <div className="nbk-score" aria-live="polite">
              <div><small>{pb ? "You bat" : `${hand.PERSONALITIES[match.personality].name} bats`}</small><strong>{match.runs}/{match.wickets}</strong><span>{Math.floor(match.balls / 6)}.{match.balls % 6} / {match.overs} ov</span></div>
              {match.target ? <div><small>Target</small><strong>{match.target}</strong><span>need {Math.max(0, match.target - match.runs)} off {match.totalBalls - match.balls}</span></div> : <div><small>Innings</small><strong>1st</strong><span>set a target</span></div>}
            </div>
            <div className="nbk-hands" aria-hidden="true">
              <div className={`nbk-hand ${shake && !reduced ? "pop" : ""}`} key={`y${match.log.length}`}><small>You</small><HandGesture value={shake?.you}/><b>{shake?.you ?? ""}</b></div>
              <div className={`nbk-hand ${shake && !reduced ? "pop" : ""}`} key={`c${match.log.length}`}><small>Rival</small><HandGesture value={shake?.cpu}/><b>{shake?.cpu ?? ""}</b></div>
            </div>
            {!match.result && <div className="nbk-numbers" role="group" aria-label="Show a number (keys 1–6)">{[1, 2, 3, 4, 5, 6].map((n) => <button key={n} type="button" onClick={() => throwHand(n)}>{n}</button>)}</div>}
            <ol className="nbk-log">{match.log.slice(-8).map((b, k) => <li key={k} className={b.wicket ? "w" : ""}>{b.innings === 1 ? "1st" : "2nd"} · ball {b.ball}: you {b.player}, rival {b.computer} → {b.wicket ? "OUT!" : `${b.runs} to ${b.playerBatting ? "you" : "rival"}`}</li>)}</ol>
            {match.result && <p className="nbk-result">{match.result.text}</p>}
            {match.result && !series.over && series.results.length > matchNo && <button type="button" className="nbk-btn" onClick={nextMatch}>{seriesMode === "tournament" ? `Next round: ${hand.PERSONALITIES[hand.TOURNAMENT[matchNo + 1]]?.name}` : "Next match"} →</button>}
          </section>
        )}
        {series.over && match?.result && (
          <ResultPanel game="hand-cricket" score={sub?.score ?? (match.result.winner === "player" ? 10 : 0)} outcome={sub ? sub.outcome : null}
            headline={seriesMode === "quick" ? match.result.text : seriesMode === "best-of-three" ? (wins >= 2 ? `Series won ${wins}–${series.results.length - wins}!` : "Series lost.") : wins === 4 ? "Schoolyard Champion!" : `Knocked out in round ${series.results.length}.`}
            lines={series.submitted === "offline" ? ["Played offline: saved in this browser only."] : []}
            share={`Hand Cricket · ${seriesMode} · ${series.results.map((r) => (r === "player" ? "W" : r === "tie" ? "T" : "L")).join("")}`}
            onReplay={() => {setSession(null);setMatch(null);setShake(null);setToss(null);}} replayLabel="New match" />
        )}
      </div>}
      <Leaderboard game="hand-cricket" />
    </GameShell>
  );
}
