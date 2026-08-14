import prisma from './prisma.js';

// Valeurs de repli si le paramètre a été supprimé de la base
const DEFAUTS = {
  EXPIRATION_RESERVATION_HEURES: 2,
  TAMPON_NETTOYAGE_HEURES: 1,
};

export async function lireParametreNombre(cle) {
  const parametre = await prisma.parametre.findUnique({ where: { cle } });
  const valeur = Number(parametre?.valeur);
  return Number.isFinite(valeur) && valeur >= 0 ? valeur : DEFAUTS[cle];
}

export const DELAI_EXPIRATION = 'EXPIRATION_RESERVATION_HEURES';
export const TAMPON_NETTOYAGE = 'TAMPON_NETTOYAGE_HEURES';
