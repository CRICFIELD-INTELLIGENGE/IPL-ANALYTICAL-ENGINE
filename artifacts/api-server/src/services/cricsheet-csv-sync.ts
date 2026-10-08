import fs from 'fs';

export interface CricsheetRow {
  match_id: string;
  season: string;
  start_date: string;
  venue: string;
  innings: number;
  ball: number;
  overStr: string;
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

export class CricsheetCSVParser {
  static parse(filePath: string): CricsheetRow[] {
    if (!fs.existsSync(filePath)) {
      throw new Error(`Cricsheet CSV file not found at path: ${filePath}`);
    }

    const rawData = fs.readFileSync(filePath, 'utf-8');
    const lines = rawData.split(/\r?\n/).filter((line) => line.trim().length > 0);
    const headers = lines[0].split(',').map((h) => h.trim());
    
    const rows: CricsheetRow[] = [];
    
    const hIdx = (name: string) => headers.indexOf(name);
    
    const idxMatchId = hIdx('match_id');
    const idxSeason = hIdx('season');
    const idxDate = hIdx('start_date');
    const idxVenue = hIdx('venue');
    const idxInnings = hIdx('innings');
    const idxBall = hIdx('ball');
    const idxBattingTeam = hIdx('batting_team');
    const idxBowlingTeam = hIdx('bowling_team');
    const idxStriker = hIdx('striker');
    const idxNonStriker = hIdx('non_striker');
    const idxBowler = hIdx('bowler');
    const idxBatRuns = hIdx('runs_off_bat') !== -1 ? hIdx('runs_off_bat') : hIdx('batter_runs');
    const idxExtras = hIdx('extras') !== -1 ? hIdx('extras') : hIdx('extra_runs');
    const idxWides = hIdx('wides');
    const idxNoballs = hIdx('noballs');
    const idxByes = hIdx('byes');
    const idxLegByes = hIdx('legbyes');
    const idxPenalty = hIdx('penalty');
    const idxWicketType = hIdx('wicket_type') !== -1 ? hIdx('wicket_type') : hIdx('kind');
    const idxPlayerDismissed = hIdx('player_dismissed') !== -1 ? hIdx('player_dismissed') : hIdx('player_out');
    
    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(',').map(c => c.trim());
      if (cols.length < headers.length) continue;

      const overStr = cols[idxBall] || "0.1";
      
      const row: CricsheetRow = {
        match_id: cols[idxMatchId],
        season: cols[idxSeason],
        start_date: cols[idxDate],
        venue: cols[idxVenue],
        innings: parseInt(cols[idxInnings], 10) || 1,
        ball: parseFloat(overStr),
        overStr: overStr,
        batting_team: cols[idxBattingTeam],
        bowling_team: cols[idxBowlingTeam],
        striker: cols[idxStriker],
        non_striker: cols[idxNonStriker],
        bowler: cols[idxBowler],
        runs_off_bat: parseInt(cols[idxBatRuns], 10) || 0,
        extras: parseInt(cols[idxExtras], 10) || 0,
        wides: idxWides !== -1 ? parseInt(cols[idxWides], 10) || 0 : 0,
        noballs: idxNoballs !== -1 ? parseInt(cols[idxNoballs], 10) || 0 : 0,
        byes: idxByes !== -1 ? parseInt(cols[idxByes], 10) || 0 : 0,
        legbyes: idxLegByes !== -1 ? parseInt(cols[idxLegByes], 10) || 0 : 0,
        penalty: idxPenalty !== -1 ? parseInt(cols[idxPenalty], 10) || 0 : 0,
        wicket_type: cols[idxWicketType] || "",
        player_dismissed: cols[idxPlayerDismissed] || "",
        other_wicket_type: "",
        other_player_dismissed: ""
      };
      
      rows.push(row);
    }
    
    return rows;
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