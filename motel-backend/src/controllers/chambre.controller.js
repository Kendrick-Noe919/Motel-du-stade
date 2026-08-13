import prisma from '../utils/prisma.js';

// GET /api/chambres — liste toutes les chambres avec leur type inclus
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

// GET /api/chambres/:id — récupère une chambre précise
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

// POST /api/chambres — crée une chambre reliée à un type existant
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

    const nouvelleChambre = await prisma.chambre.create({
      data: {
        numero,
        etage: etage ? Number(etage) : null,
        typeChambre: { connect: { id: Number(typeChambreId) } },
      },
      include: { typeChambre: true },
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

// PATCH /api/chambres/:id/etat — change l'état d'une chambre
export async function updateEtatChambre(req, res) {
  try {
    const { id } = req.params;
    const { etat } = req.body;

    const etatsValides = ['DISPONIBLE', 'OCCUPEE', 'MAINTENANCE', 'NETTOYAGE'];
    if (!etatsValides.includes(etat)) {
      return res.status(400).json({
        message: `etat invalide. Valeurs acceptées : ${etatsValides.join(', ')}`,
      });
    }

    const chambre = await prisma.chambre.update({
      where: { id: Number(id) },
      data: { etat },
      include: { typeChambre: true },
    });

    res.json(chambre);
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ message: 'Chambre non trouvée' });
    }
    console.error(error);
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
}
// PATCH /api/chambres/:id — modification complète
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