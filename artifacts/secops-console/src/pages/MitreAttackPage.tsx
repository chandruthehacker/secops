import React, { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { useAppStore } from '@/store';
import { Target, ShieldCheck, X, AlertTriangle } from 'lucide-react';
import { MitreTechnique } from '@/lib/types';

function TechniquePopup({ technique, tacticName, onClose }: { technique: MitreTechnique; tacticName: string; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-card border border-border rounded-xl shadow-2xl w-full max-w-md" onClick={e => e.stopPropagation()}>
        <div className="flex items-start justify-between p-5 border-b border-border">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="font-mono text-xs text-primary bg-primary/10 px-2 py-0.5 rounded">{technique.id}</span>
              {technique.covered ? (
                <span className="text-xs text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded border border-emerald-400/20">Covered</span>
              ) : (
                <span className="text-xs text-muted-foreground bg-secondary px-2 py-0.5 rounded border border-border">No Coverage</span>
              )}
            </div>
            <h2 className="font-bold text-foreground text-lg">{technique.name}</h2>
            <div className="text-xs text-muted-foreground mt-0.5">Tactic: {tacticName}</div>
          </div>
          <button onClick={onClose} className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-secondary rounded-lg transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-5 space-y-4">
          {technique.alertCount > 0 ? (
            <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
              <div className="flex items-center gap-2 text-primary font-semibold text-sm mb-2">
                <AlertTriangle className="w-4 h-4" /> {technique.alertCount} Alert{technique.alertCount > 1 ? 's' : ''} Triggered
              </div>
              <p className="text-sm text-muted-foreground">Active detection rules are monitoring for this technique. Review the Alert Queue for incidents mapped to {technique.id}.</p>
            </div>
          ) : (
            <div className="bg-secondary/50 border border-border rounded-lg p-4 text-sm text-muted-foreground">
              No alerts have been triggered for this technique in the current dataset.
            </div>
          )}
          <div>
            <h4 className="text-xs font-semibold uppercase text-muted-foreground tracking-wider mb-2">About This Technique</h4>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {technique.name} ({technique.id}) is a {tacticName.toLowerCase()} technique documented in the MITRE ATT&CK framework.
              {technique.covered
                ? ' Your current detection rules provide coverage against this technique.'
                : ' No detection rule is currently mapped to this technique — consider creating one in the Detection Engine.'}
            </p>
          </div>
          <div className="flex gap-3 pt-2">
            <a
              href={`https://attack.mitre.org/techniques/${technique.id.replace('.', '/')}/`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 py-2 text-center text-sm text-primary border border-primary/30 rounded-lg hover:bg-primary/10 transition-colors"
            >
              View on MITRE →
            </a>
            {!technique.covered && (
              <a href="/rules/new" className="flex-1 py-2 text-center text-sm bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors">
                Create Rule
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function MitreAttackPage() {
  const { mitre } = useAppStore();
  const [selectedTechnique, setSelectedTechnique] = useState<{ technique: MitreTechnique; tacticName: string } | null>(null);
  const [showCoveredOnly, setShowCoveredOnly] = useState(false);

  const totalTechniques = mitre.reduce((acc, tactic) => acc + tactic.techniques.length, 0);
  const coveredTechniques = mitre.reduce((acc, tactic) => acc + tactic.techniques.filter(t => t.covered).length, 0);
  const totalAlerts = mitre.reduce((acc, tactic) => acc + tactic.techniques.reduce((a, t) => a + t.alertCount, 0), 0);
  const coveragePercent = Math.round((coveredTechniques / totalTechniques) * 100) || 0;

  const filteredMatrix = showCoveredOnly
    ? mitre.map(tactic => ({ ...tactic, techniques: tactic.techniques.filter(t => t.covered) })).filter(t => t.techniques.length > 0)
    : mitre;

  return (
    <MainLayout>
      {selectedTechnique && (
        <TechniquePopup
          technique={selectedTechnique.technique}
          tacticName={selectedTechnique.tacticName}
          onClose={() => setSelectedTechnique(null)}
        />
      )}

      <div className="flex flex-col gap-6">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-3">
              <Target className="w-8 h-8 text-primary" /> MITRE ATT&CK Matrix
            </h1>
            <p className="text-muted-foreground mt-1">Visualize detection coverage across the adversary attack lifecycle.</p>
          </div>

          <div className="flex items-center gap-4 flex-wrap">
            <button
              onClick={() => setShowCoveredOnly(!showCoveredOnly)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border transition-all ${showCoveredOnly ? 'bg-primary/10 border-primary/30 text-primary' : 'bg-secondary border-border text-muted-foreground hover:text-foreground'}`}
            >
              <ShieldCheck className="w-4 h-4" />
              {showCoveredOnly ? 'Showing Covered Only' : 'Show Covered Only'}
            </button>
            <div className="bg-card border border-border rounded-xl p-3 flex items-center gap-4 shadow-lg">
              <div className="flex items-center gap-3">
                <div className="relative w-12 h-12">
                  <svg className="w-12 h-12 -rotate-90" viewBox="0 0 36 36">
                    <circle cx="18" cy="18" r="15.9" fill="none" stroke="hsl(var(--secondary))" strokeWidth="3" />
                    <circle cx="18" cy="18" r="15.9" fill="none" stroke="hsl(var(--primary))" strokeWidth="3"
                      strokeDasharray={`${coveragePercent} ${100 - coveragePercent}`} strokeLinecap="round" />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center text-xs font-bold text-foreground">{coveragePercent}%</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Coverage</div>
                  <div className="text-sm font-bold text-foreground">{coveredTechniques}/{totalTechniques}</div>
                </div>
              </div>
              <div className="w-px h-8 bg-border" />
              <div className="text-center">
                <div className="text-xs text-muted-foreground">Active Alerts</div>
                <div className="text-sm font-bold text-primary">{totalAlerts}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-6 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-primary/15 border border-primary/40 rounded-sm" />
            <span>Covered by rule</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-secondary/50 border border-border/50 rounded-sm" />
            <span>No coverage</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-primary/15 border border-primary/40 rounded-sm flex items-center justify-center">
              <div className="w-2 h-2 rounded-full bg-primary" />
            </div>
            <span>Has active alerts</span>
          </div>
          <span className="text-muted-foreground/60 ml-2">Click any technique card for details</span>
        </div>

        {/* Matrix */}
        <div className="bg-card border border-border rounded-xl shadow-lg shadow-black/20 overflow-x-auto p-4">
          <div className="inline-flex gap-2 min-w-full pb-2">
            {filteredMatrix.map(tactic => (
              <div key={tactic.id} className="flex-1 min-w-[180px] max-w-[220px] flex flex-col gap-1.5">
                {/* Tactic Header */}
                <div className="bg-secondary/60 border border-border p-2.5 rounded-lg text-center">
                  <div className="font-bold text-foreground text-xs mb-0.5 leading-tight">{tactic.name}</div>
                  <div className="font-mono text-[10px] text-muted-foreground">{tactic.id}</div>
                  <div className="mt-1.5 text-[10px] font-semibold text-primary">
                    {tactic.techniques.filter(t => t.covered).length}/{tactic.techniques.length} covered
                  </div>
                </div>

                {/* Techniques */}
                {tactic.techniques.map(tech => (
                  <button
                    key={tech.id}
                    onClick={() => setSelectedTechnique({ technique: tech, tacticName: tactic.name })}
                    className={`p-2.5 rounded-lg border text-left text-xs transition-all hover:-translate-y-0.5 hover:shadow-md active:translate-y-0 ${tech.covered
                      ? 'bg-primary/10 border-primary/30 text-foreground hover:border-primary hover:bg-primary/15 shadow-[0_0_8px_rgba(59,130,246,0.08)]'
                      : 'bg-secondary/30 border-border/40 text-muted-foreground hover:border-border hover:bg-secondary/60'
                    }`}
                  >
                    <div className="font-medium leading-tight mb-1">{tech.name}</div>
                    <div className="flex justify-between items-center">
                      <span className="font-mono text-[10px] opacity-70">{tech.id}</span>
                      {tech.alertCount > 0 && (
                        <span className="bg-primary text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full">
                          {tech.alertCount}
                        </span>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
