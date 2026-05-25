import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import LoadingScreen from './LoadingScreen';

export default function RequireAuth({ children }) {
  const { isAuthenticated, loading } = useAuth();
  const location = useLocation();

  if (loading) return <LoadingScreen />;

  if (!isAuthenticated) {
    const next = location.pathname + location.search + location.hash;
    return <Navigate to={`/auth?next=${encodeURIComponent(next)}`} replace />;
  }

  return children;
}