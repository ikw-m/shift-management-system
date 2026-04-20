import { Navigate } from 'react-router';
import { useAuth } from '../context/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireManager?: boolean;
}

export function ProtectedRoute({ children, requireManager = false }: ProtectedRouteProps) {
  const { currentUser, isManager } = useAuth();

  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  if (requireManager && !isManager) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
