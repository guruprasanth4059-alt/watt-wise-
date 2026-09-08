import React, { useState } from 'react';
import { Check, Zap, AlertCircle } from 'lucide-react';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { PilotModal } from '../../components/public/PilotModal';

export const Pricing: React.FC = () => {
  const [pilotOpen, setPilotOpen] = useState(false);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 space-y-16">
      {/* Header */}
      <div className="text-center max-w-3xl mx-auto space-y-4">
        <Badge variant="emerald" size="md">Transparent Pilot Pricing</Badge>
        <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight">
          Start with a 3-Month Free Pilot. Scale on Value.
        </h1>
        <p className="text-base text-slate-600">
          No heavy hardware costs. No upfront setup fees. Prove tangible energy savings in your common facilities before committing.
        </p>

        {/* Prototype Pricing Disclaimer */}
        <div className="inline-flex items-center gap-2 p-2.5 bg-amber-50 border border-amber-200/80 rounded-xl text-xs text-amber-800 text-left mt-2">
          <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
          <span>
            <strong>Prototype Pricing Notice:</strong> Pricing shown is an initial pilot/prototype model and may change. We do NOT guarantee savings or ROI; results depend on society facility actions.
          </span>
        </div>
      </div>

      {/* Pricing Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-stretch">
        {/* Tier 1: Pilot */}
        <div className="bg-white rounded-2xl border-2 border-emerald-500 shadow-lg p-8 flex flex-col justify-between relative">
          <div className="absolute -top-3 left-1/2 -translate-x-1/2">
            <span className="bg-emerald-600 text-white text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider shadow-xs">
              Most Popular for New RWAs
            </span>
          </div>

          <div>
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-bold text-slate-900">3-Month Free Pilot</h3>
              <Zap className="w-5 h-5 text-emerald-600 fill-current" />
            </div>
            <p className="text-xs text-slate-500 mt-1">Full-featured test run for apartment management committees.</p>
            
            <div className="mt-6 mb-6">
              <span className="text-4xl font-extrabold text-slate-900">₹0</span>
              <span className="text-slate-500 text-sm ml-2">for 90 days (Zero setup fee)</span>
            </div>

            <ul className="space-y-3 text-xs text-slate-700">
              {[
                'Full energy dashboard & KPI cards',
                'PDF bill extraction & verification workflow',
                'Historical consumption & trend analysis',
                'AI-powered anomaly detection & insights',
                'Action logging & before/after savings tracking',
                'Monthly executive reports for AGM review',
                'Multi-role access (Admin, Committee, Resident)'
              ].map((f, i) => (
                <li key={i} className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span>{f}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="mt-8">
            <Button variant="primary" className="w-full" onClick={() => setPilotOpen(true)}>
              Start a Free Pilot
            </Button>
          </div>
        </div>

        {/* Tier 2: Basic */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-8 flex flex-col justify-between">
          <div>
            <h3 className="text-xl font-bold text-slate-900">Basic Society</h3>
            <p className="text-xs text-slate-500 mt-1">For smaller societies with 1-3 shared panels.</p>

            <div className="mt-6 mb-6">
              <span className="text-4xl font-extrabold text-slate-900">₹1,999</span>
              <span className="text-slate-500 text-sm ml-2">/ year (example prototype)</span>
            </div>

            <ul className="space-y-3 text-xs text-slate-700">
              {[
                'Up to 3 sub-meters monitored',
                'Monthly utility bill ingestion',
                'Basic consumption change trends',
                'Standard action tracking ledger',
                'Quarterly report exports',
                'Email support'
              ].map((f, i) => (
                <li key={i} className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
                  <span>{f}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="mt-8">
            <Button variant="outline" className="w-full" onClick={() => setPilotOpen(true)}>
              Select Basic (After Pilot)
            </Button>
          </div>
        </div>

        {/* Tier 3: Pro */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-8 flex flex-col justify-between">
          <div>
            <h3 className="text-xl font-bold text-slate-900">Pro Society</h3>
            <p className="text-xs text-slate-500 mt-1">For mid-to-large communities with complex loads.</p>

            <div className="mt-6 mb-6">
              <span className="text-4xl font-extrabold text-slate-900">₹4,999</span>
              <span className="text-slate-500 text-sm ml-2">/ year (example prototype)</span>
            </div>

            <ul className="space-y-3 text-xs text-slate-700">
              {[
                'Unlimited common-area sub-meters',
                'Deep AI-powered cause analysis & suggestions',
                'WattWise Internal Score calculation',
                'Sub-meter category-level breakdown',
                'Monthly executive report with 1-click sharing',
                'Priority WhatsApp / Phone support'
              ].map((f, i) => (
                <li key={i} className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span>{f}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="mt-8">
            <Button variant="secondary" className="w-full" onClick={() => setPilotOpen(true)}>
              Select Pro (After Pilot)
            </Button>
          </div>
        </div>
      </div>

      <PilotModal isOpen={pilotOpen} onClose={() => setPilotOpen(false)} />
    </div>
  );
};
