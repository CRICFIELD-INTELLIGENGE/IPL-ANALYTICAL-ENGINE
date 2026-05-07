import { Router, type IRouter } from "express";
import healthRouter from "./health";
import iplRouter from "./ipl";
import liveRouter from "./live";

const router: IRouter = Router();

router.use(healthRouter);
router.use(iplRouter);
router.use(liveRouter);

export default router;
