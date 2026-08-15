import prisma from '../utils/prisma.js';
import { tracer } from '../utils/journal.js';
import { notifier } from '../utils/notifications.js';
import { STANDARDISTE } from '../config/roles.js';

// Une chambre dans l'un de ces états ne fait pas partie du parc louable :
// elle est exclue du dénominateur du taux d'occupation (cahier des charges, point 25).
export const ETATS_NON_EXPLOITABLES = ['MAINTENANCE', 'HORS_SERVICE'];

// GET /api/chambres : liste toutes les chambres avec leur type inclus
export async function getAllChambres(req, res) {
  try {
    const chambres = await prisma.chambre.findMany({
      include: { typeChambre: true },
      orderBy: { numero: 'asc' },
    });
    res.json(chambres);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
}

// GET /api/chambres/:id : récupère une chambre précise
export async function getChambreById(req, res) {
  try {
    const { id } = req.params;

    const chambre = await prisma.chambre.findUnique({
      where: { id: Number(id) },
      include: { typeChambre: true },
    });

    if (!chambre) {
      return res.status(404).json({ message: 'Chambre non trouvée' });
    }

    res.json(chambre);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
}

// POST /api/chambres : crée une chambre reliée à un type existant
export async function createChambre(req, res) {
  try {
    const { numero, etage, typeChambreId } = req.body;

    if (!numero || !typeChambreId) {
      return res.status(400).json({ message: 'numero et typeChambreId sont requis' });
    }

    // On vérifie que le type de chambre référencé existe vraiment
    const typeExiste = await prisma.typeChambre.findUnique({
      where: { id: Number(typeChambreId) },
    });

    if (!typeExiste) {
      return res.status(400).json({ message: `Aucun TypeChambre avec l'id ${typeChambreId}` });
    }

    const nouvelleChambre = await prisma.$transaction(async (tx) => {
      const creee = await tx.chambre.create({
        data: {
          numero,
          etage: etage ? Number(etage) : null,
          typeChambre: { connect: { id: Number(typeChambreId) } },
        },
        include: { typeChambre: true },
      });

      await tracer(tx, req, {
        action: 'CHAMBRE_CREEE',
        cibleType: 'chambre',
        cibleId: creee.id,
        resume: `Chambre ${creee.numero} créée (${creee.typeChambre.libelle})`,
      });

      // La standardiste doit savoir qu'une chambre de plus est réservable
      await notifier(tx, {
        type: 'CHAMBRE_AJOUTEE',
        titre: 'Nouvelle chambre disponible',
        message: `La chambre ${creee.numero} (${creee.typeChambre.libelle}) est désormais réservable.`,
        lien: '/chambres',
      });

      return creee;
    });

    res.status(201).json(nouvelleChambre);
  } catch (error) {
    // Prisma renvoie le code P2002 pour une violation de contrainte "unique"
    if (error.code === 'P2002') {
      return res.status(409).json({ message: `Le numéro de chambre existe déjà` });
    }
    console.error(error);
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
}

// PATCH /api/chambres/:id/etat : change l'état d'une chambre
//
// L'état OCCUPEE n'appartient pas à un humain mais au séjour : il est posé par le
// check-in et levé par le check-out. Autoriser la main libre ici permettait de
// libérer une chambre encore habitée (elle redevenait réservable), ou de l'occuper
// sans séjour, auquel cas plus aucun check-out ne pouvait la rendre disponible.
export async function updateEtatChambre(req, res) {
  try {
    const { id } = req.params;
    const { etat, motif } = req.body;

    // OCCUPEE appartient au check-in, RESERVEE à la confirmation d'une réservation :
    // ni l'un ni l'autre ne se pose à la main.
    const etatsManuels = ['DISPONIBLE', 'NETTOYAGE', 'MAINTENANCE', 'HORS_SERVICE'];
    const etatsAutomatiques = { OCCUPEE: 'le check-in d\'une réservation', RESERVEE: 'la confirmation d\'une réservation' };

    if (!etatsManuels.includes(etat)) {
      return res.status(400).json({
        message: etatsAutomatiques[etat]
          ? `Une chambre passe en ${etat} par ${etatsAutomatiques[etat]}, pas manuellement.`
          : `etat invalide. Valeurs acceptées : ${etatsManuels.join(', ')}`,
      });
    }

    const chambre = await prisma.chambre.findUnique({ where: { id: Number(id) } });
    if (!chambre) return res.status(404).json({ message: 'Chambre non trouvée' });

    if (chambre.etat === etat) {
      return res.status(400).json({ message: `Cette chambre est déjà en ${etat}` });
    }

    // Un séjour ouvert signifie que le client est physiquement dans la chambre
    const sejourEnCours = await prisma.sejour.findFirst({
      where: { dateSortie: null, reservation: { chambreId: Number(id) } },
      include: { reservation: { include: { client: true } } },
    });

    if (sejourEnCours) {
      const client = sejourEnCours.reservation.client;
      const nom = client ? `${client.prenom ?? ''} ${client.nom ?? ''}`.trim() : 'un client';
      return res.status(409).json({
        message: `Chambre occupée par ${nom} (séjour n°${sejourEnCours.id}). Faites le check-out pour la libérer.`,
      });
    }

    const chambreMiseAJour = await prisma.$transaction(async (tx) => {
      const maj = await tx.chambre.update({
        where: { id: Number(id) },
        data: { etat },
        include: { typeChambre: true },
      });
      await tracer(tx, req, {
        action: 'CHAMBRE_ETAT',
        cibleType: 'chambre',
        cibleId: maj.id,
        resume: `Chambre ${maj.numero} : ${chambre.etat} vers ${etat}` + (motif ? ` (${motif})` : ''),
        avant: chambre.etat,
        apres: etat,
      });
      return maj;
    });

    res.json(chambreMiseAJour);
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ message: 'Chambre non trouvée' });
    }
    console.error(error);
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
}
// PATCH /api/chambres/:id : modification complète
export async function updateChambre(req, res) {
  try {
    const { id } = req.params;
    const { numero, etage, typeChambreId } = req.body;

    const data = {};
    if (numero !== undefined) data.numero = numero;
    if (etage !== undefined) data.etage = etage === '' ? null : Number(etage);

    if (typeChambreId !== undefined) {
      const typeExiste = await prisma.typeChambre.findUnique({ where: { id: Number(typeChambreId) } });
      if (!typeExiste) return res.status(400).json({ message: `Aucun TypeChambre avec l'id ${typeChambreId}` });
      data.typeChambre = { connect: { id: Number(typeChambreId) } };
    }

    const chambre = await prisma.chambre.update({
      where: { id: Number(id) },
      data,
      include: { typeChambre: true },
    });

    res.json(chambre);
  } catch (error) {
    if (error.code === 'P2002') return res.status(409).json({ message: 'Ce numéro de chambre existe déjà' });
    if (error.code === 'P2025') return res.status(404).json({ message: 'Chambre non trouvée' });
    console.error(error);
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
}

// DELETE /api/chambres/:id
export async function deleteChambre(req, res) {
  try {
    const { id } = req.params;

    const nombreReservations = await prisma.reservation.count({ where: { chambreId: Number(id) } });
    if (nombreReservations > 0) {
      return res.status(409).json({
        message: `Impossible de supprimer : cette chambre a ${nombreReservations} réservation(s) associée(s)`,
      });
    }

    await prisma.chambre.delete({ where: { id: Number(id) } });
    res.status(204).send();
  } catch (error) {
    if (error.code === 'P2025') return res.status(404).json({ message: 'Chambre non trouvée' });
    console.error(error);
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
}