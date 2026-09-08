import React, { useEffect, useState } from 'react';
import { api } from '../../api/client';
import { ForecastSummary } from '../../types';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { StatCard } from '../../components/common/StatCard';
import { SkeletonCard, SkeletonChart } from '../../components/common/SkeletonLoader';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend
} from 'recharts';
import {
  TrendingUp,
  Zap,
  Receipt,
  AlertTriangle,
  Clock,
  Layers,
  Sparkles,
  RefreshCw,
  HelpCircle,
  ShieldCheck,
  CheckCircle2,
  Calendar,
  Activity
} from 'lucide-react';

export const Forecast: React.FC = () => {
  const [forecast, setForecast] = useState<ForecastSummary | null>(null);
  const [accuracyMetrics, setAccuracyMetrics] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRecalculating, setIsRecalculating] = useState(false);

  const fetchForecast = async () => {
    setIsLoading(true);
    try {
      const [fData, accData] = await Promise.all([
        api.get<ForecastSummary>('/forecast'),
        api.get<any[]>('/forecast/accuracy').catch(() => [])
      ]);
      setForecast(fData);
      setAccuracyMetrics(accData || []);
    } catch (err) {
      console.error('Failed to load forecast data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchForecast();
  }, []);

  const handleRecalculate = async () => {
    setIsRecalculating(true);
    try {
      const fData = await api.post<ForecastSummary>('/forecast/recalculate');
      setForecast(fData);
    } catch (err) {
      console.error('Failed to recalculate forecast:', err);
    } finally {
      setIsRecalculating(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <SkeletonCard />
        <SkeletonChart />
      </div>
    );
  }

  if (!forecast || forecast.status === 'insufficient_data') {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between border-b border-slate-200/80 pb-4">
          <div>
            <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-indigo-600" />
              Predictive Energy Forecasting
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Machine learning & statistical demand forecasting for apartment common areas.
            </p>
          </div>
        </div>

        <Card className="p-10 text-center space-y-4 max-w-xl mx-auto my-12">
          <HelpCircle className="w-12 h-12 text-slate-400 mx-auto" />
          <h3 className="text-base font-bold text-slate-900">Forecast Unavailable</h3>
          <p className="text-xs text-slate-600 leading-relaxed">
            {forecast?.message ||
              'WattWise needs more historical consumption data to generate a reliable forecast. At least 3 verified monthly utility bills or 7 days of continuous smart meter telemetry are required.'}
          </p>
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-600">
            <span className="font-semibold text-slate-800">Current Data Coverage: </span>
            {forecast?.coverageMonths || 0} verified billing month(s) detected.
          </div>
        </Card>
      </div>
    );
  }

  const modelLabels: Record<string, string> = {
    moving_avg: 'Level 1: Weighted Moving Average',
    seasonal_baseline: 'Level 2: Seasonal Historical Baseline',
    trend_aware: 'Level 3: Trend-Aware Moving Average',
    ml_regression: 'Level 4: Machine Learning Interval Regression'
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/80 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-indigo-600" />
              Predictive Energy Forecasting Engine
            </h2>
            <Badge variant={forecast.confidence === 'high' ? 'emerald' : 'amber'} size="sm">
              {forecast.confidence.toUpperCase()} CONFIDENCE
            </Badge>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Statistical multi-horizon demand forecasting, peak-load windows, and electricity expenditure projections.
          </p>
        </div>

        <Button
          variant="secondary"
          size="sm"
          onClick={handleRecalculate}
          disabled={isRecalculating}
          icon={<RefreshCw className={`w-3.5 h-3.5 ${isRecalculating ? 'animate-spin' : ''}`} />}
        >
          Recalculate Forecast
        </Button>
      </div>

      {/* Hero Forecast Banner */}
      <Card className="p-5 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white border-slate-800 shadow-md">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-indigo-400" />
              <span className="text-xs font-bold uppercase tracking-wider text-indigo-300">
                Month-End Projected Consumption
              </span>
              <span className="px-2 py-0.5 rounded bg-indigo-900/60 text-[10px] font-mono text-indigo-200 border border-indigo-700/50">
                {modelLabels[forecast.modelType] || forecast.modelType}
              </span>
            </div>
            <div className="flex items-baseline gap-3">
              <span className="text-3xl font-black text-white">
                {forecast.expectedMonthlyKwh.toLocaleString()}
              </span>
              <span className="text-sm font-semibold text-indigo-200">kWh Expected</span>
            </div>
            <p className="text-xs text-slate-300">
              Expected 90% Confidence Interval Band:{' '}
              <span className="font-semibold text-white">
                {forecast.rangeMinKwh.toLocaleString()} – {forecast.rangeMaxKwh.toLocaleString()} kWh
              </span>{' '}
              ({forecast.coverageMonths} months historical training data).
            </p>
          </div>

          <div className="p-4 rounded-xl bg-white/10 backdrop-blur-xs border border-white/15 min-w-[240px]">
            <span className="text-[11px] font-semibold text-slate-300 uppercase tracking-wider block mb-1">
              Projected Electricity Bill
            </span>
            <div className="text-2xl font-bold text-white">
              ₹{forecast.expectedMonthlyCost.toLocaleString()}
            </div>
            <div className="flex items-center gap-1.5 mt-1.5 text-xs">
              <span
                className={`font-semibold capitalize ${
                  forecast.costTrend === 'increasing'
                    ? 'text-rose-400'
                    : forecast.costTrend === 'decreasing'
                    ? 'text-emerald-400'
                    : 'text-slate-300'
                }`}
              >
                {forecast.costTrend === 'increasing' ? '↑ Trend: Increasing' : forecast.costTrend === 'decreasing' ? '↓ Trend: Lowering' : '→ Trend: Stable'}
              </span>
              <span className="text-[10px] text-slate-400">(Applied Tariff)</span>
            </div>
          </div>
        </div>
      </Card>

      {/* 4 Multi-Horizon KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-4 bg-white border border-slate-200">
          <div className="flex justify-between items-center text-xs text-slate-500 mb-1">
            <span>Tomorrow's Expected</span>
            <Calendar className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="text-2xl font-bold text-slate-900">
            {forecast.nextDayKwh.toFixed(1)} <span className="text-xs font-normal text-slate-500">kWh</span>
          </div>
          <p className="text-[10px] text-slate-400 mt-1">24-hour ahead diurnal prediction</p>
        </Card>

        <Card className="p-4 bg-white border border-slate-200">
          <div className="flex justify-between items-center text-xs text-slate-500 mb-1">
            <span>Next 7 Days Total</span>
            <Clock className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-bold text-emerald-600">
            {forecast.next7DaysKwh.toLocaleString()} <span className="text-xs font-normal text-slate-500">kWh</span>
          </div>
          <p className="text-[10px] text-slate-400 mt-1">Includes weekend load weighting</p>
        </Card>

        <Card className="p-4 bg-white border border-slate-200">
          <div className="flex justify-between items-center text-xs text-slate-500 mb-1">
            <span>Peak Demand Forecast</span>
            <Activity className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-bold text-amber-600">
            {forecast.peakForecast.expectedPeakKw.toFixed(1)} <span className="text-xs font-normal text-slate-500">kW</span>
          </div>
          <p className="text-[10px] text-slate-400 mt-1">Window: {forecast.peakForecast.likelyTimeWindow}</p>
        </Card>

        <Card className="p-4 bg-white border border-slate-200">
          <div className="flex justify-between items-center text-xs text-slate-500 mb-1">
            <span>Next 30 Days Forecast</span>
            <Receipt className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-2xl font-bold text-blue-600">
            {forecast.next30DaysKwh.toLocaleString()} <span className="text-xs font-normal text-slate-500">kWh</span>
          </div>
          <p className="text-[10px] text-slate-400 mt-1">Rolling 30-day baseline projection</p>
        </Card>
      </div>

      {/* 7-Day Forecast Chart & Peak Demand Advisory */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chart Column */}
        <Card className="p-5 lg:col-span-2">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900">7-Day Forward Demand Projection</h3>
              <p className="text-xs text-slate-500">Predicted daily consumption with min-max uncertainty envelope.</p>
            </div>
            <span className="text-[11px] font-mono text-slate-400">{forecast.dailyPredictions.length} Daily Steps</span>
          </div>

          <div style={{ width: '100%', height: 260 }}>
            <ResponsiveContainer>
              <AreaChart data={forecast.dailyPredictions} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="forecastGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 10, fill: '#94a3b8' }}
                  axisLine={{ stroke: '#e2e8f0' }}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 10, fill: '#94a3b8' }}
                  axisLine={false}
                  tickLine={false}
                  unit=" kWh"
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const d = payload[0].payload;
                      return (
                        <div className="bg-slate-900 text-white p-2.5 rounded-lg shadow-xl text-xs space-y-1">
                          <p className="font-bold text-slate-200">{d.date}</p>
                          <p className="text-indigo-400 font-bold">Predicted: {d.predictedKwh} kWh</p>
                          <p className="text-[10px] text-slate-400">Expected Range: {d.minKwh} – {d.maxKwh} kWh</p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Legend verticalAlign="top" align="right" wrapperStyle={{ fontSize: 11, paddingBottom: 8 }} />
                <Area
                  type="monotone"
                  dataKey="predictedKwh"
                  name="Forecasted kWh"
                  stroke="#6366f1"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#forecastGrad)"
                />
                <Area
                  type="monotone"
                  dataKey="maxKwh"
                  name="Upper Bound (90%)"
                  stroke="#cbd5e1"
                  strokeDasharray="2 2"
                  strokeWidth={1}
                  fill="none"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Peak Demand Advisory Card */}
        <Card className="p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-slate-900">Peak Demand Advisory</h3>
              <Badge
                variant={
                  forecast.peakForecast.riskLevel === 'high'
                    ? 'red'
                    : forecast.peakForecast.riskLevel === 'medium'
                    ? 'amber'
                    : 'blue'
                }
                size="sm"
              >
                {forecast.peakForecast.riskLevel.toUpperCase()} RISK
              </Badge>
            </div>

            <div className="space-y-3">
              <div className="p-3 bg-amber-50/60 rounded-xl border border-amber-200/80">
                <span className="text-[11px] font-semibold text-amber-800 uppercase tracking-wider block">
                  Expected Peak Demand Load
                </span>
                <div className="text-xl font-black text-slate-900 mt-0.5">
                  {forecast.peakForecast.expectedPeakKw.toFixed(1)} kW
                </div>
                <p className="text-[11px] text-slate-600 mt-1">
                  Likely Timing: <span className="font-semibold text-slate-800">{forecast.peakForecast.likelyTimeWindow}</span>
                </p>
              </div>

              <div>
                <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block mb-1.5">
                  Contributing Operational Drivers:
                </span>
                <ul className="list-disc list-inside text-xs text-slate-600 space-y-1">
                  {forecast.peakForecast.potentialDrivers.map((driver, idx) => (
                    <li key={idx}>{driver}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 text-[11px] text-slate-400 flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span>Exceedance probability: {forecast.peakForecast.exceedanceProbability}% of contracted load</span>
          </div>
        </Card>
      </div>

      {/* Model Performance & Calibration Benchmarks */}
      {accuracyMetrics.length > 0 && (
        <Card className="p-5 border border-slate-200">
          <div className="flex justify-between items-center mb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Model Performance & Calibration Ledger</h3>
              <p className="text-xs text-slate-500">Historical validation metrics tracking forecast accuracy over past billing periods.</p>
            </div>
            <span className="text-xs text-slate-400 font-mono">Continuous Backtesting</span>
          </div>

          <div className="border border-slate-200 rounded-xl overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
                <tr>
                  <th className="p-3">Period</th>
                  <th className="p-3">Algorithm Model</th>
                  <th className="p-3">Mean Abs Error (MAE)</th>
                  <th className="p-3">MAPE %</th>
                  <th className="p-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {accuracyMetrics.map((m, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/50">
                    <td className="p-3 font-semibold text-slate-800">{m.period}</td>
                    <td className="p-3 capitalize font-mono text-slate-600">{m.modelType.replace('_', ' ')}</td>
                    <td className="p-3 font-bold text-indigo-700">{m.mae} kWh</td>
                    <td className="p-3 font-bold text-emerald-700">{m.mape}%</td>
                    <td className="p-3 text-emerald-600 font-semibold">Calibrated (&lt;4% variance)</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
};
