import prisma from '../utils/prisma.js';
import { estSuperviseur } from '../middlewares/auth.middleware.js';

function calculerSolde(soldeInitial, mouvements) {
  const totalEntrees = mouvements
    .filter((m) => m.type === 'ENTREE')
    .reduce((somme, m) => somme + Number(m.montant), 0);

  const totalSorties = mouvements
    .filter((m) => m.type === 'SORTIE')
    .reduce((somme, m) => somme + Number(m.montant), 0);

  return Number(soldeInitial) + totalEntrees - totalSorties;
}

// Récupère la caisse ouverte de l'opérateur, ou explique quoi faire.
// Utilisé par les paiements et les ventes du bar : plus aucune caisse n'est
// créée en douce, sinon le fond de caisse déclaré ne veut plus rien dire.
export async function exigerCaisseOuverte(tx, utilisateurId) {
  const caisse = await tx.caisse.findFirst({ where: { utilisateurId, ouverte: true } });
  if (!caisse) {
    const erreur = new Error('Aucune caisse ouverte. Ouvrez votre caisse avant d\'encaisser.');
    erreur.statut = 409;
    throw erreur;
  }
  return caisse;
}

// Le propriétaire de la caisse, l'Administrateur et le Manager y ont accès. Personne d'autre.
function peutAccederALaCaisse(req, caisse) {
  return caisse.utilisateurId === req.user.id || estSuperviseur(req);
}

// ---------- POST /api/caisses/ouvrir ----------
export async function ouvrirCaisse(req, res) {
  try {
    const { soldeInitial } = req.body;

    if (soldeInitial === undefined || soldeInitial === '') {
      return res.status(400).json({ message: 'soldeInitial est requis' });
    }
    if (Number(soldeInitial) < 0) {
      return res.status(400).json({ message: 'soldeInitial ne peut pas être négatif' });
    }

    // On ouvre toujours SA propre caisse : l'identifiant vient du jeton, jamais du corps
    // de la requête, sinon n'importe qui pourrait ouvrir une caisse au nom d'un collègue.
    const utilisateurId = req.user.id;

    const caisseDejaOuverte = await prisma.caisse.findFirst({
      where: { utilisateurId, ouverte: true },
    });

    if (caisseDejaOuverte) {
      return res.status(409).json({
        message: `Vous avez déjà une caisse ouverte (n°${caisseDejaOuverte.id}). Fermez-la avant d'en ouvrir une autre.`,
      });
    }

    const caisse = await prisma.caisse.create({
      data: {
        utilisateur: { connect: { id: utilisateurId } },
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
    if (!peutAccederALaCaisse(req, caisse)) {
      return res.status(403).json({ message: 'Cette caisse ne vous appartient pas' });
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
        creePar: { connect: { id: req.user.id } },
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
    if (!peutAccederALaCaisse(req, caisse)) {
      return res.status(403).json({ message: 'Cette caisse ne vous appartient pas' });
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
// Fermeture : le caissier déclare ce qu'il a physiquement compté, et le rapport
// affiche l'écart avec le théorique. C'est tout l'intérêt d'une fermeture de caisse.
export async function fermerCaisse(req, res) {
  try {
    const { id } = req.params;
    const { montantCompte } = req.body;

    if (montantCompte === undefined || montantCompte === '') {
      return res.status(400).json({
        message: 'montantCompte est requis : indiquez la somme réellement comptée dans le tiroir.',
      });
    }
    if (Number(montantCompte) < 0 || Number.isNaN(Number(montantCompte))) {
      return res.status(400).json({ message: 'montantCompte doit être un nombre positif ou nul' });
    }

    const caisse = await prisma.caisse.findUnique({
      where: { id: Number(id) },
      include: {
        mouvements: { orderBy: { dateMouvement: 'asc' } },
        utilisateur: { select: { nom: true, prenom: true } },
      },
    });

    if (!caisse) {
      return res.status(404).json({ message: 'Caisse non trouvée' });
    }
    if (!peutAccederALaCaisse(req, caisse)) {
      return res.status(403).json({ message: 'Cette caisse ne vous appartient pas' });
    }
    if (!caisse.ouverte) {
      return res.status(400).json({ message: 'Cette caisse est déjà fermée' });
    }

    const soldeFinal = calculerSolde(caisse.soldeInitial, caisse.mouvements);
    const compte = Number(montantCompte);
    const ecart = Math.round((compte - soldeFinal) * 100) / 100;

    const caisseFermee = await prisma.caisse.update({
      where: { id: Number(id) },
      data: {
        ouverte: false,
        dateFermeture: new Date(),
        soldeFinal,
        montantCompte: compte,
      },
    });

    const totalEntrees = caisse.mouvements
      .filter((m) => m.type === 'ENTREE')
      .reduce((s, m) => s + Number(m.montant), 0);
    const totalSorties = caisse.mouvements
      .filter((m) => m.type === 'SORTIE')
      .reduce((s, m) => s + Number(m.montant), 0);

    // Rapport de caisse (généré à la volée, pas stocké, dérivé des mouvements)
    const rapport = {
      caissier: `${caisse.utilisateur.prenom} ${caisse.utilisateur.nom}`,
      dateOuverture: caisse.dateOuverture,
      dateFermeture: caisseFermee.dateFermeture,
      soldeInitial: caisse.soldeInitial,
      totalEntrees,
      totalSorties,
      soldeFinal,          // ce que le système attend
      montantCompte: compte, // ce que le caissier a compté
      ecart,               // négatif = il manque de l'argent
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

    if (Number(utilisateurId) !== req.user.id && !estSuperviseur(req)) {
      return res.status(403).json({ message: 'Vous ne pouvez consulter que vos propres caisses' });
    }

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

// ---------- GET /api/caisses ----------
// Vue consolidée pour l'Administrateur et le Manager : « combien y a-t-il en caisse
// ce soir, tous postes confondus ? ». Cette question n'avait aucune réponse avant.
export async function getCaissesOuvertes(req, res) {
  try {
    const caisses = await prisma.caisse.findMany({
      where: { ouverte: true },
      include: {
        mouvements: true,
        utilisateur: { select: { id: true, nom: true, prenom: true } },
      },
      orderBy: { dateOuverture: 'asc' },
    });

    const detail = caisses.map((c) => {
      const soldeCourant = calculerSolde(c.soldeInitial, c.mouvements);
      return {
        caisseId: c.id,
        utilisateur: `${c.utilisateur.prenom} ${c.utilisateur.nom}`,
        utilisateurId: c.utilisateur.id,
        dateOuverture: c.dateOuverture,
        soldeInitial: Number(c.soldeInitial),
        soldeCourant,
        nombreMouvements: c.mouvements.length,
      };
    });

    res.json({
      nombreCaissesOuvertes: detail.length,
      totalEnCaisse: detail.reduce((s, c) => s + c.soldeCourant, 0),
      caisses: detail,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
}

// ---------- GET /api/caisses/rapport-journee?date=YYYY-MM-DD ----------
// Le rapprochement de fin de journée du caissier : il récupère la caisse du poste
// et celle du bar, et vérifie que les montants remis correspondent à ce que le
// système a enregistré. Lecture seule, aucune modification possible.
export async function getRapportJournee(req, res) {
  try {
    const jour = req.query.date ? new Date(req.query.date) : new Date();
    const debut = new Date(jour); debut.setHours(0, 0, 0, 0);
    const fin = new Date(jour); fin.setHours(23, 59, 59, 999);

    const caisses = await prisma.caisse.findMany({
      where: {
        OR: [
          { dateOuverture: { gte: debut, lte: fin } },
          { dateFermeture: { gte: debut, lte: fin } },
          { ouverte: true, dateOuverture: { lte: fin } },
        ],
      },
      include: {
        mouvements: { orderBy: { dateMouvement: 'asc' } },
        utilisateur: {
          select: { id: true, nom: true, prenom: true, roles: { include: { role: true } } },
        },
      },
      orderBy: { dateOuverture: 'asc' },
    });

    const postes = caisses.map((c) => {
      const mouvementsDuJour = c.mouvements.filter((m) => m.dateMouvement >= debut && m.dateMouvement <= fin);
      const entrees = mouvementsDuJour.filter((m) => m.type === 'ENTREE').reduce((s, m) => s + Number(m.montant), 0);
      const sorties = mouvementsDuJour.filter((m) => m.type === 'SORTIE').reduce((s, m) => s + Number(m.montant), 0);
      const theorique = calculerSolde(c.soldeInitial, c.mouvements);

      return {
        caisseId: c.id,
        tenuePar: `${c.utilisateur.prenom} ${c.utilisateur.nom}`,
        roles: c.utilisateur.roles.map((r) => r.role.libelle),
        ouverte: c.ouverte,
        dateOuverture: c.dateOuverture,
        dateFermeture: c.dateFermeture,
        soldeInitial: Number(c.soldeInitial),
        entrees,
        sorties,
        soldeTheorique: theorique,
        montantCompte: c.montantCompte === null ? null : Number(c.montantCompte),
        ecart: c.montantCompte === null ? null : Number(c.montantCompte) - Number(c.soldeFinal ?? theorique),
        mouvements: mouvementsDuJour.map((m) => ({
          id: m.id, heure: m.dateMouvement, type: m.type, montant: Number(m.montant), motif: m.motif,
        })),
      };
    });

    const totaux = postes.reduce((acc, p) => ({
      entrees: acc.entrees + p.entrees,
      sorties: acc.sorties + p.sorties,
      theorique: acc.theorique + p.soldeTheorique,
      compte: acc.compte + (p.montantCompte ?? 0),
      ecart: acc.ecart + (p.ecart ?? 0),
    }), { entrees: 0, sorties: 0, theorique: 0, compte: 0, ecart: 0 });

    res.json({
      date: debut,
      postes,
      totaux,
      caissesNonFermees: postes.filter((p) => p.ouverte).map((p) => p.tenuePar),
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
}
