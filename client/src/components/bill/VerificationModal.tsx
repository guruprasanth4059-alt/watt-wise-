import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { Badge } from '../common/Badge';
import { Check, Edit2, AlertCircle, FileCheck } from 'lucide-react';
import { Meter } from '../../types';

interface VerificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  extractedData: {
    billingPeriod: string;
    meterNumber: string;
    unitsKwh: number;
    billAmount: number;
    fixedCharges: number;
    energyCharges: number;
    dueDate: string;
    confidence: 'high' | 'medium' | 'low';
    rawSnippet?: string;
  };
  meters: Meter[];
  fileUrl?: string;
  fileName?: string;
  onConfirm: (confirmedData: any) => Promise<void>;
}

export const VerificationModal: React.FC<VerificationModalProps> = ({
  isOpen,
  onClose,
  extractedData,
  meters,
  fileUrl,
  fileName,
  onConfirm
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    billing_period: extractedData.billingPeriod || '2026-03',
    meter_id: meters[0]?.id || '',
    meter_number: extractedData.meterNumber || '',
    units_kwh: extractedData.unitsKwh || 0,
    bill_amount: extractedData.billAmount || 0,
    fixed_charges: extractedData.fixedCharges || 0,
    energy_charges: extractedData.energyCharges || 0,
    due_date: extractedData.dueDate || '',
    notes: 'Verified from uploaded bill'
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleConfirm = async () => {
    setErrorMessage('');
    if (!formData.billing_period) {
      setErrorMessage('Billing period is required.');
      return;
    }
    if (Number(formData.units_kwh) <= 0) {
      setErrorMessage('Units consumed must be greater than 0.');
      return;
    }
    if (Number(formData.bill_amount) <= 0) {
      setErrorMessage('Bill amount must be greater than 0.');
      return;
    }

    setIsSubmitting(true);
    try {
      await onConfirm({
        ...formData,
        file_url: fileUrl,
        file_name: fileName
      });
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to confirm bill.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Verify Extracted Electricity Bill"
      subtitle="Extracted values require human verification before being committed to your society's ledger."
      maxWidth="lg"
    >
      <div className="space-y-4">
        {/* Verification Alert */}
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-2.5 text-xs text-amber-800">
          <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">Verification Step Required</p>
            <p className="text-amber-700 mt-0.5">
              Extracted information does NOT automatically become trusted data. Check the extracted figures against your invoice and click Confirm Data to save.
            </p>
          </div>
        </div>

        {errorMessage && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg">
            {errorMessage}
          </div>
        )}

        {/* Display Card / Edit Form */}
        {!isEditing ? (
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3 text-sm">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200/80">
              <div>
                <span className="text-xs text-slate-500 font-medium">Source Document:</span>
                <p className="font-semibold text-slate-800">{fileName || 'Electricity_Bill.pdf'}</p>
              </div>
              <Badge variant="emerald" size="sm">
                <FileCheck className="w-3 h-3" />
                OCR Confidence: {extractedData.confidence}
              </Badge>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-xs text-slate-500">Billing Period:</span>
                <p className="text-base font-bold text-slate-900">{formData.billing_period}</p>
              </div>
              <div>
                <span className="text-xs text-slate-500">Consumer / Meter No:</span>
                <p className="text-base font-semibold text-slate-800">{formData.meter_number || 'BESCOM Main'}</p>
              </div>
              <div>
                <span className="text-xs text-slate-500">Units Consumed:</span>
                <p className="text-lg font-bold text-emerald-600">{Number(formData.units_kwh).toLocaleString()} kWh</p>
              </div>
              <div>
                <span className="text-xs text-slate-500">Total Bill Amount:</span>
                <p className="text-lg font-bold text-slate-900">₹{Number(formData.bill_amount).toLocaleString()}</p>
              </div>
              <div>
                <span className="text-xs text-slate-500">Fixed Charges:</span>
                <p className="font-medium text-slate-700">₹{Number(formData.fixed_charges).toLocaleString()}</p>
              </div>
              <div>
                <span className="text-xs text-slate-500">Energy Charges:</span>
                <p className="font-medium text-slate-700">₹{Number(formData.energy_charges).toLocaleString()}</p>
              </div>
            </div>

            {formData.due_date && (
              <div className="pt-2 border-t border-slate-200/80 text-xs text-slate-500">
                Payment Due Date: <span className="font-medium text-slate-700">{formData.due_date}</span>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-3 text-xs bg-slate-50 p-4 rounded-xl border border-slate-200">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Billing Period (YYYY-MM)</label>
                <input
                  type="text"
                  name="billing_period"
                  value={formData.billing_period}
                  onChange={handleChange}
                  className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Assign Meter</label>
                <select
                  name="meter_id"
                  value={formData.meter_id}
                  onChange={handleChange}
                  className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-sm bg-white"
                >
                  {meters.map(m => (
                    <option key={m.id} value={m.id}>
                      {m.name} ({m.meter_number})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Units Consumed (kWh) *</label>
                <input
                  type="number"
                  name="units_kwh"
                  value={formData.units_kwh}
                  onChange={handleChange}
                  className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-sm font-semibold"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Total Bill Amount (₹) *</label>
                <input
                  type="number"
                  name="bill_amount"
                  value={formData.bill_amount}
                  onChange={handleChange}
                  className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-sm font-semibold"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Fixed Charges (₹)</label>
                <input
                  type="number"
                  name="fixed_charges"
                  value={formData.fixed_charges}
                  onChange={handleChange}
                  className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Energy Charges (₹)</label>
                <input
                  type="number"
                  name="energy_charges"
                  value={formData.energy_charges}
                  onChange={handleChange}
                  className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-sm"
                />
              </div>
            </div>
          </div>
        )}

        {/* Buttons */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-100">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setIsEditing(!isEditing)}
            icon={<Edit2 className="w-3.5 h-3.5" />}
          >
            {isEditing ? 'Done Editing' : 'Edit Values'}
          </Button>

          <div className="flex items-center gap-2">
            <Button type="button" variant="ghost" size="sm" onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="button"
              variant="primary"
              size="sm"
              isLoading={isSubmitting}
              onClick={handleConfirm}
              icon={<Check className="w-4 h-4" />}
            >
              Confirm Data
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
};
