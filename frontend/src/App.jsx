import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import ProtectedRoute from './components/ProtectedRoute';
import DashboardLayout from './components/DashboardLayout';
import LoginScreen from './components/LoginScreen';
import LoadingScreen from './components/LoadingScreen';

import AdminDashboard from './Pages/AdminDashboard';
import AdminAnalytics from './Pages/AdminAnalytics';
import PatientDetail from './Pages/PatientDetail';
import Inventory from './Pages/Inventory';
import AlertsCenter from './Pages/AlertsCenter';
import StaffSettings from './Pages/StaffSettings';

import PatientPortal from './Pages/PatientPortal';
import PatientAnalytics from './Pages/PatientAnalytics';
import MedicationHistory from './Pages/MedicationHistory';
import RefillHistory from './Pages/RefillHistory';
import Support from './Pages/Support';
import ProfileSettings from './Pages/ProfileSettings';

function AppRoutes() {
  const { user, userRole, isCheckingAuth } = useAuth();

  if (isCheckingAuth) return <LoadingScreen />;
  if (!user) return <LoginScreen />;

  return (
    <BrowserRouter>
      <Routes>
        <Route element={<ProtectedRoute role="admin" />}>
          <Route element={<DashboardLayout role="admin" />}>
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/admin/analytics" element={<AdminAnalytics />} />
            <Route path="/admin/patients/:patientId" element={<PatientDetail />} />
            <Route path="/admin/inventory" element={<Inventory />} />
            <Route path="/admin/alerts" element={<AlertsCenter />} />
            <Route path="/admin/settings" element={<StaffSettings />} />
          </Route>
        </Route>

        <Route element={<ProtectedRoute role="patient" />}>
          <Route element={<DashboardLayout role="patient" />}>
            <Route path="/portal" element={<PatientPortal />} />
            <Route path="/portal/analytics" element={<PatientAnalytics />} />
            <Route path="/portal/history" element={<MedicationHistory />} />
            <Route path="/portal/refills" element={<RefillHistory />} />
            <Route path="/portal/support" element={<Support />} />
            <Route path="/portal/profile" element={<ProfileSettings />} />
          </Route>
        </Route>

        <Route path="*" element={<Navigate to={userRole === 'admin' ? '/admin' : '/portal'} replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <AppRoutes />
      </ToastProvider>
    </AuthProvider>
  );
}
