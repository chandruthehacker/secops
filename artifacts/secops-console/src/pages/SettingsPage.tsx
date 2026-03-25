import React from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Settings, User, Bell, Shield, Key } from 'lucide-react';

export default function SettingsPage() {
  return (
    <MainLayout>
      <div className="flex flex-col gap-6 max-w-4xl">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-3">
            <Settings className="w-8 h-8 text-primary" />
            Settings
          </h1>
          <p className="text-muted-foreground mt-1">Configure your console preferences and user profile.</p>
        </div>

        <div className="bg-card border border-border rounded-xl shadow-lg overflow-hidden">
          <div className="flex flex-col md:flex-row border-b border-border">
            <div className="p-6 md:w-64 border-r border-border bg-secondary/20">
              <nav className="space-y-1">
                {[
                  { name: 'Profile', icon: User, active: true },
                  { name: 'Notifications', icon: Bell, active: false },
                  { name: 'Security', icon: Shield, active: false },
                  { name: 'API Keys', icon: Key, active: false },
                ].map(item => (
                  <button 
                    key={item.name}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${item.active ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-secondary hover:text-foreground'}`}
                  >
                    <item.icon className="w-4 h-4" /> {item.name}
                  </button>
                ))}
              </nav>
            </div>
            
            <div className="p-8 flex-1">
              <h2 className="text-xl font-bold text-foreground mb-6">Profile Settings</h2>
              
              <div className="flex items-center gap-6 mb-8">
                <div className="w-24 h-24 rounded-full bg-primary/20 border-2 border-primary/50 flex items-center justify-center text-3xl font-bold text-primary shadow-[0_0_15px_rgba(59,130,246,0.3)]">
                  AA
                </div>
                <div>
                  <button className="px-4 py-2 bg-secondary text-foreground rounded-lg text-sm font-medium hover:bg-secondary/80 transition-colors">
                    Upload Avatar
                  </button>
                  <p className="text-xs text-muted-foreground mt-2">JPG, GIF or PNG. Max size of 800K</p>
                </div>
              </div>

              <form className="space-y-5">
                <div className="grid grid-cols-2 gap-5">
                  <div>
                    <label className="block text-sm font-medium text-muted-foreground mb-1.5">First Name</label>
                    <input type="text" defaultValue="Alice" className="w-full bg-input border border-border rounded-lg px-4 py-2 text-foreground focus:outline-none focus:border-primary" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-muted-foreground mb-1.5">Last Name</label>
                    <input type="text" defaultValue="Analyst" className="w-full bg-input border border-border rounded-lg px-4 py-2 text-foreground focus:outline-none focus:border-primary" />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-1.5">Email Address</label>
                  <input type="email" defaultValue="alice.analyst@soc.local" disabled className="w-full bg-secondary/50 border border-border/50 rounded-lg px-4 py-2 text-muted-foreground cursor-not-allowed" />
                </div>

                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-1.5">Role</label>
                  <input type="text" defaultValue="Senior Threat Hunter" className="w-full bg-input border border-border rounded-lg px-4 py-2 text-foreground focus:outline-none focus:border-primary" />
                </div>

                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-1.5">Timezone</label>
                  <select className="w-full bg-input border border-border rounded-lg px-4 py-2 text-foreground focus:outline-none focus:border-primary appearance-none">
                    <option>UTC (Universal Coordinated Time)</option>
                    <option>EST (Eastern Standard Time)</option>
                    <option>PST (Pacific Standard Time)</option>
                  </select>
                </div>

                <div className="pt-6 border-t border-border flex justify-end">
                  <button type="button" className="px-6 py-2.5 bg-primary text-primary-foreground font-semibold rounded-lg hover:bg-primary/90 transition-all shadow-lg shadow-primary/20">
                    Save Changes
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
