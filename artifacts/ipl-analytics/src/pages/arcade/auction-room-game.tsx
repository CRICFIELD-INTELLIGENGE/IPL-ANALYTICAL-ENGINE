import {
  acceptsLiveSnapshot,
  serverClockOffset,
} from "@/lib/arcade/live-snapshot";
import { useEffect, useMemo, useRef, useState } from "react";
import { auction as A } from "@workspace/arcade-rules";
import { GameShell } from "@/components/arcade/kit";
import { api } from "@/lib/arcade/client";
import "./auction-workspace.css";
type Player = {
  id: string;
  name: string;
  team: string | null;
  role: A.Role;
  overseas: boolean;
  country: string | null;
  age: number | null;
  photo: string | null;
  contractCr: number | null;
  marketCr: number;
  marketLow: number;
  marketHigh: number;
  rating: number;
  baseCr: number;
  confidence: string;
  availability: string;
  bowlingType: string;
  phase: {
    powerplay: number | null;
    middle: number | null;
    death: number | null;
  };
  seasons: {
    season: number;
    matches: number;
    batRuns: number;
    batBalls: number;
    wickets: number;
    bowlBalls: number;
    bowlRuns: number;
  }[];
};
type Rules = {
  purse: number;
  slots: number;
  minSlots: number;
  maxOverseas: number;
  seconds: number;
};
type Draft = {
  revision: number;
  solo: boolean;
  reports?: Record<
    string,
    {
      feasible: boolean;
      xi: { id: string; name: string }[];
      battingValue: number;
      bowlingValue: number;
      coverage: { powerplay: number; middle: number; death: number };
      gaps: string[];
    }
  > | null;
  code: string;
  token?: string;
  host: boolean;
  you: string;
  owners: { name: string; team: string; retained: string[]; you: boolean }[];
  rules: Rules;
  state: A.AuctionState | null;
  price: number;
  leader: string | null;
  deadline: number;
  serverNow: number;
  paused: boolean;
  pauseLeft: number;
  bids: { team: string; price: number; at: number }[];
  log: {
    lotId: string;
    winner: string | null;
    priceCr: number;
    bids: { team: string; price: number; at: number }[];
  }[];
  affordable: Record<string, number> | null;
  nominator: string;
  meta: { ratedThrough: number | null; dataCutoff: string | null };
};
const money = (v: number) => `₹${v.toFixed(2)} Cr`;
const LOGO: Record<string, string> = {
  CSK: "csk logo.png",
  MI: "mi logo.jpg",
  RCB: "rcb logo.png",
  KKR: "kkr logo.png",
  SRH: "srh logo.jpg",
  RR: "rr logo.png",
  DC: "dc logo.jpg",
  GT: "gt logo.png",
  LSG: "lsg logo.jpg",
  PBKS: "pbks logo.png",
};
function BidClock({
  deadline,
  paused,
  pauseLeft,
  offset,
}: {
  deadline: number;
  paused: boolean;
  pauseLeft: number;
  offset: number;
}) {
  const [, redraw] = useState(0);
  useEffect(() => {
    if (paused) return;
    const timer = setInterval(() => redraw((value) => value + 1), 200);
    return () => clearInterval(timer);
  }, [paused, deadline]);
  const seconds = Math.max(
    0,
    Math.ceil((paused ? pauseLeft : deadline - Date.now() - offset) / 1000),
  );
  return (
    <div
      className="aw-clock"
      role="timer"
      aria-label={paused ? "Auction paused" : `${seconds} seconds remaining`}
    >
      {paused ? "Pause" : seconds}
      <small>seconds</small>
    </div>
  );
}

export default function AuctionRoomGame() {
  const [draft, setDraft] = useState<Draft | null>(null),
    [token, setToken] = useState(""),
    [pool, setPool] = useState<Player[]>([]),
    [poolLoading, setPoolLoading] = useState(false),
    [entering, setEntering] = useState<"solo" | "create" | "join" | null>(null),
    [name, setName] = useState(""),
    [code, setCode] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [offset, setOffset] = useState(0),
    [query, setQuery] = useState(""),
    [role, setRole] = useState("All"),
    [nation, setNation] = useState("All"),
    [status, setStatus] = useState("All"),
    [tab, setTab] = useState("Pool"),
    [detail, setDetail] = useState("Overview"),
    [watch, setWatch] = useState<string[]>([]),
    [scout, setScout] = useState<string | null>(null),
    [maxBase, setMaxBase] = useState("All"),
    [retentionOpen, setRetentionOpen] = useState(true);

  const generation = useRef(0),
    lock = useRef(false),
    latest = useRef<Draft | null>(null);
  const poolRequest = useRef<Promise<Player[]> | null>(null),
    poolCache = useRef<Player[]>([]);
  function loadPool(): Promise<Player[]> {
    if (poolCache.current.length) return Promise.resolve(poolCache.current);
    if (poolRequest.current) return poolRequest.current;
    setPoolLoading(true);
    poolRequest.current = api<{ players: Player[] }>("/draft/pool", {
      timeoutMs: 30000,
    })
      .then((r) => {
        if (!Array.isArray(r.players) || !r.players.length)
          throw new Error(
            "The player pool is unavailable. Please retry loading players.",
          );
        poolCache.current = r.players;
        setPool(r.players);
        return r.players;
      })
      .finally(() => {
        poolRequest.current = null;
        setPoolLoading(false);
      });
    return poolRequest.current;
  }
  useEffect(() => {
    if (draft?.code) void loadPool().catch((e) => setError(e.message));
  }, [draft?.code]);
  function receive(r: Draft, sentAt: number, epoch: number) {
    if (epoch !== generation.current) return;
    if (
      latest.current?.code === r.code &&
      !acceptsLiveSnapshot(latest.current, r)
    )
      return;
    const changed =
      latest.current?.code !== r.code ||
      latest.current?.revision !== r.revision;
    latest.current = r;
    if (changed) setDraft(r);
    const nextOffset = serverClockOffset(r.serverNow, sentAt, Date.now());
    setOffset((previous) =>
      Math.abs(previous - nextOffset) > 20 ? nextOffset : previous,
    );
  }
  useEffect(() => {
    let alive = true;
    const ctl = new AbortController(),
      epoch = generation.current;
    try {
      const saved = JSON.parse(
        sessionStorage.getItem("cricfield-live-draft") ?? "null",
      );
      if (saved) {
        const sentAt = Date.now();
        setToken(saved.token);
        api<Draft>(
          `/draft/${saved.code}?token=${encodeURIComponent(saved.token)}`,
          { signal: ctl.signal },
        )
          .then((r) => {
            if (alive) receive(r, sentAt, epoch);
          })
          .catch(() => {
            try {
              sessionStorage.removeItem("cricfield-live-draft");
            } catch {}
          });
      }
    } catch {
      /* Storage is optional. */
    }
    return () => {
      alive = false;
      ctl.abort();
    };
  }, []);
  useEffect(() => {
    if (!draft || !token) return;
    let alive = true,
      timer: ReturnType<typeof setTimeout> | undefined;
    const epoch = generation.current,
      ctl = new AbortController();
    const refresh = async () => {
      const sentAt = Date.now();
      try {
        const r = await api<Draft>(
          `/draft/${draft.code}?token=${encodeURIComponent(token)}`,
          { signal: ctl.signal },
        );
        if (alive) receive(r, sentAt, epoch);
      } catch (e) {
        if (alive && (e as Error).name !== "AbortError")
          setError((e as Error).message);
      } finally {
        if (alive) timer = setTimeout(() => void refresh(), 1000);
      }
    };
    void refresh();
    return () => {
      alive = false;
      ctl.abort();
      clearTimeout(timer);
    };
  }, [draft?.code, token]);
  async function enter(kind: "solo" | "create" | "join") {
    if (lock.current) return;
    lock.current = true;
    const epoch = ++generation.current;
    setEntering(kind);
    setBusy(true);
    setError("");
    const sentAt = Date.now();
    try {
      const r = await api<Draft>(
        kind === "join" ? "/draft/join" : "/draft/create",
        {
          body: {
            name: name.trim() || "Cricket fan",
            ...(kind === "join"
              ? { code: code.trim().toUpperCase() }
              : { solo: kind === "solo" }),
          },
        },
      );
      if (epoch !== generation.current) return;
      setToken(r.token!);
      receive(r, sentAt, epoch);
      try {
        sessionStorage.setItem(
          "cricfield-live-draft",
          JSON.stringify({ code: r.code, token: r.token }),
        );
      } catch {}
    } catch (e) {
      if (epoch === generation.current) setError((e as Error).message);
    } finally {
      lock.current = false;
      setBusy(false);
      setEntering(null);
    }
  }
  async function act(type: string, body: Record<string, unknown> = {}) {
    if (!draft || lock.current) return;
    lock.current = true;
    setBusy(true);
    setError("");
    const sentAt = Date.now(),
      epoch = generation.current;
    try {
      if (type === "start") await loadPool();
      const r = await api<Draft>(`/draft/${draft.code}/action`, {
        body: { token, type, ...body },
      });
      receive(r, sentAt, epoch);
    } catch (e) {
      if (epoch === generation.current) setError((e as Error).message);
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  const state = draft?.state,
    me = state?.bidders.find((b) => b.code === draft?.you),
    owner = draft?.owners.find((o) => o.you),
    lot = state && !state.done ? state.lots[state.index] : null;
  const player = pool.find((p) => p.id === (scout ?? lot?.id)) ?? null,
    byId = useMemo(() => new Map(pool.map((p) => [p.id, p])), [pool]);
  const selected = pool.filter((p) => owner?.retained.includes(p.id)),
    retainedCost = selected.reduce((s, p) => s + (p.contractCr ?? 0), 0);
  const safe = me && draft?.affordable ? draft.affordable[me.code] : 0;
  const need =
    player && me && state
      ? Math.max(0, state.config.plan[player.role] - me.roles[player.role])
      : 0;
  const franchiseValue = player ? player.marketCr * (need > 0 ? 1.2 : 0.75) : 0;
  const safeAdvice =
    player &&
    me &&
    state &&
    A.canBid(
      me,
      { ...player, valueCr: player.marketCr },
      state.config,
      player.baseCr,
    )
      ? Math.min(safe, franchiseValue)
      : 0;
  const retainedIds = new Set(draft?.owners.flatMap((o) => o.retained) ?? []);
  const availableIds = new Set(
    state?.lots.slice(state.index + (state.done ? 0 : 1)).map((l) => l.id) ??
      [],
  );
  const resultById = new Map(state?.results.map((r) => [r.lotId, r]) ?? []);
  const filtered = pool.filter(
    (p) =>
      p.name.toLowerCase().includes(query.toLowerCase()) &&
      (role === "All" || p.role === role) &&
      (nation === "All" || p.country === nation) &&
      (maxBase === "All" || p.baseCr <= Number(maxBase)) &&
      (tab !== "Watchlist" || watch.includes(p.id)) &&
      (tab !== "Purchased" || resultById.get(p.id)?.winner === me?.code) &&
      (status === "All" ||
        (status === "Bidding"
          ? lot?.id === p.id
          : status === "Sold"
            ? Boolean(resultById.get(p.id)?.winner)
            : status === "Unsold"
              ? resultById.has(p.id) && !resultById.get(p.id)?.winner
              : availableIds.has(p.id))),
  );
  const summary = (b: A.Bidder) => {
    const ps = b.squad
      .map((id) => byId.get(id))
      .filter((p): p is Player => Boolean(p));
    return {
      rating: ps.length
        ? Math.round(ps.reduce((s, p) => s + p.rating, 0) / ps.length)
        : 0,
      spin: ps.filter((p) => /spin/i.test(p.bowlingType)).length,
      pace: ps.filter((p) => /pace|fast|medium/i.test(p.bowlingType)).length,
      death: ps.filter((p) => p.phase.death != null && p.phase.death > 0)
        .length,
      bat: ps.filter((p) => p.role !== "BOWL").length,
      issues: A.squadValid(state!, b.code).issues,
    };
  };
  return (
    <GameShell game="auction-room" theme="theme-auction aw-page" wide>
      <header className="aw-banner">
        <span>🔨</span>
        <div>
          <small>CRICFIELD · FRANCHISE STRATEGY</small>
          <h1>IPL MEGA AUCTION ROOM</h1>
          <p>Choose. Retain. Bid. Build your legacy.</p>
        </div>
        {draft && (
          <div className="aw-room-code">
            ROOM <strong>{draft.code}</strong>
            <button onClick={() => navigator.clipboard?.writeText(draft.code)}>
              Copy code
            </button>
          </div>
        )}
      </header>
      {error && (
        <div className="aw-error" role="alert">
          {error.replaceAll("_", " ")}
          {pool.length === 0 && (
            <button
              onClick={() => {
                setError("");
                loadPool()
                  .then(() => undefined)
                  .catch((e) => setError(e.message));
              }}
            >
              Retry loading players
            </button>
          )}
        </div>
      )}
      {!draft ? (
        <section className="aw-entry">
          <h2>Your table is waiting.</h2>
          <p>
            Take on nine strategy-driven franchises or bring friends to the same
            live bidding room.
          </p>
          <label>
            Your name
            <input
              value={name}
              maxLength={24}
              onChange={(e) => setName(e.target.value)}
            />
          </label>
          <div className="aw-actions">
            <button disabled={busy} onClick={() => void enter("solo")}>
              {entering === "solo" ? "Preparing bot game..." : "Play vs bots"}
            </button>
            <button disabled={busy} onClick={() => void enter("create")}>
              {entering === "create"
                ? "Creating room..."
                : "Create private room"}
            </button>
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void enter("join");
            }}
          >
            <input
              placeholder="Room code"
              required
              pattern="[A-Fa-f0-9]{8}"
              maxLength={8}
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
            />
            <button disabled={busy}>
              {entering === "join" ? "Joining room..." : "Join room"}
            </button>
          </form>
          <p className="aw-note">
            Snapshot-based fantasy auction. Contract-based retention charges and
            configurable game rules are labelled; these are not official auction
            regulations.
          </p>
        </section>
      ) : !state ? (
        <section className="aw-setup">
          <div className="aw-steps">
            <b>01 Choose</b>
            <b>02 Retain</b>
            <span>03 Auction</span>
            <span>04 Review</span>
          </div>
          <h2>Claim your franchise</h2>
          <div className="aw-franchises">
            {A.FRANCHISES.map((f) => (
              <button
                key={f.code}
                disabled={
                  busy || draft.owners.some((o) => !o.you && o.team === f.code)
                }
                aria-pressed={draft.you === f.code}
                onClick={() => void act("setup", { team: f.code })}
              >
                <img src={`/${LOGO[f.code]}`} alt="" />
                <strong>{f.code}</strong>
                <small>
                  {draft.owners.find((o) => o.team === f.code)?.name ??
                    "Bot franchise"}
                </small>
              </button>
            ))}
          </div>
          <div className="aw-setup-grid">
            <section className="aw-panel">
              <h2>
                Retain your core <small>{selected.length}/6</small>
              </h2>
              <p>
                Retain up to six players from the current snapshot franchise.
                Their recorded contracts are deducted from your game purse.
              </p>
              {poolLoading && (
                <p role="status">
                  Loading player data. You can choose your franchise while it
                  loads.
                </p>
              )}
              <div className="aw-retention-list">
                {pool
                  .filter((p) => p.team === draft.you)
                  .map((p) => (
                    <label key={p.id}>
                      <input
                        type="checkbox"
                        disabled={
                          busy ||
                          p.contractCr == null ||
                          (!owner?.retained.includes(p.id) &&
                            selected.length >= 6)
                        }
                        checked={owner?.retained.includes(p.id) ?? false}
                        onChange={() =>
                          void act("setup", {
                            retained: owner?.retained.includes(p.id)
                              ? owner.retained.filter((id) => id !== p.id)
                              : [...(owner?.retained ?? []), p.id],
                          })
                        }
                      />
                      {p.photo && <img src={p.photo} alt="" />}
                      <span>
                        {p.name}
                        <small>
                          {p.role} · {p.overseas ? "Overseas" : "Indian"}
                        </small>
                      </span>
                      <strong>
                        {p.contractCr == null
                          ? "No contract"
                          : money(p.contractCr)}
                      </strong>
                    </label>
                  ))}
              </div>
            </section>
            <section className="aw-panel">
              <h2>Auction rules</h2>
              <p>
                Data snapshot:{" "}
                {draft.meta.ratedThrough ?? "Loads when the auction starts"}.
                Unsupported auction years are not offered.
              </p>
              {(
                [
                  ["purse", "Starting purse (Cr)", 40, 200],
                  ["slots", "Maximum squad", 11, 25],
                  ["minSlots", "Minimum squad", 11, 25],
                  ["maxOverseas", "Overseas cap", 0, 8],
                ] as const
              ).map(([key, label, min, max]) => (
                <label key={key}>
                  {label}
                  <input
                    type="number"
                    min={min}
                    max={max}
                    disabled={!draft.host || busy}
                    key={draft.rules[key]}
                    defaultValue={draft.rules[key]}
                    onBlur={(e) =>
                      void act("setup", {
                        rules: {
                          ...draft.rules,
                          [key]: Number(e.target.value),
                        },
                      })
                    }
                  />
                </label>
              ))}
              <label>
                Bidding timer
                <select
                  disabled={!draft.host || busy}
                  value={draft.rules.seconds}
                  onChange={(e) =>
                    void act("setup", {
                      rules: {
                        ...draft.rules,
                        seconds: Number(e.target.value),
                      },
                    })
                  }
                >
                  {[15, 20, 25, 30].map((v) => (
                    <option key={v} value={v}>
                      {v} seconds
                    </option>
                  ))}
                </select>
              </label>
              <div className="aw-budget">
                <small>After retentions</small>
                <strong>{money(draft.rules.purse - retainedCost)}</strong>
              </div>
              <p>
                Late bids extend the clock to five seconds. Keep ₹0.30 Cr for
                each remaining minimum slot. Bid ladder: ₹0.10 / ₹0.20 / ₹0.25
                Cr.
              </p>
              <h3>At your table</h3>
              {draft.owners.map((o) => (
                <p key={o.team}>
                  {o.team} · {o.name} · {o.retained.length} retained
                </p>
              ))}
              {draft.host ? (
                <button disabled={busy} onClick={() => void act("start")}>
                  {busy ? "Preparing auction..." : "Start live auction"}
                </button>
              ) : (
                <p>Waiting for the host to start.</p>
              )}
            </section>
          </div>
        </section>
      ) : (
        <>
          <div className="aw-toolbar">
            <span className="aw-live">
              {state.done
                ? "AUCTION COMPLETE"
                : draft.paused
                  ? "PAUSED"
                  : "● LIVE AUCTION"}
            </span>
            <span>
              Lot {Math.min(state.index + 1, state.lots.length)} /{" "}
              {state.lots.length}
            </span>
            <span>
              {draft.owners.length} human · {10 - draft.owners.length} bot
              franchises
            </span>
            {draft.host && !state.done && (
              <>
                <button
                  onClick={() => void act(draft.paused ? "resume" : "pause")}
                >
                  {draft.paused ? "Resume" : "Pause"}
                </button>
                <button
                  onClick={() => {
                    if (
                      window.confirm("End the auction and review the squads?")
                    )
                      void act("finish");
                  }}
                >
                  End & review
                </button>
              </>
            )}
          </div>
          <div className="aw-layout">
            <aside className="aw-panel aw-mine">
              <h2>Your Franchise</h2>
              <div className="aw-team">
                <img src={`/${LOGO[draft.you]}`} alt="" />
                <strong>
                  {A.FRANCHISES.find((f) => f.code === draft.you)?.name}
                </strong>
              </div>
              <div className="aw-budget">
                <small>Purse remaining</small>
                <strong>{money(me?.purseCr ?? 0)}</strong>
              </div>
              <div className="aw-mini-stats">
                <span>
                  Squad{" "}
                  <b>
                    {me?.squad.length}/{draft.rules.slots}
                  </b>
                </span>
                <span>
                  Overseas{" "}
                  <b>
                    {me?.overseas}/{draft.rules.maxOverseas}
                  </b>
                </span>
                <span>
                  Safe max <b>{money(safe)}</b>
                </span>
              </div>
              {me && (
                <div className="aw-strength">
                  <h3>Squad strength</h3>
                  {[
                    ["Batting", summary(me).bat / 7],
                    ["Pace", summary(me).pace / 4],
                    ["Spin", summary(me).spin / 2],
                    ["Death-phase options", summary(me).death / 2],
                  ].map(([label, value]) => (
                    <label key={String(label)}>
                      {label}
                      <meter
                        min={0}
                        max={1}
                        value={Math.min(1, Number(value))}
                      />
                    </label>
                  ))}
                  <small>
                    Composition indicators. Finishing specialization needs
                    stronger role evidence.
                  </small>
                </div>
              )}
              <h3>Squad needs</h3>
              {me &&
                Object.entries(state.config.plan).map(([r, n]) => (
                  <p key={r}>
                    {r}
                    <b>{Math.max(0, n - me.roles[r as A.Role])} open roles</b>
                  </p>
                ))}
              <button
                className="aw-ghost"
                onClick={() => setRetentionOpen(!retentionOpen)}
              >
                Your squad ({me?.squad.length})
              </button>
              {retentionOpen && (
                <div className="aw-squad">
                  {me?.squad.map((id) => (
                    <p key={id}>
                      {byId.get(id)?.name ?? id}
                      <small>
                        {resultById.has(id)
                          ? money(resultById.get(id)!.priceCr)
                          : "Retained"}
                      </small>
                    </p>
                  ))}
                </div>
              )}
            </aside>
            <main className="aw-center">
              <section className="aw-panel aw-player-stage">
                {player ? (
                  <>
                    <div className="aw-player">
                      <div className="aw-photo">
                        {player.photo ? (
                          <img src={player.photo} alt={player.name} />
                        ) : (
                          <span>
                            {player.name
                              .split(" ")
                              .map((n) => n[0])
                              .join("")}
                          </span>
                        )}
                      </div>
                      <div className="aw-player-copy">
                        <span className="aw-note">
                          {scout && scout !== lot?.id
                            ? "SCOUTING PLAYER"
                            : "ON THE PODIUM"}
                        </span>
                        <h2>{player.name}</h2>
                        <p>
                          {player.country ?? "Country unverified"} ·{" "}
                          {player.role} ·{" "}
                          {player.overseas ? "Overseas" : "Indian"}
                        </p>
                        <div className="aw-tabs">
                          {["Overview", "Three-year form", "Phase value"].map(
                            (t) => (
                              <button
                                key={t}
                                aria-pressed={detail === t}
                                onClick={() => setDetail(t)}
                              >
                                {t}
                              </button>
                            ),
                          )}
                        </div>
                        {detail === "Overview" ? (
                          <div className="aw-player-metrics">
                            <div>
                              Scout rating<strong>{player.rating}/100</strong>
                            </div>
                            <div>
                              Model range
                              <strong>
                                {money(player.marketLow)}–
                                {money(player.marketHigh)}
                              </strong>
                            </div>
                            <div>
                              Evidence<strong>{player.confidence}</strong>
                            </div>
                          </div>
                        ) : detail === "Three-year form" ? (
                          <table>
                            <thead>
                              <tr>
                                <th>Season</th>
                                <th>Games</th>
                                <th>Runs</th>
                                <th>Wickets</th>
                              </tr>
                            </thead>
                            <tbody>
                              {player.seasons.map((s) => (
                                <tr key={s.season}>
                                  <td>{s.season}</td>
                                  <td>{s.matches}</td>
                                  <td>{s.batRuns}</td>
                                  <td>{s.wickets}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        ) : (
                          <div className="aw-player-metrics">
                            {Object.entries(player.phase).map(
                              ([phase, value]) => (
                                <div key={phase}>
                                  {phase}
                                  <strong>
                                    {value == null
                                      ? "No evidence"
                                      : value.toFixed(2)}
                                  </strong>
                                </div>
                              ),
                            )}
                            <small>
                              Phase values are snapshot model contributions, not
                              economy rates.
                            </small>
                          </div>
                        )}
                      </div>
                    </div>
                    {lot && !state.done && (
                      <div className="aw-bid-panel">
                        <small>Current bid · {byId.get(lot.id)?.name}</small>
                        <strong>{money(draft.price)}</strong>
                        <BidClock
                          deadline={draft.deadline}
                          paused={draft.paused}
                          pauseLeft={draft.pauseLeft}
                          offset={offset}
                        />
                        <p>Highest bidder: {draft.leader ?? "None"}</p>
                        <button
                          disabled={
                            busy ||
                            draft.paused ||
                            draft.leader === draft.you ||
                            !me ||
                            !A.canBid(
                              me,
                              lot,
                              state.config,
                              draft.leader
                                ? A.nextPrice(draft.price)
                                : lot.baseCr,
                            )
                          }
                          onClick={() =>
                            void act("bid", {
                              expectedLot: lot.id,
                              expectedPrice: draft.price,
                            })
                          }
                        >
                          BID{" "}
                          {money(
                            draft.leader
                              ? A.nextPrice(draft.price)
                              : lot.baseCr,
                          )}
                        </button>
                        <button
                          className="aw-ghost"
                          onClick={() => setScout(null)}
                        >
                          Watch / pass
                        </button>
                      </div>
                    )}
                  </>
                ) : (
                  <h2>Auction finished. Review your squad below.</h2>
                )}
              </section>
              <section className="aw-panel aw-pool">
                <div className="aw-tabs">
                  {["Pool", "Watchlist", "Purchased", "Replay"].map((t) => (
                    <button
                      key={t}
                      aria-pressed={tab === t}
                      onClick={() => setTab(t)}
                    >
                      {t} {t === "Watchlist" ? `(${watch.length})` : ""}
                    </button>
                  ))}
                </div>
                {tab === "Replay" ? (
                  <div className="aw-replay">
                    {draft.log.map((r, i) => (
                      <details key={r.lotId}>
                        <summary>
                          {i + 1}. {byId.get(r.lotId)?.name} ·{" "}
                          {r.winner ?? "Unsold"} · {money(r.priceCr)}
                        </summary>
                        {r.bids.map((b, j) => (
                          <p key={j}>
                            {b.team} · {money(b.price)}
                          </p>
                        ))}
                      </details>
                    ))}
                  </div>
                ) : (
                  <>
                    <div className="aw-filters">
                      <input
                        aria-label="Search pool"
                        placeholder="Search players…"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                      />
                      <select
                        aria-label="Role"
                        value={role}
                        onChange={(e) => setRole(e.target.value)}
                      >
                        {["All", "BAT", "WK", "AR", "BOWL"].map((v) => (
                          <option key={v}>{v}</option>
                        ))}
                      </select>
                      <select
                        aria-label="Country"
                        value={nation}
                        onChange={(e) => setNation(e.target.value)}
                      >
                        <option>All</option>
                        {[
                          ...new Set(
                            pool.map((p) => p.country).filter(Boolean),
                          ),
                        ]
                          .sort()
                          .map((v) => (
                            <option key={v!}>{v}</option>
                          ))}
                      </select>
                      <select
                        aria-label="Maximum base price"
                        value={maxBase}
                        onChange={(e) => setMaxBase(e.target.value)}
                      >
                        <option>All</option>
                        {[0.3, 0.5, 1, 2].map((v) => (
                          <option key={v} value={v}>
                            Base ≤ {v} Cr
                          </option>
                        ))}
                      </select>
                      <select
                        aria-label="Auction status"
                        value={status}
                        onChange={(e) => setStatus(e.target.value)}
                      >
                        {["All", "Available", "Bidding", "Sold", "Unsold"].map(
                          (v) => (
                            <option key={v}>{v}</option>
                          ),
                        )}
                      </select>
                    </div>
                    <small className="aw-note">
                      {filtered.length} players · age and current availability
                      are unverified and excluded from filters.
                    </small>
                    <div className="aw-table-scroll">
                      <table>
                        <thead>
                          <tr>
                            <th>Player</th>
                            <th>Role</th>
                            <th>Country</th>
                            <th>Base</th>
                            <th>Model range</th>
                            <th>Status</th>
                            <th>☆</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filtered.map((p) => (
                            <tr
                              key={p.id}
                              className={lot?.id === p.id ? "active" : ""}
                            >
                              <td>
                                <button
                                  className="aw-player-link"
                                  onClick={() => {
                                    setScout(p.id);
                                    setDetail("Overview");
                                  }}
                                >
                                  {p.photo && (
                                    <img src={p.photo} alt="" loading="lazy" />
                                  )}
                                  {p.name}
                                </button>
                              </td>
                              <td>{p.role}</td>
                              <td>{p.country ?? "—"}</td>
                              <td>{money(p.baseCr)}</td>
                              <td>
                                {money(p.marketLow)}–{money(p.marketHigh)}
                              </td>
                              <td>
                                {lot?.id === p.id
                                  ? "Bidding"
                                  : resultById.has(p.id)
                                    ? (resultById.get(p.id)?.winner ?? "Unsold")
                                    : retainedIds.has(p.id)
                                      ? "Retained"
                                      : "Available"}
                                {!state.done &&
                                  draft.nominator === draft.you &&
                                  !draft.leader &&
                                  !draft.paused &&
                                  state.lots
                                    .slice(state.index + 1)
                                    .some((l) => l.id === p.id) && (
                                    <button
                                      className="aw-ghost"
                                      onClick={() =>
                                        void act("nominate", { lotId: p.id })
                                      }
                                    >
                                      Nominate
                                    </button>
                                  )}
                              </td>
                              <td>
                                <button
                                  aria-label={`Watch ${p.name}`}
                                  aria-pressed={watch.includes(p.id)}
                                  onClick={() =>
                                    setWatch((w) =>
                                      w.includes(p.id)
                                        ? w.filter((id) => id !== p.id)
                                        : [...w, p.id],
                                    )
                                  }
                                >
                                  {watch.includes(p.id) ? "★" : "☆"}
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </>
                )}
              </section>
            </main>
            <aside className="aw-right">
              <section className="aw-panel">
                <h2>Franchises & Purse</h2>
                <table>
                  <thead>
                    <tr>
                      <th>Team</th>
                      <th>Purse</th>
                      <th>Squad</th>
                    </tr>
                  </thead>
                  <tbody>
                    {state.bidders.map((b) => (
                      <tr
                        key={b.code}
                        className={b.code === draft.you ? "active" : ""}
                      >
                        <td>
                          <img
                            className="aw-logo"
                            src={`/${LOGO[b.code]}`}
                            alt=""
                          />
                          {b.code}
                        </td>
                        <td>{money(b.purseCr)}</td>
                        <td>
                          {b.squad.length}/{draft.rules.slots}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </section>
              <section className="aw-panel aw-advisor">
                <h2>CRICFIELD Insight</h2>
                {player && (
                  <>
                    <h3>{player.name}</h3>
                    <div className="aw-player-metrics">
                      <div>
                        Market model<strong>{money(player.marketCr)}</strong>
                      </div>
                      <div>
                        Franchise value<strong>{money(franchiseValue)}</strong>
                      </div>
                      <div>
                        Safe bid ceiling<strong>{money(safeAdvice)}</strong>
                      </div>
                    </div>
                    <p>
                      {need > 0
                        ? `${need} ${player.role} roles remain in your plan.`
                        : "This role is already covered."}{" "}
                      {player.overseas &&
                      me &&
                      me.overseas >= draft.rules.maxOverseas
                        ? "Your overseas quota is full."
                        : ""}
                    </p>
                    <p className="aw-note">
                      Advisor heuristic: market model × role need, capped by
                      your mandatory-slot reserve. This is a game estimate.
                    </p>
                  </>
                )}
                <h3>Bidding history</h3>
                {draft.bids
                  .slice(-8)
                  .reverse()
                  .map((b, i) => (
                    <p key={i}>
                      {b.team}
                      <b>{money(b.price)}</b>
                    </p>
                  ))}
              </section>
            </aside>
          </div>
          {state.done && (
            <section className="aw-panel aw-report">
              <h2>Post-auction report cards</h2>
              <p>
                Ratings summarize snapshot player ratings; phase counts show
                positive model contributions. They are not match-win
                predictions.
              </p>
              <div>
                {state.bidders.map((b) => {
                  const r = summary(b);
                  const spent = draft.rules.purse - b.purseCr;
                  const over = state.results.filter(
                    (x) =>
                      x.winner === b.code &&
                      x.priceCr > (byId.get(x.lotId)?.marketHigh ?? Infinity),
                  );
                  return (
                    <article key={b.code}>
                      <h3>
                        {b.code} <strong>{r.rating}/100</strong>
                      </h3>
                      <p>
                        {b.squad.length} players · {money(spent)} spent
                      </p>
                      <p>
                        Batting options {r.bat} · Pace {r.pace} · Spin {r.spin}{" "}
                        · Positive death-phase value {r.death}
                      </p>
                      <p>{over.length} buys above model upper range</p>
                      <p>
                        {r.issues.length
                          ? r.issues.join(" ")
                          : "Squad meets the configured composition rules."}
                      </p>
                      {draft.reports?.[b.code] && (
                        <>
                          <h4>Optimized playing XI</h4>
                          <p>
                            {draft.reports[b.code].feasible
                              ? draft.reports[b.code].xi
                                  .map((p) => p.name)
                                  .join(", ")
                              : "No feasible XI from this squad."}
                          </p>
                          <p>
                            Batting value{" "}
                            {draft.reports[b.code].battingValue.toFixed(1)} ·
                            Bowling value{" "}
                            {draft.reports[b.code].bowlingValue.toFixed(1)}
                          </p>
                          <p>
                            Phase coverage: PP{" "}
                            {draft.reports[b.code].coverage.powerplay}% · Middle{" "}
                            {draft.reports[b.code].coverage.middle}% · Death{" "}
                            {draft.reports[b.code].coverage.death}%
                          </p>
                          <p>{draft.reports[b.code].gaps.join(" · ")}</p>
                        </>
                      )}
                      <h4>Watchlist targets not in this squad</h4>
                      <p>
                        {watch
                          .filter((id) => !b.squad.includes(id))
                          .map((id) => byId.get(id)?.name)
                          .join(", ") || "None on your watchlist"}
                      </p>
                    </article>
                  );
                })}
              </div>
            </section>
          )}
        </>
      )}
      {draft && (
        <button
          className="aw-exit"
          onClick={() => {
            generation.current++;
            latest.current = null;
            try {
              sessionStorage.removeItem("cricfield-live-draft");
            } catch {}
            setDraft(null);
            setToken("");
            setScout(null);
            setError("");
          }}
        >
          Exit to auction lobby
        </button>
      )}
      <p className="aw-note">
        Data: CRICFIELD canonical registry and intelligence snapshot. All bids
        are simulated. Private rooms recover after refresh or server restart;
        they expire after two hours of inactivity.
      </p>
    </GameShell>
  );
}
