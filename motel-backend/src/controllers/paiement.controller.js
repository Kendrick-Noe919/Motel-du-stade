import prisma from '../utils/prisma.js';
import PDFDocument from 'pdfkit';
import { exigerCaisseOuverte } from './caisse.controller.js';


const TAUX_TVA = 0.18; // 18%, ajuste selon la réglementation en vigueur

function genererNumeroFacture(paiementId) {
  const annee = new Date().getFullYear();
  return `FACT-${annee}-${String(paiementId).padStart(6, '0')}`;
}

// ---------- POST /api/paiements ----------
// Enregistrer un paiement : inclut choisir mode, valider montant, générer facture
export async function enregistrerPaiement(req, res) {
  try {
    const { reservationId, montant, modePaiement, reference } = req.body;

    const modesValides = ['ESPECES', 'CARTE', 'VIREMENT', 'MOBILE_MONEY'];
    if (!reservationId || !montant || !modePaiement) {
      return res.status(400).json({ message: 'reservationId, montant et modePaiement sont requis' });
    }
    if (!modesValides.includes(modePaiement)) {
      return res.status(400).json({ message: `modePaiement invalide. Valeurs acceptées : ${modesValides.join(', ')}` });
    }
    if (Number(montant) <= 0) {
      return res.status(400).json({ message: 'Le montant doit être positif' });
    }

   const reservation = await prisma.reservation.findUnique({
      where: { id: Number(reservationId) },
      include: { paiements: true, client: true },
    });

    if (!reservation) return res.status(404).json({ message: 'Réservation non trouvée' });
    if (reservation.statut === 'ANNULEE') return res.status(400).json({ message: 'Impossible de payer une réservation annulée' });

    const resultat = await prisma.$transaction(async (tx) => {
      // La caisse doit être ouverte AVANT d'encaisser : on ne la crée plus en douce,
      // sinon le fond de caisse déclaré à l'ouverture ne veut plus rien dire.
      const caisseOperateur = await exigerCaisseOuverte(tx, req.user.id);

      const paiement = await tx.paiement.create({
        data: {
          reservation: { connect: { id: Number(reservationId) } },
          montant: Number(montant),
          modePaiement,
          reference,
          encaissePar: { connect: { id: req.user.id } },
        },
      });

      const montantTTC = Number(montant);
      const montantHT = montantTTC / 1.18;
      const tva = montantTTC - montantHT;

      const facture = await tx.facture.create({
        data: {
          numeroFacture: `FACT-${new Date().getFullYear()}-${String(paiement.id).padStart(6, '0')}`,
          montantHT: montantHT.toFixed(2),
          tva: tva.toFixed(2),
          montantTTC: montantTTC.toFixed(2),
          paiement: { connect: { id: paiement.id } },
        },
      });

      const totalDejaPaye = reservation.paiements.reduce((s, p) => s + Number(p.montant), 0);
      const nouveauTotal = totalDejaPaye + montantTTC;

      let reservationMiseAJour = reservation;
      if (nouveauTotal >= Number(reservation.montantTotal) && reservation.statut === 'EN_ATTENTE') {
        reservationMiseAJour = await tx.reservation.update({
          where: { id: reservation.id },
          data: { statut: 'CONFIRMEE' },
        });
      }

      const mouvement = await tx.mouvementCaisse.create({
        data: {
          caisse: { connect: { id: caisseOperateur.id } },
          type: 'ENTREE',
          montant: montantTTC,
          motif: `Paiement réservation #${reservation.id} · ${reservation.client.prenom} ${reservation.client.nom} · ${modePaiement}`,
          creePar: { connect: { id: req.user.id } },
        },
      });

      return { paiement, facture, reservation: reservationMiseAJour, caisse: caisseOperateur, mouvement };
    });

    res.status(201).json(resultat);
  } catch (error) {
    if (error.statut) return res.status(error.statut).json({ message: error.message });
    console.error(error);
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
}

// Petit utilitaire local : le motif du mouvement de caisse reste lisible sans requête supplémentaire
// function client_nom() {
//   return 'client';
// }

// ---------- GET /api/paiements ----------
// Consulter l'historique de tous les paiements
export async function getAllPaiements(req, res) {
  try {
    const paiements = await prisma.paiement.findMany({
      include: { facture: true, reservation: { include: { client: true } } },
      orderBy: { datePaiement: 'desc' },
    });
    res.json(paiements);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
}

// ---------- GET /api/paiements/reservation/:reservationId ----------
// Historique des paiements d'une réservation précise
export async function getPaiementsParReservation(req, res) {
  try {
    const { reservationId } = req.params;
    const paiements = await prisma.paiement.findMany({
      where: { reservationId: Number(reservationId) },
      include: { facture: true },
      orderBy: { datePaiement: 'desc' },
    });
    res.json(paiements);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
}

// ---------- PATCH /api/paiements/:id/rembourser ----------
// Rembourser un paiement : peut déclencher une annulation de réservation
export async function rembourserPaiement(req, res) {
  try {
    const { id } = req.params;
    const { annulerReservation } = req.body; // true/false, décision du réceptionniste

    const paiement = await prisma.paiement.findUnique({
      where: { id: Number(id) },
      include: { reservation: { include: { client: true, sejour: true } } },
    });

    if (!paiement) {
      return res.status(404).json({ message: 'Paiement non trouvé' });
    }
    if (paiement.rembourse) {
      return res.status(400).json({ message: 'Ce paiement est déjà remboursé' });
    }

    // Même règle que l'annulation directe : tant que le client occupe la chambre,
    // on ne solde rien sans passer par le check-out.
    if (annulerReservation && paiement.reservation.sejour && !paiement.reservation.sejour.dateSortie) {
      return res.status(409).json({
        message: 'Le client est encore dans la chambre. Faites le check-out avant d\'annuler cette réservation.',
      });
    }

    const resultat = await prisma.$transaction(async (tx) => {
      const caisse = await exigerCaisseOuverte(tx, req.user.id);

      const paiementRembourse = await tx.paiement.update({
        where: { id: Number(id) },
        data: { rembourse: true, dateRemboursement: new Date() },
      });

      // L'argent sort physiquement du tiroir : il doit sortir de la caisse aussi.
      // Sans ce mouvement, le solde théorique reste au-dessus de la réalité et
      // l'écart se creuse à chaque remboursement.
      const client = paiement.reservation.client;
      const mouvement = await tx.mouvementCaisse.create({
        data: {
          caisse: { connect: { id: caisse.id } },
          type: 'SORTIE',
          montant: Number(paiement.montant),
          motif: `Remboursement paiement #${paiement.id} · réservation #${paiement.reservationId}`
               + (client ? ` · ${client.prenom ?? ''} ${client.nom ?? ''}`.trimEnd() : ''),
          creePar: { connect: { id: req.user.id } },
        },
      });

      let reservation = paiement.reservation;
      if (annulerReservation && reservation.statut !== 'ANNULEE') {
        reservation = await tx.reservation.update({
          where: { id: reservation.id },
          data: { statut: 'ANNULEE' },
        });
      }

      return { paiement: paiementRembourse, reservation, mouvement, caisseId: caisse.id };
    });

    res.json(resultat);
  } catch (error) {
    if (error.statut) return res.status(error.statut).json({ message: error.message });
    console.error(error);
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
}
// GET /api/paiements/:id/facture : génère et renvoie le PDF de la facture
export async function genererFacturePDF(req, res) {
  try {
    const { id } = req.params;

    const paiement = await prisma.paiement.findUnique({
      where: { id: Number(id) },
      include: {
        facture: true,
        reservation: { include: { client: true, chambre: { include: { typeChambre: true } } } },
      },
    });

    if (!paiement) return res.status(404).json({ message: 'Paiement non trouvé' });
    if (!paiement.facture) return res.status(404).json({ message: 'Aucune facture associée à ce paiement' });

    const { facture, reservation } = paiement;
    const { client, chambre } = reservation;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${facture.numeroFacture}.pdf"`);

    const doc = new PDFDocument({ margin: 50 });
    doc.pipe(res);

    // ---------- En-tête ----------
    doc.fontSize(20).text('Motel Manager', { continued: false });
    doc.fontSize(9).fillColor('#6B7280').text('Facture officielle');
    doc.moveDown(1.5);

    doc.fontSize(14).fillColor('#111928').text(`Facture ${facture.numeroFacture}`);
    doc.fontSize(9).fillColor('#6B7280').text(`Émise le ${new Date(facture.dateEmission).toLocaleDateString('fr-FR')}`);
    doc.moveDown(1);

    // ---------- Infos client ----------
    doc.fontSize(11).fillColor('#111928').text('Facturé à :', { underline: false });
    doc.fontSize(10).fillColor('#374151').text(`${client.prenom} ${client.nom}`);
    doc.text(client.email);
    if (client.telephone) doc.text(client.telephone);
    doc.moveDown(1);

    // ---------- Détail du séjour ----------
    doc.fontSize(11).fillColor('#111928').text('Détail du séjour :');
    doc.fontSize(10).fillColor('#374151');
    doc.text(`Chambre N°${chambre.numero} · ${chambre.typeChambre.libelle}`);
    doc.text(`Du ${new Date(reservation.dateArrivee).toLocaleDateString('fr-FR')} au ${new Date(reservation.dateDepart).toLocaleDateString('fr-FR')} (${reservation.nombreNuits} nuit${reservation.nombreNuits > 1 ? 's' : ''})`);
    doc.moveDown(1.5);

    // ---------- Tableau des montants ----------
    const startY = doc.y;
    doc.fontSize(10).fillColor('#6B7280');
    doc.text('Montant HT', 50, startY);
    doc.text(`${facture.montantHT}`, 400, startY, { align: 'right' });
    doc.text('TVA', 50, startY + 20);
    doc.text(`${facture.tva}`, 400, startY + 20, { align: 'right' });

    doc.moveTo(50, startY + 40).lineTo(500, startY + 40).strokeColor('#E6EBF1').stroke();

    doc.fontSize(12).fillColor('#111928').text('Total TTC', 50, startY + 50);
    doc.fontSize(12).fillColor('#5750F1').text(`${facture.montantTTC}`, 400, startY + 50, { align: 'right' });

    doc.moveDown(3);
    doc.fontSize(9).fillColor('#6B7280').text(`Mode de paiement : ${paiement.modePaiement}${paiement.reference ? ` · Réf. ${paiement.reference}` : ''}`);
    doc.text(`Payé le ${new Date(paiement.datePaiement).toLocaleDateString('fr-FR')}`);

    doc.end();
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
}