const STYLES = {
  succes: { bg: 'var(--success-bg)', border: 'var(--success)', text: 'var(--success)', icone: '✓' },
  erreur: { bg: 'var(--danger-bg)', border: 'var(--danger)', text: 'var(--danger)', icone: '✕' },
  attention: { bg: 'var(--warning-bg)', border: 'var(--warning)', text: 'var(--warning)', icone: '!' },
};

// Une alerte surgit sans prévenir et pousse le contenu vers le bas : apparue d'un
// coup, elle fait sursauter la page. Elle se déplie donc en s'ouvrant, brièvement.
// L'animation est désactivée si le système demande de réduire les mouvements.
export default function Alerte({ variante = 'erreur', titre, children }) {
  const style = STYLES[variante];

  return (
    <div className="anim-alerte" style={{
      display: 'flex', gap: 12, alignItems: 'flex-start',
      background: style.bg, borderLeft: `4px solid ${style.border}`,
      borderRadius: 'var(--radius-sm)', padding: '12px 16px', fontSize: 13,
    }}>
      <span style={{
        width: 20, height: 20, borderRadius: '50%', background: style.border, color: '#fff',
        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, flexShrink: 0, marginTop: 1,
      }}>
        {style.icone}
      </span>
      <div>
        {titre && <p style={{ margin: 0, fontWeight: 600, color: style.text }}>{titre}</p>}
        <p style={{ margin: titre ? '2px 0 0' : 0, color: 'var(--ink)' }}>{children}</p>
      </div>
    </div>
  );
}