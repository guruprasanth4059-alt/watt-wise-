import React from 'react';
import clsx from 'clsx';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}

export const Card: React.FC<CardProps> = ({ children, className, onClick }) => {
  return (
    <div
      onClick={onClick}
      className={clsx(
        'bg-white rounded-xl border border-slate-200/80 shadow-xs p-5 transition-shadow hover:shadow-sm',
        onClick && 'cursor-pointer',
        className
      )}
    >
      {children}
    </div>
  );
};
