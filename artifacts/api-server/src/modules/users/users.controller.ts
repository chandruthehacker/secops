import type { Request, Response } from "express";
import * as usersService from "./users.service";
import { logAuditEvent } from "../../lib/audit";
import type { UserRole } from "@workspace/db";

export async function listUsers(req: Request, res: Response): Promise<void> {
  const users = await usersService.getUsers();
  res.json({ users });
}

export async function getUser(req: Request, res: Response): Promise<void> {
  const user = await usersService.getUserById(req.params.id!);
  if (!user) { res.status(404).json({ error: "User not found" }); return; }
  res.json({ user });
}

export async function createUser(req: Request, res: Response): Promise<void> {
  const { username, email, password, role, displayName } = req.body;
  if (!username || !email || !password || !role) {
    res.status(400).json({ error: "username, email, password, and role are required" });
    return;
  }
  const validRoles: UserRole[] = ["admin", "soc_l2", "soc_l1", "viewer"];
  if (!validRoles.includes(role)) {
    res.status(400).json({ error: "Invalid role" });
    return;
  }
  try {
    const user = await usersService.createUser({ username, email, password, role, displayName });
    await logAuditEvent(req, "users.create", { resource: "users", resourceId: user.id, metadata: { username, role } });
    res.status(201).json({ user });
  } catch (err: any) {
    if (err.code === "23505") {
      res.status(409).json({ error: "Username or email already exists" });
    } else {
      res.status(500).json({ error: "Failed to create user" });
    }
  }
}

export async function updateUser(req: Request, res: Response): Promise<void> {
  const { role, status, displayName } = req.body;
  const user = await usersService.updateUser(req.params.id!, { role, status, displayName });
  if (!user) { res.status(404).json({ error: "User not found" }); return; }
  await logAuditEvent(req, "users.update", { resource: "users", resourceId: req.params.id, metadata: { role, status } });
  res.json({ user });
}

export async function resetPassword(req: Request, res: Response): Promise<void> {
  const { newPassword } = req.body;
  if (!newPassword || newPassword.length < 8) {
    res.status(400).json({ error: "Password must be at least 8 characters" });
    return;
  }
  await usersService.resetUserPassword(req.params.id!, newPassword);
  await logAuditEvent(req, "users.reset_password", { resource: "users", resourceId: req.params.id });
  res.json({ message: "Password reset successfully" });
}
