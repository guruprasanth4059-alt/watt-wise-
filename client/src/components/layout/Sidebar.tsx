import React from 'react';
import {
  LayoutDashboard,
  Zap,
  Receipt,
  Gauge,
  Sparkles,
  Lightbulb,
  PiggyBank,
  FileText,
  Building2,
  Users,
  Settings,
  CreditCard,
  ShieldCheck,
  AlertTriangle,
  LogOut,
  X
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { Badge } from '../common/Badge';

interface SidebarProps {
  currentPath: string;
  onNavigate: (path: string) => void;
  isOpen: boolean;
  onClose: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentPath, onNavigate, isOpen, onClose }) => {
  const { user, society, logout } = useAuth();

  const handleLinkClick = (path: string) => {
    onNavigate(path);
    onClose();
  };

  const navItems = [
    { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { label: 'Energy', path: '/energy', icon: Zap },
    { label: 'Bills', path: '/bills', icon: Receipt },
    { label: 'Meters', path: '/meters', icon: Gauge },
    { label: 'Anomalies', path: '/insights/anomalies', icon: AlertTriangle, badge: 'Live' },
    { label: 'Insights', path: '/insights', icon: Sparkles, badge: 'AI' },
    { label: 'Recommendations', path: '/recommendations', icon: Lightbulb },
    { label: 'Savings', path: '/savings', icon: PiggyBank },
    { label: 'Reports', path: '/reports', icon: FileText },
    { label: 'Society', path: '/society', icon: Building2 },
    { label: 'Users', path: '/users', icon: Users },
    { label: 'Settings', path: '/settings', icon: Settings },
    { label: 'Subscription', path: '/subscription', icon: CreditCard }
  ];

  // Role display formatting
  const roleLabels: Record<string, { label: string; variant: 'emerald' | 'blue' | 'purple' | 'slate' }> = {
    platform_admin: { label: 'Platform Admin', variant: 'purple' },
    society_admin: { label: 'Society Admin', variant: 'emerald' },
    committee_member: { label: 'Committee', variant: 'blue' },
    resident: { label: 'Resident', variant: 'slate' }
  };

  const currentRoleInfo = user?.role ? roleLabels[user.role] : { label: 'User', variant: 'slate' as const };

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-xs lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar Panel */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-64 bg-slate-900 text-slate-300 flex flex-col justify-between transition-transform duration-200 ease-in-out lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand & Society header */}
        <div>
          <div className="h-16 px-5 border-b border-slate-800 flex items-center justify-between">
            <div
              onClick={() => handleLinkClick('/dashboard')}
              className="flex items-center gap-2.5 cursor-pointer select-none"
            >
              <div className="w-8 h-8 rounded-lg bg-emerald-500 flex items-center justify-center text-slate-950 font-bold">
                <Zap className="w-4 h-4 fill-current" />
              </div>
              <span className="text-lg font-bold text-white tracking-tight">
                Watt<span className="text-emerald-400">Wise</span>
              </span>
            </div>
            <button
              onClick={onClose}
              className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Current Society Card */}
          <div className="px-4 py-3 border-b border-slate-800/80 bg-slate-950/40">
            <p className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold">Active Community</p>
            <p className="text-sm font-semibold text-white truncate mt-0.5">
              {society?.name || 'Green Valley Residency'}
            </p>
            <div className="flex items-center gap-2 mt-1.5">
              <Badge variant={currentRoleInfo.variant} size="sm" className="text-[10px] py-0 px-2">
                {currentRoleInfo.label}
              </Badge>
              {society?.city && <span className="text-[11px] text-slate-400 truncate">{society.city}</span>}
            </div>
          </div>

          {/* Main Navigation Links */}
          <div className="px-3 py-3 space-y-0.5 overflow-y-auto max-h-[calc(100vh-260px)]">
            {navItems.map(item => {
              const Icon = item.icon;
              const isActive = currentPath === item.path || currentPath.startsWith(`${item.path}/`);

              // If resident, restrict certain management tabs
              if (user?.role === 'resident' && ['/users', '/society', '/subscription'].includes(item.path)) {
                return null;
              }

              return (
                <button
                  key={item.path}
                  onClick={() => handleLinkClick(item.path)}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                    isActive
                      ? 'bg-emerald-600/20 text-emerald-400 border border-emerald-500/30'
                      : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon className={`w-4 h-4 ${isActive ? 'text-emerald-400' : 'text-slate-400'}`} />
                    <span>{item.label}</span>
                  </div>
                  {item.badge && (
                    <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-1.5 py-0.2 rounded font-semibold border border-emerald-500/30">
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}

            {/* Platform Admin Link if authorized */}
            {user?.role === 'platform_admin' && (
              <div className="pt-2 mt-2 border-t border-slate-800">
                <button
                  onClick={() => handleLinkClick('/admin')}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                    currentPath.startsWith('/admin')
                      ? 'bg-purple-600/20 text-purple-300 border border-purple-500/30'
                      : 'text-purple-300/80 hover:bg-slate-800 hover:text-purple-200'
                  }`}
                >
                  <ShieldCheck className="w-4 h-4 text-purple-400" />
                  <span>Platform Admin</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* User Footer & Logout */}
        <div className="p-3 border-t border-slate-800 bg-slate-950/60">
          <div className="flex items-center justify-between px-2 py-1">
            <div className="truncate mr-2">
              <p className="text-xs font-semibold text-white truncate">{user?.name || 'User'}</p>
              <p className="text-[11px] text-slate-400 truncate">{user?.email}</p>
            </div>
            <button
              onClick={() => {
                logout();
                onNavigate('/login');
              }}
              title="Sign Out"
              className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-md transition-colors cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};
