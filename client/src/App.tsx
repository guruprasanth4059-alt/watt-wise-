import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { NotificationProvider } from './context/NotificationContext';
import { PublicNavbar } from './components/layout/PublicNavbar';
import { DashboardLayout } from './components/layout/DashboardLayout';

// Public Pages
import { Home } from './pages/public/Home';
import { HowItWorks } from './pages/public/HowItWorks';
import { Features } from './pages/public/Features';
import { ForRWAs } from './pages/public/ForRWAs';
import { Pricing } from './pages/public/Pricing';
import { About } from './pages/public/About';
import { Contact } from './pages/public/Contact';

// Auth Pages
import { Login } from './pages/auth/Login';
import { Signup } from './pages/auth/Signup';
import { ForgotPassword } from './pages/auth/ForgotPassword';

// Authenticated Pages
import { Dashboard } from './pages/dashboard/Dashboard';
import { Energy } from './pages/energy/Energy';
import { Bills } from './pages/bills/Bills';
import { Meters } from './pages/meters/Meters';
import { Insights } from './pages/insights/Insights';
import { AnomalyCenter } from './pages/insights/AnomalyCenter';
import { Recommendations } from './pages/recommendations/Recommendations';
import { Savings } from './pages/savings/Savings';
import { Reports } from './pages/reports/Reports';
import { SocietyManagement } from './pages/society/Society';
import { UserManagement } from './pages/users/Users';
import { Settings } from './pages/settings/Settings';
import { SubscriptionPage } from './pages/subscription/Subscription';
import { AdminDashboard } from './pages/admin/Admin';

// Phase 4 Predictive Pages
import { Forecast } from './pages/forecast/Forecast';
import { Copilot } from './pages/copilot/Copilot';
import { Scenarios } from './pages/scenarios/Scenarios';
import { Opportunities } from './pages/opportunities/Opportunities';
import { CommitteeView } from './pages/committee/CommitteeView';

// Phase 5 Distributed Energy Pages
import { AssetsView } from './pages/assets/AssetsView';
import { SolarView } from './pages/solar/SolarView';
import { EVView } from './pages/ev/EVView';
import { StorageView } from './pages/storage/StorageView';
import { OptimizationView } from './pages/optimization/OptimizationView';

const getNormalizedPath = (): string => {
  if (window.location.hash) {
    const hashPath = window.location.hash.replace(/^#/, '');
    if (hashPath.startsWith('/')) return hashPath;
  }
  let p = window.location.pathname || '/';
  // Strip repository subpath if hosted on GitHub Pages (e.g. /watt-wise- or /watt-wise)
  p = p.replace(/^\/watt-wise-?/, '');
  // Strip /docs prefix if served from docs folder
  p = p.replace(/^\/docs\/?/, '/');
  if (!p || p === '') p = '/';
  return p;
};

const AppContent: React.FC = () => {
  const { user, isLoading } = useAuth();
  const [currentPath, setCurrentPath] = useState<string>(getNormalizedPath());

  useEffect(() => {
    const handlePopState = () => {
      setCurrentPath(getNormalizedPath());
    };
    window.addEventListener('popstate', handlePopState);
    window.addEventListener('hashchange', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
      window.removeEventListener('hashchange', handlePopState);
    };
  }, []);

  const navigate = (path: string) => {
    const isGhPages = window.location.hostname.includes('github.io');
    if (isGhPages) {
      window.location.hash = path;
    } else {
      window.history.pushState({}, '', path);
    }
    setCurrentPath(path);
    window.scrollTo(0, 0);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-500 text-sm">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin" />
          <span className="font-semibold text-slate-700">Loading WattWise...</span>
        </div>
      </div>
    );
  }

  // Public Marketing Routes
  const publicRoutes: Record<string, { component: React.ReactNode; title: string }> = {
    '/': { component: <Home onNavigate={navigate} />, title: 'WattWise — Smarter Energy Management for Apartment Societies' },
    '/how-it-works': { component: <HowItWorks />, title: 'How It Works — WattWise' },
    '/features': { component: <Features />, title: 'Features — WattWise' },
    '/rwas': { component: <ForRWAs />, title: 'For RWAs & Management Committees — WattWise' },
    '/pricing': { component: <Pricing />, title: 'Free Pilot & Pricing — WattWise' },
    '/about': { component: <About />, title: 'About Us — WattWise' },
    '/contact': { component: <Contact />, title: 'Contact Us — WattWise' }
  };

  // Auth Routes
  const authRoutes: Record<string, React.ReactNode> = {
    '/login': <Login onNavigate={navigate} />,
    '/signup': <Signup onNavigate={navigate} />,
    '/forgot-password': <ForgotPassword onNavigate={navigate} />
  };

  // If on a public marketing route
  if (publicRoutes[currentPath]) {
    document.title = publicRoutes[currentPath].title;
    return (
      <div className="min-h-screen flex flex-col bg-slate-50">
        <PublicNavbar currentPath={currentPath} onNavigate={navigate} />
        <main className="flex-1">{publicRoutes[currentPath].component}</main>
        <footer className="bg-slate-900 text-slate-400 py-12 border-t border-slate-800 text-xs">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row justify-between items-center gap-4">
            <div>
              <span className="font-bold text-white text-sm">⚡ WattWise</span>
              <p className="mt-1 text-slate-500">The energy intelligence layer for apartment societies & RWAs.</p>
            </div>
            <div className="flex items-center gap-4">
              <button onClick={() => navigate('/privacy')} className="hover:text-white">Privacy</button>
              <button onClick={() => navigate('/pricing')} className="hover:text-white">Pilot Pricing</button>
              <button onClick={() => navigate('/contact')} className="hover:text-white">Contact</button>
            </div>
          </div>
        </footer>
      </div>
    );
  }

  // If on an auth route
  if (authRoutes[currentPath]) {
    return <div className="min-h-screen bg-slate-50">{authRoutes[currentPath]}</div>;
  }

  // If not logged in and attempting to access an authenticated route, redirect to login
  if (!user) {
    return <Login onNavigate={navigate} />;
  }

  // Authenticated App Routes with DashboardLayout
  const getAuthenticatedView = () => {
    switch (currentPath) {
      case '/dashboard':
        return { component: <Dashboard onNavigate={navigate} />, title: 'Energy Dashboard' };
      case '/forecast':
        return { component: <Forecast />, title: 'Predictive Energy Forecasting' };
      case '/copilot':
        return { component: <Copilot onNavigate={navigate} />, title: 'AI Energy Copilot' };
      case '/scenarios':
        return { component: <Scenarios />, title: 'What-If Scenario Simulator' };
      case '/opportunities':
        return { component: <Opportunities />, title: 'Energy Opportunity Engine' };
      case '/committee':
        return { component: <CommitteeView />, title: 'Committee Decision Pack' };
      case '/assets':
        return { component: <AssetsView />, title: 'Energy Assets' };
      case '/solar':
        return { component: <SolarView />, title: 'Solar Intelligence' };
      case '/ev':
        return { component: <EVView />, title: 'EV Charging Intelligence' };
      case '/storage':
        return { component: <StorageView />, title: 'Battery & Storage' };
      case '/optimization':
        return { component: <OptimizationView />, title: 'Load Optimization' };
      case '/energy':
        return { component: <Energy onNavigate={navigate} />, title: 'Energy Module' };
      case '/bills':
        return { component: <Bills onNavigate={navigate} />, title: 'Electricity Bills' };
      case '/meters':
        return { component: <Meters />, title: 'Meter Panels' };
      case '/insights/anomalies':
      case '/anomalies':
        return { component: <AnomalyCenter />, title: 'Interval Anomaly Center' };
      case '/insights':
        return { component: <Insights />, title: 'WattWise AI Insights' };
      case '/recommendations':
        return { component: <Recommendations />, title: 'Action Recommendations' };
      case '/savings':
        return { component: <Savings />, title: 'Savings Tracking' };
      case '/reports':
        return { component: <Reports />, title: 'Executive Reports' };
      case '/society':
        return { component: <SocietyManagement />, title: 'Society Profile' };
      case '/users':
        return { component: <UserManagement />, title: 'User Management' };
      case '/settings':
        return { component: <Settings onNavigate={navigate} />, title: 'Settings' };
      case '/subscription':
        return { component: <SubscriptionPage />, title: 'Pilot & Subscription' };
      case '/admin':
        if (user.role === 'platform_admin') {
          return { component: <AdminDashboard />, title: 'WattWise Platform Admin' };
        }
        return { component: <Dashboard onNavigate={navigate} />, title: 'Energy Dashboard' };
      default:
        return { component: <Dashboard onNavigate={navigate} />, title: 'Energy Dashboard' };
    }
  };

  const activeView = getAuthenticatedView();
  document.title = `${activeView.title} — WattWise`;

  return (
    <DashboardLayout
      currentPath={currentPath}
      pageTitle={activeView.title}
      onNavigate={navigate}
    >
      {activeView.component}
    </DashboardLayout>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <NotificationProvider>
        <AppContent />
      </NotificationProvider>
    </AuthProvider>
  );
}
