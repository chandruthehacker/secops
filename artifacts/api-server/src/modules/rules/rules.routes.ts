import { Router } from "express";
import { requireAuth } from "../../middlewares/auth.middleware";
import { requireMinRole, requireRole } from "../../middlewares/rbac.middleware";
import { listRules, getRule, createRule, updateRule, deleteRule, toggleRule } from "./rules.controller";

const router = Router();

router.get("/rules", requireAuth, requireMinRole("soc_l1"), listRules);
router.get("/rules/:id", requireAuth, requireMinRole("soc_l1"), getRule);
router.post("/rules", requireAuth, requireRole("admin", "soc_l2"), createRule);
router.patch("/rules/:id", requireAuth, requireRole("admin", "soc_l2"), updateRule);
router.delete("/rules/:id", requireAuth, requireRole("admin"), deleteRule);
router.patch("/rules/:id/toggle", requireAuth, requireRole("admin", "soc_l2"), toggleRule);

export default router;
