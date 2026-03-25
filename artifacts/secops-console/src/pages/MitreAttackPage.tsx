import React from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { useAppStore } from '@/store';
import { Target, ShieldCheck } from 'lucide-react';

export default function MitreAttackPage() {
  const { mitre } = useAppStore();

  const totalTechniques = mitre.reduce((acc, tactic) => acc + tactic.techniques.length, 0);
  const coveredTechniques = mitre.reduce((acc, tactic) => acc + tactic.techniques.filter(t => t.covered).length, 0);
  const coveragePercent = Math.round((coveredTechniques / totalTechniques) * 100) || 0;

  return (
    <MainLayout>
      <div className="flex flex-col gap-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-3">
              <Target className="w-8 h-8 text-primary" />
              MITRE ATT&CK Matrix
            </h1>
            <p className="text-muted-foreground mt-1">Visualize detection coverage across the attack lifecycle.</p>
          </div>
          
          <div className="bg-card border border-border rounded-xl p-3 flex items-center gap-4 shadow-lg">
            <div className="flex items-center gap-3">
              <ShieldCheck className="w-6 h-6 text-emerald-400" />
              <div>
                <div className="text-xs text-muted-foreground uppercase tracking-wider">Overall Coverage</div>
                <div className="text-xl font-bold text-foreground">{coveragePercent}%</div>
              </div>
            </div>
            <div className="w-px h-8 bg-border"></div>
            <div className="flex flex-col gap-1 text-xs">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-primary/20 border border-primary rounded-sm"></div>
                <span className="text-muted-foreground">Covered</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-secondary border border-border rounded-sm"></div>
                <span className="text-muted-foreground">No Coverage</span>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl shadow-lg shadow-black/20 overflow-x-auto p-4">
          <div className="inline-flex gap-2 min-w-full pb-4">
            {mitre.map((tactic) => (
              <div key={tactic.id} className="flex-1 min-w-[220px] max-w-[260px] flex flex-col gap-2">
                {/* Tactic Header */}
                <div className="bg-secondary/50 border border-border p-3 rounded-lg flex flex-col items-center text-center">
                  <div className="font-bold text-foreground text-sm mb-1">{tactic.name}</div>
                  <div className="font-mono text-xs text-muted-foreground">{tactic.id}</div>
                  <div className="mt-2 text-xs font-medium text-primary">
                    {tactic.techniques.filter(t=>t.covered).length} / {tactic.techniques.length}
                  </div>
                </div>

                {/* Techniques */}
                <div className="flex flex-col gap-2">
                  {tactic.techniques.map(tech => (
                    <div 
                      key={tech.id} 
                      className={`
                        p-3 rounded-lg border text-sm transition-all cursor-pointer hover:-translate-y-0.5
                        ${tech.covered 
                          ? 'bg-primary/10 border-primary/30 text-foreground shadow-[0_0_10px_rgba(59,130,246,0.1)] hover:border-primary' 
                          : 'bg-secondary/30 border-border/50 text-muted-foreground hover:border-border hover:bg-secondary/60'
                        }
                      `}
                    >
                      <div className="font-medium mb-1 leading-tight">{tech.name}</div>
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-mono">{tech.id}</span>
                        {tech.alertCount > 0 && (
                          <span className="bg-primary text-primary-foreground px-1.5 py-0.5 rounded text-[10px] font-bold">
                            {tech.alertCount}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
