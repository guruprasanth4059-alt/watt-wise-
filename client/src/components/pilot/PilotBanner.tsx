import React from 'react';
import { PilotScorecardData, DataQualityReport } from '../../types';
import { Badge } from '../common/Badge';
import { Calendar, ShieldCheck, Activity, Award, ChevronRight, AlertTriangle } from 'lucide-react';

interface PilotBannerProps {
  scorecard: PilotScorecardData | null;
  dataQuality?: DataQualityReport | null;
  onOpenScorecard: () => void;
  onOpenDataQuality: () => void;
}

export const PilotBanner: React.FC<PilotBannerProps> = ({
  scorecard,
  dataQuality,
  onOpenScorecard,
  onOpenDataQuality
}) => {
  if (!scorecard) return null;

  const isEndingSoon = scorecard.daysRemaining <= 14;
  const isComplete = scorecard.daysRemaining === 0 || scorecard.pilotStatus === 'completed';

  return (
    <div className="bg-gradient-to-r from-slate-900 via-slate-850 to-slate-900 text-white rounded-2xl p-4 sm:p-5 shadow-sm border border-slate-800">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        {/* Left Info */}
        <div className="space-y-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-emerald-400 bg-emerald-950/80 px-2.5 py-0.5 rounded-full border border-emerald-800/50">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              WattWise 3-Month Energy Pilot
            </span>
            <span className="text-xs font-semibold text-slate-300">
              Day {scorecard.daysElapsed} of {scorecard.daysTotal}
            </span>
            {isEndingSoon && !isComplete && (
              <Badge variant="amber" size="sm">
                Ending in {scorecard.daysRemaining} days
              </Badge>
            )}
            {isComplete && (
              <Badge variant="blue" size="sm">
                Pilot Completed
              </Badge>
            )}
          </div>

          <p className="text-xs text-slate-300">
            Active RWA Pilot Period: <strong className="text-white font-medium">{scorecard.startDate}</strong> to <strong className="text-white font-medium">{scorecard.endDate}</strong> • {scorecard.daysRemaining} days remaining
          </p>
        </div>

        {/* Center Pill Metrics */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs">
          {/* Baseline Status */}
          <div 
            onClick={onOpenScorecard}
            className="cursor-pointer bg-slate-800/80 hover:bg-slate-750 px-3 py-1.5 rounded-xl border border-slate-700/60 flex items-center gap-2 transition-colors"
          >
            <Activity className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-slate-400 text-[11px]">Baseline:</span>
            <span className={`font-bold capitalize ${
              scorecard.baselineStatus === 'established' ? 'text-emerald-400' :
              scorecard.baselineStatus === 'preliminary' ? 'text-amber-400' : 'text-slate-400'
            }`}>
              {scorecard.baselineStatus.replace('_', ' ')}
            </span>
          </div>

          {/* Data Quality */}
          <button
            onClick={onOpenDataQuality}
            className="cursor-pointer bg-slate-800/80 hover:bg-slate-750 px-3 py-1.5 rounded-xl border border-slate-700/60 flex items-center gap-2 transition-colors text-left"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-slate-400 text-[11px]">Data Quality:</span>
            <span className={`font-bold capitalize ${
              scorecard.dataQualityStatus === 'good' ? 'text-emerald-400' :
              scorecard.dataQualityStatus === 'needs_review' ? 'text-amber-400' : 'text-rose-400'
            }`}>
              {scorecard.dataQualityStatus.replace('_', ' ')}
            </span>
          </button>

          {/* Pilot Health Score */}
          <div 
            onClick={onOpenScorecard}
            className="cursor-pointer bg-slate-800/80 hover:bg-slate-750 px-3 py-1.5 rounded-xl border border-slate-700/60 flex items-center gap-2 transition-colors"
          >
            <Award className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-slate-400 text-[11px]">Pilot Health:</span>
            <span className="font-bold text-white">{scorecard.pilotHealthScore}/100</span>
          </div>
        </div>

        {/* Right CTA */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={onOpenScorecard}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs rounded-xl shadow-xs transition-all cursor-pointer"
          >
            Pilot Scorecard
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
