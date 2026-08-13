export default function BarreProgression({ pourcentage, hauteur = 10 }) {
  const clamp = Math.min(100, Math.max(0, pourcentage));

  return (
    <div style={{
      width: '100%', height: hauteur, borderRadius: 'var(--radius-full)',
      background: `repeating-linear-gradient(135deg, var(--stone-dim), var(--stone-dim) 4px, var(--surface) 4px, var(--surface) 8px)`,
      overflow: 'hidden',
    }}>
      <div style={{
        width: `${clamp}%`, height: '100%', borderRadius: 'var(--radius-full)',
        background: 'var(--gradient-signal)', transition: 'width 0.3s',
      }} />
    </div>
  );
}