import React, { useEffect, useState } from 'react';
import { api } from '../../api/client';
import { StorageSimulationInput, StorageSimulationResult } from '../../types';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { StatCard } from '../../components/common/StatCard';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend
} from 'recharts';
import {
  Battery,
  Zap,
  TrendingDown,
  Calculator,
  ShieldAlert,
  Sliders,
  Clock,
  Layers
} from 'lucide-react';

export const StorageView: React.FC = () => {
  const [capacityKwh, setCapacityKwh] = useState(50);
  const [powerRatingKw, setPowerRatingKw] = useState(25);
  const [capexPerKwh, setCapexPerKwh] = useState(24000);
  const [strategy, setStrategy] = useState<'peak_shaving' | 'solar_self_consumption' | 'tou_shifting'>('peak_shaving');
  const [result, setResult] = useState<(StorageSimulationResult & { dispatchProfile?: any[]; disclaimer?: string }) | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const runSimulation = async () => {
    setIsLoading(true);
    try {
      const res = await api.post<StorageSimulationResult & { dispatchProfile?: any[]; disclaimer?: string }>(
        '/storage/simulate',
        {
          capacityKwh,
          powerRatingKw,
          capexInr: capacityKwh * capexPerKwh,
          operatingStrategy: strategy
        }
      );
      setResult(res);
    } catch (err) {
      console.error('Failed to run storage simulation:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    runSimulation();
  }, [capacityKwh, powerRatingKw, capexPerKwh, strategy]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-gray-900">Battery Storage (BESS) Simulator</h1>
            <Badge variant="primary">Phase 5</Badge>
          </div>
          <p className="text-sm text-gray-500 mt-1">
            Evaluate battery energy storage readiness, peak demand shaving, and ToU tariff arbitrage.
          </p>
        </div>
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-800 text-xs font-semibold">
          <ShieldAlert size={14} />
          Simulation / Estimate — Not Guaranteed
        </div>
      </div>

      {/* Top Stat Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Modeled BESS Capacity"
          value={`${capacityKwh} kWh`}
          subtitle={`${powerRatingKw} kW Power Rating (0.5C)`}
          icon={<Battery className="text-blue-600" size={20} />}
        />
        <StatCard
          title="Peak Demand Reduction"
          value={`${result?.potentialPeakReductionKw || 16.5} kW`}
          subtitle="Shaved during 18-22h peak window"
          icon={<TrendingDown className="text-emerald-600" size={20} />}
        />
        <StatCard
          title="Annual Savings"
          value={`₹${(result?.estimatedAnnualSavingsInr || 168000).toLocaleString('en-IN')}`}
          subtitle="Demand charge cut + energy arbitrage"
          icon={<Zap className="text-amber-600" size={20} />}
        />
        <StatCard
          title="Estimated Payback"
          value={result?.estimatedPaybackYears ? `${result.estimatedPaybackYears} Years` : '6.8 Years'}
          subtitle="Simple payback period"
          icon={<Clock className="text-purple-600" size={20} />}
        />
      </div>

      {/* Main Simulator Card */}
      <Card
        title="Storage Sizing & Strategy Parameters"
        subtitle="Configure capacity, cell chemistry cost, and operating priority"
        icon={<Calculator size={18} className="text-blue-600" />}
      >
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Controls */}
          <div className="lg:col-span-5 bg-gray-50 p-5 rounded-xl border border-gray-200 space-y-5">
            <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
              <Sliders size={16} className="text-blue-600" />
              Sizing Assumptions
            </h3>

            <div>
              <div className="flex justify-between text-xs font-semibold text-gray-700 mb-1">
                <span>Storage Capacity</span>
                <span className="text-blue-600 font-bold">{capacityKwh} kWh</span>
              </div>
              <input
                type="range"
                min="10"
                max="150"
                step="5"
                value={capacityKwh}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  setCapacityKwh(val);
                  setPowerRatingKw(Math.round(val * 0.5));
                }}
                className="w-full accent-blue-600 cursor-pointer"
              />
              <div className="flex justify-between text-[11px] text-gray-400 mt-0.5">
                <span>10 kWh</span>
                <span>75 kWh</span>
                <span>150 kWh</span>
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs font-semibold text-gray-700 mb-1">
                <span>Pack Capital Cost (INR / kWh)</span>
                <span className="text-blue-600 font-bold">₹{capexPerKwh.toLocaleString('en-IN')}</span>
              </div>
              <input
                type="range"
                min="16000"
                max="32000"
                step="1000"
                value={capexPerKwh}
                onChange={(e) => setCapexPerKwh(Number(e.target.value))}
                className="w-full accent-blue-600 cursor-pointer"
              />
              <div className="flex justify-between text-[11px] text-gray-400 mt-0.5">
                <span>₹16k (Cell target)</span>
                <span>₹24k (LFP current)</span>
                <span>₹32k (Premium)</span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                Operating Strategy
              </label>
              <select
                value={strategy}
                onChange={(e) => setStrategy(e.target.value as any)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white font-medium"
              >
                <option value="peak_shaving">Peak Demand Shaving (Demand Charge Focus)</option>
                <option value="solar_self_consumption">Solar Self-Consumption (Store Day Solar)</option>
                <option value="tou_shifting">ToU Tariff Arbitrage (Night Charge, Peak Discharge)</option>
              </select>
            </div>
          </div>

          {/* Outputs */}
          <div className="lg:col-span-7 flex flex-col justify-between space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div className="bg-blue-50/70 border border-blue-200 p-3 rounded-lg">
                <span className="text-[11px] text-blue-700 font-semibold block uppercase">Total Pack CAPEX</span>
                <span className="text-lg font-bold text-gray-900">
                  ₹{(capacityKwh * capexPerKwh).toLocaleString('en-IN')}
                </span>
                <span className="text-[11px] text-gray-500 block mt-0.5">Turnkey Installed</span>
              </div>

              <div className="bg-emerald-50/70 border border-emerald-200 p-3 rounded-lg">
                <span className="text-[11px] text-emerald-700 font-semibold block uppercase">Monthly Offset</span>
                <span className="text-lg font-bold text-emerald-700">
                  {result?.potentialGridEnergyOffsetKwhMonthly || 1275} kWh
                </span>
                <span className="text-[11px] text-gray-500 block mt-0.5">Grid Energy Shifted</span>
              </div>

              <div className="bg-purple-50/70 border border-purple-200 p-3 rounded-lg">
                <span className="text-[11px] text-purple-700 font-semibold block uppercase">Monthly Savings</span>
                <span className="text-lg font-bold text-purple-800">
                  ₹{(result?.estimatedCostSavingsMonthlyInr || 14000).toLocaleString('en-IN')}
                </span>
                <span className="text-[11px] text-gray-500 block mt-0.5">Demand + Energy</span>
              </div>
            </div>

            <div className="p-4 bg-slate-900 rounded-xl text-white">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs text-slate-400 block uppercase tracking-wider font-semibold">
                    Strategic Assessment
                  </span>
                  <span className="text-sm font-semibold text-emerald-300 mt-1 block">
                    {result?.notes || 'Viable resilience investment when paired with daytime rooftop solar.'}
                  </span>
                </div>
              </div>
              <p className="text-xs text-slate-400 mt-2 border-t border-slate-800 pt-2">
                * Assumes 88% round-trip battery efficiency, 85% depth of discharge (DoD), and 10-year cycle lifespan.
              </p>
            </div>
          </div>
        </div>
      </Card>

      {/* 24-Hour Dispatch Profile Chart */}
      <Card
        title="24-Hour Simulated Battery Dispatch Profile"
        subtitle="Hourly society base load curve vs. battery charge/discharge and resulting net grid demand"
        icon={<Clock size={18} className="text-blue-600" />}
      >
        <div className="h-72 w-full pt-4">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={result?.dispatchProfile || []}>
              <defs>
                <linearGradient id="baseDemandGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#94A3B8" stopOpacity={0.5} />
                  <stop offset="95%" stopColor="#94A3B8" stopOpacity={0.05} />
                </linearGradient>
                <linearGradient id="netDemandGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="#3B82F6" stopOpacity={0.1} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="hour" tickFormatter={(h) => `${h}:00`} tick={{ fontSize: 11 }} />
              <YAxis unit=" kW" tick={{ fontSize: 11 }} />
              <Tooltip
                labelFormatter={(h) => `Hour ${h}:00 IST`}
                formatter={(val: any, name: any) => [`${val} kW`, name]}
              />
              <Legend />
              <Area
                type="monotone"
                dataKey="baseDemandKw"
                name="Base Society Demand"
                stroke="#94A3B8"
                fill="url(#baseDemandGrad)"
              />
              <Area
                type="monotone"
                dataKey="netDemandKw"
                name="Net Demand (Post-BESS)"
                stroke="#3B82F6"
                fill="url(#netDemandGrad)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </Card>
    </div>
  );
};
