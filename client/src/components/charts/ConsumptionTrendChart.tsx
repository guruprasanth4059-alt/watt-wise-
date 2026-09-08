import React from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid
} from 'recharts';

interface TrendItem {
  period: string;
  consumptionKwh: number;
  billAmount?: number;
}

interface ConsumptionTrendChartProps {
  data: TrendItem[];
  height?: number;
}

export const ConsumptionTrendChart: React.FC<ConsumptionTrendChartProps> = ({ data, height = 280 }) => {
  if (!data || data.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-xs text-slate-400">
        No consumption data recorded yet.
      </div>
    );
  }

  // Format month period (e.g. "2025-10" to "Oct '25")
  const formattedData = data.map(d => {
    let label = d.period;
    try {
      const parts = d.period.split('-');
      if (parts.length === 2) {
        const date = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, 1);
        label = date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
      }
    } catch {
      label = d.period;
    }
    return {
      ...d,
      displayPeriod: label
    };
  });

  return (
    <div style={{ width: '100%', height }}>
      <ResponsiveContainer>
        <AreaChart data={formattedData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="consumptionGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#10b981" stopOpacity={0.25} />
              <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
          <XAxis
            dataKey="displayPeriod"
            axisLine={false}
            tickLine={false}
            tick={{ fill: '#64748b', fontSize: 12 }}
            dy={8}
          />
          <YAxis
            axisLine={false}
            tickLine={false}
            tick={{ fill: '#64748b', fontSize: 11 }}
            tickFormatter={v => `${(v / 1000).toFixed(0)}k`}
          />
          <Tooltip
            content={({ active, payload, label }) => {
              if (active && payload && payload.length) {
                const item = payload[0].payload as TrendItem;
                return (
                  <div className="bg-slate-900 text-white px-3 py-2 rounded-lg text-xs shadow-lg border border-slate-800">
                    <p className="font-semibold text-slate-300">{label}</p>
                    <p className="mt-1 text-emerald-400 font-bold">
                      {item.consumptionKwh.toLocaleString()} kWh
                    </p>
                    {item.billAmount && (
                      <p className="text-slate-400">
                        ₹{item.billAmount.toLocaleString()}
                      </p>
                    )}
                  </div>
                );
              }
              return null;
            }}
          />
          <Area
            type="monotone"
            dataKey="consumptionKwh"
            stroke="#059669"
            strokeWidth={2.5}
            fillOpacity={1}
            fill="url(#consumptionGradient)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};
