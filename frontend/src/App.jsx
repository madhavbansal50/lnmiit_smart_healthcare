import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { VitalsProvider } from './context/VitalsContext';
import { AppLayout } from './layouts/AppLayout';

// Auth Pages
import { Login } from './pages/auth/Login';

// Admin Pages
import { AdminDashboard } from './pages/admin/AdminDashboard';
import { DoctorManagement } from './pages/admin/DoctorManagement';
import { StudentManagement } from './pages/admin/StudentManagement';
import { DeviceManagement } from './pages/admin/DeviceManagement';
import { NodeRedDashboard } from './pages/admin/NodeRedDashboard';
import { AdminSettings } from './pages/admin/AdminSettings';

// Doctor Pages
import { DoctorDashboard } from './pages/doctor/DoctorDashboard';
import { DoctorPatients } from './pages/doctor/DoctorPatients';
import { PatientProfile } from './pages/doctor/PatientProfile';
import { LiveMonitoring } from './pages/doctor/LiveMonitoring';
import { MonitoringSessions } from './pages/doctor/MonitoringSessions';
import { DoctorPrescriptions } from './pages/doctor/DoctorPrescriptions';
import { DoctorAlerts } from './pages/doctor/DoctorAlerts';

// Student Pages
import { StudentDashboard } from './pages/student/StudentDashboard';
import { StudentHealth } from './pages/student/StudentHealth';
import { StudentHistory } from './pages/student/StudentHistory';
import { StudentPrescriptions } from './pages/student/StudentPrescriptions';
import { StudentReports } from './pages/student/StudentReports';
import { HealthAssistant } from './pages/student/HealthAssistant';
import { StudentProfile } from './pages/student/StudentProfile';

// Protected Route Guard
const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, loading, isAuthenticated } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-sky-600" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    // Redirect to their appropriate role home
    if (user.role === 'ADMIN') return <Navigate to="/admin" replace />;
    if (user.role === 'DOCTOR') return <Navigate to="/doctor" replace />;
    return <Navigate to="/student" replace />;
  }

  return children;
};

// Root Redirector based on authenticated role
const RootRedirect = () => {
  const { user, isAuthenticated, loading } = useAuth();

  if (loading) return null;
  if (!isAuthenticated) return <Navigate to="/login" replace />;

  if (user?.role === 'ADMIN') return <Navigate to="/admin" replace />;
  if (user?.role === 'DOCTOR') return <Navigate to="/doctor" replace />;
  return <Navigate to="/student" replace />;
};

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <VitalsProvider>
          <Routes>
            {/* Public Routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/" element={<RootRedirect />} />

            {/* Protected App Layout */}
            <Route
              element={
                <ProtectedRoute>
                  <AppLayout />
                </ProtectedRoute>
              }
            >
              {/* Admin Routes */}
              <Route
                path="/admin"
                element={
                  <ProtectedRoute allowedRoles={['ADMIN']}>
                    <AdminDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/doctors"
                element={
                  <ProtectedRoute allowedRoles={['ADMIN']}>
                    <DoctorManagement />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/students"
                element={
                  <ProtectedRoute allowedRoles={['ADMIN']}>
                    <StudentManagement />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/devices"
                element={
                  <ProtectedRoute allowedRoles={['ADMIN', 'DOCTOR']}>
                    <DeviceManagement />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/nodered"
                element={
                  <ProtectedRoute allowedRoles={['ADMIN', 'DOCTOR']}>
                    <NodeRedDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/settings"
                element={
                  <ProtectedRoute allowedRoles={['ADMIN']}>
                    <AdminSettings />
                  </ProtectedRoute>
                }
              />

              {/* Doctor Routes (also accessible to admin) */}
              <Route
                path="/doctor"
                element={
                  <ProtectedRoute allowedRoles={['DOCTOR', 'ADMIN']}>
                    <DoctorDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/doctor/patients"
                element={
                  <ProtectedRoute allowedRoles={['DOCTOR', 'ADMIN']}>
                    <DoctorPatients />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/doctor/patients/:id"
                element={
                  <ProtectedRoute allowedRoles={['DOCTOR', 'ADMIN']}>
                    <PatientProfile />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/doctor/monitoring"
                element={
                  <ProtectedRoute allowedRoles={['DOCTOR', 'ADMIN']}>
                    <LiveMonitoring />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/doctor/sessions"
                element={
                  <ProtectedRoute allowedRoles={['DOCTOR', 'ADMIN']}>
                    <MonitoringSessions />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/doctor/prescriptions"
                element={
                  <ProtectedRoute allowedRoles={['DOCTOR', 'ADMIN']}>
                    <DoctorPrescriptions />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/doctor/alerts"
                element={
                  <ProtectedRoute allowedRoles={['DOCTOR', 'ADMIN']}>
                    <DoctorAlerts />
                  </ProtectedRoute>
                }
              />

              {/* Student Routes */}
              <Route
                path="/student"
                element={
                  <ProtectedRoute allowedRoles={['STUDENT']}>
                    <StudentDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/student/health"
                element={
                  <ProtectedRoute allowedRoles={['STUDENT']}>
                    <StudentHealth />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/student/live"
                element={
                  <ProtectedRoute allowedRoles={['STUDENT']}>
                    <LiveMonitoring />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/student/history"
                element={
                  <ProtectedRoute allowedRoles={['STUDENT']}>
                    <StudentHistory />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/student/prescriptions"
                element={
                  <ProtectedRoute allowedRoles={['STUDENT']}>
                    <StudentPrescriptions />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/student/reports"
                element={
                  <ProtectedRoute allowedRoles={['STUDENT']}>
                    <StudentReports />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/student/assistant"
                element={
                  <ProtectedRoute allowedRoles={['STUDENT']}>
                    <HealthAssistant />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/student/profile"
                element={
                  <ProtectedRoute allowedRoles={['STUDENT']}>
                    <StudentProfile />
                  </ProtectedRoute>
                }
              />
            </Route>

            {/* Catch-all */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </VitalsProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
