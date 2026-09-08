import React, { useEffect, useState } from 'react';
import { api } from '../../api/client';
import { Recommendation, Action, Priority, RecommendationStatus } from '../../types';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';
import { useAuth } from '../../context/AuthContext';
import {
  Lightbulb,
  CheckCircle2,
  Clock,
  Circle,
  PlusCircle,
  ArrowRight,
  TrendingDown,
  History,
  AlertCircle
} from 'lucide-react';

export const Recommendations: React.FC = () => {
  const { user } = useAuth();
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [actionsList, setActionsList] = useState<Action[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Action Tracking Modal
  const [selectedRecForAction, setSelectedRecForAction] = useState<Recommendation | null>(null);
  const [actionForm, setActionForm] = useState({
    action_taken: '',
    action_date: new Date().toISOString().slice(0, 10),
    notes: '',
    before_consumption: '',
    after_consumption: ''
  });
  const [isSubmittingAction, setIsSubmittingAction] = useState(false);
  const [actionSuccessMessage, setActionSuccessMessage] = useState<string | null>(null);

  // New Custom Recommendation Modal
  const [newRecModalOpen, setNewRecModalOpen] = useState(false);
  const [newRecForm, setNewRecForm] = useState({
    title: '',
    description: '',
    reason: '',
    suggested_action: '',
    priority: 'medium' as Priority,
    estimated_savings: '3000',
    category: 'Common Facilities'
  });

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [recs, actions] = await Promise.all([
        api.get<Recommendation[]>('/recommendations'),
        api.get<Action[]>('/recommendations/actions/list')
      ]);
      setRecommendations(recs);
      setActionsList(actions);
    } catch (err) {
      console.error('Failed to load recommendations:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleStatusChange = async (id: string, newStatus: RecommendationStatus) => {
    try {
      await api.put(`/recommendations/${id}/status`, { status: newStatus });
      setRecommendations(prev =>
        prev.map(r => (r.id === id ? { ...r, status: newStatus } : r))
      );
    } catch (err) {
      console.error('Failed to update status:', err);
    }
  };

  const handleRecordActionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRecForAction) return;

    setIsSubmittingAction(true);
    try {
      const res = await api.post<any>(`/recommendations/${selectedRecForAction.id}/actions`, actionForm);
      setActionSuccessMessage(
        res.caveat || 'Consumption decreased after the recorded action. Other factors may also have contributed.'
      );
      fetchData();
      setTimeout(() => {
        setSelectedRecForAction(null);
        setActionSuccessMessage(null);
      }, 1500);
    } catch (err) {
      console.error('Failed to record action:', err);
    } finally {
      setIsSubmittingAction(false);
    }
  };

  const handleCreateRecommendation = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/recommendations', newRecForm);
      setNewRecModalOpen(false);
      setNewRecForm({
        title: '',
        description: '',
        reason: '',
        suggested_action: '',
        priority: 'medium',
        estimated_savings: '3000',
        category: 'Common Facilities'
      });
      fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  const canEdit = user?.role === 'society_admin' || user?.role === 'committee_member';

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Lightbulb className="w-5 h-5 text-amber-500" />
            Energy Recommendations & Action Tracking
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Convert electricity insights into physical committee actions and track before/after impact.
          </p>
        </div>

        {canEdit && (
          <Button
            variant="primary"
            size="sm"
            onClick={() => setNewRecModalOpen(true)}
            icon={<PlusCircle className="w-4 h-4" />}
          >
            Add Recommendation
          </Button>
        )}
      </div>

      {/* Recommendations Cards */}
      <div className="space-y-4">
        {recommendations.map(rec => (
          <Card key={rec.id} className="p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Badge
                    variant={rec.priority === 'high' ? 'red' : rec.priority === 'medium' ? 'amber' : 'blue'}
                    size="sm"
                  >
                    Priority: {rec.priority.toUpperCase()}
                  </Badge>
                  <span className="text-xs font-semibold text-slate-500">{rec.category}</span>
                </div>
                <h3 className="text-base font-bold text-slate-900">{rec.title}</h3>
                <p className="text-xs text-slate-600 leading-relaxed max-w-3xl">{rec.description}</p>
              </div>

              {/* Status and Savings Callout */}
              <div className="sm:text-right shrink-0">
                <div className="inline-flex items-center gap-1.5 p-2 bg-amber-50/80 border border-amber-200/80 rounded-xl text-xs">
                  <div>
                    <span className="text-[10px] text-amber-800 uppercase font-semibold block">Potential Savings</span>
                    <span className="text-sm font-bold text-amber-900">
                      ₹{rec.estimated_savings.toLocaleString()} / mo
                    </span>
                    <span className="text-[9px] text-amber-700 block italic">Potential estimate — not guaranteed</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Reason and Suggested Action */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-3 border-t border-slate-100 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl">
                <span className="font-bold text-slate-700 block mb-0.5">Reason for Recommendation:</span>
                <p className="text-slate-600">{rec.reason}</p>
              </div>
              <div className="p-3 bg-emerald-50/50 border border-emerald-100 rounded-xl">
                <span className="font-bold text-emerald-900 block mb-0.5">Suggested Action:</span>
                <p className="text-emerald-800">{rec.suggested_action}</p>
              </div>
            </div>

            {/* Status Switcher & Action Trigger */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
              <div className="flex items-center gap-1 text-xs">
                <span className="text-slate-500 font-medium mr-2">Status:</span>
                {(['not_started', 'in_progress', 'completed'] as RecommendationStatus[]).map(st => (
                  <button
                    key={st}
                    disabled={!canEdit}
                    onClick={() => handleStatusChange(rec.id, st)}
                    className={`px-2.5 py-1 rounded-lg font-semibold capitalize transition-all cursor-pointer ${
                      rec.status === st
                        ? st === 'completed'
                          ? 'bg-emerald-600 text-white shadow-xs'
                          : st === 'in_progress'
                          ? 'bg-amber-500 text-white shadow-xs'
                          : 'bg-slate-700 text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {st.replace('_', ' ')}
                  </button>
                ))}
              </div>

              {canEdit && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSelectedRecForAction(rec);
                    setActionForm({
                      action_taken: rec.suggested_action,
                      action_date: new Date().toISOString().slice(0, 10),
                      notes: '',
                      before_consumption: '20200',
                      after_consumption: '18420'
                    });
                  }}
                  icon={<CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />}
                >
                  Record Action Taken
                </Button>
              )}
            </div>
          </Card>
        ))}
      </div>

      {/* Recorded Actions History Ledger (Section 28) */}
      <Card className="p-5 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <History className="w-4 h-4 text-emerald-600" />
              Recorded Maintenance Actions & Impact Log
            </h3>
            <p className="text-xs text-slate-500">
              Audit trail of physical facility adjustments and before/after measurements.
            </p>
          </div>
        </div>

        {actionsList.length === 0 ? (
          <div className="text-center py-6 text-xs text-slate-400">
            No conservation actions logged yet.
          </div>
        ) : (
          <div className="divide-y divide-slate-100 text-xs">
            {actionsList.map(action => (
              <div key={action.id} className="py-3 space-y-2">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                  <span className="font-bold text-slate-800 text-sm">{action.action_taken}</span>
                  <span className="text-slate-400 font-mono text-[11px]">{action.action_date}</span>
                </div>

                {action.notes && <p className="text-slate-600 italic">&ldquo;{action.notes}&rdquo;</p>}

                <div className="flex flex-wrap items-center gap-4 text-[11px] bg-slate-50 p-2.5 rounded-lg">
                  {action.before_consumption && (
                    <span>
                      Before: <strong className="text-slate-800">{action.before_consumption.toLocaleString()} kWh</strong>
                    </span>
                  )}
                  {action.after_consumption && (
                    <span>
                      After: <strong className="text-emerald-700">{action.after_consumption.toLocaleString()} kWh</strong>
                    </span>
                  )}
                  {action.measured_savings && (
                    <span className="text-emerald-700 font-bold">
                      Estimated Monthly Reduction: ₹{action.measured_savings.toLocaleString()}
                    </span>
                  )}
                  <span className="text-slate-400 ml-auto">Logged by: {action.created_by || 'Admin'}</span>
                </div>

                {/* Mandatory Causality Caveat (Section 28) */}
                <p className="text-[10px] text-slate-400 italic">
                  Note: Consumption decreased after the recorded action. Other factors may also have contributed.
                </p>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Record Action Modal */}
      {selectedRecForAction && (
        <Modal
          isOpen={!!selectedRecForAction}
          onClose={() => setSelectedRecForAction(null)}
          title="Record Physical Action Taken"
          subtitle={`Logging action on: ${selectedRecForAction.title}`}
          maxWidth="md"
        >
          {actionSuccessMessage ? (
            <div className="text-center py-6 space-y-3">
              <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto" />
              <h4 className="text-sm font-bold text-slate-900">Action Successfully Logged</h4>
              <p className="text-xs text-slate-600 max-w-sm mx-auto">{actionSuccessMessage}</p>
            </div>
          ) : (
            <form onSubmit={handleRecordActionSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Action Taken *</label>
                <textarea
                  required
                  rows={2}
                  value={actionForm.action_taken}
                  onChange={e => setActionForm({ ...actionForm, action_taken: e.target.value })}
                  placeholder="e.g. Adjusted pump timer from 5.5 hours to 3.8 hours and repaired float valve"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Action Date *</label>
                <input
                  type="date"
                  required
                  value={actionForm.action_date}
                  onChange={e => setActionForm({ ...actionForm, action_date: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Before Consumption (kWh)</label>
                  <input
                    type="number"
                    value={actionForm.before_consumption}
                    onChange={e => setActionForm({ ...actionForm, before_consumption: e.target.value })}
                    placeholder="e.g. 20200"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">After Consumption (kWh)</label>
                  <input
                    type="number"
                    value={actionForm.after_consumption}
                    onChange={e => setActionForm({ ...actionForm, after_consumption: e.target.value })}
                    placeholder="e.g. 18420"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Technician / Vendor Notes</label>
                <textarea
                  rows={2}
                  value={actionForm.notes}
                  onChange={e => setActionForm({ ...actionForm, notes: e.target.value })}
                  placeholder="Vendor invoice #, technician remarks, tank cleaning notes..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <Button type="button" variant="outline" size="sm" onClick={() => setSelectedRecForAction(null)}>
                  Cancel
                </Button>
                <Button type="submit" variant="primary" size="sm" isLoading={isSubmittingAction}>
                  Save Action & Update Savings
                </Button>
              </div>
            </form>
          )}
        </Modal>
      )}

      {/* Add Custom Recommendation Modal */}
      <Modal
        isOpen={newRecModalOpen}
        onClose={() => setNewRecModalOpen(false)}
        title="Add Custom Energy Recommendation"
        subtitle="Log a committee action proposal with estimated potential savings."
        maxWidth="md"
      >
        <form onSubmit={handleCreateRecommendation} className="space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Title *</label>
            <input
              type="text"
              required
              value={newRecForm.title}
              onChange={e => setNewRecForm({ ...newRecForm, title: e.target.value })}
              placeholder="e.g. Install timer relay on STP blowers"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Priority</label>
              <select
                value={newRecForm.priority}
                onChange={e => setNewRecForm({ ...newRecForm, priority: e.target.value as Priority })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white"
              >
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Estimated Savings (₹/mo)</label>
              <input
                type="number"
                value={newRecForm.estimated_savings}
                onChange={e => setNewRecForm({ ...newRecForm, estimated_savings: e.target.value })}
                placeholder="3000"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Reason</label>
            <textarea
              rows={2}
              value={newRecForm.reason}
              onChange={e => setNewRecForm({ ...newRecForm, reason: e.target.value })}
              placeholder="Why this recommendation is necessary..."
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Suggested Action *</label>
            <textarea
              required
              rows={2}
              value={newRecForm.suggested_action}
              onChange={e => setNewRecForm({ ...newRecForm, suggested_action: e.target.value })}
              placeholder="Exact physical steps facility staff must take..."
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <Button type="button" variant="outline" size="sm" onClick={() => setNewRecModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm">
              Save Recommendation
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
