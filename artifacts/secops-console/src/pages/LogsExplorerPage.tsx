import React, { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { useAppStore } from '@/store';
import { format } from 'date-fns';
import { SeverityBadge } from '@/components/ui/Badge';
import { Search, Filter, Download, X, Eye } from 'lucide-react';
import { LogEntry } from '@/lib/types';

export default function LogsExplorerPage() {
  const { logs } = useAppStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLog, setSelectedLog] = useState<LogEntry | null>(null);

  const filteredLogs = logs.filter(log => 
    log.message.toLowerCase().includes(searchTerm.toLowerCase()) || 
    log.sourceIp.includes(searchTerm) ||
    log.destIp.includes(searchTerm) ||
    log.eventType.toLowerCase().includes(searchTerm.toLowerCase())
  ).slice(0, 100); // limit for UI perf

  return (
    <MainLayout>
      <div className="h-full flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Logs Explorer</h1>
            <p className="text-sm text-muted-foreground">Search and analyze raw telemetry data.</p>
          </div>
          <div className="flex gap-3">
            <button className="flex items-center gap-2 px-4 py-2 bg-secondary text-foreground hover:bg-secondary/80 rounded-lg text-sm font-medium transition-colors">
              <Filter className="w-4 h-4" /> Filter
            </button>
            <button className="flex items-center gap-2 px-4 py-2 bg-secondary text-foreground hover:bg-secondary/80 rounded-lg text-sm font-medium transition-colors">
              <Download className="w-4 h-4" /> Export CSV
            </button>
          </div>
        </div>

        <div className="flex-1 flex gap-6 min-h-0">
          {/* Main Table Area */}
          <div className="flex-1 flex flex-col bg-card border border-border rounded-xl shadow-lg shadow-black/20 overflow-hidden">
            <div className="p-4 border-b border-border flex gap-4">
              <div className="relative flex-1">
                <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input 
                  type="text" 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search logs using KQL-like syntax (e.g., src_ip:192.168.1.1 AND severity:high)..."
                  className="w-full bg-input border border-border rounded-lg pl-10 pr-4 py-2.5 text-sm text-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all font-mono"
                />
              </div>
            </div>

            <div className="flex-1 overflow-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-muted-foreground bg-secondary/50 sticky top-0 backdrop-blur-md">
                  <tr>
                    <th className="px-4 py-3 font-medium border-b border-border">Timestamp</th>
                    <th className="px-4 py-3 font-medium border-b border-border">Severity</th>
                    <th className="px-4 py-3 font-medium border-b border-border">Source</th>
                    <th className="px-4 py-3 font-medium border-b border-border">Event Type</th>
                    <th className="px-4 py-3 font-medium border-b border-border">Source IP</th>
                    <th className="px-4 py-3 font-medium border-b border-border">Dest IP</th>
                    <th className="px-4 py-3 font-medium border-b border-border">Message</th>
                    <th className="px-4 py-3 font-medium border-b border-border"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {filteredLogs.map(log => (
                    <tr 
                      key={log.id} 
                      className={`hover:bg-secondary/40 transition-colors cursor-pointer ${selectedLog?.id === log.id ? 'bg-secondary/60' : ''}`}
                      onClick={() => setSelectedLog(log)}
                    >
                      <td className="px-4 py-3 text-muted-foreground font-mono text-xs whitespace-nowrap">
                        {format(log.timestamp, 'MMM dd, HH:mm:ss')}
                      </td>
                      <td className="px-4 py-3"><SeverityBadge severity={log.severity} /></td>
                      <td className="px-4 py-3">
                        <span className="bg-secondary px-2 py-1 rounded text-xs font-medium uppercase tracking-wider">{log.source}</span>
                      </td>
                      <td className="px-4 py-3 text-foreground">{log.eventType}</td>
                      <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{log.sourceIp}</td>
                      <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{log.destIp}</td>
                      <td className="px-4 py-3 text-muted-foreground truncate max-w-[200px]">{log.message}</td>
                      <td className="px-4 py-3 text-right">
                        <button className="text-primary hover:text-primary/80 p-1 rounded hover:bg-primary/10 transition-colors">
                          <Eye className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {filteredLogs.length === 0 && (
                    <tr>
                      <td colSpan={8} className="px-4 py-12 text-center text-muted-foreground">
                        No logs found matching your criteria.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <div className="p-3 border-t border-border bg-secondary/20 text-xs text-muted-foreground flex justify-between">
              <span>Showing {filteredLogs.length} events</span>
              <span>Sorted by Time (Desc)</span>
            </div>
          </div>

          {/* Details Drawer */}
          {selectedLog && (
            <div className="w-[400px] bg-card border border-border rounded-xl shadow-xl flex flex-col animate-in slide-in-from-right-8 duration-300">
              <div className="p-4 border-b border-border flex justify-between items-center bg-secondary/30">
                <h3 className="font-semibold text-foreground">Log Details</h3>
                <button 
                  onClick={() => setSelectedLog(null)}
                  className="p-1 hover:bg-secondary rounded-md text-muted-foreground transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-4 overflow-y-auto flex-1 space-y-6">
                
                <div>
                  <h4 className="text-xs font-semibold uppercase text-muted-foreground mb-2 tracking-wider">Summary</h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <div className="text-muted-foreground mb-1">Time</div>
                      <div className="font-mono text-foreground">{format(selectedLog.timestamp, 'yyyy-MM-dd HH:mm:ss')}</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground mb-1">Severity</div>
                      <SeverityBadge severity={selectedLog.severity} />
                    </div>
                    <div>
                      <div className="text-muted-foreground mb-1">Source IP</div>
                      <div className="font-mono text-primary cursor-pointer hover:underline">{selectedLog.sourceIp}</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground mb-1">Dest IP</div>
                      <div className="font-mono text-primary cursor-pointer hover:underline">{selectedLog.destIp}</div>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="text-xs font-semibold uppercase text-muted-foreground mb-2 tracking-wider">Parsed Fields</h4>
                  <div className="bg-secondary/30 rounded-lg border border-border p-3">
                    <pre className="text-xs font-mono text-foreground whitespace-pre-wrap break-all">
                      {JSON.stringify(selectedLog.parsed, null, 2)}
                    </pre>
                  </div>
                </div>

                <div>
                  <h4 className="text-xs font-semibold uppercase text-muted-foreground mb-2 tracking-wider">Raw Log</h4>
                  <div className="bg-[#050810] rounded-lg border border-border p-3 overflow-x-auto">
                    <code className="text-xs font-mono text-green-400 break-all">
                      {selectedLog.rawLog}
                    </code>
                  </div>
                </div>

                <div className="pt-4 border-t border-border flex justify-end">
                  <button className="px-4 py-2 bg-primary text-primary-foreground font-semibold rounded-lg hover:bg-primary/90 transition-all shadow-lg shadow-primary/20">
                    Investigate IP
                  </button>
                </div>

              </div>
            </div>
          )}
        </div>
      </div>
    </MainLayout>
  );
}
