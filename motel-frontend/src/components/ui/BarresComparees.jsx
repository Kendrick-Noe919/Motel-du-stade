// Comparaison de grandeurs : des barres horizontales, pas un camembert.
// Comparer des longueurs alignées sur une même base est immédiat, comparer des
// angles ne l'est pas — et un camembert à deux parts n'apprend rien de plus
// qu'une phrase.
//
// Chaque barre porte sa valeur en clair : la couleur n'est qu'un repère
// d'identité, jamais la seule façon de lire le graphique.

// Teintes catégorielles, dans un ordre fixe et jamais recyclé. Validées pour
// rester distinguables en vision normale comme en daltonisme (deutan/protan/tritan),
// et suffisamment contrastées sur fond blanc.
export const TEINTES = ['#16A34A', '#2563EB', '#B45309', '#7C3AED'];

const formaterDefaut = (n) => Number(n || 0).toLocaleString('fr-FR');

export default function BarresComparees({ series, formater = formaterDefaut, vide = 'Aucune donnée sur la période.' }) {
  const lignes = series.filter((s) => s);
  const maximum = Math.max(...lignes.map((l) => Number(l.valeur) || 0), 0);

  if (lignes.length === 0 || maximum === 0) {
    return <p style={{ color: 'var(--slate)', fontSize: 13, margin: 0 }}>{vide}</p>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
      {lignes.map((l, i) => {
        const valeur = Number(l.valeur) || 0;
        const couleur = l.couleur || TEINTES[i % TEINTES.length];
        // Une part nulle garde une amorce visible : sinon la ligne disparaît et
        // on croit à une donnée manquante plutôt qu'à un zéro.
        const largeur = maximum === 0 ? 0 : Math.max((valeur / maximum) * 100, valeur > 0 ? 1.5 : 0);

        return (
          <div key={l.label} title={`${l.label} : ${formater(valeur)}${l.detail ? ` · ${l.detail}` : ''}`}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 5 }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 13, color: 'var(--ink)', fontWeight: 500 }}>
                <span style={{ width: 9, height: 9, borderRadius: 2, background: couleur, flexShrink: 0 }} />
                {l.label}
              </span>
              <span className="mono" style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}>{formater(valeur)}</span>
            </div>

            <div style={{ height: 8, background: 'var(--stone-dim)', borderRadius: 4, overflow: 'hidden' }}>
              <div style={{ width: `${largeur}%`, height: '100%', background: couleur, borderRadius: 4 }} />
            </div>

            {l.detail && (
              <p style={{ margin: '4px 0 0', fontSize: 11.5, color: 'var(--slate)' }}>{l.detail}</p>
            )}
          </div>
        );
      })}
    </div>
  );
}
