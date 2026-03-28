import React, { useState, useMemo } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { alertsApi, usersApi, normalizeAlert } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { format } from 'date-fns';
import { SeverityBadge, StatusBadge } from '@/components/ui/Badge';
import { useRoute, Link } from 'wouter';
import { ArrowLeft, Bot, Target, Clock, CheckCircle2, XCircle, AlertTriangle, UserPlus, TrendingUp, MessageSquare, Shield, Terminal, Lock, Loader2 } from 'lucide-react';
import type { AlertStatus } from '@/lib/types';

export default function AlertDetailPage() {
  const [, params] = useRoute('/alerts/:id');
  const qc = useQueryClient();
  const { can, user: authUser } = useAuthStore();
  const [note, setNote] = useState('');
  const [toast, setToast] = useState<string | null>(null);

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

  return (
    <MainLayout>
      {toast && (
        <div className="fixed top-6 right-6 z-50 bg-card border border-primary/30 text-foreground px-4 py-3 rounded-xl shadow-2xl text-sm font-medium flex items-center gap-2 animate-in slide-in-from-top-4 duration-200">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" /> {toast}
        </div>
      )}

      <div className="flex flex-col gap-6 max-w-6xl">
        {/* Header */}
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
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground">{alert.title}</h1>
              <p className="text-muted-foreground text-sm mt-1">
                Rule: <span className="text-foreground font-medium">{alert.ruleName}</span> · Created {format(alert.createdAt, 'MMM d, yyyy HH:mm')}
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

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column */}
          <div className="lg:col-span-2 space-y-5">
            {/* AI Analysis */}
            <div className="bg-primary/5 border border-primary/20 rounded-xl p-5 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-primary to-primary/0" />
              <div className="flex items-center gap-2 mb-3 text-primary font-semibold text-sm uppercase tracking-wider">
                <Bot className="w-4 h-4" /> Threat Context
              </div>
              <p className="text-foreground leading-relaxed text-sm">{alert.description || 'No additional context available for this alert.'}</p>
            </div>

            {/* Description + MITRE */}
            {(alert.mitreIds.length > 0 || alert.affectedAssets.length > 0) && (
              <div className="bg-card border border-border rounded-xl p-5 shadow-lg">
                {alert.mitreIds.length > 0 && (
                  <>
                    <h3 className="text-base font-semibold text-foreground mb-3">MITRE ATT&CK Coverage</h3>
                    <div className="flex flex-wrap gap-2 mb-5">
                      {alert.mitreIds.map((id, i) => (
                        <div key={id} className="flex items-center gap-1.5 px-3 py-1.5 bg-secondary rounded-lg text-xs font-medium border border-border/50 text-foreground">
                          <span className="font-mono text-primary">{id}</span>
                          {alert.mitreTactics[i] && <><span className="text-muted-foreground">·</span>{alert.mitreTactics[i]}</>}
                        </div>
                      ))}
                    </div>
                  </>
                )}
                {alert.affectedAssets.length > 0 && (
                  <>
                    <h3 className="text-base font-semibold text-foreground mb-3 border-t border-border pt-4">Affected Assets</h3>
                    <div className="flex flex-wrap gap-2">
                      {alert.affectedAssets.map(asset => (
                        <div key={asset} className="flex items-center gap-2 px-3 py-2 bg-secondary border border-border rounded-lg">
                          <div className="w-2 h-2 rounded-full bg-amber-500" />
                          <span className="font-mono text-sm text-foreground">{asset}</span>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Add Note */}
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
                    className="w-full bg-input border border-border rounded-lg p-3 text-sm text-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all h-24 resize-none"
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
                  <span>Your role does not permit adding notes to alerts.</span>
                </div>
              )}
            </div>
          </div>

          {/* Right Column */}
          <div className="space-y-5">
            {/* Properties */}
            <div className="bg-card border border-border rounded-xl p-5 shadow-lg">
              <h3 className="font-semibold text-foreground mb-4 text-sm uppercase tracking-wider border-b border-border pb-2">Properties</h3>
              <div className="space-y-4 text-sm">
                {[
                  ['Created', format(alert.createdAt, 'PP pp')],
                  ['Updated', format(alert.updatedAt, 'PP pp')],
                  ...(alertRaw?.source ? [['Source', alertRaw.source]] : []),
                ].map(([l, v]) => (
                  <div key={l}>
                    <div className="text-muted-foreground mb-0.5 text-xs">{l}</div>
                    <div className="text-foreground font-mono text-xs">{v}</div>
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
                      <span className="flex-1 text-left">{analyst.displayName || analyst.username}</span>
                      <span className="text-xs text-muted-foreground/60 capitalize">{analyst.role.replace('_', ' ')}</span>
                      {assigneeId === analyst.id && <CheckCircle2 className="w-3.5 h-3.5 text-primary" />}
                    </button>
                  ))}
                  {assigneeId && (
                    <button
                      onClick={() => assignMutation.mutate('')}
                      className="text-xs text-muted-foreground hover:text-destructive mt-1 transition-colors"
                    >
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

            {/* Timeline */}
            <div className="bg-card border border-border rounded-xl p-5 shadow-lg">
              <h3 className="font-semibold text-foreground mb-4 text-sm uppercase tracking-wider flex items-center gap-2">
                <Clock className="w-3.5 h-3.5 text-primary" /> Timeline ({alert.timeline.length})
              </h3>
              {alert.timeline.length === 0 ? (
                <p className="text-xs text-muted-foreground italic">No timeline events yet.</p>
              ) : (
                <div className="relative pl-5">
                  <div className="absolute left-2.5 top-1 bottom-1 w-px bg-gradient-to-b from-primary/60 via-border to-transparent" />
                  <div className="space-y-5">
                    {[...alert.timeline].reverse().map((event, i) => (
                      <div key={event.id} className="relative">
                        <div className={`absolute -left-3.5 top-0 w-3 h-3 rounded-full border-2 ${i === 0 ? 'bg-primary border-primary shadow-[0_0_8px_rgba(59,130,246,0.6)]' : 'bg-card border-border'}`} />
                        <div className="flex items-center justify-between mb-1 gap-2">
                          <span className="font-medium text-sm text-foreground">{event.action}</span>
                          <span className="font-mono text-xs text-muted-foreground whitespace-nowrap">{format(event.timestamp, 'MMM d, HH:mm')}</span>
                        </div>
                        {event.user && <div className="text-xs text-primary mb-1">{event.user}</div>}
                        {event.note && (
                          <div className="text-xs text-muted-foreground bg-secondary/50 p-2.5 rounded-lg border border-border/50 leading-relaxed">
                            {event.note}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
