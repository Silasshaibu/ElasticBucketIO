import React from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { DataProvider } from './contexts/DataContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Files from './pages/Files';
import AdminUsers from './pages/AdminUsers';
import AdminBackends from './pages/AdminBackends';
import AuditLog from './pages/AuditLog';
import QuotaEvents from './pages/QuotaEvents';
import Architecture from './pages/Architecture';
import ShareLinks from './pages/ShareLinks';
import ChangePassword from './pages/ChangePassword';
import SharePage from './pages/SharePage';
import NotFound from './pages/NotFound';

function ProtectedRoute({ children, adminOnly = false }: { children: React.ReactNode; adminOnly?: boolean }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (adminOnly && user.role !== 'admin') return <Navigate to="/files" replace />;
  return <Layout>{children}</Layout>;
}

function MustChangePasswordRoute({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (!user.mustChangePassword) return <Navigate to="/files" replace />;
  return <>{children}</>;
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  if (user) return <Navigate to="/files" replace />;
  return <>{children}</>;
}

function AppRoutes() {
  return (
    <Routes>
      {/* Public routes */}
      <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
      <Route path="/s/:token" element={<SharePage />} />
      
      {/* Password change (must happen before normal access) */}
      <Route path="/change-password" element={<MustChangePasswordRoute><ChangePassword /></MustChangePasswordRoute>} />
      
      {/* Protected routes */}
      <Route path="/dashboard" element={<ProtectedRoute adminOnly><Dashboard /></ProtectedRoute>} />
      <Route path="/files" element={<ProtectedRoute><Files /></ProtectedRoute>} />
      <Route path="/admin/users" element={<ProtectedRoute adminOnly><AdminUsers /></ProtectedRoute>} />
      <Route path="/admin/backends" element={<ProtectedRoute adminOnly><AdminBackends /></ProtectedRoute>} />
      <Route path="/admin/audit" element={<ProtectedRoute adminOnly><AuditLog /></ProtectedRoute>} />
      <Route path="/admin/quotas" element={<ProtectedRoute adminOnly><QuotaEvents /></ProtectedRoute>} />
      <Route path="/admin/architecture" element={<ProtectedRoute adminOnly><Architecture /></ProtectedRoute>} />
      <Route path="/shares" element={<ProtectedRoute><ShareLinks /></ProtectedRoute>} />
      
      {/* Default redirect */}
      <Route path="/" element={<Navigate to="/files" replace />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

export default function App() {
  return (
    <HashRouter>
      <AuthProvider>
        <DataProvider>
          <AppRoutes />
        </DataProvider>
      </AuthProvider>
    </HashRouter>
  );
}
