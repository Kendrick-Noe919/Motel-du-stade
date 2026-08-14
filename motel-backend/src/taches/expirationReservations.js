import prisma from '../utils/prisma.js';
import { lireParametreNombre, DELAI_EXPIRATION } from '../utils/parametres.js';
import { notifier } from '../utils/notifications.js';
import { STANDARDISTE } from '../config/roles.js';

const INTERVALLE_MS = 5 * 60 * 1000; // on repasse toutes les 5 minutes

// Une réservation restée EN_ATTENTE au-delà du délai paramétré est expirée et la
// chambre libérée. Sans ça, une réservation téléphonique non confirmée bloquerait
// la chambre indéfiniment.
//
// Le délai se règle depuis l'écran Paramètres (EXPIRATION_RESERVATION_HEURES).
export async function expirerReservationsEnAttente() {
  const heures = await lireParametreNombre(DELAI_EXPIRATION);
  if (heures <= 0) return { expirees: 0, desactive: true }; // 0 = expiration désactivée

  const limite = new Date(Date.now() - heures * 3600000);

  const candidates = await prisma.reservation.findMany({
    where: {
      statut: 'EN_ATTENTE',
      dateReservation: { lt: limite },
      paiements: { none: { rembourse: false } }, // un acompte encaissé protège la réservation
    },
    include: { chambre: true, client: true },
  });

  if (candidates.length === 0) return { expirees: 0 };

  for (const reservation of candidates) {
    await prisma.$transaction(async (tx) => {
      await tx.reservation.update({ where: { id: reservation.id }, data: { statut: 'EXPIREE' } });

      // La chambre n'est libérée que si elle était réservée pour cette réservation-là
      if (reservation.chambre?.etat === 'RESERVEE') {
        const autre = await tx.reservation.findFirst({
          where: {
            chambreId: reservation.chambreId,
            statut: { in: ['CONFIRMEE', 'EN_COURS'] },
            id: { not: reservation.id },
          },
        });
        if (!autre) {
          await tx.chambre.update({ where: { id: reservation.chambreId }, data: { etat: 'DISPONIBLE' } });
        }
      }

      await tx.journalOperation.create({
        data: {
          action: 'RESERVATION_EXPIREE',
          cibleType: 'reservation',
          cibleId: reservation.id,
          resume: `Réservation #${reservation.id} expirée automatiquement après ${heures}h sans confirmation`,
          avant: 'EN_ATTENTE',
          apres: 'EXPIREE',
          auteurNom: 'Système',
        },
      });

      const nom = reservation.client
        ? `${reservation.client.prenom ?? ''} ${reservation.client.nom ?? ''}`.trim() || reservation.client.telephone
        : 'client inconnu';

      await notifier(tx, {
        type: 'RESERVATION_EXPIREE',
        titre: 'Réservation expirée',
        message: `La réservation de ${nom} (chambre ${reservation.chambre?.numero ?? '?'}) a expiré, la chambre est de nouveau disponible.`,
        lien: '/reservations',
        roleCible: STANDARDISTE,
      });
    });
  }

  console.log(`Expiration automatique : ${candidates.length} réservation(s) expirée(s)`);
  return { expirees: candidates.length };
}

export function demarrerExpirationAutomatique() {
  // Un premier passage au démarrage rattrape ce qui a expiré pendant que le serveur était arrêté
  expirerReservationsEnAttente().catch((e) => console.error('Expiration automatique :', e.message));
  const minuteur = setInterval(
    () => expirerReservationsEnAttente().catch((e) => console.error('Expiration automatique :', e.message)),
    INTERVALLE_MS,
  );
  minuteur.unref?.(); // n'empêche pas le processus de s'arrêter proprement
  return minuteur;
}
