import React, { useState, useEffect, useRef } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Database, Server, Wifi, Activity, Plus, CheckCircle2, AlertTriangle, XCircle, ChevronDown, ChevronRight, Eye } from 'lucide-react';

interface Source {
  id: number;
  name: string;
  type: string;
  status: 'active' | 'warning' | 'error';
  rate: string;
  latency: string;
  format: string;
  host: string;
  port: number;
  schema: Record<string, string>;
}

const INITIAL_SOURCES: Source[] = [
  { id: 1, name: 'AWS CloudTrail', type: 'Cloud', status: 'active', rate: '2.4k', latency: '45ms', format: 'JSON', host: 's3://log-bucket', port: 443, schema: { eventVersion: 'string', eventSource: 'string', eventName: 'string', userIdentity: 'object', requestParameters: 'object', responseElements: 'object', awsRegion: 'string', eventTime: 'timestamp' } },
  { id: 2, name: 'Palo Alto Firewall', type: 'Network', status: 'active', rate: '14.2k', latency: '12ms', format: 'Syslog (CEF)', host: '10.0.0.1', port: 514, schema: { src_ip: 'ip', dst_ip: 'ip', src_port: 'integer', dst_port: 'integer', proto: 'string', action: 'string', bytes_sent: 'integer', bytes_recv: 'integer' } },
  { id: 3, name: 'CrowdStrike EDR', type: 'Endpoint', status: 'active', rate: '8.1k', latency: '35ms', format: 'JSON', host: 'api.crowdstrike.com', port: 443, schema: { event_type: 'string', device_id: 'string', process_name: 'string', command_line: 'string', user_name: 'string', event_time: 'timestamp', sha256: 'string' } },
  { id: 4, name: 'Okta Auth', type: 'Identity', status: 'warning', rate: '1.2k', latency: '450ms', format: 'JSON', host: 'logs.okta.com', port: 443, schema: { actor: 'object', client: 'object', outcome: 'object', eventType: 'string', published: 'timestamp', displayMessage: 'string' } },
  { id: 5, name: 'Legacy VPN Logs', type: 'Network', status: 'error', rate: '0', latency: '-', format: 'Plain text', host: 'vpn.corp.local', port: 1514, schema: { message: 'string' } },
];

const LIVE_ENTRIES = [
  '[cloudtrail] 2026-03-27T10:44:01Z PutObject s3://prod-bucket by IAM:alice@corp.com',
  '[paloalto] 2026-03-27T10:44:02Z DENY TCP 10.0.5.22:49832 -> 45.33.22.11:443 bytes=1024',
  '[crowdstrike] 2026-03-27T10:44:03Z ProcessCreate powershell.exe -enc SQBFAFgA on DESKTOP-A7X2',
  '[okta] 2026-03-27T10:44:04Z user.authentication.sso FAILURE alice.smith@corp.com from 185.22.0.1',
  '[paloalto] 2026-03-27T10:44:05Z ALLOW HTTP 192.168.1.5:52341 -> 8.8.8.8:53 query=malware.io',
  '[crowdstrike] 2026-03-27T10:44:06Z NetworkConnect lsass.exe -> 10.0.1.50:445 suspicious_src=true',
  '[cloudtrail] 2026-03-27T10:44:07Z AssumeRole arn:aws:iam::123456789:role/AdminRole success',
  '[paloalto] 2026-03-27T10:44:08Z DROP UDP 10.1.2.3:1024 -> 8.8.4.4:53 threat_id=9821',
  '[okta] 2026-03-27T10:44:09Z user.session.start SUCCESS bob.jones@corp.com from 10.100.1.2',
  '[crowdstrike] 2026-03-27T10:44:10Z FileCreated C:\\Temp\\beacon.exe sha256=3d9f2c4a1b7e8f5a',
];

const statusIcon = (s: Source['status']) => ({
  active: <><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60" /><span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500" /></>,
  warning: <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500" />,
  error: <span className="relative inline-flex rounded-full h-3 w-3 bg-destructive" />,
}[s]);

const statusLabel = { active: 'Active', warning: 'Degraded', error: 'Offline' };

export default function LogIngestionPage() {
  const [sources, setSources] = useState<Source[]>(INITIAL_SOURCES);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [schemaViewId, setSchemaViewId] = useState<number | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newType, setNewType] = useState('Network');
  const [liveLog, setLiveLog] = useState<string[]>([]);
  const [bufferUsage, setBufferUsage] = useState(12);
  const [indexingRate, setIndexingRate] = useState(25.9);
  const logRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let idx = 0;
    const interval = setInterval(() => {
      const entry = LIVE_ENTRIES[idx % LIVE_ENTRIES.length];
      setLiveLog(prev => [...prev.slice(-40), entry]);
      setBufferUsage(prev => Math.min(95, prev + (Math.random() * 2 - 0.5)));
      setIndexingRate(prev => Math.max(20, Math.min(35, prev + (Math.random() * 2 - 1))));
      idx++;
    }, 900);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [liveLog]);

  const addSource = () => {
    if (!newName.trim()) return;
    const newSource: Source = {
      id: Date.now(),
      name: newName,
      type: newType,
      status: 'warning',
      rate: '0',
      latency: '-',
      format: 'JSON',
      host: 'pending-config.local',
      port: 514,
      schema: { message: 'string', timestamp: 'timestamp' },
    };
    setSources(prev => [...prev, newSource]);
    setNewName('');
    setAddOpen(false);
  };

  return (
    <MainLayout>
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-3">
            <Database className="w-8 h-8 text-primary" /> Data Ingestion
          </h1>
          <p className="text-muted-foreground mt-1">Manage log pipelines, connectors, and data flow health.</p>
        </div>

        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Active Connectors', value: sources.filter(s => s.status === 'active').length, color: 'text-emerald-400' },
            { label: 'Total EPS', value: sources.filter(s => s.status === 'active').reduce((a, s) => a + parseFloat(s.rate.replace('k', '')) * 1000, 0).toLocaleString(), color: 'text-primary' },
            { label: 'Avg Latency', value: '35ms', color: 'text-foreground' },
          ].map(s => (
            <div key={s.label} className="bg-card border border-border rounded-xl p-4 shadow-lg">
              <div className="text-xs text-muted-foreground mb-1">{s.label}</div>
              <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-card border border-border rounded-xl shadow-lg p-5">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-semibold text-foreground">Active Connectors</h3>
                <button onClick={() => setAddOpen(!addOpen)} className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-primary-foreground text-sm font-medium rounded-lg hover:bg-primary/90 transition-colors">
                  <Plus className="w-4 h-4" /> Add Source
                </button>
              </div>

              {addOpen && (
                <div className="mb-4 p-4 bg-secondary/30 border border-border rounded-xl space-y-3">
                  <h4 className="font-medium text-foreground text-sm">New Log Source</h4>
                  <div className="grid grid-cols-2 gap-3">
                    <input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Source Name" className="w-full bg-input border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary" />
                    <select value={newType} onChange={e => setNewType(e.target.value)} className="w-full bg-input border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary appearance-none">
                      {['Network', 'Cloud', 'Endpoint', 'Identity', 'Application'].map(t => <option key={t}>{t}</option>)}
                    </select>
                  </div>
                  <div className="flex gap-2 justify-end">
                    <button onClick={() => setAddOpen(false)} className="px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground">Cancel</button>
                    <button onClick={addSource} disabled={!newName.trim()} className="px-4 py-1.5 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary/90 disabled:opacity-50 transition-colors">Add</button>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                {sources.map(source => (
                  <div key={source.id} className="border border-border rounded-xl overflow-hidden">
                    <div className="flex items-center gap-4 p-4 hover:bg-secondary/30 transition-colors cursor-pointer" onClick={() => setExpandedId(expandedId === source.id ? null : source.id)}>
                      <div className="p-2 bg-background rounded-lg border border-border flex-shrink-0">
                        <Server className="w-5 h-5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-foreground">{source.name}</div>
                        <div className="text-xs text-muted-foreground">{source.type} · {source.format}</div>
                      </div>
                      <div className="flex items-center gap-6 flex-shrink-0">
                        <div className="text-center hidden sm:block">
                          <div className="text-xs text-muted-foreground mb-0.5">EPS</div>
                          <div className="font-mono text-sm text-foreground">{source.rate}</div>
                        </div>
                        <div className="text-center hidden sm:block">
                          <div className="text-xs text-muted-foreground mb-0.5">Latency</div>
                          <div className={`font-mono text-sm ${source.status === 'warning' ? 'text-amber-400' : 'text-foreground'}`}>{source.latency}</div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="relative flex h-3 w-3 flex-shrink-0">{statusIcon(source.status)}</span>
                          <span className="text-sm font-medium text-muted-foreground w-16 hidden sm:block">{statusLabel[source.status]}</span>
                        </div>
                        {expandedId === source.id ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
                      </div>
                    </div>

                    {expandedId === source.id && (
                      <div className="border-t border-border bg-secondary/10 p-4 space-y-3">
                        <div className="grid grid-cols-3 gap-3 text-sm">
                          <div><span className="text-muted-foreground text-xs">Host</span><div className="font-mono text-xs text-foreground mt-0.5">{source.host}</div></div>
                          <div><span className="text-muted-foreground text-xs">Port</span><div className="font-mono text-xs text-foreground mt-0.5">{source.port}</div></div>
                          <div><span className="text-muted-foreground text-xs">Format</span><div className="text-xs text-foreground mt-0.5">{source.format}</div></div>
                        </div>
                        {source.status === 'error' && (
                          <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 text-xs text-destructive flex items-center gap-2">
                            <XCircle className="w-4 h-4 flex-shrink-0" />
                            Connection failed: ECONNREFUSED {source.host}:{source.port}. Check network path and firewall rules.
                          </div>
                        )}
                        {source.status === 'warning' && (
                          <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3 text-xs text-amber-400 flex items-center gap-2">
                            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                            High latency detected ({source.latency}). Parser may be overloaded or network congestion present.
                          </div>
                        )}
                        <div>
                          <button
                            onClick={() => setSchemaViewId(schemaViewId === source.id ? null : source.id)}
                            className="flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 transition-colors"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            {schemaViewId === source.id ? 'Hide' : 'View'} Field Schema
                          </button>
                          {schemaViewId === source.id && (
                            <div className="mt-2 bg-[#050810] border border-border rounded-lg p-3 grid grid-cols-2 gap-x-4 gap-y-1">
                              {Object.entries(source.schema).map(([field, type]) => (
                                <div key={field} className="flex items-center justify-between text-xs py-0.5 border-b border-border/30">
                                  <span className="font-mono text-green-400">{field}</span>
                                  <span className="text-muted-foreground italic">{type}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-5">
            <div className="bg-card border border-border rounded-xl shadow-lg p-5">
              <div className="flex items-center gap-2 mb-4">
                <Activity className="w-4 h-4 text-primary" />
                <h3 className="font-semibold text-foreground">Pipeline Health</h3>
              </div>
              <div className="space-y-5">
                <div>
                  <div className="flex justify-between text-xs mb-2">
                    <span className="text-muted-foreground">Kafka Buffer Usage</span>
                    <span className={`font-mono font-medium ${bufferUsage > 70 ? 'text-amber-400' : 'text-emerald-400'}`}>{bufferUsage.toFixed(0)}%</span>
                  </div>
                  <div className="w-full bg-secondary rounded-full h-2">
                    <div className={`h-2 rounded-full transition-all duration-700 ${bufferUsage > 70 ? 'bg-amber-500' : 'bg-emerald-500'}`} style={{ width: `${bufferUsage}%` }} />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-xs mb-2">
                    <span className="text-muted-foreground">Indexing Rate</span>
                    <span className="text-primary font-mono font-medium">{indexingRate.toFixed(1)}k/s</span>
                  </div>
                  <div className="w-full bg-secondary rounded-full h-2">
                    <div className="bg-primary h-2 rounded-full transition-all duration-700" style={{ width: `${(indexingRate / 40) * 100}%` }} />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-xs mb-2">
                    <span className="text-muted-foreground">Parser Drop Rate</span>
                    <span className="text-amber-500 font-mono font-medium">0.4%</span>
                  </div>
                  <div className="w-full bg-secondary rounded-full h-2">
                    <div className="bg-amber-500 h-2 rounded-full" style={{ width: '4%' }} />
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-primary/5 border border-primary/20 rounded-xl shadow-lg p-5">
              <div className="flex items-center gap-2 mb-3">
                <Wifi className="w-4 h-4 text-primary" />
                <h3 className="font-semibold text-primary text-sm">Live Event Stream</h3>
                <span className="ml-auto flex items-center gap-1 text-xs text-emerald-400">
                  <span className="relative flex h-2 w-2"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" /><span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" /></span>
                  LIVE
                </span>
              </div>
              <div ref={logRef} className="bg-[#050810] p-3 rounded-lg border border-border h-64 overflow-y-auto">
                <div className="space-y-1 font-mono text-[11px] text-muted-foreground">
                  {liveLog.map((entry, i) => (
                    <div key={i} className={`leading-relaxed ${i === liveLog.length - 1 ? 'text-green-400' : ''}`}>{entry}</div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
