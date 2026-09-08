import React from 'react';
import { DataQualityReport } from '../../types';
import { Modal } from '../common/Modal';
import { Badge } from '../common/Badge';
import { Button } from '../common/Button';
import { ShieldCheck, AlertTriangle, AlertCircle, CheckCircle2, FileCheck, ArrowRight } from 'lucide-react';

interface DataQualityModalProps {
  isOpen: boolean;
  onClose: () => void;
  report: DataQualityReport | null;
  onNavigateBills?: () => void;
}

export const DataQualityModal: React.FC<DataQualityModalProps> = ({
  isOpen,
  onClose,
  report,
  onNavigateBills
}) => {
  if (!report) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Electricity Data Quality & Completeness"
      subtitle="Automated audit of society utility billing records and baseline coverage"
      maxWidth="lg"
    >
      <div className="space-y-5">
        {/* Top Summary Card */}
        <div className={`p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
          report.status === 'good' 
            ? 'bg-emerald-50/70 border-emerald-200 text-emerald-950' 
            : report.status === 'needs_review'
            ? 'bg-amber-50/70 border-amber-200 text-amber-950'
            : 'bg-rose-50/70 border-rose-200 text-rose-950'
        }`}>
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-xl text-white ${
              report.status === 'good' ? 'bg-emerald-600' : report.status === 'needs_review' ? 'bg-amber-600' : 'bg-rose-600'
            }`}>
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-bold capitalize">
                  Overall Data Quality: {report.status.replace('_', ' ')}
                </h4>
                <Badge variant={report.status === 'good' ? 'emerald' : report.status === 'needs_review' ? 'amber' : 'red'} size="sm">
                  Score: {report.score}/100
                </Badge>
              </div>
              <p className="text-xs opacity-80 mt-0.5">
                {report.status === 'good' 
                  ? 'Data is continuous and sufficient for verified baseline and anomaly tracking.' 
                  : report.status === 'needs_review'
                  ? 'Minor data warnings detected. Analysis can continue but review is recommended.'
                  : 'Insufficient data for reliable baseline calculations. Additional bills required.'}
              </p>
            </div>
          </div>
        </div>

        {/* Coverage KPI stats */}
        <div className="grid grid-cols-3 gap-3 text-center">
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
            <span className="text-[11px] text-slate-500 block">Coverage Months</span>
            <span className="text-lg font-bold text-slate-900">{report.coverageMonths} Cycles</span>
          </div>
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
            <span className="text-[11px] text-slate-500 block">Verified Bills</span>
            <span className="text-lg font-bold text-emerald-700">{report.verifiedBills} of {report.totalBills}</span>
          </div>
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
            <span className="text-[11px] text-slate-500 block">Identified Warnings</span>
            <span className={`text-lg font-bold ${report.warnings.length === 0 ? 'text-emerald-700' : 'text-amber-700'}`}>
              {report.warnings.length}
            </span>
          </div>
        </div>

        {/* Issues List */}
        <div className="space-y-2">
          <h5 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
            Quality Observations & Recommendations
          </h5>

          {report.issues.length === 0 ? (
            <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-200 text-xs text-emerald-800 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Zero issues found! All billing months are continuous and verified.</span>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden bg-white text-xs">
              {report.issues.map((issue, idx) => (
                <div key={idx} className="p-3.5 space-y-1">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge 
                        variant={issue.severity === 'high' ? 'red' : issue.severity === 'medium' ? 'amber' : 'blue'}
                        size="sm"
                      >
                        {issue.severity.toUpperCase()}
                      </Badge>
                      <span className="font-bold text-slate-800">{issue.message}</span>
                    </div>
                    {issue.period && (
                      <span className="text-[11px] font-mono text-slate-400">{issue.period}</span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-500 pl-1">
                    👉 <strong>Action:</strong> {issue.actionableHint}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="pt-2 flex justify-between items-center">
          {onNavigateBills && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                onClose();
                onNavigateBills();
              }}
              icon={<FileCheck className="w-4 h-4 text-emerald-600" />}
            >
              Go to Bills Ledger
            </Button>
          )}

          <Button variant="primary" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </Modal>
  );
};
