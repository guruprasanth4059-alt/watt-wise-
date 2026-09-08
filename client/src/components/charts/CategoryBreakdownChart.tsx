import React from 'react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip
} from 'recharts';
import { CategoryBreakdown } from '../../types';
import { AlertCircle, PlusCircle } from 'lucide-react';
import { Button } from '../common/Button';

interface CategoryBreakdownChartProps {
  breakdown: CategoryBreakdown;
  onAddSubmeter?: () => void;
}

const CATEGORY_COLORS = ['#059669', '#3b82f6', '#f59e0b', '#8b5cf6', '#64748b'];

const CATEGORY_ICONS: Record<string, string> = {
  pump: '💧',
  lighting: '💡',
  elevator: '🛗',
  clubhouse: '🏊',
  parking: '🚗',
  common_area: '⚡',
  other: '🔌'
};

export const CategoryBreakdownChart: React.FC<CategoryBreakdownChartProps> = ({
  breakdown,
  onAddSubmeter
}) => {
  if (!breakdown || !breakdown.available || breakdown.categories.length === 0) {
    return (
      <div className="h-64 flex flex-col items-center justify-center text-center p-6 bg-slate-50/60 rounded-xl border border-dashed border-slate-200">
        <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 mb-3">
          <AlertCircle className="w-5 h-5" />
        </div>
        <h4 className="text-sm font-semibold text-slate-800">
          Not enough data for category-level analysis
        </h4>
        <p className="mt-1 text-xs text-slate-500 max-w-xs">
          {breakdown?.message || 'Add a sub-meter or upload category-level data to unlock this analysis.'}
        </p>
        {onAddSubmeter && (
          <div className="mt-4">
            <Button variant="outline" size="sm" onClick={onAddSubmeter} icon={<PlusCircle className="w-3.5 h-3.5" />}>
              Configure Sub-Meters
            </Button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
      {/* Pie Donut Chart */}
      <div className="h-56">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={breakdown.categories}
              dataKey="unitsKwh"
              nameKey="name"
              cx="50%"
              cy="50%"
              innerRadius={50}
              outerRadius={80}
              paddingAngle={3}
            >
              {breakdown.categories.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={CATEGORY_COLORS[index % CATEGORY_COLORS.length]} />
              ))}
            </Pie>
            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const data = payload[0].payload;
                  return (
                    <div className="bg-slate-900 text-white px-3 py-2 rounded-lg text-xs shadow-lg border border-slate-800">
                      <p className="font-semibold text-slate-200">{data.name}</p>
                      <p className="mt-1 text-emerald-400 font-bold">
                        {data.unitsKwh.toLocaleString()} kWh ({data.percentage}%)
                      </p>
                    </div>
                  );
                }
                return null;
              }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* Legend & Breakdown list */}
      <div className="space-y-2 text-xs">
        {breakdown.categories.map((cat, idx) => (
          <div key={cat.name} className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-100">
            <div className="flex items-center gap-2 truncate mr-2">
              <span className="text-sm">{CATEGORY_ICONS[cat.type] || '⚡'}</span>
              <span className="font-medium text-slate-800 truncate">{cat.name}</span>
            </div>
            <div className="text-right shrink-0">
              <span className="font-semibold text-slate-900">{cat.percentage}%</span>
              <span className="text-slate-400 ml-1">({cat.unitsKwh.toLocaleString()} kWh)</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
