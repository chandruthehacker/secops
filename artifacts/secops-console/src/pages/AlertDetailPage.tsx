import React, { useState, useMemo } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { alertsApi, usersApi, normalizeAlert } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { format } from 'date-fns';
import { SeverityBadge, StatusBadge } from '@/components/ui/Badge';
import { useRoute, Link } from 'wouter';
import {
  ArrowLeft, Bot, Target, Clock, CheckCircle2, XCircle, AlertTriangle,
  UserPlus, TrendingUp, MessageSquare, Shield, Lock, Loader2, Info,
  FileSearch, Activity, ListTree, Server, Globe, Terminal, Tag, Cpu, Network,
  ChevronDown, ChevronUp
} from 'lucide-react';
import type { AlertStatus } from '@/lib/types';

const TABS = [
  { id: 'context',       label: 'Context',          icon: Info },
  { id: 'investigation', label: 'Investigation',     icon: FileSearch },
  { id: 'timeline',      label: 'Timeline',          icon: Clock },
  { id: 'related',       label: 'Related Events',    icon: ListTree },
] as const;
type TabId = typeof TABS[number]['id'];

export default function AlertDetailPage() {
  const [, params] = useRoute('/alerts/:id');
  const qc = useQueryClient();
  const { can, user: authUser } = useAuthStore();
  const [note, setNote] = useState('');
  const [toast, setToast] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabId>('context');
  const [expandedEvent, setExpandedEvent] = useState<string | null>(null);

  const canTriage  = can('alerts:triage');
  const canClose   = can('alerts:close');
  const canAssign  = can('alerts:assign');
  const canNote    = can('alerts:note');

  const alertId = params?.id;

  const { data: alertRaw, isLoading } = useQuery({
    queryKey: ['alert', alertId],
    queryFn: () => alertsApi.getById(alertId!).then(r => r.data.alert),
    enabled: !!alertId,
  });

  const { data: usersData } = useQuery({
    queryKey: ['users'],
    queryFn: () => usersApi.list().then(r => r.data.users),
    enabled: canAssign,
  });

  const { data: relatedEventsData, isLoading: relatedLoading } = useQuery({
    queryKey: ['alert-related', alertId],
    queryFn: () => alertsApi.relatedEvents(alertId!, 10, 5).then(r => r.data),
    enabled: !!alertId && activeTab === 'related',
  });

  const analysts = useMemo(() =>
    (usersData ?? []).filter(u => u.status === 'active' && u.role !== 'viewer'),
    [usersData]
  );

  const alert = useMemo(() => alertRaw ? normalizeAlert(alertRaw) : null, [alertRaw]);

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 3000); };

  const statusMutation = useMutation({
    mutationFn: (status: AlertStatus) => alertsApi.updateStatus(alertId!, status),
    onSuccess: (_, status) => {
      qc.invalidateQueries({ queryKey: ['alert', alertId] });
      qc.invalidateQueries({ queryKey: ['alerts'] });
      showToast(`Status set to "${status.replace('_', ' ')}"`);
    },
  });

  const assignMutation = useMutation({
    mutationFn: (userId: string) => alertsApi.assign(alertId!, userId),
    onSuccess: (_, userId) => {
      qc.invalidateQueries({ queryKey: ['alert', alertId] });
      qc.invalidateQueries({ queryKey: ['alerts'] });
      const u = analysts.find(a => a.id === userId);
      showToast(`Assigned to ${u?.displayName || u?.username || 'analyst'}`);
    },
  });

  const noteMutation = useMutation({
    mutationFn: (content: string) => alertsApi.addNote(alertId!, content, 'note'),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['alert', alertId] });
      setNote('');
      showToast('Note added to timeline');
    },
  });

  const getAssigneeName = (uuid: string | undefined) => {
    if (!uuid) return undefined;
    const u = analysts.find(a => a.id === uuid);
    return u?.displayName || u?.username;
  };

  if (isLoading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-64 gap-3 text-muted-foreground">
          <Loader2 className="w-6 h-6 animate-spin text-primary" /> Loading alert…
        </div>
      </MainLayout>
    );
  }

  if (!alert) {
    return (
      <MainLayout>
        <div className="flex flex-col items-center justify-center h-64 gap-4">
          <AlertTriangle className="w-12 h-12 text-muted-foreground opacity-30" />
          <p className="text-muted-foreground">Alert not found.</p>
          <Link href="/alerts" className="text-primary hover:underline text-sm">← Back to Queue</Link>
        </div>
      </MainLayout>
    );
  }

  const assigneeId = alertRaw?.assignedTo;
  const assigneeName = getAssigneeName(assigneeId);
  const ctx = alertRaw?.context ?? {};
  const relatedEvents = relatedEventsData?.events ?? [];

  return (
    <MainLayout>
      {toast && (
        <div className="fixed top-6 right-6 z-50 bg-card border border-primary/30 text-foreground px-4 py-3 rounded-xl shadow-2xl text-sm font-medium flex items-center gap-2 animate-in slide-in-from-top-4 duration-200">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" /> {toast}
        </div>
      )}

      <div className="flex flex-col gap-6 max-w-7xl">
        {/* Back + Header */}
        <div>
          <Link href="/alerts" className="text-muted-foreground hover:text-foreground flex items-center gap-2 text-sm w-fit mb-4 transition-colors">
            <ArrowLeft className="w-4 h-4" /> Back to Queue
          </Link>
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                <span className="font-mono text-xs text-muted-foreground bg-secondary px-2 py-1 rounded">{alertRaw?.alertCode ?? alert.id.slice(0, 8)}</span>
                <SeverityBadge severity={alert.severity} />
                <StatusBadge status={alert.status} />
                {alertRaw?.mitreTechniqueId && (
                  <span className="px-2 py-0.5 rounded bg-purple-500/10 border border-purple-500/20 text-purple-400 text-xs font-mono">
                    {alertRaw.mitreTechniqueId}
                  </span>
                )}
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground">{alert.title}</h1>
              <p className="text-muted-foreground text-sm mt-1">
                Rule: <span className="text-foreground font-medium">{alert.ruleName}</span>
                {' · '}Created {format(alert.createdAt, 'MMM d, yyyy HH:mm')}
                {alertRaw?.sourceHost && (
                  <> · Source: <span className="font-mono text-foreground">{alertRaw.sourceHost}</span></>
                )}
              </p>
            </div>
            <div className="flex gap-2 flex-wrap">
              {canTriage && (
                <button
                  onClick={() => statusMutation.mutate('investigating')}
                  disabled={statusMutation.isPending}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium border transition-all ${alert.status === 'investigating' ? 'bg-amber-500/10 border-amber-500/30 text-amber-400' : 'bg-secondary border-border text-muted-foreground hover:border-amber-500/30 hover:text-amber-400'}`}
                >
                  <AlertTriangle className="w-4 h-4" /> Investigate
                </button>
              )}
              {canClose && (
                <>
                  <button
                    onClick={() => statusMutation.mutate('false_positive')}
                    disabled={statusMutation.isPending}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium border transition-all ${alert.status === 'false_positive' ? 'bg-secondary border-border text-foreground' : 'bg-secondary border-border text-muted-foreground hover:text-foreground'}`}
                  >
                    <XCircle className="w-4 h-4" /> False Positive
                  </button>
                  <button
                    onClick={() => statusMutation.mutate('resolved')}
                    disabled={statusMutation.isPending}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium border transition-all ${alert.status === 'resolved' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-secondary border-border text-muted-foreground hover:border-emerald-500/30 hover:text-emerald-400'}`}
                  >
                    <CheckCircle2 className="w-4 h-4" /> Resolve
                  </button>
                  <button
                    onClick={() => { statusMutation.mutate('investigating'); showToast('Escalated to L3 Threat Hunter'); }}
                    disabled={statusMutation.isPending}
                    className="flex items-center gap-1.5 px-4 py-2 bg-destructive/10 border border-destructive/30 text-destructive rounded-lg text-sm font-medium hover:bg-destructive/20 transition-all"
                  >
                    <TrendingUp className="w-4 h-4" /> Escalate
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Left: Tabbed main area */}
          <div className="lg:col-span-3 flex flex-col gap-5">
            {/* Tab bar */}
            <div className="flex border-b border-border gap-1">
              {TABS.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-all -mb-px ${
                    activeTab === tab.id
                      ? 'border-primary text-primary'
                      : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
                  }`}
                >
                  <tab.icon className="w-4 h-4" />
                  {tab.label}
                  {tab.id === 'timeline' && alert.timeline.length > 0 && (
                    <span className="text-xs bg-primary/15 text-primary px-1.5 py-0.5 rounded-full">{alert.timeline.length}</span>
                  )}
                  {tab.id === 'related' && relatedEventsData && relatedEventsData.total > 0 && (
                    <span className="text-xs bg-primary/15 text-primary px-1.5 py-0.5 rounded-full">{relatedEventsData.total}</span>
                  )}
                </button>
              ))}
            </div>

            {/* Context tab */}
            {activeTab === 'context' && (
              <div className="space-y-5">
                {/* Threat context */}
                <div className="bg-primary/5 border border-primary/20 rounded-xl p-5 relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-primary to-primary/0" />
                  <div className="flex items-center gap-2 mb-3 text-primary font-semibold text-sm uppercase tracking-wider">
                    <Bot className="w-4 h-4" /> Threat Context
                  </div>
                  <p className="text-foreground leading-relaxed text-sm">{alert.description || 'No additional context available for this alert.'}</p>
                </div>

                {/* MITRE Coverage */}
                {(alertRaw?.mitreTechniqueId || alert.mitreIds.length > 0) && (
                  <div className="bg-card border border-border rounded-xl p-5 shadow-lg">
                    <h3 className="text-base font-semibold text-foreground mb-4 flex items-center gap-2">
                      <Target className="w-4 h-4 text-purple-400" /> MITRE ATT&CK Coverage
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {alertRaw?.mitreTechniqueId && (
                        <div className="bg-purple-500/5 border border-purple-500/20 rounded-lg p-3">
                          <div className="text-xs text-purple-400/70 mb-1">Technique</div>
                          <div className="font-mono text-purple-300 font-bold">{alertRaw.mitreTechniqueId}</div>
                          {alertRaw.mitreTechniqueName && <div className="text-sm text-foreground mt-1">{alertRaw.mitreTechniqueName}</div>}
                        </div>
                      )}
                      {alertRaw?.mitreSubtechniqueId && (
                        <div className="bg-purple-500/5 border border-purple-500/20 rounded-lg p-3">
                          <div className="text-xs text-purple-400/70 mb-1">Sub-technique</div>
                          <div className="font-mono text-purple-300 font-bold">{alertRaw.mitreSubtechniqueId}</div>
                        </div>
                      )}
                      {alert.mitreIds.filter(id => id !== alertRaw?.mitreTechniqueId).map((id, i) => (
                        <div key={id} className="bg-secondary border border-border rounded-lg p-3">
                          <div className="font-mono text-primary text-sm">{id}</div>
                          {alert.mitreTactics[i] && <div className="text-xs text-muted-foreground mt-1">{alert.mitreTactics[i]}</div>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Event Context */}
                {Object.keys(ctx).length > 0 && (
                  <div className="bg-card border border-border rounded-xl p-5 shadow-lg">
                    <h3 className="text-base font-semibold text-foreground mb-4 flex items-center gap-2">
                      <Activity className="w-4 h-4 text-primary" /> Event Context
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {ctx.srcIp && (
                        <div className="flex items-center gap-2 p-3 bg-background rounded-lg border border-border/50">
                          <Network className="w-4 h-4 text-primary shrink-0" />
                          <div>
                            <div className="text-xs text-muted-foreground">Source IP</div>
                            <div className="font-mono text-sm text-foreground">{ctx.srcIp}</div>
                          </div>
                        </div>
                      )}
                      {ctx.dstIp && (
                        <div className="flex items-center gap-2 p-3 bg-background rounded-lg border border-border/50">
                          <Network className="w-4 h-4 text-amber-400 shrink-0" />
                          <div>
                            <div className="text-xs text-muted-foreground">Destination IP</div>
                            <div className="font-mono text-sm text-foreground">{ctx.dstIp}</div>
                          </div>
                        </div>
                      )}
                      {ctx.userName && (
                        <div className="flex items-center gap-2 p-3 bg-background rounded-lg border border-border/50">
                          <Shield className="w-4 h-4 text-primary shrink-0" />
                          <div>
                            <div className="text-xs text-muted-foreground">User</div>
                            <div className="font-mono text-sm text-foreground">{ctx.userName}</div>
                          </div>
                        </div>
                      )}
                      {ctx.processName && (
                        <div className="flex items-center gap-2 p-3 bg-background rounded-lg border border-border/50">
                          <Cpu className="w-4 h-4 text-primary shrink-0" />
                          <div>
                            <div className="text-xs text-muted-foreground">Process</div>
                            <div className="font-mono text-sm text-foreground">{ctx.processName}</div>
                          </div>
                        </div>
                      )}
                      {ctx.geoCountry && (
                        <div className="flex items-center gap-2 p-3 bg-background rounded-lg border border-border/50">
                          <Globe className="w-4 h-4 text-primary shrink-0" />
                          <div>
                            <div className="text-xs text-muted-foreground">GeoIP Location</div>
                            <div className="text-sm text-foreground">{ctx.geoCity ? `${ctx.geoCity}, ` : ''}{ctx.geoCountry}</div>
                          </div>
                        </div>
                      )}
                      {alertRaw?.severityScore !== undefined && alertRaw?.severityScore !== null && (
                        <div className="flex items-center gap-2 p-3 bg-background rounded-lg border border-border/50">
                          <Activity className="w-4 h-4 text-primary shrink-0" />
                          <div>
                            <div className="text-xs text-muted-foreground">Severity Score</div>
                            <div className="text-sm text-foreground font-bold">{alertRaw.severityScore}<span className="text-muted-foreground font-normal">/100</span></div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Command line if present */}
                    {ctx.processCommandLine && (
                      <div className="mt-4">
                        <div className="text-xs text-muted-foreground mb-1.5">Command Line</div>
                        <pre className="text-xs font-mono bg-background border border-border rounded-lg p-3 text-foreground overflow-x-auto whitespace-pre-wrap break-all">
                          {ctx.processCommandLine}
                        </pre>
                      </div>
                    )}
                  </div>
                )}

                {/* Affected Assets */}
                {alert.affectedAssets.length > 0 && (
                  <div className="bg-card border border-border rounded-xl p-5 shadow-lg">
                    <h3 className="text-base font-semibold text-foreground mb-4 flex items-center gap-2">
                      <Server className="w-4 h-4 text-primary" /> Affected Assets
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {alert.affectedAssets.map(asset => (
                        <Link key={asset} href="/assets" className="flex items-center gap-2 px-3 py-2 bg-secondary border border-border rounded-lg hover:border-primary/30 hover:text-primary transition-colors group">
                          <div className="w-2 h-2 rounded-full bg-amber-500" />
                          <span className="font-mono text-sm text-foreground group-hover:text-primary">{asset}</span>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}

                {/* Tags */}
                {alertRaw?.tags?.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {alertRaw.tags.map((tag: string) => (
                      <span key={tag} className="inline-flex items-center gap-1 px-2 py-1 rounded bg-primary/10 text-primary text-xs border border-primary/20">
                        <Tag className="w-3 h-3" />{tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Investigation tab */}
            {activeTab === 'investigation' && (
              <div className="space-y-5">
                <div className="bg-card border border-border rounded-xl p-5 shadow-lg">
                  <h3 className="text-base font-semibold text-foreground mb-4 flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 text-primary" /> Add Investigation Note
                  </h3>
                  {canNote ? (
                    <>
                      <textarea
                        value={note}
                        onChange={e => setNote(e.target.value)}
                        placeholder="Describe findings, actions taken, IOCs discovered, remediation steps..."
                        className="w-full bg-input border border-border rounded-lg p-3 text-sm text-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all h-28 resize-none"
                        maxLength={1000}
                      />
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-xs text-muted-foreground">{note.length}/1000</span>
                        <button
                          onClick={() => note.trim() && noteMutation.mutate(note.trim())}
                          disabled={!note.trim() || noteMutation.isPending}
                          className="px-5 py-2 bg-primary text-primary-foreground font-semibold rounded-lg hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 text-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                        >
                          {noteMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                          Add Note
                        </button>
                      </div>
                    </>
                  ) : (
                    <div className="flex items-center gap-2 text-muted-foreground text-sm py-4">
                      <Lock className="w-4 h-4 opacity-50" />
                      <span>Your role does not permit adding notes.</span>
                    </div>
                  )}
                </div>

                {/* Resolution notes */}
                {alertRaw?.resolutionNotes && (
                  <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-5">
                    <div className="flex items-center gap-2 mb-3 text-emerald-400 font-semibold text-sm">
                      <CheckCircle2 className="w-4 h-4" /> Resolution Notes
                    </div>
                    <p className="text-sm text-foreground leading-relaxed">{alertRaw.resolutionNotes}</p>
                  </div>
                )}

                {/* Checklist */}
                <div className="bg-card border border-border rounded-xl p-5 shadow-lg">
                  <h3 className="text-base font-semibold text-foreground mb-4">Investigation Checklist</h3>
                  <div className="space-y-2">
                    {[
                      'Review the triggering event in the Logs Explorer',
                      'Examine affected host for lateral movement indicators',
                      'Check user account activity for anomalies',
                      'Identify all network connections from source IP',
                      'Search for related alerts in the last 24 hours',
                      'Document IOCs and add to threat intelligence feed',
                      'Determine blast radius of potential compromise',
                      'Escalate if external compromise is confirmed',
                    ].map((item, i) => (
                      <label key={i} className="flex items-center gap-3 p-2 rounded-lg hover:bg-background/50 cursor-pointer group">
                        <div className="w-4 h-4 rounded border border-border bg-background group-hover:border-primary transition-colors shrink-0" />
                        <span className="text-sm text-muted-foreground">{item}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Timeline tab */}
            {activeTab === 'timeline' && (
              <div className="bg-card border border-border rounded-xl p-5 shadow-lg">
                <h3 className="text-base font-semibold text-foreground mb-5 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-primary" /> Event Timeline
                  <span className="text-xs text-muted-foreground ml-auto font-normal">{alert.timeline.length} events</span>
                </h3>
                {alert.timeline.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
                    <Clock className="w-8 h-8 opacity-20 mb-2" />
                    <p className="text-sm">No timeline events yet</p>
                  </div>
                ) : (
                  <div className="relative pl-6">
                    <div className="absolute left-2.5 top-1 bottom-1 w-px bg-gradient-to-b from-primary/60 via-border to-transparent" />
                    <div className="space-y-5">
                      {[...alert.timeline].reverse().map((event, i) => (
                        <div key={event.id} className="relative">
                          <div className={`absolute -left-4 top-0.5 w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center ${i === 0 ? 'bg-primary border-primary shadow-[0_0_10px_rgba(59,130,246,0.5)]' : 'bg-card border-border'}`} />
                          <div className="bg-background/50 border border-border/50 rounded-lg p-3">
                            <div className="flex items-start justify-between gap-2 mb-1">
                              <span className="font-medium text-sm text-foreground">{event.action}</span>
                              <span className="font-mono text-xs text-muted-foreground whitespace-nowrap">{format(event.timestamp, 'MMM d, HH:mm:ss')}</span>
                            </div>
                            {event.user && <div className="text-xs text-primary mb-2">by {event.user}</div>}
                            {event.note && (
                              <div className="text-xs text-muted-foreground bg-secondary/50 p-2.5 rounded border border-border/50 leading-relaxed whitespace-pre-wrap">
                                {event.note}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Related Events tab */}
            {activeTab === 'related' && (
              <div className="bg-card border border-border rounded-xl p-5 shadow-lg">
                <div className="flex items-center gap-2 mb-5">
                  <ListTree className="w-4 h-4 text-primary" />
                  <h3 className="text-base font-semibold text-foreground">Related Events</h3>
                  <span className="text-xs text-muted-foreground ml-auto">±10 min window</span>
                </div>
                {relatedLoading ? (
                  <div className="flex items-center justify-center h-32 text-muted-foreground gap-3">
                    <Loader2 className="w-5 h-5 animate-spin text-primary" /> Loading events…
                  </div>
                ) : relatedEvents.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
                    <ListTree className="w-8 h-8 opacity-20 mb-2" />
                    <p className="text-sm">No related events found in the time window</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {relatedEvents.map((ev: any) => {
                      const isExpanded = expandedEvent === ev.id;
                      return (
                        <div key={ev.id} className="border border-border rounded-lg overflow-hidden">
                          <button
                            onClick={() => setExpandedEvent(isExpanded ? null : ev.id)}
                            className="w-full flex items-center gap-3 p-3 hover:bg-background/50 text-left"
                          >
                            <Terminal className="w-4 h-4 text-muted-foreground shrink-0" />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-mono text-xs text-muted-foreground">{format(new Date(ev.timestamp), 'HH:mm:ss')}</span>
                                <span className="text-xs px-1.5 py-0.5 rounded bg-secondary text-foreground capitalize">{ev.source ?? 'unknown'}</span>
                                {ev.sourceHost && <span className="font-mono text-xs text-primary">{ev.sourceHost}</span>}
                              </div>
                              <p className="text-sm text-foreground mt-0.5 truncate">{ev.message ?? ev.raw?.substring(0, 100)}</p>
                            </div>
                            {isExpanded ? <ChevronUp className="w-4 h-4 text-muted-foreground shrink-0" /> : <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />}
                          </button>
                          {isExpanded && (
                            <div className="border-t border-border bg-background/30 p-3">
                              <pre className="text-xs font-mono text-muted-foreground overflow-x-auto whitespace-pre-wrap break-all">
                                {JSON.stringify(ev, null, 2)}
                              </pre>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Right Sidebar */}
          <div className="space-y-5">
            {/* Properties */}
            <div className="bg-card border border-border rounded-xl p-5 shadow-lg">
              <h3 className="font-semibold text-foreground mb-4 text-sm uppercase tracking-wider border-b border-border pb-2">Properties</h3>
              <div className="space-y-3 text-sm">
                {[
                  ['Created', format(alert.createdAt, 'PP pp')],
                  ['Updated', format(alert.updatedAt, 'PP pp')],
                  ...(alertRaw?.source ? [['Source', alertRaw.source]] : []),
                  ...(alertRaw?.dedupKey ? [['Dedup Key', alertRaw.dedupKey]] : []),
                ].map(([l, v]) => (
                  <div key={l}>
                    <div className="text-muted-foreground mb-0.5 text-xs">{l}</div>
                    <div className="text-foreground font-mono text-xs break-all">{v}</div>
                  </div>
                ))}
                <div>
                  <div className="text-muted-foreground mb-0.5 text-xs">Detection Rule</div>
                  <Link href="/rules" className="text-primary hover:underline text-sm">{alert.ruleName}</Link>
                </div>
              </div>
            </div>

            {/* Assignment */}
            <div className="bg-card border border-border rounded-xl p-5 shadow-lg">
              <h3 className="font-semibold text-foreground mb-4 text-sm uppercase tracking-wider flex items-center gap-2">
                <UserPlus className="w-3.5 h-3.5 text-primary" /> Assignment
              </h3>
              {canAssign ? (
                <div className="space-y-1.5">
                  {analysts.map(analyst => (
                    <button
                      key={analyst.id}
                      onClick={() => assignMutation.mutate(analyst.id)}
                      disabled={assignMutation.isPending}
                      className={`w-full flex items-center gap-2.5 p-2 rounded-lg border transition-all text-sm ${assigneeId === analyst.id ? 'bg-primary/10 border-primary/30 text-primary' : 'border-transparent hover:bg-secondary text-muted-foreground hover:text-foreground'}`}
                    >
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${assigneeId === analyst.id ? 'bg-primary text-white' : 'bg-secondary border border-border text-muted-foreground'}`}>
                        {(analyst.displayName || analyst.username).charAt(0).toUpperCase()}
                      </div>
                      <span className="flex-1 text-left text-xs">{analyst.displayName || analyst.username}</span>
                      <span className="text-xs text-muted-foreground/60 capitalize">{analyst.role.replace('_', ' ')}</span>
                      {assigneeId === analyst.id && <CheckCircle2 className="w-3.5 h-3.5 text-primary" />}
                    </button>
                  ))}
                  {assigneeId && (
                    <button onClick={() => assignMutation.mutate('')} className="text-xs text-muted-foreground hover:text-destructive mt-1 transition-colors">
                      Clear assignment
                    </button>
                  )}
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  {assigneeName ? (
                    <div className="flex items-center gap-2.5 p-2 rounded-lg bg-primary/10 border border-primary/30">
                      <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
                        {assigneeName.charAt(0).toUpperCase()}
                      </div>
                      <span className="text-sm text-primary">{assigneeName}</span>
                      <CheckCircle2 className="w-3.5 h-3.5 text-primary ml-auto" />
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground italic">Unassigned</p>
                  )}
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground/60 mt-1">
                    <Lock className="w-3 h-3" /> SOC L2 or higher can assign
                  </div>
                </div>
              )}
            </div>

            {/* Quick nav to related */}
            <div className="bg-card border border-border rounded-xl p-4 shadow-lg">
              <h3 className="font-semibold text-foreground mb-3 text-xs uppercase tracking-wider text-muted-foreground">Quick Actions</h3>
              <div className="space-y-2">
                <Link href="/logs" className="flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-secondary rounded-lg transition-all">
                  <Terminal className="w-4 h-4 text-primary" /> Open Log Explorer
                </Link>
                <Link href="/mitre" className="flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-secondary rounded-lg transition-all">
                  <Target className="w-4 h-4 text-purple-400" /> View MITRE Framework
                </Link>
                <Link href="/assets" className="flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-secondary rounded-lg transition-all">
                  <Server className="w-4 h-4 text-amber-400" /> Asset Inventory
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
