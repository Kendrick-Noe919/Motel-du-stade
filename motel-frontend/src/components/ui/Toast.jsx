import { useEffect } from 'react';

// Confirmation flottante, posée AU-DESSUS de tout, modals compris.
//
// Le bandeau de confirmation vivait dans le flux de la page : dès qu'un modal
// était ouvert, il apparaissait derrière le voile. On validait une modification,
// le message partait se coucher hors de vue, et rien dans le modal ne disait que
// l'action avait abouti. Sur une action rapide, on doutait d'avoir cliqué.
//
// Un z-index supérieur à celui des modals (100) règle le problème une fois pour
// toutes, quel que soit le nombre de fenêtres empilées.
const DUREE_AFFICHAGE_MS = 4000;

const TONS = {
  succes: { fond: '#15803D', icone: '✓' },
  erreur: { fond: '#DC2626', icone: '!' },
};

export default function Toast({ message, ton = 'succes', onFermer }) {
  useEffect(() => {
    if (!message) return undefined;
    const minuteur = setTimeout(onFermer, DUREE_AFFICHAGE_MS);
    return () => clearTimeout(minuteur);
  }, [message, onFermer]);

  if (!message) return null;
  const style = TONS[ton] || TONS.succes;

  return (
    <div
      role="status"
      aria-live="polite"
      onClick={onFermer}
      className="anim-toast"
      style={{
        position: 'fixed', top: 20, left: '50%',
        zIndex: 3000, // au-dessus des modals (100) et de leurs voiles
        display: 'flex', alignItems: 'center', gap: 10,
        background: style.fond, color: '#fff',
        padding: '12px 20px', borderRadius: 'var(--radius-full)',
        boxShadow: '0 8px 24px -6px rgba(23, 36, 31, 0.35)',
        fontSize: 13.5, fontWeight: 500, maxWidth: 'min(560px, 92vw)',
        cursor: 'pointer',
      }}
    >
      <span style={{
        width: 18, height: 18, borderRadius: '50%', background: 'rgba(255,255,255,0.22)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, flexShrink: 0,
      }}>
        {style.icone}
      </span>
      {message}
    </div>
  );
}

// Fait durer une action au moins `minimum` millisecondes.
//
// Une requête qui répond en 80 ms ne laisse rien voir : le bouton passe en
// « Chargement… » et en revient avant que l'œil l'ait enregistré, et on se demande
// si le clic a été pris en compte. Un plancher court rend l'action perceptible sans
// donner l'impression que l'application traîne.
export async function avecDureeMinimale(promesse, minimum = 450) {
  const [resultat] = await Promise.all([
    promesse,
    new Promise((resoudre) => setTimeout(resoudre, minimum)),
  ]);
  return resultat;
}
