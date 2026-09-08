import React, { useState } from 'react';
import { Button } from '../../components/common/Button';
import { Zap, ArrowLeft, CheckCircle2 } from 'lucide-react';

interface ForgotPasswordProps {
  onNavigate: (path: string) => void;
}

export const ForgotPassword: React.FC<ForgotPasswordProps> = ({ onNavigate }) => {
  const [email, setEmail] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      setIsSubmitted(true);
    }, 600);
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-6">
        <div className="text-center">
          <div onClick={() => onNavigate('/')} className="inline-flex items-center gap-2 cursor-pointer mb-4">
            <div className="w-9 h-9 rounded-xl bg-emerald-600 flex items-center justify-center text-white shadow-xs">
              <Zap className="w-5 h-5 fill-current" />
            </div>
            <span className="text-2xl font-bold tracking-tight text-slate-900">
              Watt<span className="text-emerald-600">Wise</span>
            </span>
          </div>
          <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            Reset Password
          </h2>
          <p className="mt-1 text-xs text-slate-500">
            Enter your registered society email to receive recovery instructions.
          </p>
        </div>

        <div className="bg-white p-8 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
          {isSubmitted ? (
            <div className="text-center py-6 space-y-3">
              <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-900">Reset Email Dispatched</h3>
              <p className="text-xs text-slate-600">
                If an account exists for <span className="font-semibold text-slate-800">{email}</span>, password reset instructions have been sent.
              </p>
              <div className="pt-4">
                <Button variant="outline" size="sm" onClick={() => onNavigate('/login')}>
                  Return to Sign In
                </Button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Registered Email Address</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="president@society.com"
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <Button type="submit" variant="primary" className="w-full" isLoading={isLoading}>
                Send Recovery Link
              </Button>

              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={() => onNavigate('/login')}
                  className="text-xs text-slate-500 hover:text-slate-800 font-semibold inline-flex items-center gap-1 cursor-pointer"
                >
                  <ArrowLeft className="w-3 h-3" /> Back to Sign In
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
