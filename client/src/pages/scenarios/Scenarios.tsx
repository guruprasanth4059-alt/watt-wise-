import React, { useState, useEffect } from 'react';
import { api } from '../../api/client';
import { ScenarioSimulation } from '../../types';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { StatCard } from '../../components/common/StatCard';
import {
  SlidersHorizontal,
  Zap,
  IndianRupee,
  Calendar,
  Clock,
  SunMedium,
  Lightbulb,
  CheckCircle2,
  HelpCircle,
  Play,
  RotateCcw,
  Sparkles,
  History,
  ShieldCheck,
  TrendingDown
} from 'lucide-react';

export const Scenarios: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'pump_schedule' | 'led_retrofit' | 'solar_offset' | 'tariff_shift'>('pump_schedule');
  const [history, setHistory] = useState<ScenarioSimulation[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [isSimulating, setIsSimulating] = useState(false);
  const [activeResult, setActiveResult] = useState<ScenarioSimulation | null>(null);

  // Form states per tab
  // 1. Pump Scheduling
  const [pumpKw, setPumpKw] = useState(11.2); // 15 HP motor ~ 11.2 kW
  const [pumpHoursReduced, setPumpHoursReduced] = useState(1.5);
  const [pumpCapex, setPumpCapex] = useState(18000); // automation sensor/timer

  // 2. LED Retrofit
  const [fixtureCount, setFixtureCount] = useState(120);
  const [oldWattage, setOldWattage] = useState(36);
  const [newWattage, setNewWattage] = useState(18);
  const [fixtureHours, setFixtureHours] = useState(14);
  const [costPerFixture, setCostPerFixture] = useState(450);

  // 3. Rooftop Solar
  const [solarCapacityKwp, setSolarCapacityKwp] = useState(25);
  const [solarCapexPerKwp, setSolarCapexPerKwp] = useState(48000);
  const [solarDailyYield, setSolarDailyYield] = useState(4.2);

  // 4. Tariff Shifting
  const [shiftKwh, setShiftKwh] = useState(1800);
  const [surchargeRate, setSurchargeRate] = useState(2.50);

  const fetchHistory = async () => {
    setIsLoadingHistory(true);
    try {
      const data = await api.get<ScenarioSimulation[]>('/scenarios/history');
      setHistory(data || []);
    } catch (err) {
      console.error('Failed to load scenario history:', err);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const handleSimulate = async () => {
    setIsSimulating(true);
    try {
      let payload: any = {
        scenarioType: activeTab,
      };

      if (activeTab === 'pump_schedule') {
        payload.title = `Water Pump Scheduling (${pumpHoursReduced}h reduction)`;
        payload.parameters = {
          pumpKwRating: pumpKw,
          hoursReducedPerDay: pumpHoursReduced,
          capitalCostInr: pumpCapex
        };
      } else if (activeTab === 'led_retrofit') {
        payload.title = `Common Area LED Retrofit (${fixtureCount} fixtures)`;
        payload.parameters = {
          fixtureCount,
          oldWattage,
          newWattage,
          operatingHoursPerDay: fixtureHours,
          fixtureCostEach: costPerFixture
        };
      } else if (activeTab === 'solar_offset') {
        payload.title = `Rooftop Solar PV Installation (${solarCapacityKwp} kWp)`;
        payload.parameters = {
          systemCapacityKwp: solarCapacityKwp,
          capexPerKwp: solarCapexPerKwp,
          solarDailyGenerationRatio: solarDailyYield
        };
      } else if (activeTab === 'tariff_shift') {
        payload.title = `Peak-to-Off-Peak Tariff Shift (${shiftKwh} kWh)`;
        payload.parameters = {
          shiftedKwhMonthly: shiftKwh,
          peakSurchargePerKwh: surchargeRate
        };
      }

      const result = await api.post<ScenarioSimulation>('/scenarios/simulate', payload);
      setActiveResult(result);
      // Refresh history list
      fetchHistory();
    } catch (err) {
      console.error('Simulation execution failed:', err);
    } finally {
      setIsSimulating(false);
    }
  };

  // Run initial simulation on tab change if none present
  useEffect(() => {
    handleSimulate();
  }, [activeTab]);

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <SlidersHorizontal className="h-6 w-6 text-brand-500" />
              What-If Scenario Simulator
            </h1>
            <Badge variant="blue">Phase 4 Predictive</Badge>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Simulate operational adjustments, retrofits, and solar offsets with deterministic cost projections before investing capital.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="primary"
            onClick={handleSimulate}
            disabled={isSimulating}
            className="flex items-center gap-2"
          >
            <Play className={`h-4 w-4 ${isSimulating ? 'animate-spin' : ''}`} />
            {isSimulating ? 'Computing...' : 'Run Simulation'}
          </Button>
        </div>
      </div>

      {/* Strict Disclaimer Banner */}
      <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl flex items-start gap-3">
        <HelpCircle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
        <div className="text-xs text-amber-800 dark:text-amber-300">
          <span className="font-semibold uppercase tracking-wider block mb-0.5">
            Simulation / Estimate — Not Guaranteed
          </span>
          Projections are deterministic estimates based on active Discom tariff slabs and equipment nameplate ratings.
          WattWise provides decision-support calculations and does not actuate or control physical switchgear.
        </div>
      </div>

      {/* Scenario Type Selection Tabs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <button
          onClick={() => setActiveTab('pump_schedule')}
          className={`p-4 rounded-xl border text-left transition-all ${
            activeTab === 'pump_schedule'
              ? 'bg-brand-500/10 border-brand-500 text-brand-600 dark:text-brand-400 shadow-sm'
              : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:border-gray-300'
          }`}
        >
          <Clock className="h-5 w-5 mb-2 text-brand-500" />
          <div className="font-semibold text-sm">Pump Automation</div>
          <div className="text-xs opacity-75 mt-0.5">Optimizing hydro-pneumatic & overhead runtimes</div>
        </button>

        <button
          onClick={() => setActiveTab('led_retrofit')}
          className={`p-4 rounded-xl border text-left transition-all ${
            activeTab === 'led_retrofit'
              ? 'bg-amber-500/10 border-amber-500 text-amber-600 dark:text-amber-400 shadow-sm'
              : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:border-gray-300'
          }`}
        >
          <Lightbulb className="h-5 w-5 mb-2 text-amber-500" />
          <div className="font-semibold text-sm">LED Retrofit</div>
          <div className="text-xs opacity-75 mt-0.5">Basement & common area fixtures</div>
        </button>

        <button
          onClick={() => setActiveTab('solar_offset')}
          className={`p-4 rounded-xl border text-left transition-all ${
            activeTab === 'solar_offset'
              ? 'bg-emerald-500/10 border-emerald-500 text-emerald-600 dark:text-emerald-400 shadow-sm'
              : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:border-gray-300'
          }`}
        >
          <SunMedium className="h-5 w-5 mb-2 text-emerald-500" />
          <div className="font-semibold text-sm">Rooftop Solar PV</div>
          <div className="text-xs opacity-75 mt-0.5">Common grid import offset</div>
        </button>

        <button
          onClick={() => setActiveTab('tariff_shift')}
          className={`p-4 rounded-xl border text-left transition-all ${
            activeTab === 'tariff_shift'
              ? 'bg-purple-500/10 border-purple-500 text-purple-600 dark:text-purple-400 shadow-sm'
              : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:border-gray-300'
          }`}
        >
          <Zap className="h-5 w-5 mb-2 text-purple-500" />
          <div className="font-semibold text-sm">Peak Tariff Shifting</div>
          <div className="text-xs opacity-75 mt-0.5">ToD off-peak scheduling</div>
        </button>
      </div>

      {/* Main Grid: Parameters Form (Left) & Live Impact Cards (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Configurable Parameters */}
        <div className="lg:col-span-6 space-y-6">
          <Card className="p-6">
            <div className="flex items-center justify-between pb-4 border-b border-gray-200 dark:border-gray-700 mb-6">
              <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <SlidersHorizontal className="h-4 w-4 text-brand-500" />
                Simulation Inputs
              </h3>
              <Badge variant="slate">Deterministic Model</Badge>
            </div>

            {/* TAB 1: Pump Scheduling */}
            {activeTab === 'pump_schedule' && (
              <div className="space-y-5">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <label className="text-gray-700 dark:text-gray-300 font-medium">Motor Rating (kW)</label>
                    <span className="font-semibold text-brand-500">{pumpKw} kW ({Math.round(pumpKw * 1.34)} HP)</span>
                  </div>
                  <input
                    type="range"
                    min="3.7"
                    max="30"
                    step="0.5"
                    value={pumpKw}
                    onChange={(e) => setPumpKw(parseFloat(e.target.value))}
                    className="w-full accent-brand-500"
                  />
                  <div className="flex justify-between text-[11px] text-gray-400 mt-0.5">
                    <span>5 HP (3.7 kW)</span>
                    <span>15 HP (11.2 kW)</span>
                    <span>40 HP (30 kW)</span>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <label className="text-gray-700 dark:text-gray-300 font-medium">Runtime Reduction Per Day</label>
                    <span className="font-semibold text-brand-500">{pumpHoursReduced} hrs/day</span>
                  </div>
                  <input
                    type="range"
                    min="0.5"
                    max="6"
                    step="0.5"
                    value={pumpHoursReduced}
                    onChange={(e) => setPumpHoursReduced(parseFloat(e.target.value))}
                    className="w-full accent-brand-500"
                  />
                  <div className="flex justify-between text-[11px] text-gray-400 mt-0.5">
                    <span>30 mins</span>
                    <span>2.0 hrs</span>
                    <span>6.0 hrs</span>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <label className="text-gray-700 dark:text-gray-300 font-medium">Estimated Automation Capex (₹)</label>
                    <span className="font-semibold text-brand-500">₹{pumpCapex.toLocaleString()}</span>
                  </div>
                  <input
                    type="number"
                    value={pumpCapex}
                    onChange={(e) => setPumpCapex(parseInt(e.target.value) || 0)}
                    className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white"
                    placeholder="e.g. 15000"
                  />
                  <p className="text-[11px] text-gray-400 mt-1">
                    Cost of float sensors, timers, or digital flow controllers.
                  </p>
                </div>
              </div>
            )}

            {/* TAB 2: LED Retrofit */}
            {activeTab === 'led_retrofit' && (
              <div className="space-y-5">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <label className="text-gray-700 dark:text-gray-300 font-medium">Number of Light Fixtures</label>
                    <span className="font-semibold text-amber-500">{fixtureCount} units</span>
                  </div>
                  <input
                    type="range"
                    min="20"
                    max="500"
                    step="10"
                    value={fixtureCount}
                    onChange={(e) => setFixtureCount(parseInt(e.target.value))}
                    className="w-full accent-amber-500"
                  />
                  <div className="flex justify-between text-[11px] text-gray-400 mt-0.5">
                    <span>20 units</span>
                    <span>250 units</span>
                    <span>500 units</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Current Fixture (W)</label>
                    <input
                      type="number"
                      value={oldWattage}
                      onChange={(e) => setOldWattage(parseInt(e.target.value) || 0)}
                      className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Retrofit LED (W)</label>
                    <input
                      type="number"
                      value={newWattage}
                      onChange={(e) => setNewWattage(parseInt(e.target.value) || 0)}
                      className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <label className="text-gray-700 dark:text-gray-300 font-medium">Daily Operating Hours</label>
                    <span className="font-semibold text-amber-500">{fixtureHours} hrs/day</span>
                  </div>
                  <input
                    type="range"
                    min="6"
                    max="24"
                    step="1"
                    value={fixtureHours}
                    onChange={(e) => setFixtureHours(parseInt(e.target.value))}
                    className="w-full accent-amber-500"
                  />
                  <div className="flex justify-between text-[11px] text-gray-400 mt-0.5">
                    <span>6 hrs (Corridors)</span>
                    <span>14 hrs (Basement)</span>
                    <span>24 hrs (Continuous)</span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Fixture Replacement Cost (₹/unit)</label>
                  <input
                    type="number"
                    value={costPerFixture}
                    onChange={(e) => setCostPerFixture(parseInt(e.target.value) || 0)}
                    className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white"
                  />
                </div>
              </div>
            )}

            {/* TAB 3: Rooftop Solar */}
            {activeTab === 'solar_offset' && (
              <div className="space-y-5">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <label className="text-gray-700 dark:text-gray-300 font-medium">Solar Plant Capacity (kWp)</label>
                    <span className="font-semibold text-emerald-500">{solarCapacityKwp} kWp</span>
                  </div>
                  <input
                    type="range"
                    min="5"
                    max="100"
                    step="5"
                    value={solarCapacityKwp}
                    onChange={(e) => setSolarCapacityKwp(parseInt(e.target.value))}
                    className="w-full accent-emerald-500"
                  />
                  <div className="flex justify-between text-[11px] text-gray-400 mt-0.5">
                    <span>5 kWp</span>
                    <span>50 kWp</span>
                    <span>100 kWp</span>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <label className="text-gray-700 dark:text-gray-300 font-medium">Capex Rate (₹ per kWp installed)</label>
                    <span className="font-semibold text-emerald-500">₹{solarCapexPerKwp.toLocaleString()} / kWp</span>
                  </div>
                  <input
                    type="range"
                    min="35000"
                    max="65000"
                    step="1000"
                    value={solarCapexPerKwp}
                    onChange={(e) => setSolarCapexPerKwp(parseInt(e.target.value))}
                    className="w-full accent-emerald-500"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <label className="text-gray-700 dark:text-gray-300 font-medium">Expected Daily Yield (kWh / kWp / day)</label>
                    <span className="font-semibold text-emerald-500">{solarDailyYield} kWh/kWp</span>
                  </div>
                  <input
                    type="range"
                    min="3.5"
                    max="5.0"
                    step="0.1"
                    value={solarDailyYield}
                    onChange={(e) => setSolarDailyYield(parseFloat(e.target.value))}
                    className="w-full accent-emerald-500"
                  />
                  <p className="text-[11px] text-gray-400 mt-1">
                    Avg Indian residential rooftop solar delivers 4.0 - 4.4 kWh/kWp/day.
                  </p>
                </div>
              </div>
            )}

            {/* TAB 4: Tariff Shifting */}
            {activeTab === 'tariff_shift' && (
              <div className="space-y-5">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <label className="text-gray-700 dark:text-gray-300 font-medium">Monthly Energy Shifted from Peak (kWh)</label>
                    <span className="font-semibold text-purple-500">{shiftKwh} kWh/month</span>
                  </div>
                  <input
                    type="range"
                    min="200"
                    max="5000"
                    step="100"
                    value={shiftKwh}
                    onChange={(e) => setShiftKwh(parseInt(e.target.value))}
                    className="w-full accent-purple-500"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <label className="text-gray-700 dark:text-gray-300 font-medium">Peak Surcharge Differential (₹/kWh)</label>
                    <span className="font-semibold text-purple-500">₹{surchargeRate.toFixed(2)} / kWh</span>
                  </div>
                  <input
                    type="range"
                    min="1.0"
                    max="4.5"
                    step="0.25"
                    value={surchargeRate}
                    onChange={(e) => setSurchargeRate(parseFloat(e.target.value))}
                    className="w-full accent-purple-500"
                  />
                  <p className="text-[11px] text-gray-400 mt-1">
                    Discom Time-of-Day (ToD) tariff surcharge applied during 18:00–22:00 peak hours.
                  </p>
                </div>
              </div>
            )}

            <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700 flex justify-end">
              <Button
                variant="primary"
                onClick={handleSimulate}
                disabled={isSimulating}
                className="w-full sm:w-auto"
              >
                Recalculate & Save Scenario
              </Button>
            </div>
          </Card>
        </div>

        {/* Right Column: Projected Impact Cards */}
        <div className="lg:col-span-6 space-y-6">
          <Card className="p-6 bg-gradient-to-br from-gray-900 to-gray-800 text-white border-0 shadow-lg">
            <div className="flex items-center justify-between pb-4 border-b border-gray-700 mb-6">
              <div>
                <span className="text-xs font-semibold text-brand-400 uppercase tracking-wider">Simulated Output</span>
                <h3 className="text-lg font-bold text-white mt-0.5">
                  {activeResult?.title || 'Projected Monthly Impact'}
                </h3>
              </div>
              <Badge variant={activeResult?.confidence === 'high' ? 'emerald' : 'blue'}>
                {activeResult?.confidence || 'medium'} confidence
              </Badge>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="p-4 bg-white/5 rounded-xl border border-white/10">
                <div className="flex items-center gap-2 text-xs text-gray-300 mb-1">
                  <Zap className="h-4 w-4 text-amber-400" />
                  Monthly Consumption Saved
                </div>
                <div className="text-2xl font-black text-white">
                  {activeResult?.estimated_kwh_monthly ? activeResult.estimated_kwh_monthly.toLocaleString() : '0'}{' '}
                  <span className="text-xs font-normal text-gray-300">kWh</span>
                </div>
                <div className="text-[11px] text-gray-400 mt-1">
                  ~{activeResult?.estimated_kwh_monthly ? Math.round(activeResult.estimated_kwh_monthly * 12).toLocaleString() : '0'} kWh annually
                </div>
              </div>

              <div className="p-4 bg-white/5 rounded-xl border border-white/10">
                <div className="flex items-center gap-2 text-xs text-gray-300 mb-1">
                  <IndianRupee className="h-4 w-4 text-emerald-400" />
                  Monthly Bill Reduction
                </div>
                <div className="text-2xl font-black text-emerald-400">
                  ₹{activeResult?.estimated_cost_monthly ? activeResult.estimated_cost_monthly.toLocaleString() : '0'}
                </div>
                <div className="text-[11px] text-gray-400 mt-1">
                  ~₹{activeResult?.estimated_cost_monthly ? (activeResult.estimated_cost_monthly * 12).toLocaleString() : '0'} annually
                </div>
              </div>
            </div>

            {/* Payback Period Highlight */}
            <div className="p-4 bg-brand-500/20 border border-brand-500/40 rounded-xl mb-6 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-brand-500/30 rounded-lg">
                  <Calendar className="h-5 w-5 text-brand-300" />
                </div>
                <div>
                  <div className="text-xs text-brand-200">Estimated Payback Period</div>
                  <div className="text-lg font-bold text-white">
                    {activeResult?.payback_months ? `${activeResult.payback_months} Months` : 'Immediate / No Capex'}
                  </div>
                </div>
              </div>
              {activeResult?.payback_months && (
                <div className="text-xs text-brand-300 text-right">
                  ~{(activeResult.payback_months / 12).toFixed(1)} years
                </div>
              )}
            </div>

            {/* Simulation Notes */}
            <div className="text-xs text-gray-300 bg-white/5 p-3 rounded-lg border border-white/10 leading-relaxed">
              <span className="font-semibold text-brand-300">Methodology Note: </span>
              {activeResult?.notes || 'Calculations derive from active society tariffs, baseline load duration curves, and deterministic physics formulas.'}
            </div>
          </Card>
        </div>
      </div>

      {/* Simulation Run History */}
      <Card className="p-6">
        <div className="flex items-center justify-between pb-4 border-b border-gray-200 dark:border-gray-700 mb-4">
          <div className="flex items-center gap-2">
            <History className="h-5 w-5 text-brand-500" />
            <h3 className="font-semibold text-gray-900 dark:text-white">Past Simulation Ledger</h3>
          </div>
          <span className="text-xs text-gray-500">Persistent society audit records</span>
        </div>

        {history.length === 0 ? (
          <div className="text-center py-8 text-sm text-gray-500">
            No simulations saved yet. Adjust the sliders above and click &quot;Run Simulation&quot;.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-xs text-gray-500 uppercase bg-gray-50 dark:bg-gray-800">
                <tr>
                  <th className="px-4 py-3">Scenario Title</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Monthly Saved kWh</th>
                  <th className="px-4 py-3">Monthly Saved ₹</th>
                  <th className="px-4 py-3">Payback</th>
                  <th className="px-4 py-3">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {history.map((h) => (
                  <tr key={h.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                    <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{h.title}</td>
                    <td className="px-4 py-3">
                      <span className="text-xs px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300">
                        {h.scenario_type.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-brand-600 dark:text-brand-400 font-semibold">
                      {h.estimated_kwh_monthly ? h.estimated_kwh_monthly.toLocaleString() : '0'} kWh
                    </td>
                    <td className="px-4 py-3 text-emerald-600 dark:text-emerald-400 font-semibold">
                      ₹{h.estimated_cost_monthly ? h.estimated_cost_monthly.toLocaleString() : '0'}
                    </td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                      {h.payback_months ? `${h.payback_months} mos` : '—'}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-400">
                      {new Date(h.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
};
