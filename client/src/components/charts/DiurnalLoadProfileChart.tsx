import React from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend
} from 'recharts';

interface DiurnalLoadProfileChartProps {
  loadProfile: Array<{ hour: number; avgKwh: number; peakKw: number }>;
  height?: number;
}

export const DiurnalLoadProfileChart: React.FC<DiurnalLoadProfileChartProps> = ({
  loadProfile,
  height = 240
}) => {
  if (!loadProfile || loadProfile.length === 0) {
    return (
      <div className="h-48 flex items-center justify-center text-xs text-slate-400">
        No diurnal profile available yet.
      </div>
    );
  }

  const data = loadProfile.map((p) => ({
    hourLabel: `${p.hour.toString().padStart(2, '0')}:00`,
    avgKwh: Number(p.avgKwh.toFixed(2)),
    peakKw: Number(p.peakKw.toFixed(2))
  }));

  return (
    <div style={{ width: '100%', height }}>
      <ResponsiveContainer>
        <ComposedChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
          <XAxis
            dataKey="hourLabel"
            tick={{ fontSize: 10, fill: '#94a3b8' }}
            axisLine={{ stroke: '#e2e8f0' }}
            tickLine={false}
            interval={2}
          />
          <YAxis
            tick={{ fontSize: 10, fill: '#94a3b8' }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            content={({ active, payload }) => {
              if (active && payload && payload.length) {
                const item = payload[0].payload;
                return (
                  <div className="bg-slate-900 text-white p-2.5 rounded-lg shadow-xl text-xs space-y-1">
                    <p className="font-bold text-slate-200">Hour: {item.hourLabel}</p>
                    <p className="text-emerald-400">Avg Consumption: {item.avgKwh} kWh</p>
                    <p className="text-indigo-400">Peak Demand: {item.peakKw} kW</p>
                  </div>
                );
              }
              return null;
            }}
          />
          <Legend
            verticalAlign="top"
            align="right"
            wrapperStyle={{ fontSize: 11, paddingBottom: 8 }}
          />
          <Bar dataKey="avgKwh" name="Avg Hourly (kWh)" fill="#10b981" radius={[2, 2, 0, 0]} />
          <Line
            type="monotone"
            dataKey="peakKw"
            name="Peak Demand (kW)"
            stroke="#6366f1"
            strokeWidth={2}
            dot={false}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
};
