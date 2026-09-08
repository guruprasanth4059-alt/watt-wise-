import React, { useState } from 'react';
import {
  Zap,
  ArrowRight,
  TrendingDown,
  Sparkles,
  ShieldCheck,
  BarChart3,
  CheckCircle2,
  Building,
  Droplets,
  Lightbulb,
  ArrowDownRight,
  Sliders,
  PiggyBank
} from 'lucide-react';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { PilotModal } from '../../components/public/PilotModal';
import { useAuth } from '../../context/AuthContext';

interface HomeProps {
  onNavigate: (path: string) => void;
}

export const Home: React.FC<HomeProps> = ({ onNavigate }) => {
  const [pilotOpen, setPilotOpen] = useState(false);
  const { demoLogin } = useAuth();
  const [isLoggingInDemo, setIsLoggingInDemo] = useState(false);

  const handleExploreDemo = async () => {
    setIsLoggingInDemo(true);
    try {
      await demoLogin('admin');
      onNavigate('/dashboard');
    } finally {
      setIsLoggingInDemo(false);
    }
  };

  return (
    <div className="space-y-20 pb-20 overflow-hidden">
      {/* 1. HERO SECTION */}
      <section className="relative pt-12 lg:pt-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto text-center">
        {/* Decorative background glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-emerald-100/60 blur-[120px] rounded-full pointer-events-none -z-10" />

        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200/80 text-emerald-800 text-xs font-semibold mb-6">
          <Zap className="w-3.5 h-3.5 text-emerald-600 fill-current" />
          <span>The Common-Area Electricity Intelligence Layer</span>
        </div>

        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-slate-900 max-w-4xl mx-auto leading-tight">
          Smarter Energy. <span className="text-emerald-600">Lower Bills.</span>
        </h1>

        <p className="mt-6 text-lg sm:text-xl text-slate-600 max-w-2xl mx-auto leading-relaxed">
          WattWise helps apartment societies understand electricity consumption, spot unusual usage, and discover practical ways to reduce unnecessary energy costs.
        </p>

        {/* Hero CTAs */}
        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Button
            variant="primary"
            size="lg"
            onClick={() => setPilotOpen(true)}
            className="w-full sm:w-auto shadow-md"
          >
            Start a Free Pilot
            <ArrowRight className="w-4 h-4 ml-1.5" />
          </Button>

          <Button
            variant="outline"
            size="lg"
            isLoading={isLoggingInDemo}
            onClick={handleExploreDemo}
            className="w-full sm:w-auto bg-white"
          >
            Explore Live Demo
          </Button>
        </div>

        <div className="mt-4 flex items-center justify-center gap-6 text-xs text-slate-500 font-medium">
          <span className="flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> 3-Month Free Pilot
          </span>
          <span className="flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Zero Setup Fees
          </span>
          <span className="flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Works with Existing Bills
          </span>
        </div>

        {/* Realistic Dashboard Preview with Demo Data */}
        <div className="mt-14 max-w-5xl mx-auto relative rounded-2xl p-2 bg-gradient-to-b from-slate-200/70 to-slate-100/40 border border-slate-200/80 shadow-2xl">
          <div className="absolute top-4 right-4 z-10">
            <span className="bg-slate-900/80 backdrop-blur-xs text-white text-[11px] font-semibold px-2.5 py-1 rounded-md border border-slate-700">
              Clearly Marked Demo Data
            </span>
          </div>

          <div className="bg-white rounded-xl overflow-hidden border border-slate-200/80 p-6 text-left space-y-6">
            {/* Top Preview Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-slate-100">
              <div>
                <span className="text-xs font-semibold text-emerald-600 uppercase tracking-wider">Green Valley Residency • Bengaluru</span>
                <h3 className="text-xl font-bold text-slate-900">Common Area Electricity Overview</h3>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="emerald">WattWise Score: 78/100</Badge>
                <span className="text-xs text-slate-400 font-mono">March 2026</span>
              </div>
            </div>

            {/* Mock KPI Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100">
                <span className="text-[11px] font-semibold text-slate-500 uppercase">Monthly Consumption</span>
                <p className="text-xl font-bold text-slate-900 mt-1">18,420 <span className="text-xs font-medium text-slate-500">kWh</span></p>
                <span className="inline-flex items-center text-[11px] font-semibold text-emerald-600 mt-1">
                  <ArrowDownRight className="w-3.5 h-3.5" /> 4.1% MoM
                </span>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100">
                <span className="text-[11px] font-semibold text-slate-500 uppercase">Monthly Bill</span>
                <p className="text-xl font-bold text-slate-900 mt-1">₹1,42,380</p>
                <span className="text-[11px] text-slate-500 mt-1 block">BESCOM Tariff HT-2c</span>
              </div>

              <div className="p-3.5 rounded-xl bg-amber-50/60 border border-amber-200/60">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-amber-800 uppercase">Potential Savings</span>
                  <span className="text-[9px] bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded font-bold">Estimated</span>
                </div>
                <p className="text-xl font-bold text-amber-900 mt-1">₹8,420 <span className="text-xs font-normal text-amber-700">/ mo</span></p>
                <span className="text-[11px] text-amber-700 mt-1 block">3 Active Recommendations</span>
              </div>

              <div className="p-3.5 rounded-xl bg-emerald-50/60 border border-emerald-200/60">
                <span className="text-[11px] font-semibold text-emerald-800 uppercase">Recorded Savings</span>
                <p className="text-xl font-bold text-emerald-900 mt-1">₹5,200 <span className="text-xs font-normal text-emerald-700">/ mo</span></p>
                <span className="text-[11px] text-emerald-700 mt-1 block">Verified After Pump Adjustment</span>
              </div>
            </div>

            {/* AI Banner Preview */}
            <div className="p-4 rounded-xl bg-emerald-50/60 border border-emerald-200/80 flex items-start gap-3">
              <div className="p-2 bg-emerald-600 text-white rounded-lg shrink-0 mt-0.5">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs font-bold text-emerald-900 uppercase tracking-wide">
                  WattWise AI Insight • High Confidence
                </p>
                <p className="text-sm text-slate-700 mt-0.5">
                  &ldquo;Electricity consumption decreased 4.1% compared with February. Water pump schedule modifications correlate with a 780 kWh drop in shared power usage. Consider inspecting basement lighting sensors next.&rdquo;
                </p>
                <p className="text-[10px] text-slate-400 mt-1">
                  AI-generated insight based on available society data.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. THE PROBLEM SECTION */}
      <section className="px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="text-center max-w-3xl mx-auto">
          <Badge variant="amber" size="md">The Common Area Blindspot</Badge>
          <h2 className="text-3xl font-bold text-slate-900 mt-3">
            Societies Spend Hundreds of Thousands on Common Facilities. But Who Audits the Watts?
          </h2>
          <p className="mt-3 text-slate-600 text-sm sm:text-base">
            Apartment maintenance bills are dominated by shared electricity loads. Yet RWAs and management committees are forced to manage blind with only consolidated paper bills.
          </p>
        </div>

        <div className="mt-12 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 text-center">
          {[
            { icon: Droplets, name: 'Water Pumps', desc: 'Continuous cycling & stuck floats' },
            { icon: Lightbulb, name: 'Common Lighting', desc: 'Basements lit 24x7 at 100%' },
            { icon: Building, name: 'Elevators', desc: 'Idle inverter & bank standby draw' },
            { icon: Zap, name: 'Clubhouse & AC', desc: 'Gym cooling during peak tariff slabs' },
            { icon: Sliders, name: 'Swimming Pool', desc: 'Over-filtration and oversized pumps' },
            { icon: ShieldCheck, name: 'STP & Aeration', desc: 'Continuous blowers with uncalibrated DO' }
          ].map((item, idx) => {
            const Icon = item.icon;
            return (
              <div key={idx} className="p-4 rounded-xl bg-white border border-slate-200/80 shadow-xs hover:border-emerald-300 transition-all">
                <div className="w-10 h-10 rounded-lg bg-slate-100 text-slate-800 flex items-center justify-center mx-auto mb-3">
                  <Icon className="w-5 h-5 text-emerald-600" />
                </div>
                <h4 className="font-semibold text-slate-900 text-sm">{item.name}</h4>
                <p className="text-xs text-slate-500 mt-1">{item.desc}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* 3. THE SOLUTION SECTION: The Core Product Loop */}
      <section className="px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto bg-slate-900 text-white rounded-3xl py-16 px-8 relative overflow-hidden">
        <div className="max-w-3xl mx-auto text-center">
          <Badge variant="emerald" size="md" className="bg-emerald-950 text-emerald-300 border-emerald-700">
            The WattWise Loop
          </Badge>
          <h2 className="text-3xl font-bold mt-4">
            From Raw Utility Invoices to Measurable Monthly Savings
          </h2>
          <p className="mt-3 text-slate-400 text-sm sm:text-base">
            No expensive proprietary hardware or DISCOM protocol hacking required to start. We turn your existing bills and meter readings into actionable energy management.
          </p>
        </div>

        <div className="mt-12 grid grid-cols-1 md:grid-cols-5 gap-4">
          {[
            { step: '01', title: 'Upload Bills', desc: 'Drop PDF invoices or CSV logs. Instant extraction with human verification.' },
            { step: '02', title: 'Analytics', desc: 'Automated calculation of consumption trends, MoM change %, and cost per apartment.' },
            { step: '03', title: 'AI Insights', desc: 'WattWise AI detects anomalies and suggests practical investigative steps.' },
            { step: '04', title: 'Take Action', desc: 'RWA facility managers log timer updates, retrofits, and schedule changes.' },
            { step: '05', title: 'Track Savings', desc: 'Before/after tracking verifies actual rupee savings on subsequent bills.' }
          ].map((s, idx) => (
            <div key={idx} className="p-5 rounded-2xl bg-slate-800/80 border border-slate-700/80 flex flex-col justify-between">
              <div>
                <span className="text-emerald-400 font-mono text-sm font-bold block mb-2">{s.step}</span>
                <h4 className="text-base font-bold text-white">{s.title}</h4>
                <p className="text-xs text-slate-300 mt-2 leading-relaxed">{s.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 4. BUSINESS POSITIONING: Companion, Not Replacement */}
      <section className="px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="bg-emerald-50/70 border border-emerald-200/80 rounded-2xl p-8 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <Badge variant="emerald">Clear Business Positioning</Badge>
            <h3 className="text-xl font-bold text-slate-900">
              Not Another Resident Social App. The Energy Intelligence Layer.
            </h3>
            <p className="text-sm text-slate-600">
              Existing apartment management apps already handle security, visitor logs, notices, and maintenance dues. WattWise does NOT replace them. WattWise partners with RWAs as the specialized electricity intelligence platform for common-area cost reduction.
            </p>
          </div>
          <Button
            variant="primary"
            size="lg"
            onClick={() => setPilotOpen(true)}
            className="shrink-0"
          >
            Start a Free Pilot
          </Button>
        </div>
      </section>

      {/* Pilot Modal */}
      <PilotModal isOpen={pilotOpen} onClose={() => setPilotOpen(false)} />
    </div>
  );
};
