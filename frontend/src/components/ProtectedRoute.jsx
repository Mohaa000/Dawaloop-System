import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const HOME_PATH = { admin: '/admin', nurse: '/nurse', patient: '/portal' };

export default function ProtectedRoute({ role }) {
  const { userRole } = useAuth();

  if (userRole !== role) {
    return <Navigate to={HOME_PATH[userRole] || '/portal'} replace />;
  }

  return <Outlet />;
}
