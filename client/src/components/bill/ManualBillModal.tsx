import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { Meter } from '../../types';

interface ManualBillModalProps {
  isOpen: boolean;
  onClose: () => void;
  meters: Meter[];
  onSubmit: (formData: any) => Promise<void>;
}

export const ManualBillModal: React.FC<ManualBillModalProps> = ({
  isOpen,
  onClose,
  meters,
  onSubmit
}) => {
  const [formData, setFormData] = useState({
    billing_period: '2026-03',
    meter_id: meters[0]?.id || '',
    units_kwh: '',
    bill_amount: '',
    fixed_charges: '',
    energy_charges: '',
    due_date: '',
    notes: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!formData.billing_period) {
      setErrorMessage('Billing period is required.');
      return;
    }
    const units = parseFloat(formData.units_kwh);
    if (isNaN(units) || units <= 0) {
      setErrorMessage('Units consumed must be greater than 0.');
      return;
    }
    const amount = parseFloat(formData.bill_amount);
    if (isNaN(amount) || amount <= 0) {
      setErrorMessage('Bill amount must be greater than 0.');
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit({
        ...formData,
        units_kwh: units,
        bill_amount: amount,
        fixed_charges: parseFloat(formData.fixed_charges || '0'),
        energy_charges: parseFloat(formData.energy_charges || amount.toString())
      });
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to save bill entry.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Manual Electricity Bill Entry"
      subtitle="Enter figures directly from your physical DISCOM or sub-meter reading ledger."
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4 text-xs">
        {errorMessage && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg">
            {errorMessage}
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Billing Period (YYYY-MM) *</label>
            <input
              type="text"
              name="billing_period"
              required
              value={formData.billing_period}
              onChange={handleChange}
              placeholder="e.g. 2026-03"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Target Meter</label>
            <select
              name="meter_id"
              value={formData.meter_id}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            >
              {meters.map(m => (
                <option key={m.id} value={m.id}>
                  {m.name} ({m.meter_number})
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Units Consumed (kWh) *</label>
            <input
              type="number"
              name="units_kwh"
              step="any"
              min="0.01"
              required
              value={formData.units_kwh}
              onChange={handleChange}
              placeholder="e.g. 18420"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Bill Amount (₹) *</label>
            <input
              type="number"
              name="bill_amount"
              step="any"
              min="1"
              required
              value={formData.bill_amount}
              onChange={handleChange}
              placeholder="e.g. 142380"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Fixed Charges (₹)</label>
            <input
              type="number"
              name="fixed_charges"
              value={formData.fixed_charges}
              onChange={handleChange}
              placeholder="e.g. 18000"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
            />
          </div>
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Energy Charges (₹)</label>
            <input
              type="number"
              name="energy_charges"
              value={formData.energy_charges}
              onChange={handleChange}
              placeholder="e.g. 124380"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
            />
          </div>
        </div>

        <div>
          <label className="block font-semibold text-slate-700 mb-1">Payment Due Date</label>
          <input
            type="date"
            name="due_date"
            value={formData.due_date}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
          />
        </div>

        <div>
          <label className="block font-semibold text-slate-700 mb-1">Notes / Observations (Optional)</label>
          <textarea
            name="notes"
            rows={2}
            value={formData.notes}
            onChange={handleChange}
            placeholder="e.g. Higher usage due to swimming pool pump refilling cycle"
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
          />
        </div>

        <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
          <Button type="button" variant="outline" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" size="sm" isLoading={isSubmitting}>
            Save Bill Entry
          </Button>
        </div>
      </form>
    </Modal>
  );
};
