import React, { useState, useEffect } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import {
  LayoutDashboard,
  Briefcase,
  Users,
  UserCheck,
  FileText,
  Sparkles,
  Megaphone,
  Send,
  Clock,
  Inbox,
  FileSpreadsheet,
  BarChart3,
  ShieldAlert,
  Settings as SettingsIcon,
  LogOut,
  Menu,
  X,
  Mail,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

export const DashboardLayout: React.FC = () => {
  const { user, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [gmailStatus, setGmailStatus] = useState<{ connected: boolean; email?: string }>({ connected: false });
  const location = useLocation();

  useEffect(() => {
    const fetchGmailStatus = async () => {
      try {
        const res = await api.get('/settings');
        if (res.data.success) {
          setGmailStatus({
            connected: res.data.data.gmailConnected,
            email: res.data.data.gmailEmail
          });
        }
      } catch (e) {
        // Silently handle
      }
    };
    fetchGmailStatus();
  }, [location.pathname]);

  // Close mobile menu on navigate
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  const navItems = [
    { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { name: 'Job Discovery', path: '/jobs', icon: Briefcase },
    { name: 'Recruiters', path: '/recruiters', icon: Users },
    { name: 'Candidate Profile', path: '/candidates', icon: UserCheck },
    { name: 'Resumes', path: '/resumes', icon: FileText },
    { name: 'AI Resume Matcher', path: '/ai-matcher', icon: Sparkles, badge: 'AI' },
    { name: 'Campaigns', path: '/campaigns', icon: Megaphone },
    { name: 'Outreach', path: '/outreach', icon: Send },
    { name: 'Follow-ups', path: '/followups', icon: Clock },
    { name: 'Replies', path: '/replies', icon: Inbox },
    { name: 'CSV Manager', path: '/csv', icon: FileSpreadsheet },
    { name: 'Analytics', path: '/analytics', icon: BarChart3 },
    { name: 'Duplicate Logs', path: '/duplicate-logs', icon: ShieldAlert },
    { name: 'Settings', path: '/settings', icon: SettingsIcon }
  ];

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden font-sans text-slate-800">
      {/* Desktop Navy Sidebar */}
      <aside className="hidden lg:flex lg:flex-col w-64 bg-slate-900 text-slate-300 border-r border-slate-800 flex-shrink-0 select-none">
        {/* Logo & Brand */}
        <div className="h-16 flex items-center px-6 border-b border-slate-800 bg-slate-950/40">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-lg bg-blue-600 flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="text-sm font-bold tracking-tight text-white flex items-center gap-1.5">
                C2C Outreach <span className="text-[10px] uppercase font-semibold px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-400 border border-blue-500/30">AI</span>
              </div>
              <p className="text-[11px] text-slate-400 font-medium">USA Corp-to-Corp SaaS</p>
            </div>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  `flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-medium transition-all duration-150 ${
                    isActive
                      ? 'bg-blue-600 text-white font-semibold shadow-sm'
                      : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/70'
                  }`
                }
              >
                <div className="flex items-center space-x-3">
                  <Icon className="w-4 h-4 flex-shrink-0" />
                  <span>{item.name}</span>
                </div>
                {item.badge && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-500/20 text-blue-300 font-semibold">
                    {item.badge}
                  </span>
                )}
              </NavLink>
            );
          })}
        </nav>

        {/* User Card */}
        <div className="p-3 border-t border-slate-800/80 bg-slate-950/30">
          <div className="flex items-center justify-between p-2 rounded-lg bg-slate-800/60">
            <div className="flex items-center space-x-2.5 min-w-0">
              <div className="w-8 h-8 rounded-full bg-blue-600/30 border border-blue-500/40 text-blue-300 font-semibold text-xs flex items-center justify-center">
                {user?.name ? user.name.slice(0, 2).toUpperCase() : 'US'}
              </div>
              <div className="truncate text-left">
                <div className="text-xs font-semibold text-white truncate">{user?.name || 'Recruiter'}</div>
                <div className="text-[11px] text-slate-400 truncate">{user?.role || 'USER'}</div>
              </div>
            </div>
            <button
              onClick={logout}
              title="Logout"
              className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded transition"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile Sidebar Overlay */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setMobileMenuOpen(false)} />
          <div className="relative flex flex-col w-72 max-w-full bg-slate-900 text-slate-200 z-10 shadow-2xl">
            <div className="h-16 flex items-center justify-between px-6 border-b border-slate-800">
              <div className="text-sm font-bold text-white flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-blue-500" />
                C2C Outreach Platform
              </div>
              <button onClick={() => setMobileMenuOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
              {navItems.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    className={({ isActive }) =>
                      `flex items-center space-x-3 px-3 py-2.5 rounded-lg text-xs font-medium transition ${
                        isActive ? 'bg-blue-600 text-white font-semibold' : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                      }`
                    }
                  >
                    <Icon className="w-4 h-4" />
                    <span>{item.name}</span>
                  </NavLink>
                );
              })}
            </nav>
            <div className="p-4 border-t border-slate-800">
              <button
                onClick={logout}
                className="w-full flex items-center justify-center space-x-2 py-2 px-3 text-xs text-rose-300 bg-rose-950/40 border border-rose-900/40 rounded-lg"
              >
                <LogOut className="w-4 h-4" />
                <span>Log Out</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Topbar */}
        <header className="h-16 bg-white border-b border-slate-200/80 px-4 sm:px-6 flex items-center justify-between z-10 shadow-sm">
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="p-2 rounded-lg text-slate-600 hover:bg-slate-100 lg:hidden"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="hidden sm:block">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">USA C2C Workspace</span>
            </div>
          </div>

          <div className="flex items-center space-x-3 sm:space-x-4">
            {/* Gmail Connection Status Pill */}
            <div
              className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${
                gmailStatus.connected
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : 'bg-slate-100 text-slate-600 border-slate-200'
              }`}
              title={gmailStatus.connected ? `Gmail Active: ${gmailStatus.email}` : 'Gmail OAuth disconnected (Simulated/SMTP fallback active)'}
            >
              <Mail className="w-3.5 h-3.5" />
              <span className="hidden md:inline">
                {gmailStatus.connected ? `Gmail: ${gmailStatus.email || 'Connected'}` : 'Gmail: Offline (Dev Mode)'}
              </span>
              {gmailStatus.connected ? (
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              ) : (
                <AlertCircle className="w-3.5 h-3.5 text-slate-400" />
              )}
            </div>

            {/* Profile Avatar Pill */}
            <div className="flex items-center space-x-2 pl-2 border-l border-slate-200">
              <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 font-bold text-xs flex items-center justify-center border border-blue-200">
                {user?.name ? user.name.slice(0, 2).toUpperCase() : 'AD'}
              </div>
              <div className="hidden sm:block text-left">
                <div className="text-xs font-semibold text-slate-800 leading-tight">{user?.name || 'Administrator'}</div>
                <div className="text-[10px] text-slate-500 font-medium">Corp-to-Corp Outreach</div>
              </div>
            </div>
          </div>
        </header>

        {/* Dynamic Page Outlet */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8 bg-slate-50">
          <div className="max-w-7xl mx-auto">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};
