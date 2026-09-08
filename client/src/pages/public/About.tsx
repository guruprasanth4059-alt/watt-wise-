import React from 'react';
import { Badge } from '../../components/common/Badge';
import { ShieldCheck, HeartHandshake, Eye, Sparkles } from 'lucide-react';

export const About: React.FC = () => {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 space-y-16">
      <div className="text-center max-w-3xl mx-auto space-y-4">
        <Badge variant="emerald" size="md">Our Mission</Badge>
        <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight">
          Demystifying Electricity for Communities
        </h1>
        <p className="text-base text-slate-600">
          WattWise was built around a singular premise: residential communities deserve the same energy clarity and cost-control intelligence that commercial skyscrapers take for granted.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
        <div className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-xs space-y-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
            <Eye className="w-5 h-5" />
          </div>
          <h3 className="text-base font-bold text-slate-900">Radical Transparency</h3>
          <p className="text-xs text-slate-600 leading-relaxed">
            No invented statistics or guaranteed savings hype. Every number is grounded in actual utility bills or verified sub-meter logs.
          </p>
        </div>

        <div className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-xs space-y-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center">
            <HeartHandshake className="w-5 h-5" />
          </div>
          <h3 className="text-base font-bold text-slate-900">Partnering with Ecosystem</h3>
          <p className="text-xs text-slate-600 leading-relaxed">
            We don&apos;t try to replace your existing security or accounting software. We focus 100% on electricity visibility and conservation.
          </p>
        </div>

        <div className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-xs space-y-3">
          <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center">
            <Sparkles className="w-5 h-5" />
          </div>
          <h3 className="text-base font-bold text-slate-900">Practical Intelligence</h3>
          <p className="text-xs text-slate-600 leading-relaxed">
            AI recommendations that respect community realities: adjusting pump schedules, replacing faulty sensors, and optimizing tariffs.
          </p>
        </div>
      </div>
    </div>
  );
};
