import prisma from '../utils/prisma.js';

// POST /api/ventes — body: { lignes: [{ serviceId, quantite }] }
export async function creerVente(req, res) {
  try {
    const { lignes } = req.body;

    if (!Array.isArray(lignes) || lignes.length === 0) {
      return res.status(400).json({ message: 'Au moins une ligne (serviceId, quantite) est requise' });
    }

    const resultat = await prisma.$transaction(async (tx) => {
      let montantTotal = 0;
      const lignesAvecPrix = [];

      for (const ligne of lignes) {
        const service = await tx.service.findUnique({ where: { id: Number(ligne.serviceId) } });
        if (!service) throw new Error(`Service introuvable (id ${ligne.serviceId})`);

        const quantite = Number(ligne.quantite) || 1;
        const prixApplique = service.prix;
        montantTotal += Number(prixApplique) * quantite;

        lignesAvecPrix.push({ serviceId: service.id, quantite, prixApplique });
      }

      const vente = await tx.venteDirecte.create({
        data: {
          utilisateur: { connect: { id: req.user.id } },
          montantTotal,
          lignes: { create: lignesAvecPrix },
        },
        include: { lignes: { include: { service: true } } },
      });

      // ---------- Encaissement automatique dans la caisse du barman (même logique que le Chapitre 36) ----------
      let caisse = await tx.caisse.findFirst({ where: { utilisateurId: req.user.id, ouverte: true } });
      if (!caisse) {
        caisse = await tx.caisse.create({
          data: { utilisateur: { connect: { id: req.user.id } }, soldeInitial: 0, ouverte: true },
        });
      }

      await tx.mouvementCaisse.create({
        data: {
          caisse: { connect: { id: caisse.id } },
          type: 'ENTREE',
          montant: montantTotal,
          motif: `Vente bar #${vente.id} — ${vente.lignes.length} article(s)`,
        },
      });

      return { vente, caisse };
    });

    res.status(201).json(resultat);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
}

// GET /api/ventes — historique (Administrateur voit tout, Barman voit les siennes)
export async function getVentes(req, res) {
  try {
    const estAdmin = req.user.roles.includes('Administrateur');
    const where = estAdmin ? {} : { utilisateurId: req.user.id };

    const ventes = await prisma.venteDirecte.findMany({
      where,
      include: { lignes: { include: { service: true } }, utilisateur: { select: { nom: true, prenom: true } } },
      orderBy: { dateVente: 'desc' },
      take: 100,
    });

    res.json(ventes);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
}