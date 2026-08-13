import prisma from '../utils/prisma.js';

function debutJour(date = new Date()) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}
function finJour(date = new Date()) {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

export async function getDashboard(req, res) {
  try {
    const debut = debutJour();
    const fin = finJour();

    // ---------- Occupation des chambres ----------
    const [totalChambres, chambresParEtat] = await Promise.all([
      prisma.chambre.count(),
      prisma.chambre.groupBy({ by: ['etat'], _count: { id: true } }),
    ]);

    const compteParEtat = Object.fromEntries(chambresParEtat.map((c) => [c.etat, c._count.id]));
    const chambresOccupees = compteParEtat.OCCUPEE || 0;
    const tauxOccupation = totalChambres > 0 ? Math.round((chambresOccupees / totalChambres) * 100) : 0;

    // ---------- Revenus du jour ----------
    const paiementsDuJour = await prisma.paiement.findMany({
      where: { datePaiement: { gte: debut, lte: fin }, rembourse: false },
    });
    const revenusDuJour = paiementsDuJour.reduce((s, p) => s + Number(p.montant), 0);

    // ---------- Réservations du jour ----------
    const reservationsDuJour = await prisma.reservation.count({
      where: { dateArrivee: { gte: debut, lte: fin }, statut: { not: 'ANNULEE' } },
    });
    const nouvellesReservations = await prisma.reservation.count({
      where: { dateReservation: { gte: debut, lte: fin } },
    });

    // ---------- Statistiques mensuelles (6 derniers mois) ----------
    const sixMoisAvant = new Date();
    sixMoisAvant.setMonth(sixMoisAvant.getMonth() - 5);
    sixMoisAvant.setDate(1);
    sixMoisAvant.setHours(0, 0, 0, 0);

    const paiements6Mois = await prisma.paiement.findMany({
      where: { datePaiement: { gte: sixMoisAvant }, rembourse: false },
      select: { datePaiement: true, montant: true },
    });

    const statsParMois = {};
    for (const p of paiements6Mois) {
      const cle = `${p.datePaiement.getFullYear()}-${String(p.datePaiement.getMonth() + 1).padStart(2, '0')}`;
      statsParMois[cle] = (statsParMois[cle] || 0) + Number(p.montant);
    }

    const statistiquesMensuelles = Object.entries(statsParMois)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([mois, total]) => ({ mois, total }));

    res.json({
      tauxOccupation,
      chambresOccupees,
      chambresDisponibles: compteParEtat.DISPONIBLE || 0,
      chambresMaintenance: compteParEtat.MAINTENANCE || 0,
      chambresNettoyage: compteParEtat.NETTOYAGE || 0,
      totalChambres,
      revenusDuJour,
      reservationsDuJour,
      nouvellesReservations,
      statistiquesMensuelles,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
}