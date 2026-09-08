import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { Zap, ArrowRight, UserCheck, ShieldCheck, Users, Eye } from 'lucide-react';

interface LoginProps {
  onNavigate: (path: string) => void;
}

export const Login: React.FC<LoginProps> = ({ onNavigate }) => {
  const { login, demoLogin } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [demoLoading, setDemoLoading] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setIsLoading(true);

    try {
      await login(email, password);
      onNavigate('/dashboard');
    } catch (err: any) {
      setErrorMessage(err.message || 'Invalid credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDemo = async (role: 'admin' | 'committee' | 'resident' | 'platform_admin') => {
    setDemoLoading(role);
    setErrorMessage('');
    try {
      await demoLogin(role);
      if (role === 'platform_admin') {
        onNavigate('/admin');
      } else {
        onNavigate('/dashboard');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Demo login failed.');
    } finally {
      setDemoLoading(null);
    }
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        {/* Header */}
        <div className="text-center">
          <div
            onClick={() => onNavigate('/')}
            className="inline-flex items-center gap-2 cursor-pointer mb-4"
          >
            <div className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center text-white shadow-xs">
              <Zap className="w-6 h-6 fill-current" />
            </div>
            <span className="text-2xl font-bold tracking-tight text-slate-900">
              Watt<span className="text-emerald-600">Wise</span>
            </span>
          </div>
          <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            Sign in to your Society Portal
          </h2>
          <p className="mt-1 text-xs text-slate-500">
            Access electricity consumption dashboards and committee action tracking.
          </p>
        </div>

        {/* 1-Click Demo Persona Switcher Box */}
        <div className="p-4 rounded-2xl bg-gradient-to-b from-emerald-50/90 to-emerald-100/40 border border-emerald-200 text-left space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-900 uppercase tracking-wide flex items-center gap-1.5">
              <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
              1-Click Demo Personas
            </span>
            <span className="text-[10px] bg-emerald-200 text-emerald-800 px-2 py-0.5 rounded font-semibold">
              Instant Access
            </span>
          </div>
          <p className="text-[11px] text-slate-600">
            Click any role to test Green Valley Residency (Bengaluru) with pre-seeded data:
          </p>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              disabled={!!demoLoading}
              onClick={() => handleDemo('admin')}
              className="p-2.5 rounded-lg bg-white border border-emerald-200/80 hover:border-emerald-500 hover:shadow-xs text-left transition-all cursor-pointer"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800">Society Admin</span>
                <span className="text-[10px] text-emerald-600 font-semibold">Full Access</span>
              </div>
              <p className="text-[10px] text-slate-400 truncate mt-0.5">president@greenvalley.com</p>
            </button>

            <button
              type="button"
              disabled={!!demoLoading}
              onClick={() => handleDemo('committee')}
              className="p-2.5 rounded-lg bg-white border border-emerald-200/80 hover:border-blue-500 hover:shadow-xs text-left transition-all cursor-pointer"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800">Committee</span>
                <span className="text-[10px] text-blue-600 font-semibold">Treasurer</span>
              </div>
              <p className="text-[10px] text-slate-400 truncate mt-0.5">treasurer@greenvalley.com</p>
            </button>

            <button
              type="button"
              disabled={!!demoLoading}
              onClick={() => handleDemo('resident')}
              className="p-2.5 rounded-lg bg-white border border-emerald-200/80 hover:border-slate-500 hover:shadow-xs text-left transition-all cursor-pointer"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800">Resident</span>
                <span className="text-[10px] text-slate-500 font-semibold">Read Only</span>
              </div>
              <p className="text-[10px] text-slate-400 truncate mt-0.5">resident@greenvalley.com</p>
            </button>

            <button
              type="button"
              disabled={!!demoLoading}
              onClick={() => handleDemo('platform_admin')}
              className="p-2.5 rounded-lg bg-purple-50/80 border border-purple-200 hover:border-purple-500 hover:shadow-xs text-left transition-all cursor-pointer"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-purple-900">Platform Admin</span>
                <span className="text-[10px] text-purple-700 font-semibold">WattWise</span>
              </div>
              <p className="text-[10px] text-purple-400 truncate mt-0.5">admin@wattwise.com</p>
            </button>
          </div>
        </div>

        {/* Email & Password Form */}
        <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200/80 shadow-xs space-y-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            {errorMessage && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg">
                {errorMessage}
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Email address</label>
              <input
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="president@society.com"
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-slate-700">Password</label>
                <button
                  type="button"
                  onClick={() => onNavigate('/forgot-password')}
                  className="text-xs text-emerald-600 hover:text-emerald-700 font-medium cursor-pointer"
                >
                  Forgot password?
                </button>
              </div>
              <input
                type="password"
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>

            <Button
              type="submit"
              variant="primary"
              className="w-full justify-center"
              isLoading={isLoading}
            >
              Sign In
              <ArrowRight className="w-4 h-4 ml-1.5" />
            </Button>
          </form>

          <div className="pt-4 border-t border-slate-100 text-center">
            <p className="text-xs text-slate-500">
              New society?{' '}
              <button
                type="button"
                onClick={() => onNavigate('/signup')}
                className="font-bold text-emerald-600 hover:text-emerald-700 cursor-pointer"
              >
                Register your Society & Start 3-Month Pilot
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
