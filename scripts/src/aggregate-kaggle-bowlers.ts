/**
 * Aggregate bowler metrics from the Kaggle IPL Complete Dataset 2008-2025
 * (Enhanced Edition).
 *
 * Reads by default:
 *   lib/cricket-data/kaggle/matches.csv
 *   lib/cricket-data/kaggle/deliveries.csv
 * Writes by default:
 *   lib/cricket-data/aggregated/kaggle-bowlers.json
 *
 * Run:
 *   pnpm --filter @workspace/scripts run aggregate-kaggle-bowlers
 * Or:
 *   pnpm --filter @workspace/scripts run aggregate-kaggle-bowlers -- \
 *     --matches path/to/matches.csv --deliveries path/to/deliveries.csv \
 *     --output path/to/bowlers.json
 */
import { createReadStream, existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { createInterface } from "node:readline";
import { fileURLToPath } from "node:url";

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(SCRIPT_DIR, "..", "..");
const DEFAULT_INPUT_DIR = join(REPO, "lib", "cricket-data", "kaggle");

type CsvRow = Record<string, string>;

interface MatchScore {
  totalRuns?: number;
}

interface MatchDeliveryTotals {
  totalRuns: number;
  legalBalls: number;
}

interface BowlerAccumulator {
  matches: Set<string>;
  innings: Set<string>;
  legalBalls: number;
  concededRuns: number;
  wickets: number;
  dots: number;
  boundaries: number;
}

export interface BowlerMetric {
  bowler: string;
  matches: number;
  innings: number;
  wickets: number;
  economy: number;
  dot_percentage: number;
  boundary_percentage: number;
  balls_per_boundary: number;
  true_economy: number;
}

interface CliOptions {
  matchesPath: string;
  deliveriesPath: string;
  outputPath: string;
}

const MATCH_COLUMNS = ["match_id", "first_innings_score", "second_innings_score"];
const DELIVERY_COLUMNS = [
  "match_id",
  "innings",
  "bowler",
  "batsman_runs",
  "extra_runs",
  "total_runs",
  "extra_type",
  "is_wicket",
  "dismissal_type",
];

// Dismissals attributable to the bowler under standard cricket scoring.
const BOWLER_CREDITED_WICKETS = new Set([
  "bowled",
  "caught",
  "caught and bowled",
  "lbw",
  "stumped",
  "hit wicket",
]);

const normalizeToken = (value: string | undefined): string =>
  (value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ");

const normalizeHeader = (value: string): string =>
  value.replace(/^\uFEFF/, "").trim().toLowerCase();

const isIllegalDelivery = (extraType: string): boolean => {
  const normalized = normalizeToken(extraType);
  return normalized === "wide" || normalized === "wides" ||
    normalized === "no ball" || normalized === "no balls" ||
    normalized === "noball" || normalized === "noballs";
};

const isBowlerExtra = (extraType: string): boolean => isIllegalDelivery(extraType);

const asNumber = (value: string | undefined): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const parseScore = (value: string | undefined): number | undefined => {
  if (!value || !value.trim()) return undefined;
  const leadingRuns = value.trim().match(/^\d+/)?.[0];
  if (!leadingRuns) return undefined;
  return Number(leadingRuns);
};

const round = (value: number, digits: number): number => {
  const scale = 10 ** digits;
  return Math.round((value + Number.EPSILON) * scale) / scale;
};

/**
 * An economy denominator is stored as legal balls, not decimal overs.
 * Thus 3.2 overs is represented as 20 balls and evaluated as 20 / 6 overs.
 */
const economyFromBalls = (runs: number, legalBalls: number): number =>
  legalBalls === 0 ? 0 : (runs * 6) / legalBalls;

const csvRecordIsComplete = (record: string): boolean => {
  let insideQuotes = false;
  for (let i = 0; i < record.length; i++) {
    if (record[i] !== '"') continue;
    if (insideQuotes && record[i + 1] === '"') {
      i++;
      continue;
    }
    insideQuotes = !insideQuotes;
  }
  return !insideQuotes;
};

const parseCsvRecord = (record: string): string[] => {
  const fields: string[] = [];
  let field = "";
  let insideQuotes = false;

  for (let i = 0; i < record.length; i++) {
    const char = record[i];
    if (char === '"') {
      if (insideQuotes && record[i + 1] === '"') {
        field += '"';
        i++;
      } else {
        insideQuotes = !insideQuotes;
      }
    } else if (char === "," && !insideQuotes) {
      fields.push(field);
      field = "";
    } else {
      field += char;
    }
  }

  if (insideQuotes) throw new Error("Malformed CSV record: unterminated quoted field.");
  fields.push(field);
  return fields;
};

async function forEachCsvRow(
  path: string,
  requiredColumns: string[],
  visit: (row: CsvRow) => void,
): Promise<void> {
  if (!existsSync(path)) throw new Error(`CSV input does not exist: ${path}`);

  const reader = createInterface({ input: createReadStream(path, "utf8"), crlfDelay: Infinity });
  let pendingRecord = "";
  let headers: string[] | undefined;

  for await (const line of reader) {
    pendingRecord = pendingRecord ? `${pendingRecord}\n${line}` : line;
    if (!csvRecordIsComplete(pendingRecord)) continue;

    const values = parseCsvRecord(pendingRecord);
    pendingRecord = "";

    if (!headers) {
      headers = values.map(normalizeHeader);
      const missing = requiredColumns.filter((column) => !headers!.includes(column));
      if (missing.length > 0) {
        throw new Error(`${path} is missing required column(s): ${missing.join(", ")}`);
      }
      continue;
    }

    const row: CsvRow = {};
    for (let i = 0; i < headers.length; i++) row[headers[i]] = values[i] ?? "";
    visit(row);
  }

  if (pendingRecord) throw new Error(`Malformed CSV input with incomplete record: ${path}`);
  if (!headers) throw new Error(`CSV input has no header row: ${path}`);
}

async function loadMatchScores(matchesPath: string): Promise<Map<string, MatchScore>> {
  const scores = new Map<string, MatchScore>();

  await forEachCsvRow(matchesPath, MATCH_COLUMNS, (row) => {
    const matchId = row.match_id.trim();
    if (!matchId) return;

    const firstInningsRuns = parseScore(row.first_innings_score);
    const secondInningsRuns = parseScore(row.second_innings_score);
    scores.set(matchId, {
      totalRuns:
        firstInningsRuns === undefined || secondInningsRuns === undefined
          ? undefined
          : firstInningsRuns + secondInningsRuns,
    });
  });

  return scores;
}

export async function aggregateBowlerMetrics(
  matchesPath: string,
  deliveriesPath: string,
): Promise<BowlerMetric[]> {
  const matchScores = await loadMatchScores(matchesPath);
  const deliveryTotalsByMatch = new Map<string, MatchDeliveryTotals>();
  const bowlers = new Map<string, BowlerAccumulator>();

  await forEachCsvRow(deliveriesPath, DELIVERY_COLUMNS, (row) => {
    const matchId = row.match_id.trim();
    if (!matchId) return;

    const legal = !isIllegalDelivery(row.extra_type);
    const batsmanRuns = asNumber(row.batsman_runs);
    const extraRuns = asNumber(row.extra_runs);
    const totalRuns = asNumber(row.total_runs);

    let matchTotals = deliveryTotalsByMatch.get(matchId);
    if (!matchTotals) {
      matchTotals = { totalRuns: 0, legalBalls: 0 };
      deliveryTotalsByMatch.set(matchId, matchTotals);
    }
    matchTotals.totalRuns += totalRuns;
    if (legal) matchTotals.legalBalls++;

    const bowler = row.bowler.trim();
    if (!bowler) return;

    let stats = bowlers.get(bowler);
    if (!stats) {
      stats = {
        matches: new Set<string>(),
        innings: new Set<string>(),
        legalBalls: 0,
        concededRuns: 0,
        wickets: 0,
        dots: 0,
        boundaries: 0,
      };
      bowlers.set(bowler, stats);
    }

    stats.matches.add(matchId);
    stats.innings.add(`${matchId}:${row.innings.trim()}`);
    stats.concededRuns += batsmanRuns + (isBowlerExtra(row.extra_type) ? extraRuns : 0);

    if (legal) {
      stats.legalBalls++;
      if (totalRuns === 0) stats.dots++;
      if (batsmanRuns === 4 || batsmanRuns === 6) stats.boundaries++;
    }

    if (
      asNumber(row.is_wicket) === 1 &&
      BOWLER_CREDITED_WICKETS.has(normalizeToken(row.dismissal_type))
    ) {
      stats.wickets++;
    }
  });

  const matchBaselines = new Map<string, number>();
  let deliveryScoreFallbackCount = 0;

  for (const [matchId, totals] of deliveryTotalsByMatch) {
    if (totals.legalBalls === 0) continue;
    const scoreFromMatches = matchScores.get(matchId)?.totalRuns;
    const scoredRuns = scoreFromMatches ?? totals.totalRuns;
    if (scoreFromMatches === undefined) deliveryScoreFallbackCount++;
    matchBaselines.set(matchId, economyFromBalls(scoredRuns, totals.legalBalls));
  }

  if (deliveryScoreFallbackCount > 0) {
    console.warn(
      `Used delivery totals as the match-run baseline for ${deliveryScoreFallbackCount} match(es) with missing score data.`,
    );
  }

  const result: BowlerMetric[] = [];
  for (const [bowler, stats] of bowlers) {
    const economy = economyFromBalls(stats.concededRuns, stats.legalBalls);
    const baselines = [...stats.matches]
      .map((matchId) => matchBaselines.get(matchId))
      .filter((baseline): baseline is number => baseline !== undefined);
    const personalBaseline = baselines.length === 0
      ? 0
      : baselines.reduce((sum, value) => sum + value, 0) / baselines.length;

    result.push({
      bowler,
      matches: stats.matches.size,
      innings: stats.innings.size,
      wickets: stats.wickets,
      economy: round(economy, 2),
      dot_percentage: stats.legalBalls === 0 ? 0 : round((stats.dots * 100) / stats.legalBalls, 1),
      boundary_percentage:
        stats.legalBalls === 0 ? 0 : round((stats.boundaries * 100) / stats.legalBalls, 1),
      balls_per_boundary:
        stats.boundaries === 0
          ? stats.legalBalls
          : round(stats.legalBalls / stats.boundaries, 1),
      true_economy: round(economy - personalBaseline, 2),
    });
  }

  return result.sort(
    (left, right) =>
      right.wickets - left.wickets ||
      left.economy - right.economy ||
      left.bowler.localeCompare(right.bowler),
  );
}

const readCliOptions = (args: string[]): CliOptions => {
  const options: CliOptions = {
    matchesPath: join(DEFAULT_INPUT_DIR, "matches.csv"),
    deliveriesPath: join(DEFAULT_INPUT_DIR, "deliveries.csv"),
    outputPath: join(REPO, "lib", "cricket-data", "aggregated", "kaggle-bowlers.json"),
  };

  for (let i = 0; i < args.length; i++) {
    const argument = args[i];
    const nextValue = args[i + 1];
    if (argument === "--") {
      continue;
    } else if (argument === "--matches" && nextValue) {
      options.matchesPath = resolve(nextValue);
      i++;
    } else if (argument === "--deliveries" && nextValue) {
      options.deliveriesPath = resolve(nextValue);
      i++;
    } else if (argument === "--output" && nextValue) {
      options.outputPath = resolve(nextValue);
      i++;
    } else if (argument === "--help" || argument === "-h") {
      console.log(
        "Usage: aggregate-kaggle-bowlers [--matches path] [--deliveries path] [--output path]",
      );
      process.exit(0);
    } else {
      throw new Error(`Unknown or incomplete argument: ${argument}`);
    }
  }

  return options;
};

async function main(): Promise<void> {
  const options = readCliOptions(process.argv.slice(2));
  const metrics = await aggregateBowlerMetrics(options.matchesPath, options.deliveriesPath);

  mkdirSync(dirname(options.outputPath), { recursive: true });
  writeFileSync(options.outputPath, `${JSON.stringify(metrics, null, 2)}\n`, "utf8");
  console.log(`Wrote ${metrics.length} bowler records to ${options.outputPath}`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}
