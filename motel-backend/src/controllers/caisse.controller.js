import prisma from '../utils/prisma.js';

function calculerSolde(soldeInitial, mouvements) {
  const totalEntrees = mouvements
    .filter((m) => m.type === 'ENTREE')
    .reduce((somme, m) => somme + Number(m.montant), 0);

  const totalSorties = mouvements
    .filter((m) => m.type === 'SORTIE')
    .reduce((somme, m) => somme + Number(m.montant), 0);

  return Number(soldeInitial) + totalEntrees - totalSorties;
}

// ---------- POST /api/caisses/ouvrir ----------
export async function ouvrirCaisse(req, res) {
  try {
    const { utilisateurId, soldeInitial } = req.body;

    if (!utilisateurId || soldeInitial === undefined) {
      return res.status(400).json({ message: 'utilisateurId et soldeInitial sont requis' });
    }
    if (Number(soldeInitial) < 0) {
      return res.status(400).json({ message: 'soldeInitial ne peut pas être négatif' });
    }

    // Règle : un utilisateur ne peut pas avoir deux caisses ouvertes en même temps
    const caisseDejaOuverte = await prisma.caisse.findFirst({
      where: { utilisateurId: Number(utilisateurId), ouverte: true },
    });

    if (caisseDejaOuverte) {
      return res.status(409).json({
        message: `Une caisse (id ${caisseDejaOuverte.id}) est déjà ouverte pour cet utilisateur`,
      });
    }

    const caisse = await prisma.caisse.create({
      data: {
        utilisateur: { connect: { id: Number(utilisateurId) } },
        soldeInitial: Number(soldeInitial),
        ouverte: true,
      },
    });

    res.status(201).json(caisse);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
}

// ---------- POST /api/caisses/:id/mouvements ----------
export async function enregistrerMouvement(req, res) {
  try {
    const { id } = req.params;
    const { type, montant, motif } = req.body;

    const typesValides = ['ENTREE', 'SORTIE'];
    if (!typesValides.includes(type)) {
      return res.status(400).json({ message: `type invalide. Valeurs acceptées : ${typesValides.join(', ')}` });
    }
    if (!montant || Number(montant) <= 0) {
      return res.status(400).json({ message: 'montant doit être un nombre positif' });
    }

    const caisse = await prisma.caisse.findUnique({
      where: { id: Number(id) },
      include: { mouvements: true },
    });

    if (!caisse) {
      return res.status(404).json({ message: 'Caisse non trouvée' });
    }
    if (!caisse.ouverte) {
      return res.status(400).json({ message: 'Impossible d\'enregistrer un mouvement sur une caisse fermée' });
    }

    // Empêche une sortie qui rendrait le solde négatif
    if (type === 'SORTIE') {
      const soldeActuel = calculerSolde(caisse.soldeInitial, caisse.mouvements);
      if (Number(montant) > soldeActuel) {
        return res.status(400).json({
          message: `Solde insuffisant. Solde actuel : ${soldeActuel}, sortie demandée : ${montant}`,
        });
      }
    }

    const mouvement = await prisma.mouvementCaisse.create({
      data: {
        caisse: { connect: { id: Number(id) } },
        type,
        montant: Number(montant),
        motif,
      },
    });

    res.status(201).json(mouvement);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
}

// ---------- GET /api/caisses/:id/solde ----------
export async function consulterSolde(req, res) {
  try {
    const { id } = req.params;

    const caisse = await prisma.caisse.findUnique({
      where: { id: Number(id) },
      include: { mouvements: true },
    });

    if (!caisse) {
      return res.status(404).json({ message: 'Caisse non trouvée' });
    }

    const solde = calculerSolde(caisse.soldeInitial, caisse.mouvements);

    res.json({
      caisseId: caisse.id,
      ouverte: caisse.ouverte,
      soldeInitial: caisse.soldeInitial,
      soldeCourant: solde,
      nombreMouvements: caisse.mouvements.length,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
}

// ---------- PATCH /api/caisses/:id/fermer ----------
// Fermer la caisse : inclut calculer solde final + générer rapport
export async function fermerCaisse(req, res) {
  try {
    const { id } = req.params;

    const caisse = await prisma.caisse.findUnique({
      where: { id: Number(id) },
      include: { mouvements: true, utilisateur: { select: { nom: true, prenom: true } } },
    });

    if (!caisse) {
      return res.status(404).json({ message: 'Caisse non trouvée' });
    }
    if (!caisse.ouverte) {
      return res.status(400).json({ message: 'Cette caisse est déjà fermée' });
    }

    const soldeFinal = calculerSolde(caisse.soldeInitial, caisse.mouvements);

    const caisseFermee = await prisma.caisse.update({
      where: { id: Number(id) },
      data: {
        ouverte: false,
        dateFermeture: new Date(),
        soldeFinal,
      },
    });

    // Rapport de caisse (généré à la volée, pas stocké — dérivé des mouvements)
    const totalEntrees = caisse.mouvements
      .filter((m) => m.type === 'ENTREE')
      .reduce((s, m) => s + Number(m.montant), 0);
    const totalSorties = caisse.mouvements
      .filter((m) => m.type === 'SORTIE')
      .reduce((s, m) => s + Number(m.montant), 0);

    const rapport = {
      caissier: `${caisse.utilisateur.prenom} ${caisse.utilisateur.nom}`,
      dateOuverture: caisse.dateOuverture,
      dateFermeture: caisseFermee.dateFermeture,
      soldeInitial: caisse.soldeInitial,
      totalEntrees,
      totalSorties,
      soldeFinal,
      nombreMouvements: caisse.mouvements.length,
      detailMouvements: caisse.mouvements,
    };

    res.json({ caisse: caisseFermee, rapport });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
}

// ---------- GET /api/caisses/utilisateur/:utilisateurId ----------
export async function getCaissesParUtilisateur(req, res) {
  try {
    const { utilisateurId } = req.params;
    const caisses = await prisma.caisse.findMany({
      where: { utilisateurId: Number(utilisateurId) },
      include: { mouvements: true },
      orderBy: { dateOuverture: 'desc' },
    });
    res.json(caisses);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
}