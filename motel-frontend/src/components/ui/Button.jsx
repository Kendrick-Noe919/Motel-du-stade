const VARIANTES = {
  primaire: { background: 'var(--moss)', color: '#fff', border: '1.5px solid var(--moss)' },
  secondaire: { background: 'transparent', color: 'var(--ink)', border: '1.5px solid var(--line-strong)' },
  danger: { background: 'var(--danger)', color: '#fff', border: '1.5px solid var(--danger)' },
  fantome: { background: 'transparent', color: 'var(--slate)', border: '1.5px solid transparent' },
};

export default function Button({ variante = 'primaire', taille = 'md', arrondi = false, enCours = false, disabled, children, style, ...props }) {
  const couleurs = VARIANTES[variante];
  const padding = taille === 'sm' ? '8px 16px' : '11px 24px';
  const fontSize = taille === 'sm' ? 13 : 14;

  return (
    <button
      disabled={disabled || enCours}
      style={{
        ...couleurs,
        padding, fontSize, fontWeight: 500,
        borderRadius: arrondi ? 'var(--radius-full)' : 'var(--radius-sm)',
        cursor: disabled || enCours ? 'not-allowed' : 'pointer',
        opacity: disabled || enCours ? 0.6 : 1,
        transition: 'opacity 0.15s',
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
        ...style,
      }}
      onMouseEnter={(e) => { if (!disabled && !enCours) e.currentTarget.style.opacity = '0.88'; }}
      onMouseLeave={(e) => { if (!disabled && !enCours) e.currentTarget.style.opacity = '1'; }}
      {...props}
    >
      {enCours ? 'Chargement...' : children}
    </button>
  );
}