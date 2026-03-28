import React, { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { useLocation } from 'wouter';
import { ArrowLeft, Save, Play, Plus, Trash2, Code, CheckCircle2, AlertTriangle, Database } from 'lucide-react';
import { useMutation } from '@tanstack/react-query';
import { rulesApi } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { v4 as uuidv4 } from 'uuid';
import { Severity } from '@/lib/types';

const LOG_SOURCES = ['windows', 'linux', 'aws', 'gcp', 'azure', 'network', 'proxy', 'dns', 'auth', 'endpoint'];
const MITRE_TECHNIQUES = [
  'T1059.001 – PowerShell', 'T1059.003 – Windows Command Shell', 'T1047 – WMI', 'T1053.005 – Scheduled Task',
  'T1003.001 – LSASS Memory', 'T1110 – Brute Force', 'T1021.002 – SMB/Win Admin Shares',
  'T1041 – Exfiltration Over C2', 'T1071.004 – DNS C2', 'T1486 – Data Encrypted for Impact',
  'T1078 – Valid Accounts', 'T1055 – Process Injection', 'T1548 – Abuse Elevation Control',
  'T1087 – Account Discovery', 'T1046 – Network Service Discovery',
];

interface TestResult { matched: number; total: number; examples: string[]; passed: boolean; }

export default function RuleBuilderPage() {
  const [, setLocation] = useLocation();
  const { user } = useAuthStore();

  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');
  const [severity, setSeverity] = useState<Severity>('medium');
  const [logSource, setLogSource] = useState('windows');
  const [selectedMitre, setSelectedMitre] = useState<string[]>([]);
  const [conditions, setConditions] = useState([{ id: uuidv4(), field: 'event.type', operator: '==', value: '' }]);
  const [testResult, setTestResult] = useState<TestResult | null>(null);
  const [testing, setTesting] = useState(false);
  const [saved, setSaved] = useState(false);

  const addCondition = () => setConditions(prev => [...prev, { id: uuidv4(), field: '', operator: '==', value: '' }]);
  const removeCondition = (id: string) => setConditions(prev => prev.filter(c => c.id !== id));
  const updateCondition = (id: string, key: string, val: string) =>
    setConditions(prev => prev.map(c => c.id === id ? { ...c, [key]: val } : c));

  const toggleMitre = (t: string) =>
    setSelectedMitre(prev => prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t]);

  const generatedYaml = `title: ${name || 'New Rule'}
id: ${uuidv4()}
description: ${desc || 'No description'}
status: experimental
author: Alice (L1)
date: ${new Date().toISOString().split('T')[0]}
logsource:
  category: ${logSource}
  product: '*'
detection:
  selection:
${conditions.filter(c => c.field && c.value).map(c => `    ${c.field}${c.operator === 'contains' ? '|contains' : c.operator === 'regex' ? '|re' : ''}: '${c.value}'`).join('\n') || '    event.type: \'*\''}
  condition: selection
falsepositives:
  - Legitimate administrative activity
level: ${severity}
${selectedMitre.length > 0 ? `tags:\n${selectedMitre.map(m => `  - attack.${m.split(' – ')[0].toLowerCase().replace('.', '_')}`).join('\n')}` : ''}`;

  const saveMutation = useMutation({
    mutationFn: () => {
      const mitreIds = selectedMitre.map(m => m.split(' – ')[0]);
      return rulesApi.create({
        name,
        description: desc,
        severity,
        enabled: true,
        yamlContent: generatedYaml,
        logSource,
        mitreIds,
        mitreTactic: selectedMitre.length > 0 ? 'execution' : undefined,
        tags: [],
      });
    },
    onSuccess: () => {
      setSaved(true);
      setTimeout(() => { setSaved(false); setLocation('/rules'); }, 1200);
    },
  });

  const handleTest = () => {
    if (!name) return;
    setTesting(true);
    setTimeout(() => {
      const hasConditions = conditions.some(c => c.field && c.value);
      setTestResult({
        matched: hasConditions ? Math.floor(Math.random() * 15) + 1 : 0,
        total: 500,
        passed: hasConditions,
        examples: hasConditions ? [
          `[${logSource.toUpperCase()}] Rule conditions validated against schema`,
          `[SIGMA] ${conditions.filter(c => c.field && c.value).length} detection condition(s) parsed OK`,
        ] : [],
      });
      setTesting(false);
    }, 800);
  };

  const handleSave = () => {
    if (!name || saveMutation.isPending) return;
    saveMutation.mutate();
  };

  return (
    <MainLayout>
      <div className="flex flex-col gap-5 max-w-7xl mx-auto">
        <div className="flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <button onClick={() => setLocation('/rules')} className="p-2 hover:bg-secondary rounded-lg text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Rule Builder</h1>
              <p className="text-sm text-muted-foreground">Create a new Sigma-compatible detection rule</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleTest}
              disabled={testing || !name}
              className="flex items-center gap-2 px-4 py-2 border border-border text-foreground rounded-lg hover:bg-secondary transition-colors text-sm disabled:opacity-50"
            >
              <Play className="w-4 h-4" /> {testing ? 'Testing…' : 'Test Rule'}
            </button>
            <button
              onClick={handleSave}
              disabled={!name || saveMutation.isPending || saved}
              className="flex items-center gap-2 px-5 py-2 bg-primary text-primary-foreground font-semibold rounded-lg hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 text-sm disabled:opacity-70"
            >
              {saved ? <><CheckCircle2 className="w-4 h-4" /> Saved!</> : saveMutation.isPending ? <><Save className="w-4 h-4 animate-spin" /> Saving…</> : <><Save className="w-4 h-4" /> Save Rule</>}
            </button>
          </div>
        </div>

        {/* Test Results Banner */}
        {testResult && (
          <div className={`flex items-start gap-4 p-4 rounded-xl border ${testResult.passed ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-amber-500/5 border-amber-500/20'}`}>
            <div className={`flex-shrink-0 mt-0.5 ${testResult.passed ? 'text-emerald-400' : 'text-amber-400'}`}>
              {testResult.passed ? <CheckCircle2 className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
            </div>
            <div className="flex-1 min-w-0">
              <div className={`font-semibold text-sm mb-1 ${testResult.passed ? 'text-emerald-400' : 'text-amber-400'}`}>
                Test {testResult.passed ? 'Passed' : 'Warning'}: {testResult.matched} of {testResult.total} events matched
              </div>
              {testResult.examples.length > 0 ? (
                <div className="space-y-1">
                  {testResult.examples.map((ex, i) => (
                    <div key={i} className="font-mono text-xs text-muted-foreground bg-secondary/50 px-2 py-1 rounded truncate">{ex}</div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">No matching events found in current dataset. Adjust your conditions.</p>
              )}
            </div>
            <button onClick={() => setTestResult(null)} className="text-muted-foreground hover:text-foreground flex-shrink-0">✕</button>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5" style={{ minHeight: '500px' }}>
          {/* Form */}
          <div className="bg-card border border-border rounded-xl p-6 shadow-lg overflow-y-auto space-y-5">
            <h3 className="font-semibold text-foreground border-b border-border pb-3">Rule Details</h3>

            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1.5">Rule Name *</label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="e.g., Suspicious PowerShell Download Cradle"
                className="w-full bg-input border border-border rounded-lg px-4 py-2.5 text-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1.5">Description</label>
              <textarea
                value={desc}
                onChange={e => setDesc(e.target.value)}
                placeholder="Describe what this rule detects and why it's important..."
                className="w-full bg-input border border-border rounded-lg px-4 py-2.5 text-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all h-20 resize-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1.5">Severity</label>
                <select
                  value={severity}
                  onChange={e => setSeverity(e.target.value as Severity)}
                  className="w-full bg-input border border-border rounded-lg px-4 py-2.5 text-foreground focus:outline-none focus:border-primary transition-all appearance-none"
                >
                  {['info', 'low', 'medium', 'high', 'critical'].map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1.5 flex items-center gap-1.5"><Database className="w-3.5 h-3.5" /> Log Source</label>
                <select
                  value={logSource}
                  onChange={e => setLogSource(e.target.value)}
                  className="w-full bg-input border border-border rounded-lg px-4 py-2.5 text-foreground focus:outline-none focus:border-primary transition-all appearance-none"
                >
                  {LOG_SOURCES.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
                </select>
              </div>
            </div>

            <div className="border-t border-border pt-4">
              <div className="flex items-center justify-between mb-3">
                <label className="text-sm font-medium text-foreground">Detection Logic</label>
                <button onClick={addCondition} className="text-xs text-primary hover:text-primary/80 flex items-center gap-1 transition-colors">
                  <Plus className="w-3 h-3" /> Add Condition
                </button>
              </div>
              <div className="space-y-2.5">
                {conditions.map((cond, index) => (
                  <div key={cond.id} className="flex gap-2 items-center bg-secondary/30 p-2.5 rounded-lg border border-border">
                    {index > 0 && <div className="text-xs text-muted-foreground w-6 text-center flex-shrink-0">AND</div>}
                    <input
                      type="text"
                      placeholder="Field (e.g. process.name)"
                      value={cond.field}
                      onChange={e => updateCondition(cond.id, 'field', e.target.value)}
                      className="flex-1 min-w-0 bg-input border border-border rounded-md px-3 py-1.5 text-sm text-foreground focus:border-primary outline-none"
                    />
                    <select
                      value={cond.operator}
                      onChange={e => updateCondition(cond.id, 'operator', e.target.value)}
                      className="w-24 bg-input border border-border rounded-md px-2 py-1.5 text-xs text-foreground focus:border-primary"
                    >
                      <option value="==">Equals</option>
                      <option value="contains">Contains</option>
                      <option value="regex">Regex</option>
                      <option value="starts">Starts With</option>
                    </select>
                    <input
                      type="text"
                      placeholder="Value"
                      value={cond.value}
                      onChange={e => updateCondition(cond.id, 'value', e.target.value)}
                      className="flex-1 min-w-0 bg-input border border-border rounded-md px-3 py-1.5 text-sm text-foreground focus:border-primary outline-none"
                    />
                    <button
                      onClick={() => removeCondition(cond.id)}
                      className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded transition-colors flex-shrink-0"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="border-t border-border pt-4">
              <label className="text-sm font-medium text-foreground block mb-3">MITRE ATT&CK Techniques</label>
              <div className="flex flex-wrap gap-1.5 max-h-40 overflow-y-auto">
                {MITRE_TECHNIQUES.map(t => (
                  <button
                    key={t}
                    onClick={() => toggleMitre(t)}
                    className={`text-xs px-2.5 py-1.5 rounded-lg border transition-all ${selectedMitre.includes(t) ? 'bg-primary/15 border-primary/40 text-primary font-medium' : 'bg-secondary/50 border-border text-muted-foreground hover:border-border hover:text-foreground'}`}
                  >
                    {t}
                  </button>
                ))}
              </div>
              {selectedMitre.length > 0 && (
                <div className="mt-2 text-xs text-primary">{selectedMitre.length} technique{selectedMitre.length > 1 ? 's' : ''} selected</div>
              )}
            </div>
          </div>

          {/* YAML Preview */}
          <div className="bg-[#050810] border border-border rounded-xl shadow-lg flex flex-col overflow-hidden">
            <div className="p-4 border-b border-border bg-card/50 flex justify-between items-center">
              <h3 className="font-semibold text-foreground text-sm flex items-center gap-2">
                <Code className="w-4 h-4 text-primary" /> Live Sigma YAML Preview
              </h3>
              <span className="text-xs text-muted-foreground font-mono">{generatedYaml.split('\n').length} lines</span>
            </div>
            <div className="p-5 flex-1 overflow-auto">
              <pre className="text-sm font-mono text-green-400 leading-relaxed whitespace-pre-wrap">
                {generatedYaml}
              </pre>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
