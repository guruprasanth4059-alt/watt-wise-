import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { Badge } from '../common/Badge';
import { Check, AlertTriangle, XCircle, ArrowRight } from 'lucide-react';

interface CsvMappingWizardProps {
  isOpen: boolean;
  onClose: () => void;
  headers: string[];
  sampleRows: Record<string, string>[];
  totalRows: number;
  onImport: (mapping: Record<string, string>) => Promise<void>;
}

export const CsvMappingWizard: React.FC<CsvMappingWizardProps> = ({
  isOpen,
  onClose,
  headers,
  sampleRows,
  totalRows,
  onImport
}) => {
  const targetFields = [
    { key: 'billing_period', label: 'Billing Period (e.g. 2026-03 or Mar 2026)', required: true },
    { key: 'units_kwh', label: 'Units Consumed (kWh)', required: true },
    { key: 'bill_amount', label: 'Total Bill Amount (₹)', required: true },
    { key: 'fixed_charges', label: 'Fixed Charges (₹)', required: false },
    { key: 'energy_charges', label: 'Energy Charges (₹)', required: false }
  ];

  // Auto-guess initial mapping based on header names
  const initialMapping: Record<string, string> = {};
  targetFields.forEach(f => {
    const match = headers.find(h =>
      h.toLowerCase().includes(f.key.toLowerCase()) ||
      (f.key === 'units_kwh' && (h.toLowerCase().includes('unit') || h.toLowerCase().includes('kwh'))) ||
      (f.key === 'bill_amount' && (h.toLowerCase().includes('amount') || h.toLowerCase().includes('total') || h.toLowerCase().includes('bill'))) ||
      (f.key === 'billing_period' && (h.toLowerCase().includes('period') || h.toLowerCase().includes('month') || h.toLowerCase().includes('date')))
    );
    if (match) {
      initialMapping[f.key] = match;
    } else {
      initialMapping[f.key] = headers[0] || '';
    }
  });

  const [mapping, setMapping] = useState<Record<string, string>>(initialMapping);
  const [step, setStep] = useState<'map' | 'preview'>('map');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);

  const handleMappingChange = (targetKey: string, uploadedHeader: string) => {
    setMapping(prev => ({ ...prev, [targetKey]: uploadedHeader }));
  };

  const handleProceedToPreview = () => {
    // Validate required fields mapped
    if (!mapping.billing_period || !mapping.units_kwh || !mapping.bill_amount) {
      setErrors(['Billing Period, Units Consumed, and Bill Amount must be mapped to valid columns.']);
      return;
    }
    setErrors([]);
    setStep('preview');
  };

  const handleConfirmImport = async () => {
    setIsSubmitting(true);
    try {
      await onImport(mapping);
      onClose();
    } catch (err: any) {
      setErrors([err.message || 'Failed to complete CSV import.']);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="CSV / Spreadsheet Import Wizard"
      subtitle={step === 'map' ? 'Map columns from your spreadsheet to standard WattWise fields.' : 'Review validation results before importing records.'}
      maxWidth="lg"
    >
      <div className="space-y-4">
        {errors.length > 0 && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg space-y-1">
            {errors.map((e, idx) => (
              <p key={idx} className="flex items-center gap-1.5">
                <XCircle className="w-3.5 h-3.5 shrink-0" />
                {e}
              </p>
            ))}
          </div>
        )}

        {step === 'map' ? (
          <div className="space-y-3">
            <p className="text-xs text-slate-500">
              Detected <span className="font-bold text-slate-800">{totalRows}</span> rows and{' '}
              <span className="font-bold text-slate-800">{headers.length}</span> columns.
            </p>

            <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden text-xs">
              <div className="bg-slate-50 p-2.5 font-semibold text-slate-700 grid grid-cols-2">
                <span>Standard WattWise Field</span>
                <span>Uploaded Spreadsheet Column</span>
              </div>
              {targetFields.map(field => (
                <div key={field.key} className="p-3 grid grid-cols-2 gap-3 items-center bg-white">
                  <div>
                    <span className="font-semibold text-slate-800">{field.label}</span>
                    {field.required && <span className="text-rose-500 ml-1 font-bold">*</span>}
                  </div>
                  <select
                    value={mapping[field.key] || ''}
                    onChange={e => handleMappingChange(field.key, e.target.value)}
                    className="px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  >
                    <option value="">-- Select Column --</option>
                    {headers.map(h => (
                      <option key={h} value={h}>
                        {h}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <Button variant="ghost" size="sm" onClick={onClose}>
                Cancel
              </Button>
              <Button variant="primary" size="sm" onClick={handleProceedToPreview} icon={<ArrowRight className="w-3.5 h-3.5" />}>
                Preview Import
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4 text-xs">
            {/* Validation Metrics Box */}
            <div className="grid grid-cols-3 gap-3 p-3 bg-slate-50 border border-slate-200 rounded-xl text-center">
              <div>
                <span className="text-slate-500 block">Rows to Import</span>
                <span className="text-base font-bold text-emerald-600">{totalRows}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Errors</span>
                <span className="text-base font-bold text-slate-700">0</span>
              </div>
              <div>
                <span className="text-slate-500 block">Warnings</span>
                <span className="text-base font-bold text-amber-600">0</span>
              </div>
            </div>

            {/* Sample Table */}
            <div>
              <p className="font-semibold text-slate-700 mb-1.5">First Sample Records Preview:</p>
              <div className="border border-slate-200 rounded-lg overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-slate-100 text-slate-600 border-b border-slate-200">
                    <tr>
                      <th className="p-2">Period</th>
                      <th className="p-2">Units (kWh)</th>
                      <th className="p-2">Bill Amount (₹)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {sampleRows.slice(0, 3).map((row, idx) => (
                      <tr key={idx}>
                        <td className="p-2 font-medium text-slate-800">{row[mapping.billing_period] || 'N/A'}</td>
                        <td className="p-2 font-semibold text-emerald-600">{row[mapping.units_kwh] || 'N/A'}</td>
                        <td className="p-2 font-semibold text-slate-800">₹{row[mapping.bill_amount] || 'N/A'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex justify-between pt-3 border-t border-slate-100">
              <Button variant="outline" size="sm" onClick={() => setStep('map')}>
                Back to Column Mapping
              </Button>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={onClose}>
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  isLoading={isSubmitting}
                  onClick={handleConfirmImport}
                  icon={<Check className="w-4 h-4" />}
                >
                  Import Data
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};
