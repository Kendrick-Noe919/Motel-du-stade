import { useState } from 'react';

// Page de blocage affichée quand l'application est suspendue. Statique : elle ne
// pilote rien, elle informe. Le message par défaut peut être remplacé par celui
// renvoyé par le serveur.
const MESSAGE_DEFAUT = "Votre période de paiement est arrivée à échéance. Pour continuer "
  + "à utiliser l'application, veuillez procéder au règlement du solde de votre facture. "
  + "Une fois le règlement effectué, l'accès à l'application sera rétabli.";

export default function Indisponible({ message }) {
  const [verification, setVerification] = useState(false);

  // Recharge la page : si l'accès a été rétabli entre-temps, la porte laisse
  // repasser vers l'application.
  function reessayer() {
    setVerification(true);
    window.location.reload();
  }

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 'var(--space-6)', background: 'var(--surface)', position: 'relative', overflow: 'hidden',
    }}>
      {/* Cadenas en filigrane, faible opacité : le blocage se lit d'un coup d'œil. */}
      <svg
        viewBox="0 0 24 24" aria-hidden="true"
        style={{
          position: 'absolute', width: 'min(72vh, 620px)', height: 'auto',
          color: 'var(--ink)', opacity: 0.04, pointerEvents: 'none',
        }}
      >
        <path
          fill="currentColor"
          d="M12 1a5 5 0 0 0-5 5v3H6a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-9a2 2 0 0 0-2-2h-1V6a5 5 0 0 0-5-5Zm3 8H9V6a3 3 0 0 1 6 0v3Zm-3 5a1.5 1.5 0 0 1 1 2.6V19a1 1 0 1 1-2 0v-2.4a1.5 1.5 0 0 1 1-2.6Z"
        />
      </svg>

      <div style={{ position: 'relative', maxWidth: 520, textAlign: 'center' }}>
        <p style={{
          fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '0.14em',
          textTransform: 'uppercase', color: 'var(--slate-light)', marginBottom: 'var(--space-4)',
        }}>
          Application temporairement suspendue
        </p>

        <h1 style={{ fontSize: 26, lineHeight: 1.25, marginBottom: 'var(--space-4)' }}>
          Accès momentanément indisponible
        </h1>

        <p style={{ color: 'var(--slate)', fontSize: 15, lineHeight: 1.6, marginBottom: 'var(--space-6)' }}>
          {message || MESSAGE_DEFAUT}
        </p>

        <button
          onClick={reessayer}
          disabled={verification}
          style={{
            background: 'var(--moss)', color: '#fff', border: 'none',
            padding: '11px 24px', borderRadius: 'var(--radius-full)', fontSize: 14,
            fontWeight: 500, cursor: verification ? 'wait' : 'pointer',
            fontFamily: 'var(--font-body)',
          }}
        >
          {verification ? 'Vérification...' : "Vérifier l'accès"}
        </button>
      </div>
    </div>
  );
}
