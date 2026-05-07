import { Router, type IRouter } from "express";
import healthRouter from "./health";
import iplRouter from "./ipl";

const router: IRouter = Router();

router.use(healthRouter);
router.use(iplRouter);

export default router;
