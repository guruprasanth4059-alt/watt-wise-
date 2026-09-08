import React, { useEffect, useState } from 'react';
import { api } from '../../api/client';
import { PilotRequest, Society } from '../../types';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { StatCard } from '../../components/common/StatCard';
import { ShieldCheck, Users, Building, DollarSign, Mail, Phone, Clock, CheckCircle2 } from 'lucide-react';

export const AdminDashboard: React.FC = () => {
  const [metrics, setMetrics] = useState<any>(null);
  const [leads, setLeads] = useState<PilotRequest[]>([]);
  const [societies, setSocieties] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'pilots' | 'societies'>('pilots');

  const fetchAdminData = async () => {
    setIsLoading(true);
    try {
      const [m, l, s] = await Promise.all([
        api.get<any>('/admin/metrics'),
        api.get<PilotRequest[]>('/admin/pilots'),
        api.get<any[]>('/admin/societies')
      ]);
      setMetrics(m);
      setLeads(l);
      setSocieties(s);
    } catch (err) {
      console.error('Failed to load platform admin data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminData();
  }, []);

  const handleStatusChange = async (leadId: string, newStatus: string) => {
    try {
      await api.put(`/admin/pilots/${leadId}/status`, { status: newStatus });
      setLeads(prev =>
        prev.map(l => (l.id === leadId ? { ...l, status: newStatus as any } : l))
      );
    } catch (err) {
      console.error(err);
    }
  };

  if (isLoading) {
    return <div className="p-12 text-center text-xs text-slate-400">Loading platform admin telemetry...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-purple-600" />
            WattWise Platform Administration
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Internal operations control panel: inbound pilot leads, society health, and revenue telemetry.
          </p>
        </div>

        <Badge variant="purple" size="md">
          Internal Admin Only
        </Badge>
      </div>

      {/* Platform KPIs (Section 58) */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard
          title="Total Societies"
          value={metrics?.totalSocieties || 0}
          icon={<Building className="w-4 h-4 text-slate-700" />}
        />
        <StatCard
          title="Active Pilots"
          value={metrics?.activePilots || 0}
          icon={<Clock className="w-4 h-4 text-emerald-600" />}
        />
        <StatCard
          title="Paid Societies"
          value={metrics?.paidSocieties || 0}
          icon={<CheckCircle2 className="w-4 h-4 text-blue-600" />}
        />
        <StatCard
          title="Pilot Requests"
          value={metrics?.pilotRequestsCount || 0}
          icon={<Users className="w-4 h-4 text-purple-600" />}
        />
        <StatCard
          title="Prototype ARR"
          value={`₹${(metrics?.estimatedPlatformRevenue || 0).toLocaleString()}`}
          unit="/ yr"
          icon={<DollarSign className="w-4 h-4 text-amber-600" />}
        />
      </div>

      {/* Tab Switcher */}
      <div className="flex gap-2 border-b border-slate-200 pb-2 text-xs font-bold">
        <button
          onClick={() => setActiveTab('pilots')}
          className={`px-3 py-1.5 rounded-lg cursor-pointer transition-colors ${
            activeTab === 'pilots' ? 'bg-purple-50 text-purple-800 border border-purple-200' : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          Inbound Pilot Leads ({leads.length})
        </button>
        <button
          onClick={() => setActiveTab('societies')}
          className={`px-3 py-1.5 rounded-lg cursor-pointer transition-colors ${
            activeTab === 'societies' ? 'bg-purple-50 text-purple-800 border border-purple-200' : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          Registered Societies ({societies.length})
        </button>
      </div>

      {/* Tab 1: Pilot Leads */}
      {activeTab === 'pilots' && (
        <Card className="p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
                <tr>
                  <th className="p-3.5">Contact / RWA</th>
                  <th className="p-3.5">City & Size</th>
                  <th className="p-3.5">Contact Details</th>
                  <th className="p-3.5">Pilot Status</th>
                  <th className="p-3.5">Received Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {leads.map(lead => (
                  <tr key={lead.id} className="hover:bg-slate-50/60">
                    <td className="p-3.5">
                      <p className="font-bold text-slate-900">{lead.name}</p>
                      <p className="text-xs text-slate-600 font-semibold">{lead.society_name}</p>
                      {lead.message && <p className="text-[11px] text-slate-400 italic mt-0.5">&ldquo;{lead.message}&rdquo;</p>}
                    </td>
                    <td className="p-3.5">
                      <p className="font-medium text-slate-800">{lead.city}</p>
                      <p className="text-slate-400 text-[11px]">{lead.apartments} Units</p>
                    </td>
                    <td className="p-3.5 text-slate-600 space-y-0.5">
                      <div className="flex items-center gap-1.5">
                        <Mail className="w-3.5 h-3.5 text-slate-400" />
                        <span>{lead.email}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Phone className="w-3.5 h-3.5 text-slate-400" />
                        <span>{lead.phone}</span>
                      </div>
                    </td>
                    <td className="p-3.5">
                      <select
                        value={lead.status}
                        onChange={e => handleStatusChange(lead.id, e.target.value)}
                        className="px-2 py-1 border border-slate-200 rounded text-xs bg-white font-medium capitalize focus:ring-1 focus:ring-purple-500"
                      >
                        <option value="new">New</option>
                        <option value="contacted">Contacted</option>
                        <option value="pilot_started">Pilot Started</option>
                        <option value="converted">Converted</option>
                        <option value="closed">Closed</option>
                      </select>
                    </td>
                    <td className="p-3.5 text-slate-400 font-mono text-[11px]">
                      {lead.created_at ? lead.created_at.slice(0, 10) : 'Recent'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Tab 2: Registered Societies */}
      {activeTab === 'societies' && (
        <Card className="p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
                <tr>
                  <th className="p-3.5">Society Name</th>
                  <th className="p-3.5">Location</th>
                  <th className="p-3.5">Units / Towers</th>
                  <th className="p-3.5">Users</th>
                  <th className="p-3.5">Bills Logged</th>
                  <th className="p-3.5">Plan Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {societies.map(soc => (
                  <tr key={soc.id} className="hover:bg-slate-50/60">
                    <td className="p-3.5 font-bold text-slate-900">{soc.name}</td>
                    <td className="p-3.5 text-slate-600">{soc.location}, {soc.city}</td>
                    <td className="p-3.5 text-slate-700 font-medium">{soc.apartments} units ({soc.buildings} towers)</td>
                    <td className="p-3.5 text-slate-700">{soc.user_count || 1}</td>
                    <td className="p-3.5 font-semibold text-emerald-700">{soc.bill_count || 0}</td>
                    <td className="p-3.5">
                      <Badge variant={soc.plan === 'pilot' ? 'emerald' : 'blue'} size="sm">
                        {soc.plan?.toUpperCase()} ({soc.sub_status})
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
};
