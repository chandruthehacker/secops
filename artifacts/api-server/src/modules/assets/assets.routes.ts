import { Router } from "express";
import { requireAuth } from "../../middlewares/auth.middleware";
import { can } from "../../middlewares/rbac.middleware";
import { db, assetsTable } from "@workspace/db";
import { eq, desc, ilike, and, sql } from "drizzle-orm";
import { loadAssetCache } from "../../lib/enrichment";
import type { Request, Response } from "express";

const router = Router();

router.get("/assets", requireAuth, can("alerts:view"), async (req: Request, res: Response) => {
  const { search, criticality, page = "1", limit = "50" } = req.query as Record<string, string>;
  const pageNum = Math.max(1, Number(page));
  const limitNum = Math.min(200, Math.max(1, Number(limit)));
  const offset = (pageNum - 1) * limitNum;

  const conditions = [];
  if (criticality) conditions.push(eq(assetsTable.criticality, criticality as any));
  if (search) {
    conditions.push(
      sql`(${assetsTable.hostname} ilike ${"%" + search + "%"} OR ${assetsTable.ip} ilike ${"%" + search + "%"} OR ${assetsTable.owner} ilike ${"%" + search + "%"})`
    );
  }

  const where = conditions.length > 0 ? and(...conditions) : undefined;
  const [assets, [{ count }]] = await Promise.all([
    db.select().from(assetsTable).where(where).orderBy(desc(assetsTable.updatedAt)).limit(limitNum).offset(offset),
    db.select({ count: sql<number>`count(*)` }).from(assetsTable).where(where),
  ]);

  res.json({ assets, total: Number(count), page: pageNum, limit: limitNum });
});

router.get("/assets/:id", requireAuth, can("alerts:view"), async (req: Request, res: Response) => {
  const [asset] = await db.select().from(assetsTable).where(eq(assetsTable.id, req.params.id)).limit(1);
  if (!asset) { res.status(404).json({ error: "Asset not found" }); return; }
  res.json({ asset });
});

router.post("/assets", requireAuth, can("rules:write"), async (req: Request, res: Response) => {
  const { hostname, ip, os, criticality, tags, owner, department, description } = req.body;
  if (!hostname) { res.status(400).json({ error: "hostname is required" }); return; }

  const [asset] = await db.insert(assetsTable).values({
    hostname,
    ip,
    os,
    criticality: criticality ?? "medium",
    tags: tags ?? [],
    owner,
    department,
    description,
    lastSeen: new Date(),
  }).returning();

  await loadAssetCache();
  res.status(201).json({ asset });
});

router.put("/assets/:id", requireAuth, can("rules:write"), async (req: Request, res: Response) => {
  const { hostname, ip, os, criticality, tags, owner, department, description } = req.body;
  const [asset] = await db.update(assetsTable).set({
    hostname,
    ip,
    os,
    criticality: criticality ?? "medium",
    tags: tags ?? [],
    owner,
    department,
    description,
    updatedAt: new Date(),
  }).where(eq(assetsTable.id, req.params.id)).returning();

  if (!asset) { res.status(404).json({ error: "Asset not found" }); return; }
  await loadAssetCache();
  res.json({ asset });
});

router.delete("/assets/:id", requireAuth, can("users:manage"), async (req: Request, res: Response) => {
  const [asset] = await db.delete(assetsTable).where(eq(assetsTable.id, req.params.id)).returning();
  if (!asset) { res.status(404).json({ error: "Asset not found" }); return; }
  await loadAssetCache();
  res.json({ message: "Asset deleted", id: req.params.id });
});

export default router;
