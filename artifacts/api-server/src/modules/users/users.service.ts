import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { hashPassword } from "../auth/auth.service";
import type { UserRole } from "@workspace/db";

export async function getUsers() {
  return db.select({
    id: usersTable.id,
    username: usersTable.username,
    email: usersTable.email,
    role: usersTable.role,
    status: usersTable.status,
    displayName: usersTable.displayName,
    lastLoginAt: usersTable.lastLoginAt,
    createdAt: usersTable.createdAt,
    updatedAt: usersTable.updatedAt,
  }).from(usersTable).orderBy(usersTable.createdAt);
}

export async function getUserById(id: string) {
  const [user] = await db.select({
    id: usersTable.id,
    username: usersTable.username,
    email: usersTable.email,
    role: usersTable.role,
    status: usersTable.status,
    displayName: usersTable.displayName,
    lastLoginAt: usersTable.lastLoginAt,
    createdAt: usersTable.createdAt,
    updatedAt: usersTable.updatedAt,
  }).from(usersTable).where(eq(usersTable.id, id)).limit(1);
  return user ?? null;
}

export async function createUser(data: {
  username: string;
  email: string;
  password: string;
  role: UserRole;
  displayName?: string;
}) {
  const passwordHash = await hashPassword(data.password);
  const [user] = await db.insert(usersTable).values({
    username: data.username,
    email: data.email,
    passwordHash,
    role: data.role,
    displayName: data.displayName ?? data.username,
    status: "active",
  }).returning({
    id: usersTable.id,
    username: usersTable.username,
    email: usersTable.email,
    role: usersTable.role,
    status: usersTable.status,
    displayName: usersTable.displayName,
    createdAt: usersTable.createdAt,
  });
  return user;
}

export async function updateUser(id: string, data: {
  role?: UserRole;
  status?: "active" | "inactive" | "locked";
  displayName?: string;
}) {
  const [user] = await db.update(usersTable)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(usersTable.id, id))
    .returning({
      id: usersTable.id,
      username: usersTable.username,
      email: usersTable.email,
      role: usersTable.role,
      status: usersTable.status,
      displayName: usersTable.displayName,
    });
  return user ?? null;
}

export async function resetUserPassword(id: string, newPassword: string) {
  const passwordHash = await hashPassword(newPassword);
  await db.update(usersTable)
    .set({ passwordHash, failedLoginAttempts: 0, status: "active", lockedUntil: null, updatedAt: new Date() })
    .where(eq(usersTable.id, id));
}
