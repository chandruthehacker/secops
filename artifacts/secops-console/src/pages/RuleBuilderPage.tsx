import React, { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { useLocation } from 'wouter';
import { ArrowLeft, Save, Play, Plus, Trash2, Code } from 'lucide-react';
import { useAppStore } from '@/store';
import { v4 as uuidv4 } from 'uuid';
import { Severity } from '@/lib/types';

export default function RuleBuilderPage() {
  const [, setLocation] = useLocation();
  const { addRule } = useAppStore();

  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');
  const [severity, setSeverity] = useState<Severity>('medium');
  const [conditions, setConditions] = useState([{ id: uuidv4(), field: 'event.type', operator: '==', value: '' }]);

  const handleSave = () => {
    if (!name) return;
    
    const newRule = {
      id: uuidv4(),
      name,
      description: desc,
      severity,
      enabled: true,
      conditions,
      yaml: `# Auto-generated Sigma rule\ntitle: ${name}\nstatus: experimental\n...`,
      mitreIds: [],
      mitreTactics: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      author: 'Current User',
      triggerCount: 0
    };
    
    addRule(newRule);
    setLocation('/rules');
  };

  const generatedYaml = `title: ${name || 'New Rule'}
description: ${desc || 'No description'}
status: experimental
level: ${severity}
logsource:
  category: generic
detection:
  selection:
${conditions.map(c => `    ${c.field || 'field'}: '${c.value || 'value'}'`).join('\n')}
  condition: selection`;

  return (
    <MainLayout>
      <div className="flex flex-col gap-6 max-w-6xl mx-auto h-[calc(100vh-8rem)]">
        <div className="flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-4">
            <button onClick={() => setLocation('/rules')} className="p-2 hover:bg-secondary rounded-lg text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Rule Builder</h1>
          </div>
          
          <div className="flex gap-3">
            <button className="flex items-center gap-2 px-4 py-2 border border-border text-foreground rounded-lg hover:bg-secondary transition-colors">
              <Play className="w-4 h-4" /> Test Rule
            </button>
            <button 
              onClick={handleSave}
              className="flex items-center gap-2 px-5 py-2 bg-primary text-primary-foreground font-semibold rounded-lg hover:bg-primary/90 transition-all shadow-lg shadow-primary/20"
            >
              <Save className="w-4 h-4" /> Save Rule
            </button>
          </div>
        </div>

        <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-6 min-h-0">
          
          {/* Left Form */}
          <div className="bg-card border border-border rounded-xl p-6 shadow-lg overflow-y-auto">
            <h3 className="font-semibold text-foreground mb-6 text-lg border-b border-border pb-2">Rule Details</h3>
            
            <div className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1.5">Rule Name</label>
                <input 
                  type="text" 
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="e.g., Suspicious PowerShell Download"
                  className="w-full bg-input border border-border rounded-lg px-4 py-2.5 text-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1.5">Description</label>
                <textarea 
                  value={desc}
                  onChange={e => setDesc(e.target.value)}
                  placeholder="Explain what this rule detects..."
                  className="w-full bg-input border border-border rounded-lg px-4 py-2.5 text-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all h-24 resize-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1.5">Severity</label>
                <select 
                  value={severity}
                  onChange={e => setSeverity(e.target.value as Severity)}
                  className="w-full bg-input border border-border rounded-lg px-4 py-2.5 text-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all appearance-none"
                >
                  <option value="info">Info</option>
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="critical">Critical</option>
                </select>
              </div>

              <div className="pt-4 mt-2 border-t border-border">
                <div className="flex items-center justify-between mb-4">
                  <label className="block text-sm font-medium text-foreground">Detection Logic</label>
                  <button 
                    onClick={() => setConditions([...conditions, { id: uuidv4(), field: '', operator: '==', value: '' }])}
                    className="text-xs text-primary hover:underline flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" /> Add Condition
                  </button>
                </div>
                
                <div className="space-y-3">
                  {conditions.map((cond, index) => (
                    <div key={cond.id} className="flex gap-2 items-center bg-secondary/30 p-2 rounded-lg border border-border">
                      <input 
                        type="text" 
                        placeholder="Field (e.g. process.name)"
                        value={cond.field}
                        onChange={e => {
                          const newC = [...conditions];
                          newC[index].field = e.target.value;
                          setConditions(newC);
                        }}
                        className="flex-1 min-w-0 bg-input border border-border rounded-md px-3 py-1.5 text-sm text-foreground focus:border-primary"
                      />
                      <select 
                        value={cond.operator}
                        onChange={e => {
                          const newC = [...conditions];
                          newC[index].operator = e.target.value;
                          setConditions(newC);
                        }}
                        className="w-24 bg-input border border-border rounded-md px-2 py-1.5 text-sm text-foreground focus:border-primary"
                      >
                        <option value="==">Equals</option>
                        <option value="contains">Contains</option>
                        <option value="regex">Regex</option>
                      </select>
                      <input 
                        type="text" 
                        placeholder="Value"
                        value={cond.value}
                        onChange={e => {
                          const newC = [...conditions];
                          newC[index].value = e.target.value;
                          setConditions(newC);
                        }}
                        className="flex-1 min-w-0 bg-input border border-border rounded-md px-3 py-1.5 text-sm text-foreground focus:border-primary"
                      />
                      <button 
                        onClick={() => setConditions(conditions.filter(c => c.id !== cond.id))}
                        className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Right Preview */}
          <div className="bg-[#050810] border border-border rounded-xl shadow-lg flex flex-col overflow-hidden">
            <div className="p-4 border-b border-border bg-card flex justify-between items-center">
              <h3 className="font-semibold text-foreground text-sm flex items-center gap-2">
                <Code className="w-4 h-4 text-primary" /> Sigma YAML Preview
              </h3>
            </div>
            <div className="p-4 flex-1 overflow-auto">
              <pre className="text-sm font-mono text-green-400">
                {generatedYaml}
              </pre>
            </div>
          </div>

        </div>
      </div>
    </MainLayout>
  );
}
