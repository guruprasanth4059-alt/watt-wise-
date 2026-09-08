import React from 'react';
import {
  LayoutDashboard,
  Receipt,
  BarChart3,
  Sparkles,
  Lightbulb,
  PiggyBank,
  FileText,
  Gauge,
  Users2,
  ShieldCheck
} from 'lucide-react';
import { Badge } from '../../components/common/Badge';

export const Features: React.FC = () => {
  const features = [
    {
      icon: LayoutDashboard,
      title: 'Energy Dashboard',
      desc: 'At-a-glance visibility into monthly consumption (kWh), electricity bills (₹), MoM change %, and potential savings.'
    },
    {
      icon: Receipt,
      title: 'Bill Management & Verification',
      desc: 'Upload PDF invoices with OCR text extraction. Every field requires user confirmation before database insertion.'
    },
    {
      icon: BarChart3,
      title: 'Consumption Analytics',
      desc: 'Accurate backend calculations for cost per kWh, consumption per apartment, and 12-month historical demand charts.'
    },
    {
      icon: Sparkles,
      title: 'WattWise AI Insights',
      desc: 'Structured intelligence highlighting what changed, visible demand spikes, and specific areas to investigate.'
    },
    {
      icon: Gauge,
      title: 'Sub-Meter & Category Energy',
      desc: 'Dedicated breakdown for water pumps, common lighting, elevators, clubhouse, pool, and basement ventilation.'
    },
    {
      icon: Lightbulb,
      title: 'Actionable Recommendations',
      desc: 'Prioritized recommendations categorized by High, Medium, and Low with potential rupee savings estimates.'
    },
    {
      icon: PiggyBank,
      title: 'Action & Savings Tracking',
      desc: 'Log physical maintenance actions and record before vs. after consumption with strict causality labeling.'
    },
    {
      icon: FileText,
      title: 'Executive Monthly Reports',
      desc: 'Generate printable, high-density monthly summaries for General Body Meetings and committee reviews.'
    },
    {
      icon: Users2,
      title: 'Multi-Role Access Control',
      desc: 'Role isolation for Society Admins, Committee Members, and Residents with strict database-level security.'
    }
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 space-y-16">
      <div className="text-center max-w-3xl mx-auto space-y-4">
        <Badge variant="emerald" size="md">Complete Feature Suite</Badge>
        <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight">
          Everything Your RWA Needs for Energy Visibility
        </h1>
        <p className="text-base text-slate-600">
          Designed specifically around the operational realities of Resident Welfare Associations and facility managers.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {features.map((feat, idx) => {
          const Icon = feat.icon;
          return (
            <div
              key={idx}
              className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-xs hover:shadow-md hover:border-emerald-300 transition-all space-y-3"
            >
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center border border-emerald-100">
                <Icon className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-slate-900">{feat.title}</h3>
              <p className="text-xs text-slate-600 leading-relaxed">{feat.desc}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
};
