import React, { useEffect, useState } from 'react';
import { api } from '../../api/client';
import { ReportItem } from '../../types';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { useAuth } from '../../context/AuthContext';
import {
  FileText,
  Printer,
  Download,
  Share2,
  Calendar,
  Sparkles,
  Zap,
  CheckCircle2,
  ArrowDownRight,
  Droplets
} from 'lucide-react';

export const Reports: React.FC = () => {
  const { user, society } = useAuth();
  const [reportsList, setReportsList] = useState<ReportItem[]>([]);
  const [selectedReport, setSelectedReport] = useState<any | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [targetMonth, setTargetMonth] = useState('2026-03');

  const fetchReports = async () => {
    try {
      const data = await api.get<ReportItem[]>('/reports');
      setReportsList(data);
      if (data.length > 0) {
        // Load latest report details
        const latest = await api.get<any>(`/reports/${data[0].id}`);
        setSelectedReport(latest.report_data);
      }
    } catch (err) {
      console.error('Failed to load reports:', err);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  const handleGenerateReport = async () => {
    setIsGenerating(true);
    try {
      const res = await api.post<any>('/reports/generate', { month: targetMonth });
      setSelectedReport(res.reportData);
      fetchReports();
    } catch (err) {
      console.error('Report generation failed:', err);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSelectReport = async (id: string) => {
    try {
      const rep = await api.get<any>(`/reports/${id}`);
      setSelectedReport(rep.report_data);
    } catch (err) {
      console.error(err);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: `WattWise Energy Report - ${selectedReport?.societyName} (${selectedReport?.month})`,
        text: `March common-area electricity report: ${selectedReport?.totalConsumptionKwh} kWh, ₹${selectedReport?.electricityCost}.`,
        url: window.location.href
      }).catch(() => {});
    } else {
      navigator.clipboard.writeText(window.location.href);
      alert('Report link copied to clipboard!');
    }
  };

  const canGenerate = user?.role === 'society_admin' || user?.role === 'committee_member';

  return (
    <div className="space-y-6">
      {/* Top Header - Hidden on Print */}
      <div className="no-print flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <FileText className="w-5 h-5 text-emerald-600" />
            Executive Monthly Reports
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Branded, high-density energy summaries designed for Annual General Body Meetings (AGMs).
          </p>
        </div>

        <div className="flex items-center gap-2">
          {canGenerate && (
            <Button
              variant="primary"
              size="sm"
              isLoading={isGenerating}
              onClick={handleGenerateReport}
            >
              Generate {targetMonth} Report
            </Button>
          )}
          {selectedReport && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={handlePrint}
                icon={<Printer className="w-4 h-4" />}
              >
                Print / PDF
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleShare}
                icon={<Share2 className="w-4 h-4" />}
              >
                Share
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Reports Archive selector (Hidden on Print) */}
      {reportsList.length > 1 && (
        <div className="no-print flex items-center gap-2 overflow-x-auto pb-1 text-xs">
          <span className="text-slate-500 font-semibold shrink-0">Archived Reports:</span>
          {reportsList.map(r => (
            <button
              key={r.id}
              onClick={() => handleSelectReport(r.id)}
              className={`px-3 py-1.5 rounded-lg border font-semibold transition-all cursor-pointer ${
                selectedReport?.month === r.month
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-300 shadow-xs'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              }`}
            >
              {r.month}
            </button>
          ))}
        </div>
      )}

      {/* Printable Executive Report Document (Section 31) */}
      {selectedReport ? (
        <div className="printable-card bg-white rounded-2xl border border-slate-200/80 shadow-md p-6 sm:p-10 space-y-8 max-w-4xl mx-auto">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b-2 border-slate-900 gap-4">
            <div>
              <div className="flex items-center gap-2 text-emerald-700 font-bold text-lg">
                <Zap className="w-5 h-5 fill-current" />
                <span>WattWise Energy Intelligence Report</span>
              </div>
              <h1 className="text-2xl font-extrabold text-slate-900 mt-1">
                {selectedReport.societyName}
              </h1>
              <p className="text-xs text-slate-500">
                {selectedReport.location} • {selectedReport.apartments} Units • {selectedReport.buildings} Towers
              </p>
            </div>

            <div className="sm:text-right">
              <span className="text-xs uppercase font-bold text-slate-400 tracking-wider">Report Month</span>
              <p className="text-xl font-extrabold text-slate-900">{selectedReport.month}</p>
              <span className="text-[11px] text-slate-400">Generated: {selectedReport.generatedDate}</span>
            </div>
          </div>

          {/* Section 1: Executive KPI Summary */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
              <span className="text-[11px] font-bold text-slate-500 uppercase">Total Consumption</span>
              <p className="text-xl font-extrabold text-slate-900 mt-1">
                {selectedReport.totalConsumptionKwh?.toLocaleString()} kWh
              </p>
              <span className="text-[11px] text-emerald-600 font-semibold inline-flex items-center gap-0.5">
                <ArrowDownRight className="w-3.5 h-3.5" />
                {Math.abs(selectedReport.consumptionChangePercent)}% MoM
              </span>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
              <span className="text-[11px] font-bold text-slate-500 uppercase">Electricity Cost</span>
              <p className="text-xl font-extrabold text-slate-900 mt-1">
                ₹{selectedReport.electricityCost?.toLocaleString()}
              </p>
              <span className="text-[11px] text-slate-500 font-medium">
                ₹{selectedReport.costPerKwh} / kWh
              </span>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
              <span className="text-[11px] font-bold text-slate-500 uppercase">Per Apartment Share</span>
              <p className="text-xl font-extrabold text-slate-900 mt-1">
                ₹{selectedReport.costPerApartment}
              </p>
              <span className="text-[11px] text-slate-500 font-medium">
                {selectedReport.consumptionPerApartment} kWh / unit
              </span>
            </div>

            <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200">
              <span className="text-[11px] font-bold text-emerald-800 uppercase">WattWise Score</span>
              <p className="text-xl font-extrabold text-emerald-800 mt-1">
                {selectedReport.energyScore} / 100
              </p>
              <span className="text-[9px] text-emerald-600 block">Internal standard</span>
            </div>
          </div>

          {/* Section 2: AI Intelligence Summary */}
          <div className="p-5 rounded-xl bg-emerald-50/60 border border-emerald-200/80 space-y-2">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-emerald-600" />
              <h3 className="text-xs font-bold text-emerald-950 uppercase tracking-wide">
                AI Executive Analysis Summary
              </h3>
            </div>
            <p className="text-xs text-slate-700 leading-relaxed font-medium">
              &ldquo;{selectedReport.aiSummary}&rdquo;
            </p>
            <p className="text-[10px] text-slate-400 italic pt-1">
              AI-generated insight based on available society data.
            </p>
          </div>

          {/* Section 3: Top Consumer & Common-Area Load */}
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-slate-900 border-b border-slate-200 pb-1">
              Primary Energy Consumer Breakdown
            </h3>
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
                  <Droplets className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-slate-500 text-[11px] uppercase font-bold">Top Sub-Metered Facility:</span>
                  <p className="text-sm font-bold text-slate-900">{selectedReport.topConsumer?.name}</p>
                </div>
              </div>
              <div className="sm:text-right">
                <span className="text-xs font-bold text-slate-700">
                  {selectedReport.topConsumer?.percentage}% of shared load
                </span>
                <p className="text-[11px] text-slate-400">Sub-meter verified reading</p>
              </div>
            </div>
          </div>

          {/* Section 4: Completed Actions & Measured Impact */}
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-slate-900 border-b border-slate-200 pb-1">
              Completed Energy Conservation Actions
            </h3>
            {selectedReport.completedActions?.length === 0 ? (
              <p className="text-xs text-slate-400 italic">No physical actions recorded this billing cycle.</p>
            ) : (
              <div className="space-y-2 text-xs">
                {selectedReport.completedActions.map((act: any, idx: number) => (
                  <div key={idx} className="p-3 rounded-lg border border-slate-200 bg-white space-y-1">
                    <div className="flex justify-between font-semibold text-slate-800">
                      <span>{act.action_taken}</span>
                      <span className="text-slate-400 font-mono text-[11px]">{act.action_date}</span>
                    </div>
                    {act.measured_savings && (
                      <p className="text-emerald-700 font-bold text-[11px]">
                        Verified Monthly Savings Impact: ₹{act.measured_savings.toLocaleString()}
                      </p>
                    )}
                  </div>
                ))}
                <p className="text-[10px] text-slate-400 italic">
                  Note: Consumption decreased after recorded actions. Other factors may also have contributed.
                </p>
              </div>
            )}
          </div>

          {/* Section 5: Next Month Recommendations */}
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-slate-900 border-b border-slate-200 pb-1">
              Recommended Initiatives for Upcoming Cycle
            </h3>
            <div className="space-y-2 text-xs">
              {selectedReport.recommendations?.slice(0, 3).map((rec: any, idx: number) => (
                <div key={idx} className="p-3 rounded-lg border border-slate-100 bg-slate-50 flex items-start justify-between gap-2">
                  <div className="space-y-0.5">
                    <span className="font-bold text-slate-800">{rec.title}</span>
                    <p className="text-slate-600">{rec.suggested_action}</p>
                  </div>
                  <span className="text-emerald-700 font-semibold shrink-0 text-right text-[11px]">
                    Potential: ₹{rec.estimated_savings?.toLocaleString()}/mo
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Signoff / Footer */}
          <div className="pt-8 border-t border-slate-200 flex flex-col sm:flex-row justify-between items-center text-[11px] text-slate-400">
            <div>Presented on behalf of the Resident Welfare Association Management Committee.</div>
            <div className="font-semibold text-slate-600">WattWise Community Energy Platform</div>
          </div>
        </div>
      ) : (
        <Card className="p-12 text-center text-xs text-slate-400">
          No report generated yet. Click Generate Report to create one.
        </Card>
      )}
    </div>
  );
};
