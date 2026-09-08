import React, { useState } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid
} from 'recharts';
import { MeterMeasurement } from '../../types';

interface IntervalConsumptionChartProps {
  measurements: MeterMeasurement[];
  height?: number;
}

export const IntervalConsumptionChart: React.FC<IntervalConsumptionChartProps> = ({
  measurements,
  height = 280
}) => {
  const [metric, setMetric] = useState<'demand' | 'energy' | 'pf'>('demand');

  if (!measurements || measurements.length === 0) {
    return (
      <div className="h-64 flex flex-col items-center justify-center text-xs text-slate-400 space-y-1">
        <span>No interval telemetry points recorded yet.</span>
        <span className="text-[11px] text-slate-500">Sync your smart meter to display 15-minute intervals.</span>
      </div>
    );
  }

  // Format timestamp for display
  const chartData = measurements.map((m) => {
    const dt = new Date(m.timestamp);
    const timeStr = dt.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
    const dateStr = dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    return {
      timestamp: m.timestamp,
      displayTime: timeStr,
      displayFull: `${dateStr} ${timeStr}`,
      demandKw: m.demand_kw ?? Number((m.energy_kwh * 4).toFixed(2)),
      energyKwh: Number(m.energy_kwh.toFixed(3)),
      powerFactor: m.power_factor ?? 0.95,
      voltage: m.voltage,
      quality: m.quality_status
    };
  });

  return (
    <div className="space-y-3">
      {/* Metric Selector Tabs */}
      <div className="flex items-center justify-between">
        <div className="flex bg-slate-100 p-0.5 rounded-lg text-[11px] font-semibold">
          <button
            type="button"
            onClick={() => setMetric('demand')}
            className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
              metric === 'demand' ? 'bg-white text-indigo-700 shadow-xs font-bold' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Active Demand (kW)
          </button>
          <button
            type="button"
            onClick={() => setMetric('energy')}
            className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
              metric === 'energy' ? 'bg-white text-emerald-700 shadow-xs font-bold' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Interval Energy (kWh)
          </button>
          <button
            type="button"
            onClick={() => setMetric('pf')}
            className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
              metric === 'pf' ? 'bg-white text-blue-700 shadow-xs font-bold' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Power Factor
          </button>
        </div>
        <span className="text-[11px] text-slate-400 font-mono">
          {chartData.length} data points (15m intervals)
        </span>
      </div>

      <div style={{ width: '100%', height }}>
        <ResponsiveContainer>
          {metric === 'energy' ? (
            <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis
                dataKey="displayTime"
                tick={{ fontSize: 10, fill: '#94a3b8' }}
                axisLine={{ stroke: '#e2e8f0' }}
                tickLine={false}
                minTickGap={24}
              />
              <YAxis
                tick={{ fontSize: 10, fill: '#94a3b8' }}
                axisLine={false}
                tickLine={false}
                unit=" kWh"
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    return (
                      <div className="bg-slate-900 text-white p-2.5 rounded-lg shadow-xl text-xs space-y-1 min-w-[130px]">
                        <p className="text-[11px] text-slate-400 font-mono">{data.displayFull}</p>
                        <p className="font-bold text-emerald-400 text-sm">
                          {data.energyKwh} <span className="text-xs font-normal">kWh</span>
                        </p>
                        <p className="text-[10px] text-slate-400">Demand: {data.demandKw} kW</p>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Bar dataKey="energyKwh" fill="#10b981" radius={[3, 3, 0, 0]} />
            </BarChart>
          ) : metric === 'demand' ? (
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="demandGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis
                dataKey="displayTime"
                tick={{ fontSize: 10, fill: '#94a3b8' }}
                axisLine={{ stroke: '#e2e8f0' }}
                tickLine={false}
                minTickGap={24}
              />
              <YAxis
                tick={{ fontSize: 10, fill: '#94a3b8' }}
                axisLine={false}
                tickLine={false}
                unit=" kW"
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    return (
                      <div className="bg-slate-900 text-white p-2.5 rounded-lg shadow-xl text-xs space-y-1 min-w-[140px]">
                        <p className="text-[11px] text-slate-400 font-mono">{data.displayFull}</p>
                        <p className="font-bold text-indigo-400 text-sm">
                          {data.demandKw} <span className="text-xs font-normal">kW</span>
                        </p>
                        <p className="text-[10px] text-slate-400">
                          Energy: {data.energyKwh} kWh | PF: {data.powerFactor}
                        </p>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Area
                type="monotone"
                dataKey="demandKw"
                stroke="#6366f1"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#demandGradient)"
              />
            </AreaChart>
          ) : (
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="pfGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis
                dataKey="displayTime"
                tick={{ fontSize: 10, fill: '#94a3b8' }}
                axisLine={{ stroke: '#e2e8f0' }}
                tickLine={false}
                minTickGap={24}
              />
              <YAxis
                domain={[0.8, 1.0]}
                tick={{ fontSize: 10, fill: '#94a3b8' }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    return (
                      <div className="bg-slate-900 text-white p-2.5 rounded-lg shadow-xl text-xs space-y-1 min-w-[130px]">
                        <p className="text-[11px] text-slate-400 font-mono">{data.displayFull}</p>
                        <p className="font-bold text-blue-400 text-sm">
                          {data.powerFactor} <span className="text-xs font-normal">cos φ</span>
                        </p>
                        <p className="text-[10px] text-slate-400">
                          {data.powerFactor >= 0.95 ? 'Optimal PF' : 'Low PF Penalty Risk'}
                        </p>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Area
                type="monotone"
                dataKey="powerFactor"
                stroke="#3b82f6"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#pfGradient)"
              />
            </AreaChart>
          )}
        </ResponsiveContainer>
      </div>
    </div>
  );
};
