import { randomUUID } from "node:crypto";
import {
  cup,
  superOver as SO,
  seeded,
  weighted,
} from "@workspace/arcade-rules";
import * as Rooms from "./rooms";
import * as P from "./puzzles";
import { arcadePlayer } from "./arcade-data";
import { loadLiveState, saveLiveState } from "./live-state-store";

const TTL = 3600000;
const fail = (s: string): never => {
  throw new Error(`bad_request:${s}`);
};
type Seat = {
  token: string;
  name: string;
  score: number;
  wickets: number;
  balls: number;
  hints: number;
  wrong: number;
  done: boolean;
  bot: boolean;
  move: number;
  guessed: string[];
};
type Mystery = {
  playerId: string;
  name: string;
  clues: { label: string; text: string }[];
  portrait: string | null;
};
type Match = {
  game: string;
  seed: string;
  seats: Seat[];
  turn: number;
  innings: number;
  round: number;
  hands: Record<string, number | string>;
  grid: ReturnType<typeof P.makeGrid> | null;
  mystery: Mystery | null;
  filled: ({ id: string; name: string; seat: number } | null)[];
  used: string[];
  log: string[];
  done: boolean;
  winner: number | null;
  nextBot: number;
  releaseAt: number;
  delivery: cup.CupDelivery | null;
  created: number;
  lastMove: number;
  revision: number;
  endReason: string | null;
  lastHands: { values: number[]; round: number } | null;
  lastOutcome: { runs: number; wicket: boolean } | null;
};
const matches = new Map<string, Match>();
function save(code: string, m: Match) {
  m.revision++;
  saveLiveState("match", code, m, m.created + TTL);
}
function create(
  game: string,
  seats: { token: string; name: string; bot?: boolean }[],
  seed: string,
): Match {
  const puzzle =
    game === "guess-cricketer" ? P.guessPuzzle(seed, "practice") : null;
  return {
    game,
    seed,
    seats: seats.map((s) => ({
      ...s,
      score: 0,
      wickets: 0,
      balls: 0,
      hints: 1,
      wrong: 0,
      done: false,
      bot: s.bot ?? false,
      move: 0,
      guessed: [],
    })),
    turn: 0,
    innings: 0,
    round: 0,
    hands: {},
    grid: game === "cricket-grid" ? P.makeGrid(seed, 1) : null,
    mystery: puzzle
      ? {
          playerId: puzzle.player.id,
          name: puzzle.player.name,
          clues: puzzle.clues,
          portrait: P.mysteryPortrait(seed, "practice"),
        }
      : null,
    filled: Array(9).fill(null),
    used: [],
    log: [],
    done: false,
    winner: null,
    nextBot: Date.now() + (game === "cricket-grid" ? 4000 : 10000),
    releaseAt: 0,
    delivery: null,
    created: Date.now(),
    lastMove: Date.now(),
    revision: 0,
    endReason: null,
    lastHands: null,
    lastOutcome: null,
  };
}
function get(code: string, token: string) {
  let m = matches.get(code) ?? loadLiveState<Match>("match", code);
  if (!m) {
    const r = Rooms.member(code, token);
    if (!r.started) fail("room_not_started");
    if (r.members.length !== 2) fail("two_players_required");
    m = create(r.game, r.members, r.seed);
    save(code, m);
  }
  if (!m.seats.some((s) => s.token === token) || Date.now() - m.created > TTL)
    fail("match_expired");
  matches.set(code, m);
  return m;
}
export function bot(game: string, name: string) {
  if (!["cricket-grid", "guess-cricketer"].includes(game))
    fail("unsupported_bot_game");
  for (const [k, m] of matches)
    if (Date.now() - m.created > TTL) matches.delete(k);
  if (matches.size >= 1000) fail("matches_busy");
  const code = randomUUID(),
    token = randomUUID();
  const m = create(
    game,
    [
      { token, name: name.trim().slice(0, 24) || "You" },
      { token: randomUUID(), name: "CRICFIELD Bot", bot: true },
    ],
    randomUUID(),
  );
  matches.set(code, m);
  save(code, m);
  return { code, token, ...view(m, token) };
}
function conclude(m: Match) {
  m.done = true;
  m.seats.forEach((s) => {
    s.done = true;
  });
  const [a, b] = m.seats;
  m.winner = a.score === b.score ? null : a.score > b.score ? 0 : 1;
}
function nextInnings(m: Match) {
  const s = m.seats[m.innings];
  if (
    s.balls >= 6 ||
    s.wickets >= 2 ||
    (m.innings === 1 && s.score > m.seats[0].score)
  ) {
    s.done = true;
    if (m.innings === 0) {
      m.innings = 1;
      m.hands = {};
      m.log.push("Innings break. The chase begins.");
    } else conclude(m);
  }
}
function gridGuess(m: Match, seat: number, cell: number, id: string) {
  if (!m.grid || m.filled[cell] || m.used.includes(id))
    fail("cell_or_player_used");
  const correct = P.gradeGridCell(m.grid!, cell, id);
  m.seats[seat].balls++;
  if (correct) {
    const p = arcadePlayer(id)!;
    m.filled[cell] = { id, name: p.name, seat };
    m.used.push(id);
    m.seats[seat].score++;
  }
  m.log.push(
    `${m.seats[seat].name}: ${correct ? "correct grid answer" : "incorrect answer"}`,
  );
  m.round++;
  m.turn = 1 - seat;
  m.nextBot = Date.now() + 4000;
  if (m.filled.every(Boolean) || m.seats.reduce((s, x) => s + x.balls, 0) >= 18)
    conclude(m);
}
function mysteryGuess(m: Match, seat: number, id: string) {
  const s = m.seats[seat];
  if (!arcadePlayer(id)) fail("unknown_player");
  if (s.guessed.includes(id)) fail("player_already_guessed");
  s.guessed.push(id);
  if (id === m.mystery!.playerId) {
    s.score = P.guessScore(s.hints, s.wrong);
    s.done = true;
    m.log.push(`${s.name} solved the mystery.`);
  } else {
    s.wrong++;
    if (s.wrong >= 5) {
      s.done = true;
      m.log.push(`${s.name} used all five guesses.`);
    }
  }
  if (m.seats.every((s) => s.done)) conclude(m);
}
function tick(m: Match): boolean {
  if (m.done) return false;
  const now = Date.now();
  if (now - m.lastMove > 120000) {
    m.endReason = "Match ended after two minutes without a move.";
    if (m.game === "guess-cricketer") conclude(m);
    else {
      const committed = m.seats
        .map((s, i) => (m.hands[s.token] != null ? i : -1))
        .filter((i) => i >= 0);
      m.done = true;
      m.winner =
        committed.length === 1
          ? committed[0]
          : m.game === "cricket-grid"
            ? 1 - m.turn
            : m.game === "cup-chase"
              ? m.delivery
                ? 1 - m.innings
                : m.innings
              : null;
      m.seats.forEach((s) => {
        s.done = true;
      });
    }
    m.log.push(m.endReason);
    return true;
  }
  let changed = false;
  if (
    m.game === "cup-chase" &&
    m.delivery &&
    now > m.releaseAt + m.delivery.travelMs + 1000
  ) {
    cupSwing(m, null);
    m.lastMove = now;
    changed = true;
  }
  const bi = m.seats.findIndex((s) => s.bot && !s.done);
  if (bi < 0 || m.done || now < m.nextBot) return changed;
  if (m.game === "cricket-grid" && m.turn === bi) {
    m.nextBot = now + 4000;
    const cells = m.filled
      .map((v, i) => (v ? null : i))
      .filter((i): i is number => i !== null);
    const rng = seeded(`${m.seed}|bot|${m.seats[bi].balls}`),
      cell = cells[Math.floor(rng() * cells.length)];
    const answers = P.cellAnswers(
      m.grid!.rows[Math.floor(cell / 3)].key,
      m.grid!.cols[cell % 3].key,
    ).filter((p) => !m.used.includes(p.id));
    if (answers.length && rng() > 0.25)
      gridGuess(m, bi, cell, answers[Math.floor(rng() * answers.length)].id);
    else {
      m.seats[bi].balls++;
      m.round++;
      m.turn = 0;
      m.log.push("Bot misses this grid turn.");
      if (m.seats.reduce((s, x) => s + x.balls, 0) >= 18) conclude(m);
    }
    m.lastMove = now;
    changed = true;
  }
  if (m.game === "guess-cricketer") {
    const bot = m.seats[bi];
    bot.hints = Math.min(5, bot.hints + 1);
    m.nextBot = now + 10000;
    const candidates = P.mysteryCandidates(
      m.mystery!.clues.slice(0, bot.hints),
    ).filter((id) => !bot.guessed.includes(id));
    if (bot.hints >= 3 && candidates.length) {
      const rng = seeded(`${m.seed}|mystery-bot|${bot.hints}`);
      mysteryGuess(m, bi, candidates[Math.floor(rng() * candidates.length)]);
    }
    changed = true;
  }
  return changed;
}
function cupSwing(m: Match, swingMs: number | null, aim: cup.Aim = "straight") {
  if (!m.delivery) return;
  const s = m.seats[m.innings],
    o = cup.judgeCupBall(m.delivery, { swingMs, aim, loft: true }, "easy");
  m.lastOutcome = { runs: o.runs, wicket: o.wicket };
  s.score += o.runs;
  s.wickets += Number(o.wicket);
  s.balls++;
  m.log.push(`${s.name}: ${o.label}`);
  m.delivery = null;
  m.round++;
  nextInnings(m);
}
export function read(code: string, token: string) {
  const m = get(code, token);
  if (tick(m)) save(code, m);
  return view(m, token);
}
type Move = {
  type: string;
  value?: number | string;
  playerId?: string;
  cell?: number;
  round?: number;
  move?: number;
  aim?: cup.Aim;
  swingMs?: number;
};
export function action(code: string, token: string, b: Move) {
  const m = get(code, token);
  if (tick(m)) save(code, m);
  if (m.done) fail("match_finished");
  const seat = m.seats.findIndex((s) => s.token === token),
    you = m.seats[seat];
  if (b.move != null && b.move !== you.move) fail("move_changed_retry");
  if (b.type === "forfeit") {
    m.done = true;
    m.winner = 1 - seat;
    m.endReason = `${you.name} forfeited.`;
    m.log.push(m.endReason);
    m.seats.forEach((s) => {
      s.done = true;
    });
  } else if (m.game === "cricket-grid") {
    if (seat !== m.turn) fail("wait_your_turn");
    if (b.round != null && b.round !== m.round) fail("round_changed");
    if (
      b.type !== "guess" ||
      !Number.isInteger(b.cell) ||
      b.cell! < 0 ||
      b.cell! > 8 ||
      !b.playerId
    )
      fail("invalid_grid_move");
    gridGuess(m, seat, b.cell!, b.playerId!);
  } else if (m.game === "guess-cricketer") {
    if (you.done) fail("your_round_finished");
    if (b.type === "hint") {
      if (you.hints >= 5) fail("all_hints_revealed");
      you.hints++;
    } else if (b.type === "guess" && b.playerId)
      mysteryGuess(m, seat, b.playerId);
    else fail("invalid_move");
  } else if (m.game === "hand-cricket") {
    if (b.round !== m.round) fail("round_changed");
    if (
      b.type !== "hand" ||
      typeof b.value !== "number" ||
      !Number.isInteger(b.value) ||
      b.value < 1 ||
      b.value > 6
    )
      fail("invalid_hand");
    if (m.hands[token] != null) fail("already_committed");
    m.hands[token] = b.value!;
    if (m.seats.every((s) => m.hands[s.token] != null)) {
      const bat = m.seats[m.innings],
        batNum = Number(m.hands[bat.token]),
        bowlNum = Number(m.hands[m.seats[1 - m.innings].token]);
      m.lastHands = {
        values: m.seats.map((s) => Number(m.hands[s.token])),
        round: m.round,
      };
      m.lastOutcome = {
        runs: batNum === bowlNum ? 0 : batNum,
        wicket: batNum === bowlNum,
      };
      bat.balls++;
      if (batNum === bowlNum) bat.wickets++;
      else bat.score += batNum;
      m.log.push(
        `${bat.name}: ${batNum === bowlNum ? "OUT" : `${batNum} runs`}`,
      );
      m.hands = {};
      m.round++;
      nextInnings(m);
    }
  } else if (m.game === "super-over") {
    if (b.round !== m.round) fail("round_changed");
    if (m.hands[token] != null) fail("already_committed");
    if (seat === m.innings) {
      if (b.type !== "shot" || !Object.hasOwn(SO.SHOTS, String(b.value)))
        fail("choose_shot");
    } else if (
      b.type !== "delivery" ||
      !Object.hasOwn(SO.DELIVERIES, String(b.value))
    )
      fail("choose_delivery");
    m.hands[token] = String(b.value);
    if (m.seats.every((s) => m.hands[s.token] != null)) {
      const bat = m.seats[m.innings],
        shot = m.hands[bat.token] as SO.Shot,
        delivery = m.hands[m.seats[1 - m.innings].token] as SO.Delivery;
      const rng = seeded(`${m.seed}|${m.round}`),
        i = weighted(rng, SO.shotOdds(delivery, "balanced", shot)),
        runs = [0, 1, 2, 4, 6, 0][i];
      m.lastOutcome = { runs, wicket: i === 5 };
      bat.balls++;
      bat.score += runs;
      bat.wickets += Number(i === 5);
      m.log.push(
        `${bat.name}: ${i === 5 ? "OUT" : runs + " runs"} (${SO.DELIVERIES[delivery].name})`,
      );
      m.hands = {};
      m.round++;
      nextInnings(m);
    }
  } else if (m.game === "cup-chase") {
    if (b.round !== m.round) fail("round_changed");
    if (b.type === "bowl") {
      if (seat === m.innings) fail("bowler_only");
      if (m.delivery) fail("ball_in_flight");
      m.delivery = cup.cupDelivery(
        `${m.seed}|${m.innings}`,
        "easy",
        0,
        m.seats[m.innings].balls,
      );
      m.releaseAt = Date.now() + 2000;
    } else if (b.type === "swing") {
      if (seat !== m.innings) fail("batter_only");
      if (!m.delivery || Date.now() < m.releaseAt) fail("ball_not_released");
      const elapsed = Date.now() - m.releaseAt;
      // Bounded client-clock compensation: reject invented timestamps and stale balls.
      const swing = b.swingMs ?? elapsed;
      if (
        !Number.isFinite(swing) ||
        swing < 0 ||
        swing > elapsed + 30 ||
        elapsed - swing > 200
      )
        fail("swing_timing_out_of_range");
      cupSwing(m, swing, b.aim ?? "straight");
    } else fail("invalid_move");
  } else fail("unsupported_game");
  you.move++;
  m.lastMove = Date.now();
  save(code, m);
  return view(m, token);
}
function view(m: Match, token: string) {
  const seat = m.seats.findIndex((s) => s.token === token),
    you = m.seats[seat],
    revealed = m.done || (you.done && you.score > 0);
  return {
    lastHands: m.lastHands ?? null,
    lastOutcome: m.lastOutcome ?? null,
    revision: m.revision,
    game: m.game,
    you: seat,
    move: you.move,
    seats: m.seats.map((s) => ({
      name: s.name,
      score: s.score,
      wickets: s.wickets,
      balls: s.balls,
      done: s.done,
      bot: s.bot,
    })),
    turn: m.turn,
    innings: m.innings,
    round: m.round,
    committed: m.hands[token] != null,
    opponentCommitted: m.hands[m.seats[1 - seat].token] != null,
    grid: m.grid ? { rows: m.grid.rows, cols: m.grid.cols } : null,
    filled: m.filled,
    used: m.used,
    log: m.log.slice(-12),
    done: m.done,
    winner: m.winner,
    endReason: m.endReason,
    clues: m.mystery?.clues.slice(0, you.hints),
    photoUrl: m.mystery?.portrait ?? null,
    answer: revealed ? (m.mystery?.name ?? null) : null,
    revealed,
    hints: you.hints,
    wrong: you.wrong,
    guessed: you.guessed,
    delivery: m.delivery,
    releaseAt: m.releaseAt,
    serverNow: Date.now(),
  };
}
const matchClock = setInterval(() => {
  for (const [code, match] of matches) {
    if (Date.now() - match.created > TTL) {
      matches.delete(code);
      continue;
    }
    try {
      if (tick(match)) save(code, match);
    } catch (error) {
      console.error("Arcade match timer failed", error);
    }
  }
}, 500);
matchClock.unref();
