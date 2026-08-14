import prisma from '../utils/prisma.js';
import { lireJournal } from '../utils/journal.js';

// GET /api/journal?debut=&fin=&utilisateurId=&action=&cibleType=
export async function getJournal(req, res) {
  try {
    const { debut, fin, utilisateurId, action, cibleType, limite } = req.query;

    const operations = await lireJournal({
      debut: debut ? new Date(debut) : undefined,
      fin: fin ? new Date(fin) : undefined,
      utilisateurId, action, cibleType,
      limite: limite || 200,
    });

    res.json(operations);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
}

// GET /api/journal/filtres : alimente les listes déroulantes de l'écran Historique
export async function getFiltresJournal(req, res) {
  try {
    const [actions, cibles, auteurs] = await Promise.all([
      prisma.journalOperation.findMany({ distinct: ['action'], select: { action: true }, orderBy: { action: 'asc' } }),
      prisma.journalOperation.findMany({ distinct: ['cibleType'], select: { cibleType: true }, orderBy: { cibleType: 'asc' } }),
      prisma.utilisateur.findMany({ select: { id: true, nom: true, prenom: true }, orderBy: { prenom: 'asc' } }),
    ]);

    res.json({
      actions: actions.map((a) => a.action),
      cibles: cibles.map((c) => c.cibleType),
      auteurs: auteurs.map((u) => ({ id: u.id, nom: `${u.prenom} ${u.nom}` })),
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
}
