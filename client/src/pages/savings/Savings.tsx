import React, { useEffect, useState } from 'react';
import { api } from '../../api/client';
import { SavingsData } from '../../types';
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
  CheckCircle2
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
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [form, setForm] = useState({
    month: new Date().toISOString().slice(0, 7),
    estimated_savings: '8000',
    measured_savings: '5000',
    notes: 'Verified against utility invoice'
  });

  const fetchSavings = async () => {
    setIsLoading(true);
    try {
      const data = await api.get<SavingsData>('/savings');
      setSavingsData(data);
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <PiggyBank className="w-5 h-5 text-emerald-600" />
            Energy Savings Tracking
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Compare potential opportunity estimates with actual verified tariff reductions.
          </p>
        </div>

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

      {/* Difference Warning Box (Section 29) */}
      <div className="p-4 bg-emerald-50/70 border border-emerald-200/80 rounded-2xl flex items-start gap-3 text-xs text-emerald-900">
        <AlertCircle className="w-5 h-5 text-emerald-700 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-bold">Clear Differentiation: Estimated vs. Measured Savings</p>
          <p className="text-emerald-800 leading-relaxed">
            <strong>Potential Savings:</strong> Projections derived from uncompleted recommendations and equipment benchmarking. Not guaranteed.
            <br />
            <strong>Recorded Savings:</strong> Reductions measured after committee action entries and verified against successive utility billing cycles.
          </p>
        </div>
      </div>

      {/* 2 Primary KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <StatCard
          title="Active Potential Savings"
          value={`₹${savingsData.totalPotentialSavings.toLocaleString()}`}
          unit="/ mo"
          potentialBadge={true}
          subtitle="Estimated from all active proposals"
          icon={<PiggyBank className="w-5 h-5 text-amber-600" />}
        />

        <StatCard
          title="Total Measured Savings"
          value={`₹${savingsData.totalMeasuredSavings.toLocaleString()}`}
          subtitle="Total verified rupee reductions achieved"
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

      {/* Ledger Table */}
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
                <th className="p-3.5">Audit Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {savingsData.history.map(row => (
                <tr key={row.id}>
                  <td className="p-3.5 font-bold text-slate-900">{row.month}</td>
                  <td className="p-3.5 font-semibold text-amber-700">₹{row.estimated_savings.toLocaleString()}</td>
                  <td className="p-3.5 font-bold text-emerald-700">₹{row.measured_savings.toLocaleString()}</td>
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
