import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function RouteProtegee({ children }) {
  const { estConnecte, chargement } = useAuth();

  if (chargement) {
    return <div>Chargement...</div>;
  }

  if (!estConnecte) {
    return <Navigate to="/login" replace />;
  }

  return children;
}