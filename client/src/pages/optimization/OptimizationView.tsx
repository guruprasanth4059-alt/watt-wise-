import React, { useEffect, useState } from 'react';
import { api } from '../../api/client';
import { PeakManagementOverview } from '../../types';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { StatCard } from '../../components/common/StatCard';
import {
  Activity,
  Zap,
  TrendingDown,
  AlertTriangle,
  Clock,
  ShieldCheck,
  CheckCircle2,
  RefreshCw,
  Sliders,
  ChevronRight
} from 'lucide-react';

export const OptimizationView: React.FC = () => {
  const [overview, setOverview] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const data = await api.get<any>('/optimization/peak-management');
      setOverview(data);
    } catch (err) {
      console.error('Failed to load peak management overview:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const sanctioned = overview?.contractedThresholdKw || overview?.sanctionedLoadKw || 120;
  const recorded = overview?.historicalPeakKw || overview?.recordedPeakKw || 98.4;
  const headroom = overview?.headroomKw || Math.round((sanctioned - recorded) * 10) / 10;
  const utilizationPct = Math.round((recorded / sanctioned) * 100);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-gray-900">Peak Demand & Load Optimization</h1>
            <Badge variant="primary">Phase 5</Badge>
          </div>
          <p className="text-sm text-gray-500 mt-1">
            Mitigate coincident evening spikes across water pumps, EV chargers, and common lighting.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchData} icon={<RefreshCw size={14} />}>
          Refresh
        </Button>
      </div>

      {/* Top Stat Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Sanctioned Load Cap"
          value={`${sanctioned} kW`}
          subtitle="Contracted DISCOM capacity"
          icon={<Zap className="text-blue-600" size={20} />}
        />
        <StatCard
          title="Recorded Max Demand"
          value={`${recorded} kW`}
          subtitle={`${utilizationPct}% utilization level`}
          icon={<Activity className="text-amber-600" size={20} />}
        />
        <StatCard
          title="Available Headroom"
          value={`${headroom} kW`}
          subtitle={headroom > 15 ? 'Safe operating buffer' : 'Buffer narrow; risk of penalty'}
          icon={<ShieldCheck className="text-emerald-600" size={20} />}
        />
        <StatCard
          title="Potential Shaved Load"
          value={`${overview?.potentialShavedKw || 16.5} kW`}
          subtitle={`₹${((overview?.totalAnnualSavingsInr || 240000)).toLocaleString('en-IN')}/yr savings`}
          icon={<TrendingDown className="text-purple-600" size={20} />}
        />
      </div>

      {/* Sanctioned Load Capacity Bar */}
      <Card
        title="Sanctioned Capacity Utilization"
        subtitle="Current peak draw relative to contracted threshold. Operating above 85% incurs penalty risks."
        icon={<Activity size={18} className="text-amber-500" />}
      >
        <div className="space-y-3">
          <div className="flex justify-between items-center text-sm">
            <div className="flex items-center gap-2">
              <span className="font-bold text-gray-900">{recorded} kW Recorded</span>
              <span className="text-xs text-gray-400">/ {sanctioned} kW Limit</span>
            </div>
            <Badge variant={utilizationPct >= 85 ? 'warning' : 'success'}>
              {utilizationPct}% Utilization ({overview?.riskLevel?.toUpperCase() || 'MODERATE'} RISK)
            </Badge>
          </div>

          <div className="w-full bg-gray-100 h-4 rounded-full overflow-hidden flex">
            <div
              className={`h-full ${utilizationPct >= 85 ? 'bg-amber-500' : 'bg-blue-600'} transition-all`}
              style={{ width: `${Math.min(100, utilizationPct)}%` }}
            ></div>
          </div>

          <div className="flex justify-between text-xs text-gray-400">
            <span>0 kW</span>
            <span>85% Warning Threshold ({Math.round(sanctioned * 0.85)} kW)</span>
            <span>100% Contract Limit ({sanctioned} kW)</span>
          </div>
        </div>
      </Card>

      {/* Coincident Peak Load Contributors */}
      <Card
        title="Coincident Peak Load Breakdown (18:30 - 21:45 IST)"
        subtitle="Identified loads operating simultaneously during evening peak tariff window"
        icon={<Clock size={18} className="text-blue-600" />}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {(overview?.majorContributors || []).map((c: any, i: number) => (
            <div key={i} className="p-4 border border-gray-200 rounded-xl bg-gray-50/50">
              <div className="flex justify-between items-center mb-2">
                <span className="font-semibold text-sm text-gray-900">{c.name}</span>
                <Badge variant="neutral">{c.percentage}%</Badge>
              </div>
              <div className="text-xl font-bold text-gray-900">{c.loadKw} kW</div>
              <div className="w-full bg-gray-200 h-1.5 rounded-full mt-2 overflow-hidden">
                <div className="bg-blue-600 h-full" style={{ width: `${c.percentage}%` }}></div>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Peak Staggering Action Plans */}
      <Card
        title="Actionable Peak Staggering Strategies"
        subtitle="Zero-cost or low-cost scheduling modifications to trim coincident peak demand"
        icon={<ShieldCheck size={18} className="text-emerald-600" />}
      >
        <div className="space-y-4">
          {(overview?.strategies || [
            {
              id: 'pumps',
              title: 'Hydro-Pneumatic & Overhead Tank Pump Staggering',
              action: 'Shift primary overhead tank filling cycles to 11:00–15:00 (daytime solar generation) and 03:00–06:00 (night off-peak). Interlock non-emergency booster pumping between 18:00–21:30.',
              peakReductionKw: 10.5,
              annualSavingsInr: 126000,
              implementationComplexity: 'Low (Timer / Smart Switch setup)'
            },
            {
              id: 'ev',
              title: 'EV Charging Peak Demand Curtailment',
              action: 'Throttle community EV chargers when society draw exceeds 80% of sanctioned limit. Incentivize overnight charging with a ₹1.50/kWh discount.',
              peakReductionKw: 6.0,
              annualSavingsInr: 72000,
              implementationComplexity: 'Medium (OCPP Load Management rule)'
            }
          ]).map((s: any) => (
            <div
              key={s.id}
              className="p-5 border border-gray-200 rounded-xl bg-white hover:border-emerald-300 transition-all flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
            >
              <div className="max-w-2xl">
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-gray-900 text-sm">{s.title}</h3>
                  <Badge variant="success">Shave {s.peakReductionKw} kW</Badge>
                </div>
                <p className="text-xs text-gray-600 mt-1">{s.action}</p>
                <div className="text-[11px] text-gray-400 mt-2">
                  Complexity: <span className="font-medium text-gray-600">{s.implementationComplexity}</span>
                </div>
              </div>
              <div className="text-right shrink-0">
                <span className="text-xs text-gray-500 uppercase font-semibold block">Annual Benefit</span>
                <span className="text-lg font-bold text-emerald-700">
                  ₹{Number(s.annualSavingsInr).toLocaleString('en-IN')} / yr
                </span>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
};
