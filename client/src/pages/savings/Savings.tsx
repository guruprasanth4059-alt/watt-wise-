import React, { useEffect, useState } from 'react';
import { api } from '../../api/client';
import { SavingsData, Recommendation } from '../../types';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { StatCard } from '../../components/common/StatCard';
import { Modal } from '../../components/common/Modal';
import { useAuth } from '../../context/AuthContext';
import {
  PiggyBank,
  PlusCircle,
  TrendingDown,
  AlertCircle,
  BarChart2,
  Calendar,
  CheckCircle2,
  ShieldCheck,
  Info,
  Zap,
  Clock
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid
} from 'recharts';

export const Savings: React.FC = () => {
  const { user } = useAuth();
  const [savingsData, setSavingsData] = useState<SavingsData | null>(null);
  const [implementedRecs, setImplementedRecs] = useState<Recommendation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showMethodology, setShowMethodology] = useState(false);

  const [form, setForm] = useState({
    month: new Date().toISOString().slice(0, 7),
    estimated_savings: '8000',
    measured_savings: '5000',
    notes: 'Verified against utility invoice'
  });

  const fetchSavings = async () => {
    setIsLoading(true);
    try {
      const [savings, recs] = await Promise.all([
        api.get<SavingsData>('/savings'),
        api.get<Recommendation[]>('/recommendations?status=implemented')
      ]);
      setSavingsData(savings);
      setImplementedRecs(recs);
    } catch (err) {
      console.error('Failed to load savings:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSavings();
  }, []);

  const handleAddSavings = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await api.post('/savings', form);
      setIsModalOpen(false);
      fetchSavings();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading || !savingsData) {
    return <div className="p-12 text-center text-xs text-slate-400">Loading savings ledger...</div>;
  }

  const canEdit = user?.role === 'society_admin';

  // Calculate total observed kWh reduction from implemented actions
  const totalObservedKwhReduction = implementedRecs.reduce((acc, r) => acc + (r.potential_savings_kwh || 0), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <PiggyBank className="w-5 h-5 text-emerald-600" />
            Energy Savings & Attribution Tracking
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Audit-grade comparison of projected opportunities, physical kWh reductions, and verified tariff savings.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowMethodology(!showMethodology)}
            icon={<Info className="w-4 h-4 text-slate-500" />}
          >
            {showMethodology ? 'Hide Methodology' : 'Savings Methodology'}
          </Button>

          {canEdit && (
            <Button
              variant="primary"
              size="sm"
              onClick={() => setIsModalOpen(true)}
              icon={<PlusCircle className="w-4 h-4" />}
            >
              Record Verified Savings
            </Button>
          )}
        </div>
      </div>

      {/* Methodology & Causality Accordion */}
      {showMethodology && (
        <Card className="p-5 bg-gradient-to-br from-slate-900 to-slate-800 text-white border-none shadow-xl">
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
              <ShieldCheck className="w-5 h-5" />
              WattWise 3-Tier Savings Measurement Methodology
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-slate-300">
              <div className="p-3 bg-white/5 rounded-xl border border-white/10 space-y-1">
                <p className="font-bold text-amber-400 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5" />
                  1. Potential Savings (₹)
                </p>
                <p className="text-slate-300 text-[11px] leading-relaxed">
                  Calculated from detected operational anomalies and idle baselines before intervention. Represents upper-bound opportunities.
                </p>
              </div>
              <div className="p-3 bg-white/5 rounded-xl border border-white/10 space-y-1">
                <p className="font-bold text-sky-400 flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5" />
                  2. Observed Reduction (kWh)
                </p>
                <p className="text-slate-300 text-[11px] leading-relaxed">
                  Direct physical difference in meter consumption before vs. after recorded intervention. Free of billing/tariff rate distortions.
                </p>
              </div>
              <div className="p-3 bg-white/5 rounded-xl border border-white/10 space-y-1">
                <p className="font-bold text-emerald-400 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  3. Recorded Savings (₹)
                </p>
                <p className="text-slate-300 text-[11px] leading-relaxed">
                  Actual rupee reductions reflected on DISCOM utility invoices post-intervention, verified by society administration.
                </p>
              </div>
            </div>
            <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-[11px] text-amber-300">
              <strong>Attribution & Causality Caveat:</strong> Observed reductions strongly coincide with recorded RWA interventions (e.g. pump schedule automation, timer repairs). However, external variables including seasonal ambient temperatures, occupancy shifts, and grid voltage fluctuations may also exert influence.
            </div>
          </div>
        </Card>
      )}

      {/* 3-Way Distinction KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard
          title="Active Potential Savings"
          value={`₹${savingsData.totalPotentialSavings.toLocaleString()}`}
          unit="/ mo"
          potentialBadge={true}
          subtitle="Theoretical savings from pending actions"
          icon={<PiggyBank className="w-5 h-5 text-amber-600" />}
        />

        <StatCard
          title="Observed Energy Reduction"
          value={`${totalObservedKwhReduction.toLocaleString()}`}
          unit="kWh / mo"
          subtitle="Physical reduction from implemented interventions"
          icon={<Zap className="w-5 h-5 text-sky-600" />}
        />

        <StatCard
          title="Total Recorded Savings"
          value={`₹${savingsData.totalMeasuredSavings.toLocaleString()}`}
          subtitle="Audited invoice reductions verified"
          icon={<CheckCircle2 className="w-5 h-5 text-emerald-600" />}
        />
      </div>

      {/* Monthly Comparison Bar Chart */}
      <Card className="p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Monthly Savings Comparison (₹)</h3>
            <p className="text-xs text-slate-500">Estimated Potential vs. Verified Measured Savings</p>
          </div>
        </div>

        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={savingsData.history} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="month" tick={{ fill: '#64748b', fontSize: 11 }} />
              <YAxis tick={{ fill: '#64748b', fontSize: 11 }} tickFormatter={v => `₹${v}`} />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (active && payload && payload.length) {
                    return (
                      <div className="bg-slate-900 text-white px-3 py-2 rounded-lg text-xs shadow-lg space-y-1">
                        <p className="font-semibold text-slate-300">{label}</p>
                        <p className="text-amber-400">
                          Estimated: ₹{payload[0]?.value?.toLocaleString()}
                        </p>
                        <p className="text-emerald-400 font-bold">
                          Measured: ₹{payload[1]?.value?.toLocaleString()}
                        </p>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
              <Bar dataKey="estimated_savings" name="Estimated Savings (₹)" fill="#f59e0b" radius={[4, 4, 0, 0]} maxBarSize={30} />
              <Bar dataKey="measured_savings" name="Measured Savings (₹)" fill="#059669" radius={[4, 4, 0, 0]} maxBarSize={30} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* Implemented Interventions & Observed Reduction Ledger */}
      {implementedRecs.length > 0 && (
        <Card className="p-0 overflow-hidden border border-slate-200">
          <div className="p-4 bg-slate-50/70 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                Interventions Implemented During Pilot
              </h3>
              <p className="text-xs text-slate-500">
                Operating condition changes verified by RWA committee.
              </p>
            </div>
            <Badge variant="emerald" size="sm">
              {implementedRecs.length} Active {implementedRecs.length === 1 ? 'Action' : 'Actions'}
            </Badge>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
                <tr>
                  <th className="p-3.5">Measure / Action</th>
                  <th className="p-3.5">Equipment / System</th>
                  <th className="p-3.5">Observed Reduction</th>
                  <th className="p-3.5">Est. Monthly Savings</th>
                  <th className="p-3.5">Attribution Confidence</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {implementedRecs.map(rec => (
                  <tr key={rec.id} className="hover:bg-slate-50/50">
                    <td className="p-3.5 font-bold text-slate-900">
                      <div>{rec.title}</div>
                      <div className="text-[11px] font-normal text-slate-500 mt-0.5">{rec.problem_observed || rec.description}</div>
                    </td>
                    <td className="p-3.5 text-slate-700 capitalize">
                      {rec.category.replace('_', ' ')}
                    </td>
                    <td className="p-3.5 font-bold text-sky-700">
                      {rec.potential_savings_kwh ? `-${rec.potential_savings_kwh.toLocaleString()} kWh/mo` : 'Pending cycle'}
                    </td>
                    <td className="p-3.5 font-bold text-emerald-700">
                      ₹{rec.potential_savings_inr?.toLocaleString() || 0}/mo
                    </td>
                    <td className="p-3.5">
                      <Badge variant="emerald" size="sm">
                        High Confidence
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Historical Monthly Savings Ledger */}
      <Card className="p-0 overflow-hidden">
        <div className="p-4 border-b border-slate-100 font-bold text-slate-900 text-sm">
          Historical Monthly Savings Ledger
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
              <tr>
                <th className="p-3.5">Month</th>
                <th className="p-3.5">Estimated Potential (₹)</th>
                <th className="p-3.5">Measured / Verified (₹)</th>
                <th className="p-3.5">Confidence</th>
                <th className="p-3.5">Audit Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {savingsData.history.map(row => (
                <tr key={row.id}>
                  <td className="p-3.5 font-bold text-slate-900">{row.month}</td>
                  <td className="p-3.5 font-semibold text-amber-700">₹{row.estimated_savings.toLocaleString()}</td>
                  <td className="p-3.5 font-bold text-emerald-700">₹{row.measured_savings.toLocaleString()}</td>
                  <td className="p-3.5">
                    <Badge variant="emerald" size="sm">
                      Verified
                    </Badge>
                  </td>
                  <td className="p-3.5 text-slate-500">{row.notes || 'Routine audit'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Modal to add manual savings entry */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Record Monthly Verified Savings"
        subtitle="Commit measured energy cost reductions for a specific billing month."
        maxWidth="md"
      >
        <form onSubmit={handleAddSavings} className="space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Month (YYYY-MM) *</label>
            <input
              type="text"
              required
              value={form.month}
              onChange={e => setForm({ ...form, month: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Estimated Potential (₹)</label>
              <input
                type="number"
                value={form.estimated_savings}
                onChange={e => setForm({ ...form, estimated_savings: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Measured Savings (₹) *</label>
              <input
                type="number"
                required
                value={form.measured_savings}
                onChange={e => setForm({ ...form, measured_savings: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Verification Reference</label>
            <textarea
              rows={2}
              value={form.notes}
              onChange={e => setForm({ ...form, notes: e.target.value })}
              placeholder="e.g. Verified against March 2026 BESCOM invoice after pump timer retrofit"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <Button type="button" variant="outline" size="sm" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm" isLoading={isSubmitting}>
              Save Savings Record
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
