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
  PlusCircle,
  TrendingDown,
  History,
  AlertCircle,
  UserCheck,
  Calendar,
  Layers,
  ArrowRight
} from 'lucide-react';

export const Recommendations: React.FC = () => {
  const { user } = useAuth();
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [actionsList, setActionsList] = useState<Action[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Action Tracking Modal
  const [selectedRecForAction, setSelectedRecForAction] = useState<Recommendation | null>(null);
  const [actionForm, setActionForm] = useState({
    action_taken: '',
    action_date: new Date().toISOString().slice(0, 10),
    person_responsible: '',
    notes: '',
    previous_condition: '',
    new_condition: '',
    before_consumption: '20200',
    after_consumption: '18420'
  });
  const [isSubmittingAction, setIsSubmittingAction] = useState(false);
  const [actionSuccessMessage, setActionSuccessMessage] = useState<string | null>(null);

  // New Custom Recommendation Modal
  const [newRecModalOpen, setNewRecModalOpen] = useState(false);
  const [newRecForm, setNewRecForm] = useState({
    title: '',
    description: '',
    problem_observed: '',
    evidence: '',
    suggested_investigation: '',
    suggested_action: '',
    priority: 'medium' as Priority,
    estimated_savings: '3000',
    category: 'Common Facilities',
    assigned_to: '',
    due_date: ''
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
        problem_observed: '',
        evidence: '',
        suggested_investigation: '',
        suggested_action: '',
        priority: 'medium',
        estimated_savings: '3000',
        category: 'Common Facilities',
        assigned_to: '',
        due_date: ''
      });
      fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  const canEdit = user?.role === 'society_admin' || user?.role === 'committee_member';

  const filteredRecs = recommendations.filter(r => {
    if (statusFilter === 'all') return true;
    if (statusFilter === 'open') return r.status !== 'completed';
    return r.status === statusFilter;
  });

  const beforeVal = parseFloat(actionForm.before_consumption) || 0;
  const afterVal = parseFloat(actionForm.after_consumption) || 0;
  const reductionKwh = beforeVal > afterVal ? beforeVal - afterVal : 0;
  const reductionPct = beforeVal > 0 ? Math.round((reductionKwh / beforeVal) * 1000) / 10 : 0;

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Lightbulb className="w-5 h-5 text-amber-500" />
            Energy Recommendations & Intervention Tracking
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Convert electricity intelligence into recorded physical committee adjustments with before/after monitoring.
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

      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-3 text-xs">
        <span className="text-slate-400 font-semibold mr-1">Filter by Status:</span>
        {[
          { id: 'all', label: `All (${recommendations.length})` },
          { id: 'open', label: 'Open Proposals' },
          { id: 'in_progress', label: 'In Progress' },
          { id: 'completed', label: 'Completed' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setStatusFilter(tab.id)}
            className={`px-3 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
              statusFilter === tab.id
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Recommendations Cards */}
      <div className="space-y-4">
        {filteredRecs.map(rec => (
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
                  {rec.confidence && (
                    <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-medium">
                      Confidence: {rec.confidence}
                    </span>
                  )}
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

            {/* Evidence & Investigation Grid (Requirements 22) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-3 border-t border-slate-100 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl space-y-1">
                <span className="font-bold text-slate-700 block">Problem Observed & Evidence:</span>
                <p className="text-slate-600">{rec.problem_observed || rec.reason}</p>
                {rec.evidence && (
                  <p className="text-[11px] text-slate-500 italic">Evidence: {rec.evidence}</p>
                )}
              </div>
              <div className="p-3 bg-emerald-50/50 border border-emerald-100 rounded-xl space-y-1">
                <span className="font-bold text-emerald-900 block">Suggested Investigation & Action:</span>
                <p className="text-emerald-800">{rec.suggested_action}</p>
                {rec.suggested_investigation && (
                  <p className="text-[11px] text-emerald-700">Check: {rec.suggested_investigation}</p>
                )}
              </div>
            </div>

            {/* Assignment & Due Date Banner (Requirement 23) */}
            {(rec.assigned_to || rec.due_date) && (
              <div className="flex flex-wrap items-center gap-4 text-xs bg-slate-50/70 p-2.5 rounded-lg text-slate-600">
                {rec.assigned_to && (
                  <span className="flex items-center gap-1.5">
                    <UserCheck className="w-3.5 h-3.5 text-slate-400" />
                    Assigned to: <strong className="text-slate-800 font-medium">{rec.assigned_to}</strong>
                  </span>
                )}
                {rec.due_date && (
                  <span className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    Target Date: <strong className="text-slate-800 font-medium">{rec.due_date}</strong>
                  </span>
                )}
              </div>
            )}

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
                      person_responsible: rec.assigned_to || user?.name || 'Facility Team',
                      notes: '',
                      previous_condition: 'Operating on manual timer switch (approx 6.5 hrs/day)',
                      new_condition: 'Configured automated digital astronomical relay (4.5 hrs/day)',
                      before_consumption: '20200',
                      after_consumption: '18420'
                    });
                  }}
                  icon={<CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />}
                >
                  Record Physical Action Taken
                </Button>
              )}
            </div>
          </Card>
        ))}
      </div>

      {/* Recorded Actions History Ledger with Before/After Monitoring (Requirement 24, 25, 26) */}
      <Card className="p-5 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <History className="w-4 h-4 text-emerald-600" />
              Recorded Maintenance Interventions & Impact Log
            </h3>
            <p className="text-xs text-slate-500">
              Historical audit trail of physical facility adjustments and verified before/after measurements.
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
              <div key={action.id} className="py-3.5 space-y-2">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                  <span className="font-bold text-slate-800 text-sm">{action.action_taken}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-slate-400 font-mono text-[11px]">{action.action_date}</span>
                    <span className="text-[11px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-medium">
                      By: {action.person_responsible || action.created_by || 'Admin'}
                    </span>
                  </div>
                </div>

                {/* Operating Condition Comparison (Requirement 24) */}
                {(action.previous_condition || action.new_condition) && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] bg-slate-50 p-2.5 rounded-lg">
                    <div>
                      <span className="text-slate-400 block font-semibold">Previous Condition:</span>
                      <span className="text-slate-700">{action.previous_condition || 'Standard operation'}</span>
                    </div>
                    <div>
                      <span className="text-emerald-600 block font-semibold">New Operating Condition:</span>
                      <span className="text-emerald-900">{action.new_condition || 'Intervention enacted'}</span>
                    </div>
                  </div>
                )}

                {/* Before / After Measurement Comparison (Requirement 26) */}
                <div className="flex flex-wrap items-center gap-4 text-[11px] bg-emerald-50/50 border border-emerald-100 p-2.5 rounded-lg">
                  {action.before_consumption && (
                    <span>
                      Before Action: <strong className="text-slate-800">{action.before_consumption.toLocaleString()} kWh</strong>
                    </span>
                  )}
                  {action.after_consumption && (
                    <span>
                      After Action: <strong className="text-emerald-700">{action.after_consumption.toLocaleString()} kWh</strong>
                    </span>
                  )}
                  {action.observed_reduction_percent && (
                    <span className="text-emerald-800 font-bold">
                      Observed Reduction: {action.observed_reduction_percent}% lower
                    </span>
                  )}
                  {action.measured_savings && (
                    <span className="text-emerald-700 font-bold ml-auto">
                      Tariff Reduction: ₹{action.measured_savings.toLocaleString()} / mo
                    </span>
                  )}
                </div>

                {/* Mandatory Causality Caveat (Requirement 26) */}
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
          subtitle={`Logging maintenance intervention for: ${selectedRecForAction.title}`}
          maxWidth="md"
        >
          {actionSuccessMessage ? (
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 space-y-2 text-center">
              <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto" />
              <p className="font-bold">Intervention Recorded Successfully!</p>
              <p className="text-emerald-700 italic">{actionSuccessMessage}</p>
            </div>
          ) : (
            <form onSubmit={handleRecordActionSubmit} className="space-y-4 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Physical Action Taken *</label>
                <input
                  type="text"
                  required
                  value={actionForm.action_taken}
                  onChange={e => setActionForm({ ...actionForm, action_taken: e.target.value })}
                  placeholder="e.g. Installed astronomical timer relay on underground pumps"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Date Completed *</label>
                  <input
                    type="date"
                    required
                    value={actionForm.action_date}
                    onChange={e => setActionForm({ ...actionForm, action_date: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Person / Team Responsible</label>
                  <input
                    type="text"
                    value={actionForm.person_responsible}
                    onChange={e => setActionForm({ ...actionForm, person_responsible: e.target.value })}
                    placeholder="e.g. Suresh K. (Facility Lead)"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              {/* Operating Condition Before / After (Requirement 24) */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Previous Operating Condition</label>
                  <input
                    type="text"
                    value={actionForm.previous_condition}
                    onChange={e => setActionForm({ ...actionForm, previous_condition: e.target.value })}
                    placeholder="e.g. Pump timer: 6.5 hrs/day"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 text-[11px]"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">New Operating Condition</label>
                  <input
                    type="text"
                    value={actionForm.new_condition}
                    onChange={e => setActionForm({ ...actionForm, new_condition: e.target.value })}
                    placeholder="e.g. Astronomical timer: 4.5 hrs/day"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 text-[11px]"
                  />
                </div>
              </div>

              {/* Consumption Measurements */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                <span className="font-bold text-slate-800 block">Baseline vs Post-Action Monitoring</span>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-medium text-slate-600 block mb-1">Before Consumption (kWh)</label>
                    <input
                      type="number"
                      value={actionForm.before_consumption}
                      onChange={e => setActionForm({ ...actionForm, before_consumption: e.target.value })}
                      className="w-full px-3 py-1.5 border border-slate-300 rounded-lg bg-white"
                    />
                  </div>
                  <div>
                    <label className="font-medium text-slate-600 block mb-1">After Consumption (kWh)</label>
                    <input
                      type="number"
                      value={actionForm.after_consumption}
                      onChange={e => setActionForm({ ...actionForm, after_consumption: e.target.value })}
                      className="w-full px-3 py-1.5 border border-slate-300 rounded-lg bg-white"
                    />
                  </div>
                </div>

                {reductionKwh > 0 && (
                  <div className="p-2 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-800 text-[11px] font-semibold flex justify-between">
                    <span>Observed Reduction: {reductionKwh.toLocaleString()} kWh</span>
                    <span>{reductionPct}% Lower</span>
                  </div>
                )}
              </div>

              {/* Causality Caveat Notice */}
              <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-lg text-[10px] text-amber-800 flex items-start gap-1.5">
                <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                <p>
                  <strong>Mandatory Note:</strong> The recorded reduction evaluates post-action consumption against baseline. Other factors (weather variations, occupancy) may also have contributed.
                </p>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button variant="ghost" size="sm" onClick={() => setSelectedRecForAction(null)}>
                  Cancel
                </Button>
                <Button variant="primary" size="sm" type="submit" disabled={isSubmittingAction}>
                  {isSubmittingAction ? 'Saving...' : 'Confirm & Save Action'}
                </Button>
              </div>
            </form>
          )}
        </Modal>
      )}

      {/* Add Custom Recommendation Modal */}
      {newRecModalOpen && (
        <Modal
          isOpen={newRecModalOpen}
          onClose={() => setNewRecModalOpen(false)}
          title="Add Custom Energy Recommendation"
          subtitle="Propose a common-area energy adjustment for committee review"
          maxWidth="md"
        >
          <form onSubmit={handleCreateRecommendation} className="space-y-4 text-xs">
            <div>
              <label className="font-semibold text-slate-700 block mb-1">Title *</label>
              <input
                type="text"
                required
                value={newRecForm.title}
                onChange={e => setNewRecForm({ ...newRecForm, title: e.target.value })}
                placeholder="e.g. Schedule elevator bank standby mode during low-demand hours"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">Problem Observed & Evidence *</label>
              <textarea
                required
                rows={2}
                value={newRecForm.problem_observed}
                onChange={e => setNewRecForm({ ...newRecForm, problem_observed: e.target.value })}
                placeholder="Observed constant idling energy across 3 passenger elevators between 11 PM and 5 AM"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">Suggested Action *</label>
              <textarea
                required
                rows={2}
                value={newRecForm.suggested_action}
                onChange={e => setNewRecForm({ ...newRecForm, suggested_action: e.target.value })}
                placeholder="Park 2 of 3 lifts on ground floor standby after 11 PM; maintain 1 active lift"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Priority</label>
                <select
                  value={newRecForm.priority}
                  onChange={e => setNewRecForm({ ...newRecForm, priority: e.target.value as Priority })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white"
                >
                  <option value="high">High Priority</option>
                  <option value="medium">Medium Priority</option>
                  <option value="low">Low Priority</option>
                </select>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Potential Savings (₹/mo)</label>
                <input
                  type="number"
                  value={newRecForm.estimated_savings}
                  onChange={e => setNewRecForm({ ...newRecForm, estimated_savings: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Assignee</label>
                <input
                  type="text"
                  value={newRecForm.assigned_to}
                  onChange={e => setNewRecForm({ ...newRecForm, assigned_to: e.target.value })}
                  placeholder="e.g. Suresh K. (Facility Lead)"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                />
              </div>
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Target Due Date</label>
                <input
                  type="date"
                  value={newRecForm.due_date}
                  onChange={e => setNewRecForm({ ...newRecForm, due_date: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="ghost" size="sm" onClick={() => setNewRecModalOpen(false)}>
                Cancel
              </Button>
              <Button variant="primary" size="sm" type="submit">
                Submit Proposal
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};
