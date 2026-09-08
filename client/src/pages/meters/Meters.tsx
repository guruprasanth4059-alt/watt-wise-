import React, { useEffect, useState } from 'react';
import { api } from '../../api/client';
import { Meter, MeterType } from '../../types';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';
import { useAuth } from '../../context/AuthContext';
import { Gauge, PlusCircle, CheckCircle2, AlertCircle, Droplets, Lightbulb, Building, Zap } from 'lucide-react';

export const Meters: React.FC = () => {
  const { user } = useAuth();
  const [meters, setMeters] = useState<Meter[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const [formData, setFormData] = useState({
    name: '',
    meter_number: '',
    type: 'pump' as MeterType,
    building: '',
    area: ''
  });

  const fetchMeters = async () => {
    setIsLoading(true);
    try {
      const data = await api.get<Meter[]>('/meters');
      setMeters(data);
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
    setErrorMessage('');
    if (!formData.name || !formData.meter_number) {
      setErrorMessage('Meter name and consumer/meter number are required.');
      return;
    }

    setIsSubmitting(true);
    try {
      await api.post('/meters', formData);
      setIsModalOpen(false);
      setFormData({
        name: '',
        meter_number: '',
        type: 'pump',
        building: '',
        area: ''
      });
      fetchMeters();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to create meter.');
    } finally {
      setIsSubmitting(false);
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

  const canEdit = user?.role === 'society_admin';

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Society Meter Panels</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Configure main utility feeder panels and internal common-area sub-meters.
          </p>
        </div>

        {canEdit && (
          <Button
            variant="primary"
            size="sm"
            onClick={() => setIsModalOpen(true)}
            icon={<PlusCircle className="w-4 h-4" />}
          >
            Add New Meter
          </Button>
        )}
      </div>

      {/* MVP Limitations notice (Section 21 & Section 54) */}
      <div className="p-3.5 bg-slate-100 border border-slate-200 rounded-xl text-xs text-slate-600 flex items-start gap-2.5">
        <AlertCircle className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
        <div>
          <span className="font-semibold text-slate-800">Manual & Invoice Ingestion: </span>
          WattWise MVP uses verified monthly utility bills and manual log sheet readings. Real-time smart-meter telemetry and DISCOM API synchronizations are roadmapped for subsequent phases.
        </div>
      </div>

      {/* Meter Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {meters.map(meter => (
          <Card key={meter.id} className="p-5 flex flex-col justify-between space-y-4">
            <div className="space-y-2">
              <div className="flex items-start justify-between">
                <div className="p-2 rounded-xl bg-slate-100 shrink-0">
                  {getMeterIcon(meter.type)}
                </div>
                <Badge variant={meter.type === 'pump' ? 'blue' : meter.type === 'lighting' ? 'amber' : 'emerald'} size="sm">
                  {meter.type.replace('_', ' ')}
                </Badge>
              </div>

              <div>
                <h3 className="text-sm font-bold text-slate-900">{meter.name}</h3>
                <p className="text-xs text-slate-500 font-mono mt-0.5">{meter.meter_number}</p>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 text-xs text-slate-500 space-y-1">
              <div className="flex justify-between">
                <span>Building / Block:</span>
                <span className="font-medium text-slate-700">{meter.building || 'General'}</span>
              </div>
              <div className="flex justify-between">
                <span>Location / Area:</span>
                <span className="font-medium text-slate-700">{meter.area || 'Common Panels'}</span>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Add Meter Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Register New Meter or Sub-Panel"
        subtitle="Add a sub-meter to isolate pump, lighting, or clubhouse consumption."
        maxWidth="md"
      >
        <form onSubmit={handleCreateMeter} className="space-y-4 text-xs">
          {errorMessage && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg">
              {errorMessage}
            </div>
          )}

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Meter Display Name *</label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={e => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g. Tower C Water Booster Pump"
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
              placeholder="e.g. KA-04-WP-99212"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-mono focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Meter Load Category *</label>
            <select
              value={formData.type}
              onChange={e => setFormData({ ...formData, type: e.target.value as MeterType })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            >
              <option value="common_area">Common Area (Main Consolidated)</option>
              <option value="pump">💧 Water Pumps (Hydro-pneumatic & Booster)</option>
              <option value="lighting">💡 Common Lighting (Basement, Security, Driveway)</option>
              <option value="elevator">🛗 Passenger & Service Elevators</option>
              <option value="clubhouse">🏊 Clubhouse, Gym & Swimming Pool</option>
              <option value="parking">🚗 Basement & Parking Fans</option>
              <option value="other">🔌 Other Auxiliary Facilities</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Building / Tower</label>
              <input
                type="text"
                value={formData.building}
                onChange={e => setFormData({ ...formData, building: e.target.value })}
                placeholder="e.g. Basement 2"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Area / Room</label>
              <input
                type="text"
                value={formData.area}
                onChange={e => setFormData({ ...formData, area: e.target.value })}
                placeholder="e.g. Pump Room"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <Button type="button" variant="outline" size="sm" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm" isLoading={isSubmitting}>
              Register Meter
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
