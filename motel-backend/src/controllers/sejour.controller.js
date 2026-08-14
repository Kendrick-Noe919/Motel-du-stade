import prisma from '../utils/prisma.js';
import { tracer } from '../utils/journal.js';
import { notifier } from '../utils/notifications.js';
import { ADMIN } from '../config/roles.js';
import { chambreEstDisponible, calculerMontant } from './reservation.controller.js';

// On accepte un check-in un peu en avance (client arrivé tôt), pas des semaines avant.
const TOLERANCE_ARRIVEE_HEURES = 12;

// Additionne tout ce que le séjour a généré au-delà de la réservation initiale.
// Les consommations étaient enregistrées sans jamais être facturées : le minibar
// partait gratuitement.
function calculerNoteSejour(sejour, reservation) {
  const consommations = (sejour.consommations || []).reduce(
    (somme, c) => somme + Number(c.prixApplique) * c.quantite, 0
  );
  const paye = (reservation.paiements || [])
    .filter((p) => !p.rembourse)
    .reduce((somme, p) => somme + Number(p.montant), 0);

  // montantTotal inclut déjà les heures supplémentaires (ajoutées à la volée),
  // mais jamais les consommations.
  const total = Number(reservation.montantTotal) + consommations;

  return {
    montantReservation: Number(reservation.montantTotal),
    montantConsommations: consommations,
    totalDu: Math.round(total * 100) / 100,
    dejaPaye: paye,
    resteAPayer: Math.round(Math.max(0, total - paye) * 100) / 100,
  };
}

// POST /api/sejours/check-in, body: { reservationId }
export async function checkIn(req, res) {
  try {
    const { reservationId } = req.body;
    if (!reservationId) return res.status(400).json({ message: 'reservationId est requis' });

    const reservation = await prisma.reservation.findUnique({
      where: { id: Number(reservationId) },
      include: { sejour: true, chambre: true, paiements: true },
    });

    if (!reservation) return res.status(404).json({ message: 'Réservation non trouvée' });
    if (reservation.sejour) return res.status(409).json({ message: 'Un séjour existe déjà pour cette réservation' });
    if (['ANNULEE', 'TERMINEE'].includes(reservation.statut)) {
      return res.status(400).json({ message: 'Impossible de faire un check-in sur une réservation annulée ou terminée' });
    }

    // Garde-fou de date : sans lui, on pouvait faire aujourd'hui le check-in
    // d'une réservation prévue le mois prochain, et bloquer la chambre d'ici là.
    const heuresAvantArrivee = (new Date(reservation.dateArrivee) - Date.now()) / 3600000;
    if (heuresAvantArrivee > TOLERANCE_ARRIVEE_HEURES) {
      return res.status(400).json({
        message: `Arrivée prévue le ${new Date(reservation.dateArrivee).toLocaleString('fr-FR')}. `
               + `Le check-in n'est possible qu'à partir de ${TOLERANCE_ARRIVEE_HEURES}h avant.`,
      });
    }

    // La chambre doit être matériellement prête. DISPONIBLE ou RESERVEE conviennent :
    // RESERVEE signifie justement qu'elle attend ce client.
    const ETATS_PRETS = ['DISPONIBLE', 'RESERVEE'];
    if (!ETATS_PRETS.includes(reservation.chambre.etat)) {
      return res.status(409).json({
        message: `La chambre ${reservation.chambre.numero} est en ${reservation.chambre.etat.toLowerCase().replace('_', ' ')}. `
               + 'Elle doit être disponible avant le check-in.',
      });
    }

    const resultat = await prisma.$transaction(async (tx) => {
      const sejour = await tx.sejour.create({
        data: {
          reservation: { connect: { id: reservation.id } },
          checkInPar: { connect: { id: req.user.id } },
        },
      });
      await tx.reservation.update({ where: { id: reservation.id }, data: { statut: 'EN_COURS' } });
      await tx.chambre.update({ where: { id: reservation.chambreId }, data: { etat: 'OCCUPEE' } });

      await tracer(tx, req, {
        action: 'CHECK_IN',
        cibleType: 'reservation',
        cibleId: reservation.id,
        resume: `Check-in réservation #${reservation.id}, chambre ${reservation.chambre.numero}`,
        avant: reservation.statut,
        apres: 'EN_COURS',
      });

      await notifier(tx, {
        type: 'CLIENT_ARRIVE',
        titre: 'Un client vient d\'arriver',
        message: `Chambre ${reservation.chambre.numero} occupée. Le taux d'occupation est à jour.`,
        lien: '/',
        roleCible: ADMIN,
      });

      return sejour;
    });

    // Avertissement, pas blocage : le réceptionniste doit pouvoir accueillir un client
    // qui paiera au départ, mais il doit le savoir.
    const totalPaye = reservation.paiements
      .filter((p) => !p.rembourse)
      .reduce((s, p) => s + Number(p.montant), 0);
    const resteAPayer = Math.max(0, Number(reservation.montantTotal) - totalPaye);

    res.status(201).json({
      ...resultat,
      resteAPayer,
      avertissement: resteAPayer > 0 ? `Reste à payer : ${resteAPayer}` : null,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
}

// PATCH /api/sejours/:id/check-out
export async function checkOut(req, res) {
  try {
    const { id } = req.params;

    const { forcerSansPaiement } = req.body;

    const sejour = await prisma.sejour.findUnique({
      where: { id: Number(id) },
      include: {
        consommations: { include: { service: true } },
        heuresSupplementaires: true,
        reservation: { include: { chambre: true, paiements: true } },
      },
    });

    if (!sejour) return res.status(404).json({ message: 'Séjour non trouvé' });
    if (sejour.dateSortie) return res.status(400).json({ message: 'Ce séjour est déjà clôturé' });

    // La note complète : réservation + heures supplémentaires + consommations, moins les paiements
    const note = calculerNoteSejour(sejour, sejour.reservation);

    // On refuse un départ avec un solde impayé, sauf décision explicite du réceptionniste.
    // Sans ce contrôle, tout ce que le client consommait pendant son séjour partait avec lui.
    if (note.resteAPayer > 0 && !forcerSansPaiement) {
      return res.status(409).json({
        message: `Solde impayé de ${note.resteAPayer} (dont ${note.montantConsommations} de consommations). `
               + 'Encaissez le reste ou confirmez le départ sans paiement.',
        note,
        soldeImpaye: true,
      });
    }

    const resultat = await prisma.$transaction(async (tx) => {
      const sejourMisAJour = await tx.sejour.update({
        where: { id: sejour.id },
        data: { dateSortie: new Date(), checkOutPar: { connect: { id: req.user.id } } },
      });
      await tx.reservation.update({ where: { id: sejour.reservationId }, data: { statut: 'TERMINEE' } });
      // La chambre passe en nettoyage, elle repasse "Disponible" manuellement une fois nettoyée (page Chambres)
      await tx.chambre.update({ where: { id: sejour.reservation.chambreId }, data: { etat: 'NETTOYAGE' } });

      await tracer(tx, req, {
        action: 'CHECK_OUT',
        cibleType: 'reservation',
        cibleId: sejour.reservationId,
        resume: `Check-out réservation #${sejour.reservationId}, chambre ${sejour.reservation.chambre.numero}`
              + (note.resteAPayer > 0 ? `, départ avec ${note.resteAPayer} impayé` : ', soldé'),
        avant: 'EN_COURS',
        apres: 'TERMINEE',
      });

      if (note.resteAPayer > 0) {
        await notifier(tx, {
          type: 'DEPART_IMPAYE',
          titre: 'Départ avec impayé',
          message: `Chambre ${sejour.reservation.chambre.numero} : le client est parti en laissant ${note.resteAPayer} dû.`,
          lien: '/paiements',
          roleCible: ADMIN,
        });
      }

      return sejourMisAJour;
    });

    res.json({ ...resultat, note });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
}

// GET /api/sejours/reservation/:reservationId
export async function getSejourParReservation(req, res) {
  try {
    const { reservationId } = req.params;
    const sejour = await prisma.sejour.findUnique({
      where: { reservationId: Number(reservationId) },
      include: {
        consommations: { include: { service: true }, orderBy: { dateConsommation: 'desc' } },
        heuresSupplementaires: { orderBy: { dateAjout: 'desc' } },
        reservation: { include: { paiements: true } },
      },
    });
    if (!sejour) return res.status(404).json({ message: 'Aucun séjour pour cette réservation' });

    // La note accompagne toujours le séjour : le réceptionniste doit voir le reste dû
    // avant de lancer le check-out, pas le découvrir au moment du refus.
    res.json({ ...sejour, note: calculerNoteSejour(sejour, sejour.reservation) });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
}
const TARIF_HORAIRE_PAR_DEFAUT = 5000; // utilisé si le type de chambre n'a pas de tarif horaire configuré

// POST /api/sejours/:id/heures-supplementaires, body: { nombreHeures }
export async function ajouterHeuresSupplementaires(req, res) {
  try {
    const { id } = req.params;
    const { nombreHeures } = req.body;

    if (!nombreHeures || Number(nombreHeures) < 1) {
      return res.status(400).json({ message: 'nombreHeures doit être au moins 1' });
    }

    const sejour = await prisma.sejour.findUnique({
      where: { id: Number(id) },
      include: { reservation: { include: { chambre: { include: { typeChambre: true } } } } },
    });

    if (!sejour) return res.status(404).json({ message: 'Séjour non trouvé' });
    if (sejour.dateSortie) return res.status(400).json({ message: 'Impossible de prolonger un séjour déjà clôturé' });

    const prixParHeure = Number(
      sejour.reservation.chambre.typeChambre.prixHeureSupplementaire || TARIF_HORAIRE_PAR_DEFAUT
    );
    const heures = Number(nombreHeures);
    const montant = prixParHeure * heures;

    const nouvelleDateDepart = new Date(sejour.reservation.dateDepart);
    nouvelleDateDepart.setHours(nouvelleDateDepart.getHours() + heures);

    // La prolongation repousse le départ : la chambre doit être libre sur le
    // temps ajouté, sinon on décale ce client dans la réservation du suivant.
    const libre = await chambreEstDisponible(
      prisma, sejour.reservation.chambreId,
      sejour.reservation.dateDepart, nouvelleDateDepart, sejour.reservationId
    );
    if (!libre) {
      return res.status(409).json({
        message: 'Impossible de prolonger : la chambre est déjà réservée sur la période demandée.',
      });
    }

    const resultat = await prisma.$transaction(async (tx) => {
      const enregistrement = await tx.heureSupplementaire.create({
        data: {
          sejour: { connect: { id: sejour.id } },
          nombreHeures: heures,
          prixParHeure,
          montant,
        },
      });

      // Repousse la date de départ prévue et augmente le montant dû de la réservation
      const reservation = await tx.reservation.update({
        where: { id: sejour.reservationId },
        data: {
          dateDepart: nouvelleDateDepart,
          montantTotal: { increment: montant },
        },
      });

      return { enregistrement, reservation };
    });

    res.status(201).json(resultat);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
}

// POST /api/sejours/:id/nuits-supplementaires, body: { nombreNuits }
//
// Le pendant des heures supplémentaires pour les séjours à la nuitée : jusqu'ici
// un client en nuitée qui voulait rester une nuit de plus n'avait aucune voie
// dans l'application, il fallait ressaisir une réservation.
export async function ajouterNuitsSupplementaires(req, res) {
  try {
    const { id } = req.params;
    const { nombreNuits } = req.body;

    if (!nombreNuits || Number(nombreNuits) < 1) {
      return res.status(400).json({ message: 'nombreNuits doit être au moins 1' });
    }

    const sejour = await prisma.sejour.findUnique({
      where: { id: Number(id) },
      include: { reservation: { include: { chambre: { include: { typeChambre: true } } } } },
    });

    if (!sejour) return res.status(404).json({ message: 'Séjour non trouvé' });
    if (sejour.dateSortie) return res.status(400).json({ message: 'Impossible de prolonger un séjour déjà clôturé' });

    const { reservation } = sejour;
    if (reservation.modeTarification !== 'NUITEE') {
      return res.status(400).json({
        message: 'Ce séjour est facturé à l\'heure : prolongez-le en heures supplémentaires.',
      });
    }

    const nuits = Number(nombreNuits);
    const nouvelleDateDepart = new Date(reservation.dateDepart);
    nouvelleDateDepart.setDate(nouvelleDateDepart.getDate() + nuits);

    const libre = await chambreEstDisponible(
      prisma, reservation.chambreId, reservation.dateDepart, nouvelleDateDepart, reservation.id
    );
    if (!libre) {
      return res.status(409).json({
        message: 'Impossible de prolonger : la chambre est déjà réservée sur la période demandée.',
      });
    }

    // Même tarif que la réservation d'origine, promotion comprise : la nuit
    // ajoutée ne doit pas coûter autre chose que les précédentes.
    const montant = calculerMontant(reservation.chambre.typeChambre, 'NUITEE', nuits, null);

    const resultat = await prisma.$transaction(async (tx) => {
      const misAJour = await tx.reservation.update({
        where: { id: reservation.id },
        data: {
          dateDepart: nouvelleDateDepart,
          nombreNuits: { increment: nuits },
          montantTotal: { increment: montant },
        },
      });

      await tracer(tx, req, {
        action: 'PROLONGATION_SEJOUR',
        cibleType: 'reservation',
        cibleId: reservation.id,
        resume: `+${nuits} nuit(s) sur la réservation #${reservation.id}, chambre ${reservation.chambre.numero} (+${montant})`,
        avant: new Date(reservation.dateDepart).toISOString(),
        apres: nouvelleDateDepart.toISOString(),
      });

      return misAJour;
    });

    res.status(201).json({ reservation: resultat, montantAjoute: montant });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
}

// GET /api/sejours/:id/heures-supplementaires
export async function getHeuresSupplementaires(req, res) {
  try {
    const { id } = req.params;
    const heures = await prisma.heureSupplementaire.findMany({
      where: { sejourId: Number(id) },
      orderBy: { dateAjout: 'desc' },
    });
    res.json(heures);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
}