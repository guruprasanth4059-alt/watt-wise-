import React from 'react';

export const SkeletonCard: React.FC = () => (
  <div className="bg-white rounded-xl border border-slate-200 p-5 animate-pulse space-y-4">
    <div className="h-4 bg-slate-200 rounded w-1/3"></div>
    <div className="h-8 bg-slate-200 rounded w-1/2"></div>
    <div className="h-3 bg-slate-200 rounded w-2/3"></div>
  </div>
);

export const SkeletonTable: React.FC = () => (
  <div className="bg-white rounded-xl border border-slate-200 overflow-hidden animate-pulse">
    <div className="p-4 border-b border-slate-200 flex justify-between">
      <div className="h-5 bg-slate-200 rounded w-1/4"></div>
      <div className="h-5 bg-slate-200 rounded w-1/6"></div>
    </div>
    <div className="divide-y divide-slate-100 p-4 space-y-3">
      {[1, 2, 3, 4, 5].map(i => (
        <div key={i} className="flex justify-between items-center py-2">
          <div className="h-4 bg-slate-200 rounded w-1/5"></div>
          <div className="h-4 bg-slate-200 rounded w-1/6"></div>
          <div className="h-4 bg-slate-200 rounded w-1/6"></div>
          <div className="h-4 bg-slate-200 rounded w-1/8"></div>
        </div>
      ))}
    </div>
  </div>
);

export const SkeletonChart: React.FC = () => (
  <div className="bg-white rounded-xl border border-slate-200 p-5 animate-pulse space-y-4">
    <div className="flex justify-between">
      <div className="h-5 bg-slate-200 rounded w-1/4"></div>
      <div className="h-5 bg-slate-200 rounded w-1/6"></div>
    </div>
    <div className="h-56 bg-slate-100 rounded-lg flex items-end justify-between p-4 gap-2">
      {[40, 65, 55, 80, 70, 60].map((h, i) => (
        <div key={i} className="bg-slate-200 rounded-t w-full" style={{ height: `${h}%` }}></div>
      ))}
    </div>
  </div>
);
