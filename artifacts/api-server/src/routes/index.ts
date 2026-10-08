import { Router, type IRouter } from "express";
import healthRouter from "./health";
import iplRouter from "./ipl";
import liveRouter from "./live";
import auctionRouter from "./auction";
import csvSyncRouter from "./csv-sync-route.js";
import decisionRouter from "./decision";
import decisionIntelRouter from "./decision-intel";
import clipRouter from "./clip-router";

const router: IRouter = Router();

router.use(healthRouter);
router.use(clipRouter);
router.use(decisionRouter);
router.use(decisionIntelRouter);
router.use(iplRouter);
router.use(liveRouter);
router.use("/auction", auctionRouter);
router.use(csvSyncRouter);

export default router;
