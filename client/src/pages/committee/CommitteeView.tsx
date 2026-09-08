import React, { useState, useEffect } from 'react';
import { api } from '../../api/client';
import { CommitteeBriefing } from '../../types';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { StatCard } from '../../components/common/StatCard';
import { SkeletonCard } from '../../components/common/SkeletonLoader';
import {
  Briefcase,
  Printer,
  RefreshCw,
  AlertTriangle,
  Target,
  IndianRupee,
  TrendingUp,
  CheckSquare,
  ShieldCheck,
  Calendar,
  Sparkles,
  Users,
  Clock,
  ArrowRight
} from 'lucide-react';

export const CommitteeView: React.FC = () => {
  const [briefing, setBriefing] = useState<CommitteeBriefing | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);

  const fetchBriefing = async () => {
    setIsLoading(true);
    try {
      const data = await api.get<CommitteeBriefing>('/committee/briefing');
      setBriefing(data);
    } catch (err) {
      console.error('Failed to load committee briefing:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerateFresh = async () => {
    setIsGenerating(true);
    try {
      const data = await api.post<CommitteeBriefing>('/committee/generate', {});
      setBriefing(data);
    } catch (err) {
      console.error('Failed to generate fresh briefing:', err);
    } finally {
      setIsGenerating(false);
    }
  };

  useEffect(() => {
    fetchBriefing();
  }, []);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 print:hidden">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Briefcase className="h-6 w-6 text-brand-500" />
              Management Committee Decision Pack
            </h1>
            <Badge variant="blue">RWA Executive Support</Badge>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Condensed, audit-ready energy intelligence designed for monthly Managing Committee (MC) and General Body reviews.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={handlePrint}
            className="flex items-center gap-2"
          >
            <Printer className="h-4 w-4" />
            Print / Save PDF
          </Button>

          <Button
            variant="primary"
            onClick={handleGenerateFresh}
            disabled={isGenerating}
            className="flex items-center gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${isGenerating ? 'animate-spin' : ''}`} />
            {isGenerating ? 'Compiling...' : 'Regenerate Briefing'}
          </Button>
        </div>
      </div>

      {/* Printable Report Header */}
      <div className="hidden print:block border-b border-gray-300 pb-4 mb-4">
        <h1 className="text-xl font-bold text-black">WATTWISE ENERGY INTELLIGENCE — EXECUTIVE COMMITTEE BRIEFING</h1>
        <div className="text-xs text-gray-600 mt-1 flex justify-between">
          <span>Review Period: {briefing?.meetingMonth || 'Current Period'}</span>
          <span>Generated On: {briefing?.generatedAt ? new Date(briefing.generatedAt).toLocaleString() : new Date().toLocaleDateString()}</span>
        </div>
      </div>

      {/* Governance & Disclaimer Notice */}
      <div className="p-3 bg-brand-500/10 border border-brand-500/20 rounded-xl flex items-start gap-3 print:border-gray-300">
        <ShieldCheck className="h-5 w-5 text-brand-500 shrink-0 mt-0.5 print:hidden" />
        <div className="text-xs text-brand-900 dark:text-brand-300 print:text-black">
          <span className="font-semibold uppercase tracking-wider block mb-0.5">
            Audit-Grade Decision Support Briefing
          </span>
          This pack compiles verified Discom billing data, smart-meter telemetry baselines, and deterministic predictive forecasts.
          Presented for executive review, budget approvals, and estate operations governance.
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </div>
          <SkeletonCard />
        </div>
      ) : !briefing ? (
        <Card className="p-12 text-center">
          <AlertTriangle className="h-12 w-12 text-amber-500 mx-auto mb-3" />
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">Briefing Not Available</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 max-w-md mx-auto mb-4">
            No committee briefing has been generated yet for this period.
          </p>
          <Button variant="primary" onClick={handleGenerateFresh}>
            Generate First Briefing
          </Button>
        </Card>
      ) : (
        <>
          {/* Financial Outlook Stat Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <StatCard
              title="Month-to-Date Spend"
              value={`₹${(briefing.financialImpact?.currentMonthlyEstimate || 0).toLocaleString()}`}
              subtitle="Current utility meter run-rate"
              icon={<IndianRupee className="h-5 w-5 text-gray-500" />}
            />
            <StatCard
              title="Forecasted Month-End Bill"
              value={`₹${(briefing.financialImpact?.forecastedMonthEnd || 0).toLocaleString()}`}
              subtitle="Projected by predictive model"
              icon={<TrendingUp className="h-5 w-5 text-brand-500" />}
            />
            <StatCard
              title="Potential Monthly Savings"
              value={`₹${(briefing.financialImpact?.potentialSavingsMonthly || 0).toLocaleString()}`}
              subtitle="Addressable waste & tariff shifts"
              icon={<Target className="h-5 w-5 text-emerald-500" />}
            />
          </div>

          {/* AI Executive Summary Memo */}
          <Card className="p-6 bg-gradient-to-br from-gray-900 to-gray-800 text-white border-0 shadow-lg print:bg-white print:text-black print:border print:border-gray-300">
            <div className="flex items-center justify-between pb-4 border-b border-gray-700 print:border-gray-300 mb-4">
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-amber-400 print:hidden" />
                <h3 className="font-bold text-white print:text-black text-base">
                  Executive Committee Memo — {briefing.meetingMonth}
                </h3>
              </div>
              <Badge variant="blue" className="print:hidden">Verified Digest</Badge>
            </div>

            <p className="text-sm text-gray-200 print:text-gray-800 leading-relaxed font-sans whitespace-pre-line">
              {briefing.executiveBriefing}
            </p>
          </Card>

          {/* Side-by-Side: Top 5 Issues vs Top 5 Opportunities */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Top 5 Issues */}
            <Card className="p-6 print:border print:border-gray-300">
              <div className="flex items-center justify-between pb-3 border-b border-gray-200 dark:border-gray-700 mb-4">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-red-500" />
                  <h3 className="font-bold text-gray-900 dark:text-white">Top Critical Energy Issues</h3>
                </div>
                <span className="text-xs text-gray-500">{briefing.topIssues?.length || 0} active flags</span>
              </div>

              {briefing.topIssues?.length === 0 ? (
                <div className="text-sm text-gray-500 py-6 text-center">
                  No critical energy anomalies active this period.
                </div>
              ) : (
                <div className="space-y-3">
                  {briefing.topIssues.map((issue, idx) => (
                    <div
                      key={idx}
                      className="p-3 bg-red-50/50 dark:bg-red-950/20 rounded-lg border border-red-200 dark:border-red-900/30 flex items-start justify-between gap-3"
                    >
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant={issue.severity === 'critical' ? 'red' : 'amber'}>
                            {issue.severity}
                          </Badge>
                          <span className="font-semibold text-xs text-gray-900 dark:text-white">
                            {issue.title}
                          </span>
                        </div>
                        <p className="text-xs text-gray-600 dark:text-gray-400">
                          {issue.impact}
                        </p>
                      </div>
                      <span className="text-[11px] text-gray-500 shrink-0 font-medium">
                        Owner: {issue.owner}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            {/* Top 5 Opportunities */}
            <Card className="p-6 print:border print:border-gray-300">
              <div className="flex items-center justify-between pb-3 border-b border-gray-200 dark:border-gray-700 mb-4">
                <div className="flex items-center gap-2">
                  <Target className="h-5 w-5 text-emerald-500" />
                  <h3 className="font-bold text-gray-900 dark:text-white">Top High-Value Opportunities</h3>
                </div>
                <span className="text-xs text-gray-500">{briefing.topOpportunities?.length || 0} ranked items</span>
              </div>

              {briefing.topOpportunities?.length === 0 ? (
                <div className="text-sm text-gray-500 py-6 text-center">
                  No high-impact opportunities identified for this period.
                </div>
              ) : (
                <div className="space-y-3">
                  {briefing.topOpportunities.map((opp, idx) => (
                    <div
                      key={idx}
                      className="p-3 bg-emerald-50/50 dark:bg-emerald-950/20 rounded-lg border border-emerald-200 dark:border-emerald-900/30 flex items-start justify-between gap-3"
                    >
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="emerald">{opp.category.replace('_', ' ')}</Badge>
                          <span className="font-semibold text-xs text-gray-900 dark:text-white">
                            {opp.title}
                          </span>
                        </div>
                        <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                          +₹{opp.monthlySavingsInr.toLocaleString()} / month potential savings
                        </span>
                      </div>
                      <Badge variant={opp.priority === 'high' ? 'red' : 'blue'}>
                        {opp.priority}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>

          {/* Committee Action Items & Resolutions Table */}
          <Card className="p-6 print:border print:border-gray-300">
            <div className="flex items-center justify-between pb-3 border-b border-gray-200 dark:border-gray-700 mb-4">
              <div className="flex items-center gap-2">
                <CheckSquare className="h-5 w-5 text-brand-500" />
                <h3 className="font-bold text-gray-900 dark:text-white">
                  Action Items & Resolution Tracker
                </h3>
              </div>
              <span className="text-xs text-gray-500">Estate Operations Governance</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="text-xs text-gray-500 uppercase bg-gray-50 dark:bg-gray-800">
                  <tr>
                    <th className="px-4 py-3">Resolution / Action Item</th>
                    <th className="px-4 py-3">Designated Owner</th>
                    <th className="px-4 py-3">Target Date</th>
                    <th className="px-4 py-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {briefing.actionItems.map((item, idx) => (
                    <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                      <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">
                        {item.task}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-600 dark:text-gray-400">
                        {item.owner}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-600 dark:text-gray-400">
                        {item.deadline}
                      </td>
                      <td className="px-4 py-3">
                        <Badge
                          variant={
                            item.status === 'Completed'
                              ? 'emerald'
                              : item.status === 'In Progress'
                              ? 'blue'
                              : 'amber'
                          }
                        >
                          {item.status}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}
    </div>
  );
};
