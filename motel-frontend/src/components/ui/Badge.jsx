// Exporté : les écrans qui posent un repère de couleur ailleurs qu'en badge (une
// pastille, un liseré de carte) doivent lire la même table. Sinon la nuance dérive
// d'un écran à l'autre et les états oubliés tombent dans une couleur par défaut.
export const TONS = {
  neutre: { bg: 'var(--stone-dim)', text: 'var(--slate)' },
  succes: { bg: 'var(--success-bg)', text: 'var(--success)' },
  attention: { bg: 'var(--warning-bg)', text: 'var(--warning)' },
  danger: { bg: 'var(--danger-bg)', text: 'var(--danger)' },
  info: { bg: 'var(--info-bg)', text: 'var(--info)' },
  signal: { bg: 'var(--signal-dim)', text: 'var(--signal)' },
};

// Mappe chaque valeur métier (statut, état...) vers un ton visuel : un seul endroit à maintenir
export const TON_ETAT_CHAMBRE = {
  DISPONIBLE: 'succes', RESERVEE: 'signal', OCCUPEE: 'danger',
  NETTOYAGE: 'info', MAINTENANCE: 'attention', HORS_SERVICE: 'neutre',
};
export const TON_STATUT_RESERVATION = {
  EN_ATTENTE: 'attention', CONFIRMEE: 'succes', EN_COURS: 'info',
  TERMINEE: 'neutre', ANNULEE: 'danger', EXPIREE: 'neutre',
};

// Libellés lisibles. La transformation automatique donnait « Occupee » : elle
// abaisse la casse sans pouvoir restituer les accents. On nomme donc les états à
// la main, et on ne garde la transformation que comme filet pour une valeur
// ajoutée en base sans passer ici.
const LIBELLES_ETAT = {
  DISPONIBLE: 'Disponible',
  RESERVEE: 'Réservée',
  OCCUPEE: 'Occupée',
  NETTOYAGE: 'Nettoyage',
  MAINTENANCE: 'Maintenance',
  HORS_SERVICE: 'Hors service',
};

export const libelleEtat = (valeur) => {
  if (typeof valeur !== 'string') return valeur;
  return LIBELLES_ETAT[valeur] || valeur.charAt(0) + valeur.slice(1).toLowerCase().replace(/_/g, ' ');
};

export default function Badge({ label, ton = 'neutre' }) {
  const couleur = TONS[ton];
  return (
    <span style={{
      display: 'inline-block',
      background: couleur.bg,
      color: couleur.text,
      padding: '3px 10px',
      borderRadius: 20,
      fontSize: 11,
      fontFamily: 'var(--font-mono)',
      fontWeight: 500,
      letterSpacing: '0.02em',
    }}>
      {label}
    </span>
  );
}