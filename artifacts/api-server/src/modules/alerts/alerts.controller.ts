import type { Request, Response } from "express";
import * as alertsService from "./alerts.service";
import { logAuditEvent } from "../../lib/audit";

export async function listAlerts(req: Request, res: Response): Promise<void> {
  const { status, severity, search, page, limit } = req.query;
  const result = await alertsService.getAlerts({
    status: status as string,
    severity: severity as string,
    search: search as string,
    page: page ? Number(page) : 1,
    limit: limit ? Number(limit) : 50,
  });
  res.json(result);
}

export async function getAlert(req: Request, res: Response): Promise<void> {
  const alert = await alertsService.getAlertById(req.params.id!);
  if (!alert) { res.status(404).json({ error: "Alert not found" }); return; }
  res.json({ alert });
}

export async function updateStatus(req: Request, res: Response): Promise<void> {
  const { status, resolutionNotes } = req.body;
  const validStatuses = ["new", "investigating", "resolved", "false_positive"];
  if (!status || !validStatuses.includes(status)) {
    res.status(400).json({ error: "Invalid status" });
    return;
  }
  const alert = await alertsService.updateAlertStatus(req.params.id!, status, req.user!.userId, resolutionNotes);
  if (!alert) { res.status(404).json({ error: "Alert not found" }); return; }
  await logAuditEvent(req, "alerts.status_update", { resource: "alerts", resourceId: req.params.id, metadata: { status } });
  res.json({ alert });
}

export async function assignAlert(req: Request, res: Response): Promise<void> {
  const { assignedTo } = req.body;
  if (!assignedTo) { res.status(400).json({ error: "assignedTo is required" }); return; }
  const alert = await alertsService.assignAlertTo(req.params.id!, assignedTo, req.user!.userId);
  if (!alert) { res.status(404).json({ error: "Alert not found" }); return; }
  await logAuditEvent(req, "alerts.assign", { resource: "alerts", resourceId: req.params.id, metadata: { assignedTo } });
  res.json({ alert });
}

export async function addNote(req: Request, res: Response): Promise<void> {
  const { content, type } = req.body;
  if (!content) { res.status(400).json({ error: "content is required" }); return; }
  const entry = await alertsService.addTimelineNote(
    req.params.id!,
    req.user!.userId,
    req.user!.displayName ?? req.user!.username,
    content,
    type ?? "note"
  );
  await logAuditEvent(req, "alerts.add_note", { resource: "alerts", resourceId: req.params.id });
  res.status(201).json({ entry });
}

export async function bulkUpdate(req: Request, res: Response): Promise<void> {
  const { ids, status, resolutionNotes } = req.body;
  if (!Array.isArray(ids) || ids.length === 0) {
    res.status(400).json({ error: "ids must be a non-empty array" });
    return;
  }
  const validStatuses = ["new", "investigating", "resolved", "false_positive"];
  if (!status || !validStatuses.includes(status)) {
    res.status(400).json({ error: "Invalid status" });
    return;
  }
  const count = await alertsService.bulkUpdateAlertStatus(ids, status, req.user!.userId, resolutionNotes);
  await logAuditEvent(req, "alerts.bulk_update", { resource: "alerts", metadata: { ids, status, count } });
  res.json({ updated: count });
}

export async function getRelatedEvents(req: Request, res: Response): Promise<void> {
  const minutesBefore = Number(req.query.minutesBefore ?? 10);
  const minutesAfter = Number(req.query.minutesAfter ?? 5);
  const events = await alertsService.getRelatedEvents(req.params.id!, minutesBefore, minutesAfter);
  res.json({ events, total: events.length });
}
