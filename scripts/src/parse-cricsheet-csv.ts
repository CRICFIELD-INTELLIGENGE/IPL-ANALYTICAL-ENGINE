import * as fs from 'fs';
import * as readline from 'readline';

// Types mapped to our new schema
export interface BowlerStatsCSV {
  player: string;
  innings: number;
  balls: number;
  runs: number;
  wickets: number;
  boundaries: number;
  boundary_pct: number;
  balls_per_boundary: number;
  true_economy: number;
}

export interface FilterState {
  scoringArea?: string[];
  matchupDelivery?: string[];
  battingContext?: string[];
  matchType?: string[];
  overRange?: string[];
}

export class CricsheetAggregator {
  // Overlapping filter logic to ensure state sync
  // Deterministic function handles intersecting logic gracefully
  public static evaluateFilters(row: any, filters: FilterState): boolean {
    let isValid = true;
    
    // 3. Batting Context / Innings (e.g., when both are evaluated as the same)
    // Avoid null sets when contradictory conditions overlap by enforcing a union where context overlaps
    if (filters.battingContext && filters.battingContext.length > 0) {
       const isContextMatch = filters.battingContext.includes(String(row.innings));
       if (!isContextMatch) isValid = false;
    }

    // 5. Over Range
    if (filters.overRange && filters.overRange.length > 0) {
      const overFloor = Math.floor(parseFloat(row.over || "0"));
      const isOverMatch = filters.overRange.some(range => {
         const [start, end] = range.split('-').map(Number);
         return overFloor >= start && overFloor <= end;
      });
      if (!isOverMatch) isValid = false;
    }

    // 1. Scoring Area
    if (filters.scoringArea && filters.scoringArea.length > 0) {
       // Mapping logic for scoring area based on row telemetry
       const isBoundary = row.batter_runs == '4' || row.batter_runs == '6';
       // Only filtering boundaries vs non-boundaries for demonstration in generic CSV context
       if (!isBoundary && filters.scoringArea.includes('Boundary')) isValid = false;
    }

    // 2. Matchup Delivery
    if (filters.matchupDelivery && filters.matchupDelivery.length > 0) {
        // e.g. Spin vs Pace
        if (row.bowler_type && !filters.matchupDelivery.includes(row.bowler_type)) isValid = false;
    }

    // 4. Match Type
    if (filters.matchType && filters.matchType.length > 0) {
        if (row.match_type && !filters.matchType.includes(row.match_type)) isValid = false;
    }

    return isValid;
  }

  public static async parseAndAggregate(csvFilePath: string, filters: FilterState = {}) {
    const fileStream = fs.createReadStream(csvFilePath);
    const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

    let headers: string[] = [];
    const bowlersMap = new Map<string, {
      balls: number;
      legal_balls: number;
      runs: number;
      boundaries: number;
      wickets: number;
      match_runs: Map<string, number>;
      match_balls: Map<string, number>;
      innings: Set<string>;
    }>();

    const globalMatchStats = new Map<string, { runs: number; legal_balls: number }>();

    let isFirstLine = true;
    for await (const line of rl) {
      if (isFirstLine) {
        headers = line.split(',');
        isFirstLine = false;
        continue;
      }
      
      const values = line.split(',');
      const row: any = {};
      headers.forEach((h, i) => { row[h.trim()] = values[i]; });

      // Clean & transform values
      row.over = parseFloat(row.over);
      row.batter_runs = parseInt(row.batter_runs || '0');
      row.extra_runs = parseInt(row.extra_runs || '0');
      row.total_runs = parseInt(row.total_runs || '0');

      if (!this.evaluateFilters(row, filters)) continue;

      const matchId = row.match_id || 'unknown';
      const bowler = row.bowler;
      if (!bowler) continue; // Skip invalid rows

      const isWide = row.extras_type === 'wides';
      const isNoball = row.extras_type === 'noballs';
      const isLegal = !isWide && !isNoball;
      const conceded = row.batter_runs + (isWide || isNoball ? row.extra_runs : 0);
      const isBoundary = (row.batter_runs === 4 || row.batter_runs === 6) && row.extras_type !== 'legbyes' && row.extras_type !== 'byes';

      // Global Match Economy Tracker
      if (!globalMatchStats.has(matchId)) {
        globalMatchStats.set(matchId, { runs: 0, legal_balls: 0 });
      }
      const gms = globalMatchStats.get(matchId)!;
      gms.runs += conceded;
      if (isLegal) gms.legal_balls++;

      // Bowler Stats Tracker
      if (!bowlersMap.has(bowler)) {
        bowlersMap.set(bowler, {
          balls: 0, legal_balls: 0, runs: 0, boundaries: 0, wickets: 0,
          match_runs: new Map(), match_balls: new Map(), innings: new Set()
        });
      }
      const stats = bowlersMap.get(bowler)!;

      stats.balls++;
      if (isLegal) stats.legal_balls++;
      stats.runs += conceded;
      if (isLegal && isBoundary) stats.boundaries++;
      stats.innings.add(matchId);

      if (!stats.match_runs.has(matchId)) stats.match_runs.set(matchId, 0);
      if (!stats.match_balls.has(matchId)) stats.match_balls.set(matchId, 0);
      
      stats.match_runs.set(matchId, stats.match_runs.get(matchId)! + conceded);
      if (isLegal) stats.match_balls.set(matchId, stats.match_balls.get(matchId)! + 1);

      if (row.player_out && row.kind && !['run out', 'retired hurt', 'obstructing the field'].includes(row.kind)) {
          stats.wickets++;
      }
    }

    // Compile Final Output
    const results: BowlerStatsCSV[] = [];
    for (const [player, stats] of bowlersMap.entries()) {
      // Balls Per Boundary with zero-division defense
      const bpb = stats.boundaries > 0 
        ? Math.round((stats.legal_balls / stats.boundaries) * 10) / 10 
        : 99.9; // zero-division defense flag
      
      const bndPct = stats.legal_balls > 0 
        ? Math.round((stats.boundaries / stats.legal_balls) * 1000) / 10 
        : 0;

      const econ = stats.legal_balls > 0 
        ? (stats.runs / (stats.legal_balls / 6)) 
        : 0;

      // True Economy Rate
      let totalMatchEcon = 0;
      let matchCount = 0;
      stats.innings.forEach(matchId => {
        const gms = globalMatchStats.get(matchId);
        if (gms && gms.legal_balls > 0) {
          totalMatchEcon += (gms.runs / (gms.legal_balls / 6));
          matchCount++;
        }
      });
      const avgMatchEcon = matchCount > 0 ? totalMatchEcon / matchCount : 0;
      const trueEcon = Math.round((econ - avgMatchEcon) * 100) / 100;

      results.push({
        player,
        innings: stats.innings.size,
        balls: stats.legal_balls,
        runs: stats.runs,
        wickets: stats.wickets,
        boundaries: stats.boundaries,
        boundary_pct: bndPct,
        balls_per_boundary: bpb,
        true_economy: trueEcon
      });
    }

    return results;
  }
}
