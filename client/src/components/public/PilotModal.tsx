import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { api } from '../../api/client';
import { CheckCircle2 } from 'lucide-react';

interface PilotModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PilotModal: React.FC<PilotModalProps> = ({ isOpen, onClose }) => {
  const [formData, setFormData] = useState({
    name: '',
    society_name: '',
    email: '',
    phone: '',
    city: 'Bengaluru',
    apartments: 120,
    message: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setIsSubmitting(true);

    try {
      await api.post('/pilots', formData);
      setIsSuccess(true);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to submit pilot request. Please check your inputs.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetAndClose = () => {
    setIsSuccess(false);
    setErrorMessage('');
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={resetAndClose}
      title={isSuccess ? 'Pilot Request Received' : 'Start a 3-Month Free Pilot'}
      subtitle={isSuccess ? undefined : 'No setup fee. No credit card required. Pure electricity visibility for your RWA.'}
    >
      {isSuccess ? (
        <div className="text-center py-6">
          <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-7 h-7" />
          </div>
          <h4 className="text-lg font-semibold text-slate-900">Thank you for contacting WattWise!</h4>
          <p className="text-sm text-slate-600 mt-2 max-w-md mx-auto">
            We have received your pilot request for <span className="font-semibold text-slate-800">{formData.society_name}</span>. An energy advisor from our team will reach out within 24 hours to help onboard your common-area meters.
          </p>
          <div className="mt-6">
            <Button variant="primary" onClick={resetAndClose}>
              Done
            </Button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          {errorMessage && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-sm rounded-lg">
              {errorMessage}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Your Full Name *</label>
              <input
                type="text"
                name="name"
                required
                value={formData.name}
                onChange={handleChange}
                placeholder="e.g. Rajesh Sharma"
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Apartment Society / RWA Name *</label>
              <input
                type="text"
                name="society_name"
                required
                value={formData.society_name}
                onChange={handleChange}
                placeholder="e.g. Palm Meadows RWA"
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Official / Committee Email *</label>
              <input
                type="email"
                name="email"
                required
                value={formData.email}
                onChange={handleChange}
                placeholder="rwa@society.com"
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Phone / WhatsApp Number *</label>
              <input
                type="tel"
                name="phone"
                required
                value={formData.phone}
                onChange={handleChange}
                placeholder="+91 98450 00000"
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">City *</label>
              <input
                type="text"
                name="city"
                required
                value={formData.city}
                onChange={handleChange}
                placeholder="Bengaluru, Hyderabad, Chennai..."
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Number of Apartments</label>
              <input
                type="number"
                name="apartments"
                min="1"
                value={formData.apartments}
                onChange={handleChange}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Any specific common-area challenges? (Optional)</label>
            <textarea
              name="message"
              rows={2}
              value={formData.message}
              onChange={handleChange}
              placeholder="e.g. High water pump electricity bills, basement lighting on 24x7..."
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <Button type="button" variant="outline" onClick={resetAndClose}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={isSubmitting}>
              Submit Pilot Request
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
};
