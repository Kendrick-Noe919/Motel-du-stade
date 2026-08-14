// Source unique de la matrice d'accès côté interface.
// Le menu latéral ET les routes lisent ce fichier : sans ça, les deux finissent
// par diverger et une entrée disparaît du menu tout en restant accessible par URL.
//
// ⚠️ Ceci n'est qu'un confort d'affichage. L'autorisation réelle est appliquée par
// l'API (verifierToken / autoriserRoles). Les deux doivent rester alignés.
//
// On manipule des CODES de rôle, jamais les libellés : « Administrateur général »
// peut être renommé dans l'écran Paramètres sans rien casser ici.

export const ADMIN = 'ADMIN';
export const STANDARDISTE = 'STANDARDISTE';
export const CAISSIER = 'CAISSIER';
export const BARMAN = 'BARMAN';

export const TOUS = [ADMIN, STANDARDISTE, CAISSIER, BARMAN];
export const ACCUEIL = [ADMIN, STANDARDISTE];
export const ENCAISSEMENT = [ADMIN, STANDARDISTE, CAISSIER];
export const TIENT_UNE_CAISSE = [ADMIN, STANDARDISTE, CAISSIER, BARMAN];
export const CONTROLE = [ADMIN, CAISSIER]; // consultation de toutes les caisses et recettes
export const BAR = [ADMIN, BARMAN];
export const SEUL_ADMIN = [ADMIN];

export const MODULES = [
  { label: 'Tableau de bord',     path: '/',              icone: '◇',  roles: TOUS },
  { label: 'Chambres',            path: '/chambres',      icone: '▭',  roles: ACCUEIL },
  { label: 'Types de chambre',    path: '/types-chambre', icone: '◆',  roles: SEUL_ADMIN },
  { label: 'Services',            path: '/services',      icone: '★',  roles: BAR },
  { label: 'Vente au bar',        path: '/ventes',        icone: '🍹', roles: [...BAR, CAISSIER] },
  { label: 'Réservations',        path: '/reservations',  icone: '▤',  roles: ACCUEIL },
  { label: 'Clients',             path: '/clients',       icone: '◍',  roles: ACCUEIL },
  { label: 'Paiements',           path: '/paiements',     icone: '◈',  roles: ENCAISSEMENT },
  { label: 'Caisse',              path: '/caisse',        icone: '▣',  roles: TIENT_UNE_CAISSE },
  { label: 'Recettes',            path: '/recettes',      icone: '↗',  roles: CONTROLE },
  { label: 'Historique',          path: '/historique',    icone: '⧗',  roles: SEUL_ADMIN },
  { label: 'Utilisateurs',        path: '/utilisateurs',  icone: '◉',  roles: SEUL_ADMIN },
  { label: 'Paramètres généraux', path: '/parametres',    icone: '⚙',  roles: SEUL_ADMIN },
];

export const rolesDuModule = (path) => MODULES.find((m) => m.path === path)?.roles;

// Petit utilitaire pour masquer un bouton selon le rôle
export const aLeRole = (utilisateur, roles) =>
  roles.some((role) => utilisateur?.roles?.includes(role));

export const TITRES_PAGES = {
  ...Object.fromEntries(MODULES.map((m) => [m.path, m.label])),
  '/profil': 'Mon profil',
};
