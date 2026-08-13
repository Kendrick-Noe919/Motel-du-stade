const TONS = {
  neutre: { bg: 'var(--stone-dim)', text: 'var(--slate)' },
  succes: { bg: 'var(--success-bg)', text: 'var(--success)' },
  attention: { bg: 'var(--warning-bg)', text: 'var(--warning)' },
  danger: { bg: 'var(--danger-bg)', text: 'var(--danger)' },
  info: { bg: 'var(--info-bg)', text: 'var(--info)' },
  signal: { bg: 'var(--signal-dim)', text: 'var(--signal)' },
};

// Mappe chaque valeur métier (statut, état...) vers un ton visuel — un seul endroit à maintenir
export const TON_ETAT_CHAMBRE = { DISPONIBLE: 'succes', OCCUPEE: 'danger', MAINTENANCE: 'attention', NETTOYAGE: 'info' };
export const TON_STATUT_RESERVATION = { EN_ATTENTE: 'attention', CONFIRMEE: 'succes', EN_COURS: 'info', TERMINEE: 'neutre', ANNULEE: 'danger' };

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