import type { Request, Response } from "express";
import * as rulesService from "./rules.service";
import { logAuditEvent } from "../../lib/audit";
import { invalidateEngine } from "../../lib/detection/pipeline";

export async function listRules(req: Request, res: Response): Promise<void> {
  const rules = await rulesService.getRules();
  res.json({ rules });
}

export async function getRule(req: Request, res: Response): Promise<void> {
  const rule = await rulesService.getRuleById(req.params.id!);
  if (!rule) { res.status(404).json({ error: "Rule not found" }); return; }
  res.json({ rule });
}

export async function createRule(req: Request, res: Response): Promise<void> {
  const { name, description, severity, yamlContent, logSource, mitreIds, mitreTactic, tags } = req.body;
  if (!name || !severity) {
    res.status(400).json({ error: "name and severity are required" });
    return;
  }
  const rule = await rulesService.createRule({
    name, description, severity, yamlContent, logSource, mitreIds, mitreTactic, tags,
    createdBy: req.user!.userId,
  });
  invalidateEngine();
  await logAuditEvent(req, "rules.create", { resource: "rules", resourceId: rule.id, metadata: { name } });
  res.status(201).json({ rule });
}

export async function updateRule(req: Request, res: Response): Promise<void> {
  const { name, description, severity, yamlContent, mitreIds } = req.body;
  const rule = await rulesService.updateRule(req.params.id!, {
    name, description, severity, yamlContent, mitreIds, updatedBy: req.user!.userId,
  });
  if (!rule) { res.status(404).json({ error: "Rule not found" }); return; }
  invalidateEngine();
  await logAuditEvent(req, "rules.update", { resource: "rules", resourceId: req.params.id });
  res.json({ rule });
}

export async function deleteRule(req: Request, res: Response): Promise<void> {
  await rulesService.deleteRule(req.params.id!);
  invalidateEngine();
  await logAuditEvent(req, "rules.delete", { resource: "rules", resourceId: req.params.id });
  res.json({ message: "Rule deleted" });
}

export async function toggleRule(req: Request, res: Response): Promise<void> {
  const { enabled } = req.body;
  if (typeof enabled !== "boolean") {
    res.status(400).json({ error: "enabled (boolean) is required" });
    return;
  }
  const rule = await rulesService.toggleRule(req.params.id!, enabled, req.user!.userId);
  if (!rule) { res.status(404).json({ error: "Rule not found" }); return; }
  invalidateEngine();
  await logAuditEvent(req, enabled ? "rules.enable" : "rules.disable", { resource: "rules", resourceId: req.params.id });
  res.json({ rule });
}
