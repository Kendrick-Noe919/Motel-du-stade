// Codes techniques des rôles. Ils ne changent jamais, contrairement aux libellés
// affichés (« Administrateur général » peut être renommé sans toucher au code).

export const ADMIN = 'ADMIN';
export const STANDARDISTE = 'STANDARDISTE';
export const CAISSIER = 'CAISSIER';
export const BARMAN = 'BARMAN';

// ---------- Regroupements métier ----------

// Accueil : réservations, séjours, clients, chambres au quotidien
export const ACCUEIL = [ADMIN, STANDARDISTE];

// Encaissement d'un séjour
export const ENCAISSEMENT = [ADMIN, STANDARDISTE, CAISSIER];

// Tout rôle qui tient une caisse physique
export const TIENT_UNE_CAISSE = [ADMIN, STANDARDISTE, CAISSIER, BARMAN];

// Contrôle : consulter les caisses et les recettes de tout le monde, sans rien modifier.
// Le caissier récupère en fin de journée la caisse du poste et celle du bar, et
// rapproche les montants avec les ventes enregistrées.
export const CONTROLE = [ADMIN, CAISSIER];

// Bar et services annexes
export const BAR = [ADMIN, BARMAN];

export const TOUS = [ADMIN, STANDARDISTE, CAISSIER, BARMAN];
