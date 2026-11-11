import fs from 'fs';
import { parseCsv } from './decision/db';

export interface CricsheetRow {
  match_id: string;
  season: string;
  start_date: string;
  venue: string;
  innings: number;
  /** Numeric over.ball kept for the over-range filters (floor() is the 0-based over). */
  ball: number;
  overStr: string;
  /** 0-based over, parsed as an integer from the label (never parseFloat: "19.10" is ball 10, not 1). */
  over: number;
  /** Delivery number within the over as written by Cricsheet. */
  ballInOver: number;
  batting_team: string;
  bowling_team: string;
  striker: string;
  non_striker: string;
  bowler: string;
  runs_off_bat: number;
  extras: number;
  wides: number;
  noballs: number;
  byes: number;
  legbyes: number;
  penalty: number;
  wicket_type: string;
  player_dismissed: string;
  other_wicket_type: string;
  other_player_dismissed: string;
}

export interface SyncFilters {
  scoringArea?: string[];
  matchupDelivery?: string[];
  battingContext?: string[];
  matchType?: string[];
  overRange?: string[];
}

export type CricsheetCsvFormat = 'cricsheet-legacy' | 'cricsheet-csv2';

export interface ParsedMatch {
  format: CricsheetCsvFormat;
  info: Record<string, string[]>;
  rows: CricsheetRow[];
}

/** Thrown when a file is not a Cricsheet match CSV we understand, or parses to an impossible match. */
export class CricsheetCsvError extends Error {}

const int = (s: string | undefined) => {
  const n = parseInt(s ?? '', 10);
  return Number.isFinite(n) ? n : 0;
};

/** "19.10" → { over: 19, ballInOver: 10 }: integer parsing of each part, never parseFloat. */
export function parseOverBall(label: string): { over: number; ballInOver: number } {
  const m = /^(\d+)\.(\d+)$/.exec((label ?? '').trim());
  if (!m) throw new CricsheetCsvError(`unrecognised over.ball label "${label}"`);
  return { over: Number(m[1]), ballInOver: Number(m[2]) };
}

export class CricsheetCSVParser {
  /** Parse and validate a file. Throws (never returns zero-filled rows) when the file is not importable. */
  static parse(filePath: string): CricsheetRow[] {
    if (!fs.existsSync(filePath)) {
      throw new CricsheetCsvError('Cricsheet CSV file not found');
    }
    const parsed = CricsheetCSVParser.parseText(fs.readFileSync(filePath, 'utf-8'));
    const issues = validateParsedMatch(parsed);
    if (issues.length) throw new CricsheetCsvError(`refusing to import: ${issues.join('; ')}`);
    return parsed.rows;
  }

  /**
   * Two Cricsheet formats are recognised:
   *   - legacy ("version,…", then "info,…" and "ball,…" rows): what ipl_csv/ contains;
   *   - CSV2 (a header row with match_id, innings, ball, …): the *_csv2 downloads.
   * Anything else throws. Quoted fields (venue names contain commas) are handled by an RFC-4180 reader.
   */
  static parseText(text: string): ParsedMatch {
    const records = parseCsv(text.replace(/^﻿/, '')).filter((r) => r.some((f) => f.trim() !== ''));
    if (!records.length) throw new CricsheetCsvError('empty file');
    const first = records[0].map((f) => f.trim());
    if (first[0] === 'version') return CricsheetCSVParser.parseLegacy(records);
    if (first.includes('match_id') && first.includes('ball') && first.includes('innings')) return CricsheetCSVParser.parseCsv2(records);
    throw new CricsheetCsvError(`unrecognised CSV format (first row starts "${first.slice(0, 3).join(',')}")`);
  }

  private static parseLegacy(records: string[][]): ParsedMatch {
    const info: Record<string, string[]> = {};
    const balls: string[][] = [];
    for (const r of records) {
      if (r[0] === 'info') (info[r[1]] ??= []).push(r.slice(2).join(','));
      else if (r[0] === 'ball') balls.push(r);
    }
    const teams = info['team'] ?? [];
    if (teams.length !== 2) throw new CricsheetCsvError(`expected 2 teams in info rows, found ${teams.length}`);
    const one = (k: string) => (info[k] ?? [''])[0];
    // ball, innings, over.ball, batting team, striker, non-striker, bowler, runs off bat, extras,
    // wides, no-balls, byes, leg-byes, penalty, wicket kind, player out, …
    const rows: CricsheetRow[] = balls.map((b) => {
      const label = b[2];
      const { over, ballInOver } = parseOverBall(label);
      const battingTeam = b[3];
      return {
        match_id: one('match_id'), season: one('season'), start_date: one('date'), venue: one('venue'),
        innings: int(b[1]) || 1, ball: over + ballInOver / 10, overStr: label, over, ballInOver,
        batting_team: battingTeam, bowling_team: teams.find((t) => t !== battingTeam) ?? '',
        striker: b[4], non_striker: b[5], bowler: b[6],
        runs_off_bat: int(b[7]), extras: int(b[8]), wides: int(b[9]), noballs: int(b[10]), byes: int(b[11]),
        legbyes: int(b[12]), penalty: int(b[13]), wicket_type: (b[14] ?? '').trim(), player_dismissed: (b[15] ?? '').trim(),
        other_wicket_type: '', other_player_dismissed: '',
      };
    });
    return { format: 'cricsheet-legacy', info, rows };
  }

  private static parseCsv2(records: string[][]): ParsedMatch {
    const headers = records[0].map((h) => h.trim());
    const col = (...names: string[]) => names.map((n) => headers.indexOf(n)).find((i) => i !== -1) ?? -1;
    const need = {
      match_id: col('match_id'), innings: col('innings'), ball: col('ball'), batting_team: col('batting_team'),
      striker: col('striker'), bowler: col('bowler'), runs_off_bat: col('runs_off_bat', 'batter_runs'), extras: col('extras', 'extra_runs'),
    };
    const missing = Object.entries(need).filter(([, i]) => i === -1).map(([k]) => k);
    if (missing.length) throw new CricsheetCsvError(`CSV2 header lacks: ${missing.join(', ')}`);
    const ix = {
      season: col('season'), date: col('start_date'), venue: col('venue'), bowling_team: col('bowling_team'), non_striker: col('non_striker'),
      wides: col('wides'), noballs: col('noballs'), byes: col('byes'), legbyes: col('legbyes'), penalty: col('penalty'),
      wicket_type: col('wicket_type', 'kind'), player_dismissed: col('player_dismissed', 'player_out'),
      other_wicket_type: col('other_wicket_type'), other_player_dismissed: col('other_player_dismissed'),
    };
    const get = (r: string[], i: number) => (i === -1 ? '' : (r[i] ?? '').trim());
    const rows: CricsheetRow[] = records.slice(1).map((r) => {
      const label = get(r, need.ball);
      const { over, ballInOver } = parseOverBall(label);
      return {
        match_id: get(r, need.match_id), season: get(r, ix.season), start_date: get(r, ix.date), venue: get(r, ix.venue),
        innings: int(get(r, need.innings)) || 1, ball: over + ballInOver / 10, overStr: label, over, ballInOver,
        batting_team: get(r, need.batting_team), bowling_team: get(r, ix.bowling_team), striker: get(r, need.striker),
        non_striker: get(r, ix.non_striker), bowler: get(r, need.bowler), runs_off_bat: int(get(r, need.runs_off_bat)),
        extras: int(get(r, need.extras)), wides: int(get(r, ix.wides)), noballs: int(get(r, ix.noballs)), byes: int(get(r, ix.byes)),
        legbyes: int(get(r, ix.legbyes)), penalty: int(get(r, ix.penalty)), wicket_type: get(r, ix.wicket_type),
        player_dismissed: get(r, ix.player_dismissed), other_wicket_type: get(r, ix.other_wicket_type),
        other_player_dismissed: get(r, ix.other_player_dismissed),
      };
    });
    return { format: 'cricsheet-csv2', info: {}, rows };
  }

  static enrichRow(row: CricsheetRow) {
    const overNum = Math.floor(row.ball);
    (row as any)['calculated_over_range'] = overNum < 6 ? 'Powerplay (0-6)' : overNum < 15 ? 'Middle (7-15)' : 'Death (16-20)';

    (row as any)['calculated_batting_context'] = row.innings === 1 ? 'Setting' : row.innings === 2 ? 'Chasing' : 'Super Over';

    // Cricsheet's CSV publishes neither what was bowled nor where the ball
    // went. This used to fill both in anyway — the delivery type from
    // types[(over + ball*10) % 6] and the area from the runs scored, so every
    // dot ball "went to point" and every six "went to long-on". Both are left
    // null now.
    //
    // The real values live in `deliveries.delivery_type` / `.scoring_area`,
    // backfilled from ESPN ball-by-ball commentary; this CSV path has no match
    // id to join on, so it cannot reach them.
    (row as any)['calculated_delivery_type'] = null;
    (row as any)['calculated_scoring_area'] = null;

    (row as any)['calculated_match_type'] = "IPL Match";
    
    return row as any;
  }
}

/**
 * Consistency checks run before any import. A parsed match is rejected (never imported as zeros) when:
 *   - it has no deliveries, or every delivery scored zero runs (a format/column mismatch, not cricket);
 *   - any delivery's extras differ from wides + no-balls + byes + leg-byes + penalty;
 *   - legacy files: the first-innings total + 1 differs from the recorded chase target
 *     (skipped for rain-revised targets: a `method` row, or target overs below the scheduled overs).
 */
export function validateParsedMatch(m: ParsedMatch): string[] {
  const issues: string[] = [];
  const rows = m.rows;
  if (!rows.length) return ['no deliveries parsed'];
  const total = rows.reduce((s, r) => s + r.runs_off_bat + r.extras, 0);
  if (total === 0) issues.push(`${rows.length} deliveries parsed but every one scored 0 runs — a column mismatch, not a real match`);
  const badExtras = rows.filter((r) => r.extras !== r.wides + r.noballs + r.byes + r.legbyes + r.penalty).length;
  if (badExtras) issues.push(`${badExtras} deliveries whose extras do not equal the sum of extra types`);
  if (m.format === 'cricsheet-legacy') {
    const target = (m.info['target_runs'] ?? []).map((v) => v.split(',')).find((p) => p[0] === '2');
    const scheduled = Number((m.info['overs'] ?? ['20'])[0]);
    const revised = (m.info['method'] ?? []).length > 0 ||
      (m.info['target_overs'] ?? []).some((v) => { const [inn, ov] = v.split(','); return inn === '2' && Number(ov) !== scheduled; });
    if (target && !revised) {
      const first = rows.filter((r) => r.innings === 1).reduce((s, r) => s + r.runs_off_bat + r.extras, 0);
      if (first + 1 !== Number(target[1])) issues.push(`first-innings total ${first} + 1 does not equal the recorded target ${target[1]}`);
    }
  }
  return issues;
}

export class SyncEngine {
  static applyDeterministicFilters(rows: any[], filters: SyncFilters) {
    return rows.filter((row) => {
      if (filters.matchType && filters.matchType.length > 0) {
        if (!filters.matchType.includes(row.calculated_match_type) && !filters.matchType.includes('All')) return false;
      }
      
      if (filters.overRange && filters.overRange.length > 0) {
        if (!filters.overRange.some(range => this.matchesOverRange(row.ball, range))) {
            return false;
        }
      }

      if (filters.battingContext && filters.battingContext.length > 0) {
        const matchesContext = filters.battingContext.includes(row.calculated_batting_context);
        const matchesInnings = filters.battingContext.includes(row.innings.toString() + "st Innings");
        
        if (!matchesContext && !matchesInnings) {
            return false;
        }
      }

      if (filters.matchupDelivery && filters.matchupDelivery.length > 0) {
        if (!filters.matchupDelivery.includes(row.calculated_delivery_type)) return false;
      }

      if (filters.scoringArea && filters.scoringArea.length > 0) {
        if (!filters.scoringArea.includes(row.calculated_scoring_area)) return false;
      }

      return true;
    });
  }

  static matchesOverRange(ball: number, rangeLabel: string): boolean {
    if (rangeLabel.includes('Powerplay') && ball < 6) return true;
    if (rangeLabel.includes('Middle') && ball >= 6 && ball < 15) return true;
    if (rangeLabel.includes('Death') && ball >= 15) return true;
    if (rangeLabel === 'All Overs') return true;
    return false;
  }

  /**
   * Field meanings (names kept for compatibility; they differ from same-named metrics elsewhere):
   *   - boundaryPct      = % of all runs scored in 4s and 6s (elsewhere boundaryPct is boundaries per 100 balls);
   *   - ballsPerBoundary = deliveries (wides and no-balls included) per boundary;
   *   - trueEconomy      = runs NOT scored in boundaries per 6 deliveries (wides and no-balls included). It is not
   *                        the "True Economy" of the stats pages (bowler economy minus match-baseline economy).
   */
  static aggregateData(filteredRows: any[]) {
    const pipeline = {
      total_runs: 0,
      total_wickets: 0,
      boundaries_4s: 0,
      boundaries_6s: 0,
      total_boundaries: 0,
      runs_from_boundaries: 0,
      total_balls: 0,
      dot_balls: 0,
    };

    for (const row of filteredRows) {
      pipeline.total_balls++;
      pipeline.total_runs += (row.runs_off_bat ?? 0) + (row.extras ?? 0);
      
      if ((row.wicket_type ?? "") !== "") {
        pipeline.total_wickets++;
      }

      const runs = row.runs_off_bat ?? 0;
      const extras = row.extras ?? 0;
      
      if (runs === 4) {
        pipeline.boundaries_4s++;
      } else if (runs === 6) {
        pipeline.boundaries_6s++;
      } else if (runs === 0 && extras === 0) {
        pipeline.dot_balls++;
      }
    }

    pipeline.total_boundaries = pipeline.boundaries_4s + pipeline.boundaries_6s;
    pipeline.runs_from_boundaries = (pipeline.boundaries_4s * 4) + (pipeline.boundaries_6s * 6);

    const total_runs = pipeline.total_runs || 0;
    const total_boundaries = pipeline.total_boundaries || 0;
    const total_balls = pipeline.total_balls || 0;
    const runs_from_boundaries = pipeline.runs_from_boundaries || 0;

    const boundaryPct = total_runs > 0 ? Math.round((runs_from_boundaries / total_runs) * 100) : 0;
    const ballsPerBoundary = total_boundaries > 0 ? total_balls / total_boundaries : 99.9;
    const runs_from_non_boundaries = total_runs - runs_from_boundaries;
    const trueEconomy = (total_balls / 6) > 0 ? runs_from_non_boundaries / (total_balls / 6) : 0;

    return {
      ...pipeline,
      boundaryPct,
      ballsPerBoundary,
      trueEconomy,
    };
  }
}