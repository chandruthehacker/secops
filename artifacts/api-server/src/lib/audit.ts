import { db, auditLogsTable } from "@workspace/db";
import type { Request } from "express";
import type { JwtPayload } from "./jwt";

export async function logAuditEvent(
  req: Request,
  action: string,
  opts: {
    resource?: string;
    resourceId?: string;
    metadata?: Record<string, unknown>;
    success?: boolean;
  } = {}
): Promise<void> {
  const user = (req as any).user as JwtPayload | undefined;
  try {
    await db.insert(auditLogsTable).values({
      userId: user?.userId ?? null,
      username: user?.username ?? "anonymous",
      action,
      resource: opts.resource ?? null,
      resourceId: opts.resourceId ?? null,
      metadata: opts.metadata ?? null,
      ipAddress: req.ip ?? null,
      userAgent: req.get("user-agent") ?? null,
      success: String(opts.success ?? true),
    });
  } catch {
  }
}
