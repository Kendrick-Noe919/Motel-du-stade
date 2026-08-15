import { ADMIN, STANDARDISTE, CAISSIER, BARMAN } from './roles.js';

// Catalogue des notifications.
//
// Une seule table décrit QUI reçoit QUOI, et si le type est actif par défaut.
// Auparavant chaque contrôleur choisissait son destinataire dans son coin : six
// événements étaient notifiés, les autres passaient inaperçus, et rien ne disait
// quels rôles étaient censés être prévenus.
//
// `destinataires` liste des codes de rôle. Une notification adressée à deux rôles
// crée deux lignes : le modèle ne porte qu'un rôle cible, et un agent ne doit pas
// voir disparaître la sienne parce qu'un collègue d'un autre poste l'a lue.
//
// `parDefaut: false` — le type existe mais reste éteint tant que l'administrateur
// ne l'allume pas depuis Paramètres. Réservé aux événements très fréquents, qui
// noieraient les autres.
export const TYPES_NOTIFICATION = {
  // ---------- Réservations et séjours ----------
  RESERVATION_CREEE: {
    libelle: 'Nouvelle réservation',
    groupe: 'Réservations',
    destinataires: [STANDARDISTE, ADMIN],
    parDefaut: true,
  },
  RESERVATION_CONFIRMEE: {
    libelle: 'Réservation confirmée',
    groupe: 'Réservations',
    destinataires: [STANDARDISTE],
    parDefaut: true,
  },
  RESERVATION_ANNULEE: {
    libelle: 'Réservation annulée',
    groupe: 'Réservations',
    destinataires: [STANDARDISTE, ADMIN],
    parDefaut: true,
  },
  RESERVATION_EXPIREE: {
    libelle: 'Réservation expirée faute de confirmation',
    groupe: 'Réservations',
    destinataires: [STANDARDISTE],
    parDefaut: true,
  },
  DATES_MODIFIEES: {
    libelle: 'Dates d\'une réservation modifiées',
    groupe: 'Réservations',
    destinataires: [STANDARDISTE, ADMIN],
    parDefaut: true,
  },
  CLIENT_ARRIVE: {
    libelle: 'Arrivée d\'un client',
    groupe: 'Séjours',
    destinataires: [ADMIN],
    parDefaut: true,
  },
  PROLONGATION_SEJOUR: {
    libelle: 'Séjour prolongé',
    groupe: 'Séjours',
    destinataires: [STANDARDISTE, ADMIN],
    parDefaut: true,
  },
  DEPART_CLIENT: {
    libelle: 'Départ d\'un client',
    groupe: 'Séjours',
    destinataires: [ADMIN],
    parDefaut: true,
  },
  DEPART_IMPAYE: {
    libelle: 'Départ avec un impayé',
    groupe: 'Séjours',
    destinataires: [ADMIN],
    parDefaut: true,
  },

  // ---------- Clients et fidélité ----------
  CLIENT_ENREGISTRE: {
    libelle: 'Nouveau client enregistré',
    groupe: 'Clients',
    destinataires: [STANDARDISTE, ADMIN],
    parDefaut: true,
  },
  REMISE_ACCORDEE: {
    libelle: 'Remise de fidélité accordée',
    groupe: 'Clients',
    destinataires: [ADMIN],
    parDefaut: true,
  },
  // Le bar doit savoir qu'une chambre bénéficie d'une remise AVANT que le client
  // se présente au comptoir : c'est lui qui l'appliquera.
  REMISE_BAR_ACTIVE: {
    libelle: 'Remise bar active sur une chambre',
    groupe: 'Clients',
    destinataires: [BARMAN],
    parDefaut: true,
  },

  // ---------- Bar et restauration ----------
  VENTE_BAR: {
    libelle: 'Vente encaissée au bar',
    groupe: 'Bar et restauration',
    destinataires: [ADMIN],
    parDefaut: true,
  },
  COMMANDE_SUR_CHAMBRE: {
    libelle: 'Commande portée sur une chambre',
    groupe: 'Bar et restauration',
    destinataires: [ADMIN],
    parDefaut: true,
  },
  SERVICE_AJOUTE: {
    libelle: 'Nouvel article à la carte',
    groupe: 'Bar et restauration',
    destinataires: [BARMAN],
    parDefaut: true,
  },

  // ---------- Argent ----------
  PAIEMENT_ENCAISSE: {
    libelle: 'Paiement encaissé',
    groupe: 'Argent',
    destinataires: [ADMIN],
    parDefaut: true,
  },
  REMBOURSEMENT: {
    libelle: 'Remboursement effectué',
    groupe: 'Argent',
    destinataires: [ADMIN],
    parDefaut: true,
  },
  CAISSE_FERMEE: {
    libelle: 'Caisse fermée',
    groupe: 'Argent',
    destinataires: [ADMIN, CAISSIER],
    parDefaut: true,
  },
  ECART_CAISSE: {
    libelle: 'Écart constaté à la fermeture d\'une caisse',
    groupe: 'Argent',
    destinataires: [ADMIN, CAISSIER],
    parDefaut: true,
  },

  // ---------- Parc ----------
  CHAMBRE_AJOUTEE: {
    libelle: 'Nouvelle chambre ajoutée',
    groupe: 'Parc',
    destinataires: [STANDARDISTE],
    parDefaut: true,
  },
  CHAMBRE_ETAT: {
    libelle: 'Changement d\'état d\'une chambre',
    groupe: 'Parc',
    destinataires: [STANDARDISTE],
    // Éteint d'origine : une chambre change d'état plusieurs fois par jour et par
    // chambre. Allumé, ce type noierait tous les autres.
    parDefaut: false,
  },
};

// La clé du paramètre qui active ou coupe un type.
export const clefParametre = (type) => `NOTIF_${type}`;
