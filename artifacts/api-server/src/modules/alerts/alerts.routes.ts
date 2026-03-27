import { Router } from "express";
import { requireAuth } from "../../middlewares/auth.middleware";
import { requireMinRole } from "../../middlewares/rbac.middleware";
import { listAlerts, getAlert, updateStatus, assignAlert, addNote } from "./alerts.controller";

const router = Router();

router.get("/alerts", requireAuth, requireMinRole("soc_l1"), listAlerts);
router.get("/alerts/:id", requireAuth, requireMinRole("soc_l1"), getAlert);
router.patch("/alerts/:id/status", requireAuth, requireMinRole("soc_l1"), updateStatus);
router.patch("/alerts/:id/assign", requireAuth, requireMinRole("soc_l2"), assignAlert);
router.post("/alerts/:id/timeline", requireAuth, requireMinRole("soc_l1"), addNote);

export default router;
