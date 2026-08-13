const STYLES = {
  succes: { bg: 'var(--success-bg)', border: 'var(--success)', text: 'var(--success)', icone: '✓' },
  erreur: { bg: 'var(--danger-bg)', border: 'var(--danger)', text: 'var(--danger)', icone: '✕' },
  attention: { bg: 'var(--warning-bg)', border: 'var(--warning)', text: 'var(--warning)', icone: '!' },
};

export default function Alerte({ variante = 'erreur', titre, children }) {
  const style = STYLES[variante];

  return (
    <div style={{
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