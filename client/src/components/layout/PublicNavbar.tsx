import React, { useState } from 'react';
import { Zap, Menu, X, ArrowRight } from 'lucide-react';
import { Button } from '../common/Button';
import { PilotModal } from '../public/PilotModal';

interface PublicNavbarProps {
  currentPath?: string;
  onNavigate?: (path: string) => void;
}

export const PublicNavbar: React.FC<PublicNavbarProps> = ({ currentPath = '/', onNavigate }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [pilotModalOpen, setPilotModalOpen] = useState(false);

  const handleNav = (path: string) => {
    setMobileMenuOpen(false);
    if (onNavigate) {
      onNavigate(path);
    } else {
      window.location.href = path;
    }
  };

  const navLinks = [
    { label: 'Home', path: '/' },
    { label: 'How It Works', path: '/how-it-works' },
    { label: 'Features', path: '/features' },
    { label: 'For RWAs', path: '/rwas' },
    { label: 'Pricing', path: '/pricing' },
    { label: 'About', path: '/about' }
  ];

  return (
    <>
      <header className="sticky top-0 z-40 w-full bg-white/90 backdrop-blur-md border-b border-slate-200/80 transition-all">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Logo */}
          <div
            onClick={() => handleNav('/')}
            className="flex items-center gap-2.5 cursor-pointer select-none group"
          >
            <div className="w-9 h-9 rounded-xl bg-emerald-600 flex items-center justify-center text-white shadow-xs group-hover:bg-emerald-700 transition-colors">
              <Zap className="w-5 h-5 fill-current" />
            </div>
            <div>
              <span className="text-xl font-bold tracking-tight text-slate-900 flex items-center gap-1">
                Watt<span className="text-emerald-600">Wise</span>
              </span>
              <span className="hidden sm:block text-[10px] text-slate-500 font-medium tracking-wide uppercase">
                Smarter Energy. Lower Bills.
              </span>
            </div>
          </div>

          {/* Desktop Nav Links */}
          <nav className="hidden md:flex items-center gap-1 text-sm font-medium text-slate-600">
            {navLinks.map(link => {
              const isActive = currentPath === link.path;
              return (
                <button
                  key={link.path}
                  onClick={() => handleNav(link.path)}
                  className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                    isActive
                      ? 'text-emerald-700 bg-emerald-50 font-semibold'
                      : 'hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  {link.label}
                </button>
              );
            })}
          </nav>

          {/* Right Actions */}
          <div className="hidden md:flex items-center gap-3">
            <button
              onClick={() => handleNav('/login')}
              className="text-sm font-semibold text-slate-700 hover:text-emerald-700 px-3 py-1.5 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
            >
              Login
            </button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => setPilotModalOpen(true)}
              className="shadow-xs"
            >
              Start a Free Pilot
            </Button>
          </div>

          {/* Mobile menu toggle */}
          <div className="md:hidden flex items-center gap-2">
            <Button
              variant="primary"
              size="sm"
              onClick={() => setPilotModalOpen(true)}
              className="text-xs px-2.5 py-1"
            >
              Pilot
            </Button>
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg text-slate-600 hover:bg-slate-100 transition-colors"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6 text-slate-800" />}
            </button>
          </div>
        </div>

        {/* Mobile menu dropdown */}
        {mobileMenuOpen && (
          <div className="md:hidden border-b border-slate-200 bg-white px-4 pt-2 pb-6 space-y-2 shadow-lg animate-in slide-in-from-top-2 duration-150">
            {navLinks.map(link => (
              <button
                key={link.path}
                onClick={() => handleNav(link.path)}
                className={`block w-full text-left px-3 py-2 rounded-lg text-base font-medium transition-colors cursor-pointer ${
                  currentPath === link.path
                    ? 'text-emerald-700 bg-emerald-50 font-semibold'
                    : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                {link.label}
              </button>
            ))}
            <div className="pt-4 border-t border-slate-100 flex flex-col gap-2">
              <button
                onClick={() => handleNav('/login')}
                className="w-full text-left px-3 py-2 rounded-lg text-base font-semibold text-slate-700 hover:bg-slate-100"
              >
                Login
              </button>
              <Button
                variant="primary"
                className="w-full justify-center"
                onClick={() => {
                  setMobileMenuOpen(false);
                  setPilotModalOpen(true);
                }}
              >
                Start a Free Pilot
                <ArrowRight className="w-4 h-4 ml-1.5" />
              </Button>
            </div>
          </div>
        )}
      </header>

      {/* Pilot Lead Modal */}
      <PilotModal isOpen={pilotModalOpen} onClose={() => setPilotModalOpen(false)} />
    </>
  );
};
