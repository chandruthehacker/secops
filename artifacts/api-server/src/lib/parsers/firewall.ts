import type { ParsedEvent } from "./types";

const IPTABLES_RE = /\b(ACCEPT|DROP|REJECT)\b.*SRC=([\d.]+).*DST=([\d.]+).*PROTO=(\S+)(?:.*SPT=(\d+))?(?:.*DPT=(\d+))?/;

const ACTION_MAP: Record<string, string> = {
  ACCEPT: "connection_allowed",
  DROP:   "connection_blocked",
  REJECT: "connection_rejected",
};

export function parseFirewall(raw: string, sourceHost: string): ParsedEvent | null {
  const m = IPTABLES_RE.exec(raw);
  if (!m) return null;

  const [, action, srcIp, dstIp, protocol, srcPortStr, dstPortStr] = m;

  return {
    sourceType: "firewall",
    sourceHost,
    category: "firewall",
    action: ACTION_MAP[action] ?? "firewall_event",
    outcome: action === "ACCEPT" ? "success" : "failure",
    severity: action === "ACCEPT" ? "info" : "low",
    srcIp,
    dstIp,
    protocol,
    srcPort: srcPortStr ? parseInt(srcPortStr) : undefined,
    dstPort: dstPortStr ? parseInt(dstPortStr) : undefined,
    eventType: "firewall",
    message: `${action}: ${srcIp} → ${dstIp}:${dstPortStr ?? "?"} (${protocol})`,
    rawLog: raw,
  };
}
