import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import meRouter from "./me";
import jobsRouter from "./jobs";
import bidsRouter from "./bids";
import messagesRouter from "./messages";
import dashboardRouter from "./dashboard";
import adminRouter from "./admin";
import storageRouter from "./storage";
import mechanicsRouter from "./mechanics";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(meRouter);
router.use(jobsRouter);
router.use(bidsRouter);
router.use(messagesRouter);
router.use(dashboardRouter);
router.use(adminRouter);
router.use(storageRouter);
router.use(mechanicsRouter);

export default router;
