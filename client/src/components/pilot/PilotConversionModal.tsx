import React, { useEffect, useState } from 'react';
import { api } from '../../api/client';
import { PilotConversionSummary } from '../../types';
import { Modal } from '../common/Modal';
import { Badge } from '../common/Badge';
import { Button } from '../common/Button';
import { Award, CheckCircle2, TrendingDown, FileText, Printer, ArrowRight } from 'lucide-react';

interface PilotConversionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigateSubscription?: () => void;
  onNavigateReports?: () => void;
}

export const PilotConversionModal: React.FC<PilotConversionModalProps> = ({
  isOpen,
  onClose,
  onNavigateSubscription,
  onNavigateReports
}) => {
  const [data, setData] = useState<PilotConversionSummary | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsLoading(true);
      api.get<PilotConversionSummary>('/pilot/conversion')
        .then(res => setData(res))
        .catch(err => console.error('Failed to load conversion summary:', err))
        .finally(() => setIsLoading(false));
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="WattWise 3-Month Pilot Value Summary"
      subtitle="Executive summary of verified results achieved during the society pilot"
      maxWidth="lg"
    >
      {isLoading || !data ? (
        <div className="py-12 text-center text-xs text-slate-400">Loading pilot value report...</div>
      ) : (
        <div className="space-y-6">
          {/* Header Banner */}
          <div className="p-4 bg-gradient-to-r from-emerald-900 to-slate-900 text-white rounded-2xl">
            <div className="flex items-center gap-2">
              <Award className="w-5 h-5 text-emerald-400" />
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                Pilot Outcome Demonstration
              </span>
            </div>
            <h3 className="text-lg font-bold text-white mt-1">
              {data.societyName} — Energy Intelligence Overview
            </h3>
            <p className="text-xs text-slate-300 mt-0.5">
              {data.apartments} Apartments • {data.dataCoverageMonths} Months of Verified Billing Data
            </p>
          </div>

          {/* Key Value Delivered Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
              <span className="text-[11px] text-slate-500 block">Total Power Audited</span>
              <span className="text-base font-bold text-slate-900">
                {data.totalKwhAnalyzed.toLocaleString()} kWh
              </span>
              <span className="text-[10px] text-slate-400 block font-mono">
                Across {data.dataCoverageMonths} billing cycles
              </span>
            </div>

            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
              <span className="text-[11px] text-slate-500 block">Baseline Consumption</span>
              <span className="text-base font-bold text-slate-900">
                {data.baselineAvgMonthlyKwh.toLocaleString()} kWh/mo
              </span>
              <span className="text-[10px] text-slate-400 block font-mono">
                Undisturbed baseline
              </span>
            </div>

            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
              <span className="text-[11px] text-slate-500 block">Actions Completed</span>
              <span className="text-base font-bold text-emerald-700">
                {data.completedActionsCount} Actions
              </span>
              <span className="text-[10px] text-slate-400 block font-mono">
                Maintenance adjustments
              </span>
            </div>

            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
              <span className="text-[11px] text-emerald-800 block font-medium">Recorded Reductions</span>
              <span className="text-base font-bold text-emerald-700">
                ₹{data.totalRecordedRupeeSavings.toLocaleString()}
              </span>
              <span className="text-[10px] text-emerald-600 block font-mono">
                {data.totalRecordedReductionKwh.toLocaleString()} kWh verified
              </span>
            </div>
          </div>

          {/* Value Observations List */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-2 text-xs">
            <h5 className="font-bold text-slate-900">Observed Committee Outcomes</h5>
            <ul className="space-y-1.5 text-slate-700">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span>
                  <strong>Consumption Reduction:</strong> Month-over-month consumption decreased by {Math.abs(data.consumptionTrendPercent)}% following scheduled pump timer interventions.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span>
                  <strong>Ongoing Opportunity:</strong> An estimated ₹{data.potentialOpportunityMonthly.toLocaleString()}/month in uncaptured opportunities remains across active recommendations (e.g. basement LED motion dimming).
                </span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span>
                  <strong>Audit Readiness:</strong> Complete digital ledger of all invoices, verification audit trails, and printable monthly AGM reports.
                </span>
              </li>
            </ul>
          </div>

          {/* Transparent Methodology */}
          <p className="text-[10px] text-slate-400 italic">
            * {data.methodologyNote}
          </p>

          {/* Footer Actions */}
          <div className="pt-2 flex flex-col sm:flex-row justify-between items-center gap-3">
            {onNavigateReports && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  onClose();
                  onNavigateReports();
                }}
                icon={<Printer className="w-4 h-4" />}
              >
                Print Executive AGM Report
              </Button>
            )}

            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={onClose}>
                Close
              </Button>
              {onNavigateSubscription && (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => {
                    onClose();
                    onNavigateSubscription();
                  }}
                  icon={<ArrowRight className="w-4 h-4" />}
                >
                  Explore Annual RWA Plans
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
};
