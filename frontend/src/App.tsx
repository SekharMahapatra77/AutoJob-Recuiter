import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { DashboardLayout } from './layouts/DashboardLayout';

import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { DashboardPage } from './pages/DashboardPage';
import { JobsPage } from './pages/JobsPage';
import { RecruitersPage } from './pages/RecruitersPage';
import { CandidatesPage } from './pages/CandidatesPage';
import { ResumesPage } from './pages/ResumesPage';
import { AIMatcherPage } from './pages/AIMatcherPage';
import { CampaignsPage } from './pages/CampaignsPage';
import { OutreachPage } from './pages/OutreachPage';
import { FollowUpsPage } from './pages/FollowUpsPage';
import { RepliesPage } from './pages/RepliesPage';
import { CsvManagerPage } from './pages/CsvManagerPage';
import { AnalyticsPage } from './pages/AnalyticsPage';
import { DuplicateLogsPage } from './pages/DuplicateLogsPage';
import { SettingsPage } from './pages/SettingsPage';

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-900 text-white text-xs">
        Authenticating session...
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public routes */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />

          {/* Protected SaaS Layout routes */}
          <Route
            element={
              <ProtectedRoute>
                <DashboardLayout />
              </ProtectedRoute>
            }
          >
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/jobs" element={<JobsPage />} />
            <Route path="/recruiters" element={<RecruitersPage />} />
            <Route path="/candidates" element={<CandidatesPage />} />
            <Route path="/resumes" element={<ResumesPage />} />
            <Route path="/ai-matcher" element={<AIMatcherPage />} />
            <Route path="/campaigns" element={<CampaignsPage />} />
            <Route path="/outreach" element={<OutreachPage />} />
            <Route path="/followups" element={<FollowUpsPage />} />
            <Route path="/replies" element={<RepliesPage />} />
            <Route path="/csv" element={<CsvManagerPage />} />
            <Route path="/analytics" element={<AnalyticsPage />} />
            <Route path="/duplicate-logs" element={<DuplicateLogsPage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Route>

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
};

export default App;
