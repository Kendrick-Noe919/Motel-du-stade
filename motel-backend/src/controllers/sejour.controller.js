import prisma from '../utils/prisma.js';

// POST /api/sejours/check-in — body: { reservationId }
export async function checkIn(req, res) {
  try {
    const { reservationId } = req.body;
    if (!reservationId) return res.status(400).json({ message: 'reservationId est requis' });

    const reservation = await prisma.reservation.findUnique({
      where: { id: Number(reservationId) },
      include: { sejour: true, chambre: true },
    });

    if (!reservation) return res.status(404).json({ message: 'Réservation non trouvée' });
    if (reservation.sejour) return res.status(409).json({ message: 'Un séjour existe déjà pour cette réservation' });
    if (['ANNULEE', 'TERMINEE'].includes(reservation.statut)) {
      return res.status(400).json({ message: 'Impossible de faire un check-in sur une réservation annulée ou terminée' });
    }

    const resultat = await prisma.$transaction(async (tx) => {
      const sejour = await tx.sejour.create({
        data: { reservation: { connect: { id: reservation.id } } },
      });
      await tx.reservation.update({ where: { id: reservation.id }, data: { statut: 'EN_COURS' } });
      await tx.chambre.update({ where: { id: reservation.chambreId }, data: { etat: 'OCCUPEE' } });
      return sejour;
    });

    res.status(201).json(resultat);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
}

// PATCH /api/sejours/:id/check-out
export async function checkOut(req, res) {
  try {
    const { id } = req.params;

    const sejour = await prisma.sejour.findUnique({
      where: { id: Number(id) },
      include: { reservation: { include: { chambre: true } } },
    });

    if (!sejour) return res.status(404).json({ message: 'Séjour non trouvé' });
    if (sejour.dateSortie) return res.status(400).json({ message: 'Ce séjour est déjà clôturé' });

    const resultat = await prisma.$transaction(async (tx) => {
      const sejourMisAJour = await tx.sejour.update({
        where: { id: sejour.id },
        data: { dateSortie: new Date() },
      });
      await tx.reservation.update({ where: { id: sejour.reservationId }, data: { statut: 'TERMINEE' } });
      // La chambre passe en nettoyage — elle repasse "Disponible" manuellement une fois nettoyée (page Chambres)
      await tx.chambre.update({ where: { id: sejour.reservation.chambreId }, data: { etat: 'NETTOYAGE' } });
      return sejourMisAJour;
    });

    res.json(resultat);
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
      include: { consommations: { include: { service: true }, orderBy: { dateConsommation: 'desc' } } },
    });
    if (!sejour) return res.status(404).json({ message: 'Aucun séjour pour cette réservation' });
    res.json(sejour);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
}
const TARIF_HORAIRE_PAR_DEFAUT = 5000; // utilisé si le type de chambre n'a pas de tarif horaire configuré

// POST /api/sejours/:id/heures-supplementaires — body: { nombreHeures }
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
      const nouvelleDateDepart = new Date(sejour.reservation.dateDepart);
      nouvelleDateDepart.setHours(nouvelleDateDepart.getHours() + heures);

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