import jwt from "jsonwebtoken";
import type { UserRole } from "@workspace/db";

const ACCESS_SECRET = process.env["JWT_SECRET"]!;
const REFRESH_SECRET = process.env["JWT_REFRESH_SECRET"]!;
const ACCESS_EXPIRES = "15m";
const REFRESH_EXPIRES = "7d";

export interface JwtPayload {
  userId: string;
  username: string;
  email: string;
  role: UserRole;
  displayName?: string | null;
}

export function signAccessToken(payload: JwtPayload): string {
  return jwt.sign(payload, ACCESS_SECRET, { expiresIn: ACCESS_EXPIRES });
}

export function signRefreshToken(payload: JwtPayload): string {
  return jwt.sign(payload, REFRESH_SECRET, { expiresIn: REFRESH_EXPIRES });
}

export function verifyAccessToken(token: string): JwtPayload {
  return jwt.verify(token, ACCESS_SECRET) as JwtPayload;
}

export function verifyRefreshToken(token: string): JwtPayload {
  return jwt.verify(token, REFRESH_SECRET) as JwtPayload;
}
