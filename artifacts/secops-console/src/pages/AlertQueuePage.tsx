import React, { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { useAppStore } from '@/store';
import { format } from 'date-fns';
import { SeverityBadge, StatusBadge } from '@/components/ui/Badge';
import { Search, Filter, ShieldAlert, CheckSquare, Clock, Target } from 'lucide-react';
import { Link } from 'wouter';

export default function AlertQueuePage() {
  const { alerts, updateAlertStatus } = useAppStore();
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  const filteredAlerts = alerts.filter(a => {
    if (filter !== 'all' && a.status !== filter) return false;
    if (searchTerm && !a.title.toLowerCase().includes(searchTerm.toLowerCase()) && !a.id.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    return true;
  });

  const handleResolve = (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    updateAlertStatus(id, 'resolved');
  };

  return (
    <MainLayout>
      <div className="flex flex-col gap-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-3">
              <ShieldAlert className="w-8 h-8 text-primary" />
              Alert Queue
            </h1>
            <p className="text-muted-foreground mt-1">Manage and respond to security incidents.</p>
          </div>
          
          <div className="flex bg-secondary p-1 rounded-lg">
            {['all', 'new', 'investigating', 'resolved', 'false_positive'].map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${filter === f ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
              >
                {f.replace('_', ' ').toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl shadow-lg shadow-black/20 flex flex-col overflow-hidden">
          <div className="p-4 border-b border-border flex gap-4 bg-secondary/20">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input 
                type="text" 
                placeholder="Search alerts by ID or title..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full bg-input border border-border rounded-lg pl-9 pr-4 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            <button className="flex items-center gap-2 px-3 py-2 border border-border rounded-lg text-sm text-muted-foreground hover:bg-secondary transition-colors">
              <Filter className="w-4 h-4" /> Filters
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-muted-foreground bg-secondary/50 border-b border-border uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-4 font-medium">Alert ID</th>
                  <th className="px-6 py-4 font-medium">Title</th>
                  <th className="px-6 py-4 font-medium">Severity</th>
                  <th className="px-6 py-4 font-medium">Status</th>
                  <th className="px-6 py-4 font-medium">Created</th>
                  <th className="px-6 py-4 font-medium">Assignee</th>
                  <th className="px-6 py-4 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {filteredAlerts.map(alert => (
                  <tr key={alert.id} className="hover:bg-secondary/50 transition-colors group">
                    <td className="px-6 py-4 font-mono text-xs text-muted-foreground">
                      <Link href={`/alerts/${alert.id}`} className="hover:text-primary hover:underline">{alert.id}</Link>
                    </td>
                    <td className="px-6 py-4 font-medium text-foreground max-w-md truncate">
                      <Link href={`/alerts/${alert.id}`} className="hover:text-primary transition-colors block">
                        {alert.title}
                        {alert.mitreTactics.length > 0 && (
                          <div className="text-xs text-muted-foreground font-normal mt-1 flex gap-1 items-center">
                            <Target className="w-3 h-3" /> {alert.mitreTactics[0]}
                          </div>
                        )}
                      </Link>
                    </td>
                    <td className="px-6 py-4"><SeverityBadge severity={alert.severity} /></td>
                    <td className="px-6 py-4"><StatusBadge status={alert.status} /></td>
                    <td className="px-6 py-4 text-muted-foreground flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {format(alert.createdAt, 'MMM dd, HH:mm')}
                    </td>
                    <td className="px-6 py-4">
                      {alert.assignee ? (
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center border border-primary/30 text-xs font-bold text-primary">
                            {alert.assignee.charAt(0)}
                          </div>
                          <span className="text-foreground">{alert.assignee}</span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground italic">Unassigned</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        {alert.status !== 'resolved' && (
                          <button 
                            onClick={(e) => handleResolve(e, alert.id)}
                            className="p-1.5 text-emerald-400 hover:bg-emerald-400/10 rounded tooltip"
                            title="Quick Resolve"
                          >
                            <CheckSquare className="w-5 h-5" />
                          </button>
                        )}
                        <Link 
                          href={`/alerts/${alert.id}`}
                          className="px-3 py-1.5 bg-primary/10 text-primary hover:bg-primary/20 font-medium rounded-md transition-colors"
                        >
                          Investigate
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredAlerts.length === 0 && (
              <div className="p-12 text-center text-muted-foreground">
                <ShieldAlert className="w-12 h-12 mx-auto mb-4 opacity-20" />
                <p>No alerts found matching your criteria.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
