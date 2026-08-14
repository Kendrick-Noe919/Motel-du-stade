import prisma from '../utils/prisma.js';
import { tracer } from '../utils/journal.js';

// GET /api/parametres
export async function getParametres(req, res) {
  try {
    res.json(await prisma.parametre.findMany({ orderBy: { cle: 'asc' } }));
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
}

// PATCH /api/parametres/:cle
// Les paramètres sont créés par migration : on modifie une valeur, on n'en invente pas.
export async function modifierParametre(req, res) {
  try {
    const { cle } = req.params;
    const { valeur } = req.body;

    const existant = await prisma.parametre.findUnique({ where: { cle } });
    if (!existant) return res.status(404).json({ message: 'Paramètre inconnu' });

    const nombre = Number(valeur);
    if (!Number.isFinite(nombre) || nombre < 0) {
      return res.status(400).json({ message: 'La valeur doit être un nombre positif ou nul' });
    }
    if (existant.unite === 'heures' && nombre > 720) {
      return res.status(400).json({ message: 'Un délai supérieur à 720 heures (30 jours) n\'a pas de sens' });
    }

    const parametre = await prisma.$transaction(async (tx) => {
      const maj = await tx.parametre.update({ where: { cle }, data: { valeur: String(nombre) } });
      await tracer(tx, req, {
        action: 'PARAMETRE_MODIFIE',
        cibleType: 'parametre',
        resume: `${maj.libelle} : ${existant.valeur} vers ${maj.valeur} ${maj.unite ?? ''}`.trim(),
        avant: existant.valeur,
        apres: maj.valeur,
      });
      return maj;
    });

    res.json(parametre);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
}
