import React, { useState, useMemo } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { useAppStore } from '@/store';
import { format } from 'date-fns';
import { SeverityBadge, StatusBadge } from '@/components/ui/Badge';
import { Search, Filter, ShieldAlert, CheckSquare, Clock, Target, ChevronDown, UserCheck, XCircle, CheckCircle2, AlertTriangle, Square } from 'lucide-react';
import { Link } from 'wouter';
import { AlertStatus, Severity } from '@/lib/types';

const STATUSES: AlertStatus[] = ['new', 'investigating', 'resolved', 'false_positive'];
const SEVERITIES: Severity[] = ['critical', 'high', 'medium', 'low'];
const ANALYSTS = ['Alice (L1)', 'Bob (L2)', 'Charlie (L3)', 'Diana (L1)', 'Eve (L2)'];

export default function AlertQueuePage() {
  const { alerts, updateAlertStatus, assignAlert } = useAppStore();
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [assigneeFilter, setAssigneeFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showBulkMenu, setShowBulkMenu] = useState(false);
  const [bulkAssignOpen, setBulkAssignOpen] = useState(false);

  const filtered = useMemo(() => alerts.filter(a => {
    if (statusFilter !== 'all' && a.status !== statusFilter) return false;
    if (severityFilter !== 'all' && a.severity !== severityFilter) return false;
    if (assigneeFilter === 'unassigned' && a.assignee) return false;
    if (assigneeFilter !== 'all' && assigneeFilter !== 'unassigned' && a.assignee !== assigneeFilter) return false;
    if (searchTerm && !a.title.toLowerCase().includes(searchTerm.toLowerCase()) && !a.id.toLowerCase().includes(searchTerm.toLowerCase()) && !a.ruleName.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    return true;
  }), [alerts, statusFilter, severityFilter, assigneeFilter, searchTerm]);

  const counts = useMemo(() => ({
    all: alerts.length,
    new: alerts.filter(a => a.status === 'new').length,
    investigating: alerts.filter(a => a.status === 'investigating').length,
    resolved: alerts.filter(a => a.status === 'resolved').length,
    false_positive: alerts.filter(a => a.status === 'false_positive').length,
  }), [alerts]);

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  };
  const selectAll = () => setSelectedIds(new Set(filtered.map(a => a.id)));
  const clearSelection = () => setSelectedIds(new Set());
  const isAllSelected = filtered.length > 0 && filtered.every(a => selectedIds.has(a.id));

  const bulkUpdate = (status: AlertStatus) => {
    selectedIds.forEach(id => updateAlertStatus(id, status));
    setSelectedIds(new Set());
    setShowBulkMenu(false);
  };
  const bulkAssign = (analyst: string) => {
    selectedIds.forEach(id => assignAlert(id, analyst));
    setSelectedIds(new Set());
    setBulkAssignOpen(false);
    setShowBulkMenu(false);
  };

  const handleQuickAction = (e: React.MouseEvent, id: string, status: AlertStatus) => {
    e.preventDefault(); e.stopPropagation();
    updateAlertStatus(id, status);
  };

  return (
    <MainLayout>
      <div className="flex flex-col gap-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-3">
              <ShieldAlert className="w-7 h-7 text-primary" /> Alert Queue
            </h1>
            <p className="text-muted-foreground mt-1 text-sm">Triage and respond to security incidents.</p>
          </div>
        </div>

        {/* Status Tabs */}
        <div className="flex items-center gap-1 bg-secondary/50 p-1 rounded-xl border border-border w-fit">
          {(['all', ...STATUSES] as const).map(f => (
            <button
              key={f}
              onClick={() => { setStatusFilter(f); setSelectedIds(new Set()); }}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${statusFilter === f ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
            >
              {f.replace('_', ' ').replace(/^\w/, c => c.toUpperCase())}
              <span className={`text-xs px-1.5 py-0.5 rounded-full ${statusFilter === f ? 'bg-primary/10 text-primary' : 'bg-secondary text-muted-foreground'}`}>
                {counts[f as keyof typeof counts] ?? counts.all}
              </span>
            </button>
          ))}
        </div>

        {/* Filter Bar */}
        <div className="flex gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[280px]">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search alerts by ID, title, rule..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full bg-input border border-border rounded-lg pl-9 pr-4 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
          <select
            value={severityFilter}
            onChange={e => { setSeverityFilter(e.target.value); setSelectedIds(new Set()); }}
            className="bg-input border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary appearance-none pr-8"
          >
            <option value="all">All Severities</option>
            {SEVERITIES.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
          </select>
          <select
            value={assigneeFilter}
            onChange={e => { setAssigneeFilter(e.target.value); setSelectedIds(new Set()); }}
            className="bg-input border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary appearance-none pr-8"
          >
            <option value="all">All Analysts</option>
            <option value="unassigned">Unassigned</option>
            {ANALYSTS.map(a => <option key={a} value={a}>{a}</option>)}
          </select>
        </div>

        <div className="bg-card border border-border rounded-xl shadow-lg shadow-black/20 flex flex-col overflow-hidden">
          {/* Bulk Action Bar */}
          {selectedIds.size > 0 && (
            <div className="px-4 py-2.5 bg-primary/5 border-b border-primary/20 flex items-center gap-4 text-sm">
              <span className="text-primary font-medium">{selectedIds.size} selected</span>
              <div className="flex gap-2 ml-auto flex-wrap">
                <button onClick={() => bulkUpdate('investigating')} className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-lg hover:bg-amber-500/20 transition-colors text-xs font-medium">
                  <AlertTriangle className="w-3.5 h-3.5" /> Set Investigating
                </button>
                <button onClick={() => bulkUpdate('resolved')} className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-lg hover:bg-emerald-500/20 transition-colors text-xs font-medium">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Resolve
                </button>
                <button onClick={() => bulkUpdate('false_positive')} className="flex items-center gap-1.5 px-3 py-1.5 bg-secondary text-muted-foreground border border-border rounded-lg hover:bg-secondary/80 transition-colors text-xs font-medium">
                  <XCircle className="w-3.5 h-3.5" /> False Positive
                </button>
                <div className="relative">
                  <button
                    onClick={() => setBulkAssignOpen(!bulkAssignOpen)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 text-primary border border-primary/20 rounded-lg hover:bg-primary/20 transition-colors text-xs font-medium"
                  >
                    <UserCheck className="w-3.5 h-3.5" /> Assign <ChevronDown className="w-3 h-3" />
                  </button>
                  {bulkAssignOpen && (
                    <div className="absolute right-0 top-full mt-1 bg-card border border-border rounded-lg shadow-xl z-20 py-1 min-w-[140px]">
                      {ANALYSTS.map(a => (
                        <button key={a} onClick={() => bulkAssign(a)} className="w-full text-left px-3 py-2 text-sm text-foreground hover:bg-secondary transition-colors">
                          {a}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <button onClick={clearSelection} className="text-xs text-muted-foreground hover:text-foreground">Clear</button>
              </div>
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-muted-foreground bg-secondary/50 border-b border-border uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-3.5 w-10">
                    <button onClick={isAllSelected ? clearSelection : selectAll} className="text-muted-foreground hover:text-foreground">
                      {isAllSelected ? <CheckSquare className="w-4 h-4 text-primary" /> : <Square className="w-4 h-4" />}
                    </button>
                  </th>
                  <th className="px-4 py-3.5 font-medium">Alert ID</th>
                  <th className="px-4 py-3.5 font-medium">Title</th>
                  <th className="px-4 py-3.5 font-medium">Severity</th>
                  <th className="px-4 py-3.5 font-medium">Status</th>
                  <th className="px-4 py-3.5 font-medium">MITRE</th>
                  <th className="px-4 py-3.5 font-medium">Created</th>
                  <th className="px-4 py-3.5 font-medium">Assignee</th>
                  <th className="px-4 py-3.5 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {filtered.map(alert => (
                  <tr
                    key={alert.id}
                    className={`hover:bg-secondary/40 transition-colors group ${selectedIds.has(alert.id) ? 'bg-primary/5' : ''}`}
                  >
                    <td className="px-4 py-3.5" onClick={e => { e.preventDefault(); e.stopPropagation(); toggleSelect(alert.id); }}>
                      <button className="text-muted-foreground hover:text-foreground">
                        {selectedIds.has(alert.id) ? <CheckSquare className="w-4 h-4 text-primary" /> : <Square className="w-4 h-4" />}
                      </button>
                    </td>
                    <td className="px-4 py-3.5 font-mono text-xs text-muted-foreground">
                      <Link href={`/alerts/${alert.id}`} className="hover:text-primary hover:underline">{alert.id}</Link>
                    </td>
                    <td className="px-4 py-3.5 font-medium text-foreground max-w-xs">
                      <Link href={`/alerts/${alert.id}`} className="hover:text-primary transition-colors block">
                        <span className="truncate block max-w-[240px]">{alert.title}</span>
                        <span className="text-xs text-muted-foreground font-normal mt-0.5 flex items-center gap-1">
                          <Target className="w-3 h-3" /> {alert.mitreTactics[0] || 'Unknown'}
                        </span>
                      </Link>
                    </td>
                    <td className="px-4 py-3.5"><SeverityBadge severity={alert.severity} /></td>
                    <td className="px-4 py-3.5"><StatusBadge status={alert.status} /></td>
                    <td className="px-4 py-3.5">
                      <div className="flex gap-1 flex-wrap">
                        {alert.mitreIds.slice(0, 2).map(id => (
                          <span key={id} className="text-xs font-mono bg-secondary border border-border/50 px-1 py-0.5 rounded text-muted-foreground">{id}</span>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-muted-foreground text-xs whitespace-nowrap">
                      <div className="flex items-center gap-1"><Clock className="w-3 h-3" />{format(alert.createdAt, 'MMM dd, HH:mm')}</div>
                    </td>
                    <td className="px-4 py-3.5">
                      {alert.assignee ? (
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center text-xs font-bold text-primary flex-shrink-0">
                            {alert.assignee.charAt(0)}
                          </div>
                          <span className="text-sm text-foreground truncate max-w-[90px]">{alert.assignee}</span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-xs italic">Unassigned</span>
                      )}
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        {alert.status !== 'resolved' && (
                          <button
                            onClick={e => handleQuickAction(e, alert.id, 'resolved')}
                            title="Resolve"
                            className="p-1.5 text-emerald-400 hover:bg-emerald-400/10 rounded-md transition-colors"
                          >
                            <CheckCircle2 className="w-4 h-4" />
                          </button>
                        )}
                        {alert.status === 'new' && (
                          <button
                            onClick={e => handleQuickAction(e, alert.id, 'investigating')}
                            title="Investigate"
                            className="p-1.5 text-amber-400 hover:bg-amber-400/10 rounded-md transition-colors"
                          >
                            <AlertTriangle className="w-4 h-4" />
                          </button>
                        )}
                        <Link
                          href={`/alerts/${alert.id}`}
                          className="px-2.5 py-1.5 bg-primary/10 text-primary hover:bg-primary/20 font-medium rounded-md transition-colors text-xs"
                        >
                          View
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filtered.length === 0 && (
              <div className="p-12 text-center text-muted-foreground">
                <ShieldAlert className="w-10 h-10 mx-auto mb-3 opacity-20" />
                <p className="text-sm">No alerts match your current filters.</p>
              </div>
            )}
          </div>
          <div className="p-3 border-t border-border bg-secondary/20 text-xs text-muted-foreground">
            Showing {filtered.length} of {alerts.length} alerts
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
