import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

// Garde d'accès. La vraie serrure est côté API : ceci évite simplement d'afficher
// une page vide et cassée à quelqu'un qui tape une URL qui ne le concerne pas.
export default function RouteProtegee({ children, roles }) {
  const { estConnecte, chargement, utilisateur } = useAuth();

  if (chargement) {
    return <div>Chargement...</div>;
  }

  if (!estConnecte) {
    return <Navigate to="/login" replace />;
  }

  if (roles && !roles.some((role) => utilisateur?.roles?.includes(role))) {
    return <AccesRefuse />;
  }

  return children;
}

function AccesRefuse() {
  return (
    <div style={{ maxWidth: 460, margin: 'var(--space-8) auto', textAlign: 'center' }}>
      <p style={{
        fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '0.12em',
        textTransform: 'uppercase', color: 'var(--slate-light)', marginBottom: 'var(--space-3)',
      }}>
        Accès refusé
      </p>
      <h2 style={{ marginBottom: 'var(--space-3)' }}>Cette page ne vous est pas destinée</h2>
      <p style={{ color: 'var(--slate)', fontSize: 14 }}>
        Votre rôle ne donne pas accès à ce module. Utilisez le menu à gauche pour
        revenir à vos écrans, ou demandez un accès à l'administrateur.
      </p>
    </div>
  );
}
