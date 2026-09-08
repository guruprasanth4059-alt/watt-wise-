import React, { useState } from 'react';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { PilotModal } from '../../components/public/PilotModal';
import { CheckCircle2, DollarSign, Shield, FileCheck, ArrowRight } from 'lucide-react';

export const ForRWAs: React.FC = () => {
  const [pilotOpen, setPilotOpen] = useState(false);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 space-y-16">
      <div className="text-center max-w-3xl mx-auto space-y-4">
        <Badge variant="emerald" size="md">Built for Management Committees</Badge>
        <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight">
          Give Your Committee the Transparency Residents Expect
        </h1>
        <p className="text-base text-slate-600">
          Apartment committee tenures are short and voluntary. WattWise equips honorary office-bearers with simple, verifiable data to cut waste and defend maintenance budgets.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-xs space-y-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
            <DollarSign className="w-5 h-5" />
          </div>
          <h3 className="text-lg font-bold text-slate-900">Protect Maintenance Reserves</h3>
          <p className="text-xs text-slate-600 leading-relaxed">
            Common-area electricity is often the largest single recurring cost on your monthly balance sheet. Cutting just 5-8% in pump and basement lighting waste frees up thousands for long-term sinking funds.
          </p>
        </div>

        <div className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-xs space-y-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center">
            <FileCheck className="w-5 h-5" />
          </div>
          <h3 className="text-lg font-bold text-slate-900">Effortless AGM Reporting</h3>
          <p className="text-xs text-slate-600 leading-relaxed">
            Stop spending hours collating spreadsheets before Annual General Body Meetings. Generate a branded, one-click executive report that transparently shows where power was consumed and what actions were taken.
          </p>
        </div>

        <div className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-xs space-y-3">
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center">
            <Shield className="w-5 h-5" />
          </div>
          <h3 className="text-lg font-bold text-slate-900">Institutional Memory</h3>
          <p className="text-xs text-slate-600 leading-relaxed">
            When committee office-bearers change every 1-2 years, operational knowledge gets lost. WattWise preserves your complete history of bills, meter configurations, and conservation actions in a single secure vault.
          </p>
        </div>
      </div>

      <div className="bg-emerald-900 text-white rounded-3xl p-8 sm:p-12 text-center space-y-6 max-w-4xl mx-auto">
        <h2 className="text-3xl font-bold">Ready to bring energy clarity to your society?</h2>
        <p className="text-emerald-200 text-sm max-w-xl mx-auto">
          Start your society&apos;s 3-month free pilot today. No setup fees, no complex installations.
        </p>
        <div>
          <Button variant="primary" size="lg" onClick={() => setPilotOpen(true)} className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold">
            Request Free RWA Pilot
            <ArrowRight className="w-4 h-4 ml-1.5" />
          </Button>
        </div>
      </div>

      <PilotModal isOpen={pilotOpen} onClose={() => setPilotOpen(false)} />
    </div>
  );
};
