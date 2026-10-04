import React from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import AppShell from './components/layout/AppShell';
import Landing from './pages/Landing';
import Login from './pages/Login';
import ForgotPassword, { ResetPassword } from './pages/ForgotPassword';
import Signup from './pages/Signup';
import Assessment from './pages/Assessment';
import Dashboard from './pages/Dashboard';
import Simulator from './pages/Simulator';
import History from './pages/History';
import Insights from './pages/Insights';
import Reports from './pages/Reports';
import Profile from './pages/Profile';
import Settings from './pages/Settings';
import ModelInsights from './pages/ModelInsights';
import ProtectedRoute from './components/auth/ProtectedRoute';
import Emergency from './pages/Emergency';
import HomeScreening from './pages/HomeScreening';
import Community from './pages/Community';
import { LanguageProvider } from './i18n';

function App() {
  return (
    <Router>
      <LanguageProvider>
      <AuthProvider>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/emergency" element={<Emergency />} />
        <Route element={<ProtectedRoute />}>
          <Route element={<AppShell />}>
          <Route path="/assessment" element={<Assessment />} />
          <Route path="/home-screening" element={<HomeScreening />} />
          <Route path="/community" element={<Community />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/simulator" element={<Simulator />} />
          <Route path="/history" element={<History />} />
          <Route path="/insights" element={<Insights />} />
          <Route path="/model-insights" element={<ModelInsights />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/settings" element={<Settings />} />
          </Route>
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      </AuthProvider>
      </LanguageProvider>
    </Router>
  );
}

export default App;