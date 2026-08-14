import { useState } from 'react';
import { styleInput } from './ui/Champ';

// Sélecteur de période partagé par les Recettes et l'Historique : le cahier des
// charges demande jour, semaine, mois, année ou période personnalisée.
const RACCOURCIS = [
  { cle: 'jour', label: "Aujourd'hui" },
  { cle: 'semaine', label: '7 jours' },
  { cle: 'mois', label: 'Ce mois' },
  { cle: 'annee', label: 'Cette année' },
  { cle: 'libre', label: 'Période' },
];

export function bornesPeriode(cle, debutLibre, finLibre) {
  const debut = new Date();
  const fin = new Date();
  fin.setHours(23, 59, 59, 999);

  switch (cle) {
    case 'semaine': debut.setDate(debut.getDate() - 6); break;
    case 'mois': debut.setDate(1); break;
    case 'annee': debut.setMonth(0, 1); break;
    case 'libre':
      return {
        debut: debutLibre ? new Date(debutLibre) : debut,
        fin: finLibre ? new Date(`${finLibre}T23:59:59`) : fin,
      };
    default: break; // jour
  }
  debut.setHours(0, 0, 0, 0);
  return { debut, fin };
}

export default function SelecteurPeriode({ valeur, onChanger }) {
  const [debutLibre, setDebutLibre] = useState('');
  const [finLibre, setFinLibre] = useState('');

  function choisir(cle, d = debutLibre, f = finLibre) {
    const bornes = bornesPeriode(cle, d, f);
    onChanger({ cle, ...bornes });
  }

  return (
    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center', marginBottom: 'var(--space-5)' }}>
      {RACCOURCIS.map(({ cle, label }) => (
        <button
          key={cle}
          onClick={() => choisir(cle)}
          style={{
            padding: '7px 13px', borderRadius: 'var(--radius-sm)', cursor: 'pointer', fontSize: 13,
            fontWeight: valeur === cle ? 600 : 500,
            border: `1px solid ${valeur === cle ? 'var(--moss)' : 'var(--line)'}`,
            background: valeur === cle ? 'var(--moss)' : 'transparent',
            color: valeur === cle ? '#fff' : 'var(--slate)',
          }}
        >
          {label}
        </button>
      ))}

      {valeur === 'libre' && (
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <input
            type="date" value={debutLibre}
            onChange={(e) => { setDebutLibre(e.target.value); choisir('libre', e.target.value, finLibre); }}
            style={{ ...styleInput, height: 34, fontSize: 12.5, width: 145 }}
          />
          <span style={{ color: 'var(--slate-light)', fontSize: 12 }}>au</span>
          <input
            type="date" value={finLibre} min={debutLibre}
            onChange={(e) => { setFinLibre(e.target.value); choisir('libre', debutLibre, e.target.value); }}
            style={{ ...styleInput, height: 34, fontSize: 12.5, width: 145 }}
          />
        </div>
      )}
    </div>
  );
}
