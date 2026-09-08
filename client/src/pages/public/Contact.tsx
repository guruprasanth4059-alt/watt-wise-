import React, { useState } from 'react';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { api } from '../../api/client';
import { CheckCircle2, Mail, Phone, MapPin } from 'lucide-react';

export const Contact: React.FC = () => {
  const [formData, setFormData] = useState({
    name: '',
    society_name: '',
    email: '',
    phone: '',
    city: 'Bengaluru',
    apartments: 100,
    message: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMessage('');
    try {
      await api.post('/pilots', formData);
      setIsSuccess(true);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to send message.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 space-y-12">
      <div className="text-center max-w-2xl mx-auto space-y-4">
        <Badge variant="emerald" size="md">Get In Touch</Badge>
        <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight">
          Connect with the WattWise Advisory Team
        </h1>
        <p className="text-base text-slate-600">
          Have questions about onboarding your apartment society or initiating a free 3-month pilot? Reach out to our community engineers.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto items-start">
        {/* Contact Info Card */}
        <div className="p-6 rounded-2xl bg-slate-900 text-white space-y-6">
          <h3 className="text-lg font-bold">Contact Details</h3>
          <div className="space-y-4 text-xs text-slate-300">
            <div className="flex items-center gap-3">
              <Mail className="w-4 h-4 text-emerald-400" />
              <span>support@wattwise.in</span>
            </div>
            <div className="flex items-center gap-3">
              <Phone className="w-4 h-4 text-emerald-400" />
              <span>+91 80 4920 1100</span>
            </div>
            <div className="flex items-start gap-3">
              <MapPin className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <span>Bellandur, Outer Ring Road, Bengaluru, Karnataka 560103</span>
            </div>
          </div>
          <div className="pt-4 border-t border-slate-800 text-[11px] text-slate-400">
            Support hours: Mon - Sat, 9:00 AM - 6:30 PM IST.
          </div>
        </div>

        {/* Form */}
        <div className="md:col-span-2 p-8 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
          {isSuccess ? (
            <div className="text-center py-10 space-y-3">
              <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">Message Delivered</h3>
              <p className="text-sm text-slate-600 max-w-sm mx-auto">
                Thank you! Our energy advisor will contact you within 1 business day.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              {errorMessage && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg">
                  {errorMessage}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Your Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Society Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.society_name}
                    onChange={e => setFormData({ ...formData, society_name: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Official Email *</label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Phone Number *</label>
                  <input
                    type="tel"
                    required
                    value={formData.phone}
                    onChange={e => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Your Message or Query *</label>
                <textarea
                  rows={4}
                  required
                  value={formData.message}
                  onChange={e => setFormData({ ...formData, message: e.target.value })}
                  placeholder="How can we assist your apartment community?"
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div className="flex justify-end pt-2">
                <Button type="submit" variant="primary" isLoading={isSubmitting}>
                  Send Message
                </Button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
