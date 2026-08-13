import Carte from './Carte';

export default function StatCard({ icone, valeur, label, tendance }) {
  const enBaisse = tendance !== undefined && tendance < 0;

  return (
    <Carte style={{ flex: 1, minWidth: 180 }}>
      {icone && (
        <div style={{
          width: 40, height: 40, borderRadius: 8, background: 'var(--signal-dim)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, marginBottom: 20,
        }}>
          {icone}
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
        <div>
          <p className="mono" style={{ fontSize: 22, fontWeight: 700, margin: 0, color: 'var(--ink)' }}>{valeur}</p>
          <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--slate)', margin: '6px 0 0' }}>{label}</p>
        </div>

        {tendance !== undefined && (
          <span style={{
            display: 'flex', alignItems: 'center', gap: 4, fontSize: 13, fontWeight: 500,
            color: enBaisse ? 'var(--danger)' : 'var(--success)',
          }}>
            {enBaisse ? '↓' : '↑'} {Math.abs(tendance)}%
          </span>
        )}
      </div>
    </Carte>
  );
}