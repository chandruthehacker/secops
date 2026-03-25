import { v4 as uuidv4 } from 'uuid';
import { LogEntry, Alert, DetectionRule, MitreTactic } from './types';
import { subDays, subHours, subMinutes } from 'date-fns';

const SOURCES = ['firewall', 'ids', 'endpoint', 'auth', 'dns', 'proxy'] as const;
const SEVERITIES = ['info', 'low', 'medium', 'high', 'critical'] as const;
const EVENT_TYPES = [
  'login_failure', 'port_scan', 'malware_detected', 'dns_query', 
  'privilege_escalation', 'data_exfiltration', 'suspicious_process'
];

function randomItem<T>(arr: readonly T[] | T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function generateIp() {
  return `${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`;
}

export function generateLogs(count: number): LogEntry[] {
  return Array.from({ length: count }).map(() => {
    const timestamp = subMinutes(new Date(), Math.floor(Math.random() * 10080)); // last 7 days
    const source = randomItem(SOURCES);
    const severity = randomItem(SEVERITIES);
    const eventType = randomItem(EVENT_TYPES);
    const sourceIp = generateIp();
    const destIp = generateIp();
    const user = Math.random() > 0.5 ? `user_${Math.floor(Math.random() * 100)}` : undefined;

    return {
      id: uuidv4(),
      timestamp,
      source,
      severity,
      eventType,
      sourceIp,
      destIp,
      user,
      message: `${eventType.replace('_', ' ').toUpperCase()} from ${sourceIp} to ${destIp}`,
      rawLog: `[${timestamp.toISOString()}] SRC=${sourceIp} DST=${destIp} EVENT=${eventType} USER=${user || 'N/A'} ACTION=DENY`,
      parsed: {
        src_ip: sourceIp,
        dest_ip: destIp,
        action: 'DENY',
        protocol: randomItem(['TCP', 'UDP', 'HTTP', 'DNS']),
      },
      tags: [source, eventType],
    };
  }).sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
}

export function generateAlerts(count: number): Alert[] {
  return Array.from({ length: count }).map((_, i) => {
    const timestamp = subHours(new Date(), Math.floor(Math.random() * 72));
    const severity = randomItem(['high', 'critical', 'medium', 'low'] as const);
    
    return {
      id: `ALT-${2025000 + i}`,
      title: `Suspicious ${randomItem(EVENT_TYPES).replace('_', ' ')} detected`,
      severity,
      status: randomItem(['new', 'investigating', 'resolved', 'false_positive']),
      assignee: Math.random() > 0.5 ? randomItem(['Alice (L1)', 'Bob (L2)', 'Charlie (L3)']) : undefined,
      createdAt: timestamp,
      updatedAt: timestamp,
      mitreIds: [randomItem(['T1078', 'T1110', 'T1059', 'T1003'])],
      mitreTactics: [randomItem(['Initial Access', 'Execution', 'Credential Access'])],
      ruleId: uuidv4(),
      ruleName: `Detect ${randomItem(EVENT_TYPES)}`,
      affectedAssets: [generateIp()],
      relatedEventIds: [uuidv4(), uuidv4()],
      description: `Multiple failed attempts or suspicious patterns observed from source.`,
      timeline: [
        {
          id: uuidv4(),
          timestamp: timestamp,
          action: 'Alert Triggered',
          note: 'System generated alert based on rule match.'
        }
      ],
      aiSummary: `AI Analysis indicates a high probability of automated scanning or brute force activity. The source IP has been observed targeting common administrative ports. Recommend blocking IP at the perimeter.`
    };
  }).sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}

export const mockRules: DetectionRule[] = [
  {
    id: uuidv4(),
    name: 'Multiple Failed Logins',
    description: 'Detects brute force attempts against SSH or RDP',
    severity: 'high',
    enabled: true,
    conditions: [{ field: 'event.type', operator: '==', value: 'login_failure' }],
    yaml: `title: Multiple Failed Logins\nstatus: experimental\nlogsource:\n  category: authentication\ndetection:\n  selection:\n    EventID: 4625\ncondition: selection`,
    mitreIds: ['T1110'],
    mitreTactics: ['Credential Access'],
    createdAt: subDays(new Date(), 30),
    updatedAt: subDays(new Date(), 2),
    author: 'System',
    triggerCount: 145
  },
  {
    id: uuidv4(),
    name: 'Suspicious PowerShell Execution',
    description: 'Detects encoded or hidden PowerShell commands',
    severity: 'critical',
    enabled: true,
    conditions: [{ field: 'process.name', operator: '==', value: 'powershell.exe' }],
    yaml: `title: Suspicious PowerShell\nstatus: stable\nlogsource:\n  category: process_creation\ndetection:\n  selection:\n    CommandLine|contains: '-enc'\ncondition: selection`,
    mitreIds: ['T1059.001'],
    mitreTactics: ['Execution'],
    createdAt: subDays(new Date(), 45),
    updatedAt: subDays(new Date(), 10),
    author: 'Alice Analyst',
    triggerCount: 12
  }
];

export const mockMitreMatrix: MitreTactic[] = [
  {
    id: 'TA0001', name: 'Initial Access', techniques: [
      { id: 'T1078', name: 'Valid Accounts', covered: true, alertCount: 12 },
      { id: 'T1190', name: 'Exploit Public-Facing App', covered: true, alertCount: 3 },
      { id: 'T1566', name: 'Phishing', covered: false, alertCount: 0 }
    ]
  },
  {
    id: 'TA0002', name: 'Execution', techniques: [
      { id: 'T1059', name: 'Command and Scripting Interpreter', covered: true, alertCount: 45 },
      { id: 'T1204', name: 'User Execution', covered: false, alertCount: 0 }
    ]
  },
  {
    id: 'TA0003', name: 'Persistence', techniques: [
      { id: 'T1098', name: 'Account Manipulation', covered: true, alertCount: 2 },
      { id: 'T1543', name: 'Create or Modify System Process', covered: true, alertCount: 1 }
    ]
  },
  {
    id: 'TA0004', name: 'Privilege Escalation', techniques: [
      { id: 'T1484', name: 'Domain Policy Modification', covered: false, alertCount: 0 }
    ]
  },
  {
    id: 'TA0005', name: 'Defense Evasion', techniques: [
      { id: 'T1070', name: 'Indicator Removal', covered: true, alertCount: 8 }
    ]
  },
  {
    id: 'TA0006', name: 'Credential Access', techniques: [
      { id: 'T1110', name: 'Brute Force', covered: true, alertCount: 89 },
      { id: 'T1003', name: 'OS Credential Dumping', covered: true, alertCount: 15 }
    ]
  },
  {
    id: 'TA0007', name: 'Discovery', techniques: [
      { id: 'T1087', name: 'Account Discovery', covered: false, alertCount: 0 }
    ]
  },
  {
    id: 'TA0008', name: 'Lateral Movement', techniques: [
      { id: 'T1021', name: 'Remote Services', covered: true, alertCount: 4 }
    ]
  }
];

export const MOCK_LOGS = generateLogs(250);
export const MOCK_ALERTS = generateAlerts(65);
