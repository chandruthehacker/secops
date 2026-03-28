import { Router } from "express";
import { requireAuth } from "../../middlewares/auth.middleware";
import { can } from "../../middlewares/rbac.middleware";
import { listAlerts, getAlert, updateStatus, assignAlert, addNote } from "./alerts.controller";

const router = Router();

router.get("/alerts",              requireAuth, can("alerts:view"),   listAlerts);
router.get("/alerts/:id",          requireAuth, can("alerts:view"),   getAlert);
router.patch("/alerts/:id/status", requireAuth, can("alerts:triage"), updateStatus);
router.patch("/alerts/:id/assign", requireAuth, can("alerts:assign"), assignAlert);
router.post("/alerts/:id/timeline",requireAuth, can("alerts:note"),   addNote);

export default router;
