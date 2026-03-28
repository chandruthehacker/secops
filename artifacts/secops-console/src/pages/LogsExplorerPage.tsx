import React, { useState, useMemo, useCallback } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { useQuery } from '@tanstack/react-query';
import { logsApi, normalizeLog } from '@/lib/api';
import { format } from 'date-fns';
import { SeverityBadge } from '@/components/ui/Badge';
import { Search, X, Eye, ChevronUp, ChevronDown, ChevronsLeft, ChevronLeft, ChevronRight, ChevronsRight, SlidersHorizontal, Loader2, Database } from 'lucide-react';
import type { LogEntry } from '@/lib/types';

const SOURCES = ['firewall', 'ids', 'endpoint', 'auth', 'dns', 'proxy'] as const;
const SEVERITIES = ['critical', 'high', 'medium', 'low', 'info'] as const;
const PAGE_SIZE = 50;

type SortKey = 'timestamp' | 'severity' | 'source' | 'eventType';
type SortDir = 'asc' | 'desc';
const SEVERITY_ORDER: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3, info: 4 };

export default function LogsExplorerPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedSources, setSelectedSources] = useState<Set<string>>(new Set());
  const [selectedSeverities, setSelectedSeverities] = useState<Set<string>>(new Set());
  const [selectedLog, setSelectedLog] = useState<LogEntry | null>(null);
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState<{ key: SortKey; dir: SortDir }>({ key: 'timestamp', dir: 'desc' });
  const [showFilters, setShowFilters] = useState(false);

  // Debounce search
  const handleSearch = useCallback((val: string) => {
    setSearchTerm(val);
    clearTimeout((window as any)._logSearchTimeout);
    (window as any)._logSearchTimeout = setTimeout(() => {
      setDebouncedSearch(val);
      setPage(1);
    }, 400);
  }, []);

  const queryParams = useMemo(() => {
    const p: Record<string, string | number> = { page, limit: PAGE_SIZE };
    if (selectedSources.size === 1) p.source = [...selectedSources][0];
    if (selectedSeverities.size === 1) p.severity = [...selectedSeverities][0];
    if (debouncedSearch.length >= 2) p.search = debouncedSearch;
    return p;
  }, [page, selectedSources, selectedSeverities, debouncedSearch]);

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['logs', queryParams],
    queryFn: () => logsApi.list(queryParams).then(r => r.data),
  });

  const logs = useMemo(() =>
    (data?.logs ?? []).map(normalizeLog),
    [data]
  );

  // Client-side sort (API returns newest first; user can sort by other fields)
  const sortedLogs = useMemo(() => {
    return [...logs].sort((a, b) => {
      let cmp = 0;
      if (sort.key === 'timestamp') cmp = a.timestamp.getTime() - b.timestamp.getTime();
      else if (sort.key === 'severity') cmp = SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity];
      else if (sort.key === 'source') cmp = a.source.localeCompare(b.source);
      else if (sort.key === 'eventType') cmp = a.eventType.localeCompare(b.eventType);
      return sort.dir === 'asc' ? cmp : -cmp;
    });
  }, [logs, sort]);

  const totalPages = Math.ceil((data?.total ?? 0) / PAGE_SIZE);

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

  const SortIcon = ({ col }: { col: SortKey }) => (
    sort.key === col
      ? sort.dir === 'asc' ? <ChevronUp className="w-3 h-3 text-primary" /> : <ChevronDown className="w-3 h-3 text-primary" />
      : <ChevronUp className="w-3 h-3 opacity-20" />
  );

  return (
    <MainLayout>
      <div className="flex flex-col gap-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-3">
              <Database className="w-7 h-7 text-primary" /> Logs Explorer
            </h1>
            <p className="text-muted-foreground mt-1 text-sm">
              Search and investigate raw security events.
              {data && <span className="ml-2 font-mono text-xs text-primary">{data.total.toLocaleString()} total events</span>}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {isFetching && !isLoading && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium transition-colors ${showFilters ? 'bg-primary/10 border-primary/30 text-primary' : 'bg-secondary border-border text-muted-foreground hover:text-foreground'}`}
            >
              <SlidersHorizontal className="w-4 h-4" /> Filters
              {(selectedSources.size > 0 || selectedSeverities.size > 0) && (
                <span className="w-2 h-2 rounded-full bg-primary flex-shrink-0" />
              )}
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder='Search events — type at least 2 characters (message, IP, event type)...'
            value={searchTerm}
            onChange={e => handleSearch(e.target.value)}
            className="w-full bg-input border border-border rounded-lg pl-9 pr-4 py-2.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>

        {/* Filter Panel */}
        {showFilters && (
          <div className="bg-card border border-border rounded-xl p-4 flex flex-col md:flex-row gap-5">
            <div className="flex-1">
              <div className="text-xs font-semibold uppercase text-muted-foreground tracking-wider mb-2">Source</div>
              <div className="flex flex-wrap gap-1.5">
                {SOURCES.map(s => (
                  <button
                    key={s}
                    onClick={() => toggleSource(s)}
                    className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${selectedSources.has(s) ? 'bg-primary/10 border-primary/40 text-primary' : 'border-border text-muted-foreground hover:text-foreground hover:border-border/80'}`}
                  >
                    {s}
                  </button>
                ))}
                {selectedSources.size > 0 && (
                  <button onClick={() => setSelectedSources(new Set())} className="text-xs text-muted-foreground hover:text-foreground ml-1">Clear</button>
                )}
              </div>
            </div>
            <div className="flex-1">
              <div className="text-xs font-semibold uppercase text-muted-foreground tracking-wider mb-2">Severity</div>
              <div className="flex flex-wrap gap-1.5">
                {SEVERITIES.map(s => (
                  <button
                    key={s}
                    onClick={() => toggleSeverity(s)}
                    className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${selectedSeverities.has(s) ? 'bg-primary/10 border-primary/40 text-primary' : 'border-border text-muted-foreground hover:text-foreground hover:border-border/80'}`}
                  >
                    {s}
                  </button>
                ))}
                {selectedSeverities.size > 0 && (
                  <button onClick={() => setSelectedSeverities(new Set())} className="text-xs text-muted-foreground hover:text-foreground ml-1">Clear</button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Table */}
        <div className="bg-card border border-border rounded-xl shadow-lg shadow-black/20 flex flex-col overflow-hidden">
          <div className="overflow-x-auto">
            {isLoading ? (
              <div className="flex items-center justify-center py-16 gap-3 text-muted-foreground">
                <Loader2 className="w-6 h-6 animate-spin text-primary" /> Loading events…
              </div>
            ) : sortedLogs.length === 0 ? (
              <div className="py-16 text-center text-muted-foreground">
                <Database className="w-10 h-10 mx-auto mb-3 opacity-20" />
                <p className="text-sm font-medium">No log events found</p>
                <p className="text-xs mt-1">
                  {searchTerm || selectedSources.size > 0 || selectedSeverities.size > 0
                    ? 'Try adjusting your filters'
                    : 'Ingest logs via POST /api/ingest-log to see events here'}
                </p>
              </div>
            ) : (
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-muted-foreground bg-secondary/50 border-b border-border uppercase tracking-wider">
                  <tr>
                    <th className="px-4 py-3 w-32 cursor-pointer hover:text-foreground" onClick={() => handleSort('timestamp')}>
                      <div className="flex items-center gap-1">Timestamp <SortIcon col="timestamp" /></div>
                    </th>
                    <th className="px-4 py-3 cursor-pointer hover:text-foreground" onClick={() => handleSort('source')}>
                      <div className="flex items-center gap-1">Source <SortIcon col="source" /></div>
                    </th>
                    <th className="px-4 py-3 cursor-pointer hover:text-foreground" onClick={() => handleSort('severity')}>
                      <div className="flex items-center gap-1">Severity <SortIcon col="severity" /></div>
                    </th>
                    <th className="px-4 py-3 cursor-pointer hover:text-foreground" onClick={() => handleSort('eventType')}>
                      <div className="flex items-center gap-1">Event Type <SortIcon col="eventType" /></div>
                    </th>
                    <th className="px-4 py-3">Source IP</th>
                    <th className="px-4 py-3">Dest IP</th>
                    <th className="px-4 py-3 min-w-[300px]">Message</th>
                    <th className="px-4 py-3 w-10" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/30">
                  {sortedLogs.map(log => (
                    <tr
                      key={log.id}
                      className={`hover:bg-secondary/40 transition-colors cursor-pointer ${selectedLog?.id === log.id ? 'bg-primary/5 border-l-2 border-primary' : ''}`}
                      onClick={() => setSelectedLog(selectedLog?.id === log.id ? null : log)}
                    >
                      <td className="px-4 py-2.5 font-mono text-xs text-muted-foreground whitespace-nowrap">
                        {format(log.timestamp, 'MM-dd HH:mm:ss')}
                      </td>
                      <td className="px-4 py-2.5">
                        <span className="font-mono text-xs bg-secondary border border-border px-1.5 py-0.5 rounded text-foreground">{log.source}</span>
                      </td>
                      <td className="px-4 py-2.5"><SeverityBadge severity={log.severity} /></td>
                      <td className="px-4 py-2.5 font-mono text-xs text-foreground">{log.eventType}</td>
                      <td className="px-4 py-2.5 font-mono text-xs text-muted-foreground">{log.sourceIp}</td>
                      <td className="px-4 py-2.5 font-mono text-xs text-muted-foreground">{log.destIp}</td>
                      <td className="px-4 py-2.5 text-xs text-muted-foreground">
                        <span className="truncate block max-w-[320px]">{log.message}</span>
                      </td>
                      <td className="px-4 py-2.5">
                        <button className="p-1 text-muted-foreground hover:text-primary transition-colors">
                          <Eye className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="p-3 border-t border-border bg-secondary/20 flex items-center justify-between text-xs text-muted-foreground">
              <span>Page {page} of {totalPages} · {data?.total.toLocaleString()} total</span>
              <div className="flex items-center gap-1">
                <button onClick={() => setPage(1)} disabled={page === 1} className="p-1.5 hover:bg-secondary rounded-md disabled:opacity-30"><ChevronsLeft className="w-3.5 h-3.5" /></button>
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="p-1.5 hover:bg-secondary rounded-md disabled:opacity-30"><ChevronLeft className="w-3.5 h-3.5" /></button>
                <span className="px-3 py-1.5 font-mono">{page}</span>
                <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="p-1.5 hover:bg-secondary rounded-md disabled:opacity-30"><ChevronRight className="w-3.5 h-3.5" /></button>
                <button onClick={() => setPage(totalPages)} disabled={page === totalPages} className="p-1.5 hover:bg-secondary rounded-md disabled:opacity-30"><ChevronsRight className="w-3.5 h-3.5" /></button>
              </div>
            </div>
          )}
        </div>

        {/* Log Detail Panel */}
        {selectedLog && (
          <div className="bg-card border border-primary/30 rounded-xl p-5 shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-foreground">Log Detail</h3>
              <button onClick={() => setSelectedLog(null)} className="text-muted-foreground hover:text-foreground">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm mb-4">
              {[
                ['ID', selectedLog.id],
                ['Timestamp', format(selectedLog.timestamp, 'PPpp')],
                ['Source', selectedLog.source],
                ['Severity', selectedLog.severity],
                ['Event Type', selectedLog.eventType],
                ['Source IP', selectedLog.sourceIp],
                ['Dest IP', selectedLog.destIp],
                ['User', selectedLog.user ?? '—'],
              ].map(([k, v]) => (
                <div key={k}>
                  <div className="text-xs text-muted-foreground mb-0.5">{k}</div>
                  <div className="font-mono text-xs text-foreground">{v}</div>
                </div>
              ))}
            </div>
            <div className="mb-4">
              <div className="text-xs text-muted-foreground mb-1">Message</div>
              <div className="text-sm text-foreground bg-secondary/50 rounded-lg p-3 border border-border">{selectedLog.message}</div>
            </div>
            {selectedLog.rawLog && (
              <div>
                <div className="text-xs text-muted-foreground mb-1">Raw Log Data</div>
                <pre className="text-xs font-mono text-green-400 bg-[#050810] border border-border rounded-lg p-3 overflow-x-auto whitespace-pre-wrap break-all">{selectedLog.rawLog}</pre>
              </div>
            )}
          </div>
        )}
      </div>
    </MainLayout>
  );
}
