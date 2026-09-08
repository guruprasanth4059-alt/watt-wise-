import React from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid
} from 'recharts';

interface CostItem {
  period: string;
  billAmount: number;
  consumptionKwh?: number;
}

interface CostComparisonChartProps {
  data: CostItem[];
  height?: number;
}

export const CostComparisonChart: React.FC<CostComparisonChartProps> = ({ data, height = 280 }) => {
  if (!data || data.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-xs text-slate-400">
        No cost data available.
      </div>
    );
  }

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
        <BarChart data={formattedData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
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
            tickFormatter={v => `₹${(v / 1000).toFixed(0)}k`}
          />
          <Tooltip
            content={({ active, payload, label }) => {
              if (active && payload && payload.length) {
                const item = payload[0].payload as CostItem;
                return (
                  <div className="bg-slate-900 text-white px-3 py-2 rounded-lg text-xs shadow-lg border border-slate-800">
                    <p className="font-semibold text-slate-300">{label}</p>
                    <p className="mt-1 text-emerald-400 font-bold">
                      ₹{item.billAmount.toLocaleString()}
                    </p>
                    {item.consumptionKwh && (
                      <p className="text-slate-400">
                        {item.consumptionKwh.toLocaleString()} kWh
                      </p>
                    )}
                  </div>
                );
              }
              return null;
            }}
          />
          <Bar
            dataKey="billAmount"
            fill="#0f172a"
            radius={[6, 6, 0, 0]}
            maxBarSize={42}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};
