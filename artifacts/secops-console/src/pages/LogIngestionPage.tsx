import React from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Database, Server, Wifi, Activity } from 'lucide-react';

const SOURCES = [
  { id: 1, name: 'AWS CloudTrail', type: 'Cloud', status: 'active', rate: '2.4k', latency: '45ms' },
  { id: 2, name: 'Palo Alto Firewall', type: 'Network', status: 'active', rate: '14.2k', latency: '12ms' },
  { id: 3, name: 'CrowdStrike EDR', type: 'Endpoint', status: 'active', rate: '8.1k', latency: '35ms' },
  { id: 4, name: 'Okta Auth', type: 'Identity', status: 'warning', rate: '1.2k', latency: '450ms' },
  { id: 5, name: 'Legacy VPN Logs', type: 'Network', status: 'error', rate: '0', latency: '-' },
];

export default function LogIngestionPage() {
  return (
    <MainLayout>
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-3">
            <Database className="w-8 h-8 text-primary" />
            Data Ingestion
          </h1>
          <p className="text-muted-foreground mt-1">Manage log pipelines, parsers, and data flow health.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-card border border-border rounded-xl shadow-lg p-5">
              <div className="flex justify-between items-center mb-6">
                <h3 className="font-semibold text-foreground">Active Connectors</h3>
                <button className="px-4 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-lg hover:bg-primary/90 transition-colors">
                  Add Source
                </button>
              </div>

              <div className="space-y-3">
                {SOURCES.map(source => (
                  <div key={source.id} className="flex items-center justify-between p-4 bg-secondary/30 border border-border rounded-lg hover:bg-secondary/50 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className="p-2 bg-background rounded-lg border border-border">
                        <Server className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <div className="font-semibold text-foreground">{source.name}</div>
                        <div className="text-xs text-muted-foreground">{source.type}</div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-8">
                      <div className="text-center">
                        <div className="text-xs text-muted-foreground mb-1">EPS</div>
                        <div className="font-mono text-sm text-foreground">{source.rate}</div>
                      </div>
                      <div className="text-center">
                        <div className="text-xs text-muted-foreground mb-1">Latency</div>
                        <div className="font-mono text-sm text-foreground">{source.latency}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="relative flex h-3 w-3">
                          {source.status === 'active' && (
                            <>
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                            </>
                          )}
                          {source.status === 'warning' && (
                            <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500"></span>
                          )}
                          {source.status === 'error' && (
                            <span className="relative inline-flex rounded-full h-3 w-3 bg-destructive"></span>
                          )}
                        </span>
                        <span className="text-sm capitalize font-medium text-muted-foreground w-16">{source.status}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-card border border-border rounded-xl shadow-lg p-5">
              <h3 className="font-semibold text-foreground mb-4">Pipeline Health</h3>
              <div className="space-y-6">
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-muted-foreground">Kafka Buffer Usage</span>
                    <span className="text-emerald-400 font-mono">12%</span>
                  </div>
                  <div className="w-full bg-secondary rounded-full h-2">
                    <div className="bg-emerald-500 h-2 rounded-full" style={{ width: '12%' }}></div>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-muted-foreground">ElasticSearch Indexing</span>
                    <span className="text-primary font-mono">25.9k/s</span>
                  </div>
                  <div className="w-full bg-secondary rounded-full h-2">
                    <div className="bg-primary h-2 rounded-full" style={{ width: '65%' }}></div>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-muted-foreground">Parser Drop Rate</span>
                    <span className="text-amber-500 font-mono">0.4%</span>
                  </div>
                  <div className="w-full bg-secondary rounded-full h-2">
                    <div className="bg-amber-500 h-2 rounded-full" style={{ width: '4%' }}></div>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-primary/10 border border-primary/20 rounded-xl shadow-lg p-5">
              <div className="flex items-center gap-3 mb-4">
                <Wifi className="w-5 h-5 text-primary" />
                <h3 className="font-semibold text-primary">Live Stream</h3>
              </div>
              <div className="bg-[#050810] p-3 rounded-lg border border-border h-48 overflow-hidden relative">
                <div className="absolute inset-0 bg-gradient-to-b from-transparent to-[#050810] z-10 pointer-events-none"></div>
                <div className="font-mono text-xs text-muted-foreground space-y-1 opacity-70 animate-pulse">
                  <div>[syslog] Accepted password for root from 192.168.1.1</div>
                  <div>[auth] AWS IAM assume role success arn:aws:iam::123</div>
                  <div>{'[fw] Drop TCP 10.0.0.5:443 -> 45.33.22.1:80'}</div>
                  <div>[edr] Process injected remote thread into explorer.exe</div>
                  <div>[dns] Query returned NXDOMAIN for random-string.com</div>
                  <div>[syslog] Accepted password for root from 192.168.1.1</div>
                  <div>{'[fw] Drop TCP 10.0.0.5:443 -> 45.33.22.1:80'}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
