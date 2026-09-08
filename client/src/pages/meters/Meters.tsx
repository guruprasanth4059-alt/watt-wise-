import React, { useEffect, useState } from 'react';
import { api } from '../../api/client';
import { Meter, MeterType, MeterSource } from '../../types';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';
import { useAuth } from '../../context/AuthContext';
import {
  Gauge,
  PlusCircle,
  CheckCircle2,
  AlertCircle,
  Droplets,
  Lightbulb,
  Building,
  Zap,
  Wifi,
  WifiOff,
  RefreshCw,
  Activity,
  Sliders,
  Radio,
  Clock,
  ExternalLink
} from 'lucide-react';

export const Meters: React.FC = () => {
  const { user } = useAuth();
  const [meters, setMeters] = useState<Meter[]>([]);
  const [providers, setProviders] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedMeter, setSelectedMeter] = useState<Meter | null>(null);
  const [syncingMeterId, setSyncingMeterId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Add Meter Form State
  const [meterSource, setMeterSource] = useState<'manual' | 'smart_meter'>('manual');
  const [formData, setFormData] = useState({
    name: '',
    meter_number: '',
    type: 'pump' as MeterType,
    building: '',
    area: '',
    category: 'pump',
    providerId: 'simulated_smart_meter',
    externalMeterId: ''
  });

  const fetchMeters = async () => {
    setIsLoading(true);
    try {
      const [metersData, providersData] = await Promise.all([
        api.get<Meter[]>('/meters'),
        api.get<any[]>('/meters/providers')
      ]);
      setMeters(metersData);
      setProviders(providersData);
    } catch (err) {
      console.error('Failed to load meters:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMeters();
  }, []);

  const handleCreateMeter = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedbackMessage(null);
    if (!formData.name || !formData.meter_number) {
      setFeedbackMessage({ type: 'error', text: 'Meter name and meter number are required.' });
      return;
    }

    setIsSubmitting(true);
    try {
      // 1. Create meter
      const res = await api.post<{ meter: Meter }>('/meters', {
        name: formData.name,
        meter_number: formData.meter_number,
        type: formData.type,
        building: formData.building,
        area: formData.area,
        category: formData.category,
        data_source: meterSource === 'smart_meter' ? 'demo' : 'manual'
      });

      // 2. If smart meter, connect provider
      if (meterSource === 'smart_meter' && res.meter) {
        await api.post(`/meters/${res.meter.id}/connect`, {
          providerId: formData.providerId,
          externalMeterId: formData.externalMeterId || `EXT-${formData.meter_number}`,
          config: {}
        });

        // Trigger initial sync
        await api.post(`/meters/${res.meter.id}/sync`, { daysBack: 7 });
      }

      setIsModalOpen(false);
      setFormData({
        name: '',
        meter_number: '',
        type: 'pump',
        building: '',
        area: '',
        category: 'pump',
        providerId: 'simulated_smart_meter',
        externalMeterId: ''
      });
      setFeedbackMessage({ type: 'success', text: 'Meter registered and initialized successfully.' });
      fetchMeters();
    } catch (err: any) {
      setFeedbackMessage({ type: 'error', text: err.message || 'Failed to register meter.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleTriggerSync = async (meterId: string) => {
    setSyncingMeterId(meterId);
    setFeedbackMessage(null);
    try {
      const res = await api.post<any>(`/meters/${meterId}/sync`, { daysBack: 7 });
      setFeedbackMessage({
        type: 'success',
        text: `Sync complete: ${res.result.recordsIngested} interval readings refreshed. Detected anomalies: ${res.result.anomaliesDetected}.`
      });
      fetchMeters();
      if (selectedMeter && selectedMeter.id === meterId) {
        setSelectedMeter({ ...selectedMeter, connection_status: 'connected', last_sync_at: new Date().toISOString() });
      }
    } catch (err: any) {
      setFeedbackMessage({ type: 'error', text: err.message || 'Synchronization failed.' });
    } finally {
      setSyncingMeterId(null);
    }
  };

  const handleDisconnect = async (meterId: string) => {
    if (!window.confirm('Disconnect smart meter provider? Historical telemetry will be preserved.')) return;
    try {
      await api.post(`/meters/${meterId}/disconnect`, {});
      setFeedbackMessage({ type: 'success', text: 'Meter disconnected. Historical telemetry preserved.' });
      setIsDetailModalOpen(false);
      fetchMeters();
    } catch (err: any) {
      setFeedbackMessage({ type: 'error', text: err.message || 'Failed to disconnect meter.' });
    }
  };

  const getMeterIcon = (type: string) => {
    switch (type) {
      case 'pump':
        return <Droplets className="w-5 h-5 text-blue-600" />;
      case 'lighting':
        return <Lightbulb className="w-5 h-5 text-amber-500" />;
      case 'elevator':
      case 'building':
        return <Building className="w-5 h-5 text-purple-600" />;
      default:
        return <Zap className="w-5 h-5 text-emerald-600" />;
    }
  };

  const getConnectionBadge = (status?: string, source?: string) => {
    if (source === 'demo') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
          <Activity className="w-3 h-3 text-amber-600 animate-pulse" />
          SIMULATED SMART METER
        </span>
      );
    }
    switch (status) {
      case 'connected':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
            <Wifi className="w-3 h-3 text-emerald-600" />
            Connected
          </span>
        );
      case 'syncing':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-100 text-sky-800">
            <RefreshCw className="w-3 h-3 text-sky-600 animate-spin" />
            Syncing
          </span>
        );
      case 'sync_error':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800">
            <AlertCircle className="w-3 h-3 text-rose-600" />
            Sync Error
          </span>
        );
      case 'disconnected':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600">
            <WifiOff className="w-3 h-3 text-slate-400" />
            Disconnected
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-500">
            Manual Ingestion
          </span>
        );
    }
  };

  const canEdit = user?.role === 'society_admin';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Gauge className="w-5 h-5 text-emerald-600" />
            Society Meter Panels & Smart Connectivity
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Configure main utility feeder panels, IoT smart meters, and internal common-area sub-meters.
          </p>
        </div>

        {canEdit && (
          <Button
            variant="primary"
            size="sm"
            onClick={() => setIsModalOpen(true)}
            icon={<PlusCircle className="w-4 h-4" />}
          >
            Add / Connect Meter
          </Button>
        )}
      </div>

      {/* Feedback message banner */}
      {feedbackMessage && (
        <div
          className={`p-3.5 rounded-xl text-xs flex items-center justify-between ${
            feedbackMessage.type === 'success'
              ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border border-rose-200 text-rose-800'
          }`}
        >
          <div className="flex items-center gap-2">
            {feedbackMessage.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span>{feedbackMessage.text}</span>
          </div>
          <button onClick={() => setFeedbackMessage(null)} className="text-slate-400 hover:text-slate-600 text-sm font-bold">
            ×
          </button>
        </div>
      )}

      {/* Hybrid Ingestion Notice */}
      <div className="p-3.5 bg-gradient-to-r from-emerald-50 to-sky-50 border border-emerald-200/80 rounded-2xl text-xs text-slate-700 flex items-start gap-3">
        <Wifi className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-bold text-slate-900">
            Hybrid Ingestion Support: Smart Meters & Monthly Utility Bills
          </p>
          <p className="text-[11px] text-slate-600 leading-relaxed">
            WattWise ingests 15-minute telemetry from connected IoT smart meters while simultaneously maintaining verified DISCOM invoices as the authoritative financial source of record. Both manual and automated meters coexist harmoniously.
          </p>
        </div>
      </div>

      {/* Meter Cards Grid */}
      {isLoading ? (
        <div className="p-12 text-center text-xs text-slate-400">Loading society meter panels...</div>
      ) : meters.length === 0 ? (
        <Card className="p-12 text-center space-y-3">
          <Gauge className="w-10 h-10 text-slate-400 mx-auto" />
          <h3 className="text-base font-bold text-slate-800">No Meter Panels Configured</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Click Add / Connect Meter to configure your main DISCOM feeder panel or sub-meter loads.
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {meters.map(meter => {
            const isConnected = meter.connection_status === 'connected' || meter.data_source === 'demo';
            return (
              <Card key={meter.id} className="p-5 flex flex-col justify-between space-y-4 hover:border-slate-300 transition-all shadow-xs">
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="p-2.5 rounded-xl bg-slate-100 shrink-0">
                      {getMeterIcon(meter.type)}
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      {getConnectionBadge(meter.connection_status, meter.data_source)}
                      <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">
                        {meter.type.replace('_', ' ')}
                      </span>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-sm font-bold text-slate-900">{meter.name}</h3>
                    <p className="text-xs text-slate-500 font-mono mt-0.5">{meter.meter_number}</p>
                  </div>

                  {meter.data_source === 'demo' && (
                    <div className="p-2 bg-amber-50/80 border border-amber-200/80 rounded-lg text-[10px] text-amber-800">
                      <strong>DEMO / SIMULATED DATA:</strong> Generating 15-min synthetic intervals with diurnal load profile for testing.
                    </div>
                  )}
                </div>

                <div className="pt-3 border-t border-slate-100 text-xs text-slate-500 space-y-2">
                  <div className="flex justify-between text-[11px]">
                    <span>Building / Location:</span>
                    <span className="font-semibold text-slate-700">{meter.building || meter.area || 'Common Panel'}</span>
                  </div>

                  {meter.last_sync_at && (
                    <div className="flex justify-between text-[11px]">
                      <span>Last Synchronized:</span>
                      <span className="font-mono text-slate-700">
                        {new Date(meter.last_sync_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex items-center gap-2 pt-2">
                    {isConnected ? (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1 text-xs py-1"
                          onClick={() => handleTriggerSync(meter.id)}
                          isLoading={syncingMeterId === meter.id}
                          icon={<RefreshCw className="w-3 h-3" />}
                        >
                          Sync Now
                        </Button>
                        <Button
                          variant="secondary"
                          size="sm"
                          className="text-xs py-1"
                          onClick={() => {
                            setSelectedMeter(meter);
                            setIsDetailModalOpen(true);
                          }}
                        >
                          Diagnostics
                        </Button>
                      </>
                    ) : (
                      canEdit && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full text-xs py-1"
                          onClick={() => {
                            setSelectedMeter(meter);
                            setFormData(prev => ({
                              ...prev,
                              name: meter.name,
                              meter_number: meter.meter_number,
                              type: meter.type
                            }));
                            setMeterSource('smart_meter');
                            setIsModalOpen(true);
                          }}
                          icon={<Wifi className="w-3 h-3 text-emerald-600" />}
                        >
                          Connect Smart Meter
                        </Button>
                      )
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Add / Connect Meter Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Add or Connect Meter Panel"
        subtitle="Configure physical panels, DISCOM meters, or automated IoT smart meters."
        maxWidth="md"
      >
        <form onSubmit={handleCreateMeter} className="space-y-4 text-xs">
          {/* Source Tabs */}
          <div className="flex bg-slate-100 p-1 rounded-xl text-xs font-semibold">
            <button
              type="button"
              onClick={() => setMeterSource('manual')}
              className={`flex-1 py-1.5 rounded-lg transition-all ${
                meterSource === 'manual' ? 'bg-white text-slate-900 shadow-xs font-bold' : 'text-slate-600'
              }`}
            >
              Manual / Invoiced Meter
            </button>
            <button
              type="button"
              onClick={() => setMeterSource('smart_meter')}
              className={`flex-1 py-1.5 rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                meterSource === 'smart_meter' ? 'bg-white text-slate-900 shadow-xs font-bold' : 'text-slate-600'
              }`}
            >
              <Wifi className="w-3.5 h-3.5 text-emerald-600" />
              Connect Smart Meter (IoT)
            </button>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Meter Display Name *</label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={e => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g. Tower A Water Pumps Panel"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Meter / Consumer Number *</label>
            <input
              type="text"
              required
              value={formData.meter_number}
              onChange={e => setFormData({ ...formData, meter_number: e.target.value })}
              placeholder="e.g. KA-BESCOM-PUMP-01"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-mono focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Load Category</label>
              <select
                value={formData.type}
                onChange={e => setFormData({ ...formData, type: e.target.value as MeterType, category: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white"
              >
                <option value="common_area">Main Consolidated</option>
                <option value="pump">💧 Water Pumps</option>
                <option value="lighting">💡 Common Lighting</option>
                <option value="elevator">🛗 Elevators</option>
                <option value="clubhouse">🏊 Clubhouse & Pool</option>
                <option value="parking">🚗 Parking Deck</option>
              </select>
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Building / Location</label>
              <input
                type="text"
                value={formData.building}
                onChange={e => setFormData({ ...formData, building: e.target.value })}
                placeholder="e.g. Tower 1 Sump"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
              />
            </div>
          </div>

          {/* Smart Meter Provider Configuration */}
          {meterSource === 'smart_meter' && (
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-800 flex items-center gap-1.5">
                  <Radio className="w-4 h-4 text-emerald-600" />
                  Smart Meter Provider Configuration
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 bg-amber-100 text-amber-800 rounded">
                  DEMO MODE
                </span>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Supported Provider</label>
                <select
                  value={formData.providerId}
                  onChange={e => setFormData({ ...formData, providerId: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white"
                >
                  {providers.map(p => (
                    <option key={p.providerId} value={p.providerId}>
                      {p.providerName}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">External Telemetry ID</label>
                <input
                  type="text"
                  value={formData.externalMeterId}
                  onChange={e => setFormData({ ...formData, externalMeterId: e.target.value })}
                  placeholder="e.g. EXT-SIM-PUMP-02"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-mono"
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  Connecting to this provider will automatically ingest 7 days of 15-minute interval telemetry.
                </p>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <Button type="button" variant="outline" size="sm" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm" isLoading={isSubmitting}>
              {meterSource === 'smart_meter' ? 'Connect & Start Ingestion' : 'Save Meter'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Meter Diagnostics & Connection Modal */}
      {selectedMeter && (
        <Modal
          isOpen={isDetailModalOpen}
          onClose={() => setIsDetailModalOpen(false)}
          title={`Diagnostics: ${selectedMeter.name}`}
          subtitle={`Telemetry parameters for meter ${selectedMeter.meter_number}`}
          maxWidth="md"
        >
          <div className="space-y-4 text-xs">
            <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
              <div>
                <span className="text-slate-500 block">Connection Status</span>
                <span className="font-bold text-slate-900 capitalize">{selectedMeter.connection_status || 'Connected'}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Ingestion Source</span>
                <span className="font-bold text-slate-900 uppercase">{selectedMeter.data_source || 'Smart Meter'}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Last Successful Sync</span>
                <span className="font-mono text-slate-900">
                  {selectedMeter.last_sync_at ? new Date(selectedMeter.last_sync_at).toLocaleString() : 'Just now'}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block">Interval Telemetry Records</span>
                <span className="font-bold text-emerald-700">{selectedMeter.records_received || 672} packets</span>
              </div>
            </div>

            {selectedMeter.data_source === 'demo' && (
              <div className="p-3 bg-amber-50 border border-amber-200 text-amber-800 rounded-xl text-[11px]">
                <strong>SIMULATED DATASET:</strong> Generated for demo and validation purposes. Diurnal profile and controlled anomaly events injected for committee review.
              </div>
            )}

            <div className="flex justify-between items-center pt-3 border-t border-slate-100">
              <Button
                variant="outline"
                size="sm"
                className="text-rose-600 border-rose-200 hover:bg-rose-50"
                onClick={() => handleDisconnect(selectedMeter.id)}
              >
                Disconnect Provider
              </Button>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setIsDetailModalOpen(false)}>
                  Close
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  isLoading={syncingMeterId === selectedMeter.id}
                  onClick={() => handleTriggerSync(selectedMeter.id)}
                  icon={<RefreshCw className="w-3.5 h-3.5" />}
                >
                  Sync Telemetry Now
                </Button>
              </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
