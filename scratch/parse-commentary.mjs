// Turns ESPN ball-by-ball commentary prose into structured delivery fields.
//
// This is what replaces the synthetic delivery_type / scoring_area columns:
// those are generated from (over*6 + ball) % 12, so every bowler bowls the same
// thing on the same ball of the innings. Here the length, line, variation, shot,
// contact and the area the ball actually went are read from what the
// commentator wrote.
//
// Three rules govern the whole file:
//   1. ORDER. "short of a length" must be tested before "short", "full toss"
//      before "full", "back of a length" before "length ball". Getting this
//      wrong quietly mislabels thousands of balls.
//   2. SILENCE BEATS GUESSING. A ball whose text says nothing about length
//      returns null for length. Coverage is measured and reported rather than
//      padded out to look complete.
//   3. EVERY RULE EARNED ITS PLACE. The vocabulary here was counted against the
//      corpus first (scratch/probe.mjs) — nothing is in this file because
//      cricket writing is assumed to use it.

import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const [, , IN_DIR, OUT_FILE, mode] = process.argv;

/** Most specific first — the first match wins. */
const LENGTH_RULES = [
  ["Full toss", /\bfull[- ]toss|beamer\b/i],
  ["Yorker", /\byorker|blockhole|block hole\b/i],
  ["Half-volley", /\bhalf[- ]volley\b/i],
  // "holds back the length" is the 2008-era way of saying back of a length; the
  // early seasons' commentary is narrative rather than technical and needs its
  // own phrasings, or those years silently score half the coverage of the rest.
  ["Short of a length", /\bshort of (a )?(good )?length|back of (a )?length|banged in short of|hold(s|ing)? back the length\b/i],
  ["Bouncer", /\bbouncer|bumper|head[- ]high|throat ball\b/i],
  // "dragged down" and a bare "shorter one" are how short balls are described
  // as often as the textbook phrasings.
  ["Short", /\bshort (ball|delivery|and|again|one|outside|on|to|from|of)\b|\bshorter (one|ball|delivery|and)\b|\bbangs? (it )?in\b|\bpitched short\b|\bdrags? (it )?(down|short)\b|\bdragged down\b|\bbang(s|ed)? (it |in )?short\b|\bbowled short\b|\blong hop\b|\bhalf.?tracker\b|\btoo short\b|\bdrops? short\b|\bdropped short\b|\bshort length\b/i],
  ["Good length", /\bgood length|on a length\b/i],
  ["Full", /\bfull (ball|delivery|length|and|outside|on|again|toss)?\b|\bpitched up|overpitched|fuller\b/i],
  // A bare "length" with a following preposition ("length outside off",
  // "length at the stumps") is a length ball even without the noun.
  //
  // The negative lookbehind matters: "picks THE length and pulls" is the batter
  // reading a ball that was short, not a description of a length ball. Without
  // it this rule quietly relabels short balls.
  ["Length ball", /\b(?<!the )length (ball|delivery|at|on|outside|to|from|and|around|across)\b|\blength,|\ba length\b/i],
];

/**
 * Down leg is tested before the off-side rules so that "wide down the leg side"
 * is not swallowed by the wide rule.
 */
const LINE_RULES = [
  ["Down leg", /\bdown (the )?leg|outside leg|leg[- ]side wide|way down leg|wide down leg\b/i],
  ["Wide outside off", /\bwide (outside )?off|way outside off|wide of off|(full|length|short|good length) and wide\b|\bwidth\b|\bgive[sn]? (him|her) room\b/i],
  // "the channel" and "the corridor" are both named for the area outside off,
  // and "angled/speared across off" describes the same line by its movement.
  ["Outside off", /\boutside off|outside the off|fourth stump|fifth stump\b|\bin the channel\b|\bcorridor\b|\bacross (the )?off\b|\bangl(es|ed|ing) (it )?across\b|\bspeared across\b/i],
  ["On the stumps", /\bat the stumps|on the stumps|middle stump|on middle|at middle|off and middle|middle and leg|straight at\b|\b(full|short|length|quick|fast|flat|angled) and straight\b|\btoo straight\b/i],
  ["On leg stump", /\bleg stump|on (the )?leg\b|\bat leg\b|\bon the pads|at the pads|on his pads|thigh pad|into the pads?|onto the pads?|\b(down|into|onto) (the |his |her |[A-Za-z]+.s )?pads?\b|\bstrays? (onto|down|into)\b/i],
  ["Into the body", /\binto the (body|ribs)\b|\bat the body\b|\bcramp(s|ed|ing)? (him|the batter|him up)\b|\bcramped for room\b/i],
  ["On off stump", /\boff stump\b|\bon off\b|\bat off\b|\bon the off\b/i],
];

/**
 * What the bowler did with the ball — the honest replacement for the
 * (over*6 + ball) % 12 "delivery type" column. Spin and seam variations are
 * kept in one list because the commentary names them the same way.
 */
const VARIATION_RULES = [
  ["Knuckle ball", /\bknuckle\b/i],
  ["Off-cutter", /\boff[- ]?cutter/i],
  ["Leg-cutter", /\bleg[- ]?cutter/i],
  ["Slower ball", /\bslower (ball|one|delivery|bouncer)\b|\btakes? the pace off\b/i],
  ["Doosra", /\bdoosra/i],
  ["Carrom ball", /\bcarr?om ball\b/i],
  ["Googly", /\bgoogly|wrong[- ]?un\b/i],
  ["Top-spinner", /\btop[- ]?spinn?er/i],
  ["Slider", /\bslider\b/i],
  ["Flipper", /\bflipper\b/i],
  ["Arm ball", /\barm ball\b/i],
  ["Off-break", /\boff[- ]?break|off[- ]?spinn?(er|ing delivery)\b/i],
  ["Leg-break", /\bleg[- ]?break|leg[- ]?spinn?(er|ing delivery)\b/i],
  ["In-swinger", /\bin[- ]?swing|swinging in\b|\bnips? back|comes? back in(to)?\b|\bseam(s|ed|ing)? back\b/i],
  ["Out-swinger", /\bout[- ]?swing|swinging away\b|\bseam(s|ed|ing)? away|shapes? away|holds? its line\b/i],
  ["Bouncer", /\bbouncer|bumper\b/i],
  ["Flighted", /\bflight(ed)?\b|\btossed up\b|\bloop(s|ed|ing)?\b|\bgives? it (some )?air\b/i],
  ["Flat / fired in", /\bflat(ter)? (delivery|ball|and|one|through)\b|\bpushed through\b|\bfires? (it )?in\b|\bfired (it )?in\b|\bdart(s|ed)?\b|\bskiddy\b/i],
];

const SHOT_RULES = [
  ["Reverse sweep", /\breverse[- ]swe|reverse[- ]lap\b/i],
  ["Slog sweep", /\bslog[- ]swe\b/i],
  ["Sweep", /\bswee?ps?\b|\bswept\b/i],
  ["Scoop / ramp", /\bscoop|ramp|paddle\b/i],
  ["Slog", /\bslogs?\b|\bslogged\b|\bheaves?\b|\bheaved\b/i],
  ["Loft", /\bloft/i],
  ["Pull", /\bpulls?\b|\bpulled\b|\bhooks?\b|\bhooked\b/i],
  ["Cut", /\bcuts?\b|\bcut away\b|\bslashe?[sd]?\b/i],
  ["Drive", /\bdriv|\bpunche?[sd]?\b/i],
  ["Flick", /\bflick|\bclip(s|ped)?\b|\bwhip(s|ped)?\b/i],
  // A slap/smash and a "muscle"/"launch" are the same intent: hit hard, not
  // over the top in the way a loft is.
  ["Slap / smash", /\bslap(s|ped)?\b|\bsmash|\bthump|\bcarve[sd]?\b|\bmow(s|ed)?\b|\bwhack|\bmuscle[sd]?\b|\blaunche?[sd]?\b|\bbiffs?\b/i],
  ["Tuck", /\btuck(s|ed)?\b/i],
  ["Glance", /\bglance[sd]?\b|\bnudge[sd]?\b|\btickle[sd]?\b/i],
  ["Dab / steer", /\bdab(s|bed)?\b|\bsteer(s|ed)?\b|\bruns? it (down|to)\b|\brun down to\b|\brunning it down\b|\bhelped down to\b/i],
  ["Guide", /\bguide[sd]?\b|\bopens the face\b/i],
  ["Work", /\bwork(s|ed)?\b/i],
  // "pushed through" belongs to the bowler, not the batter.
  ["Push", /\bpush(es|ed)?\b(?! through)/i],
  ["Poke / prod", /\bpokes?\b|\bpoked\b|\bprods?\b|\bprodded\b|\bjabs?\b|\bfend(s|ed)?\b/i],
  ["Defend", /\bdefen[cd]|\bblocke?[sd]?\b|\bsolid in defence\b|\bdead bat\b/i],
  ["Leave", /\bleaves? it\b|\bshoulders arms\b/i],
];

/**
 * How bat met ball. This is contact quality, not a stroke, so it is its own
 * field — an edge is something that happened to a drive, not an alternative
 * to one.
 */
const CONTACT_RULES = [
  ["Top edge", /\btop[- ]edge/i],
  ["Inside edge", /\binside[- ]edge/i],
  ["Outside edge", /\boutside[- ]edge|\bthick edge|\bfaint edge|\bnicks? (it|off)\b|\bnicked\b/i],
  ["Edge", /\bedge[sd]?\b|\bedging\b|\bfeather\b/i],
  ["Beaten", /\bbeaten\b|\bbeats? (the|him|the outside)\b|\bplay(s|ed) and misse[sd]\b|\bthrough the gate\b|\bmisse[sd] it\b|\bswing and a miss\b/i],
  ["Off the pad", /\b(hits?|raps?|thuds?|strikes?) (him )?(on|into) the (pad|thigh|glove|body)|\boff the (pad|thigh pad|body)\b|\bpad(s|ded) it away\b/i],
  ["Middled", /\bmiddle[sd] it\b|\bout of the middle\b|\bmeat of the bat\b|\bsweet(ly)? (timed|struck)\b/i],
];

/**
 * Where the ball went. Only counted when a direction word introduces the
 * position ("to cover", "past point", "over long-on") — a bare mention like
 * "the man at cover walks in" describes a field setting, not a scoring area.
 */
const ZONE_NAMES = [
  ["Third man", /third man|\bshort third\b/i],
  ["Fine leg", /fine leg|short fine/i],
  ["Cow corner", /cow corner/i],
  ["Deep midwicket", /deep mid.?wicket/i],
  ["Midwicket", /mid.?wicket/i],
  ["Deep square leg", /deep square/i],
  ["Square leg", /square leg/i],
  ["Long-on", /long.on/i],
  ["Long-off", /long.off/i],
  ["Deep cover", /deep (extra )?cover|sweeper( cover)?|off.side sweeper/i],
  ["Extra cover", /extra cover/i],
  ["Cover", /\bcovers?\b/i],
  ["Deep point", /deep point/i],
  ["Point", /\bpoint\b/i],
  ["Mid-off", /mid.off/i],
  ["Mid-on", /mid.on/i],
  ["Gully", /\bgully\b/i],
  ["Slip", /\bslips?\b/i],
  ["Keeper", /\b(wicket.?)?keeper\b/i],
  ["Straight", /(straight )?down the ground|over the bowler|straight back past|back over (the bowler|his head)/i],
  ["Behind square", /behind square|square of the wicket/i],
  ["Leg side", /to the leg side/i],
  ["Off side", /to the off side/i],
];

const DIRECTION = /\b(to|past|through|over|behind|towards?|into|down to|wide of|beats?|finds?|in the air to|hits? it to|square of|in front of|placed|pierces|splits|along the ground)\b/i;

/** "cover dives", "long-on fields it" — the fielder is named before the verb. */
const FIELDER_ACT = /\b(fields?|fielded|cuts? it off|dives?|chases?|picks? it up|misfield|throws?|slides?|collects?)\b/i;

const first = (rules, text) => {
  for (const [label, re] of rules) if (re.test(text)) return label;
  return null;
};

function parseZone(text) {
  // Look only at clauses that follow a direction word, so field-setting
  // chatter is not mistaken for where the ball travelled.
  const parts = text.split(/[.;!?]/);
  for (const part of parts) {
    const m = DIRECTION.exec(part);
    if (!m) continue;
    const after = part.slice(m.index);
    for (const [label, re] of ZONE_NAMES) if (re.test(after)) return label;
  }
  // Second chance: a fielder named ahead of what they did with it.
  for (const part of parts) {
    const m = FIELDER_ACT.exec(part);
    if (!m) continue;
    const before = part.slice(0, m.index);
    for (const [label, re] of ZONE_NAMES) if (re.test(before)) return label;
  }
  return null;
}

function parseSpeed(text) {
  const m = /(\d{2,3}(?:\.\d)?)\s*(?:kph|km\/h|kmh)/i.exec(text);
  if (!m) return null;
  const v = Number(m[1]);
  // Genuine T20 deliveries sit between about 95 and 160 kph; anything outside
  // that is a stray number, not a speed reading.
  return v >= 95 && v <= 165 ? v : null;
}

const EMPTY = { length: null, line: null, variation: null, shot: null, contact: null, zone: null, speedKph: null };

export function parseDelivery(text) {
  if (!text || typeof text !== "string") return { ...EMPTY };
  return {
    length: first(LENGTH_RULES, text),
    line: first(LINE_RULES, text),
    variation: first(VARIATION_RULES, text),
    shot: first(SHOT_RULES, text),
    contact: first(CONTACT_RULES, text),
    zone: parseZone(text),
    speedKph: parseSpeed(text),
  };
}

export const FIELDS = Object.keys(EMPTY);

/* ---------------- run over the downloaded commentary ---------------- */

// Only sweep the directory when this file is the entry point; other scripts
// import parseDelivery and must not trigger a full run.
// pathToFileURL, not string surgery: on Windows a path is C:\a\b while
// import.meta.url is file:///C:/a/b, and hand-built prefixes never line up.
const isEntryPoint = process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url;

if (isEntryPoint) {
  if (!OUT_FILE) {
    console.error("usage: node parse-commentary.mjs <commentaryDir> <out.json> [--sample]");
    process.exit(1);
  }
  const files = fs.readdirSync(IN_DIR).filter(f => f.endsWith(".json"));
  const out = {};
  let balls = 0;
  const have = Object.fromEntries(FIELDS.map(f => [f, 0]));
  const CAT = ["length", "line", "variation", "shot", "contact", "zone"];
  const dist = Object.fromEntries(CAT.map(f => [f, {}]));
  const samples = [];

  for (const f of files) {
    const j = JSON.parse(fs.readFileSync(path.join(IN_DIR, f), "utf8"));
    const rows = [];
    for (const inn of j.innings ?? []) {
      for (const d of inn.deliveries ?? []) {
        if (d.over == null || !d.text) continue;
        const p = parseDelivery(d.text);
        balls++;
        for (const k of FIELDS) if (p[k] != null) have[k]++;
        for (const k of CAT) if (p[k]) dist[k][p[k]] = (dist[k][p[k]] ?? 0) + 1;
        if (samples.length < 12 && p.length && p.shot && p.zone && p.variation) {
          samples.push({ text: d.text.slice(0, 140), ...p });
        }
        rows.push({
          innings: d.innings, over: d.over, ball: d.ballInOver,
          bowler: d.bowler, batsman: d.batsman,
          runs: d.runs, playType: d.playType, dismissal: d.dismissal, ...p,
        });
      }
    }
    out[j.matchId] = rows;
  }

  if (mode !== "--sample") fs.writeFileSync(OUT_FILE, JSON.stringify(out));

  const pctOf = (n) => (balls ? ((n / balls) * 100).toFixed(1) + "%" : "0%");
  console.log(`matches parsed: ${files.length} | deliveries: ${balls}\n`);
  console.log("coverage — share of deliveries where the text actually said so:");
  for (const k of FIELDS) console.log(`   ${k.padEnd(10)} ${String(have[k]).padStart(6)}  ${pctOf(have[k])}`);
  for (const k of CAT) {
    const top = Object.entries(dist[k]).sort((a, b) => b[1] - a[1]).slice(0, 9);
    console.log(`\n${k}: ` + top.map(([v, n]) => `${v} ${n}`).join(" | "));
  }
  console.log("\nworked examples:");
  for (const s of samples.slice(0, 6)) {
    console.log(`   [${s.length} / ${s.line ?? "-"} / ${s.variation} / ${s.shot}${s.contact ? " (" + s.contact + ")" : ""} → ${s.zone}]`);
    console.log(`     "${s.text}"`);
  }
}
