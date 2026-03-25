import React from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { useAppStore } from '@/store';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar } from 'recharts';
import { format, subHours } from 'date-fns';
import { ShieldAlert, Activity, Clock, Target } from 'lucide-react';
import { SeverityBadge, StatusBadge } from '@/components/ui/Badge';
import { Link } from 'wouter';

export default function DashboardPage() {
  const { alerts, logs, rules } = useAppStore();

  const newAlerts = alerts.filter(a => a.status === 'new').length;
  const criticalAlerts = alerts.filter(a => a.severity === 'critical' && a.status !== 'resolved').length;
  const avgResolutionTime = '4h 12m'; // Mock static metric

  // Chart Data Preparation
  const areaData = Array.from({ length: 24 }).map((_, i) => ({
    time: format(subHours(new Date(), 23 - i), 'HH:00'),
    alerts: Math.floor(Math.random() * 15) + (i === 20 ? 40 : 0) // Spiky data
  }));

  const severityCounts = alerts.reduce((acc, curr) => {
    acc[curr.severity] = (acc[curr.severity] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const pieData = [
    { name: 'Critical', value: severityCounts['critical'] || 0, color: 'hsl(var(--destructive))' },
    { name: 'High', value: severityCounts['high'] || 0, color: '#f97316' },
    { name: 'Medium', value: severityCounts['medium'] || 0, color: '#eab308' },
    { name: 'Low', value: severityCounts['low'] || 0, color: '#22c55e' },
  ].filter(d => d.value > 0);

  const topRulesData = rules.map(r => ({ name: r.name, count: r.triggerCount }))
    .sort((a, b) => b.count - a.count).slice(0, 5);

  return (
    <MainLayout>
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">SOC Dashboard</h1>
          <p className="text-muted-foreground mt-1">System health and active threats overview.</p>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard title="Active Alerts" value={newAlerts} icon={<ShieldAlert className="text-primary" />} trend="+12% from yesterday" />
          <StatCard title="Critical Threats" value={criticalAlerts} icon={<Activity className="text-destructive" />} trend="Requires attention" urgent />
          <StatCard title="Avg Resolution Time" value={avgResolutionTime} icon={<Clock className="text-green-500" />} trend="-30m improved" />
          <StatCard title="Rules Active" value={rules.filter(r => r.enabled).length} icon={<Target className="text-blue-400" />} trend="98% MITRE coverage" />
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-card border border-border rounded-xl p-5 shadow-lg shadow-black/20">
            <h3 className="font-semibold mb-4 text-foreground">Alert Volume (24h)</h3>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={areaData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorAlerts" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="time" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '8px' }}
                    itemStyle={{ color: 'hsl(var(--foreground))' }}
                  />
                  <Area type="monotone" dataKey="alerts" stroke="hsl(var(--primary))" strokeWidth={3} fillOpacity={1} fill="url(#colorAlerts)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-card border border-border rounded-xl p-5 shadow-lg shadow-black/20 flex flex-col">
            <h3 className="font-semibold mb-4 text-foreground">Alerts by Severity</h3>
            <div className="flex-1 min-h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={5} dataKey="value">
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} stroke="transparent" />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '8px' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="grid grid-cols-2 gap-2 mt-4">
              {pieData.map(d => (
                <div key={d.name} className="flex items-center gap-2 text-sm text-muted-foreground">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: d.color }}></div>
                  {d.name}: <span className="text-foreground font-medium">{d.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-card border border-border rounded-xl p-5 shadow-lg shadow-black/20">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-foreground">Recent Alerts</h3>
              <Link href="/alerts" className="text-primary text-sm hover:underline">View All</Link>
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
                  {alerts.slice(0, 5).map(alert => (
                    <tr key={alert.id} className="hover:bg-secondary/50 transition-colors group cursor-pointer">
                      <td className="py-3 text-muted-foreground whitespace-nowrap">{format(alert.createdAt, 'HH:mm:ss')}</td>
                      <td className="py-3 text-foreground font-medium pr-4">
                        <Link href={`/alerts/${alert.id}`} className="group-hover:text-primary transition-colors block truncate max-w-[200px]">{alert.title}</Link>
                      </td>
                      <td className="py-3"><SeverityBadge severity={alert.severity} /></td>
                      <td className="py-3"><StatusBadge status={alert.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="bg-card border border-border rounded-xl p-5 shadow-lg shadow-black/20">
            <h3 className="font-semibold mb-4 text-foreground">Top Detection Rules</h3>
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topRulesData} layout="vertical" margin={{ top: 5, right: 30, left: 10, bottom: 5 }}>
                  <XAxis type="number" hide />
                  <YAxis dataKey="name" type="category" width={150} stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                  <Tooltip 
                    cursor={{ fill: 'hsl(var(--secondary))' }}
                    contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '8px' }}
                  />
                  <Bar dataKey="count" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} barSize={20} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

      </div>
    </MainLayout>
  );
}

function StatCard({ title, value, icon, trend, urgent = false }: { title: string, value: string | number, icon: React.ReactNode, trend: string, urgent?: boolean }) {
  return (
    <div className={`bg-card rounded-xl p-5 border ${urgent ? 'border-destructive shadow-destructive/10' : 'border-border'} shadow-lg shadow-black/20 flex flex-col relative overflow-hidden group hover:-translate-y-1 transition-all duration-300`}>
      <div className="flex justify-between items-start mb-4">
        <h3 className="text-muted-foreground font-medium text-sm">{title}</h3>
        <div className="p-2 bg-secondary rounded-lg">{icon}</div>
      </div>
      <div className="text-3xl font-bold text-foreground mb-1 tracking-tight">{value}</div>
      <div className={`text-xs ${urgent ? 'text-destructive' : 'text-muted-foreground'}`}>{trend}</div>
      {urgent && <div className="absolute top-0 right-0 w-24 h-24 bg-destructive/10 rounded-full blur-2xl -mr-10 -mt-10" />}
    </div>
  );
}
