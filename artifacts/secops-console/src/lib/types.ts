export type Severity = 'critical' | 'high' | 'medium' | 'low' | 'info';
export type AlertStatus = 'new' | 'investigating' | 'resolved' | 'false_positive';

export interface LogEntry {
  id: string;
  timestamp: Date;
  source: 'firewall' | 'ids' | 'endpoint' | 'auth' | 'dns' | 'proxy';
  severity: Severity;
  eventType: string;
  sourceIp: string;
  destIp: string;
  user?: string;
  message: string;
  rawLog: string;
  parsed: Record<string, any>;
  tags: string[];
  ruleMatched?: string;
  alertId?: string;
}

export interface Alert {
  id: string;
  title: string;
  severity: Severity;
  status: AlertStatus;
  assignee?: string;
  createdAt: Date;
  updatedAt: Date;
  mitreIds: string[];
  mitreTactics: string[];
  ruleId: string;
  ruleName: string;
  affectedAssets: string[];
  relatedEventIds: string[];
  description: string;
  timeline: {
    id: string;
    timestamp: Date;
    action: string;
    user?: string;
    note?: string;
  }[];
  aiSummary: string;
}

export interface DetectionRule {
  id: string;
  name: string;
  description: string;
  severity: Severity;
  enabled: boolean;
  conditions: any[];
  yaml: string;
  mitreIds: string[];
  mitreTactics: string[];
  createdAt: Date;
  updatedAt: Date;
  author: string;
  triggerCount: number;
}

export interface MitreTactic {
  id: string;
  name: string;
  techniques: MitreTechnique[];
}

export interface MitreTechnique {
  id: string;
  name: string;
  covered: boolean;
  alertCount: number;
}
