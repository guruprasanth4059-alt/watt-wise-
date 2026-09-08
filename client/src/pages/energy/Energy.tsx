import React, { useEffect, useState } from 'react';
import { api } from '../../api/client';
import { AnalyticsSummary, CategoryBreakdown, Meter, RealTimeSummary, MeterMeasurement } from '../../types';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { StatCard } from '../../components/common/StatCard';
import { CategoryBreakdownChart } from '../../components/charts/CategoryBreakdownChart';
import { ConsumptionTrendChart } from '../../components/charts/ConsumptionTrendChart';
import { IntervalConsumptionChart } from '../../components/charts/IntervalConsumptionChart';
import { DiurnalLoadProfileChart } from '../../components/charts/DiurnalLoadProfileChart';
import { SkeletonCard, SkeletonChart } from '../../components/common/SkeletonLoader';
import {
  Zap,
  Droplets,
  Lightbulb,
  Building,
  Gauge,
  PlusCircle,
  Receipt,
  Radio,
  Clock,
  AlertTriangle,
  TrendingUp,
  Sun,
  Moon,
  CloudSun,
  Sunset,
  ArrowRight,
  ShieldCheck,
  RefreshCw
} from 'lucide-react';

interface EnergyProps {
  onNavigate: (path: string) => void;
}

export const Energy: React.FC<EnergyProps> = ({ onNavigate }) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'realtime' | 'consumption' | 'common_areas' | 'meters'>('overview');
  const [analytics, setAnalytics] = useState<AnalyticsSummary | null>(null);
  const [breakdown, setBreakdown] = useState<CategoryBreakdown | null>(null);
  const [meters, setMeters] = useState<Meter[]>([]);
  const [realtime, setRealtime] = useState<RealTimeSummary | null>(null);
  const [reconciliation, setReconciliation] = useState<any | null>(null);
  const [measurements, setMeasurements] = useState<MeterMeasurement[]>([]);
  const [selectedMeterId, setSelectedMeterId] = useState<string>('');
  const [timeframe, setTimeframe] = useState<'24h' | '7d' | '30d'>('24h');
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshingTelemetry, setIsRefreshingTelemetry] = useState(false);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [analyticsData, breakdownData, metersData, realtimeData, reconData] = await Promise.all([
        api.get<AnalyticsSummary>('/analytics').catch(() => null),
        api.get<CategoryBreakdown>('/analytics/category-breakdown').catch(() => null),
        api.get<Meter[]>('/meters').catch(() => []),
        api.get<RealTimeSummary>('/analytics/realtime').catch(() => null),
        api.get<any>('/analytics/reconciliation').catch(() => null)
      ]);
      setAnalytics(analyticsData);
      setBreakdown(breakdownData);
      setMeters(metersData || []);
      setRealtime(realtimeData);
      setReconciliation(reconData);

      // Find primary/main meter or first connected meter for telemetry
      const primaryMeter = (metersData || []).find((m: Meter) => m.is_main_meter || m.connection_status === 'connected') || metersData?.[0];
      if (primaryMeter) {
        setSelectedMeterId(primaryMeter.id);
        fetchIntervals(primaryMeter.id, timeframe);
      }
    } catch (err) {
      console.error('Failed to load energy module data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchIntervals = async (meterId: string, tf: '24h' | '7d' | '30d') => {
    if (!meterId) return;
    setIsRefreshingTelemetry(true);
    try {
      const res = await api.get<{ measurements: MeterMeasurement[] }>(`/meters/${meterId}/measurements?timeframe=${tf}`);
      setMeasurements(res?.measurements || []);
    } catch (err) {
      console.error('Failed to fetch interval measurements:', err);
    } finally {
      setIsRefreshingTelemetry(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleTimeframeChange = (tf: '24h' | '7d' | '30d') => {
    setTimeframe(tf);
    if (selectedMeterId) {
      fetchIntervals(selectedMeterId, tf);
    }
  };

  const handleMeterChange = (meterId: string) => {
    setSelectedMeterId(meterId);
    fetchIntervals(meterId, timeframe);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <SkeletonCard />
        <SkeletonChart />
      </div>
    );
  }

  const current = analytics?.currentMonth;
  const prev = analytics?.previousMonth;
  const hasSmartMeters = meters.some((m) => m.connection_status === 'connected');

  return (
    <div className="space-y-6">
      {/* Header & Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/80 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">Energy Intelligence Module</h2>
            {hasSmartMeters && (
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Live Ingestion Active
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time interval telemetry, historical Discom billing, and automated anomaly intelligence.
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex bg-slate-100 p-1 rounded-xl text-xs font-semibold overflow-x-auto">
          {[
            { id: 'overview', label: 'Overview' },
            { id: 'realtime', label: 'Real-Time Telemetry' },
            { id: 'consumption', label: 'Billing Ledger' },
            { id: 'common_areas', label: 'Common Areas' },
            { id: 'meters', label: 'Meters' }
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id as any)}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer whitespace-nowrap ${
                activeTab === t.id
                  ? 'bg-white text-slate-900 shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* NEAR REAL-TIME HERO BANNER */}
      {realtime && (
        <Card className="p-4 bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-white border-slate-800 shadow-md">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2.5 flex-wrap">
                <span className="flex h-2.5 w-2.5 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
                </span>
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                  Smart Meter Cadence: 15-Minute Intervals
                </span>
                <span className="px-2 py-0.5 rounded bg-slate-800 text-[10px] font-mono text-amber-300 border border-amber-500/30">
                  DEMO / SIMULATED DATA
                </span>
              </div>
              <p className="text-xs text-slate-300">
                Main electrical bus telemetry synchronized. Latency:{' '}
                <span className="text-white font-semibold">{realtime.latencyMinutes} mins</span>
                {realtime.lastSyncedAt && ` (Last packet: ${new Date(realtime.lastSyncedAt).toLocaleTimeString()})`}
              </p>
            </div>

            <div className="flex items-center gap-3">
              {realtime.activeAnomaliesCount > 0 && (
                <button
                  type="button"
                  onClick={() => onNavigate('/insights/anomalies')}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 text-xs font-semibold cursor-pointer transition-all"
                >
                  <AlertTriangle className="w-3.5 h-3.5 text-rose-400 animate-bounce" />
                  <span>{realtime.activeAnomaliesCount} Anomaly Event Pending</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              )}
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setActiveTab('realtime')}
                className="bg-white/10 hover:bg-white/20 text-white border-white/20 text-xs"
              >
                Inspect Telemetry
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* TAB 1: OVERVIEW */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Live Quick KPI Snapshot if Smart Meter Connected */}
          {realtime && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card className="p-4 border-l-4 border-l-indigo-500 bg-white">
                <div className="flex justify-between items-start">
                  <span className="text-xs font-semibold text-slate-500">Current Load (kW)</span>
                  <Radio className="w-4 h-4 text-indigo-500 animate-pulse" />
                </div>
                <div className="mt-2 text-2xl font-bold text-slate-900">
                  {realtime.currentLoadKw.toFixed(1)} <span className="text-xs font-normal text-slate-500">kW</span>
                </div>
                <p className="text-[11px] text-slate-500 mt-1">Real-time instantaneous active power</p>
              </Card>

              <Card className="p-4 border-l-4 border-l-emerald-500 bg-white">
                <div className="flex justify-between items-start">
                  <span className="text-xs font-semibold text-slate-500">Today's Energy</span>
                  <Zap className="w-4 h-4 text-emerald-500" />
                </div>
                <div className="mt-2 text-2xl font-bold text-slate-900">
                  {realtime.todayKwh.toFixed(1)} <span className="text-xs font-normal text-slate-500">kWh</span>
                </div>
                <p className="text-[11px] text-slate-500 mt-1">Sum of today's 15m intervals</p>
              </Card>

              <Card className="p-4 border-l-4 border-l-blue-500 bg-white">
                <div className="flex justify-between items-start">
                  <span className="text-xs font-semibold text-slate-500">Month-to-Date (MTD)</span>
                  <Gauge className="w-4 h-4 text-blue-500" />
                </div>
                <div className="mt-2 text-2xl font-bold text-slate-900">
                  {realtime.monthToDateKwh.toFixed(0)} <span className="text-xs font-normal text-slate-500">kWh</span>
                </div>
                <p className="text-[11px] text-slate-500 mt-1">Smart meter running tally</p>
              </Card>

              <Card className="p-4 border-l-4 border-l-amber-500 bg-white">
                <div className="flex justify-between items-start">
                  <span className="text-xs font-semibold text-slate-500">Est. Running Cost</span>
                  <Receipt className="w-4 h-4 text-amber-500" />
                </div>
                <div className="mt-2 text-2xl font-bold text-slate-900">
                  ₹{realtime.estimatedCostMonth.toLocaleString()}
                </div>
                <div className="flex items-center gap-1 mt-1">
                  <span className="text-[9px] font-bold uppercase tracking-wider text-amber-700 bg-amber-50 px-1 py-0.5 rounded border border-amber-200">
                    ESTIMATED (Tariff × kWh)
                  </span>
                </div>
              </Card>
            </div>
          )}

          {/* Historical Billing Ratios (Section 15) */}
          {current && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatCard
                title="Billed Monthly Total"
                value={current.consumptionKwh.toLocaleString()}
                unit="kWh"
                subtitle={`Latest Bill: ${current.period}`}
              />
              <StatCard
                title="Previous Bill"
                value={prev ? prev.consumptionKwh.toLocaleString() : 'N/A'}
                unit={prev ? 'kWh' : ''}
                subtitle={prev ? `Period: ${prev.period}` : 'First cycle'}
              />
              <StatCard
                title="Effective Discom Tariff"
                value={`₹${analytics?.costPerKwh ?? 0}`}
                unit="/ kWh"
                subtitle="All utility surcharges included"
              />
              <StatCard
                title="Per-Apartment Burden"
                value={`₹${analytics?.costPerApartment ?? 0}`}
                unit="/ mo"
                subtitle={`${analytics?.consumptionPerApartment ?? 0} kWh / unit`}
              />
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="p-5">
              <div className="flex justify-between items-center mb-2">
                <h3 className="text-sm font-bold text-slate-900">Historical Discom Billing Trend (kWh)</h3>
                <span className="text-xs text-slate-400">Monthly Utility Invoices</span>
              </div>
              <ConsumptionTrendChart data={analytics?.history || []} height={240} />
            </Card>

            <Card className="p-5">
              <div className="flex justify-between items-center mb-2">
                <h3 className="text-sm font-bold text-slate-900">Common Area Submeter Distribution</h3>
                <span className="text-xs text-slate-400">Sub-meter share</span>
              </div>
              {breakdown && (
                <CategoryBreakdownChart
                  breakdown={breakdown}
                  onAddSubmeter={() => onNavigate('/meters')}
                />
              )}
            </Card>
          </div>

          {/* Data Reconciliation Alert Card */}
          {reconciliation && reconciliation.hasComparison && (
            <Card className="p-5 border border-slate-200 bg-slate-50/50">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-indigo-600" />
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                      Discom Bill vs Smart Meter Telemetry Reconciliation
                    </h4>
                  </div>
                  <p className="text-xs text-slate-600">
                    Smart meters logged{' '}
                    <span className="font-semibold text-slate-900">{reconciliation.smartMeterTotalKwh.toLocaleString()} kWh</span>{' '}
                    vs. official Discom invoices recording{' '}
                    <span className="font-semibold text-slate-900">{reconciliation.discomBillTotalKwh.toLocaleString()} kWh</span>.
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <div className="text-xs font-bold text-slate-900">
                      Variance: {reconciliation.differencePercent}%
                    </div>
                    <span
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                        reconciliation.reconciliationStatus === 'matched'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {reconciliation.reconciliationStatus === 'matched'
                        ? 'Calibrated (±3% tolerance)'
                        : 'Review Tolerance'}
                    </span>
                  </div>
                </div>
              </div>
            </Card>
          )}
        </div>
      )}

      {/* TAB 2: REAL-TIME TELEMETRY */}
      {activeTab === 'realtime' && (
        <div className="space-y-6">
          {/* Meter selector and timeframe bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200 shadow-xs">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-700">Source Meter:</span>
              <select
                value={selectedMeterId}
                onChange={(e) => handleMeterChange(e.target.value)}
                className="text-xs border border-slate-300 rounded-lg px-2.5 py-1.5 bg-slate-50 font-medium text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
              >
                {meters.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name} {m.is_main_meter ? '(Main Panel)' : `(${m.type})`} - [{m.connection_status}]
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-700">Timeframe:</span>
              <div className="flex bg-slate-100 p-0.5 rounded-lg text-xs font-semibold">
                {(['24h', '7d', '30d'] as const).map((tf) => (
                  <button
                    key={tf}
                    type="button"
                    onClick={() => handleTimeframeChange(tf)}
                    className={`px-3 py-1 rounded-md transition-all cursor-pointer ${
                      timeframe === tf ? 'bg-white text-slate-900 shadow-xs font-bold' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {tf === '24h' ? 'Last 24 Hours' : tf === '7d' ? 'Past 7 Days' : 'Past 30 Days'}
                  </button>
                ))}
              </div>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => selectedMeterId && fetchIntervals(selectedMeterId, timeframe)}
                disabled={isRefreshingTelemetry}
                icon={<RefreshCw className={`w-3.5 h-3.5 ${isRefreshingTelemetry ? 'animate-spin' : ''}`} />}
              >
                Refresh
              </Button>
            </div>
          </div>

          {/* 4 Live Telemetry KPI Cards */}
          {realtime && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card className="p-4 bg-white border border-slate-200">
                <div className="flex justify-between items-center text-xs text-slate-500 mb-1">
                  <span>Current Demand</span>
                  <Radio className="w-4 h-4 text-indigo-500" />
                </div>
                <div className="text-2xl font-bold text-slate-900">
                  {realtime.currentLoadKw.toFixed(2)} <span className="text-xs font-normal text-slate-500">kW</span>
                </div>
                <p className="text-[10px] text-slate-400 mt-1">Updated every 15 mins</p>
              </Card>

              <Card className="p-4 bg-white border border-slate-200">
                <div className="flex justify-between items-center text-xs text-slate-500 mb-1">
                  <span>Today's Telemetry</span>
                  <Zap className="w-4 h-4 text-emerald-500" />
                </div>
                <div className="text-2xl font-bold text-emerald-600">
                  {realtime.todayKwh.toFixed(2)} <span className="text-xs font-normal text-slate-500">kWh</span>
                </div>
                <p className="text-[10px] text-slate-400 mt-1">Est. cost today: ₹{realtime.estimatedCostToday.toFixed(0)}</p>
              </Card>

              <Card className="p-4 bg-white border border-slate-200">
                <div className="flex justify-between items-center text-xs text-slate-500 mb-1">
                  <span>Month-to-Date (MTD)</span>
                  <Gauge className="w-4 h-4 text-blue-500" />
                </div>
                <div className="text-2xl font-bold text-blue-600">
                  {realtime.monthToDateKwh.toFixed(1)} <span className="text-xs font-normal text-slate-500">kWh</span>
                </div>
                <p className="text-[10px] text-slate-400 mt-1">Meter running accumulation</p>
              </Card>

              <Card className="p-4 bg-white border border-slate-200">
                <div className="flex justify-between items-center text-xs text-slate-500 mb-1">
                  <span>Estimated Running Cost</span>
                  <Receipt className="w-4 h-4 text-amber-500" />
                </div>
                <div className="text-2xl font-bold text-slate-900">
                  ₹{realtime.estimatedCostMonth.toLocaleString()}
                </div>
                <p className="text-[9px] text-amber-700 bg-amber-50 p-1 rounded font-semibold mt-1">
                  *ESTIMATED (Tariff applied to meter kWh) - NOT AN OFFICIAL DISCOM BILL
                </p>
              </Card>
            </div>
          )}

          {/* 15-Minute Interval Chart */}
          <Card className="p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900">15-Minute Interval Consumption Telemetry</h3>
                <p className="text-xs text-slate-500">
                  High-resolution continuous data ingested directly from smart meter pulse registers.
                </p>
              </div>
            </div>
            <IntervalConsumptionChart measurements={measurements} height={300} />
          </Card>

          {/* 2-Column: Diurnal Load Profile & Time of Day Distribution */}
          {realtime && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Diurnal Curve */}
              <Card className="p-5">
                <div className="flex justify-between items-center mb-3">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">24-Hour Diurnal Load Profile</h3>
                    <p className="text-xs text-slate-500">Average load curve showing morning and evening peak hours.</p>
                  </div>
                </div>
                <DiurnalLoadProfileChart loadProfile={realtime.loadProfile} height={240} />
              </Card>

              {/* Time of Day Distribution */}
              <Card className="p-5">
                <div className="flex justify-between items-center mb-3">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">Time-of-Day Energy Allocation</h3>
                    <p className="text-xs text-slate-500">Breakdown of day vs night operational demand.</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-2">
                  <div className="p-3 rounded-xl border border-amber-200 bg-amber-50/50">
                    <div className="flex items-center gap-2 text-amber-700 font-semibold text-xs mb-1">
                      <Sun className="w-4 h-4" />
                      <span>Morning (06:00 - 12:00)</span>
                    </div>
                    <div className="text-xl font-bold text-slate-900">
                      {realtime.timeOfDay.morning.toFixed(1)} <span className="text-xs font-normal text-slate-500">kWh</span>
                    </div>
                    <p className="text-[10px] text-slate-500 mt-1">Water pumping & common-area prep</p>
                  </div>

                  <div className="p-3 rounded-xl border border-sky-200 bg-sky-50/50">
                    <div className="flex items-center gap-2 text-sky-700 font-semibold text-xs mb-1">
                      <CloudSun className="w-4 h-4" />
                      <span>Afternoon (12:00 - 18:00)</span>
                    </div>
                    <div className="text-xl font-bold text-slate-900">
                      {realtime.timeOfDay.afternoon.toFixed(1)} <span className="text-xs font-normal text-slate-500">kWh</span>
                    </div>
                    <p className="text-[10px] text-slate-500 mt-1">Elevator & clubhouse HVAC baseline</p>
                  </div>

                  <div className="p-3 rounded-xl border border-orange-200 bg-orange-50/50">
                    <div className="flex items-center gap-2 text-orange-700 font-semibold text-xs mb-1">
                      <Sunset className="w-4 h-4" />
                      <span>Evening (18:00 - 22:00)</span>
                    </div>
                    <div className="text-xl font-bold text-slate-900">
                      {realtime.timeOfDay.evening.toFixed(1)} <span className="text-xs font-normal text-slate-500">kWh</span>
                    </div>
                    <p className="text-[10px] text-slate-500 mt-1">Peak corridor, perimeter & facade lighting</p>
                  </div>

                  <div className="p-3 rounded-xl border border-indigo-200 bg-indigo-50/50">
                    <div className="flex items-center gap-2 text-indigo-700 font-semibold text-xs mb-1">
                      <Moon className="w-4 h-4" />
                      <span>Night (22:00 - 06:00)</span>
                    </div>
                    <div className="text-xl font-bold text-slate-900">
                      {realtime.timeOfDay.night.toFixed(1)} <span className="text-xs font-normal text-slate-500">kWh</span>
                    </div>
                    <p className="text-[10px] text-slate-500 mt-1">Overnight baseload (target: minimal)</p>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                  <span>Deterministic Anomaly Engine: Active</span>
                  <button
                    type="button"
                    onClick={() => onNavigate('/insights/anomalies')}
                    className="text-indigo-600 font-semibold hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    View Anomaly Alert Center <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              </Card>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: CONSUMPTION */}
      {activeTab === 'consumption' && (
        <div className="space-y-6">
          <Card className="p-5">
            <h3 className="text-sm font-bold text-slate-900 mb-1">Historical Billing Ledger</h3>
            <p className="text-xs text-slate-500 mb-4">Official Discom electricity invoices and verified payments.</p>
            <div className="border border-slate-200 rounded-xl overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
                  <tr>
                    <th className="p-3">Period</th>
                    <th className="p-3">Units (kWh)</th>
                    <th className="p-3">Total Invoice (₹)</th>
                    <th className="p-3">Effective Cost / kWh</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {analytics?.history.map((row) => (
                    <tr key={row.period} className="hover:bg-slate-50/50">
                      <td className="p-3 font-semibold text-slate-800">{row.period}</td>
                      <td className="p-3 font-bold text-emerald-700">{row.consumptionKwh.toLocaleString()} kWh</td>
                      <td className="p-3 font-semibold text-slate-900">₹{row.billAmount.toLocaleString()}</td>
                      <td className="p-3 text-slate-600">₹{row.costPerKwh} / kWh</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* TAB 4: COMMON AREAS */}
      {activeTab === 'common_areas' && (
        <div className="space-y-6">
          <Card className="p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Sub-Metered Facility Analysis</h3>
                <p className="text-xs text-slate-500">
                  Identifies which common-area plant equipment drives peak consumption.
                </p>
              </div>
            </div>
            {breakdown && (
              <CategoryBreakdownChart
                breakdown={breakdown}
                onAddSubmeter={() => onNavigate('/meters')}
              />
            )}
          </Card>
        </div>
      )}

      {/* TAB 5: METERS */}
      {activeTab === 'meters' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Active Society Meters ({meters.length})</h3>
              <p className="text-xs text-slate-500">Configured main meters and sub-meter connections.</p>
            </div>
            <Button
              variant="primary"
              size="sm"
              onClick={() => onNavigate('/meters')}
              icon={<PlusCircle className="w-4 h-4" />}
            >
              Manage & Connect Meters
            </Button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {meters.map((m) => (
              <Card key={m.id} className="p-4 space-y-2">
                <div className="flex items-start justify-between">
                  <span className="text-xs font-bold text-slate-900">{m.name}</span>
                  <Badge variant={m.type === 'pump' ? 'blue' : m.type === 'lighting' ? 'amber' : 'emerald'} size="sm">
                    {m.type.replace('_', ' ')}
                  </Badge>
                </div>
                <p className="text-[11px] font-mono text-slate-500">Meter #: {m.meter_number}</p>
                <div className="flex items-center justify-between text-[11px] pt-1">
                  <span className="text-slate-500">Source:</span>
                  <span className="font-semibold text-slate-700 capitalize">
                    {m.data_source === 'smart_meter' ? 'Smart Meter API' : 'Manual Entry'}
                  </span>
                </div>
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-slate-500">Status:</span>
                  <span
                    className={`font-semibold capitalize ${
                      m.connection_status === 'connected'
                        ? 'text-emerald-600'
                        : m.connection_status === 'syncing'
                        ? 'text-blue-600'
                        : 'text-slate-500'
                    }`}
                  >
                    {m.connection_status || 'Disconnected'}
                  </span>
                </div>
                <div className="text-[11px] text-slate-600 pt-2 border-t border-slate-100 flex justify-between">
                  <span>Location: {m.building || 'Main Campus'}</span>
                  <span className="text-emerald-600 font-semibold">{m.is_active ? 'Active' : 'Inactive'}</span>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
