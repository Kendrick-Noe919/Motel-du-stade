const COULEURS = {
  DISPONIBLE: { bg: '#dcfce7', text: '#166534' },
  OCCUPEE: { bg: '#fee2e2', text: '#991b1b' },
  MAINTENANCE: { bg: '#fef3c7', text: '#92400e' },
  NETTOYAGE: { bg: '#dbeafe', text: '#1e40af' },
};

export default function BadgeEtat({ etat }) {
  const couleur = COULEURS[etat] || { bg: '#e5e7eb', text: '#374151' };

  return (
    <span
      style={{
        background: couleur.bg,
        color: couleur.text,
        padding: '4px 10px',
        borderRadius: 12,
        fontSize: 12,
        fontWeight: 600,
      }}
    >
      {etat}
    </span>
  );
}