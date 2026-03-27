import { Router } from "express";
import { requireAuth } from "../../middlewares/auth.middleware";
import { requireRole } from "../../middlewares/rbac.middleware";
import { listUsers, getUser, createUser, updateUser, resetPassword } from "./users.controller";

const router = Router();

router.get("/users", requireAuth, requireRole("admin"), listUsers);
router.get("/users/:id", requireAuth, requireRole("admin"), getUser);
router.post("/users", requireAuth, requireRole("admin"), createUser);
router.patch("/users/:id", requireAuth, requireRole("admin"), updateUser);
router.post("/users/:id/reset-password", requireAuth, requireRole("admin"), resetPassword);

export default router;
