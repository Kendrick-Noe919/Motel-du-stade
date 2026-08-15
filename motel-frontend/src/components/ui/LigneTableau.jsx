import { useState } from 'react';

// Ligne de tableau : alternance de fond, surbrillance au survol, et clic optionnel.
//
// L'alternance (`index`) n'est pas décorative. Sur un tableau tout blanc, l'œil
// perd la ligne en la parcourant de gauche à droite et lit le montant du voisin.
// Une bande claire une ligne sur deux sert de rail.
//
// Le survol reste plus marqué que la bande : on doit toujours distinguer « la ligne
// que je survole » de « la ligne paire ».
export default function LigneTableau({ children, style, onClick, index = 0 }) {
  const [survol, setSurvol] = useState(false);
  const cliquable = typeof onClick === 'function';

  function auClavier(evenement) {
    if (!cliquable) return;
    if (evenement.key === 'Enter' || evenement.key === ' ') {
      evenement.preventDefault();
      onClick(evenement);
    }
  }

  const fond = survol
    ? 'var(--stone-dim)'
    : index % 2 === 1 ? 'var(--stone)' : 'transparent';

  return (
    <tr
      onMouseEnter={() => setSurvol(true)}
      onMouseLeave={() => setSurvol(false)}
      onClick={onClick}
      onKeyDown={auClavier}
      tabIndex={cliquable ? 0 : undefined}
      role={cliquable ? 'button' : undefined}
      style={{
        borderBottom: '1px solid var(--line)',
        background: fond,
        transition: 'background 0.1s',
        cursor: cliquable ? 'pointer' : undefined,
        ...style,
      }}
    >
      {children}
    </tr>
  );
}
