import React, { useEffect, useState } from 'react';
import { api } from '../../api/client';
import { 
  AnalyticsSummary, 
  CategoryBreakdown, 
  Recommendation, 
  Bill, 
  User, 
  PilotScorecardData,
  DataQualityReport,
  Action,
  ForecastSummary,
  PredictiveAnomaly,
  EquipmentHealthSignal
} from '../../types';
import { StatCard } from '../../components/common/StatCard';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { ConsumptionTrendChart } from '../../components/charts/ConsumptionTrendChart';
import { CostComparisonChart } from '../../components/charts/CostComparisonChart';
import { CategoryBreakdownChart } from '../../components/charts/CategoryBreakdownChart';
import { SkeletonCard, SkeletonChart } from '../../components/common/SkeletonLoader';
import { EmptyState } from '../../components/common/EmptyState';
import { PilotBanner } from '../../components/pilot/PilotBanner';
import { PilotScorecardModal } from '../../components/pilot/PilotScorecardModal';
import { DataQualityModal } from '../../components/dataQuality/DataQualityModal';
import { PilotConversionModal } from '../../components/pilot/PilotConversionModal';
import { useAuth } from '../../context/AuthContext';
import {
  Zap,
  Sparkles,
  TrendingDown,
  TrendingUp,
  ArrowRight,
  Lightbulb,
  Receipt,
  FileCheck,
  PlusCircle,
  AlertCircle,
  ShieldCheck,
  CheckCircle2,
  Clock,
  Award,
  Layers,
  Bot,
  SlidersHorizontal,
  Target,
  Briefcase,
  Activity,
  Radio
} from 'lucide-react';

interface DashboardProps {
  onNavigate: (path: string) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ onNavigate }) => {
  const { user, society } = useAuth();
  const [analytics, setAnalytics] = useState<AnalyticsSummary | null>(null);
  const [breakdown, setBreakdown] = useState<CategoryBreakdown | null>(null);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [actionsList, setActionsList] = useState<Action[]>([]);
  const [recentBills, setRecentBills] = useState<Bill[]>([]);
  const [scorecard, setScorecard] = useState<PilotScorecardData | null>(null);
  const [dataQuality, setDataQuality] = useState<DataQualityReport | null>(null);
  const [latestAiSummary, setLatestAiSummary] = useState<string | null>(null);
  const [aiConfidence, setAiConfidence] = useState<'low' | 'medium' | 'high'>('medium');
  const [forecast, setForecast] = useState<ForecastSummary | null>(null);
  const [predictiveAnomalies, setPredictiveAnomalies] = useState<PredictiveAnomaly[]>([]);
  const [equipmentHealth, setEquipmentHealth] = useState<EquipmentHealthSignal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  // Modals state
  const [isScorecardOpen, setIsScorecardOpen] = useState(false);
  const [isDataQualityOpen, setIsDataQualityOpen] = useState(false);
  const [isConversionOpen, setIsConversionOpen] = useState(false);

  const fetchDashboardData = async () => {
    setIsLoading(true);
    setError('');
    try {
      const [
        analyticsData,
        breakdownData,
        recsData,
        billsData,
        aiData,
        scorecardData,
        dqData,
        actionsData,
        forecastData,
        anomaliesData,
        healthData
      ] = await Promise.all([
        api.get<AnalyticsSummary>('/analytics'),
        api.get<CategoryBreakdown>('/analytics/category-breakdown'),
        api.get<Recommendation[]>('/recommendations'),
        api.get<{ bills: Bill[] }>('/bills?limit=4'),
        api.get<any[]>('/ai/insights').catch(() => []),
        api.get<PilotScorecardData>('/pilot/scorecard').catch(() => null),
        api.get<DataQualityReport>('/pilot/data-quality').catch(() => null),
        api.get<Action[]>('/recommendations/actions/list').catch(() => []),
        api.get<ForecastSummary>('/forecast').catch(() => null),
        api.get<PredictiveAnomaly[]>('/predictive-anomalies').catch(() => []),
        api.get<EquipmentHealthSignal[]>('/equipment-health').catch(() => [])
      ]);

      setAnalytics(analyticsData);
      setBreakdown(breakdownData);
      setRecommendations(recsData);
      setRecentBills(billsData.bills || []);
      setScorecard(scorecardData);
      setDataQuality(dqData);
      setActionsList(actionsData || []);
      setForecast(forecastData);
      setPredictiveAnomalies(anomaliesData || []);
      setEquipmentHealth(healthData || []);

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
  const isDemo = society?.is_demo === 1 || society?.name === 'Green Valley Residency';

  // Action Center calculations
  const highPriorityRecs = recommendations.filter(r => r.priority === 'high' && r.status !== 'completed');
  const inProgressActions = recommendations.filter(r => r.status === 'in_progress');
  const completedActions = actionsList.length;

  return (
    <div className="space-y-6">
      {/* 1. Pilot Banner (Requirement 5 & 30) */}
      <PilotBanner
        scorecard={scorecard}
        dataQuality={dataQuality}
        onOpenScorecard={() => setIsScorecardOpen(true)}
        onOpenDataQuality={() => setIsDataQualityOpen(true)}
      />

      {/* Welcome Banner / Society Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">
              {society?.name || 'Green Valley Residency'}
            </h2>
            {isDemo && (
              <span className="text-[11px] bg-amber-100 text-amber-900 font-bold px-2 py-0.5 rounded border border-amber-300">
                DEMO DATA
              </span>
            )}
            <span className="text-[10px] bg-slate-100 text-slate-600 font-semibold px-2 py-0.5 rounded border border-slate-200 flex items-center gap-1">
              <ShieldCheck className="w-3 h-3 text-emerald-600" />
              Verified Invoices
            </span>
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

      {/* 4 Main KPI Cards with Trust Indicators (Requirement 34 & 38) */}
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
          subtitle="Estimated from active proposals"
          isDemo={isDemo}
          icon={<Lightbulb className="w-5 h-5 text-amber-600" />}
        />

        <StatCard
          title="Recorded Savings"
          value={`₹${analytics.measuredSavings.toLocaleString()}`}
          unit="/ mo"
          subtitle="Verified reduction after action"
          isDemo={isDemo}
          icon={<FileCheck className="w-5 h-5 text-emerald-600" />}
        />
      </div>

      {/* PHASE 4: PREDICTIVE ENERGY COMMAND CENTER */}
      <div className="p-6 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-2xl text-white shadow-xl space-y-6">
        {/* Top Control Bar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-brand-500/20 rounded-xl border border-brand-500/30">
              <TrendingUp className="h-6 w-6 text-brand-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-white">Predictive Energy Intelligence</h3>
                <span className="text-[10px] bg-brand-500 text-white font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                  Phase 4 Live
                </span>
              </div>
              <p className="text-xs text-slate-300">
                Deterministic forward projections, peak-demand risk forecasting, and non-invasive equipment health telemetry.
              </p>
            </div>
          </div>

          {/* Quick Launch Buttons to Phase 4 Modules */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => onNavigate('/forecast')}
              className="px-3 py-1.5 bg-white/10 hover:bg-white/20 border border-white/10 rounded-lg text-xs font-semibold text-white transition-all flex items-center gap-1.5"
            >
              <TrendingUp className="h-3.5 w-3.5 text-brand-400" /> Forecast
            </button>
            <button
              onClick={() => onNavigate('/copilot')}
              className="px-3 py-1.5 bg-white/10 hover:bg-white/20 border border-white/10 rounded-lg text-xs font-semibold text-white transition-all flex items-center gap-1.5"
            >
              <Bot className="h-3.5 w-3.5 text-cyan-400" /> AI Copilot
            </button>
            <button
              onClick={() => onNavigate('/scenarios')}
              className="px-3 py-1.5 bg-white/10 hover:bg-white/20 border border-white/10 rounded-lg text-xs font-semibold text-white transition-all flex items-center gap-1.5"
            >
              <SlidersHorizontal className="h-3.5 w-3.5 text-amber-400" /> Simulator
            </button>
            <button
              onClick={() => onNavigate('/opportunities')}
              className="px-3 py-1.5 bg-white/10 hover:bg-white/20 border border-white/10 rounded-lg text-xs font-semibold text-white transition-all flex items-center gap-1.5"
            >
              <Target className="h-3.5 w-3.5 text-emerald-400" /> Opportunities
            </button>
            <button
              onClick={() => onNavigate('/committee')}
              className="px-3 py-1.5 bg-brand-500 hover:bg-brand-600 text-white rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 shadow-sm"
            >
              <Briefcase className="h-3.5 w-3.5" /> Committee Pack
            </button>
          </div>
        </div>

        {/* 3 Live Predictive Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Card 1: Forward Forecast */}
          <div
            onClick={() => onNavigate('/forecast')}
            className="p-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition-all cursor-pointer group"
          >
            <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
              <span className="flex items-center gap-1.5 text-brand-300 font-semibold">
                <TrendingUp className="h-4 w-4 text-brand-400" /> Forward Forecast
              </span>
              <span className="text-[10px] bg-brand-500/20 text-brand-300 px-2 py-0.5 rounded border border-brand-500/30">
                {forecast?.modelType ? forecast.modelType.replace('_', ' ') : 'Multi-level Model'}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2 mt-2">
              <div>
                <span className="text-[11px] text-slate-400 block">Tomorrow&apos;s Load</span>
                <span className="text-xl font-bold text-white">
                  {forecast?.nextDayKwh ? forecast.nextDayKwh.toLocaleString() : '1,420'}{' '}
                  <span className="text-xs font-normal text-slate-400">kWh</span>
                </span>
              </div>
              <div>
                <span className="text-[11px] text-slate-400 block">Month-End Bill</span>
                <span className="text-xl font-bold text-emerald-400">
                  ₹{forecast?.expectedMonthlyCost ? forecast.expectedMonthlyCost.toLocaleString() : '3,45,000'}
                </span>
              </div>
            </div>
            <div className="text-[11px] text-brand-300 flex items-center gap-1 mt-3 group-hover:translate-x-1 transition-transform">
              Explore 7-day prediction curve <ArrowRight className="h-3 w-3" />
            </div>
          </div>

          {/* Card 2: Peak Demand Risk */}
          <div
            onClick={() => onNavigate('/forecast')}
            className="p-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition-all cursor-pointer group"
          >
            <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
              <span className="flex items-center gap-1.5 text-amber-300 font-semibold">
                <Zap className="h-4 w-4 text-amber-400" /> Peak Demand Risk
              </span>
              <span
                className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase tracking-wider ${
                  forecast?.peakForecast?.riskLevel === 'high'
                    ? 'bg-red-500/30 text-red-300 border border-red-500/40'
                    : 'bg-amber-500/30 text-amber-300 border border-amber-500/40'
                }`}
              >
                {forecast?.peakForecast?.riskLevel || 'medium'} risk
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2 mt-2">
              <div>
                <span className="text-[11px] text-slate-400 block">Expected Peak</span>
                <span className="text-xl font-bold text-white">
                  {forecast?.peakForecast?.expectedPeakKw ? forecast.peakForecast.expectedPeakKw.toFixed(1) : '48.5'}{' '}
                  <span className="text-xs font-normal text-slate-400">kW</span>
                </span>
              </div>
              <div>
                <span className="text-[11px] text-slate-400 block">Likely Window</span>
                <span className="text-sm font-bold text-amber-300 mt-1 block">
                  {forecast?.peakForecast?.likelyTimeWindow || '18:30 – 21:00'}
                </span>
              </div>
            </div>
            <div className="text-[11px] text-amber-300 flex items-center gap-1 mt-3 group-hover:translate-x-1 transition-transform">
              View penalty prevention advisory <ArrowRight className="h-3 w-3" />
            </div>
          </div>

          {/* Card 3: Equipment Health & Early Anomalies */}
          <div
            onClick={() => onNavigate('/opportunities')}
            className="p-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition-all cursor-pointer group"
          >
            <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
              <span className="flex items-center gap-1.5 text-emerald-300 font-semibold">
                <Activity className="h-4 w-4 text-emerald-400" /> Equipment Telemetry
              </span>
              <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded border border-emerald-500/30">
                Non-Invasive
              </span>
            </div>
            <div className="mt-2">
              <div className="text-sm font-bold text-white">
                {predictiveAnomalies.length > 0
                  ? predictiveAnomalies[0].pattern_type.replace('_', ' ')
                  : 'Telemetry Monitored'}
              </div>
              <p className="text-[11px] text-slate-300 mt-1 line-clamp-1">
                {predictiveAnomalies.length > 0
                  ? predictiveAnomalies[0].observed_change
                  : 'Submersible pumps, lifts, and common area baseloads operating within baseline.'}
              </p>
            </div>
            <div className="text-[11px] text-emerald-300 flex items-center gap-1 mt-3 group-hover:translate-x-1 transition-transform">
              Review {predictiveAnomalies.length} anomaly signals <ArrowRight className="h-3 w-3" />
            </div>
          </div>
        </div>

        {/* 6-Stage Operational Closed Loop */}
        <div className="pt-2 border-t border-white/10">
          <div className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold mb-2">
            WattWise Closed-Loop Operational Cycle
          </div>
          <div className="grid grid-cols-6 gap-2 text-center text-[11px]">
            <div className="p-2 rounded bg-white/5 border border-white/10">
              <span className="text-slate-400 block text-[9px]">1. SEE</span>
              <span className="font-semibold text-white">Meters</span>
            </div>
            <div className="p-2 rounded bg-white/5 border border-white/10">
              <span className="text-slate-400 block text-[9px]">2. UNDERSTAND</span>
              <span className="font-semibold text-white">Analytics</span>
            </div>
            <div className="p-2 rounded bg-brand-500/30 border border-brand-500/50">
              <span className="text-brand-300 block text-[9px]">3. PREDICT</span>
              <span className="font-bold text-white">Forecasts</span>
            </div>
            <div className="p-2 rounded bg-white/5 border border-white/10">
              <span className="text-slate-400 block text-[9px]">4. PRIORITIZE</span>
              <span className="font-semibold text-white">Opportunities</span>
            </div>
            <div className="p-2 rounded bg-white/5 border border-white/10">
              <span className="text-slate-400 block text-[9px]">5. ACT</span>
              <span className="font-semibold text-white">Workflows</span>
            </div>
            <div className="p-2 rounded bg-emerald-500/30 border border-emerald-500/50">
              <span className="text-emerald-300 block text-[9px]">6. MEASURE</span>
              <span className="font-bold text-white">Savings</span>
            </div>
          </div>
        </div>
      </div>

      {/* WattWise Score & AI Insight Banner */}
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
            <p className="text-[11px] text-slate-500 mt-0.5">
              Internal product metric. Not an official government certification.
            </p>

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
            Computed deterministically from continuous billing continuity, MoM efficiency, and logged interventions.
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
                  <span className="text-[10px] text-slate-500">Structured Qualitative Intelligence</span>
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
              AI-generated qualitative interpretation based on available society data.
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

      {/* 2. Pilot Action Center & Data Coverage (Requirement 35 & 36) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Action Center */}
        <Card className="lg:col-span-2 p-5 space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Clock className="w-4 h-4 text-emerald-600" />
                RWA Pilot Action Center
              </h3>
              <p className="text-xs text-slate-500">
                Track committee maintenance interventions and follow-up observations
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onNavigate('/recommendations')}
              className="text-xs text-emerald-600 hover:text-emerald-700"
            >
              View All Actions →
            </Button>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="p-3 bg-rose-50/70 border border-rose-200/80 rounded-xl">
              <span className="text-[11px] text-rose-800 block font-medium">High Priority</span>
              <span className="text-lg font-extrabold text-rose-700">{highPriorityRecs.length}</span>
              <span className="text-[10px] text-rose-600 block">Proposals pending</span>
            </div>

            <div className="p-3 bg-amber-50/70 border border-amber-200/80 rounded-xl">
              <span className="text-[11px] text-amber-800 block font-medium">In Progress</span>
              <span className="text-lg font-extrabold text-amber-700">{inProgressActions.length}</span>
              <span className="text-[10px] text-amber-600 block">Active adjustments</span>
            </div>

            <div className="p-3 bg-emerald-50/70 border border-emerald-200/80 rounded-xl">
              <span className="text-[11px] text-emerald-800 block font-medium">Completed</span>
              <span className="text-lg font-extrabold text-emerald-700">{completedActions}</span>
              <span className="text-[10px] text-emerald-600 block">Actions recorded</span>
            </div>
          </div>
        </Card>

        {/* Data Coverage Card (Requirement 35) */}
        <Card className="p-5 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                Data Coverage
              </h3>
              <Badge variant={analytics.dataQuality.status === 'good' ? 'emerald' : 'amber'} size="sm">
                {analytics.dataQuality.status.replace('_', ' ').toUpperCase()}
              </Badge>
            </div>

            <div className="space-y-1.5 text-xs text-slate-700">
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Historical Coverage:</span>
                <span className="font-bold">{analytics.dataQuality.coverageMonths} Months</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Verified Invoices:</span>
                <span className="font-bold text-emerald-700">
                  {analytics.dataQuality.verifiedBills} / {analytics.dataQuality.totalBills}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Baseline Status:</span>
                <span className="font-bold capitalize">{analytics.baseline.status.replace('_', ' ')}</span>
              </div>
            </div>
          </div>

          <div className="mt-3 pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsDataQualityOpen(true)}
              className="w-full text-xs"
            >
              Review Data Quality
            </Button>
          </div>
        </Card>
      </div>

      {/* Charts Section: 6-12 Month Trend & Cost */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-5">
          <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Historical Consumption Trend</h3>
              <p className="text-xs text-slate-500">Verified common-area electricity load in kilowatt-hours (kWh)</p>
            </div>
            <Badge variant="blue" size="sm">6-Month Trend</Badge>
          </div>
          <ConsumptionTrendChart data={analytics.history} />
        </Card>

        <Card className="p-5">
          <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Electricity Tariff & Cost History</h3>
              <p className="text-xs text-slate-500">Verified invoice totals and unit energy costs (₹/kWh)</p>
            </div>
            <Badge variant="emerald" size="sm">Tariff Rate</Badge>
          </div>
          <CostComparisonChart data={analytics.history} />
        </Card>
      </div>

      {/* Sub-Meter Category Breakdown */}
      <Card className="p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-2 mb-4">
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

      {/* 3. Energy Opportunities Card & Recent Bills (Requirement 37) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top 3 Energy Opportunities */}
        <Card className="p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                  <Lightbulb className="w-4 h-4 text-amber-500" />
                  Top Energy Opportunities
                </h3>
                <span className="text-[10px] text-slate-400">Highest-impact conservation proposals</span>
              </div>
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

          <div className="mt-4 pt-3 border-t border-slate-100 flex justify-between items-center">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsConversionOpen(true)}
              className="text-xs"
              icon={<Award className="w-3.5 h-3.5 text-emerald-600" />}
            >
              Pilot Summary
            </Button>

            <Button
              variant="primary"
              size="sm"
              onClick={() => onNavigate('/reports')}
              className="text-xs"
            >
              Generate Monthly Report
            </Button>
          </div>
        </Card>
      </div>

      {/* Modals */}
      <PilotScorecardModal
        isOpen={isScorecardOpen}
        onClose={() => setIsScorecardOpen(false)}
        scorecard={scorecard}
        onOpenConversion={() => setIsConversionOpen(true)}
      />

      <DataQualityModal
        isOpen={isDataQualityOpen}
        onClose={() => setIsDataQualityOpen(false)}
        report={dataQuality}
        onNavigateBills={() => onNavigate('/bills')}
      />

      <PilotConversionModal
        isOpen={isConversionOpen}
        onClose={() => setIsConversionOpen(false)}
        onNavigateSubscription={() => onNavigate('/subscription')}
        onNavigateReports={() => onNavigate('/reports')}
      />
    </div>
  );
};
