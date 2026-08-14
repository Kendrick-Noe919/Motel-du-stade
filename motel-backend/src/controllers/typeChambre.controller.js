import prisma from '../utils/prisma.js';

// GET /api/types-chambre : liste tous les types de chambres
export async function getAllTypesChambre(req, res) {
  try {
    const types = await prisma.typeChambre.findMany();
    res.json(types);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
}

// POST /api/types-chambre : crée un nouveau type de chambre
export async function createTypeChambre(req, res) {
  try {
    const { libelle, prixParNuit, capacite, description,
            prixPremiereHeure, prixHeureSupplementaire, promo } = req.body;

    if (!libelle || !prixParNuit || !capacite) {
      return res.status(400).json({ message: 'libelle, prixParNuit et capacite sont requis' });
    }

    // Les tarifs horaires sont obligatoires : sans eux, toute réservation à l'heure
    // sur ce type échoue au calcul du montant. Le trou s'était formé exactement comme ça.
    if (!prixPremiereHeure || Number(prixPremiereHeure) <= 0) {
      return res.status(400).json({
        message: 'prixPremiereHeure est requis : sans tarif horaire, la réservation à l\'heure serait impossible sur ce type de chambre',
      });
    }

    const nouveauType = await prisma.typeChambre.create({
      data: {
        libelle,
        prixParNuit: Number(prixParNuit),
        capacite: Number(capacite),
        description,
        prixPremiereHeure: Number(prixPremiereHeure),
        // Par défaut, une heure supplémentaire coûte le prix de la première
        prixHeureSupplementaire: Number(prixHeureSupplementaire) || Number(prixPremiereHeure),
        promo: promo ? Number(promo) : null,
      },
    });

    res.status(201).json(nouveauType);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
 }

// PATCH /api/types-chambre/:id : modifie libellé, tarifs, capacité, description
export async function updateTypeChambre(req, res) {
  try {
    const { id } = req.params;
    const { libelle, prixParNuit, capacite, description,
            prixPremiereHeure, prixHeureSupplementaire, promo } = req.body;

    const data = {};
    if (libelle !== undefined) data.libelle = libelle;
    if (description !== undefined) data.description = description;

    // Les champs numériques peuvent être remis à vide : '' signifie « pas de tarif configuré »
    const nombreOuNull = (v) => (v === '' || v === null ? null : Number(v));
    if (prixParNuit !== undefined) {
      if (Number(prixParNuit) <= 0) return res.status(400).json({ message: 'prixParNuit doit être positif' });
      data.prixParNuit = Number(prixParNuit);
    }
    if (capacite !== undefined) {
      if (Number(capacite) < 1) return res.status(400).json({ message: 'capacite doit être au moins 1' });
      data.capacite = Number(capacite);
    }
    if (prixPremiereHeure !== undefined) data.prixPremiereHeure = nombreOuNull(prixPremiereHeure);
    if (prixHeureSupplementaire !== undefined) data.prixHeureSupplementaire = nombreOuNull(prixHeureSupplementaire);
    if (promo !== undefined) data.promo = nombreOuNull(promo);

    const type = await prisma.typeChambre.update({ where: { id: Number(id) }, data });
    res.json(type);
  } catch (error) {
    if (error.code === 'P2025') return res.status(404).json({ message: 'Type de chambre non trouvé' });
    console.error(error);
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
}

// DELETE /api/types-chambre/:id
export async function deleteTypeChambre(req, res) {
  try {
    const { id } = req.params;

    // Un type encore rattaché à des chambres ne peut pas disparaître sans les orpheliner
    const nombreChambres = await prisma.chambre.count({ where: { typeChambreId: Number(id) } });
    if (nombreChambres > 0) {
      return res.status(409).json({
        message: `Impossible de supprimer : ${nombreChambres} chambre(s) utilisent encore ce type`,
      });
    }

    await prisma.typeChambre.delete({ where: { id: Number(id) } });
    res.status(204).send();
  } catch (error) {
    if (error.code === 'P2025') return res.status(404).json({ message: 'Type de chambre non trouvé' });
    console.error(error);
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
}
