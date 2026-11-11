import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { CricsheetCSVParser, CricsheetCsvError, SyncEngine } from '../services/cricsheet-csv-sync.js';
import { resolveCricsheetCsv } from '../services/csv-dataset.js';
import { requireAdmin } from '../lib/admin-auth.js';

// POST /api/ipl/sync-csv — ADMIN ONLY.
//
// Security fix (Day 1): this route used to read any `filePath` sent by any caller,
// which exposed the server's filesystem. It now:
//   - answers 404 unless ADMIN_API_TOKEN is configured, and 401 without the token;
//   - accepts only a numeric `matchId`, resolved inside ipl_csv/ (no paths);
//   - returns generic error messages.
// For local/offline use, prefer the CLI: `pnpm --filter @workspace/api-server exec tsx src/scripts/csv-sync-cli.ts <matchId>`.

const router = Router();

const stringList = z.array(z.string().max(60)).max(20).optional();
const bodySchema = z.object({
  matchId: z.string().regex(/^\d{1,12}$/, 'matchId must be a numeric Cricsheet match id'),
  filters: z
    .object({
      scoringArea: stringList,
      matchupDelivery: stringList,
      battingContext: stringList,
      matchType: stringList,
      overRange: stringList,
    })
    .strict()
    .optional(),
}).strict();

router.post('/ipl/sync-csv', requireAdmin, (req: Request, res: Response): void => {
  const parsed = bodySchema.safeParse(req.body ?? {});
  if (!parsed.success) {
    res.status(400).json({ error: 'invalid_request', issues: parsed.error.issues });
    return;
  }

  const filePath = resolveCricsheetCsv(parsed.data.matchId);
  if (!filePath) {
    res.status(404).json({ error: 'match_csv_not_found' });
    return;
  }

  try {
    const parsedRows = CricsheetCSVParser.parse(filePath);
    const enrichedRows = parsedRows.map((row) => CricsheetCSVParser.enrichRow(row));
    const syncedRows = SyncEngine.applyDeterministicFilters(enrichedRows, parsed.data.filters ?? {});
    const pipelineData = SyncEngine.aggregateData(syncedRows);

    res.json({
      status: 'success',
      matchId: parsed.data.matchId,
      aggregated_metrics: pipelineData,
      filtered_rows_count: syncedRows.length,
    });
  } catch (err) {
    if (err instanceof CricsheetCsvError) {
      // The file exists but is not an importable match (unknown format, all-zero or inconsistent totals).
      // Messages describe the data only, never a filesystem path.
      res.status(422).json({ error: "csv_invalid", detail: err.message });
      return;
    }
    req.log?.error({ err, matchId: parsed.data.matchId }, 'csv sync failed');
    res.status(500).json({ error: 'csv_sync_failed' });
  }
});

export default router;
