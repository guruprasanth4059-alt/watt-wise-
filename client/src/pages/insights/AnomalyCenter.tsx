import React, { useEffect, useState } from 'react';
import { api } from '../../api/client';
import { IntervalAnomaly, AnomalySeverity, AnomalyStatus } from '../../types';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { Modal } from '../../components/common/Modal';
import { useAuth } from '../../context/AuthContext';
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Search,
  Filter,
  ArrowUpRight,
  ClipboardList,
  Wrench,
  HelpCircle,
  Activity,
  AlertCircle,
  Radio,
  FileCheck
} from 'lucide-react';

export const AnomalyCenter: React.FC = () => {
  const { user } = useAuth();
  const [anomalies, setAnomalies] = useState<IntervalAnomaly[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Investigation Modal State
  const [selectedAnomaly, setSelectedAnomaly] = useState<IntervalAnomaly | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [possibleCause, setPossibleCause] = useState('');
  const [notes, setNotes] = useState('');
  const [actionTaken, setActionTaken] = useState('');
  const [resolutionStatus, setResolutionStatus] = useState<AnomalyStatus>('resolved');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [actionMessage, setActionMessage] = useState('');

  const fetchAnomalies = async () => {
    setIsLoading(true);
    try {
      const data = await api.get<IntervalAnomaly[]>('/anomalies');
      setAnomalies(data || []);
    } catch (err) {
      console.error('Failed to load anomalies:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAnomalies();
  }, []);

  const handleOpenInvestigate = (anomaly: IntervalAnomaly) => {
    setSelectedAnomaly(anomaly);
    setPossibleCause(anomaly.explanation || '');
    setNotes('');
    setActionTaken('');
    setResolutionStatus('resolved');
    setIsModalOpen(true);
  };

  const handleQuickStatusChange = async (anomalyId: string, newStatus: AnomalyStatus) => {
    try {
      await api.patch(`/anomalies/${anomalyId}/status`, { status: newStatus });
      setAnomalies((prev) =>
        prev.map((a) => (a.id === anomalyId ? { ...a, status: newStatus } : a))
      );
      setActionMessage(`Anomaly marked as ${newStatus}`);
      setTimeout(() => setActionMessage(''), 3000);
    } catch (err) {
      console.error('Failed to update status:', err);
    }
  };

  const handleSubmitInvestigation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAnomaly) return;
    setIsSubmitting(true);
    try {
      await api.post(`/anomalies/${selectedAnomaly.id}/investigate`, {
        possible_cause: possibleCause,
        notes,
        action_taken: actionTaken,
        status: resolutionStatus
      });
      setIsModalOpen(false);
      fetchAnomalies();
      setActionMessage('Investigation recorded successfully');
      setTimeout(() => setActionMessage(''), 3000);
    } catch (err) {
      console.error('Failed to record investigation:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredAnomalies = anomalies.filter((a) => {
    if (severityFilter !== 'all' && a.severity !== severityFilter) return false;
    if (statusFilter !== 'all' && a.status !== statusFilter) return false;
    return true;
  });

  const totalCount = anomalies.length;
  const criticalCount = anomalies.filter((a) => a.severity === 'critical' || a.severity === 'high').length;
  const pendingCount = anomalies.filter((a) => a.status === 'new' || a.status === 'investigating').length;
  const resolvedCount = anomalies.filter((a) => a.status === 'resolved').length;

  const getSeverityBadge = (severity: AnomalySeverity) => {
    switch (severity) {
      case 'critical':
        return <Badge variant="red" size="sm">Critical</Badge>;
      case 'high':
        return <Badge variant="amber" size="sm">High Priority</Badge>;
      case 'medium':
        return <Badge variant="amber" size="sm">Medium</Badge>;
      default:
        return <Badge variant="blue" size="sm">Low</Badge>;
    }
  };

  const getStatusBadge = (status: AnomalyStatus) => {
    switch (status) {
      case 'new':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-rose-100 text-rose-800 border border-rose-200 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
            New Alert
          </span>
        );
      case 'investigating':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-100 text-amber-800 border border-amber-200">
            Investigating
          </span>
        );
      case 'resolved':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-200">
            Resolved
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-700">
            Dismissed
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/80 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-rose-600" />
              Interval Anomaly & Alert Center
            </h2>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
              Deterministic Engine
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Continuous 15-minute interval monitoring, abnormal load spike detection, and committee investigation logs.
          </p>
        </div>
      </div>

      {actionMessage && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center gap-2 animate-fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>{actionMessage}</span>
        </div>
      )}

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-4 bg-white border border-slate-200">
          <div className="flex justify-between items-center text-xs text-slate-500">
            <span>Total Logged</span>
            <Activity className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-2xl font-bold text-slate-900 mt-1">{totalCount}</div>
          <p className="text-[11px] text-slate-400 mt-0.5">Interval pattern alerts</p>
        </Card>

        <Card className="p-4 bg-white border border-rose-200 bg-rose-50/20">
          <div className="flex justify-between items-center text-xs text-rose-700 font-semibold">
            <span>Critical & High</span>
            <AlertTriangle className="w-4 h-4 text-rose-500" />
          </div>
          <div className="text-2xl font-bold text-rose-700 mt-1">{criticalCount}</div>
          <p className="text-[11px] text-rose-600 mt-0.5">Demands immediate action</p>
        </Card>

        <Card className="p-4 bg-white border border-amber-200 bg-amber-50/20">
          <div className="flex justify-between items-center text-xs text-amber-700 font-semibold">
            <span>Pending Review</span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-bold text-amber-700 mt-1">{pendingCount}</div>
          <p className="text-[11px] text-amber-600 mt-0.5">Active investigation needed</p>
        </Card>

        <Card className="p-4 bg-white border border-emerald-200 bg-emerald-50/20">
          <div className="flex justify-between items-center text-xs text-emerald-700 font-semibold">
            <span>Resolved</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-bold text-emerald-700 mt-1">{resolvedCount}</div>
          <p className="text-[11px] text-emerald-600 mt-0.5">Remedial action verified</p>
        </Card>
      </div>

      {/* Filter and Controls Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-semibold text-slate-600">Severity:</span>
          {['all', 'critical', 'high', 'medium', 'low'].map((sev) => (
            <button
              key={sev}
              type="button"
              onClick={() => setSeverityFilter(sev)}
              className={`px-2.5 py-1 rounded-md text-xs font-semibold capitalize transition-all cursor-pointer ${
                severityFilter === sev
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {sev}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-600">Status:</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs border border-slate-300 rounded-lg px-2.5 py-1.5 bg-slate-50 font-medium text-slate-800 focus:outline-hidden"
          >
            <option value="all">All Statuses</option>
            <option value="new">New Alerts</option>
            <option value="investigating">Investigating</option>
            <option value="resolved">Resolved</option>
            <option value="dismissed">Dismissed</option>
          </select>
        </div>
      </div>

      {/* Anomalies List */}
      {isLoading ? (
        <div className="p-12 text-center text-xs text-slate-400">Scanning telemetry alerts...</div>
      ) : filteredAnomalies.length === 0 ? (
        <Card className="p-10 text-center space-y-3">
          <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto" />
          <h3 className="text-base font-bold text-slate-800">No Anomalies Match Filters</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Your continuous smart meter telemetry is operating within expected nominal diurnal baselines.
          </p>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredAnomalies.map((a) => (
            <Card
              key={a.id}
              className={`p-5 border-l-4 transition-all ${
                a.severity === 'critical'
                  ? 'border-l-rose-500'
                  : a.severity === 'high'
                  ? 'border-l-amber-500'
                  : 'border-l-blue-500'
              }`}
            >
              <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                <div className="space-y-2 flex-1">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    {getSeverityBadge(a.severity)}
                    {getStatusBadge(a.status)}
                    <span className="text-xs font-bold text-slate-900 capitalize">
                      {a.type.replace(/_/g, ' ')}
                    </span>
                    <span className="text-[11px] text-slate-400 font-mono">
                      • {a.meter_name || 'Society Main Bus'}
                    </span>
                  </div>

                  <p className="text-xs font-medium text-slate-800">
                    {a.explanation || 'Abnormal consumption deviation detected against typical diurnal curve.'}
                  </p>

                  {/* Quantitative Deviation Block */}
                  <div className="flex items-center gap-4 text-xs bg-slate-50 p-2.5 rounded-lg border border-slate-100 flex-wrap">
                    <div>
                      <span className="text-slate-400">Observed: </span>
                      <span className="font-bold text-rose-600">{a.observed_value.toFixed(2)} kWh</span>
                    </div>
                    <div>
                      <span className="text-slate-400">Nominal Baseline: </span>
                      <span className="font-bold text-slate-700">{a.expected_value.toFixed(2)} kWh</span>
                    </div>
                    {a.deviation_percent && (
                      <div>
                        <span className="text-slate-400">Deviation: </span>
                        <span className="font-bold text-rose-600">+{a.deviation_percent}%</span>
                      </div>
                    )}
                    <div className="text-slate-400 text-[11px] ml-auto">
                      Started: {new Date(a.started_at).toLocaleString()}
                    </div>
                  </div>

                  {/* Recommended Checks */}
                  {a.recommended_checks && a.recommended_checks.length > 0 && (
                    <div className="space-y-1 pt-1">
                      <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                        Recommended RWA Field Inspection:
                      </span>
                      <ul className="list-disc list-inside text-xs text-slate-600 space-y-0.5">
                        {a.recommended_checks.map((check, idx) => (
                          <li key={idx}>{check}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Prior Investigation Logs */}
                  {a.investigations && a.investigations.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-slate-100 space-y-2">
                      <span className="text-[11px] font-bold text-indigo-900 uppercase tracking-wider flex items-center gap-1.5">
                        <FileCheck className="w-3.5 h-3.5 text-indigo-600" />
                        Investigation History ({a.investigations.length})
                      </span>
                      {a.investigations.map((inv) => (
                        <div key={inv.id} className="p-2.5 bg-indigo-50/50 rounded-lg text-xs space-y-1 border border-indigo-100">
                          <div className="flex justify-between text-[11px] text-slate-500">
                            <span className="font-semibold text-slate-800">
                              Logged by {inv.investigator_name || 'Society Admin'}
                            </span>
                            <span>{new Date(inv.created_at).toLocaleString()}</span>
                          </div>
                          {inv.possible_cause && (
                            <p className="text-slate-700">
                              <span className="font-medium text-slate-900">Cause: </span>
                              {inv.possible_cause}
                            </p>
                          )}
                          {inv.action_taken && (
                            <p className="text-emerald-700 font-medium">
                              <span className="font-semibold">Action Taken: </span>
                              {inv.action_taken}
                            </p>
                          )}
                          {inv.notes && <p className="text-slate-600 italic">"{inv.notes}"</p>}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Right Action Column */}
                <div className="flex flex-col sm:flex-row md:flex-col gap-2 shrink-0 md:w-44">
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => handleOpenInvestigate(a)}
                    icon={<Wrench className="w-3.5 h-3.5" />}
                    className="w-full text-xs"
                  >
                    Investigate & Log
                  </Button>

                  {a.status !== 'resolved' ? (
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => handleQuickStatusChange(a.id, 'resolved')}
                      icon={<CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />}
                      className="w-full text-xs"
                    >
                      Mark Resolved
                    </Button>
                  ) : (
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => handleQuickStatusChange(a.id, 'investigating')}
                      className="w-full text-xs"
                    >
                      Re-open Alert
                    </Button>
                  )}

                  {a.status !== 'dismissed' && (
                    <button
                      type="button"
                      onClick={() => handleQuickStatusChange(a.id, 'dismissed')}
                      className="text-slate-400 hover:text-slate-600 text-[11px] py-1 text-center cursor-pointer transition-colors"
                    >
                      Dismiss Alert
                    </button>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* INVESTIGATION MODAL */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Record Anomaly Investigation & Remedial Action"
      >
        <form onSubmit={handleSubmitInvestigation} className="space-y-4">
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1">
            <p className="font-bold text-slate-800">
              {selectedAnomaly?.meter_name || 'Society Main Bus'} — {selectedAnomaly?.type.replace(/_/g, ' ')}
            </p>
            <p className="text-slate-600">
              Observed {selectedAnomaly?.observed_value} kWh vs nominal {selectedAnomaly?.expected_value} kWh
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Identified Root Cause / Operational Reason
            </label>
            <input
              type="text"
              value={possibleCause}
              onChange={(e) => setPossibleCause(e.target.value)}
              placeholder="e.g. Overhead tank float switch stuck, pump ran dry overnight"
              className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Corrective Action Taken
            </label>
            <input
              type="text"
              value={actionTaken}
              onChange={(e) => setActionTaken(e.target.value)}
              placeholder="e.g. Cleaned float valve contacts and replaced auxiliary contactor"
              className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Field Inspection Notes & Observations
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add technician name, vendor details, or future preventive checks..."
              rows={3}
              className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Update Status To
            </label>
            <select
              value={resolutionStatus}
              onChange={(e) => setResolutionStatus(e.target.value as AnomalyStatus)}
              className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-hidden bg-white"
            >
              <option value="resolved">Resolved (Issue rectified on site)</option>
              <option value="investigating">Still Investigating (Vendor dispatched)</option>
              <option value="dismissed">Dismiss (False alarm / expected maintenance event)</option>
            </select>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setIsModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              isLoading={isSubmitting}
            >
              Save Investigation
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
