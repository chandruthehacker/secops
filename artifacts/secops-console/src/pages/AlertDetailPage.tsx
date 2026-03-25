import React, { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { useAppStore } from '@/store';
import { format } from 'date-fns';
import { SeverityBadge, StatusBadge } from '@/components/ui/Badge';
import { useRoute, Link } from 'wouter';
import { ArrowLeft, Bot, ShieldAlert, Target, Clock, Terminal, CheckCircle2, XCircle, AlertTriangle, UserPlus } from 'lucide-react';

export default function AlertDetailPage() {
  const [, params] = useRoute('/alerts/:id');
  const { alerts, updateAlertStatus, assignAlert } = useAppStore();
  const alert = alerts.find(a => a.id === params?.id);
  const [note, setNote] = useState('');

  if (!alert) {
    return (
      <MainLayout>
        <div className="p-12 text-center text-muted-foreground">Alert not found.</div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="flex flex-col gap-6 max-w-6xl mx-auto">
        {/* Top Nav */}
        <div>
          <Link href="/alerts" className="text-muted-foreground hover:text-foreground flex items-center gap-2 text-sm w-fit mb-4 transition-colors">
            <ArrowLeft className="w-4 h-4" /> Back to Queue
          </Link>
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <span className="font-mono text-muted-foreground bg-secondary px-2 py-1 rounded text-sm">{alert.id}</span>
                <SeverityBadge severity={alert.severity} />
                <StatusBadge status={alert.status} />
              </div>
              <h1 className="text-3xl font-bold tracking-tight text-foreground">{alert.title}</h1>
            </div>
            
            <div className="flex gap-2">
              <button 
                onClick={() => updateAlertStatus(alert.id, 'investigating')}
                className="px-4 py-2 bg-amber-500/10 text-amber-500 hover:bg-amber-500/20 font-medium rounded-lg border border-amber-500/20 transition-colors flex items-center gap-2"
              >
                <AlertTriangle className="w-4 h-4" /> Investigate
              </button>
              <button 
                onClick={() => updateAlertStatus(alert.id, 'false_positive')}
                className="px-4 py-2 bg-gray-500/10 text-gray-400 hover:bg-gray-500/20 font-medium rounded-lg border border-gray-500/20 transition-colors flex items-center gap-2"
              >
                <XCircle className="w-4 h-4" /> False Positive
              </button>
              <button 
                onClick={() => updateAlertStatus(alert.id, 'resolved')}
                className="px-4 py-2 bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 font-medium rounded-lg border border-emerald-500/20 transition-colors flex items-center gap-2"
              >
                <CheckCircle2 className="w-4 h-4" /> Resolve
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Left Column (Main Content) */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* AI Summary Card */}
            <div className="bg-primary/5 border border-primary/20 rounded-xl p-5 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-1 h-full bg-primary" />
              <div className="flex items-center gap-2 mb-3 text-primary font-semibold">
                <Bot className="w-5 h-5" /> AI Analysis Summary
              </div>
              <p className="text-foreground leading-relaxed text-sm">
                {alert.aiSummary}
              </p>
            </div>

            {/* Description */}
            <div className="bg-card border border-border rounded-xl p-5 shadow-lg">
              <h3 className="text-lg font-semibold text-foreground mb-4">Description</h3>
              <p className="text-muted-foreground">{alert.description}</p>
              
              <div className="mt-6 flex flex-wrap gap-2">
                {alert.mitreTactics.map((tactic, i) => (
                  <div key={i} className="flex items-center gap-1.5 px-3 py-1.5 bg-secondary rounded-lg text-xs text-foreground font-medium border border-border/50">
                    <Target className="w-3.5 h-3.5 text-primary" /> {tactic} ({alert.mitreIds[i]})
                  </div>
                ))}
              </div>
            </div>

            {/* Related Events */}
            <div className="bg-card border border-border rounded-xl p-5 shadow-lg">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-foreground">Correlated Events</h3>
                <Link href="/logs" className="text-primary text-sm hover:underline flex items-center gap-1">
                  <Terminal className="w-4 h-4" /> View in Logs
                </Link>
              </div>
              <div className="space-y-2">
                {alert.relatedEventIds.map(id => (
                  <div key={id} className="bg-input border border-border rounded-lg p-3 flex justify-between items-center group hover:border-primary/50 transition-colors">
                    <div className="font-mono text-xs text-muted-foreground">{id}</div>
                    <button className="text-xs font-medium text-primary opacity-0 group-hover:opacity-100 transition-opacity">Analyze</button>
                  </div>
                ))}
              </div>
            </div>

          </div>

          {/* Right Column (Sidebar) */}
          <div className="space-y-6">
            
            {/* Meta Card */}
            <div className="bg-card border border-border rounded-xl p-5 shadow-lg">
              <h3 className="font-semibold text-foreground mb-4 border-b border-border pb-2">Properties</h3>
              <div className="space-y-4 text-sm">
                <div>
                  <div className="text-muted-foreground mb-1">Created</div>
                  <div className="text-foreground">{format(alert.createdAt, 'PP pp')}</div>
                </div>
                <div>
                  <div className="text-muted-foreground mb-1">Last Updated</div>
                  <div className="text-foreground">{format(alert.updatedAt, 'PP pp')}</div>
                </div>
                <div>
                  <div className="text-muted-foreground mb-1">Detection Rule</div>
                  <Link href="/rules" className="text-primary hover:underline">{alert.ruleName}</Link>
                </div>
                <div>
                  <div className="text-muted-foreground mb-1">Assignee</div>
                  {alert.assignee ? (
                    <div className="flex items-center justify-between">
                      <span className="text-foreground font-medium">{alert.assignee}</span>
                      <button onClick={() => assignAlert(alert.id, '')} className="text-xs text-muted-foreground hover:text-destructive">Remove</button>
                    </div>
                  ) : (
                    <button onClick={() => assignAlert(alert.id, 'Alice Analyst')} className="flex items-center gap-2 text-primary hover:text-primary/80 transition-colors">
                      <UserPlus className="w-4 h-4" /> Assign to me
                    </button>
                  )}
                </div>
                <div>
                  <div className="text-muted-foreground mb-1">Affected Assets</div>
                  <div className="space-y-1 mt-2">
                    {alert.affectedAssets.map(ip => (
                      <div key={ip} className="font-mono text-xs bg-secondary px-2 py-1 rounded inline-block text-foreground border border-border/50 mr-2">
                        {ip}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Timeline */}
            <div className="bg-card border border-border rounded-xl p-5 shadow-lg">
              <h3 className="font-semibold text-foreground mb-4">Timeline</h3>
              <div className="relative pl-4 space-y-6 before:absolute before:inset-0 before:ml-4 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-primary/50 before:to-transparent">
                {alert.timeline.map((event, i) => (
                  <div key={event.id} className="relative z-10 flex gap-4 items-start">
                    <div className="w-2 h-2 rounded-full bg-primary mt-1.5 shadow-[0_0_8px_rgba(59,130,246,0.8)]" />
                    <div>
                      <div className="text-sm font-medium text-foreground">{event.action}</div>
                      <div className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                        <Clock className="w-3 h-3" /> {format(event.timestamp, 'HH:mm')}
                      </div>
                      {event.note && (
                        <div className="text-sm text-muted-foreground mt-2 bg-secondary/50 p-2 rounded border border-border/50">
                          {event.note}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              
              <div className="mt-6 border-t border-border pt-4">
                <textarea 
                  value={note}
                  onChange={e => setNote(e.target.value)}
                  placeholder="Add a note to the investigation..."
                  className="w-full bg-input border border-border rounded-lg p-3 text-sm text-foreground focus:outline-none focus:border-primary resize-none h-20 mb-2"
                />
                <button 
                  onClick={() => setNote('')}
                  disabled={!note}
                  className="w-full py-2 bg-secondary text-foreground hover:bg-secondary/80 font-medium rounded-lg disabled:opacity-50 transition-colors"
                >
                  Add Note
                </button>
              </div>
            </div>

          </div>
        </div>
      </div>
    </MainLayout>
  );
}
