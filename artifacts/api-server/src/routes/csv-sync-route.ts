import { Router, Request, Response } from 'express';
import { CricsheetCSVParser, SyncEngine, SyncFilters } from '../services/cricsheet-csv-sync.js';

const router = Router();

router.post('/ipl/sync-csv', (req: Request, res: Response): void => {
  try {
    const { filePath, filters } = req.body as { filePath: string; filters: SyncFilters };
    
    if (!filePath) {
      res.status(400).json({ error: 'Missing CSV filePath' });
      return;
    }

    // 1. Parse the Official Cricsheet CSV Dataset
    const parsedRows = CricsheetCSVParser.parse(filePath);

    // Enrich rows with mapped dimensional filters
    const enrichedRows = parsedRows.map(row => CricsheetCSVParser.enrichRow(row));

    // 2. State Sync & Conflict Resolution
    // Resolving multidimensional filter mismatches securely
    const syncedRows = SyncEngine.applyDeterministicFilters(enrichedRows, filters || {});

    // 3. Aggregation Pipeline
    const pipelineData = SyncEngine.aggregateData(syncedRows);

    res.json({
      status: 'success',
      message: 'State synchronized without desync failures.',
      aggregated_metrics: pipelineData,
      filtered_rows_count: syncedRows.length
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Error processing CSV state sync' });
  }
});

export default router;
