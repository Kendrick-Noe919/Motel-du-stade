import prisma from './prisma.js';

// Valeurs de repli si le paramètre a été supprimé de la base
const DEFAUTS = {
  EXPIRATION_RESERVATION_HEURES: 2,
  TAMPON_NETTOYAGE_HEURES: 1,
  // Trois jours : assez pour qu'un poste absent le week-end retrouve ce qui s'est
  // passé, assez court pour que la cloche reste lisible. 0 conserve tout.
  RETENTION_NOTIFICATIONS_HEURES: 72,
};

export async function lireParametreNombre(cle) {
  const parametre = await prisma.parametre.findUnique({ where: { cle } });
  const valeur = Number(parametre?.valeur);
  return Number.isFinite(valeur) && valeur >= 0 ? valeur : DEFAUTS[cle];
}

export const DELAI_EXPIRATION = 'EXPIRATION_RESERVATION_HEURES';
export const TAMPON_NETTOYAGE = 'TAMPON_NETTOYAGE_HEURES';
export const RETENTION_NOTIFICATIONS = 'RETENTION_NOTIFICATIONS_HEURES';

// Les réglages réglables depuis l'écran Paramètres doivent exister en base pour y
// être modifiés. Celui-ci est né après les autres, qu'une migration avait créés :
// on le pose au démarrage plutôt que d'exiger une migration de plus, et l'opération
// est sans effet s'il est déjà là.
export async function assurerParametresParDefaut() {
  await prisma.parametre.upsert({
    where: { cle: RETENTION_NOTIFICATIONS },
    update: {},
    create: {
      cle: RETENTION_NOTIFICATIONS,
      valeur: String(DEFAUTS[RETENTION_NOTIFICATIONS]),
      libelle: 'Durée de conservation des notifications',
      description: 'Au-delà de ce délai, une notification disparaît de la cloche. 0 conserve tout.',
      unite: 'heures',
    },
  });
}
