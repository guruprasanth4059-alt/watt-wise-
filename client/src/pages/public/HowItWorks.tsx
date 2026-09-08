import React, { useState } from 'react';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { PilotModal } from '../../components/public/PilotModal';
import { Upload, Cpu, CheckSquare, BarChart2, ShieldCheck, ArrowRight } from 'lucide-react';

export const HowItWorks: React.FC = () => {
  const [pilotOpen, setPilotOpen] = useState(false);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 space-y-16">
      <div className="text-center max-w-3xl mx-auto space-y-4">
        <Badge variant="emerald" size="md">Step-By-Step Workflow</Badge>
        <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight">
          How WattWise Works for Your Society
        </h1>
        <p className="text-base text-slate-600">
          No invasive wiring or smart meter replacements needed to begin. Start with your existing monthly bills and meter logs.
        </p>
      </div>

      <div className="space-y-10 max-w-4xl mx-auto">
        {[
          {
            step: 'Step 1: Society Onboarding & Facility Setup',
            icon: ShieldCheck,
            title: 'Define your common areas in 2 minutes',
            desc: 'Configure your building count, apartments, and common loads (water pumps, common lighting, elevators, clubhouse, swimming pool). WattWise sets up your baseline profile.'
          },
          {
            step: 'Step 2: Upload Utility Bills or CSV Ledgers',
            icon: Upload,
            title: 'Drop your monthly invoices for instant OCR extraction',
            desc: 'Our parser extracts billing period, units consumed (kWh), total amount, fixed charges, and energy charges. You verify the extracted values with one click.'
          },
          {
            step: 'Step 3: Automated Calculations & AI Analysis',
            icon: Cpu,
            title: 'WattWise calculates trends; AI spots anomalies',
            desc: 'Deterministic backend arithmetic computes month-over-month consumption changes, cost per apartment, and baseline deviations. WattWise AI then evaluates potential operational causes.'
          },
          {
            step: 'Step 4: RWA Committee Action Tracking',
            icon: CheckSquare,
            title: 'Turn recommendations into physical maintenance actions',
            desc: 'Whether adjusting pump run timers, retrofitting basement LED motion sensors, or fixing water float valves, record the action date and details.'
          },
          {
            step: 'Step 5: Before & After Savings Verification',
            icon: BarChart2,
            title: 'Track measured rupee reductions on subsequent bills',
            desc: 'Compare before and after consumption. Generate clean executive monthly reports to present transparently to residents at your next Annual General Body Meeting.'
          }
        ].map((item, idx) => {
          const Icon = item.icon;
          return (
            <div key={idx} className="flex flex-col sm:flex-row items-start gap-6 p-6 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
              <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0 border border-emerald-100">
                <Icon className="w-6 h-6" />
              </div>
              <div className="space-y-1 flex-1">
                <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider">{item.step}</span>
                <h3 className="text-lg font-bold text-slate-900">{item.title}</h3>
                <p className="text-sm text-slate-600 leading-relaxed">{item.desc}</p>
              </div>
            </div>
          );
        })}
      </div>

      <div className="text-center pt-6">
        <Button variant="primary" size="lg" onClick={() => setPilotOpen(true)}>
          Start Your 3-Month Free Pilot
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </div>

      <PilotModal isOpen={pilotOpen} onClose={() => setPilotOpen(false)} />
    </div>
  );
};
