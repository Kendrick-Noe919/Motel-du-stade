import prisma from '../utils/prisma.js';


const CATEGORIES_VALIDES = ['BLANCHISSERIE', 'RESTAURANT', 'MINIBAR', 'AUTRE'];


export async function getAllServices(req, res) {
  try {
    res.json(await prisma.service.findMany({ orderBy: { nom: 'asc' } }));
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
}

export async function createService(req, res) {
  try {
    const { nom, categorie, prix, description } = req.body;

    if (!nom || !prix) return res.status(400).json({ message: 'nom et prix sont requis' });
    if (Number(prix) <= 0) return res.status(400).json({ message: 'prix doit être positif' });

    const categorieFinale = CATEGORIES_VALIDES.includes(categorie) ? categorie : 'AUTRE';

    const service = await prisma.service.create({
      data: { nom, categorie: categorieFinale, prix: Number(prix), description },
    });

    res.status(201).json(service);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
}

export async function updateService(req, res) {
  try {
    const { id } = req.params;
    const { nom, categorie, prix, description } = req.body;

    const data = {};
    if (nom !== undefined) data.nom = nom;
    if (categorie !== undefined && CATEGORIES_VALIDES.includes(categorie)) data.categorie = categorie;
    if (prix !== undefined) data.prix = Number(prix);
    if (description !== undefined) data.description = description;

    const service = await prisma.service.update({ where: { id: Number(id) }, data });
    res.json(service);
  } catch (error) {
    if (error.code === 'P2025') return res.status(404).json({ message: 'Service non trouvé' });
    console.error(error);
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
}

export async function deleteService(req, res) {
  try {
    const { id } = req.params;
    const nombreConsommations = await prisma.consommation.count({ where: { serviceId: Number(id) } });
    if (nombreConsommations > 0) {
      return res.status(409).json({ message: `Impossible de supprimer : ce service a déjà été consommé ${nombreConsommations} fois` });
    }
    await prisma.service.delete({ where: { id: Number(id) } });
    res.status(204).send();
  } catch (error) {
    if (error.code === 'P2025') return res.status(404).json({ message: 'Service non trouvé' });
    console.error(error);
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
}

// POST /api/sejours/:sejourId/consommations
export async function ajouterConsommation(req, res) {
  try {
    const { sejourId } = req.params;
    const { serviceId, quantite } = req.body;

    if (!serviceId) return res.status(400).json({ message: 'serviceId est requis' });

    const sejour = await prisma.sejour.findUnique({ where: { id: Number(sejourId) } });
    if (!sejour) return res.status(404).json({ message: 'Séjour non trouvé' });
    if (sejour.dateSortie) return res.status(400).json({ message: 'Impossible d\'ajouter une consommation à un séjour clôturé' });

    const service = await prisma.service.findUnique({ where: { id: Number(serviceId) } });
    if (!service) return res.status(400).json({ message: 'Service introuvable' });

    const consommation = await prisma.consommation.create({
      data: {
        sejour: { connect: { id: Number(sejourId) } },
        service: { connect: { id: Number(serviceId) } },
        quantite: quantite ? Number(quantite) : 1,
        prixApplique: service.prix, // on fige le prix au moment de la consommation
      },
      include: { service: true },
    });

    res.status(201).json(consommation);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
}

// DELETE /api/consommations/:id
export async function supprimerConsommation(req, res) {
  try {
    const { id } = req.params;
    await prisma.consommation.delete({ where: { id: Number(id) } });
    res.status(204).send();
  } catch (error) {
    if (error.code === 'P2025') return res.status(404).json({ message: 'Consommation non trouvée' });
    console.error(error);
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
}