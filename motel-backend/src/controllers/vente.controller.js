import prisma from '../utils/prisma.js';
import { exigerCaisseOuverte } from './caisse.controller.js';
import { estSuperviseur } from '../middlewares/auth.middleware.js';
import { tracer } from '../utils/journal.js';
import { notifier } from '../utils/notifications.js';

// POST /api/ventes, body: { lignes: [{ serviceId, quantite }] }
export async function creerVente(req, res) {
  try {
    const { lignes } = req.body;

    if (!Array.isArray(lignes) || lignes.length === 0) {
      return res.status(400).json({ message: 'Au moins une ligne (serviceId, quantite) est requise' });
    }

    const resultat = await prisma.$transaction(async (tx) => {
      // Le barman doit avoir ouvert sa caisse avant de vendre
      const caisse = await exigerCaisseOuverte(tx, req.user.id);

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

      // ---------- Encaissement dans la caisse ouverte du barman ----------
      await tx.mouvementCaisse.create({
        data: {
          caisse: { connect: { id: caisse.id } },
          type: 'ENTREE',
          montant: montantTotal,
          motif: `Vente bar #${vente.id} · ${vente.lignes.length} article(s)`,
          creePar: { connect: { id: req.user.id } },
        },
      });

      await notifier(tx, {
        type: 'VENTE_BAR',
        titre: 'Vente encaissée au bar',
        message: `${vente.lignes.length} article(s) pour ${montantTotal}, encaissés au comptoir.`,
        lien: '/recettes',
      });

      return { vente, caisse };
    });

    res.status(201).json(resultat);
  } catch (error) {
    if (error.statut) return res.status(error.statut).json({ message: error.message });
    console.error(error);
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
}

// GET /api/ventes/chambres-occupees
//
// Les clients auxquels le barman peut porter une consommation : ceux qui sont
// effectivement dans une chambre. Sans cette liste, le bar n'a aucun moyen de
// désigner une note ouverte.
export async function getChambresOccupees(req, res) {
  try {
    const sejours = await prisma.sejour.findMany({
      where: { dateSortie: null },
      include: { reservation: { include: { client: true, chambre: true } } },
    });

    const lignes = sejours
      .map((s) => ({
        sejourId: s.id,
        chambreNumero: s.reservation.chambre.numero,
        client: `${s.reservation.client.prenom || ''} ${s.reservation.client.nom || ''}`.trim()
             || s.reservation.client.telephone,
        // Le barman doit voir jusqu'à quand le client est censé être là : un départ
        // dépassé signale une note qu'on s'apprête peut-être à charger alors que
        // le client a déjà quitté les lieux.
        dateDepart: s.reservation.dateDepart,
        modeTarification: s.reservation.modeTarification,
        departDepasse: new Date(s.reservation.dateDepart) < new Date(),
        // Le barman doit voir la remise avant de valider, pas la découvrir sur le
        // total : c'est ce qui lui permet de l'annoncer au client.
        remiseBarPourcent: s.reservation.remiseBarPourcent || 0,
      }))
      .sort((a, b) => String(a.chambreNumero).localeCompare(String(b.chambreNumero)));

    res.json(lignes);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
}

// POST /api/ventes/sur-chambre, body: { sejourId, lignes: [{ serviceId, quantite }] }
//
// Au bar on consomme d'abord et on paie ensuite : la commande d'un client logé
// part sur sa note de chambre et sera réglée au départ. Aucun mouvement de caisse
// ici — rien n'est encaissé maintenant, l'argent entrera au check-out.
export async function envoyerSurChambre(req, res) {
  try {
    const { sejourId, lignes } = req.body;

    if (!sejourId) return res.status(400).json({ message: 'sejourId est requis' });
    if (!Array.isArray(lignes) || lignes.length === 0) {
      return res.status(400).json({ message: 'Au moins une ligne (serviceId, quantite) est requise' });
    }

    const sejour = await prisma.sejour.findUnique({
      where: { id: Number(sejourId) },
      include: { reservation: { include: { chambre: true, client: true } } },
    });

    if (!sejour) return res.status(404).json({ message: 'Séjour non trouvé' });
    if (sejour.dateSortie) {
      return res.status(400).json({ message: 'Ce client est déjà parti : sa note est clôturée.' });
    }

    const nomClient = `${sejour.reservation.client.prenom || ''} ${sejour.reservation.client.nom || ''}`.trim()
                   || sejour.reservation.client.telephone;

    // La remise bar accordée à ce client s'applique d'elle-même, sans que le barman
    // ait à y penser ni à la calculer. Elle est figée dans le prix de la ligne :
    // changer la remise plus tard ne réécrira pas les commandes déjà passées.
    const remise = sejour.reservation.remiseBarPourcent || 0;

    const resultat = await prisma.$transaction(async (tx) => {
      let montantTotal = 0;

      for (const ligne of lignes) {
        const service = await tx.service.findUnique({ where: { id: Number(ligne.serviceId) } });
        if (!service) throw new Error(`Service introuvable (id ${ligne.serviceId})`);

        const quantite = Number(ligne.quantite) || 1;
        const prixApplique = remise > 0
          ? Math.round(Number(service.prix) * (1 - remise / 100) * 100) / 100
          : Number(service.prix);

        montantTotal += prixApplique * quantite;

        await tx.consommation.create({
          data: {
            sejour: { connect: { id: sejour.id } },
            service: { connect: { id: service.id } },
            quantite,
            prixApplique, // prix figé au moment de la commande, remise comprise
          },
        });
      }

      await tracer(tx, req, {
        action: 'CONSOMMATION_SUR_CHAMBRE',
        cibleType: 'reservation',
        cibleId: sejour.reservationId,
        resume: `${lignes.length} article(s) portés sur la chambre `
              + `${sejour.reservation.chambre.numero} (${nomClient}) · ${montantTotal}`
              + (remise > 0 ? ` · remise fidélité ${remise} %` : ''),
      });

      await notifier(tx, {
        type: 'COMMANDE_SUR_CHAMBRE',
        titre: 'Commande portée sur une chambre',
        message: `${Math.round(montantTotal * 100) / 100} porté sur la chambre ${sejour.reservation.chambre.numero} `
               + `(${nomClient}). Réglé au départ du client.`,
        lien: '/paiements',
      });

      return {
        montantTotal: Math.round(montantTotal * 100) / 100,
        chambreNumero: sejour.reservation.chambre.numero,
        client: nomClient,
        remiseAppliquee: remise,
      };
    });

    res.status(201).json(resultat);
  } catch (error) {
    if (error.statut) return res.status(error.statut).json({ message: error.message });
    console.error(error);
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
}

// GET /api/ventes/sur-chambre : les dernières commandes portées sur des notes.
//
// Elles n'apparaissent pas dans l'historique des ventes — rien n'a été encaissé —
// mais le barman doit pouvoir vérifier ce qu'il a envoyé sur quelle chambre.
export async function getConsommationsSurChambre(req, res) {
  try {
    const consommations = await prisma.consommation.findMany({
      include: {
        service: true,
        sejour: { include: { reservation: { include: { chambre: true, client: true } } } },
      },
      orderBy: { dateConsommation: 'desc' },
      take: 15,
    });

    res.json(consommations.map((c) => ({
      id: c.id,
      dateConsommation: c.dateConsommation,
      service: c.service.nom,
      quantite: c.quantite,
      montant: Number(c.prixApplique) * c.quantite,
      chambreNumero: c.sejour.reservation.chambre.numero,
      client: `${c.sejour.reservation.client.prenom || ''} ${c.sejour.reservation.client.nom || ''}`.trim()
           || c.sejour.reservation.client.telephone,
      reglee: c.sejour.dateSortie !== null,
    })));
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
}

// GET /api/ventes : historique. L'administrateur et le caissier voient tout
// (contrôle de fin de journée), le barman voit les siennes.
export async function getVentes(req, res) {
  try {
    const where = estSuperviseur(req) ? {} : { utilisateurId: req.user.id };

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