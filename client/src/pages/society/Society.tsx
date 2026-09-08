import React, { useEffect, useState } from 'react';
import { api } from '../../api/client';
import { Society } from '../../types';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { useAuth } from '../../context/AuthContext';
import { Building2, CheckCircle2, AlertCircle, Save } from 'lucide-react';

export const SocietyManagement: React.FC = () => {
  const { user, refreshProfile } = useAuth();
  const [society, setSociety] = useState<Society | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [form, setForm] = useState({
    name: '',
    location: '',
    city: '',
    apartments: 0,
    buildings: 0,
    floors: 0,
    facilities: [] as string[]
  });

  const allFacilities = [
    'Water Pumps',
    'Elevators',
    'Common Lighting',
    'Clubhouse',
    'Swimming Pool',
    'Gym',
    'Parking',
    'STP & Aeration'
  ];

  const fetchSociety = async () => {
    setIsLoading(true);
    try {
      const data = await api.get<Society>('/societies/current');
      setSociety(data);
      setForm({
        name: data.name,
        location: data.location,
        city: data.city || '',
        apartments: data.apartments,
        buildings: data.buildings,
        floors: data.floors,
        facilities: data.facilities || []
      });
    } catch (err) {
      console.error('Failed to load society profile:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSociety();
  }, []);

  const handleToggleFacility = (fac: string) => {
    if (form.facilities.includes(fac)) {
      setForm({ ...form, facilities: form.facilities.filter(f => f !== fac) });
    } else {
      setForm({ ...form, facilities: [...form.facilities, fac] });
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setMessage(null);
    try {
      await api.put('/societies/current', form);
      setMessage({ type: 'success', text: 'Society details saved successfully.' });
      refreshProfile();
      fetchSociety();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to update society details.' });
    } finally {
      setIsSaving(false);
    }
  };

  const canEdit = user?.role === 'society_admin';

  if (isLoading) {
    return <div className="p-12 text-center text-xs text-slate-400">Loading society parameters...</div>;
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
          <Building2 className="w-5 h-5 text-emerald-600" />
          Apartment Society Profile
        </h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Manage campus parameters, apartment counts, and configured common-area facilities.
        </p>
      </div>

      {message && (
        <div
          className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
            message.type === 'success'
              ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border border-rose-200 text-rose-800'
          }`}
        >
          {message.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-600" />
          )}
          <span>{message.text}</span>
        </div>
      )}

      <Card className="p-6">
        <form onSubmit={handleSave} className="space-y-5 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Apartment Society Name *</label>
              <input
                type="text"
                disabled={!canEdit}
                required
                value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm disabled:bg-slate-50"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">City *</label>
              <input
                type="text"
                disabled={!canEdit}
                required
                value={form.city}
                onChange={e => setForm({ ...form, city: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm disabled:bg-slate-50"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Street Address / Locality</label>
            <input
              type="text"
              disabled={!canEdit}
              value={form.location}
              onChange={e => setForm({ ...form, location: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm disabled:bg-slate-50"
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Total Apartments *</label>
              <input
                type="number"
                disabled={!canEdit}
                min="1"
                required
                value={form.apartments}
                onChange={e => setForm({ ...form, apartments: parseInt(e.target.value, 10) || 0 })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm disabled:bg-slate-50"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Buildings / Towers</label>
              <input
                type="number"
                disabled={!canEdit}
                min="1"
                value={form.buildings}
                onChange={e => setForm({ ...form, buildings: parseInt(e.target.value, 10) || 0 })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm disabled:bg-slate-50"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Max Floors</label>
              <input
                type="number"
                disabled={!canEdit}
                min="1"
                value={form.floors}
                onChange={e => setForm({ ...form, floors: parseInt(e.target.value, 10) || 0 })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm disabled:bg-slate-50"
              />
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100">
            <label className="block font-semibold text-slate-800 mb-2">Configured Common Facilities</label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {allFacilities.map(f => {
                const checked = form.facilities.includes(f);
                return (
                  <button
                    type="button"
                    key={f}
                    disabled={!canEdit}
                    onClick={() => handleToggleFacility(f)}
                    className={`p-2 rounded-lg border text-left flex items-center justify-between text-xs transition-colors ${
                      checked
                        ? 'bg-emerald-50 text-emerald-900 border-emerald-300 font-semibold'
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <span>{f}</span>
                    {checked && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />}
                  </button>
                );
              })}
            </div>
          </div>

          {canEdit && (
            <div className="flex justify-end pt-4 border-t border-slate-100">
              <Button type="submit" variant="primary" size="md" isLoading={isSaving} icon={<Save className="w-4 h-4" />}>
                Save Changes
              </Button>
            </div>
          )}
        </form>
      </Card>
    </div>
  );
};
