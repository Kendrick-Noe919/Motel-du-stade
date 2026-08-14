// Composition : la part de chacun dans un tout.
//
// À utiliser quand les grandeurs comparées ne sont pas de même nature — une
// nuitée et un jus de fruit. Les mettre en concurrence sur une même échelle ne
// dit rien : la chambre gagne toujours. La question qui a du sens est « quelle
// part du chiffre du jour vient d'où ? », et sa référence est explicite : le total.
//
// Une seule barre lue de gauche à droite, chaque part étiquetée avec son montant
// ET son pourcentage. La couleur n'est qu'un repère d'identité.

import { TEINTES } from './BarresComparees';

const formaterDefaut = (n) => Number(n || 0).toLocaleString('fr-FR');

export default function PartsDuTotal({ parts, formater = formaterDefaut, libelleTotal = 'Total', vide = 'Rien à répartir.' }) {
  const lignes = parts.filter(Boolean).map((p, i) => ({
    ...p,
    valeur: Number(p.valeur) || 0,
    couleur: p.couleur || TEINTES[i % TEINTES.length],
  }));
  const total = lignes.reduce((s, l) => s + l.valeur, 0);

  if (total <= 0) {
    return <p style={{ color: 'var(--slate)', fontSize: 13, margin: 0 }}>{vide}</p>;
  }

  const pourcentage = (valeur) => Math.round((valeur / total) * 1000) / 10;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 'var(--space-3)' }}>
        <span style={{ fontSize: 12, color: 'var(--slate)' }}>{libelleTotal}</span>
        <span className="mono" style={{ fontSize: 18, fontWeight: 700, color: 'var(--ink)' }}>{formater(total)}</span>
      </div>

      {/* Les parts nulles sont retirées de la barre : un segment de largeur zéro
          laisserait un liseré fantôme entre deux couleurs. */}
      <div style={{ display: 'flex', gap: 2, height: 12, marginBottom: 'var(--space-4)' }}>
        {lignes.filter((l) => l.valeur > 0).map((l) => (
          <div
            key={l.label}
            title={`${l.label} : ${formater(l.valeur)} · ${pourcentage(l.valeur)} %`}
            style={{ flex: l.valeur, background: l.couleur, borderRadius: 3, minWidth: 3 }}
          />
        ))}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {lignes.map((l) => (
          <div key={l.label}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12 }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 13, color: 'var(--ink)', fontWeight: 500 }}>
                <span style={{ width: 9, height: 9, borderRadius: 2, background: l.couleur, flexShrink: 0 }} />
                {l.label}
              </span>
              <span style={{ display: 'flex', alignItems: 'baseline', gap: 8, whiteSpace: 'nowrap' }}>
                <span className="mono" style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}>{formater(l.valeur)}</span>
                <span className="mono" style={{ fontSize: 12, color: 'var(--slate)', minWidth: 44, textAlign: 'right' }}>
                  {pourcentage(l.valeur)} %
                </span>
              </span>
            </div>
            {l.detail && <p style={{ margin: '3px 0 0', fontSize: 11.5, color: 'var(--slate)' }}>{l.detail}</p>}
          </div>
        ))}
      </div>
    </div>
  );
}
