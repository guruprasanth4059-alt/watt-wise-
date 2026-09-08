import React from 'react';
import clsx from 'clsx';
import { ArrowDownRight, ArrowUpRight, Minus } from 'lucide-react';
import { Card } from './Card';
import { Badge } from './Badge';

interface StatCardProps {
  title: string;
  value: string | number;
  unit?: string;
  change?: number; // e.g. -4.1 or +2.5
  changeLabel?: string;
  subtitle?: string;
  potentialBadge?: boolean;
  isDemo?: boolean;
  icon?: React.ReactNode;
  variant?: 'default' | 'emerald' | 'amber';
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  unit,
  change,
  changeLabel = 'vs last month',
  subtitle,
  potentialBadge = false,
  isDemo = false,
  icon,
  variant = 'default'
}) => {
  const isPositiveChange = change !== undefined && change > 0;
  const isNegativeChange = change !== undefined && change < 0;

  return (
    <Card className="relative overflow-hidden flex flex-col justify-between">
      {/* Top Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">{title}</span>
            {isDemo && <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-medium">Demo Data</span>}
          </div>
          {potentialBadge && (
            <div className="mt-1">
              <Badge variant="amber" size="sm">
                Estimated / Potential
              </Badge>
            </div>
          )}
        </div>
        {icon && <div className="p-2 bg-slate-50 rounded-lg text-slate-700">{icon}</div>}
      </div>

      {/* Main Metric Value */}
      <div className="mt-3">
        <div className="flex items-baseline gap-1.5">
          <span className="text-2xl lg:text-3xl font-bold tracking-tight text-slate-900">{value}</span>
          {unit && <span className="text-sm font-medium text-slate-500">{unit}</span>}
        </div>

        {/* Change Indicator or Subtitle */}
        {change !== undefined ? (
          <div className="mt-2 flex items-center gap-1.5 text-xs">
            <span
              className={clsx(
                'inline-flex items-center font-semibold rounded px-1.5 py-0.5',
                // In energy consumption: negative change (reduction) is good (emerald), positive change is alert (rose)
                isNegativeChange && 'bg-emerald-50 text-emerald-700',
                isPositiveChange && 'bg-rose-50 text-rose-700',
                change === 0 && 'bg-slate-100 text-slate-600'
              )}
            >
              {isNegativeChange ? (
                <ArrowDownRight className="w-3.5 h-3.5 mr-0.5 inline" />
              ) : isPositiveChange ? (
                <ArrowUpRight className="w-3.5 h-3.5 mr-0.5 inline" />
              ) : (
                <Minus className="w-3.5 h-3.5 mr-0.5 inline" />
              )}
              {Math.abs(change)}%
            </span>
            <span className="text-slate-500">{changeLabel}</span>
          </div>
        ) : subtitle ? (
          <p className="mt-1.5 text-xs text-slate-500">{subtitle}</p>
        ) : null}
      </div>
    </Card>
  );
};
