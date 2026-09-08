import React, { useEffect, useState } from 'react';
import { api } from '../../api/client';
import { EVCharger, EVSession, EVOptimizationSummary } from '../../types';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { StatCard } from '../../components/common/StatCard';
import {
  BatteryCharging,
  Zap,
  Clock,
  TrendingDown,
  RefreshCw,
  Plus,
  ShieldCheck,
  AlertCircle,
  Car
} from 'lucide-react';

export const EVView: React.FC = () => {
  const [chargers, setChargers] = useState<EVCharger[]>([]);
  const [sessions, setSessions] = useState<EVSession[]>([]);
  const [summary, setSummary] = useState<EVOptimizationSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [chargersData, sessionsData, summaryData] = await Promise.all([
        api.get<EVCharger[]>('/ev/chargers'),
        api.get<EVSession[]>('/ev/sessions?limit=25'),
        api.get<EVOptimizationSummary>('/ev/summary')
      ]);
      setChargers(chargersData || []);
      setSessions(sessionsData || []);
      setSummary(summaryData);
    } catch (err) {
      console.error('Failed to load EV data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-gray-900">EV Charging Intelligence</h1>
            <Badge variant="primary">Phase 5</Badge>
          </div>
          <p className="text-sm text-gray-500 mt-1">
            Community EV charging fleet monitoring, peak demand coincidence mitigation, and cost recovery.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchData} icon={<RefreshCw size={14} />}>
          Refresh
        </Button>
      </div>

      {/* Top Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Active EV Chargers"
          value={chargers.length}
          subtitle="Dual-gun Type-2 smart stations"
          icon={<BatteryCharging className="text-emerald-600" size={20} />}
        />
        <StatCard
          title="Energy Dispensed (30D)"
          value={`${summary?.monthlyEnergyKwh || 1420} kWh`}
          subtitle={`${summary?.sessionsThisMonth || 48} sessions recorded`}
          icon={<Zap className="text-blue-600" size={20} />}
        />
        <StatCard
          title="Peak Coincidence Load"
          value={summary?.peakLoadContribution === 'high' ? '14.8 kW' : '7.4 kW'}
          subtitle="Overlapping with evening 18-22h peak"
          icon={<Clock className="text-amber-600" size={20} />}
        />
        <StatCard
          title="Load Shift Opportunity"
          value={`₹${(summary?.potentialMonthlySavingsInr ? summary.potentialMonthlySavingsInr * 12 : 72000).toLocaleString('en-IN')}/yr`}
          subtitle="By shifting to off-peak slots"
          icon={<TrendingDown className="text-purple-600" size={20} />}
        />
      </div>

      {/* Peak Load Mitigation & Optimization Recommendation */}
      <Card
        title="EV Load Optimization Strategy"
        subtitle="Automated peak-shaving recommendations to safeguard sanctioned load headroom"
        icon={<ShieldCheck size={18} className="text-emerald-600" />}
      >
        <div className="bg-gradient-to-r from-emerald-50 via-teal-50 to-blue-50 border border-emerald-200 rounded-xl p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-gray-900">
                {summary?.optimizationOpportunity?.title || 'Peak Demand Throttling & Off-Peak Incentive'}
              </span>
              <Badge variant="success">Recommended</Badge>
            </div>
            <p className="text-xs text-gray-600 mt-1 max-w-2xl">
              {summary?.optimizationOpportunity?.description ||
                'Configure OCPP smart power curtailment to throttle chargers from 22 kW to 7 kW when society demand exceeds 80% of sanctioned limit. Introduce a ₹1.50/kWh discount for charging between 23:00 and 06:00.'}
            </p>
          </div>
          <div className="text-right shrink-0">
            <span className="text-xs text-gray-500 block uppercase font-semibold">Potential Impact</span>
            <span className="text-lg font-bold text-emerald-700">
              {summary?.optimizationOpportunity?.estimatedImpact || 'Save ₹6,000 / month'}
            </span>
          </div>
        </div>
      </Card>

      {/* Registered Chargers List */}
      <Card
        title="Community Charger Fleet"
        subtitle="Connected AC/DC charging stations installed across visitor and resident bays"
        icon={<BatteryCharging size={18} className="text-blue-600" />}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {chargers.map((charger) => (
            <div
              key={charger.id}
              className="p-4 border border-gray-200 rounded-xl bg-white hover:border-blue-400 transition-all shadow-sm"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-lg">
                    <Car size={20} />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900 text-sm">{charger.name}</h3>
                    <p className="text-xs text-gray-500">{charger.location || 'Common Bay'}</p>
                  </div>
                </div>
                <Badge variant={charger.status === 'active' ? 'success' : 'warning'}>
                  {charger.status === 'active' ? 'Online' : charger.status}
                </Badge>
              </div>

              <div className="grid grid-cols-2 gap-2 mt-4 pt-3 border-t border-gray-100 text-xs">
                <div>
                  <span className="text-gray-400 block">Rating</span>
                  <span className="font-semibold text-gray-800">{charger.power_rating_kw} kW AC</span>
                </div>
                <div>
                  <span className="text-gray-400 block">Type</span>
                  <span className="font-semibold text-gray-800">{charger.charger_type}</span>
                </div>
              </div>
            </div>
          ))}
          {chargers.length === 0 && (
            <div className="col-span-2 text-center py-6 text-gray-400 text-sm">
              No EV chargers currently registered.
            </div>
          )}
        </div>
      </Card>

      {/* Charging Sessions Log */}
      <Card
        title="Recent Charging Sessions Log"
        subtitle="Chronological transaction log with peak-coincidence detection"
        icon={<Clock size={18} className="text-blue-600" />}
      >
        <div className="overflow-x-auto border border-gray-200 rounded-lg">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50 text-gray-600 font-semibold">
              <tr>
                <th className="px-4 py-3 text-left">Charger</th>
                <th className="px-4 py-3 text-left">Start Time</th>
                <th className="px-4 py-3 text-left">Energy Dispensed</th>
                <th className="px-4 py-3 text-left">Peak Demand</th>
                <th className="px-4 py-3 text-left">Billed Amount</th>
                <th className="px-4 py-3 text-left">Window</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {sessions.map((sess) => (
                <tr key={sess.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">{sess.charger_name || 'Charger Bay'}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs">
                    {new Date(sess.start_time).toLocaleString('en-IN', {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </td>
                  <td className="px-4 py-3 font-semibold text-gray-900">{sess.energy_consumed_kwh} kWh</td>
                  <td className="px-4 py-3 text-gray-600">{sess.peak_demand_kw || 7.2} kW</td>
                  <td className="px-4 py-3 font-bold text-gray-900">₹{sess.cost_inr || Math.round(sess.energy_consumed_kwh * 10.5)}</td>
                  <td className="px-4 py-3">
                    {sess.is_peak_window ? (
                      <Badge variant="warning">Peak 18-22h</Badge>
                    ) : (
                      <Badge variant="success">Off-Peak</Badge>
                    )}
                  </td>
                </tr>
              ))}
              {sessions.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-center text-gray-400">
                    No session logs found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};
