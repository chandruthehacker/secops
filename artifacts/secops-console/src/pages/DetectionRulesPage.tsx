import React, { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { useAppStore } from '@/store';
import { format } from 'date-fns';
import { SeverityBadge } from '@/components/ui/Badge';
import { Shield, Plus, Search, Power, PowerOff, Code } from 'lucide-react';
import { Link, useLocation } from 'wouter';

export default function DetectionRulesPage() {
  const { rules, toggleRule } = useAppStore();
  const [, setLocation] = useLocation();
  const [searchTerm, setSearchTerm] = useState('');

  const filteredRules = rules.filter(r => 
    r.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    r.mitreIds.some(id => id.includes(searchTerm))
  );

  return (
    <MainLayout>
      <div className="flex flex-col gap-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-3">
              <Shield className="w-8 h-8 text-primary" />
              Detection Engine
            </h1>
            <p className="text-muted-foreground mt-1">Manage SIEM correlation rules and behavioral analytics.</p>
          </div>
          
          <button 
            onClick={() => setLocation('/rules/new')}
            className="flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground font-semibold rounded-xl hover:bg-primary/90 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-primary/25 transition-all active:translate-y-0"
          >
            <Plus className="w-5 h-5" /> Create Rule
          </button>
        </div>

        <div className="bg-card border border-border rounded-xl shadow-lg shadow-black/20 flex flex-col overflow-hidden">
          <div className="p-4 border-b border-border flex gap-4 bg-secondary/20">
            <div className="relative w-full max-w-md">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input 
                type="text" 
                placeholder="Search rules by name or MITRE ID..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full bg-input border border-border rounded-lg pl-9 pr-4 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-muted-foreground bg-secondary/50 border-b border-border uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-4 font-medium w-16">Status</th>
                  <th className="px-6 py-4 font-medium">Rule Name</th>
                  <th className="px-6 py-4 font-medium">Severity</th>
                  <th className="px-6 py-4 font-medium">MITRE ATT&CK</th>
                  <th className="px-6 py-4 font-medium">Triggers</th>
                  <th className="px-6 py-4 font-medium">Last Modified</th>
                  <th className="px-6 py-4 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {filteredRules.map(rule => (
                  <tr key={rule.id} className={`transition-colors group ${rule.enabled ? 'hover:bg-secondary/50' : 'opacity-60 bg-background'}`}>
                    <td className="px-6 py-4">
                      <button 
                        onClick={() => toggleRule(rule.id)}
                        className={`p-1.5 rounded-full transition-colors ${rule.enabled ? 'text-emerald-400 bg-emerald-400/10 hover:bg-emerald-400/20' : 'text-muted-foreground bg-secondary hover:bg-secondary/80'}`}
                        title={rule.enabled ? 'Disable Rule' : 'Enable Rule'}
                      >
                        {rule.enabled ? <Power className="w-4 h-4" /> : <PowerOff className="w-4 h-4" />}
                      </button>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-medium text-foreground text-base mb-1">{rule.name}</div>
                      <div className="text-xs text-muted-foreground truncate max-w-md">{rule.description}</div>
                    </td>
                    <td className="px-6 py-4"><SeverityBadge severity={rule.severity} /></td>
                    <td className="px-6 py-4">
                      <div className="flex gap-1 flex-wrap">
                        {rule.mitreIds.map(id => (
                          <span key={id} className="text-xs font-mono bg-secondary border border-border/50 px-1.5 py-0.5 rounded text-foreground">{id}</span>
                        ))}
                      </div>
                    </td>
                    <td className="px-6 py-4 font-mono text-foreground">{rule.triggerCount.toLocaleString()}</td>
                    <td className="px-6 py-4 text-muted-foreground">{format(rule.updatedAt, 'MMM dd, yyyy')}</td>
                    <td className="px-6 py-4 text-right">
                      <button className="p-2 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-lg transition-colors">
                        <Code className="w-5 h-5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
