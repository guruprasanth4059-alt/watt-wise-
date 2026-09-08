import React, { useState, useRef, useEffect } from 'react';
import {
  Bell,
  Menu,
  CheckCheck,
  Zap,
  Sparkles,
  Receipt,
  FileText,
  UserCheck,
  ChevronDown
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import { Badge } from '../common/Badge';

interface HeaderProps {
  pageTitle: string;
  onToggleSidebar: () => void;
  onNavigate: (path: string) => void;
}

export const Header: React.FC<HeaderProps> = ({ pageTitle, onToggleSidebar, onNavigate }) => {
  const { user, demoLogin } = useAuth();
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();

  const [notifDropdownOpen, setNotifDropdownOpen] = useState(false);
  const [demoDropdownOpen, setDemoDropdownOpen] = useState(false);

  const notifRef = useRef<HTMLDivElement>(null);
  const demoRef = useRef<HTMLDivElement>(null);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifDropdownOpen(false);
      }
      if (demoRef.current && !demoRef.current.contains(e.target as Node)) {
        setDemoDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getNotifIcon = (type: string) => {
    switch (type) {
      case 'ai_insight':
        return <Sparkles className="w-4 h-4 text-emerald-600" />;
      case 'bill_uploaded':
      case 'bill_verification':
        return <Receipt className="w-4 h-4 text-blue-600" />;
      case 'report_ready':
        return <FileText className="w-4 h-4 text-purple-600" />;
      default:
        return <Zap className="w-4 h-4 text-amber-600" />;
    }
  };

  const handleSwitchDemo = async (role: 'admin' | 'committee' | 'resident' | 'platform_admin') => {
    setDemoDropdownOpen(false);
    await demoLogin(role);
    if (role === 'platform_admin') {
      onNavigate('/admin');
    } else {
      onNavigate('/dashboard');
    }
  };

  return (
    <header className="sticky top-0 z-30 h-16 bg-white border-b border-slate-200/80 px-4 sm:px-6 lg:px-8 flex items-center justify-between">
      {/* Left: Mobile hamburger & Page Title */}
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleSidebar}
          className="lg:hidden p-2 rounded-lg text-slate-600 hover:bg-slate-100 transition-colors"
        >
          <Menu className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-lg font-bold text-slate-900 tracking-tight">{pageTitle}</h1>
        </div>
      </div>

      {/* Right: Quick Demo Role Switcher & Notifications */}
      <div className="flex items-center gap-3">
        {/* Quick Demo Switcher */}
        <div className="relative" ref={demoRef}>
          <button
            onClick={() => setDemoDropdownOpen(!demoDropdownOpen)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-xs font-medium text-slate-700 transition-colors cursor-pointer"
          >
            <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span className="hidden sm:inline">Role:</span>
            <span className="font-semibold capitalize">{user?.role?.replace('_', ' ') || 'Admin'}</span>
            <ChevronDown className="w-3 h-3 text-slate-400" />
          </button>

          {demoDropdownOpen && (
            <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-lg border border-slate-200 py-1.5 z-50 text-xs animate-in fade-in zoom-in-95 duration-100">
              <div className="px-3 py-1.5 border-b border-slate-100 font-semibold text-slate-500 uppercase tracking-wider text-[10px]">
                Switch Demo Persona
              </div>
              <button
                onClick={() => handleSwitchDemo('admin')}
                className="w-full text-left px-3 py-2 hover:bg-emerald-50 text-slate-700 hover:text-emerald-800 flex items-center justify-between"
              >
                <span>Society Admin (President)</span>
                {user?.role === 'society_admin' && <span className="text-emerald-600 font-bold">✓</span>}
              </button>
              <button
                onClick={() => handleSwitchDemo('committee')}
                className="w-full text-left px-3 py-2 hover:bg-blue-50 text-slate-700 hover:text-blue-800 flex items-center justify-between"
              >
                <span>Committee Member (Treasurer)</span>
                {user?.role === 'committee_member' && <span className="text-blue-600 font-bold">✓</span>}
              </button>
              <button
                onClick={() => handleSwitchDemo('resident')}
                className="w-full text-left px-3 py-2 hover:bg-slate-50 text-slate-700 hover:text-slate-900 flex items-center justify-between"
              >
                <span>Resident (View-Only)</span>
                {user?.role === 'resident' && <span className="text-slate-600 font-bold">✓</span>}
              </button>
              <div className="border-t border-slate-100 mt-1 pt-1">
                <button
                  onClick={() => handleSwitchDemo('platform_admin')}
                  className="w-full text-left px-3 py-2 hover:bg-purple-50 text-purple-700 flex items-center justify-between"
                >
                  <span>WattWise Platform Admin</span>
                  {user?.role === 'platform_admin' && <span className="text-purple-600 font-bold">✓</span>}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Notifications Popover */}
        <div className="relative" ref={notifRef}>
          <button
            onClick={() => setNotifDropdownOpen(!notifDropdownOpen)}
            className="relative p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
            title="Notifications"
          >
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 w-4 h-4 bg-emerald-600 text-white rounded-full text-[10px] font-bold flex items-center justify-center">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {notifDropdownOpen && (
            <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-100">
              <div className="p-3.5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-800 uppercase tracking-wide">Notifications</span>
                  {unreadCount > 0 && (
                    <Badge variant="emerald" size="sm">
                      {unreadCount} new
                    </Badge>
                  )}
                </div>
                {unreadCount > 0 && (
                  <button
                    onClick={markAllAsRead}
                    className="text-xs text-emerald-600 hover:text-emerald-700 font-semibold flex items-center gap-1 cursor-pointer"
                  >
                    <CheckCheck className="w-3.5 h-3.5" />
                    Mark all read
                  </button>
                )}
              </div>

              <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
                {notifications.length === 0 ? (
                  <div className="p-6 text-center text-xs text-slate-400">No notifications at this time.</div>
                ) : (
                  notifications.map(notif => (
                    <div
                      key={notif.id}
                      onClick={() => {
                        markAsRead(notif.id);
                        if (notif.link) {
                          setNotifDropdownOpen(false);
                          onNavigate(notif.link);
                        }
                      }}
                      className={`p-3.5 hover:bg-slate-50 transition-colors cursor-pointer flex items-start gap-3 ${
                        notif.read === 0 ? 'bg-emerald-50/30' : ''
                      }`}
                    >
                      <div className="p-2 rounded-lg bg-slate-100 shrink-0 mt-0.5">
                        {getNotifIcon(notif.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className="text-xs font-semibold text-slate-800 truncate">{notif.title}</p>
                          {notif.read === 0 && (
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0"></span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-600 line-clamp-2 mt-0.5">{notif.message}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
