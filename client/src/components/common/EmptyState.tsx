import React from 'react';
import { Button } from './Button';
import { Zap, LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  title: string;
  description: string;
  actionText?: string;
  onAction?: () => void;
  icon?: LucideIcon;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  description,
  actionText,
  onAction,
  icon: Icon = Zap
}) => {
  return (
    <div className="flex flex-col items-center justify-center p-8 lg:p-12 text-center rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/50">
      <div className="w-12 h-12 rounded-xl bg-emerald-100/70 text-emerald-700 flex items-center justify-center mb-4">
        <Icon className="w-6 h-6" />
      </div>
      <h3 className="text-base font-semibold text-slate-800">{title}</h3>
      <p className="mt-1 text-sm text-slate-500 max-w-sm">{description}</p>
      {actionText && onAction && (
        <div className="mt-5">
          <Button variant="primary" size="sm" onClick={onAction}>
            {actionText}
          </Button>
        </div>
      )}
    </div>
  );
};
