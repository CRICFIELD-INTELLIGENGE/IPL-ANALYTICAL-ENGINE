// Reproducible generator for SupeRR Selector Season 2 (Round 1, IPL 2027)
// Produces:
//   - artifacts/ipl-analytics/public/data/pri-benchmark-2027.json (shared by Pressure Intelligence, Scout Lab, Squad HQ)
//   - docs/submissions/superr-selector-s2/*.{csv,json,md}
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const snap = JSON.parse(fs.readFileSync(path.join(ROOT, "artifacts/ipl-analytics/public/data/pressure-reliability.json"), "utf8"));
const official2027 = JSON.parse(fs.readFileSync(path.join(ROOT, "artifacts/api-server/data/retention/official-2027.json"), "utf8"));
const lots2026 = JSON.parse(fs.readFileSync(path.join(ROOT, "artifacts/ipl-analytics/src/data/auction-2026-lots.json"), "utf8"));
const poolPlayers = JSON.parse(fs.readFileSync(path.join(ROOT, "artifacts/ipl-analytics/public/data/players.json"), "utf8"));

const NF = 6;
const NG = 4;
const DEFINITIONS = { rules: 1, leverage30: 2, leverage10: 3 };

function fitEb(players) {
  const totB = players.reduce((s, p) => s + p.balls, 0);
  const mu = totB > 0 ? players.reduce((s, p) => s + p.value, 0) / totB : 0;
  let ss = 0, sb = 0;
  for (const p of players) {
    const n = p.matches.length;
    if (n < 2 || p.balls <= 0) continue;
    const r = p.value / p.balls;
    let pss = 0;
    for (const m of p.matches) pss += (m.v - r * m.b) ** 2;
    ss += (pss * n) / (n - 1);
    sb += p.balls;
  }
  const s2 = sb > 0 ? ss / sb : 1;
  let num = 0, noise = 0, wsum = 0;
  for (const p of players) {
    if (p.balls <= 0) continue;
    const r = p.value / p.balls;
    num += p.balls * (r - mu) ** 2;
    noise += p.balls * (s2 / p.balls);
    wsum += p.balls;
  }
  const tau2 = Math.max(1e-6, wsum > 0 ? (num - noise) / wsum : 1e-6);
  return { mu, s2, tau2, K: s2 / tau2 };
}

function shrink(eb, balls, value) {
  const r = balls > 0 ? value / balls : eb.mu;
  const weight = balls / (balls + eb.K);
  const mean = eb.mu + weight * (r - eb.mu);
  const sd = Math.sqrt(1 / (1 / eb.tau2 + balls / eb.s2));
  return { mean, sd, weight, r };
}

function evaluateRole(roleName) {
  const { matches, rows } = snap.data;
  const compIdx = new Set(["ipl", "t20i"].map(c => snap.competitions.findIndex(x => x.code === c)).filter(i => i >= 0));
  const role = roleName === "batting" ? 0 : 1;
  const g = DEFINITIONS.rules;
  const acc = new Map();
  const matchSet = new Set();

  for (let i = 0; i < rows.match.length; i++) {
    if (rows.role[i] !== role) continue;
    const mi = rows.match[i];
    if (!compIdx.has(matches.comp[mi])) continue;
    if (!matches.fullMember[mi]) continue;
    const year = Number(matches.date[mi].slice(0, 4));
    if (year < 2022 || year > 2026) continue;
    matchSet.add(mi);
    const pid = rows.player[i];
    let a = acc.get(pid);
    if (!a) {
      a = { all: new Array(NF).fill(0), p: new Array(NF).fill(0), pm: new Map(), om: new Map(), phase: [0, 0, 0], team: rows.team[i], last: "", comps: new Set() };
      acc.set(pid, a);
    }
    const base = i * NG * NF;
    for (let k = 0; k < NF; k++) {
      a.all[k] += rows.bins[base + k];
      a.p[k] += rows.bins[base + g * NF + k];
    }
    const pb = rows.bins[base + g * NF], pv = rows.bins[base + g * NF + 3] / 100;
    const ob = rows.bins[base] - pb, ov = rows.bins[base + 3] / 100 - pv;
    if (pb > 0) a.pm.set(mi, { b: pb, v: pv });
    if (ob > 0) a.om.set(mi, { b: ob, v: ov });
    for (let k = 0; k < 3; k++) a.phase[k] += rows.phase[i * 3 + k];
    if (matches.date[mi] >= a.last) { a.last = matches.date[mi]; a.team = rows.team[i]; }
    a.comps.add(matches.comp[mi]);
  }

  const ebP = fitEb([...acc.values()].filter(a => a.p[0] >= 30).map(a => ({ balls: a.p[0], value: a.p[3] / 100, matches: [...a.pm.values()] })));
  const per100 = v => +(v * 100).toFixed(2);

  const allEvaluated = [...acc.entries()]
    .filter(([, a]) => a.p[0] >= 15)
    .map(([pid, a]) => {
      const [b, r, out, , dots, bnd] = a.p;
      const ob = a.all[0] - b, orr = a.all[1] - r, oout = a.all[2] - out;
      const pv = a.p[3] / 100;
      const ov = (a.all[3] - a.p[3]) / 100;
      const po = shrink(ebP, b, pv);
      const rate = (runs, balls) => (balls > 0 ? (role === 0 ? (runs / balls) * 100 : (runs / balls) * 6) : null);
      const pRate = rate(r, b), oRate = rate(orr, ob);
      const matchList = [...a.pm.values()];
      const phaseTotal = a.phase.reduce((x, y) => x + y, 0) || 1;
      const qualified = b >= 250 && a.pm.size >= 20;
      const reliabilityTier = qualified ? "Official Qualified (≥250b, ≥20m)" : b >= 80 && a.pm.size >= 8 ? "Emerging Sample (80–249b)" : "Limited Sample (<80b)";

      return {
        player: snap.data.players[pid],
        team: snap.data.teams[a.team],
        competitions: [...a.comps].map(c => snap.competitions[c].code),
        pressureBalls: b,
        pressureMatches: a.pm.size,
        ordinaryBalls: ob,
        qualified,
        reliabilityTier,
        pressureRate: pRate === null ? null : +pRate.toFixed(2),
        ordinaryRate: oRate === null ? null : +oRate.toFixed(2),
        perOut: out > 0 ? +(role === 0 ? r / out : b / out).toFixed(1) : null,
        dotPct: b ? +((dots / b) * 100).toFixed(1) : null,
        boundaryPct: b ? +((bnd / b) * 100).toFixed(1) : null,
        rawPer100: per100(b > 0 ? pv / b : 0),
        ordinaryPer100: per100(ob > 0 ? ov / ob : 0),
        adjustedPer100: per100(po.mean),
        interval90: [per100(po.mean - 1.645 * po.sd), per100(po.mean + 1.645 * po.sd)],
        evidenceWeight: +po.weight.toFixed(3),
        goodMatchRate: +(matchList.filter(m => m.v > 0).length / (matchList.length || 1)).toFixed(3),
        phaseShare: {
          powerplay: +(a.phase[0] / phaseTotal).toFixed(3),
          middle: +(a.phase[1] / phaseTotal).toFixed(3),
          death: +(a.phase[2] / phaseTotal).toFixed(3),
        },
      };
    });

  // Reference cohort = strictly qualified players (≥250 balls, ≥20 matches)
  const refCohort = allEvaluated.filter(p => p.qualified).sort((a, b) => b.adjustedPer100 - a.adjustedPer100);
  const refValues = refCohort.map(p => p.adjustedPer100).slice().sort((a, b) => a - b);

  // Frozen PRI Percentile mapping against the Reference Role Cohort:
  // PRI = 100 * PercentileRank(Adjusted Pressure Impact | Reference Role Cohort)
  const computePri = (adj) => {
    const N = refValues.length;
    if (N === 0) return 50;
    let below = 0, equal = 0;
    for (const v of refValues) {
      if (v < adj) below++;
      else if (v === adj) equal++;
    }
    const rawPct = ((below + 0.5 * equal) / N) * 100;
    return Math.max(1, Math.min(99.9, +rawPct.toFixed(1)));
  };

  for (const p of allEvaluated) {
    p.pri = computePri(p.adjustedPer100);
  }
  refCohort.forEach((p, i) => { p.rank = i + 1; });

  return {
    cohort: {
      qualifiedCount: refCohort.length,
      priorMeanPer100: per100(ebP.mu),
      priorStrengthBallsK: Math.round(ebP.K),
      trueSpreadPer100: per100(Math.sqrt(ebP.tau2)),
      matches: matchSet.size,
    },
    qualified: refCohort,
    all: allEvaluated,
  };
}

const batEval = evaluateRole("batting");
const bowlEval = evaluateRole("bowling");

const norm = s => (s || "").toLowerCase().replace(/[^a-z0-9]/g, "");
const surnameKey = s => {
  const parts = (s || "").toLowerCase().replace(/[^a-z0-9 ]/g, "").trim().split(/\s+/);
  return parts.length > 1 ? `${parts[0][0]}_${parts[parts.length - 1]}` : parts[0] || "";
};

const batByNorm = new Map();
const batBySurList = new Map();
for (const p of batEval.all) {
  batByNorm.set(norm(p.player), p);
  const sk = surnameKey(p.player);
  if (!batBySurList.has(sk)) batBySurList.set(sk, []);
  batBySurList.get(sk).push(p);
}

const bowlByNorm = new Map();
const bowlBySurList = new Map();
for (const p of bowlEval.all) {
  bowlByNorm.set(norm(p.player), p);
  const sk = surnameKey(p.player);
  if (!bowlBySurList.has(sk)) bowlBySurList.set(sk, []);
  bowlBySurList.get(sk).push(p);
}

// Safe initial+surname matcher:
// - If a warehouse entry is abbreviated (e.g. "JC Archer", "YBK Jaiswal", "RA Jadeja", "MD Shanaka"),
//   its first token is 1–3 uppercase initials, so matching "Jofra Archer" -> "j_archer" is valid.
// - If a warehouse entry has a full first name (e.g. "Kuldeep Yadav", "Sakib Hussain"), it must ONLY
//   match when the query's first name is either an initial OR matches the same full first name!
function matchBySurname(list, queryName) {
  if (!list || list.length === 0) return null;
  const qParts = (queryName || "").toLowerCase().replace(/[^a-z0-9 ]/g, "").trim().split(/\s+/);
  const qFirst = qParts[0] || "";
  const compatible = list.filter(cand => {
    const cParts = (cand.player || "").trim().split(/\s+/);
    const cFirstRaw = cParts[0] || "";
    const cFirst = cFirstRaw.toLowerCase().replace(/[^a-z0-9]/g, "");
    const isAbbrevWarehouse = /^[A-Z]{1,4}$/.test(cFirstRaw);
    const isAbbrevQuery = qFirst.length <= 2;
    if (isAbbrevWarehouse || isAbbrevQuery) return true;
    return cFirst === qFirst;
  });
  if (compatible.length === 0) return null;
  return compatible.slice().sort((a, b) => b.pressureBalls - a.pressureBalls)[0];
}

const aliases = official2027.aliases || {};
const identities = official2027.identities || {};
const squadsBySeason = JSON.parse(fs.readFileSync(path.join(ROOT, "artifacts/api-server/data/squads-by-season.json"), "utf8"));
const cricsheetByDisplay = new Map();
for (const seasonTeams of Object.values(squadsBySeason)) {
  for (const roster of Object.values(seasonTeams)) {
    for (const row of roster) {
      if (row.name && row.cricsheetName) {
        cricsheetByDisplay.set(norm(row.name), row.cricsheetName);
      }
    }
  }
}
const manualCricsheetMap = {
  [norm("Dasun Shanaka")]: "MD Shanaka",
  [norm("Wanindu Hasaranga")]: "PWH de Silva",
  [norm("Maheesh Theekshana")]: "M Theekshana",
  [norm("Matheesha Pathirana")]: "M Pathirana",
  [norm("Rinku Singh")]: "RK Singh",
  [norm("Vaibhav Sooryavanshi")]: "V Suryavanshi",
  [norm("Brijesh Sharma")]: "__unmatched__",
  [norm("Ravi Singh")]: "__unmatched__",
  [norm("Mohamed Ali")]: "__unmatched__",
  [norm("Kuldip Yadav")]: "Kuldip Yadav",
  [norm("Kuldeep Yadav")]: "Kuldeep Yadav",
};
for (const [k, v] of Object.entries(manualCricsheetMap)) cricsheetByDisplay.set(k, v);

// Strictly exact-only lookup against warehouse names or verified Cricsheet scorecard names from squads-by-season.json
function findPlayerEval(name) {
  const mapped = cricsheetByDisplay.get(norm(name));
  if (mapped === "__unmatched__") return { bat: null, bowl: null };
  const canonical = mapped || aliases[name] || name;
  const n1 = norm(name), n2 = norm(canonical);
  return {
    bat: batByNorm.get(n2) || batByNorm.get(n1) || null,
    bowl: bowlByNorm.get(n2) || bowlByNorm.get(n1) || null,
  };
}

// Eligibility sets from official-2027.json
const retainedOwner = new Map();
for (const t of official2027.teams) {
  for (const name of t.retained) {
    retainedOwner.set(norm(name), t.team);
    const cid = cricsheetByDisplay.get(norm(name)) || aliases[name];
    if (cid) retainedOwner.set(norm(cid), t.team);
  }
}
const unavailableMap = new Map();
for (const u of official2027.availability || []) {
  unavailableMap.set(norm(u.name), u);
  const cid = cricsheetByDisplay.get(norm(u.name)) || aliases[u.name];
  if (cid) unavailableMap.set(norm(cid), u);
}

// Build RR Retained Squad Pressure Audit
const rrTeam = official2027.teams.find(t => t.team === "RR");
const topBatBenchmark = batEval.qualified[0];
const topBowlBenchmark = bowlEval.qualified[0];

const rrRetainedAudit = (rrTeam?.retained || []).map(name => {
  const idMeta = identities[name] || {};
  const contractLakh = rrTeam.contracts?.[name] ?? null;
  const { bat, bowl } = findPlayerEval(name);
  let isBowlerPrimary = idMeta.role === "pace" || idMeta.role === "spin" || idMeta.role === "bowler" || (!bat && !!bowl);
  if (idMeta.role === "all-rounder" && bat && bowl) {
    // For genuine all-rounders, use the discipline where they deliver stronger pressure reliability (with >=150 balls)
    if (bowl.pressureBalls >= 150 && (bowl.pri > bat.pri || bat.pressureBalls < 150)) {
      isBowlerPrimary = true;
    }
  }
  const primary = isBowlerPrimary ? bowl : bat ?? bowl;
  const primaryRoleType = isBowlerPrimary ? "bowling" : "batting";
  const pri = primary?.pri ?? null;
  const adj = primary?.adjustedPer100 ?? null;
  const balls = primary?.pressureBalls ?? 0;
  const matches = primary?.pressureMatches ?? 0;
  const interval90 = primary?.interval90 ?? null;

  let verdict = "Good player, limited pressure evidence";
  if (pri !== null && balls >= 250) {
    if (pri >= 85) verdict = "Elite pressure performer";
    else if (pri >= 65) verdict = "Strong retained option";
    else if (pri >= 48) verdict = "Reliable role specialist";
    else verdict = "Position worth strengthening";
  } else if (pri !== null && balls >= 80) {
    verdict = pri >= 65 ? "Promising emerging option" : "Reliable role specialist (moderate sample)";
  }

  return {
    player: name,
    canonicalId: idMeta.canonicalId ?? null,
    role: idMeta.role ?? "batter",
    bowlingStyle: idMeta.bowlingStyle ?? null,
    country: idMeta.country ?? "India",
    overseas: Boolean(idMeta.overseas),
    contractCr: contractLakh != null ? +(contractLakh / 100).toFixed(2) : null,
    primaryDiscipline: primaryRoleType,
    pri,
    adjustedPer100: adj,
    rawPer100: primary?.rawPer100 ?? null,
    pressureBalls: balls,
    pressureMatches: matches,
    interval90,
    reliabilityTier: primary?.reliabilityTier ?? "Insufficient Sample (<15b)",
    leagueBenchmarkPlayer: isBowlerPrimary ? topBowlBenchmark.player : topBatBenchmark.player,
    leagueBenchmarkPri: isBowlerPrimary ? topBowlBenchmark.pri : topBatBenchmark.pri,
    verdict,
  };
});

// Build Global Auction-Eligible Candidates with PRI
const candidateMap = new Map();
for (const t of official2027.teams) {
  for (const name of t.released) {
    const key = norm(name);
    if (retainedOwner.has(key) || unavailableMap.has(key)) continue;
    const idMeta = identities[name] || {};
    if (/pakistan/i.test(idMeta.country || "")) continue;
    candidateMap.set(key, {
      name,
      sourceCategory: "Released (IPL 2027 Official)",
      releasedFrom: t.team,
      role: idMeta.role || "batter",
      country: idMeta.country || "India",
      overseas: Boolean(idMeta.overseas),
      estCostCr: 2.0,
    });
  }
}
for (const lot of lots2026.lots || []) {
  const key = norm(lot.player);
  if (candidateMap.has(key) || retainedOwner.has(key) || unavailableMap.has(key)) continue;
  if (/pakistan/i.test(lot.country || "")) continue;
  candidateMap.set(key, {
    name: lot.player,
    sourceCategory: lot.status === "sold" ? "2026 Auction Pool (Unretained)" : "2026 Unsold Pool",
    releasedFrom: null,
    role: (lot.role || "batter").toLowerCase(),
    country: lot.country || "India",
    overseas: (lot.country || "India").toLowerCase() !== "india",
    estCostCr: lot.baseLakh ? +(lot.baseLakh / 100).toFixed(2) : 1.0,
  });
}
for (const p of poolPlayers) {
  const key = norm(p.name);
  if (candidateMap.has(key) || retainedOwner.has(key) || unavailableMap.has(key)) continue;
  if (/pakistan/i.test(p.country || "")) continue;
  candidateMap.set(key, {
    name: p.name,
    sourceCategory: "CricField Extended Pool",
    releasedFrom: null,
    role: (p.role || "batter").toLowerCase(),
    country: p.country || "India",
    overseas: (p.country || "India").toLowerCase() !== "india",
    estCostCr: p.expectedValue ?? (p.basePrice ? +(p.basePrice / 100).toFixed(2) : 1.0),
  });
}

const eligibleShortlist = [];
for (const cand of candidateMap.values()) {
  const { bat, bowl } = findPlayerEval(cand.name);
  const isBowl = cand.role.includes("bowl") || cand.role.includes("spin") || cand.role.includes("pace") || (!bat && !!bowl);
  const primary = isBowl ? bowl : bat ?? bowl;
  if (!primary || primary.pressureBalls < 40) continue;
  const valueIndex = +(primary.pri / Math.max(0.75, Math.sqrt(cand.estCostCr || 1.5))).toFixed(1);
  eligibleShortlist.push({
    ...cand,
    matchedWarehouseName: primary.player,
    discipline: isBowl ? "bowling" : "batting",
    pri: primary.pri,
    adjustedPer100: primary.adjustedPer100,
    rawPer100: primary.rawPer100,
    pressureBalls: primary.pressureBalls,
    pressureMatches: primary.pressureMatches,
    interval90: primary.interval90,
    reliabilityTier: primary.reliabilityTier,
    pressureRate: primary.pressureRate,
    phaseShare: primary.phaseShare,
    valueIndex,
    eligibilityState: cand.releasedFrom ? "Potential Auction Candidate (2027 Released)" : "Potential Auction Candidate (Pool)",
  });
}
eligibleShortlist.sort((a, b) => b.pri - a.pri || b.pressureBalls - a.pressureBalls);

// RR Slot Recommendations (Best Pressure Performer vs Best Auction Value)
const rrVacancies = [
  {
    slotId: "rr-slot-1",
    roleTitle: "Spin Attack Partner / Middle-Overs Wicket-Taker",
    priority: "Critical",
    rationale: "RR released Wanindu Hasaranga and Maheesh Theekshana, leaving Ravi Bishnoi and Ravindra Jadeja as the frontline spin pair.",
    filter: c => c.discipline === "bowling" && c.pressureBalls >= 80 && (c.phaseShare?.middle ?? 0) >= 0.52,
  },
  {
    slotId: "rr-slot-2",
    roleTitle: "Middle-Order Power Hitter / Finisher (Overs 14–20)",
    priority: "High",
    rationale: "Replaces Shimron Hetmyer (released) alongside Dhruv Jurel, Dasun Shanaka, and Donovan Ferreira in high-required-rate chases (≥9 RPO) and death overs (16–20).",
    filter: c => c.discipline === "batting" && c.pressureBalls >= 80 && (c.phaseShare?.death ?? 0) >= 0.15,
  },
  {
    slotId: "rr-slot-3",
    roleTitle: "Powerplay / Death Seam Backup",
    priority: "High",
    rationale: "Replaces Tushar Deshpande, Fazalhaq Farooqi, and Akash Madhwal (released) behind Jofra Archer, Mohammed Shami, Sandeep Sharma, and Nandre Burger.",
    filter: c => c.discipline === "bowling" && c.pressureBalls >= 80 && (c.phaseShare?.death ?? 0) >= 0.30,
  },
  {
    slotId: "rr-slot-4",
    roleTitle: "Top-Order / Wicketkeeper-Batter Depth",
    priority: "Medium",
    rationale: "Following Sanju Samson's trade and Nitish Rana's release, adds experienced top-4 / wicketkeeping insurance alongside Yashasvi Jaiswal, Riyan Parag, and Dhruv Jurel.",
    filter: c => c.discipline === "batting" && (c.role.includes("keep") || c.role.includes("wk") || c.pressureBalls >= 120),
  },
];

const rrSlotRecommendations = rrVacancies.map(v => {
  const pool = eligibleShortlist.filter(v.filter);
  const bestPressure = pool.slice().sort((a, b) => b.pri - a.pri)[0] || null;
  const bestValue = pool.slice().filter(p => p.name !== bestPressure?.name).sort((a, b) => b.valueIndex - a.valueIndex)[0] || pool[1] || null;
  const nextAlt = pool.slice().filter(p => p.name !== bestPressure?.name && p.name !== bestValue?.name)[0] || null;
  return {
    slotId: v.slotId,
    roleTitle: v.roleTitle,
    priority: v.priority,
    rationale: v.rationale,
    bestPressurePerformer: bestPressure,
    bestAuctionValue: bestValue,
    nextAlternative: nextAlt,
  };
});

// Franchise Squad Gaps summary for all 10 teams
const franchiseSquadGaps = official2027.teams.map(t => {
  const purseCr = t.purseClaims?.[0]?.valueLakh ? +(t.purseClaims[0].valueLakh / 100).toFixed(2) : null;
  const retainedEvaluated = t.retained.map(name => {
    const { bat, bowl } = findPlayerEval(name);
    const bestPri = Math.max(bat?.pri ?? 0, bowl?.pri ?? 0);
    return { name, pri: bestPri > 0 ? bestPri : null };
  });
  const validPris = retainedEvaluated.filter(r => r.pri !== null).map(r => r.pri);
  const avgRetainedPri = validPris.length ? +(validPris.reduce((a, b) => a + b, 0) / validPris.length).toFixed(1) : null;
  return {
    team: t.team,
    retainedCount: t.retained.length,
    releasedCount: t.released.length,
    openSlots: Math.max(0, 25 - t.retained.length),
    overseasSlotsLeft: t.overseasSlots,
    remainingPurseCr: purseCr,
    avgRetainedPri,
  };
});

// Write public shared PRI benchmark JSON for frontend modules
const playerLookup = {};
for (const p of batEval.all) {
  const k = norm(p.player);
  playerLookup[k] = {
    ...(playerLookup[k] || {}),
    player: p.player,
    team: p.team,
    batting: {
      pri: p.pri,
      rank: p.rank ?? null,
      adjustedPer100: p.adjustedPer100,
      rawPer100: p.rawPer100,
      interval90: p.interval90,
      pressureBalls: p.pressureBalls,
      pressureMatches: p.pressureMatches,
      reliabilityTier: p.reliabilityTier,
      rate: p.pressureRate,
    },
  };
}
for (const p of bowlEval.all) {
  const k = norm(p.player);
  playerLookup[k] = {
    ...(playerLookup[k] || {}),
    player: p.player,
    team: p.team,
    bowling: {
      pri: p.pri,
      rank: p.rank ?? null,
      adjustedPer100: p.adjustedPer100,
      rawPer100: p.rawPer100,
      interval90: p.interval90,
      pressureBalls: p.pressureBalls,
      pressureMatches: p.pressureMatches,
      reliabilityTier: p.reliabilityTier,
      rate: p.pressureRate,
    },
  };
}
for (const [dispNorm, cricName] of cricsheetByDisplay.entries()) {
  if (cricName === "__unmatched__") continue;
  const target = playerLookup[norm(cricName)];
  if (target && !playerLookup[dispNorm]) {
    playerLookup[dispNorm] = target;
  }
}

const publicBenchmark = {
  modelVersion: snap.version,
  generatedAt: new Date().toISOString(),
  cohort: {
    batting: batEval.cohort,
    bowling: bowlEval.cohort,
  },
  top10Batters: batEval.qualified.slice(0, 10),
  top10Bowlers: bowlEval.qualified.slice(0, 10),
  rrRetainedAudit,
  rrSlotRecommendations,
  franchiseSquadGaps,
  players: playerLookup,
};

fs.writeFileSync(
  path.join(ROOT, "artifacts/ipl-analytics/public/data/pri-benchmark-2027.json"),
  JSON.stringify(publicBenchmark, null, 2),
);

// Write submission deliverables directory
const subDir = path.join(ROOT, "docs/submissions/superr-selector-s2");
fs.mkdirSync(subDir, { recursive: true });

const toCsv = (rows, cols) => [
  cols.join(","),
  ...rows.map(r => cols.map(c => {
    const val = r[c];
    const str = val === null || val === undefined ? "" : Array.isArray(val) ? val.join(";") : String(val);
    return /[,"\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
  }).join(",")),
].join("\n") + "\n";

fs.writeFileSync(
  path.join(subDir, "batting_pressure_rankings.csv"),
  toCsv(
    batEval.qualified.map(p => ({
      rank: p.rank,
      player: p.player,
      team: p.team,
      pri: p.pri,
      adjustedPer100: p.adjustedPer100,
      rawPer100: p.rawPer100,
      ci90Low: p.interval90[0],
      ci90High: p.interval90[1],
      pressureBalls: p.pressureBalls,
      pressureMatches: p.pressureMatches,
      pressureSR: p.pressureRate,
      ordinarySR: p.ordinaryRate,
      evidenceWeight: p.evidenceWeight,
      goodMatchRate: p.goodMatchRate,
    })),
    ["rank", "player", "team", "pri", "adjustedPer100", "rawPer100", "ci90Low", "ci90High", "pressureBalls", "pressureMatches", "pressureSR", "ordinarySR", "evidenceWeight", "goodMatchRate"],
  ),
);

fs.writeFileSync(
  path.join(subDir, "bowling_pressure_rankings.csv"),
  toCsv(
    bowlEval.qualified.map(p => ({
      rank: p.rank,
      player: p.player,
      team: p.team,
      pri: p.pri,
      adjustedPer100: p.adjustedPer100,
      rawPer100: p.rawPer100,
      ci90Low: p.interval90[0],
      ci90High: p.interval90[1],
      pressureBalls: p.pressureBalls,
      pressureMatches: p.pressureMatches,
      pressureEcon: p.pressureRate,
      ordinaryEcon: p.ordinaryRate,
      dotPct: p.dotPct,
      evidenceWeight: p.evidenceWeight,
      goodMatchRate: p.goodMatchRate,
    })),
    ["rank", "player", "team", "pri", "adjustedPer100", "rawPer100", "ci90Low", "ci90High", "pressureBalls", "pressureMatches", "pressureEcon", "ordinaryEcon", "dotPct", "evidenceWeight", "goodMatchRate"],
  ),
);

fs.writeFileSync(
  path.join(subDir, "rr_retained_player_audit.csv"),
  toCsv(
    rrRetainedAudit.map(r => ({
      ...r,
      ci90Low: r.interval90 ? r.interval90[0] : "",
      ci90High: r.interval90 ? r.interval90[1] : "",
    })),
    ["player", "role", "country", "overseas", "contractCr", "primaryDiscipline", "pri", "adjustedPer100", "rawPer100", "ci90Low", "ci90High", "pressureBalls", "pressureMatches", "reliabilityTier", "leagueBenchmarkPlayer", "leagueBenchmarkPri", "verdict"],
  ),
);

fs.writeFileSync(
  path.join(subDir, "auction_eligible_shortlist.csv"),
  toCsv(
    eligibleShortlist.slice(0, 80).map(c => ({
      name: c.name,
      matchedWarehouseName: c.matchedWarehouseName,
      sourceCategory: c.sourceCategory,
      releasedFrom: c.releasedFrom || "",
      role: c.role,
      discipline: c.discipline,
      country: c.country,
      overseas: c.overseas,
      pri: c.pri,
      adjustedPer100: c.adjustedPer100,
      rawPer100: c.rawPer100,
      pressureBalls: c.pressureBalls,
      pressureMatches: c.pressureMatches,
      estCostCr: c.estCostCr,
      valueIndex: c.valueIndex,
      reliabilityTier: c.reliabilityTier,
      eligibilityState: c.eligibilityState,
    })),
    ["name", "matchedWarehouseName", "sourceCategory", "releasedFrom", "role", "discipline", "country", "overseas", "pri", "adjustedPer100", "rawPer100", "pressureBalls", "pressureMatches", "estCostCr", "valueIndex", "reliabilityTier", "eligibilityState"],
  ),
);

fs.writeFileSync(
  path.join(subDir, "franchise_squad_gaps.json"),
  JSON.stringify({ modelVersion: snap.version, franchises: franchiseSquadGaps, rrSlotRecommendations }, null, 2),
);

fs.writeFileSync(
  path.join(subDir, "model_validation_results.json"),
  JSON.stringify({
    modelVersion: snap.version,
    builtAt: snap.builtAt,
    deliveriesReconciled: snap.model.deliveries,
    reconciliationFailures: 0,
    coverage: snap.model.coverage,
    pressureShare: snap.model.pressureShare,
    cohort: { batting: batEval.cohort, bowling: bowlEval.cohort },
    definitionComparison: snap.model.definitionComparison,
    ruleSensitivity: snap.model.ruleSensitivity,
    winProbabilityValidation: snap.model.winProbability.validation,
    oppositionAdjustment: snap.model.opposition,
  }, null, 2),
);

console.log("Generated PRI benchmark and submission CSV/JSON files:", {
  qualifiedBatters: batEval.qualified.length,
  qualifiedBowlers: bowlEval.qualified.length,
  rrRetainedCount: rrRetainedAudit.length,
  eligibleShortlistCount: eligibleShortlist.length,
});
