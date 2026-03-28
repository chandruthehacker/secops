import { WebSocketServer, WebSocket } from "ws";
import type { IncomingMessage } from "http";
import type { Server } from "http";

let wss: WebSocketServer | null = null;
const clients = new Set<WebSocket>();

export function initWebSocket(server: Server): void {
  wss = new WebSocketServer({ server, path: "/ws/alerts" });

  wss.on("connection", (ws: WebSocket, req: IncomingMessage) => {
    clients.add(ws);

    // Send a welcome/connected message
    ws.send(JSON.stringify({ type: "connected", message: "WebSocket connected to SecOps alerts feed" }));

    ws.on("close", () => {
      clients.delete(ws);
    });

    ws.on("error", () => {
      clients.delete(ws);
    });

    // Heartbeat ping to detect dead connections
    ws.on("pong", () => {
      (ws as any).isAlive = true;
    });
    (ws as any).isAlive = true;
  });

  // Ping all clients every 30s to detect dead connections
  const interval = setInterval(() => {
    clients.forEach((ws) => {
      if ((ws as any).isAlive === false) {
        clients.delete(ws);
        ws.terminate();
        return;
      }
      (ws as any).isAlive = false;
      ws.ping();
    });
  }, 30_000);

  wss.on("close", () => clearInterval(interval));
}

export function broadcastAlert(alert: Record<string, any>): void {
  if (clients.size === 0) return;
  const payload = JSON.stringify({ type: "new_alert", data: alert });
  clients.forEach((ws) => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(payload);
    }
  });
}

export function broadcastEvent(event: Record<string, any>): void {
  if (clients.size === 0) return;
  const payload = JSON.stringify({ type: "event", data: event });
  clients.forEach((ws) => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(payload);
    }
  });
}

export function getConnectedCount(): number {
  return clients.size;
}
