import React, { useEffect, useState } from 'react';
import { api } from '../../api/client';
import { AnalyticsSummary, CategoryBreakdown, Meter, Bill } from '../../types';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { StatCard } from '../../components/common/StatCard';
import { CategoryBreakdownChart } from '../../components/charts/CategoryBreakdownChart';
import { ConsumptionTrendChart } from '../../components/charts/ConsumptionTrendChart';
import { SkeletonCard, SkeletonChart } from '../../components/common/SkeletonLoader';
import { Zap, Droplets, Lightbulb, Building, Gauge, PlusCircle, Receipt } from 'lucide-react';

interface EnergyProps {
  onNavigate: (path: string) => void;
}

export const Energy: React.FC<EnergyProps> = ({ onNavigate }) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'consumption' | 'common_areas' | 'meters'>('overview');
  const [analytics, setAnalytics] = useState<AnalyticsSummary | null>(null);
  const [breakdown, setBreakdown] = useState<CategoryBreakdown | null>(null);
  const [meters, setMeters] = useState<Meter[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [analyticsData, breakdownData, metersData] = await Promise.all([
        api.get<AnalyticsSummary>('/analytics'),
        api.get<CategoryBreakdown>('/analytics/category-breakdown'),
        api.get<Meter[]>('/meters')
      ]);
      setAnalytics(analyticsData);
      setBreakdown(breakdownData);
      setMeters(metersData);
    } catch (err) {
      console.error('Failed to load energy module data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <SkeletonCard />
        <SkeletonChart />
      </div>
    );
  }

  if (!analytics || !analytics.currentMonth) {
    return (
      <Card className="p-8 text-center space-y-3">
        <Zap className="w-10 h-10 text-slate-400 mx-auto" />
        <h3 className="text-base font-bold text-slate-800">No Consumption Data</h3>
        <p className="text-xs text-slate-500">Please upload bills to view detailed energy calculations.</p>
        <Button variant="primary" size="sm" onClick={() => onNavigate('/bills')}>
          Go to Bills Module
        </Button>
      </Card>
    );
  }

  const current = analytics.currentMonth;
  const prev = analytics.previousMonth;

  return (
    <div className="space-y-6">
      {/* Header & Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/80 pb-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Energy Intelligence Module</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Deep dive into consumption patterns, derived ratios, and common-area categories.
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex bg-slate-100 p-1 rounded-xl text-xs font-semibold">
          {[
            { id: 'overview', label: 'Overview' },
            { id: 'consumption', label: 'Consumption' },
            { id: 'common_areas', label: 'Common Areas' },
            { id: 'meters', label: 'Meters' }
          ].map(t => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id as any)}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                activeTab === t.id
                  ? 'bg-white text-slate-900 shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* TAB 1: OVERVIEW */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Detailed Metric Ratios (Section 15) */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard
              title="Current Consumption"
              value={current.consumptionKwh.toLocaleString()}
              unit="kWh"
              subtitle={`Billing Period: ${current.period}`}
            />
            <StatCard
              title="Previous Consumption"
              value={prev ? prev.consumptionKwh.toLocaleString() : 'N/A'}
              unit={prev ? 'kWh' : ''}
              subtitle={prev ? `Period: ${prev.period}` : 'First cycle'}
            />
            <StatCard
              title="Effective Tariff"
              value={`₹${analytics.costPerKwh}`}
              unit="/ kWh"
              subtitle="All charges included"
            />
            <StatCard
              title="Per-Apartment Burden"
              value={`₹${analytics.costPerApartment}`}
              unit="/ mo"
              subtitle={`${analytics.consumptionPerApartment} kWh / unit`}
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="p-5">
              <h3 className="text-sm font-bold text-slate-900 mb-2">Historical Demand (kWh)</h3>
              <ConsumptionTrendChart data={analytics.history} height={240} />
            </Card>

            <Card className="p-5">
              <h3 className="text-sm font-bold text-slate-900 mb-2">Category-Level Energy</h3>
              {breakdown && (
                <CategoryBreakdownChart
                  breakdown={breakdown}
                  onAddSubmeter={() => onNavigate('/meters')}
                />
              )}
            </Card>
          </div>
        </div>
      )}

      {/* TAB 2: CONSUMPTION */}
      {activeTab === 'consumption' && (
        <div className="space-y-6">
          <Card className="p-5">
            <h3 className="text-sm font-bold text-slate-900 mb-1">Consumption History Ledger</h3>
            <p className="text-xs text-slate-500 mb-4">Chronological common-area power demand records.</p>
            <div className="border border-slate-200 rounded-xl overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
                  <tr>
                    <th className="p-3">Period</th>
                    <th className="p-3">Units (kWh)</th>
                    <th className="p-3">Total Invoice (₹)</th>
                    <th className="p-3">Effective Cost / kWh</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {analytics.history.map(row => (
                    <tr key={row.period} className="hover:bg-slate-50/50">
                      <td className="p-3 font-semibold text-slate-800">{row.period}</td>
                      <td className="p-3 font-bold text-emerald-700">{row.consumptionKwh.toLocaleString()} kWh</td>
                      <td className="p-3 font-semibold text-slate-900">₹{row.billAmount.toLocaleString()}</td>
                      <td className="p-3 text-slate-600">₹{row.costPerKwh} / kWh</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* TAB 3: COMMON AREAS */}
      {activeTab === 'common_areas' && (
        <div className="space-y-6">
          <Card className="p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Sub-Metered Facility Analysis</h3>
                <p className="text-xs text-slate-500">
                  Identifies which common-area plant equipment drives peak consumption.
                </p>
              </div>
            </div>
            {breakdown && (
              <CategoryBreakdownChart
                breakdown={breakdown}
                onAddSubmeter={() => onNavigate('/meters')}
              />
            )}
          </Card>
        </div>
      )}

      {/* TAB 4: METERS */}
      {activeTab === 'meters' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-bold text-slate-900">Active Society Meters ({meters.length})</h3>
            <Button
              variant="primary"
              size="sm"
              onClick={() => onNavigate('/meters')}
              icon={<PlusCircle className="w-4 h-4" />}
            >
              Manage Meters
            </Button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {meters.map(m => (
              <Card key={m.id} className="p-4 space-y-2">
                <div className="flex items-start justify-between">
                  <span className="text-xs font-bold text-slate-900">{m.name}</span>
                  <Badge variant={m.type === 'pump' ? 'blue' : m.type === 'lighting' ? 'amber' : 'emerald'} size="sm">
                    {m.type.replace('_', ' ')}
                  </Badge>
                </div>
                <p className="text-[11px] font-mono text-slate-500">Meter #: {m.meter_number}</p>
                <div className="text-[11px] text-slate-600 pt-2 border-t border-slate-100 flex justify-between">
                  <span>Location: {m.building || 'Main Campus'}</span>
                  <span className="text-emerald-600 font-semibold">{m.is_active ? 'Active' : 'Inactive'}</span>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
