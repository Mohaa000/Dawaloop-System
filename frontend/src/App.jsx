import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import ProtectedRoute from './components/ProtectedRoute';
import DashboardLayout from './components/DashboardLayout';
import LoginScreen from './components/LoginScreen';
import LoadingScreen from './components/LoadingScreen';

import AdminDashboard from './Pages/AdminDashboard';
import PatientEnrollment from './Pages/PatientEnrollment';
import PatientDetail from './Pages/PatientDetail';
import Inventory from './Pages/Inventory';
import AlertsCenter from './Pages/AlertsCenter';
import NurseSettings from './Pages/NurseSettings';

import PatientPortal from './Pages/PatientPortal';
import MedicationHistory from './Pages/MedicationHistory';
import RefillHistory from './Pages/RefillHistory';
import Support from './Pages/Support';
import ProfileSettings from './Pages/ProfileSettings';

const HOME_PATH = { admin: '/admin', nurse: '/nurse', patient: '/portal' };

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
            <Route path="/admin/enrollment" element={<PatientEnrollment />} />
            <Route path="/admin/patients/:patientId" element={<PatientDetail />} />
            <Route path="/admin/inventory" element={<Inventory />} />
            <Route path="/admin/alerts" element={<AlertsCenter />} />
            <Route path="/admin/nurses" element={<NurseSettings />} />
          </Route>
        </Route>

        {/* Nurse fork mirrors the admin fork exactly for now, reusing the same page components */}
        <Route element={<ProtectedRoute role="nurse" />}>
          <Route element={<DashboardLayout role="nurse" />}>
            <Route path="/nurse" element={<AdminDashboard />} />
            <Route path="/nurse/enrollment" element={<PatientEnrollment />} />
            <Route path="/nurse/patients/:patientId" element={<PatientDetail />} />
            <Route path="/nurse/inventory" element={<Inventory />} />
            <Route path="/nurse/alerts" element={<AlertsCenter />} />
            <Route path="/nurse/nurses" element={<NurseSettings />} />
          </Route>
        </Route>

        <Route element={<ProtectedRoute role="patient" />}>
          <Route element={<DashboardLayout role="patient" />}>
            <Route path="/portal" element={<PatientPortal />} />
            <Route path="/portal/history" element={<MedicationHistory />} />
            <Route path="/portal/refills" element={<RefillHistory />} />
            <Route path="/portal/support" element={<Support />} />
            <Route path="/portal/profile" element={<ProfileSettings />} />
          </Route>
        </Route>

        <Route path="*" element={<Navigate to={HOME_PATH[userRole] || '/portal'} replace />} />
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
