import type { Request, Response, NextFunction } from "express";
import type { UserRole } from "@workspace/db";

const ROLE_HIERARCHY: Record<UserRole, number> = {
  admin: 4,
  soc_l2: 3,
  soc_l1: 2,
  viewer: 1,
};

export function requireRole(...roles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const user = req.user;
    if (!user) {
      res.status(401).json({ error: "Authentication required" });
      return;
    }
    if (!roles.includes(user.role)) {
      res.status(403).json({ error: "Insufficient permissions", required: roles, current: user.role });
      return;
    }
    next();
  };
}

export function requireMinRole(minRole: UserRole) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const user = req.user;
    if (!user) {
      res.status(401).json({ error: "Authentication required" });
      return;
    }
    if (ROLE_HIERARCHY[user.role] < ROLE_HIERARCHY[minRole]) {
      res.status(403).json({ error: "Insufficient permissions" });
      return;
    }
    next();
  };
}
