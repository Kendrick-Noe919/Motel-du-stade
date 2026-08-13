const COULEURS = {
  EN_ATTENTE: { bg: '#fef3c7', text: '#92400e' },
  CONFIRMEE: { bg: '#dcfce7', text: '#166534' },
  EN_COURS: { bg: '#dbeafe', text: '#1e40af' },
  TERMINEE: { bg: '#e5e7eb', text: '#374151' },
  ANNULEE: { bg: '#fee2e2', text: '#991b1b' },
};

export default function BadgeStatut({ statut }) {
  const couleur = COULEURS[statut] || { bg: '#e5e7eb', text: '#374151' };

  return (
    <span style={{ background: couleur.bg, color: couleur.text, padding: '4px 10px', borderRadius: 12, fontSize: 12, fontWeight: 600 }}>
      {statut}
    </span>
  );
}