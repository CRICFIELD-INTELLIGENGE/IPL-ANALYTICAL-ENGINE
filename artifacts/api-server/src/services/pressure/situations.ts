// Match-situation buckets for the Scout Lab "Under Pressure" section. Pure: the build script
// feeds it the state before each ball, the web app only reads SITUATIONS (ids are row indices).

export interface BallCtx {
  over: number;            // 0-based
  innings: number;         // 1 or 2
  runsBefore: number; legalBefore: number; wktsBefore: number;
  target: number | null;   // innings 2 only
  targetBalls: number;     // legal balls available in the chase (DLS-aware)
  bowlerType: string | null; // pace | spin
  batterHand: string | null; // left | right
  stage: number | null;    // 0 early, 1 mid, 2 late league, 3 knockout
  position: number;        // batter's order of arrival at the crease
}

export const SITUATIONS = [
  { id: "all", group: "All balls", label: "All balls" },
  { id: "powerplay", group: "Phase", label: "Powerplay (1–6)" },
  { id: "middle", group: "Phase", label: "Middle overs (7–15)" },
  { id: "death", group: "Phase", label: "Death overs (16–20)" },
  { id: "clutch", group: "Clutch moment", label: "Last 5 overs of a live chase (needing 6–15 an over, ≤8 down)" },
  { id: "pressure", group: "High pressure", label: "Death overs, chase needing ≥9 an over, or collapse (≥3 down for ≤35)" },
  { id: "setting", group: "Chase scenario", label: "Batting first (setting a target)" },
  { id: "rrr_lt8", group: "Chase scenario", label: "Chasing, required rate under 8" },
  { id: "rrr_8_10", group: "Chase scenario", label: "Chasing, required rate 8–10" },
  { id: "rrr_10_12", group: "Chase scenario", label: "Chasing, required rate 10–12" },
  { id: "rrr_12", group: "Chase scenario", label: "Chasing, required rate 12+" },
  { id: "vs_pace", group: "Kind of bowler", label: "Pace bowling" },
  { id: "vs_spin", group: "Kind of bowler", label: "Spin bowling" },
  { id: "vs_left", group: "Kind of batter", label: "Left-handed batter" },
  { id: "vs_right", group: "Kind of batter", label: "Right-handed batter" },
  { id: "stage_early", group: "League stage", label: "Initial league matches (first third)" },
  { id: "stage_mid", group: "League stage", label: "Middle league matches" },
  { id: "stage_late", group: "League stage", label: "Final league matches (last third)" },
  { id: "stage_ko", group: "League stage", label: "Playoffs and final" },
  { id: "pos_open", group: "Batting position", label: "Openers (1–2)" },
  { id: "pos_3", group: "Batting position", label: "No. 3" },
  { id: "pos_4", group: "Batting position", label: "No. 4" },
  { id: "pos_5", group: "Batting position", label: "No. 5" },
  { id: "pos_6", group: "Batting position", label: "No. 6" },
  { id: "pos_7", group: "Batting position", label: "No. 7" },
  { id: "pos_8", group: "Batting position", label: "No. 8 and below" },
] as const;

const at = (id: (typeof SITUATIONS)[number]["id"]) => SITUATIONS.findIndex(s => s.id === id);

const KO = /final|semi|qualifier|eliminator|play-?off|quarter|challenger|knockout|race to/i;
/** 3 for a knockout stage, null for league/group matches. */
export const stageBucket = (stage: string | null): number | null => (stage && KO.test(stage) ? 3 : null);

/** Every situation index this ball belongs to (always includes 0 = all balls). */
export function situationsOf(b: BallCtx): number[] {
  const out = [0];
  out.push(at(b.over < 6 ? "powerplay" : b.over < 15 ? "middle" : "death"));
  const chase = b.innings === 2 && b.target !== null;
  const ballsLeft = b.targetBalls - b.legalBefore;
  const need = chase ? b.target! - b.runsBefore : 0;
  const rrr = chase && ballsLeft > 0 ? (need / ballsLeft) * 6 : 0;
  if (chase && ballsLeft > 0 && ballsLeft <= 30 && need > 0 && rrr >= 6 && rrr <= 15 && b.wktsBefore <= 8) out.push(at("clutch"));
  if (b.over >= 15 || rrr >= 9 || (b.wktsBefore >= 3 && b.runsBefore <= 35)) out.push(at("pressure"));
  if (b.innings === 1) out.push(at("setting"));
  else if (chase && ballsLeft > 0 && need > 0) out.push(at(rrr < 8 ? "rrr_lt8" : rrr < 10 ? "rrr_8_10" : rrr < 12 ? "rrr_10_12" : "rrr_12"));
  if (b.bowlerType === "pace") out.push(at("vs_pace"));
  if (b.bowlerType === "spin") out.push(at("vs_spin"));
  if (b.batterHand === "left") out.push(at("vs_left"));
  if (b.batterHand === "right") out.push(at("vs_right"));
  if (b.stage !== null) out.push(at((["stage_early", "stage_mid", "stage_late", "stage_ko"] as const)[b.stage]));
  out.push(at(b.position <= 2 ? "pos_open" : b.position >= 8 ? "pos_8" : (`pos_${b.position}` as "pos_3")));
  return out;
}
