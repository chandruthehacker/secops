import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRoutes from "../modules/auth/auth.routes";
import usersRoutes from "../modules/users/users.routes";
import alertsRoutes from "../modules/alerts/alerts.routes";
import rulesRoutes from "../modules/rules/rules.routes";
import auditRoutes from "../modules/audit/audit.routes";
import ingestRoutes from "../modules/ingest/ingest.routes";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRoutes);
router.use(usersRoutes);
router.use(alertsRoutes);
router.use(rulesRoutes);
router.use(auditRoutes);
router.use(ingestRoutes);

export default router;
