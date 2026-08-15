// Jeu d'icônes de l'application.
//
// Dessinées en SVG plutôt que prises dans une police d'émojis : elles héritent de
// la couleur du texte (currentColor), gardent la même épaisseur de trait partout,
// et ne changent pas d'aspect d'un poste à l'autre.
//
// Le trait est volontairement fin et le vocabulaire réduit : une icône n'est utile
// que si elle est reconnue sans effort. Chaque action garde son intitulé en toutes
// lettres dans le détail ; l'icône seule ne sert que là où la place manque, toujours
// accompagnée d'un title pour le survol et d'un aria-label pour la lecture d'écran.

const TRAITS = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.7,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
};

const CHEMINS = {
  // Portefeuille avec son fermoir : encaisser. Le billet seul se lisait comme un
  // simple rectangle à cette taille.
  regler: <><path d="M19 7V6a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-8a2 2 0 0 0-2-2H5" /><circle cx="16.5" cy="14" r="1.3" /></>,
  // Flèche entrant dans une porte : le client arrive
  arrivee: <><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" /><path d="M10 17l5-5-5-5" /><path d="M15 12H3" /></>,
  // Flèche sortant : le client repart
  depart: <><path d="M9 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h4" /><path d="M16 17l5-5-5-5" /><path d="M21 12H9" /></>,
  // Curseurs de réglage : gérer le séjour. Ce bouton n'ouvre pas « un lit », il
  // ouvre les réglages du séjour — consommations, prolongation, départ. Le lit
  // décrivait l'objet, pas l'action.
  sejour: <><path d="M4 7h8M18 7h2" /><circle cx="15" cy="7" r="2.2" /><path d="M4 17h4M14 17h6" /><circle cx="11" cy="17" r="2.2" /></>,
  // Coche : confirmer
  confirmer: <path d="M4 12.5l5.5 5.5L20 7" />,
  // Croix cerclée : annuler
  annuler: <><circle cx="12" cy="12" r="9" /><path d="M15 9l-6 6M9 9l6 6" /></>,
  // Crayon : modifier
  modifier: <><path d="M4 20h4l10.5-10.5a2.1 2.1 0 0 0-3-3L5 17v3z" /><path d="M13.5 6.5l4 4" /></>,
  // Corbeille : supprimer
  supprimer: <><path d="M4 7h16" /><path d="M10 11v6M14 11v6" /><path d="M6 7l1 13a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1l1-13" /><path d="M9 7V4h6v3" /></>,
  // Horloge : le temps, les départs
  horloge: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
  // Document avec flèche descendante : télécharger la facture
  facture: <><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" /><path d="M14 3v5h5" /><path d="M12 11v6" /><path d="M9.5 14.5L12 17l2.5-2.5" /></>,
  // Flèche revenant en arrière : rembourser
  rembourser: <><path d="M4 9h11a5 5 0 0 1 0 10h-4" /><path d="M8 5L4 9l4 4" /></>,
  // Chevron : ouvrir le détail
  detail: <path d="M9 5l7 7-7 7" />,
  // Personne dans un cadre : la fiche d'un client et ses passages
  fiche: <><rect x="3" y="4" width="18" height="16" rx="2" /><circle cx="9" cy="10" r="2" /><path d="M6 16c.6-1.6 1.7-2.4 3-2.4s2.4.8 3 2.4" /><path d="M15 9h3M15 13h3" /></>,
};

export default function Icone({ nom, taille = 16, style }) {
  const chemin = CHEMINS[nom];
  if (!chemin) return null;

  return (
    <svg
      width={taille}
      height={taille}
      viewBox="0 0 24 24"
      aria-hidden="true"
      focusable="false"
      style={{ flexShrink: 0, display: 'block', ...style }}
      {...TRAITS}
    >
      {chemin}
    </svg>
  );
}

// Couleurs des boutons d'action.
//
// Aplat FONCÉ et icône blanche : un fond pâle bordé d'un gris clair disparaît sur
// un écran médiocre ou pour un œil fatigué. Au survol, le fond s'éclaircit — le
// mouvement de couleur va du dense vers le clair, l'inverse de l'usage habituel,
// parce que le repos doit déjà être franc.
//
// Chaque action porte SA couleur, pas celle de sa famille : « Régler » et « Voir le
// séjour » se retrouvaient tous deux en vert clair et devenaient interchangeables.
// La couleur sort volontairement de la charte quand il le faut — la charte habille
// l'application, elle ne doit pas rendre deux boutons voisins indiscernables.
const TONS_ACTION = {
  // Ambre : l'argent
  argent: { fond: '#B45309', survol: '#D97706' },
  // Vert : l'arrivée, la validation
  entree: { fond: '#15803D', survol: '#1F9D50' },
  // Indigo : le séjour en cours
  sejour: { fond: '#1D4ED8', survol: '#3B6FE0' },
  // Ardoise : les actions neutres, modifier
  neutre: { fond: '#475569', survol: '#64748B' },
  // Rouge : annuler, supprimer
  danger: { fond: '#DC2626', survol: '#EF4444' },
};

export function BoutonIcone({ nom, titre, onClick, ton = 'neutre', disabled }) {
  const couleurs = TONS_ACTION[ton] || TONS_ACTION.neutre;

  return (
    <button
      type="button"
      onClick={(e) => { e.stopPropagation(); onClick(e); }}
      title={titre}
      aria-label={titre}
      disabled={disabled}
      style={{
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        width: 32, height: 32, borderRadius: 'var(--radius-sm)',
        border: 'none', background: couleurs.fond,
        color: '#fff', cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.45 : 1,
        transition: 'background 0.14s, transform 0.14s',
      }}
      onMouseEnter={(e) => { if (!disabled) { e.currentTarget.style.background = couleurs.survol; e.currentTarget.style.transform = 'translateY(-1px)'; } }}
      onMouseLeave={(e) => { e.currentTarget.style.background = couleurs.fond; e.currentTarget.style.transform = 'none'; }}
    >
      <Icone nom={nom} />
    </button>
  );
}
