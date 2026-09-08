import React from 'react';
import { PilotScorecardData } from '../../types';
import { Modal } from '../common/Modal';
import { Card } from '../common/Card';
import { Badge } from '../common/Badge';
import { Button } from '../common/Button';
import { 
  Award, 
  Calendar, 
  CheckCircle2, 
  TrendingDown, 
  TrendingUp, 
  Zap, 
  FileText, 
  Layers, 
  ShieldCheck, 
  AlertCircle,
  PiggyBank
} from 'lucide-react';

interface PilotScorecardModalProps {
  isOpen: boolean;
  onClose: () => void;
  scorecard: PilotScorecardData | null;
  onOpenConversion?: () => void;
}

export const PilotScorecardModal: React.FC<PilotScorecardModalProps> = ({
  isOpen,
  onClose,
  scorecard,
  onOpenConversion
}) => {
  if (!scorecard) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="WattWise 3-Month Pilot Scorecard"
      subtitle={`Comprehensive evaluation for ${scorecard.societyName} management committee`}
      maxWidth="lg"
    >
      <div className="space-y-6">
        {/* Top Pilot Progress Header */}
        <div className="p-4 bg-slate-900 text-white rounded-2xl space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <span className="text-emerald-400 text-xs font-bold uppercase tracking-wider">
                Pilot Timeline Progress
              </span>
              <h4 className="text-base font-bold text-white mt-0.5">
                Day {scorecard.daysElapsed} of {scorecard.daysTotal} ({Math.round((scorecard.daysElapsed / scorecard.daysTotal) * 100)}%)
              </h4>
            </div>
            <Badge variant="emerald" size="md">
              {scorecard.pilotStatus.replace('_', ' ').toUpperCase()}
            </Badge>
          </div>

          <div className="w-full bg-slate-800 h-2.5 rounded-full overflow-hidden">
            <div 
              className="bg-emerald-500 h-full rounded-full transition-all duration-500" 
              style={{ width: `${(scorecard.daysElapsed / scorecard.daysTotal) * 100}%` }} 
            />
          </div>

          <div className="flex justify-between text-xs text-slate-400">
            <span>Started: {scorecard.startDate}</span>
            <span>Ends: {scorecard.endDate}</span>
          </div>
        </div>

        {/* Dual Score Comparison: Energy Score vs Pilot Health Score */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Card className="p-4 border-emerald-200 bg-emerald-50/50">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-emerald-950">WattWise Energy Score</span>
              <Badge variant="emerald" size="sm">Product Metric</Badge>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-emerald-700">{scorecard.energyScore}</span>
              <span className="text-xs text-slate-500 font-semibold">/ 100</span>
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              Internal efficiency score based on trend and verified billing continuity. Not an official rating.
            </p>
          </Card>

          <Card className="p-4 border-amber-200 bg-amber-50/50">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-amber-950">Pilot Health Score</span>
              <Badge variant="amber" size="sm">RWA Engagement</Badge>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-amber-700">{scorecard.pilotHealthScore}</span>
              <span className="text-xs text-slate-500 font-semibold">/ 100</span>
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              Reflects data coverage ({scorecard.dataCoverageMonths} mos), baseline maturity, and completed actions.
            </p>
          </Card>
        </div>

        {/* Key Pilot Pillars Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
            <span className="text-[11px] text-slate-500 block">Baseline Status</span>
            <span className="text-sm font-bold text-slate-900 capitalize">
              {scorecard.baselineStatus.replace('_', ' ')}
            </span>
            <span className="text-[10px] text-slate-400 block font-mono">
              Avg {scorecard.baselineAvgKwh.toLocaleString()} kWh/mo
            </span>
          </div>

          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
            <span className="text-[11px] text-slate-500 block">Data Quality</span>
            <span className={`text-sm font-bold capitalize ${
              scorecard.dataQualityStatus === 'good' ? 'text-emerald-700' : 'text-amber-700'
            }`}>
              {scorecard.dataQualityStatus.replace('_', ' ')}
            </span>
            <span className="text-[10px] text-slate-400 block font-mono">
              {scorecard.dataCoverageMonths} Verified Cycles
            </span>
          </div>

          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
            <span className="text-[11px] text-slate-500 block">Actions Logged</span>
            <span className="text-sm font-bold text-emerald-700">
              {scorecard.actionsCompleted} Completed
            </span>
            <span className="text-[10px] text-slate-400 block font-mono">
              {scorecard.recommendationsOpen} Open Proposals
            </span>
          </div>

          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
            <span className="text-[11px] text-slate-500 block">Recorded Savings</span>
            <span className="text-sm font-bold text-emerald-700">
              ₹{scorecard.recordedSavingsTotal.toLocaleString()}
            </span>
            <span className="text-[10px] text-slate-400 block font-mono">
              Verified reductions
            </span>
          </div>
        </div>

        {/* Cautious Methodology Notice */}
        <div className="p-3 bg-slate-100 rounded-xl text-[11px] text-slate-600 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
          <p>
            <strong>Pilot Methodology:</strong> All performance indicators are derived strictly from utility invoices and verified committee action logs. Recorded reductions compare post-action usage against the undisturbed baseline without claiming sole causation.
          </p>
        </div>

        {/* Footer actions */}
        <div className="pt-2 flex flex-col sm:flex-row justify-between items-center gap-3">
          {onOpenConversion && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                onClose();
                onOpenConversion();
              }}
              icon={<Award className="w-4 h-4 text-emerald-600" />}
            >
              View Pilot Conversion Summary
            </Button>
          )}

          <Button variant="primary" size="sm" onClick={onClose}>
            Done
          </Button>
        </div>
      </div>
    </Modal>
  );
};
