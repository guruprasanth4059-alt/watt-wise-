import React, { useEffect, useState } from 'react';
import { api } from '../../api/client';
import { AnalyticsSummary, CategoryBreakdown, Recommendation, Bill, User } from '../../types';
import { StatCard } from '../../components/common/StatCard';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { ConsumptionTrendChart } from '../../components/charts/ConsumptionTrendChart';
import { CostComparisonChart } from '../../components/charts/CostComparisonChart';
import { CategoryBreakdownChart } from '../../components/charts/CategoryBreakdownChart';
import { SkeletonCard, SkeletonChart } from '../../components/common/SkeletonLoader';
import { EmptyState } from '../../components/common/EmptyState';
import { useAuth } from '../../context/AuthContext';
import {
  Zap,
  Sparkles,
  TrendingDown,
  ArrowRight,
  Lightbulb,
  Receipt,
  FileCheck,
  PlusCircle,
  AlertCircle
} from 'lucide-react';

interface DashboardProps {
  onNavigate: (path: string) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ onNavigate }) => {
  const { user, society } = useAuth();
  const [analytics, setAnalytics] = useState<AnalyticsSummary | null>(null);
  const [breakdown, setBreakdown] = useState<CategoryBreakdown | null>(null);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [recentBills, setRecentBills] = useState<Bill[]>([]);
  const [latestAiSummary, setLatestAiSummary] = useState<string | null>(null);
  const [aiConfidence, setAiConfidence] = useState<'low' | 'medium' | 'high'>('medium');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchDashboardData = async () => {
    setIsLoading(true);
    setError('');
    try {
      const [analyticsData, breakdownData, recsData, billsData, aiData] = await Promise.all([
        api.get<AnalyticsSummary>('/analytics'),
        api.get<CategoryBreakdown>('/analytics/category-breakdown'),
        api.get<Recommendation[]>('/recommendations'),
        api.get<{ bills: Bill[] }>('/bills?limit=4'),
        api.get<any[]>('/ai/insights').catch(() => [])
      ]);

      setAnalytics(analyticsData);
      setBreakdown(breakdownData);
      setRecommendations(recsData);
      setRecentBills(billsData.bills || []);
      if (aiData.length > 0) {
        setLatestAiSummary(aiData[0].summary);
        setAiConfidence(aiData[0].confidence || 'medium');
      }
    } catch (err: any) {
      console.error('Error loading dashboard:', err);
      setError('Something went wrong while loading your electricity data. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [user]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <SkeletonChart />
          <SkeletonChart />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 bg-rose-50 border border-rose-200 rounded-2xl text-rose-800 text-center space-y-3">
        <p className="font-semibold">{error}</p>
        <Button variant="outline" size="sm" onClick={fetchDashboardData}>
          Try Again
        </Button>
      </div>
    );
  }

  // If newly registered society with no bills yet
  if (!analytics || !analytics.currentMonth) {
    return (
      <div className="space-y-6">
        <EmptyState
          title="No electricity data yet"
          description="Upload your first electricity bill to start tracking your society's energy usage and unlock potential savings."
          actionText="Upload First Bill"
          onAction={() => onNavigate('/bills')}
        />
      </div>
    );
  }

  const current = analytics.currentMonth;
  const isDemo = society?.name === 'Green Valley Residency';

  return (
    <div className="space-y-6">
      {/* Welcome Banner / Society Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">
              {society?.name || 'Green Valley Residency'}
            </h2>
            {isDemo && (
              <span className="text-[11px] bg-slate-100 text-slate-700 font-semibold px-2 py-0.5 rounded border border-slate-200">
                Demo Data
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Billing Period: <span className="font-semibold text-slate-700">{current.period}</span> • Common-Area Electricity Overview
          </p>
        </div>

        {/* Quick Action Button */}
        <div className="flex items-center gap-2">
          {user?.role !== 'resident' && (
            <Button
              variant="primary"
              size="sm"
              onClick={() => onNavigate('/bills')}
              icon={<PlusCircle className="w-4 h-4" />}
            >
              Upload / Enter Bill
            </Button>
          )}
        </div>
      </div>

      {/* 4 Main KPI Cards (Section 13) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Monthly Consumption"
          value={current.consumptionKwh.toLocaleString()}
          unit="kWh"
          change={analytics.consumptionChangePercent}
          changeLabel="vs previous month"
          isDemo={isDemo}
          icon={<Zap className="w-5 h-5 text-emerald-600" />}
        />

        <StatCard
          title="Monthly Bill"
          value={`₹${current.billAmount.toLocaleString()}`}
          subtitle={`Avg ₹${analytics.costPerApartment} / apartment`}
          isDemo={isDemo}
          icon={<Receipt className="w-5 h-5 text-slate-700" />}
        />

        <StatCard
          title="Potential Savings"
          value={`₹${analytics.potentialSavings.toLocaleString()}`}
          unit="/ mo"
          potentialBadge={true}
          subtitle="Estimated from active recommendations"
          isDemo={isDemo}
          icon={<Lightbulb className="w-5 h-5 text-amber-600" />}
        />

        <StatCard
          title="Recorded Savings"
          value={`₹${analytics.measuredSavings.toLocaleString()}`}
          unit="/ mo"
          subtitle="Verified after conservation actions"
          isDemo={isDemo}
          icon={<FileCheck className="w-5 h-5 text-emerald-600" />}
        />
      </div>

      {/* WattWise Internal Score & AI Insight Banner (Section 30 & 24) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Score Card */}
        <Card className="flex flex-col justify-between p-5 bg-gradient-to-br from-white to-emerald-50/40 border-emerald-200/80">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                WattWise Internal Score
              </span>
              <Badge variant="emerald" size="sm">
                Score 0-100
              </Badge>
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">Not an official certification.</p>

            <div className="mt-4 flex items-baseline gap-2">
              <span className="text-4xl font-extrabold text-emerald-700">{analytics.energyScore}</span>
              <span className="text-sm text-slate-500 font-semibold">/ 100</span>
            </div>

            {/* Score Breakdown Bars */}
            <div className="mt-4 space-y-2 text-xs">
              <div>
                <div className="flex justify-between text-[11px] text-slate-600 mb-0.5">
                  <span>Consumption Trend</span>
                  <span className="font-semibold">{analytics.energyScoreComponents.trendScore}/30</span>
                </div>
                <div className="h-1.5 w-full bg-slate-200 rounded-full overflow-hidden">
                  <div className="bg-emerald-600 h-full rounded-full" style={{ width: `${(analytics.energyScoreComponents.trendScore / 30) * 100}%` }} />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-[11px] text-slate-600 mb-0.5">
                  <span>Data Completeness</span>
                  <span className="font-semibold">{analytics.energyScoreComponents.dataCompletenessScore}/25</span>
                </div>
                <div className="h-1.5 w-full bg-slate-200 rounded-full overflow-hidden">
                  <div className="bg-emerald-600 h-full rounded-full" style={{ width: `${(analytics.energyScoreComponents.dataCompletenessScore / 25) * 100}%` }} />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-[11px] text-slate-600 mb-0.5">
                  <span>Savings Progress</span>
                  <span className="font-semibold">{analytics.energyScoreComponents.savingsProgressScore}/25</span>
                </div>
                <div className="h-1.5 w-full bg-slate-200 rounded-full overflow-hidden">
                  <div className="bg-emerald-600 h-full rounded-full" style={{ width: `${(analytics.energyScoreComponents.savingsProgressScore / 25) * 100}%` }} />
                </div>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-200/80 text-[11px] text-slate-500">
            Higher scores reflect consistent meter logging, positive MoM trends, and recorded action tracking.
          </div>
        </Card>

        {/* AI Insight Card */}
        <Card className="lg:col-span-2 p-5 flex flex-col justify-between border-emerald-200/90 bg-emerald-50/40">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-emerald-200/60">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-emerald-600 text-white rounded-md">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-emerald-950">WattWise AI Insight</h3>
                  <span className="text-[10px] text-slate-500">Structured Electricity Intelligence</span>
                </div>
              </div>
              <Badge variant={aiConfidence === 'high' ? 'emerald' : aiConfidence === 'medium' ? 'blue' : 'amber'} size="sm">
                Confidence: {aiConfidence}
              </Badge>
            </div>

            <div className="mt-3 text-xs sm:text-sm text-slate-800 leading-relaxed">
              {latestAiSummary ? (
                <p>&ldquo;{latestAiSummary}&rdquo;</p>
              ) : (
                <p>
                  WattWise AI evaluates your monthly consumption against past cycles and common-area categories to highlight anomalies and conservation opportunities.
                </p>
              )}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-emerald-200/60 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <span className="text-[11px] text-slate-500 italic">
              AI-generated insight based on available society data.
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onNavigate('/insights')}
              icon={<ArrowRight className="w-3.5 h-3.5" />}
              className="bg-white text-xs py-1"
            >
              View Full AI Analysis
            </Button>
          </div>
        </Card>
      </div>

      {/* Charts Section: 6-12 Month Trend & Cost */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Consumption Trend</h3>
              <p className="text-xs text-slate-500">6-12 month common-area electricity usage (kWh)</p>
            </div>
            <Badge variant="slate" size="sm">
              Monthly kWh
            </Badge>
          </div>
          <ConsumptionTrendChart data={analytics.history} height={260} />
        </Card>

        <Card className="p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Electricity Cost</h3>
              <p className="text-xs text-slate-500">Monthly utility billing invoice totals (₹)</p>
            </div>
            <Badge variant="slate" size="sm">
              Invoice (₹)
            </Badge>
          </div>
          <CostComparisonChart data={analytics.history} height={260} />
        </Card>
      </div>

      {/* Common-Area Category Breakdown (Section 14 & 22) */}
      <Card className="p-5">
        <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Common-Area Energy Breakdown</h3>
            <p className="text-xs text-slate-500">
              Only verified sub-meter measurements are displayed. Zero fabricated percentages.
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onNavigate('/energy')}
            className="text-xs text-emerald-600 hover:text-emerald-700"
          >
            Detailed Energy Module →
          </Button>
        </div>

        {breakdown && (
          <CategoryBreakdownChart
            breakdown={breakdown}
            onAddSubmeter={() => onNavigate('/meters')}
          />
        )}
      </Card>

      {/* Actionable Recommendations & Recent Bills */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recommendations */}
        <Card className="p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                <Lightbulb className="w-4 h-4 text-amber-500" />
                Active Recommendations
              </h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onNavigate('/recommendations')}
                className="text-xs text-emerald-600 hover:text-emerald-700"
              >
                View All ({recommendations.length})
              </Button>
            </div>

            <div className="space-y-3">
              {recommendations.slice(0, 3).map(rec => (
                <div
                  key={rec.id}
                  onClick={() => onNavigate('/recommendations')}
                  className="p-3 rounded-xl border border-slate-200/80 hover:border-emerald-300 hover:bg-slate-50/60 transition-all cursor-pointer space-y-1.5"
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-xs font-bold text-slate-800 line-clamp-1">{rec.title}</span>
                    <Badge
                      variant={rec.priority === 'high' ? 'red' : rec.priority === 'medium' ? 'amber' : 'blue'}
                      size="sm"
                    >
                      {rec.priority.toUpperCase()}
                    </Badge>
                  </div>
                  <p className="text-[11px] text-slate-600 line-clamp-2">{rec.suggested_action}</p>
                  <div className="flex items-center justify-between text-[10px] pt-1">
                    <span className="font-semibold text-emerald-700">
                      Potential: ₹{rec.estimated_savings.toLocaleString()} / mo
                    </span>
                    <span className="capitalize text-slate-400 font-medium">
                      Status: {rec.status.replace('_', ' ')}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Card>

        {/* Recent Bills */}
        <Card className="p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                <Receipt className="w-4 h-4 text-emerald-600" />
                Recent Electricity Invoices
              </h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onNavigate('/bills')}
                className="text-xs text-emerald-600 hover:text-emerald-700"
              >
                Bill Ledger →
              </Button>
            </div>

            <div className="space-y-2">
              {recentBills.map(bill => (
                <div
                  key={bill.id}
                  className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between text-xs"
                >
                  <div>
                    <span className="font-bold text-slate-800">{bill.billing_period}</span>
                    <span className="text-slate-400 ml-2">
                      {bill.meter_name || 'Main Panel'}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="font-bold text-slate-900 block">₹{bill.bill_amount.toLocaleString()}</span>
                    <span className="text-[11px] text-emerald-600 font-medium">{bill.units_kwh.toLocaleString()} kWh</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 flex justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onNavigate('/reports')}
              className="text-xs"
            >
              Generate Monthly Report
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
};
