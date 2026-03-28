import type { ParsedEvent } from "./types";

const SYSLOG_RE = /^<(\d+)>(\w{3}\s+\d+\s+\d{2}:\d{2}:\d{2})\s+(\S+)\s+(\S+?)(?:\[(\d+)\])?:\s+(.*)$/;

const SSH_ACCEPTED = /Accepted \S+ for (\S+) from ([\d.]+) port (\d+)/;
const SSH_FAILED   = /Failed \S+ for (?:invalid user )?(\S+) from ([\d.]+)/;

const SEVERITY_MAP: Record<number, string> = {
  0: "critical", 1: "critical", 2: "critical",
  3: "high", 4: "medium", 5: "low",
  6: "info", 7: "info",
};

export function parseSyslog(raw: string, sourceHost: string): ParsedEvent | null {
  const m = SYSLOG_RE.exec(raw);
  if (!m) return null;

  const [, priorityStr, , hostname, program, pidStr, message] = m;
  const priority = parseInt(priorityStr);
  const level = priority & 0x07;
  const severity = SEVERITY_MAP[level] ?? "info";

  let category = "system";
  let action = `${program}_event`;
  let outcome: string | undefined;
  let userName: string | undefined;
  let srcIp: string | undefined;
  let srcPort: number | undefined;

  if (program === "sshd") {
    const acc = SSH_ACCEPTED.exec(message);
    if (acc) {
      category = "authentication";
      action = "login_success";
      outcome = "success";
      userName = acc[1];
      srcIp = acc[2];
      srcPort = parseInt(acc[3]);
    } else {
      const fail = SSH_FAILED.exec(message);
      if (fail) {
        category = "authentication";
        action = "login_failure";
        outcome = "failure";
        userName = fail[1];
        srcIp = fail[2];
      }
    }
  } else if (program === "sudo") {
    category = "authentication";
    action = "privilege_escalation";
  }

  return {
    sourceType: "syslog",
    sourceHost: hostname || sourceHost,
    category,
    action,
    outcome,
    severity,
    userName,
    srcIp,
    srcPort,
    processName: program,
    processId: pidStr ? parseInt(pidStr) : undefined,
    message,
    rawLog: raw,
    eventType: "syslog",
  };
}
