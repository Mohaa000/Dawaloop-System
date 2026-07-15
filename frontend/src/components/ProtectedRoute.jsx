import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function ProtectedRoute({ role }) {
  const { userRole } = useAuth();

  if (userRole !== role) {
    return <Navigate to={userRole === 'admin' ? '/admin' : '/portal'} replace />;
  }

  return <Outlet />;
}
