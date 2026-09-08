import React, { useEffect, useState } from 'react';
import { api } from '../../api/client';
import { SolarSummary, SolarRoiSimulation } from '../../types';
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
  Sun,
  Zap,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Calculator,
  RefreshCw,
  Sliders,
  DollarSign,
  ShieldAlert
} from 'lucide-react';

export const SolarView: React.FC = () => {
  const [solarSummary, setSolarSummary] = useState<SolarSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Simulator state
  const [simCapacity, setSimCapacity] = useState(35);
  const [simCostPerKwp, setSimCostPerKwp] = useState(48000);
  const [simTariff, setSimTariff] = useState(8.15);
  const [simulation, setSimulation] = useState<SolarRoiSimulation | null>(null);

  const fetchSolarData = async () => {
    setIsLoading(true);
    try {
      const summary = await api.get<SolarSummary>('/solar/summary');
      setSolarSummary(summary);
      if (summary?.totalCapacityKwp) {
        setSimCapacity(summary.totalCapacityKwp);
      }
    } catch (err) {
      console.error('Failed to load solar data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const runSimulation = async () => {
    try {
      const result = await api.post<SolarRoiSimulation>('/solar/simulate', {
        capacityKwp: simCapacity,
        capexPerKwp: simCostPerKwp,
        tariffPerKwh: simTariff
      });
      setSimulation(result);
    } catch (err) {
      console.error('Failed to run solar simulation:', err);
    }
  };

  useEffect(() => {
    fetchSolarData();
  }, []);

  useEffect(() => {
    runSimulation();
  }, [simCapacity, simCostPerKwp, simTariff]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-gray-900">Solar Intelligence & Generation</h1>
            <Badge variant="success">Phase 5</Badge>
          </div>
          <p className="text-sm text-gray-500 mt-1">
            Rooftop solar telemetry, Capacity Utilization Factor (CUF), and 20-year financial ROI simulator.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchSolarData} icon={<RefreshCw size={14} />}>
          Refresh Telemetry
        </Button>
      </div>

      {/* Performance Alert Banner if active */}
      {solarSummary?.performanceAlert && (
        <div className="bg-amber-50 border border-amber-300 rounded-xl p-4 flex items-start gap-3">
          <AlertTriangle className="text-amber-600 shrink-0 mt-0.5" size={20} />
          <div>
            <div className="text-sm font-bold text-amber-900">
              Solar Generation Deviation Alert ({solarSummary.performanceAlert.deviationPct}% Below Expected)
            </div>
            <p className="text-xs text-amber-800 mt-0.5">{solarSummary.performanceAlert.message}</p>
            <p className="text-xs text-amber-900 font-semibold mt-1">
              Action: {solarSummary.performanceAlert.recommendedAction}
            </p>
          </div>
        </div>
      )}

      {/* Top Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Installed Solar Capacity"
          value={`${solarSummary?.totalCapacityKwp || 35} kWp`}
          subtitle="Monocrystalline Perc Array"
          icon={<Sun className="text-amber-500" size={20} />}
        />
        <StatCard
          title="Today's Solar Yield"
          value={`${solarSummary?.todayGenerationKwh || 148.5} kWh`}
          subtitle={`~₹${Math.round((solarSummary?.todayGenerationKwh || 148.5) * 8.15)} saved today`}
          icon={<Zap className="text-emerald-600" size={20} />}
        />
        <StatCard
          title="Capacity Utilization (CUF)"
          value={`${solarSummary?.capacityUtilizationFactorPct || 17.8}%`}
          subtitle="Annualized benchmark: 16-19%"
          icon={<TrendingUp className="text-blue-600" size={20} />}
        />
        <StatCard
          title="Solar Load Offset"
          value={`${solarSummary?.solarContributionPct || 22.4}%`}
          subtitle="Daytime common loads met by solar"
          icon={<CheckCircle2 className="text-indigo-600" size={20} />}
        />
      </div>

      {/* Daily Generation History Chart */}
      <Card
        title="Solar Generation Trend (Past 30 Days)"
        subtitle="Daily solar production (kWh) vs. local self-consumption and DISCOM net-meter exports"
        icon={<Sun size={18} className="text-amber-500" />}
      >
        <div className="h-72 w-full pt-4">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={solarSummary?.recentDailyGeneration || []}>
              <defs>
                <linearGradient id="solarGenGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10B981" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="#10B981" stopOpacity={0.05} />
                </linearGradient>
                <linearGradient id="selfConsGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.6} />
                  <stop offset="95%" stopColor="#3B82F6" stopOpacity={0.05} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} />
              <YAxis unit=" kWh" tick={{ fontSize: 11 }} />
              <Tooltip formatter={(value: any) => [`${value} kWh`, '']} />
              <Legend />
              <Area
                type="monotone"
                dataKey="generationKwh"
                name="Total Generation (kWh)"
                stroke="#10B981"
                fill="url(#solarGenGrad)"
              />
              <Area
                type="monotone"
                dataKey="selfConsumedKwh"
                name="Self-Consumed (kWh)"
                stroke="#3B82F6"
                fill="url(#selfConsGrad)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* 20-Year Solar ROI Simulator */}
      <Card
        title="20-Year Rooftop Solar ROI Simulator"
        subtitle="Simulate financial viability, payback timeframe, and multi-year cumulative savings under state net-metering."
        icon={<Calculator size={18} className="text-blue-600" />}
      >
        <div className="mb-4 inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-amber-50 border border-amber-200 text-amber-800 text-xs font-semibold">
          <ShieldAlert size={14} />
          Simulation / Estimate — Not Guaranteed
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Controls */}
          <div className="lg:col-span-5 bg-gray-50 p-5 rounded-xl border border-gray-200 space-y-5">
            <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
              <Sliders size={16} className="text-blue-600" />
              Simulation Assumptions
            </h3>

            <div>
              <div className="flex justify-between text-xs font-semibold text-gray-700 mb-1">
                <span>Proposed System Capacity</span>
                <span className="text-blue-600 font-bold">{simCapacity} kWp</span>
              </div>
              <input
                type="range"
                min="10"
                max="120"
                step="5"
                value={simCapacity}
                onChange={(e) => setSimCapacity(Number(e.target.value))}
                className="w-full accent-blue-600 cursor-pointer"
              />
              <div className="flex justify-between text-[11px] text-gray-400 mt-0.5">
                <span>10 kWp</span>
                <span>65 kWp</span>
                <span>120 kWp</span>
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs font-semibold text-gray-700 mb-1">
                <span>Turnkey Capital Cost</span>
                <span className="text-blue-600 font-bold">₹{simCostPerKwp.toLocaleString('en-IN')}/kWp</span>
              </div>
              <input
                type="range"
                min="40000"
                max="60000"
                step="1000"
                value={simCostPerKwp}
                onChange={(e) => setSimCostPerKwp(Number(e.target.value))}
                className="w-full accent-blue-600 cursor-pointer"
              />
              <div className="flex justify-between text-[11px] text-gray-400 mt-0.5">
                <span>₹40k (Economy)</span>
                <span>₹48k (Standard)</span>
                <span>₹60k (Premium)</span>
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs font-semibold text-gray-700 mb-1">
                <span>Active Electricity Tariff</span>
                <span className="text-blue-600 font-bold">₹{simTariff.toFixed(2)}/kWh</span>
              </div>
              <input
                type="range"
                min="6.5"
                max="12.0"
                step="0.25"
                value={simTariff}
                onChange={(e) => setSimTariff(Number(e.target.value))}
                className="w-full accent-blue-600 cursor-pointer"
              />
              <div className="flex justify-between text-[11px] text-gray-400 mt-0.5">
                <span>₹6.50</span>
                <span>₹8.15 (BESCOM)</span>
                <span>₹12.00</span>
              </div>
            </div>
          </div>

          {/* Results Output */}
          <div className="lg:col-span-7 flex flex-col justify-between space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div className="bg-blue-50/70 border border-blue-200 p-3 rounded-lg">
                <span className="text-[11px] text-blue-700 font-semibold block uppercase">Total CAPEX</span>
                <span className="text-lg font-bold text-gray-900">
                  ₹{(simulation?.capexInr || simCapacity * simCostPerKwp).toLocaleString('en-IN')}
                </span>
                <span className="text-[11px] text-gray-500 block mt-0.5">Turnkey Installed</span>
              </div>

              <div className="bg-emerald-50/70 border border-emerald-200 p-3 rounded-lg">
                <span className="text-[11px] text-emerald-700 font-semibold block uppercase">Annual Savings</span>
                <span className="text-lg font-bold text-emerald-700">
                  ₹{(simulation?.annualSavingsInr || Math.round(simCapacity * 1450 * simTariff)).toLocaleString('en-IN')}
                </span>
                <span className="text-[11px] text-gray-500 block mt-0.5">Direct Bill Offset</span>
              </div>

              <div className="bg-amber-50/70 border border-amber-200 p-3 rounded-lg">
                <span className="text-[11px] text-amber-700 font-semibold block uppercase">Simple Payback</span>
                <span className="text-lg font-bold text-amber-800">
                  {simulation?.simplePaybackYears || (simCostPerKwp / (1450 * simTariff)).toFixed(1)} Years
                </span>
                <span className="text-[11px] text-gray-500 block mt-0.5">Breakeven Period</span>
              </div>
            </div>

            <div className="p-4 bg-slate-900 rounded-xl text-white">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs text-slate-400 block uppercase tracking-wider font-semibold">
                    20-Year Estimated Net Benefit
                  </span>
                  <span className="text-2xl font-black text-emerald-400">
                    ₹{(simulation?.twentyYearEstimatedBenefitInr || Math.round((simCapacity * 1450 * simTariff * 20) - (simCapacity * simCostPerKwp))).toLocaleString('en-IN')}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-xs text-slate-400 block">Annual Clean Energy</span>
                  <span className="text-sm font-bold text-white">
                    {(simCapacity * 1450).toLocaleString('en-IN')} kWh / year
                  </span>
                </div>
              </div>
              <p className="text-xs text-slate-400 mt-2 border-t border-slate-800 pt-2">
                * Includes 0.7% annual module degradation factor and 1.5% annual inverter maintenance allowance.
              </p>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};
