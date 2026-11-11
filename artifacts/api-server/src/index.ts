import "./lib/load-env";
import { startPlatformWorker } from "./services/platform/worker";
import { startRetentionFreeze } from "./services/retention/service";
import app from "./app";
import { logger } from "./lib/logger";
import { warmDecisionCaches } from "./services/decision/player-profiles";
import { getHistoryOverview } from "./services/decision/history";
import { warmPressureGenome } from "./services/decision/pressure-genome";
import { warmInsightFeed } from "./services/decision/insight-feed";
import { warmMatchModel } from "./services/decision/match-model";
import { warmPlayerPool } from "./services/decision/player-pool";
import { warmSquadDna } from "./services/decision/squad-dna";
import { warmAuctionWarRoom } from "./services/decision/auction-war-room";
import { arcadeData } from "./services/arcade/arcade-data";

const rawPort = process.env["PORT"] ?? "5000";

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

app.listen(port, (err) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }

  logger.info({ port }, "Server listening");
  startPlatformWorker();
  startRetentionFreeze();

  setImmediate(() => {
    const t0 = Date.now();
    try {
      warmDecisionCaches();
      getHistoryOverview();
      warmPressureGenome();
      warmInsightFeed();
      warmMatchModel();
      warmPlayerPool();
      warmSquadDna();
      warmAuctionWarRoom();
      arcadeData();
      logger.info({ ms: Date.now() - t0 }, "Decision Intelligence caches warmed");
    } catch (err) {
      logger.error({ err }, "Decision Intelligence cache warm-up failed");
    }
  });
});
