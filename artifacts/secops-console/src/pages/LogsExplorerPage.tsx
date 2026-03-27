import React, { useState, useMemo, useCallback } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { useAppStore } from '@/store';
import { format } from 'date-fns';
import { SeverityBadge } from '@/components/ui/Badge';
import { Search, Download, X, Eye, ChevronUp, ChevronDown, ChevronsLeft, ChevronLeft, ChevronRight, ChevronsRight, SlidersHorizontal } from 'lucide-react';
import { LogEntry } from '@/lib/types';

const SOURCES = ['firewall', 'ids', 'endpoint', 'auth', 'dns', 'proxy'] as const;
const SEVERITIES = ['critical', 'high', 'medium', 'low', 'info'] as const;
const PAGE_SIZE = 50;

type SortKey = 'timestamp' | 'severity' | 'source' | 'eventType';
type SortDir = 'asc' | 'desc';

const SEVERITY_ORDER: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3, info: 4 };

export default function LogsExplorerPage() {
  const { logs } = useAppStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSources, setSelectedSources] = useState<Set<string>>(new Set());
  const [selectedSeverities, setSelectedSeverities] = useState<Set<string>>(new Set());
  const [selectedLog, setSelectedLog] = useState<LogEntry | null>(null);
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState<{ key: SortKey; dir: SortDir }>({ key: 'timestamp', dir: 'desc' });
  const [showFilters, setShowFilters] = useState(false);

  const toggleSource = (s: string) => {
    setSelectedSources(prev => { const n = new Set(prev); n.has(s) ? n.delete(s) : n.add(s); return n; });
    setPage(1);
  };
  const toggleSeverity = (s: string) => {
    setSelectedSeverities(prev => { const n = new Set(prev); n.has(s) ? n.delete(s) : n.add(s); return n; });
    setPage(1);
  };

  const handleSort = (key: SortKey) => {
    setSort(prev => prev.key === key ? { key, dir: prev.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'desc' });
  };

  const filtered = useMemo(() => {
    let result = logs;
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      result = result.filter(l =>
        l.message.toLowerCase().includes(q) ||
        l.sourceIp.includes(q) ||
        l.destIp.includes(q) ||
        l.eventType.toLowerCase().includes(q) ||
        (l.user?.toLowerCase().includes(q) ?? false)
      );
    }
    if (selectedSources.size > 0) result = result.filter(l => selectedSources.has(l.source));
    if (selectedSeverities.size > 0) result = result.filter(l => selectedSeverities.has(l.severity));
    return [...result].sort((a, b) => {
      let cmp = 0;
      if (sort.key === 'timestamp') cmp = a.timestamp.getTime() - b.timestamp.getTime();
      else if (sort.key === 'severity') cmp = SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity];
      else if (sort.key === 'source') cmp = a.source.localeCompare(b.source);
      else if (sort.key === 'eventType') cmp = a.eventType.localeCompare(b.eventType);
      return sort.dir === 'asc' ? cmp : -cmp;
    });
  }, [logs, searchTerm, selectedSources, selectedSeverities, sort]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageData = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const exportCsv = useCallback(() => {
    const headers = ['timestamp', 'severity', 'source', 'eventType', 'sourceIp', 'destIp', 'user', 'message'];
    const rows = filtered.map(l => [
      format(l.timestamp, 'yyyy-MM-dd HH:mm:ss'),
      l.severity, l.source, l.eventType, l.sourceIp, l.destIp,
      l.user || '', `"${l.message.replace(/"/g, '""')}"`,
    ]);
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'secops-logs.csv'; a.click();
    URL.revokeObjectURL(url);
  }, [filtered]);

  const SortIcon = ({ col }: { col: SortKey }) => {
    if (sort.key !== col) return <ChevronDown className="w-3 h-3 opacity-20" />;
    return sort.dir === 'asc' ? <ChevronUp className="w-3 h-3 text-primary" /> : <ChevronDown className="w-3 h-3 text-primary" />;
  };

  const activeFilterCount = selectedSources.size + selectedSeverities.size;

  return (
    <MainLayout>
      <div className="h-full flex flex-col gap-4">
        <div className="flex items-center justify-between flex-shrink-0">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Logs Explorer</h1>
            <p className="text-sm text-muted-foreground">Search and analyze raw telemetry data.</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors border ${showFilters || activeFilterCount > 0 ? 'bg-primary/10 border-primary/30 text-primary' : 'bg-secondary border-border text-foreground hover:bg-secondary/80'}`}
            >
              <SlidersHorizontal className="w-4 h-4" />
              Filters {activeFilterCount > 0 && <span className="bg-primary text-white text-xs px-1.5 py-0.5 rounded-full">{activeFilterCount}</span>}
            </button>
            <button onClick={exportCsv} className="flex items-center gap-2 px-4 py-2 bg-secondary text-foreground hover:bg-secondary/80 rounded-lg text-sm font-medium transition-colors border border-border">
              <Download className="w-4 h-4" /> Export CSV
            </button>
          </div>
        </div>

        <div className="flex-1 flex gap-4 min-h-0">
          {/* Filter Sidebar */}
          {showFilters && (
            <div className="w-56 flex-shrink-0 bg-card border border-border rounded-xl p-4 shadow-lg flex flex-col gap-5 overflow-y-auto">
              <div>
                <div className="text-xs font-semibold uppercase text-muted-foreground tracking-wider mb-3">Source</div>
                <div className="space-y-1.5">
                  {SOURCES.map(s => (
                    <label key={s} className="flex items-center gap-2.5 cursor-pointer group">
                      <input
                        type="checkbox" checked={selectedSources.has(s)}
                        onChange={() => toggleSource(s)}
                        className="w-3.5 h-3.5 rounded border-border accent-primary"
                      />
                      <span className={`text-sm capitalize transition-colors ${selectedSources.has(s) ? 'text-foreground font-medium' : 'text-muted-foreground group-hover:text-foreground'}`}>{s}</span>
                      <span className="ml-auto text-xs text-muted-foreground">{logs.filter(l => l.source === s).length}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div className="border-t border-border pt-4">
                <div className="text-xs font-semibold uppercase text-muted-foreground tracking-wider mb-3">Severity</div>
                <div className="space-y-1.5">
                  {SEVERITIES.map(s => (
                    <label key={s} className="flex items-center gap-2.5 cursor-pointer group">
                      <input
                        type="checkbox" checked={selectedSeverities.has(s)}
                        onChange={() => toggleSeverity(s)}
                        className="w-3.5 h-3.5 rounded border-border accent-primary"
                      />
                      <span className={`text-sm capitalize transition-colors ${selectedSeverities.has(s) ? 'text-foreground font-medium' : 'text-muted-foreground group-hover:text-foreground'}`}>{s}</span>
                      <span className="ml-auto text-xs text-muted-foreground">{logs.filter(l => l.severity === s).length}</span>
                    </label>
                  ))}
                </div>
              </div>
              {activeFilterCount > 0 && (
                <button
                  onClick={() => { setSelectedSources(new Set()); setSelectedSeverities(new Set()); }}
                  className="text-xs text-destructive hover:underline text-left"
                >
                  Clear all filters
                </button>
              )}
            </div>
          )}

          {/* Main Table Area */}
          <div className="flex-1 flex flex-col bg-card border border-border rounded-xl shadow-lg shadow-black/20 overflow-hidden min-w-0">
            <div className="p-3 border-b border-border">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={e => { setSearchTerm(e.target.value); setPage(1); }}
                  placeholder="Search by message, IP, user, event type..."
                  className="w-full bg-input border border-border rounded-lg pl-9 pr-4 py-2 text-sm text-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all font-mono"
                />
                {searchTerm && (
                  <button onClick={() => setSearchTerm('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            <div className="flex-1 overflow-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-muted-foreground bg-secondary/50 sticky top-0 backdrop-blur-md z-10">
                  <tr>
                    {([['timestamp', 'Timestamp'], ['severity', 'Severity'], ['source', 'Source'], ['eventType', 'Event Type']] as [SortKey, string][]).map(([key, label]) => (
                      <th key={key} className="px-3 py-3 font-medium border-b border-border cursor-pointer hover:text-foreground select-none" onClick={() => handleSort(key)}>
                        <div className="flex items-center gap-1">{label}<SortIcon col={key} /></div>
                      </th>
                    ))}
                    <th className="px-3 py-3 font-medium border-b border-border">Source IP</th>
                    <th className="px-3 py-3 font-medium border-b border-border">Dest IP</th>
                    <th className="px-3 py-3 font-medium border-b border-border">Message</th>
                    <th className="px-3 py-3 font-medium border-b border-border w-10"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {pageData.map(log => (
                    <tr
                      key={log.id}
                      className={`hover:bg-secondary/40 transition-colors cursor-pointer ${selectedLog?.id === log.id ? 'bg-primary/5 border-l-2 border-l-primary' : ''}`}
                      onClick={() => setSelectedLog(selectedLog?.id === log.id ? null : log)}
                    >
                      <td className="px-3 py-2.5 text-muted-foreground font-mono text-xs whitespace-nowrap">{format(log.timestamp, 'MMM dd, HH:mm:ss')}</td>
                      <td className="px-3 py-2.5"><SeverityBadge severity={log.severity} /></td>
                      <td className="px-3 py-2.5">
                        <span className="bg-secondary px-1.5 py-0.5 rounded text-xs font-medium uppercase tracking-wide">{log.source}</span>
                      </td>
                      <td className="px-3 py-2.5 text-foreground text-xs">{log.eventType}</td>
                      <td className="px-3 py-2.5 font-mono text-xs text-cyan-400">{log.sourceIp}</td>
                      <td className="px-3 py-2.5 font-mono text-xs text-muted-foreground">{log.destIp}</td>
                      <td className="px-3 py-2.5 text-muted-foreground text-xs truncate max-w-[180px]">{log.message}</td>
                      <td className="px-3 py-2.5">
                        <Eye className="w-3.5 h-3.5 text-primary opacity-60 hover:opacity-100" />
                      </td>
                    </tr>
                  ))}
                  {pageData.length === 0 && (
                    <tr>
                      <td colSpan={8} className="px-4 py-12 text-center text-muted-foreground">
                        No logs match your current filters.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="p-3 border-t border-border bg-secondary/20 flex items-center justify-between text-xs text-muted-foreground">
              <span>{filtered.length} events total · page {page} of {totalPages}</span>
              <div className="flex items-center gap-1">
                <PagBtn onClick={() => setPage(1)} disabled={page === 1}><ChevronsLeft className="w-3.5 h-3.5" /></PagBtn>
                <PagBtn onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}><ChevronLeft className="w-3.5 h-3.5" /></PagBtn>
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  const start = Math.max(1, Math.min(page - 2, totalPages - 4));
                  const p = start + i;
                  return p <= totalPages ? (
                    <PagBtn key={p} onClick={() => setPage(p)} active={p === page}>{p}</PagBtn>
                  ) : null;
                })}
                <PagBtn onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}><ChevronRight className="w-3.5 h-3.5" /></PagBtn>
                <PagBtn onClick={() => setPage(totalPages)} disabled={page === totalPages}><ChevronsRight className="w-3.5 h-3.5" /></PagBtn>
              </div>
            </div>
          </div>

          {/* Log Detail Drawer */}
          {selectedLog && (
            <div className="w-[380px] flex-shrink-0 bg-card border border-border rounded-xl shadow-xl flex flex-col overflow-hidden">
              <div className="p-4 border-b border-border flex justify-between items-center bg-secondary/30">
                <div>
                  <h3 className="font-semibold text-foreground text-sm">Log Details</h3>
                  <p className="text-xs text-muted-foreground font-mono mt-0.5">{selectedLog.id.slice(0, 18)}…</p>
                </div>
                <button onClick={() => setSelectedLog(null)} className="p-1 hover:bg-secondary rounded-md text-muted-foreground transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="p-4 overflow-y-auto flex-1 space-y-5">
                <div>
                  <h4 className="text-xs font-semibold uppercase text-muted-foreground mb-2 tracking-wider">Summary</h4>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    {[
                      ['Time', <span className="font-mono text-xs">{format(selectedLog.timestamp, 'yyyy-MM-dd HH:mm:ss')}</span>],
                      ['Severity', <SeverityBadge severity={selectedLog.severity} />],
                      ['Source IP', <span className="font-mono text-cyan-400 text-xs hover:underline cursor-pointer">{selectedLog.sourceIp}</span>],
                      ['Dest IP', <span className="font-mono text-muted-foreground text-xs">{selectedLog.destIp}</span>],
                      ['Source', <span className="uppercase text-xs bg-secondary px-1.5 py-0.5 rounded font-medium text-foreground">{selectedLog.source}</span>],
                      ['Event', <span className="text-xs text-foreground">{selectedLog.eventType}</span>],
                      ...(selectedLog.user ? [['User', <span className="text-xs text-foreground">{selectedLog.user}</span>]] : []),
                    ].map(([label, val], i) => (
                      <div key={i}>
                        <div className="text-muted-foreground text-xs mb-1">{label as string}</div>
                        {val as React.ReactNode}
                      </div>
                    ))}
                  </div>
                </div>

                {selectedLog.tags.length > 0 && (
                  <div>
                    <h4 className="text-xs font-semibold uppercase text-muted-foreground mb-2 tracking-wider">Tags</h4>
                    <div className="flex flex-wrap gap-1.5">
                      {selectedLog.tags.map(t => (
                        <span key={t} className="text-xs px-2 py-0.5 bg-secondary border border-border/60 rounded-full text-muted-foreground">{t}</span>
                      ))}
                    </div>
                  </div>
                )}

                {selectedLog.ruleMatched && (
                  <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3">
                    <div className="text-xs font-medium text-amber-400 mb-1">Rule Match</div>
                    <div className="text-sm text-foreground">{selectedLog.ruleMatched}</div>
                  </div>
                )}

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
                    <code className="text-xs font-mono text-green-400 break-all">{selectedLog.rawLog}</code>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </MainLayout>
  );
}

function PagBtn({ onClick, disabled, active, children }: { onClick: () => void; disabled?: boolean; active?: boolean; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`w-7 h-7 flex items-center justify-center rounded text-xs transition-colors ${active ? 'bg-primary text-white' : 'text-muted-foreground hover:bg-secondary hover:text-foreground'} disabled:opacity-30 disabled:cursor-not-allowed`}
    >
      {children}
    </button>
  );
}
