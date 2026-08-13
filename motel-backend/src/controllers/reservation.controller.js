import prisma from '../utils/prisma.js';

// ============================================================
// Fonctions utilitaires internes
// ============================================================

function calculerNombreNuits(dateArrivee, dateDepart) {
  const msParJour = 1000 * 60 * 60 * 24;
  const diff = new Date(dateDepart) - new Date(dateArrivee);
  return Math.round(diff / msParJour);
}

// Centralise la validation des dates — utilisée à la création ET à la modification
function validerDatesReservation(dateArrivee, dateDepart) {
  const maintenant = new Date();
  maintenant.setSeconds(0, 0);
  const arrivee = new Date(dateArrivee);
  const depart = new Date(dateDepart);

  if (isNaN(arrivee.getTime()) || isNaN(depart.getTime())) {
    return 'Dates invalides';
  }
  if (arrivee < maintenant) {
    return 'La date d\'arrivée ne peut pas être dans le passé';
  }
  if (depart <= arrivee) {
    return 'La date de départ doit être après la date d\'arrivée';
  }
  return null;
}

function calculerMontant(typeChambre, modeTarification, nombreNuits, nombreHeures) {
  let montant;

  if (modeTarification === 'HORAIRE') {
    if (!typeChambre.prixPremiereHeure) {
      throw new Error('Tarif horaire non configuré pour ce type de chambre');
    }
    montant = Number(typeChambre.prixPremiereHeure);
    if (nombreHeures > 1) {
      montant += (nombreHeures - 1) * Number(typeChambre.prixHeureSupplementaire || 0);
    }
  } else {
    montant = nombreNuits * Number(typeChambre.prixParNuit);
  }

  if (typeChambre.promo) {
    montant = montant * (1 - Number(typeChambre.promo) / 100);
  }

  return Math.round(montant * 100) / 100;
}

async function chambreEstDisponible(chambreId, dateArrivee, dateDepart, reservationIdAIgnorer = null) {
  const conflits = await prisma.reservation.findMany({
    where: {
      chambreId: Number(chambreId),
      statut: { notIn: ['ANNULEE', 'TERMINEE'] },
      dateArrivee: { lt: new Date(dateDepart) },
      dateDepart: { gt: new Date(dateArrivee) },
      ...(reservationIdAIgnorer && { id: { not: Number(reservationIdAIgnorer) } }),
    },
  });
  return conflits.length === 0;
}

// ============================================================
// GET /api/reservations/disponibilites
// ============================================================

export async function consulterDisponibilites(req, res) {
  try {
    const { dateArrivee, dateDepart } = req.query;

    if (!dateArrivee || !dateDepart) {
      return res.status(400).json({ message: 'dateArrivee et dateDepart sont requis (format YYYY-MM-DD)' });
    }

    const chambresOccupeesIds = await prisma.reservation.findMany({
      where: {
        statut: { notIn: ['ANNULEE', 'TERMINEE'] },
        dateArrivee: { lt: new Date(dateDepart) },
        dateDepart: { gt: new Date(dateArrivee) },
      },
      select: { chambreId: true },
    });

    const idsAExclure = chambresOccupeesIds.map((r) => r.chambreId);

    const chambresDisponibles = await prisma.chambre.findMany({
      where: {
        id: { notIn: idsAExclure },
        etat: 'DISPONIBLE',
      },
      include: { typeChambre: true },
    });

    res.json(chambresDisponibles);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
}

// ============================================================
// GET /api/reservations
// ============================================================

export async function getAllReservations(req, res) {
  try {
    const reservations = await prisma.reservation.findMany({
      include: { client: true, chambre: { include: { typeChambre: true } } },
      orderBy: { dateArrivee: 'desc' },
    });
    res.json(reservations);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
}

// ============================================================
// GET /api/reservations/:id
// ============================================================

export async function getReservationById(req, res) {
  try {
    const { id } = req.params;
    const reservation = await prisma.reservation.findUnique({
      where: { id: Number(id) },
      include: {
        client: true,
        chambre: { include: { typeChambre: true } },
        paiements: true,
        sejour: true,
      },
    });

    if (!reservation) {
      return res.status(404).json({ message: 'Réservation non trouvée' });
    }
    res.json(reservation);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
}

// ============================================================
// POST /api/reservations
// ============================================================

export async function createReservation(req, res) {
  try {
    const { clientId, chambreId, dateArrivee, modeTarification, nombreHeures, source } = req.body;
    let { dateDepart } = req.body;
    const mode = modeTarification === 'HORAIRE' ? 'HORAIRE' : 'NUITEE';

    if (!clientId || !chambreId || !dateArrivee) {
      return res.status(400).json({ message: 'clientId, chambreId et dateArrivee sont requis' });
    }

    if (mode === 'HORAIRE') {
      if (!nombreHeures || Number(nombreHeures) < 1) {
        return res.status(400).json({ message: 'nombreHeures est requis et doit être au moins 1 en mode horaire' });
      }
      // ---------- Calcul automatique : la date de départ n'est JAMAIS saisie en horaire ----------
      const arrivee = new Date(dateArrivee);
      if (isNaN(arrivee.getTime())) {
        return res.status(400).json({ message: 'Date d\'arrivée invalide' });
      }
      const departCalcule = new Date(arrivee.getTime() + Number(nombreHeures) * 60 * 60 * 1000);
      dateDepart = departCalcule.toISOString();
    } else if (!dateDepart) {
      return res.status(400).json({ message: 'dateDepart est requis en mode nuitée' });
    }

    const erreurDates = validerDatesReservation(dateArrivee, dateDepart);
    if (erreurDates) return res.status(400).json({ message: erreurDates });

    const [client, chambre] = await Promise.all([
      prisma.client.findUnique({ where: { id: Number(clientId) } }),
      prisma.chambre.findUnique({ where: { id: Number(chambreId) }, include: { typeChambre: true } }),
    ]);

    if (!client) return res.status(400).json({ message: 'Client introuvable' });
    if (!chambre) return res.status(400).json({ message: 'Chambre introuvable' });

    if (chambre.etat === 'MAINTENANCE') {
      return res.status(400).json({ message: 'Cette chambre est en maintenance et ne peut pas être réservée' });
    }

    const disponible = await chambreEstDisponible(chambreId, dateArrivee, dateDepart);
    if (!disponible) {
      return res.status(409).json({ message: 'Cette chambre est déjà réservée sur cette période' });
    }

    const nombreNuits = mode === 'NUITEE' ? calculerNombreNuits(dateArrivee, dateDepart) : null;

    let montantTotal;
    try {
      montantTotal = calculerMontant(chambre.typeChambre, mode, nombreNuits, mode === 'HORAIRE' ? Number(nombreHeures) : null);
    } catch (err) {
      return res.status(400).json({ message: err.message });
    }

    const reservation = await prisma.reservation.create({
      data: {
        client: { connect: { id: Number(clientId) } },
        chambre: { connect: { id: Number(chambreId) } },
        dateArrivee: new Date(dateArrivee),
        dateDepart: new Date(dateDepart),
        modeTarification: mode,
        nombreNuits,
        nombreHeures: mode === 'HORAIRE' ? Number(nombreHeures) : null,
        montantTotal,
        source: source === 'EN_LIGNE' ? 'EN_LIGNE' : 'RECEPTION',
        statut: 'EN_ATTENTE',
      },
      include: { client: true, chambre: { include: { typeChambre: true } } },
    });

    res.status(201).json(reservation);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
}

// ============================================================
// PATCH /api/reservations/:id
// ============================================================

export async function modifierReservation(req, res) {
  try {
    const { id } = req.params;
    const { dateArrivee, dateDepart, statut } = req.body;

    const reservationExistante = await prisma.reservation.findUnique({
      where: { id: Number(id) },
      include: { chambre: { include: { typeChambre: true } } },
    });

    if (!reservationExistante) {
      return res.status(404).json({ message: 'Réservation non trouvée' });
    }

    if (['ANNULEE', 'TERMINEE'].includes(reservationExistante.statut) && (dateArrivee || dateDepart)) {
      return res.status(400).json({ message: 'Impossible de modifier les dates d\'une réservation annulée ou terminée' });
    }

    const nouvelleArrivee = dateArrivee || reservationExistante.dateArrivee;
    const nouveauDepart = dateDepart || reservationExistante.dateDepart;

    let dataAMettreAJour = {};

    if (dateArrivee || dateDepart) {
      const erreurDates = validerDatesReservation(nouvelleArrivee, nouveauDepart);
      if (erreurDates) return res.status(400).json({ message: erreurDates });

      const disponible = await chambreEstDisponible(
        reservationExistante.chambreId,
        nouvelleArrivee,
        nouveauDepart,
        id
      );

      if (!disponible) {
        return res.status(409).json({ message: 'La chambre n\'est pas disponible sur ces nouvelles dates' });
      }

      if (reservationExistante.modeTarification === 'NUITEE') {
        const nombreNuits = calculerNombreNuits(nouvelleArrivee, nouveauDepart);
        const montantTotal = nombreNuits * Number(reservationExistante.chambre.typeChambre.prixParNuit);
        dataAMettreAJour = {
          dateArrivee: new Date(nouvelleArrivee),
          dateDepart: new Date(nouveauDepart),
          nombreNuits,
          montantTotal,
        };
      } else {
        // En mode horaire, on ne recalcule pas automatiquement le montant ici —
        // les heures supplémentaires passent par leur propre endpoint dédié (Chapitre 54)
        dataAMettreAJour = {
          dateArrivee: new Date(nouvelleArrivee),
          dateDepart: new Date(nouveauDepart),
        };
      }
    }

    if (statut) {
      dataAMettreAJour.statut = statut;
    }

    const reservation = await prisma.reservation.update({
      where: { id: Number(id) },
      data: dataAMettreAJour,
      include: { client: true, chambre: { include: { typeChambre: true } } },
    });

    res.json(reservation);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
}

// ============================================================
// PATCH /api/reservations/:id/annuler
// ============================================================

export async function annulerReservation(req, res) {
  try {
    const { id } = req.params;

    const reservation = await prisma.reservation.findUnique({
      where: { id: Number(id) },
      include: { paiements: true },
    });

    if (!reservation) {
      return res.status(404).json({ message: 'Réservation non trouvée' });
    }

    if (reservation.statut === 'ANNULEE') {
      return res.status(400).json({ message: 'Cette réservation est déjà annulée' });
    }

    const reservationAnnulee = await prisma.reservation.update({
      where: { id: Number(id) },
      data: { statut: 'ANNULEE' },
    });

    const aDesPaiements = reservation.paiements.length > 0;

    res.json({
      reservation: reservationAnnulee,
      remboursementRequis: aDesPaiements,
      message: aDesPaiements
        ? `${reservation.paiements.length} paiement(s) associé(s) — remboursement à traiter (voir module Paiements)`
        : 'Aucun paiement associé, aucune action supplémentaire requise',
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
}

// ============================================================
// DELETE /api/reservations/:id — suppression définitive
// ============================================================

export async function deleteReservation(req, res) {
  try {
    const { id } = req.params;

    const reservation = await prisma.reservation.findUnique({
      where: { id: Number(id) },
      include: { paiements: true },
    });

    if (!reservation) return res.status(404).json({ message: 'Réservation non trouvée' });

    const paiementsActifs = reservation.paiements.filter((p) => !p.rembourse);
    if (paiementsActifs.length > 0) {
      return res.status(409).json({
        message: `Impossible de supprimer : ${paiementsActifs.length} paiement(s) actif(s) non remboursé(s). Remboursez-les d'abord.`,
      });
    }

    await prisma.$transaction(async (tx) => {
      const paiementIds = reservation.paiements.map((p) => p.id);
      if (paiementIds.length > 0) {
        await tx.facture.deleteMany({ where: { paiementId: { in: paiementIds } } });
        await tx.paiement.deleteMany({ where: { reservationId: Number(id) } });
      }
      await tx.reservation.delete({ where: { id: Number(id) } });
    });

    res.status(204).send();
  } catch (error) {
    if (error.code === 'P2025') return res.status(404).json({ message: 'Réservation non trouvée' });
    console.error(error);
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
}

// ============================================================
// DELETE /api/reservations/annulees — nettoyage en masse
// ============================================================

export async function supprimerReservationsAnnulees(req, res) {
  try {
    const candidates = await prisma.reservation.findMany({
      where: { statut: 'ANNULEE' },
      include: { paiements: true },
    });

    const supprimables = candidates.filter((r) => r.paiements.every((p) => p.rembourse));
    const ignorees = candidates.length - supprimables.length;
    const ids = supprimables.map((r) => r.id);

    const nombreSupprimees = await prisma.$transaction(async (tx) => {
      const paiementIds = supprimables.flatMap((r) => r.paiements.map((p) => p.id));
      if (paiementIds.length > 0) {
        await tx.facture.deleteMany({ where: { paiementId: { in: paiementIds } } });
        await tx.paiement.deleteMany({ where: { reservationId: { in: ids } } });
      }
      const { count } = await tx.reservation.deleteMany({ where: { id: { in: ids } } });
      return count;
    });

    res.json({
      message: `${nombreSupprimees} réservation(s) annulée(s) supprimée(s)` + (ignorees > 0 ? `, ${ignorees} ignorée(s) (paiement non remboursé)` : ''),
      count: nombreSupprimees,
      ignorees,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
}