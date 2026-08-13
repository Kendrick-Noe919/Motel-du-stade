export default function Champ({ label, erreur, hint, children }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {label && (
        <label style={{
          fontSize: 13,
          fontWeight: 500,
          color: 'var(--ink)',
        }}>
          {label}
        </label>
      )}
      {children}
      {hint && !erreur && <span style={{ fontSize: 12, color: 'var(--slate-light)' }}>{hint}</span>}
      {erreur && <span style={{ fontSize: 12, color: 'var(--danger)' }}>{erreur}</span>}
    </div>
  );
}

// Style partagé pour <input>, <select>, <textarea> — reprend fidèlement InputGroup/select.tsx du template
export const styleInput = {
  width: '100%',
  height: 44,
  padding: '0 16px',
  border: '1.5px solid var(--line)',
  borderRadius: 8,
  background: 'transparent',
  fontSize: 14,
  fontFamily: 'var(--font-body)',
  color: 'var(--ink)',
  outline: 'none',
  transition: 'border-color 0.15s',
  boxSizing: 'border-box',
};

// Gestionnaires de focus réutilisables — juste la bordure qui passe en indigo, comme dans la référence
export const focusHandlers = {
  onFocus: (e) => { e.target.style.borderColor = 'var(--signal)'; },
  onBlur: (e) => { e.target.style.borderColor = 'var(--line)'; },
};

