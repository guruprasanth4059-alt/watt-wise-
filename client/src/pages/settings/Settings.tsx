import React, { useState } from 'react';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { useAuth } from '../../context/AuthContext';
import { Settings as SettingsIcon, User, Shield, Bell, KeyRound } from 'lucide-react';

interface SettingsProps {
  onNavigate: (path: string) => void;
}

export const Settings: React.FC<SettingsProps> = ({ onNavigate }) => {
  const { user, society } = useAuth();
  const [activeSection, setActiveSection] = useState<'profile' | 'notifications' | 'security'>('profile');
  const [savedMessage, setSavedMessage] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSavedMessage(true);
    setTimeout(() => setSavedMessage(false), 2000);
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
          <SettingsIcon className="w-5 h-5 text-emerald-600" />
          Settings & Preferences
        </h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Manage your personal profile, alert preferences, and security credentials.
        </p>
      </div>

      <div className="flex border-b border-slate-200 text-xs font-semibold gap-6 pb-2">
        <button
          onClick={() => setActiveSection('profile')}
          className={`pb-2 transition-colors cursor-pointer ${
            activeSection === 'profile' ? 'text-emerald-600 border-b-2 border-emerald-600 font-bold' : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          User Profile
        </button>
        <button
          onClick={() => setActiveSection('notifications')}
          className={`pb-2 transition-colors cursor-pointer ${
            activeSection === 'notifications' ? 'text-emerald-600 border-b-2 border-emerald-600 font-bold' : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          Notifications
        </button>
        <button
          onClick={() => setActiveSection('security')}
          className={`pb-2 transition-colors cursor-pointer ${
            activeSection === 'security' ? 'text-emerald-600 border-b-2 border-emerald-600 font-bold' : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          Security & Password
        </button>
      </div>

      {savedMessage && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-lg">
          Settings updated successfully.
        </div>
      )}

      {activeSection === 'profile' && (
        <Card className="p-6">
          <form onSubmit={handleSave} className="space-y-4 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Full Name</label>
              <input
                type="text"
                defaultValue={user?.name}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Email Address</label>
              <input
                type="email"
                disabled
                defaultValue={user?.email}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-slate-50 text-slate-500"
              />
              <span className="text-[10px] text-slate-400 mt-0.5 block">Contact platform admin to change login email.</span>
            </div>

            <div className="pt-2">
              <span className="font-semibold text-slate-700 block mb-1">Current Role</span>
              <Badge variant="emerald" size="md">
                {user?.role?.replace('_', ' ').toUpperCase()}
              </Badge>
            </div>

            <div className="pt-4 border-t border-slate-100 flex justify-end">
              <Button type="submit" variant="primary">
                Save Profile
              </Button>
            </div>
          </form>
        </Card>
      )}

      {activeSection === 'notifications' && (
        <Card className="p-6 space-y-4 text-xs">
          <h3 className="font-bold text-slate-800 text-sm">Email & In-App Alerts</h3>
          <div className="space-y-3">
            {[
              { id: '1', label: 'Bill Verification Alerts', desc: 'Notify when new electricity bills are uploaded and await confirmation.' },
              { id: '2', label: 'Unusual Consumption Warnings', desc: 'Alert when month-over-month consumption increases by more than 8%.' },
              { id: '3', label: 'Monthly Report Readiness', desc: 'Notify when the monthly executive PDF summary is compiled.' }
            ].map(item => (
              <div key={item.id} className="flex items-start justify-between p-3 rounded-lg bg-slate-50 border border-slate-100">
                <div>
                  <span className="font-bold text-slate-800">{item.label}</span>
                  <p className="text-slate-500 text-[11px] mt-0.5">{item.desc}</p>
                </div>
                <input type="checkbox" defaultChecked className="rounded text-emerald-600 focus:ring-emerald-500 h-4 w-4" />
              </div>
            ))}
          </div>
        </Card>
      )}

      {activeSection === 'security' && (
        <Card className="p-6 space-y-4 text-xs">
          <h3 className="font-bold text-slate-800 text-sm">Update Password</h3>
          <div className="space-y-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Current Password</label>
              <input type="password" placeholder="••••••••" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">New Password</label>
              <input type="password" placeholder="Min 6 characters" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" />
            </div>
          </div>
          <div className="pt-2 flex justify-end">
            <Button variant="primary">Update Password</Button>
          </div>
        </Card>
      )}
    </div>
  );
};
