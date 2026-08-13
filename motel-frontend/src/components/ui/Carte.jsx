export default function Carte({ children, padding = 'var(--space-5)', style }) {
  return (
    <div style={{
      background: 'var(--surface)',
      border: '1px solid var(--line)',
      borderRadius: 'var(--radius-md)',
      boxShadow: 'var(--shadow-sm)',
      padding,
      ...style,
    }}>
      {children}
    </div>
  );
}