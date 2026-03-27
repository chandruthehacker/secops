import React, { useMemo } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { useAppStore } from '@/store';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, BarChart, Bar, Legend,
} from 'recharts';
import { format, subHours } from 'date-fns';
import { ShieldAlert, Activity, Clock, Target, TrendingUp, TrendingDown, Database, Cpu } from 'lucide-react';
import { SeverityBadge, StatusBadge } from '@/components/ui/Badge';
import { Link } from 'wouter';

const SEVERITY_COLORS: Record<string, string> = {
  critical: '#ef4444',
  high: '#f97316',
  medium: '#eab308',
  low: '#22c55e',
  info: '#6366f1',
};

const SOURCE_COLORS: Record<string, string> = {
  firewall: '#3b82f6',
  ids: '#06b6d4',
  endpoint: '#8b5cf6',
  auth: '#f59e0b',
  dns: '#10b981',
  proxy: '#ec4899',
};

export default function DashboardPage() {
  const { alerts, logs, rules } = useAppStore();

  const newAlerts = alerts.filter(a => a.status === 'new').length;
  const criticalAlerts = alerts.filter(a => a.severity === 'critical' && a.status !== 'resolved').length;
  const resolvedToday = alerts.filter(a => a.status === 'resolved').length;

  // Stable area chart — bucketed by real alert timestamps
  const areaData = useMemo(() => {
    const buckets: Record<string, number> = {};
    for (let i = 23; i >= 0; i--) {
      const h = format(subHours(new Date(), i), 'HH:00');
      buckets[h] = 0;
    }
    alerts.forEach(a => {
      const h = format(a.createdAt, 'HH:00');
      if (h in buckets) buckets[h]++;
    });
    return Object.entries(buckets).map(([time, alerts]) => ({ time, alerts }));
  }, [alerts]);

  // Severity donut
  const severityCounts = useMemo(() => {
    const acc: Record<string, number> = {};
    alerts.forEach(a => { acc[a.severity] = (acc[a.severity] || 0) + 1; });
    return acc;
  }, [alerts]);

  const pieData = useMemo(() => (
    ['critical', 'high', 'medium', 'low'].map(s => ({
      name: s.charAt(0).toUpperCase() + s.slice(1),
      value: severityCounts[s] || 0,
      color: SEVERITY_COLORS[s],
    })).filter(d => d.value > 0)
  ), [severityCounts]);

  // Top rules
  const topRulesData = useMemo(() => (
    rules.map(r => ({ name: r.name.length > 22 ? r.name.slice(0, 22) + '…' : r.name, count: r.triggerCount }))
      .sort((a, b) => b.count - a.count).slice(0, 6)
  ), [rules]);

  // Log source distribution
  const sourceData = useMemo(() => {
    const acc: Record<string, number> = {};
    logs.forEach(l => { acc[l.source] = (acc[l.source] || 0) + 1; });
    return Object.entries(acc).map(([name, value]) => ({ name, value, color: SOURCE_COLORS[name] || '#64748b' }));
  }, [logs]);

  const tooltipStyle = { backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '8px', fontSize: '12px' };

  return (
    <MainLayout>
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">SOC Dashboard</h1>
          <p className="text-muted-foreground mt-1">System health and active threats overview — {format(new Date(), 'MMMM d, yyyy HH:mm')}</p>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard title="New Alerts" value={newAlerts} icon={<ShieldAlert className="text-primary" />} trend="+12% from yesterday" trendUp />
          <StatCard title="Critical Threats" value={criticalAlerts} icon={<Activity className="text-destructive" />} trend="Requires attention" urgent />
          <StatCard title="Resolved Today" value={resolvedToday} icon={<Clock className="text-emerald-400" />} trend="Avg 4h 12m TTR" />
          <StatCard title="Active Rules" value={rules.filter(r => r.enabled).length} icon={<Target className="text-blue-400" />} trend={`of ${rules.length} total`} />
        </div>

        {/* Charts Row 1 */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-card border border-border rounded-xl p-5 shadow-lg shadow-black/20">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-foreground">Alert Volume (Last 24h)</h3>
              <span className="text-xs text-muted-foreground bg-secondary px-2 py-1 rounded">{alerts.length} total alerts</span>
            </div>
            <div className="h-[240px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={areaData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorAlerts" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="time" stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} interval={3} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={tooltipStyle} itemStyle={{ color: 'hsl(var(--foreground))' }} />
                  <Area type="monotone" dataKey="alerts" stroke="#3b82f6" strokeWidth={2} fillOpacity={1} fill="url(#colorAlerts)" dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-card border border-border rounded-xl p-5 shadow-lg shadow-black/20 flex flex-col">
            <h3 className="font-semibold mb-2 text-foreground">Alerts by Severity</h3>
            <div className="flex-1 min-h-[160px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={75} paddingAngle={3} dataKey="value">
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} stroke="transparent" />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={tooltipStyle} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="grid grid-cols-2 gap-1.5 mt-2">
              {pieData.map(d => (
                <div key={d.name} className="flex items-center gap-2 text-xs text-muted-foreground">
                  <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: d.color }} />
                  {d.name}: <span className="text-foreground font-medium ml-auto">{d.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Charts Row 2 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-card border border-border rounded-xl p-5 shadow-lg shadow-black/20">
            <h3 className="font-semibold mb-4 text-foreground">Top Detection Rules</h3>
            <div className="h-[220px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topRulesData} layout="vertical" margin={{ top: 0, right: 30, left: 0, bottom: 0 }}>
                  <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis dataKey="name" type="category" width={140} stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} />
                  <Tooltip cursor={{ fill: 'hsl(var(--secondary))' }} contentStyle={tooltipStyle} />
                  <Bar dataKey="count" fill="#3b82f6" radius={[0, 4, 4, 0]} barSize={14} label={{ position: 'right', fontSize: 10, fill: '#94a3b8' }} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-card border border-border rounded-xl p-5 shadow-lg shadow-black/20">
            <h3 className="font-semibold mb-4 text-foreground">Log Volume by Source</h3>
            <div className="h-[220px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={sourceData} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false} fontSize={11}>
                    {sourceData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} stroke="transparent" />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={tooltipStyle} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Bottom Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-card border border-border rounded-xl p-5 shadow-lg shadow-black/20">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-foreground">Recent Alerts</h3>
              <Link href="/alerts" className="text-primary text-sm hover:underline">View All →</Link>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-muted-foreground border-b border-border">
                  <tr>
                    <th className="pb-3 font-medium">Time</th>
                    <th className="pb-3 font-medium">Title</th>
                    <th className="pb-3 font-medium">Severity</th>
                    <th className="pb-3 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {alerts.slice(0, 10).map(alert => (
                    <tr key={alert.id} className="hover:bg-secondary/50 transition-colors cursor-pointer group">
                      <td className="py-2.5 text-muted-foreground whitespace-nowrap text-xs font-mono pr-3">{format(alert.createdAt, 'HH:mm:ss')}</td>
                      <td className="py-2.5 text-foreground font-medium pr-4">
                        <Link href={`/alerts/${alert.id}`} className="group-hover:text-primary transition-colors block truncate max-w-[220px]">{alert.title}</Link>
                      </td>
                      <td className="py-2.5 pr-3"><SeverityBadge severity={alert.severity} /></td>
                      <td className="py-2.5"><StatusBadge status={alert.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* System Health */}
          <div className="bg-card border border-border rounded-xl p-5 shadow-lg shadow-black/20">
            <div className="flex items-center gap-2 mb-4">
              <Cpu className="w-4 h-4 text-primary" />
              <h3 className="font-semibold text-foreground">System Health</h3>
            </div>
            <div className="space-y-4">
              {[
                { label: 'Kafka Buffer', value: 12, color: 'bg-emerald-500', text: 'text-emerald-400' },
                { label: 'ES Indexing Load', value: 65, color: 'bg-primary', text: 'text-primary' },
                { label: 'Parser Drop Rate', value: 4, color: 'bg-amber-500', text: 'text-amber-400' },
              ].map(m => (
                <div key={m.label}>
                  <div className="flex justify-between text-xs mb-1.5">
                    <span className="text-muted-foreground">{m.label}</span>
                    <span className={`${m.text} font-mono font-medium`}>{m.value}%</span>
                  </div>
                  <div className="w-full bg-secondary rounded-full h-1.5">
                    <div className={`${m.color} h-1.5 rounded-full transition-all duration-700`} style={{ width: `${m.value}%` }} />
                  </div>
                </div>
              ))}

              <div className="pt-3 border-t border-border space-y-2.5 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Log Ingestion Rate</span>
                  <span className="text-foreground font-mono">25.9k/s</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Active Connectors</span>
                  <span className="text-emerald-400 font-mono">5 / 5</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Rules Evaluated/s</span>
                  <span className="text-foreground font-mono">{rules.filter(r => r.enabled).length * 1200}/s</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Last Rule Match</span>
                  <span className="text-foreground font-mono">2s ago</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}

function StatCard({ title, value, icon, trend, urgent = false, trendUp }: {
  title: string; value: string | number; icon: React.ReactNode; trend: string; urgent?: boolean; trendUp?: boolean;
}) {
  return (
    <div className={`bg-card rounded-xl p-5 border ${urgent ? 'border-destructive/40' : 'border-border'} shadow-lg shadow-black/20 flex flex-col relative overflow-hidden hover:-translate-y-0.5 transition-all duration-200`}>
      <div className="flex justify-between items-start mb-4">
        <h3 className="text-muted-foreground font-medium text-sm">{title}</h3>
        <div className={`p-2 ${urgent ? 'bg-destructive/10' : 'bg-secondary'} rounded-lg`}>{icon}</div>
      </div>
      <div className="text-3xl font-bold text-foreground mb-1.5 tracking-tight">{value}</div>
      <div className={`text-xs flex items-center gap-1 ${urgent ? 'text-destructive' : trendUp ? 'text-amber-400' : 'text-muted-foreground'}`}>
        {trendUp && <TrendingUp className="w-3 h-3" />}
        {trend}
      </div>
      {urgent && <div className="absolute -top-4 -right-4 w-20 h-20 bg-destructive/10 rounded-full blur-xl" />}
    </div>
  );
}
