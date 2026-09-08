import React from 'react';
import clsx from 'clsx';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'emerald' | 'amber' | 'red' | 'blue' | 'slate' | 'purple';
  size?: 'sm' | 'md';
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'emerald',
  size = 'sm',
  className
}) => {
  const variantStyles = {
    emerald: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    amber: 'bg-amber-50 text-amber-700 border-amber-200',
    red: 'bg-rose-50 text-rose-700 border-rose-200',
    blue: 'bg-blue-50 text-blue-700 border-blue-200',
    slate: 'bg-slate-100 text-slate-700 border-slate-200',
    purple: 'bg-purple-50 text-purple-700 border-purple-200'
  };

  const sizeStyles = {
    sm: 'text-xs px-2.5 py-0.5 font-medium',
    md: 'text-sm px-3 py-1 font-medium'
  };

  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1.5 rounded-full border',
        variantStyles[variant],
        sizeStyles[size],
        className
      )}
    >
      {children}
    </span>
  );
};
