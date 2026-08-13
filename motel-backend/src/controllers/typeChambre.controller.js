import prisma from '../utils/prisma.js';

// GET /api/types-chambre — liste tous les types de chambres
export async function getAllTypesChambre(req, res) {
  try {
    const types = await prisma.typeChambre.findMany();
    res.json(types);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
}

// POST /api/types-chambre — crée un nouveau type de chambre
export async function createTypeChambre(req, res) {
  try {
    const { libelle, prixParNuit, capacite, description } = req.body;

    if (!libelle || !prixParNuit || !capacite) {
      return res.status(400).json({ message: 'libelle, prixParNuit et capacite sont requis' });
    }

    const nouveauType = await prisma.typeChambre.create({
      data: { libelle, prixParNuit, capacite, description },
    });

    res.status(201).json(nouveauType);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
 }
