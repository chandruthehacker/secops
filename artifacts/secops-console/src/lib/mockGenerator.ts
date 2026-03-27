import { v4 as uuidv4 } from 'uuid';
import { LogEntry, Alert, DetectionRule, MitreTactic } from './types';
import { subDays, subHours, subMinutes } from 'date-fns';

const SOURCES = ['firewall', 'ids', 'endpoint', 'auth', 'dns', 'proxy'] as const;
const SEVERITIES = ['info', 'low', 'medium', 'high', 'critical'] as const;
const EVENT_TYPES = [
  'login_failure', 'port_scan', 'malware_detected', 'dns_query',
  'privilege_escalation', 'data_exfiltration', 'suspicious_process',
  'lateral_movement', 'credential_dumping', 'c2_communication',
  'policy_violation', 'ransomware_activity', 'sql_injection',
];
const USERS = [
  'alice.smith', 'bob.jones', 'charlie.dev', 'diana.ops', 'eve.admin',
  'frank.user', 'grace.hr', 'henry.it', 'ivan.contractor', 'judy.finance',
];
const ANALYSTNAMES = ['Alice (L1)', 'Bob (L2)', 'Charlie (L3)', 'Diana (L1)', 'Eve (L2)'];

function randomItem<T>(arr: readonly T[] | T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function generateIp(internal = false) {
  if (internal) return `10.${Math.floor(Math.random() * 16)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`;
  return `${Math.floor(Math.random() * 200) + 20}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`;
}

function generateRawLog(source: string, eventType: string, srcIp: string, dstIp: string, user?: string): string {
  const ts = new Date().toISOString();
  const pid = Math.floor(Math.random() * 60000) + 1000;
  switch (source) {
    case 'firewall':
      return `${ts} fw-01 %FW-4-DENY: SRC=${srcIp} DST=${dstIp} PROTO=TCP SPT=${Math.floor(Math.random()*60000)+1024} DPT=443 ACTION=DROP`;
    case 'auth':
      return `${ts} auth01 sshd[${pid}]: ${eventType === 'login_failure' ? 'Failed' : 'Accepted'} password for ${user || 'root'} from ${srcIp} port ${Math.floor(Math.random()*60000)+1024} ssh2`;
    case 'dns':
      return `${ts} dns-fw01 query[A]: suspicious-domain-${Math.random().toString(36).slice(2,8)}.io from ${srcIp}`;
    case 'endpoint':
      return `${ts} DESKTOP-${Math.random().toString(36).slice(2,8).toUpperCase()} Process[${pid}] ${eventType.toUpperCase()} CommandLine="powershell.exe -enc ${btoa('malicious payload')}..." User=${user || 'SYSTEM'}`;
    case 'ids':
      return `${ts} snort[${pid}]: [1:2027865:2] ET ${eventType.toUpperCase()} Possible ${srcIp} -> ${dstIp}:443 [Classification: Attempted Administrator Privilege Gain] [Priority: 1]`;
    case 'proxy':
      return `${ts} proxy-01 [ACCESS_LOG] ${srcIp} - ${user || '-'} [${ts}] "GET http://malware-c2.com/beacon HTTP/1.1" 200 1024 "-" "Mozilla/5.0"`;
    default:
      return `${ts} host SRC=${srcIp} DST=${dstIp} EVENT=${eventType}`;
  }
}

export function generateLogs(count: number): LogEntry[] {
  return Array.from({ length: count }).map(() => {
    const timestamp = subMinutes(new Date(), Math.floor(Math.random() * 10080));
    const source = randomItem(SOURCES);
    const severity = randomItem(SEVERITIES);
    const eventType = randomItem(EVENT_TYPES);
    const sourceIp = generateIp(Math.random() > 0.4);
    const destIp = generateIp(Math.random() > 0.6);
    const user = Math.random() > 0.4 ? randomItem(USERS) : undefined;
    const ruleMatched = Math.random() > 0.7 ? randomItem(mockRules).name : undefined;

    return {
      id: uuidv4(),
      timestamp,
      source,
      severity,
      eventType,
      sourceIp,
      destIp,
      user,
      message: `${eventType.replace(/_/g, ' ').toUpperCase()} from ${sourceIp} to ${destIp}`,
      rawLog: generateRawLog(source, eventType, sourceIp, destIp, user),
      parsed: {
        src_ip: sourceIp,
        dest_ip: destIp,
        action: randomItem(['DENY', 'ALLOW', 'BLOCK', 'MONITOR']),
        protocol: randomItem(['TCP', 'UDP', 'HTTP', 'DNS', 'HTTPS']),
        port: randomItem([22, 80, 443, 3389, 8080, 53, 445]),
        ...(user && { user }),
        process: source === 'endpoint' ? randomItem(['powershell.exe', 'cmd.exe', 'mshta.exe', 'wscript.exe']) : undefined,
        bytes_sent: Math.floor(Math.random() * 100000),
        bytes_recv: Math.floor(Math.random() * 1000000),
      },
      tags: [source, eventType, severity, ...(ruleMatched ? ['rule_match'] : [])],
      ruleMatched,
    };
  }).sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
}

const ALERT_TITLES: Record<string, string[]> = {
  critical: [
    'Ransomware Activity Detected on WORKSTATION-07',
    'Active Credential Dumping via LSASS',
    'Data Exfiltration: 2.4GB Transferred to Suspicious Host',
    'Lateral Movement Detected Across 6 Hosts',
    'C2 Beacon Identified – PlugX Malware Signature',
  ],
  high: [
    'Multiple Failed SSH Logins from TOR Exit Node',
    'Suspicious PowerShell Download Cradle Executed',
    'DNS Tunneling Detected on Internal Host',
    'Privilege Escalation via Scheduled Task',
    'Mimikatz-like Tool Execution Detected',
    'Outbound Traffic to Known Malicious IP',
  ],
  medium: [
    'Port Scan Activity from Internal Host',
    'Unusual After-Hours Login from VPN',
    'Multiple Account Lockouts – Possible Spray Attack',
    'Suspicious Encoded Command Execution',
    'SMB Enumeration Activity Detected',
    'New Local Admin Account Created',
  ],
  low: [
    'Policy Violation: Unauthorized Software Installation',
    'Failed LDAP Queries – Possible Recon',
    'Self-Signed Certificate Used by Internal Service',
    'Unencrypted Password in Web Request',
    'DNS Query to Newly Registered Domain',
  ],
};

const MITRE_MAPPINGS = [
  { ids: ['T1078'], tactics: ['Initial Access'] },
  { ids: ['T1110', 'T1003'], tactics: ['Credential Access'] },
  { ids: ['T1059.001', 'T1059.003'], tactics: ['Execution'] },
  { ids: ['T1021.002', 'T1570'], tactics: ['Lateral Movement'] },
  { ids: ['T1486', 'T1490'], tactics: ['Impact'] },
  { ids: ['T1041', 'T1048'], tactics: ['Exfiltration'] },
  { ids: ['T1071.004'], tactics: ['Command and Control'] },
  { ids: ['T1548.002'], tactics: ['Privilege Escalation'] },
  { ids: ['T1053.005'], tactics: ['Persistence'] },
  { ids: ['T1087.002', 'T1046'], tactics: ['Discovery'] },
];

export function generateAlerts(count: number): Alert[] {
  return Array.from({ length: count }).map((_, i) => {
    const severity = randomItem(['high', 'critical', 'medium', 'low'] as const);
    const createdAt = subHours(new Date(), Math.floor(Math.random() * 72));
    const updatedAt = subMinutes(createdAt, -Math.floor(Math.random() * 120));
    const titleList = ALERT_TITLES[severity] || ALERT_TITLES.medium;
    const title = titleList[Math.floor(Math.random() * titleList.length)];
    const mitre = randomItem(MITRE_MAPPINGS);
    const rule = randomItem(mockRules);
    const status = randomItem(['new', 'investigating', 'resolved', 'false_positive'] as const);
    const assignee = status !== 'new' && Math.random() > 0.3 ? randomItem(ANALYSTNAMES) : undefined;

    const timelineEvents = [
      { id: uuidv4(), timestamp: createdAt, action: 'Alert Triggered', note: `Detection rule "${rule.name}" fired. Automated scoring assigned severity: ${severity}.` },
      ...(status !== 'new' ? [{ id: uuidv4(), timestamp: subMinutes(createdAt, -15), action: 'Assigned for Investigation', user: assignee, note: `Alert assigned to ${assignee} for triage.` }] : []),
      ...(status === 'investigating' ? [
        { id: uuidv4(), timestamp: subMinutes(createdAt, -30), action: 'Investigation Started', user: assignee, note: 'Analyst began correlating related events.' },
        { id: uuidv4(), timestamp: subMinutes(createdAt, -45), action: 'Threat Intel Lookup', user: assignee, note: `Source IP queried against threat intel feeds. ${Math.random() > 0.5 ? 'IP found in blocklist (ThreatFox).' : 'No matches found in known IOC databases.'}` },
      ] : []),
      ...(status === 'resolved' ? [
        { id: uuidv4(), timestamp: subMinutes(createdAt, -30), action: 'Containment Applied', user: assignee, note: 'Endpoint isolated from network. Source IP blocked at perimeter firewall.' },
        { id: uuidv4(), timestamp: subMinutes(createdAt, -60), action: 'Alert Resolved', user: assignee, note: 'Threat confirmed and contained. Incident report filed. No further malicious activity observed.' },
      ] : []),
      ...(status === 'false_positive' ? [
        { id: uuidv4(), timestamp: subMinutes(createdAt, -20), action: 'Marked as False Positive', user: assignee, note: 'Alert triaged as false positive. Legitimate administrator activity confirmed via ticket system.' },
      ] : []),
    ];

    const assets = [generateIp(true), ...(Math.random() > 0.5 ? [generateIp(true)] : [])];
    const relatedEventIds = Array.from({ length: Math.floor(Math.random() * 5) + 2 }, () => uuidv4());

    return {
      id: `ALT-${2025000 + i}`,
      title,
      severity,
      status,
      assignee,
      createdAt,
      updatedAt,
      mitreIds: mitre.ids,
      mitreTactics: mitre.tactics,
      ruleId: rule.id,
      ruleName: rule.name,
      affectedAssets: assets,
      relatedEventIds,
      description: `Security alert generated by detection rule "${rule.name}". ${
        severity === 'critical' ? 'Immediate response required. ' : ''
      }The activity was observed across ${assets.length} internal asset(s). MITRE tactics: ${mitre.tactics.join(', ')}.`,
      timeline: timelineEvents,
      aiSummary: generateAiSummary(title, severity, mitre.tactics[0], assets[0]),
    };
  }).sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}

function generateAiSummary(title: string, severity: string, tactic: string, asset: string): string {
  const summaries = [
    `Analysis indicates a ${severity === 'critical' ? 'high-confidence' : 'moderate-confidence'} threat aligned with the "${tactic}" tactic from the MITRE ATT&CK framework. The activity pattern suggests a sophisticated actor with knowledge of the target environment. The affected asset (${asset}) shows indicators consistent with ${title.toLowerCase()}. Immediate containment is ${severity === 'critical' ? 'strongly' : ''} recommended. The source IP has been cross-referenced against threat intelligence feeds with ${Math.random() > 0.5 ? '3 corroborating reports' : 'no prior hits, suggesting a new or infrastructure rotation'}.`,
    `The AI threat correlation engine has identified a high probability of malicious intent based on ${Math.floor(Math.random() * 15) + 5} correlated events over the past ${Math.floor(Math.random() * 4) + 1} hours. Behavioral analysis indicates automated tooling rather than manual activity — consistent with known offensive frameworks (${randomItem(['Cobalt Strike', 'Metasploit', 'Impacket', 'Empire'])}). Asset ${asset} should be triaged immediately. Recommend isolating from network segment and capturing memory forensics if possible.`,
  ];
  return randomItem(summaries);
}

export const mockRules: DetectionRule[] = [
  {
    id: uuidv4(), name: 'Multiple Failed Logins', description: 'Detects brute force attempts against SSH or RDP — 5+ failures in 60 seconds from a single source.',
    severity: 'high', enabled: true,
    conditions: [{ field: 'event.type', operator: '==', value: 'login_failure' }, { field: 'count', operator: '>=', value: '5' }],
    yaml: `title: Multiple Failed Logins\nid: a1b2c3d4-e5f6-7890-abcd-ef1234567890\nstatus: stable\nauthor: SecOps Team\ndate: 2025/01/15\nlogsource:\n  category: authentication\n  product: '*'\ndetection:\n  selection:\n    EventID: 4625\n    LogonType: 3\n  condition: selection | count() > 5 within 1m by SourceIp\nfalsepositives:\n  - Legitimate admin scripts\nlevel: high\ntags:\n  - attack.credential_access\n  - attack.t1110`,
    mitreIds: ['T1110'], mitreTactics: ['Credential Access'],
    createdAt: subDays(new Date(), 90), updatedAt: subDays(new Date(), 2), author: 'SecOps Team', triggerCount: 412,
  },
  {
    id: uuidv4(), name: 'Suspicious PowerShell Execution', description: 'Detects encoded or obfuscated PowerShell commands commonly used in malware downloaders.',
    severity: 'critical', enabled: true,
    conditions: [{ field: 'process.name', operator: '==', value: 'powershell.exe' }, { field: 'cmdline', operator: 'contains', value: '-enc' }],
    yaml: `title: Suspicious PowerShell Execution\nid: b2c3d4e5-f6a7-8901-bcde-f12345678901\nstatus: stable\nauthor: Alice Analyst\ndate: 2025/02/01\nlogsource:\n  category: process_creation\n  product: windows\ndetection:\n  selection:\n    Image|endswith: '\\powershell.exe'\n    CommandLine|contains|all:\n      - '-enc'\n      - '-w hidden'\n  condition: selection\nfalsepositives:\n  - Administrative scripts with encoded params\nlevel: critical\ntags:\n  - attack.execution\n  - attack.t1059.001`,
    mitreIds: ['T1059.001'], mitreTactics: ['Execution'],
    createdAt: subDays(new Date(), 60), updatedAt: subDays(new Date(), 5), author: 'Alice Analyst', triggerCount: 89,
  },
  {
    id: uuidv4(), name: 'DNS Tunneling Detection', description: 'Identifies high-frequency or large DNS queries consistent with data exfiltration via DNS tunneling.',
    severity: 'high', enabled: true,
    conditions: [{ field: 'event.type', operator: '==', value: 'dns_query' }, { field: 'query_length', operator: '>=', value: '50' }],
    yaml: `title: DNS Tunneling Detection\nid: c3d4e5f6-a7b8-9012-cdef-123456789012\nstatus: experimental\nauthor: Bob Security\ndate: 2025/03/10\nlogsource:\n  category: dns\ndetection:\n  selection:\n    QueryLength: '>=50'\n  frequency:\n    QueryType: 'TXT'\n  condition: selection | count() > 20 within 5m by SourceIp\nlevel: high\ntags:\n  - attack.exfiltration\n  - attack.t1048`,
    mitreIds: ['T1048', 'T1071.004'], mitreTactics: ['Exfiltration', 'Command and Control'],
    createdAt: subDays(new Date(), 45), updatedAt: subDays(new Date(), 1), author: 'Bob Security', triggerCount: 23,
  },
  {
    id: uuidv4(), name: 'Lateral Movement via Pass-the-Hash', description: 'Detects PTH attacks by identifying NTLM authentication from workstations to other systems.',
    severity: 'critical', enabled: true,
    conditions: [{ field: 'auth.type', operator: '==', value: 'NTLM' }, { field: 'event.type', operator: '==', value: 'lateral_movement' }],
    yaml: `title: Lateral Movement via Pass-the-Hash\nid: d4e5f6a7-b8c9-0123-def0-234567890123\nstatus: stable\nauthor: Charlie Hunter\ndate: 2025/01/20\nlogsource:\n  product: windows\n  service: security\ndetection:\n  selection:\n    EventID: 4624\n    LogonType: 3\n    AuthPackageName: 'NTLM'\n    SubjectLogonId: '0x0'\n  condition: selection\nlevel: critical\ntags:\n  - attack.lateral_movement\n  - attack.t1550.002`,
    mitreIds: ['T1550.002', 'T1021.002'], mitreTactics: ['Lateral Movement'],
    createdAt: subDays(new Date(), 120), updatedAt: subDays(new Date(), 10), author: 'Charlie Hunter', triggerCount: 7,
  },
  {
    id: uuidv4(), name: 'LSASS Memory Access', description: 'Detects attempts to dump credentials from LSASS process memory using known tools or techniques.',
    severity: 'critical', enabled: true,
    conditions: [{ field: 'target.process', operator: '==', value: 'lsass.exe' }, { field: 'access.mask', operator: '==', value: '0x1fffff' }],
    yaml: `title: LSASS Memory Access\nid: e5f6a7b8-c9d0-1234-ef01-345678901234\nstatus: stable\nauthor: SecOps Team\ndate: 2025/02/15\nlogsource:\n  product: windows\n  service: security\ndetection:\n  selection:\n    EventID: 4656\n    ObjectName|contains: 'lsass'\n    AccessMask: '0x1fffff'\n  condition: selection\nfalsepositives:\n  - Antivirus software\n  - EDR agents\nlevel: critical\ntags:\n  - attack.credential_access\n  - attack.t1003.001`,
    mitreIds: ['T1003.001'], mitreTactics: ['Credential Access'],
    createdAt: subDays(new Date(), 30), updatedAt: subDays(new Date(), 3), author: 'SecOps Team', triggerCount: 3,
  },
  {
    id: uuidv4(), name: 'Outbound Traffic to Threat Intel Feed', description: 'Correlates outbound connections against threat intelligence IP blocklist. Fires on any match.',
    severity: 'high', enabled: true,
    conditions: [{ field: 'dest_ip', operator: 'in', value: 'threat_intel_feed' }],
    yaml: `title: Outbound Traffic to Threat Intel Feed\nid: f6a7b8c9-d0e1-2345-f012-456789012345\nstatus: stable\nauthor: TI Team\ndate: 2025/03/01\nlogsource:\n  category: network_connection\ndetection:\n  selection:\n    DestinationIp|cidr:\n      - '45.33.0.0/16'\n      - '185.220.0.0/16'\n  condition: selection\nlevel: high\ntags:\n  - attack.command_and_control\n  - attack.t1071`,
    mitreIds: ['T1071', 'T1105'], mitreTactics: ['Command and Control'],
    createdAt: subDays(new Date(), 15), updatedAt: subDays(new Date(), 1), author: 'TI Team', triggerCount: 156,
  },
  {
    id: uuidv4(), name: 'Scheduled Task Creation', description: 'Detects persistence via scheduled task creation, a common attacker technique.',
    severity: 'medium', enabled: true,
    conditions: [{ field: 'process.name', operator: '==', value: 'schtasks.exe' }, { field: 'cmdline', operator: 'contains', value: '/create' }],
    yaml: `title: Scheduled Task Creation\nid: a7b8c9d0-e1f2-3456-0123-567890123456\nstatus: experimental\nauthor: Alice Analyst\ndate: 2025/01/05\nlogsource:\n  category: process_creation\n  product: windows\ndetection:\n  selection:\n    Image|endswith: 'schtasks.exe'\n    CommandLine|contains: '/Create'\n  condition: selection\nfalsepositives:\n  - Software installers\n  - System maintenance tasks\nlevel: medium\ntags:\n  - attack.persistence\n  - attack.t1053.005`,
    mitreIds: ['T1053.005'], mitreTactics: ['Persistence'],
    createdAt: subDays(new Date(), 50), updatedAt: subDays(new Date(), 7), author: 'Alice Analyst', triggerCount: 234,
  },
  {
    id: uuidv4(), name: 'Data Exfiltration via HTTP POST', description: 'Detects large outbound HTTP POST requests that may indicate data theft.',
    severity: 'high', enabled: true,
    conditions: [{ field: 'http.method', operator: '==', value: 'POST' }, { field: 'bytes_sent', operator: '>=', value: '1048576' }],
    yaml: `title: Data Exfiltration via HTTP POST\nid: b8c9d0e1-f2a3-4567-1234-678901234567\nstatus: experimental\nauthor: NetSec Team\ndate: 2025/02/20\nlogsource:\n  category: proxy\ndetection:\n  selection:\n    cs-method: 'POST'\n    sc-bytes: '>=1048576'\n  filter:\n    cs-host|endswith:\n      - '.microsoft.com'\n      - '.amazonaws.com'\n  condition: selection and not filter\nlevel: high\ntags:\n  - attack.exfiltration\n  - attack.t1041`,
    mitreIds: ['T1041', 'T1567'], mitreTactics: ['Exfiltration'],
    createdAt: subDays(new Date(), 25), updatedAt: subDays(new Date(), 4), author: 'NetSec Team', triggerCount: 45,
  },
  {
    id: uuidv4(), name: 'Account Enumeration via LDAP', description: 'Detects LDAP queries enumerating user accounts, often a precursor to targeted attacks.',
    severity: 'medium', enabled: false,
    conditions: [{ field: 'event.type', operator: '==', value: 'ldap_query' }, { field: 'query', operator: 'contains', value: 'samAccountType' }],
    yaml: `title: Account Enumeration via LDAP\nid: c9d0e1f2-a3b4-5678-2345-789012345678\nstatus: experimental\nauthor: Bob Security\ndate: 2025/03/15\nlogsource:\n  product: windows\n  service: security\ndetection:\n  selection:\n    EventID: 4662\n    Properties|contains: 'samAccountType'\n  condition: selection | count() > 10 within 1m by SubjectUserName\nlevel: medium\ntags:\n  - attack.discovery\n  - attack.t1087.002`,
    mitreIds: ['T1087.002'], mitreTactics: ['Discovery'],
    createdAt: subDays(new Date(), 40), updatedAt: subDays(new Date(), 15), author: 'Bob Security', triggerCount: 12,
  },
  {
    id: uuidv4(), name: 'Ransomware File Extension Change', description: 'Detects mass file extension modifications consistent with ransomware encryption activity.',
    severity: 'critical', enabled: true,
    conditions: [{ field: 'event.type', operator: '==', value: 'file_modified' }, { field: 'count', operator: '>=', value: '100' }],
    yaml: `title: Ransomware File Extension Change\nid: d0e1f2a3-b4c5-6789-3456-890123456789\nstatus: stable\nauthor: Charlie Hunter\ndate: 2025/01/30\nlogsource:\n  category: file_event\n  product: windows\ndetection:\n  selection:\n    TargetFilename|endswith:\n      - '.locked'\n      - '.encrypted'\n      - '.crypt'\n      - '.enc'\n  condition: selection | count() > 100 within 1m by ComputerName\nlevel: critical\ntags:\n  - attack.impact\n  - attack.t1486`,
    mitreIds: ['T1486', 'T1490'], mitreTactics: ['Impact'],
    createdAt: subDays(new Date(), 75), updatedAt: subDays(new Date(), 0), author: 'Charlie Hunter', triggerCount: 1,
  },
  {
    id: uuidv4(), name: 'Kerberoasting Attack', description: 'Detects service ticket requests targeting high-value SPNs, consistent with Kerberoasting.',
    severity: 'high', enabled: true,
    conditions: [{ field: 'event.id', operator: '==', value: '4769' }, { field: 'ticket.encryption', operator: '==', value: 'RC4' }],
    yaml: `title: Kerberoasting\nid: e1f2a3b4-c5d6-7890-4567-901234567890\nstatus: stable\nauthor: Diana Hunt\ndate: 2025/02/10\nlogsource:\n  product: windows\n  service: security\ndetection:\n  selection:\n    EventID: 4769\n    TicketOptions: '0x40810000'\n    TicketEncryptionType: '0x17'\n  condition: selection\nlevel: high\ntags:\n  - attack.credential_access\n  - attack.t1558.003`,
    mitreIds: ['T1558.003'], mitreTactics: ['Credential Access'],
    createdAt: subDays(new Date(), 20), updatedAt: subDays(new Date(), 6), author: 'Diana Hunt', triggerCount: 5,
  },
  {
    id: uuidv4(), name: 'Suspicious WMI Execution', description: 'Detects WMI used for remote code execution or lateral movement.',
    severity: 'high', enabled: true,
    conditions: [{ field: 'process.name', operator: '==', value: 'wmic.exe' }, { field: 'cmdline', operator: 'contains', value: '/node:' }],
    yaml: `title: Suspicious WMI Execution\nid: f2a3b4c5-d6e7-8901-5678-012345678901\nstatus: stable\nauthor: Eve Ops\ndate: 2025/01/25\nlogsource:\n  category: process_creation\n  product: windows\ndetection:\n  selection:\n    Image|endswith: 'wmic.exe'\n    CommandLine|contains: '/node:'\n  condition: selection\nlevel: high\ntags:\n  - attack.execution\n  - attack.t1047`,
    mitreIds: ['T1047', 'T1021.006'], mitreTactics: ['Execution', 'Lateral Movement'],
    createdAt: subDays(new Date(), 35), updatedAt: subDays(new Date(), 8), author: 'Eve Ops', triggerCount: 31,
  },
  {
    id: uuidv4(), name: 'New Local Administrator Account', description: 'Detects creation of new local administrator accounts, which may indicate persistence.',
    severity: 'medium', enabled: true,
    conditions: [{ field: 'event.id', operator: '==', value: '4720' }, { field: 'group', operator: '==', value: 'Administrators' }],
    yaml: `title: New Local Admin Account Created\nid: a3b4c5d6-e7f8-9012-6789-123456789012\nstatus: stable\nauthor: SecOps Team\ndate: 2025/03/05\nlogsource:\n  product: windows\n  service: security\ndetection:\n  selection:\n    EventID: 4720\n  add_to_admin:\n    EventID: 4732\n    GroupName: 'Administrators'\n  condition: selection and add_to_admin\nlevel: medium\ntags:\n  - attack.persistence\n  - attack.t1136.001`,
    mitreIds: ['T1136.001'], mitreTactics: ['Persistence'],
    createdAt: subDays(new Date(), 55), updatedAt: subDays(new Date(), 12), author: 'SecOps Team', triggerCount: 18,
  },
  {
    id: uuidv4(), name: 'VPN Login from New Country', description: 'Flags VPN authentications from countries not previously seen for the account.',
    severity: 'medium', enabled: true,
    conditions: [{ field: 'auth.type', operator: '==', value: 'vpn' }, { field: 'geo.country', operator: 'not_in', value: 'user_baseline' }],
    yaml: `title: VPN Login from Unusual Country\nid: b4c5d6e7-f8a9-0123-7890-234567890123\nstatus: experimental\nauthor: Diana Hunt\ndate: 2025/03/20\nlogsource:\n  category: vpn\ndetection:\n  selection:\n    action: 'authenticated'\n  enrichment:\n    geo_country|not_in: 'user_country_baseline'\n  condition: selection and enrichment\nlevel: medium\ntags:\n  - attack.initial_access\n  - attack.t1078.004`,
    mitreIds: ['T1078.004'], mitreTactics: ['Initial Access'],
    createdAt: subDays(new Date(), 10), updatedAt: subDays(new Date(), 2), author: 'Diana Hunt', triggerCount: 67,
  },
  {
    id: uuidv4(), name: 'Memory Injection via Process Hollowing', description: 'Detects process hollowing techniques used to inject malicious code into legitimate processes.',
    severity: 'critical', enabled: false,
    conditions: [{ field: 'event.type', operator: '==', value: 'process_hollow' }],
    yaml: `title: Process Hollowing Detected\nid: c5d6e7f8-a9b0-1234-8901-345678901234\nstatus: experimental\nauthor: Charlie Hunter\ndate: 2025/02/28\nlogsource:\n  category: process_creation\n  product: windows\ndetection:\n  selection:\n    CallTrace|contains:\n      - 'UNKNOWN'\n    TargetImage|contains:\n      - 'svchost.exe'\n      - 'explorer.exe'\n  condition: selection\nlevel: critical\ntags:\n  - attack.defense_evasion\n  - attack.t1055.012`,
    mitreIds: ['T1055.012'], mitreTactics: ['Defense Evasion'],
    createdAt: subDays(new Date(), 5), updatedAt: subDays(new Date(), 1), author: 'Charlie Hunter', triggerCount: 0,
  },
];

export const mockMitreMatrix: MitreTactic[] = [
  {
    id: 'TA0043', name: 'Reconnaissance', techniques: [
      { id: 'T1595', name: 'Active Scanning', covered: false, alertCount: 0 },
      { id: 'T1596', name: 'Search Open Tech Databases', covered: false, alertCount: 0 },
      { id: 'T1598', name: 'Phishing for Information', covered: false, alertCount: 0 },
      { id: 'T1591', name: 'Gather Victim Org Info', covered: false, alertCount: 0 },
    ]
  },
  {
    id: 'TA0042', name: 'Resource Development', techniques: [
      { id: 'T1583', name: 'Acquire Infrastructure', covered: false, alertCount: 0 },
      { id: 'T1584', name: 'Compromise Infrastructure', covered: false, alertCount: 0 },
      { id: 'T1587', name: 'Develop Capabilities', covered: false, alertCount: 0 },
    ]
  },
  {
    id: 'TA0001', name: 'Initial Access', techniques: [
      { id: 'T1078', name: 'Valid Accounts', covered: true, alertCount: 34 },
      { id: 'T1190', name: 'Exploit Public-Facing App', covered: true, alertCount: 12 },
      { id: 'T1566', name: 'Phishing', covered: false, alertCount: 0 },
      { id: 'T1133', name: 'External Remote Services', covered: true, alertCount: 8 },
      { id: 'T1199', name: 'Trusted Relationship', covered: false, alertCount: 0 },
    ]
  },
  {
    id: 'TA0002', name: 'Execution', techniques: [
      { id: 'T1059', name: 'Command and Scripting Interpreter', covered: true, alertCount: 89 },
      { id: 'T1047', name: 'Windows Management Instrumentation', covered: true, alertCount: 31 },
      { id: 'T1204', name: 'User Execution', covered: false, alertCount: 0 },
      { id: 'T1053', name: 'Scheduled Task/Job', covered: true, alertCount: 234 },
      { id: 'T1569', name: 'System Services', covered: false, alertCount: 0 },
    ]
  },
  {
    id: 'TA0003', name: 'Persistence', techniques: [
      { id: 'T1098', name: 'Account Manipulation', covered: true, alertCount: 18 },
      { id: 'T1543', name: 'Create or Modify System Process', covered: true, alertCount: 5 },
      { id: 'T1053', name: 'Scheduled Task', covered: true, alertCount: 67 },
      { id: 'T1136', name: 'Create Account', covered: true, alertCount: 18 },
      { id: 'T1505', name: 'Server Software Component', covered: false, alertCount: 0 },
    ]
  },
  {
    id: 'TA0004', name: 'Privilege Escalation', techniques: [
      { id: 'T1548', name: 'Abuse Elevation Control Mechanism', covered: true, alertCount: 9 },
      { id: 'T1484', name: 'Domain Policy Modification', covered: false, alertCount: 0 },
      { id: 'T1611', name: 'Escape to Host', covered: false, alertCount: 0 },
      { id: 'T1068', name: 'Exploitation for Privilege Escalation', covered: false, alertCount: 0 },
    ]
  },
  {
    id: 'TA0005', name: 'Defense Evasion', techniques: [
      { id: 'T1070', name: 'Indicator Removal', covered: true, alertCount: 7 },
      { id: 'T1055', name: 'Process Injection', covered: true, alertCount: 2 },
      { id: 'T1562', name: 'Impair Defenses', covered: false, alertCount: 0 },
      { id: 'T1036', name: 'Masquerading', covered: false, alertCount: 0 },
      { id: 'T1027', name: 'Obfuscated Files or Information', covered: true, alertCount: 45 },
    ]
  },
  {
    id: 'TA0006', name: 'Credential Access', techniques: [
      { id: 'T1110', name: 'Brute Force', covered: true, alertCount: 412 },
      { id: 'T1003', name: 'OS Credential Dumping', covered: true, alertCount: 3 },
      { id: 'T1558', name: 'Steal or Forge Kerberos Tickets', covered: true, alertCount: 5 },
      { id: 'T1555', name: 'Credentials from Password Stores', covered: false, alertCount: 0 },
      { id: 'T1056', name: 'Input Capture', covered: false, alertCount: 0 },
    ]
  },
  {
    id: 'TA0007', name: 'Discovery', techniques: [
      { id: 'T1087', name: 'Account Discovery', covered: true, alertCount: 12 },
      { id: 'T1046', name: 'Network Service Discovery', covered: true, alertCount: 23 },
      { id: 'T1083', name: 'File and Directory Discovery', covered: false, alertCount: 0 },
      { id: 'T1135', name: 'Network Share Discovery', covered: false, alertCount: 0 },
    ]
  },
  {
    id: 'TA0008', name: 'Lateral Movement', techniques: [
      { id: 'T1021', name: 'Remote Services', covered: true, alertCount: 7 },
      { id: 'T1550', name: 'Use Alternate Authentication Material', covered: true, alertCount: 7 },
      { id: 'T1570', name: 'Lateral Tool Transfer', covered: false, alertCount: 0 },
      { id: 'T1534', name: 'Internal Spearphishing', covered: false, alertCount: 0 },
    ]
  },
  {
    id: 'TA0009', name: 'Collection', techniques: [
      { id: 'T1114', name: 'Email Collection', covered: false, alertCount: 0 },
      { id: 'T1560', name: 'Archive Collected Data', covered: false, alertCount: 0 },
      { id: 'T1005', name: 'Data from Local System', covered: false, alertCount: 0 },
      { id: 'T1074', name: 'Data Staged', covered: false, alertCount: 0 },
    ]
  },
  {
    id: 'TA0011', name: 'Command and Control', techniques: [
      { id: 'T1071', name: 'Application Layer Protocol', covered: true, alertCount: 156 },
      { id: 'T1095', name: 'Non-Application Layer Protocol', covered: false, alertCount: 0 },
      { id: 'T1571', name: 'Non-Standard Port', covered: false, alertCount: 0 },
      { id: 'T1572', name: 'Protocol Tunneling', covered: true, alertCount: 23 },
      { id: 'T1105', name: 'Ingress Tool Transfer', covered: true, alertCount: 15 },
    ]
  },
  {
    id: 'TA0010', name: 'Exfiltration', techniques: [
      { id: 'T1041', name: 'Exfiltration Over C2 Channel', covered: true, alertCount: 45 },
      { id: 'T1048', name: 'Exfiltration Over Alternative Protocol', covered: true, alertCount: 23 },
      { id: 'T1567', name: 'Exfiltration Over Web Service', covered: false, alertCount: 0 },
      { id: 'T1029', name: 'Scheduled Transfer', covered: false, alertCount: 0 },
    ]
  },
  {
    id: 'TA0040', name: 'Impact', techniques: [
      { id: 'T1486', name: 'Data Encrypted for Impact', covered: true, alertCount: 1 },
      { id: 'T1490', name: 'Inhibit System Recovery', covered: true, alertCount: 1 },
      { id: 'T1489', name: 'Service Stop', covered: false, alertCount: 0 },
      { id: 'T1499', name: 'Endpoint Denial of Service', covered: false, alertCount: 0 },
    ]
  },
];

export const MOCK_LOGS = generateLogs(250);
export const MOCK_ALERTS = generateAlerts(65);
