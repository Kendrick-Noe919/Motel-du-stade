import prisma from '../utils/prisma.js';
import { ETATS_NON_EXPLOITABLES } from './chambre.controller.js';
import { calculerSoldeReservation } from './reservation.controller.js';

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

    // Le cahier des charges (point 25) demande de diviser par les chambres exploitables :
    // une chambre en maintenance n'était pas louable, elle n'a pas à faire chuter le taux.
    const nonExploitables = ETATS_NON_EXPLOITABLES.reduce((s, e) => s + (compteParEtat[e] || 0), 0);
    const chambresExploitables = totalChambres - nonExploitables;
    const tauxOccupation = chambresExploitables > 0
      ? Math.round((chambresOccupees / chambresExploitables) * 100)
      : 0;

    // ---------- Revenus du jour ----------
    // On compte ce qui est réellement entré et sorti aujourd'hui : les encaissements
    // de réservations, les ventes du bar (qui n'étaient pas comptées du tout), moins
    // les remboursements effectués aujourd'hui.
    const [paiementsDuJour, ventesDuJour, remboursementsDuJour] = await Promise.all([
      prisma.paiement.findMany({ where: { datePaiement: { gte: debut, lte: fin } } }),
      prisma.venteDirecte.findMany({ where: { dateVente: { gte: debut, lte: fin } } }),
      prisma.paiement.findMany({ where: { dateRemboursement: { gte: debut, lte: fin } } }),
    ]);

    const encaissementsReservations = paiementsDuJour.reduce((s, p) => s + Number(p.montant), 0);
    const encaissementsBar = ventesDuJour.reduce((s, v) => s + Number(v.montantTotal), 0);
    const remboursements = remboursementsDuJour.reduce((s, p) => s + Number(p.montant), 0);
    const revenusDuJour = encaissementsReservations + encaissementsBar - remboursements;

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
      chambresReservees: compteParEtat.RESERVEE || 0,
      chambresMaintenance: compteParEtat.MAINTENANCE || 0,
      chambresHorsService: compteParEtat.HORS_SERVICE || 0,
      chambresNettoyage: compteParEtat.NETTOYAGE || 0,
      totalChambres,
      chambresExploitables,
      revenusDuJour,
      encaissementsReservations,
      encaissementsBar,
      remboursements,
      reservationsDuJour,
      nouvellesReservations,
      statistiquesMensuelles,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
}
// ============================================================
// GET /api/dashboard/recettes?debut=&fin=
// Recettes détaillées : du cumul jusqu'au détail de chaque source.
// Réservé à l'administrateur et au caissier (contrôle de fin de journée).
// ============================================================

export async function getRecettes(req, res) {
  try {
    const debut = req.query.debut ? new Date(req.query.debut) : debutJour();
    const fin = req.query.fin ? new Date(req.query.fin) : finJour();
    if (isNaN(debut.getTime()) || isNaN(fin.getTime())) {
      return res.status(400).json({ message: 'Période invalide' });
    }

    // Le rôle de l'encaisseur accompagne chaque ligne : l'administrateur veut lire
    // ses chiffres par poste (« qu'a rapporté le bar ? »), pas seulement par personne.
    const AVEC_ROLES = { select: { id: true, nom: true, prenom: true, roles: { include: { role: true } } } };

    const [paiements, ventes, remboursements, mouvements, consommations, reservationsOuvertes] = await Promise.all([
      prisma.paiement.findMany({
        where: { datePaiement: { gte: debut, lte: fin } },
        include: {
          // La composition de la note accompagne chaque encaissement : elle permet
          // de rendre au bar la part qui lui revient, même quand c'est la réception
          // qui a pris l'argent.
          reservation: {
            select: {
              id: true,
              modeTarification: true,
              montantTotal: true,
              sejour: { select: { consommations: { select: { prixApplique: true, quantite: true } } } },
            },
          },
          encaissePar: AVEC_ROLES,
        },
      }),
      prisma.venteDirecte.findMany({
        where: { dateVente: { gte: debut, lte: fin } },
        include: {
          lignes: { include: { service: true } },
          utilisateur: AVEC_ROLES,
        },
      }),
      prisma.paiement.findMany({ where: { dateRemboursement: { gte: debut, lte: fin } } }),
      prisma.mouvementCaisse.findMany({
        where: { dateMouvement: { gte: debut, lte: fin } },
        include: { creePar: { select: { id: true, nom: true, prenom: true } } },
      }),
      // Le bar porté sur les notes de chambre : facturé sur la période, mais encaissé
      // au départ du client. Invisible dans les ventes directes, il manquait donc
      // entièrement au chiffre du département Bar.
      prisma.consommation.findMany({
        where: { dateConsommation: { gte: debut, lte: fin } },
        include: { service: true },
      }),
      // Créances : ce qui est facturé et pas encore rentré. C'est un stock, pas un
      // flux — il ne dépend pas de la période choisie.
      prisma.reservation.findMany({
        where: { statut: { notIn: ['ANNULEE', 'EXPIREE'] } },
        include: { paiements: true, sejour: { include: { consommations: true } } },
      }),
    ]);

    // ---------- Ventilation d'un encaissement entre la chambre et le bar ----------
    //
    // Une note de chambre mêle deux départements : la chambre elle-même et ce que
    // le client a consommé au bar. La réception encaisse le tout d'un coup, mais
    // la recette du bar reste la recette du bar — la compter en hébergement
    // gonflerait les chambres et effacerait le bar.
    //
    // La répartition est proportionnelle à la composition de la note. Un paiement
    // partiel se répartit dans les mêmes proportions : c'est la seule règle qui
    // tombe toujours juste au total, sans décider arbitrairement qu'on rembourse
    // la chambre avant le bar.
    function ventiler(paiement) {
      const montant = Number(paiement.montant);
      const resa = paiement.reservation;
      if (!resa) return { chambre: montant, bar: 0 };

      const consommations = (resa.sejour?.consommations || [])
        .reduce((s, c) => s + Number(c.prixApplique) * c.quantite, 0);
      if (consommations <= 0) return { chambre: montant, bar: 0 };

      const noteComplete = Number(resa.montantTotal) + consommations;
      if (noteComplete <= 0) return { chambre: montant, bar: 0 };

      const bar = Math.round((montant * (consommations / noteComplete)) * 100) / 100;
      return { chambre: Math.round((montant - bar) * 100) / 100, bar };
    }

    // ---------- Hébergement : nuitée et horaire séparés ----------
    const hebergement = { NUITEE: 0, HORAIRE: 0 };
    let barSurNotesEncaisse = 0;
    for (const p of paiements) {
      const { chambre, bar } = ventiler(p);
      const mode = p.reservation?.modeTarification === 'HORAIRE' ? 'HORAIRE' : 'NUITEE';
      hebergement[mode] += chambre;
      barSurNotesEncaisse += bar;
    }
    barSurNotesEncaisse = Math.round(barSurNotesEncaisse * 100) / 100;

    // ---------- Bar et services : par catégorie ----------
    const parCategorie = { RESTAURANT: 0, MINIBAR: 0, BLANCHISSERIE: 0, AUTRE: 0 };
    for (const v of ventes) {
      for (const l of v.lignes) {
        const categorie = l.service?.categorie || 'AUTRE';
        parCategorie[categorie] = (parCategorie[categorie] || 0) + Number(l.prixApplique) * l.quantite;
      }
    }

    // ---------- Par personne : qui a encaissé quoi ----------
    const parPersonne = new Map();
    const cumuler = (personne, cle, montant) => {
      if (!personne) return;
      const id = personne.id;
      if (!parPersonne.has(id)) {
        parPersonne.set(id, { id, nom: `${personne.prenom} ${personne.nom}`, hebergement: 0, bar: 0, total: 0 });
      }
      const ligne = parPersonne.get(id);
      ligne[cle] += montant;
      ligne.total += montant;
    };
    // La part bar d'une note de chambre est portée au bar, y compris quand c'est la
    // réception qui a encaissé : la colonne « bar » d'une standardiste montre donc ce
    // qu'elle a encaissé POUR le bar, et non ce qu'elle aurait vendu.
    for (const p of paiements) {
      const { chambre, bar } = ventiler(p);
      cumuler(p.encaissePar, 'hebergement', chambre);
      if (bar > 0) cumuler(p.encaissePar, 'bar', bar);
    }
    for (const v of ventes) cumuler(v.utilisateur, 'bar', Number(v.montantTotal));

    // ---------- Par rôle : qui, dans l'organigramme, fait entrer l'argent ----------
    // Un agent cumulant plusieurs rôles forme sa propre ligne (« Caissier, Barman ») :
    // le répartir entre ses rôles compterait son chiffre deux fois.
    const parRole = new Map();
    const cumulerRole = (personne, cle, montant) => {
      if (!personne) return;
      const libelle = personne.roles.map((r) => r.role.libelle).sort().join(', ') || 'Sans rôle';
      if (!parRole.has(libelle)) {
        parRole.set(libelle, { role: libelle, hebergement: 0, bar: 0, total: 0 });
      }
      const ligne = parRole.get(libelle);
      ligne[cle] += montant;
      ligne.total += montant;
    };
    for (const p of paiements) {
      const { chambre, bar } = ventiler(p);
      cumulerRole(p.encaissePar, 'hebergement', chambre);
      if (bar > 0) cumulerRole(p.encaissePar, 'bar', bar);
    }
    for (const v of ventes) cumulerRole(v.utilisateur, 'bar', Number(v.montantTotal));

    // ---------- Bar facturé sur les notes de chambre ----------
    const surNotes = { RESTAURANT: 0, MINIBAR: 0, BLANCHISSERIE: 0, AUTRE: 0 };
    for (const c of consommations) {
      const categorie = c.service?.categorie || 'AUTRE';
      surNotes[categorie] = (surNotes[categorie] || 0) + Number(c.prixApplique) * c.quantite;
    }
    const totalSurNotes = Object.values(surNotes).reduce((s, v) => s + v, 0);

    // ---------- Créances : ce qu'il reste à faire entrer en caisse ----------
    const creances = reservationsOuvertes.reduce((acc, r) => {
      const { resteAPayer } = calculerSoldeReservation(r);
      if (resteAPayer <= 0) return acc;
      acc.total += resteAPayer;
      acc.nombre += 1;
      if (r.statut === 'TERMINEE') acc.clientsPartis += resteAPayer;
      return acc;
    }, { total: 0, nombre: 0, clientsPartis: 0 });
    creances.total = Math.round(creances.total * 100) / 100;
    creances.clientsPartis = Math.round(creances.clientsPartis * 100) / 100;

    const totalHebergement = Math.round((hebergement.NUITEE + hebergement.HORAIRE) * 100) / 100;
    const ventesComptoir = Object.values(parCategorie).reduce((s, v) => s + v, 0);
    // Le bar encaisse par deux chemins : la vente réglée au comptoir, et la part bar
    // d'une note de chambre payée à la réception. Les deux lui reviennent.
    const totalBar = Math.round((ventesComptoir + barSurNotesEncaisse) * 100) / 100;
    const totalRemboursements = remboursements.reduce((s, p) => s + Number(p.montant), 0);
    const sortiesCaisse = mouvements
      .filter((m) => m.type === 'SORTIE')
      .reduce((s, m) => s + Number(m.montant), 0);

    res.json({
      periode: { debut, fin },
      cumul: {
        hebergement: totalHebergement,
        bar: totalBar,
        remboursements: totalRemboursements,
        sortiesCaisse,
        recetteNette: totalHebergement + totalBar - totalRemboursements,
      },
      hebergement: {
        nuitee: hebergement.NUITEE,
        horaire: hebergement.HORAIRE,
        nombrePaiements: paiements.length,
      },
      bar: {
        ...parCategorie,
        nombreVentes: ventes.length,
        ventesComptoir,
        surNotesEncaisse: barSurNotesEncaisse,
      },

      // Les deux départements. « encaissé » est l'argent réellement entré sur la
      // période, chacun chez lui : la part bar d'une note de chambre est comptée au
      // bar même si la réception a tenu la caisse. « surNotesChambre » est ce qui a
      // été facturé sur des notes pendant la période, encaissé ou non.
      departements: {
        chambres: { encaisse: totalHebergement, nombreOperations: paiements.length },
        bar: {
          encaisse: totalBar,
          ventesComptoir,
          surNotesEncaisse: barSurNotesEncaisse,
          surNotesChambre: totalSurNotes,
          detailSurNotes: surNotes,
          genere: Math.round((ventesComptoir + totalSurNotes) * 100) / 100,
          nombreOperations: ventes.length + consommations.length,
        },
      },
      creances,
      parRole: [...parRole.values()].sort((a, b) => b.total - a.total),
      parPersonne: [...parPersonne.values()].sort((a, b) => b.total - a.total),
      sorties: mouvements
        .filter((m) => m.type === 'SORTIE')
        .map((m) => ({
          date: m.dateMouvement,
          montant: Number(m.montant),
          motif: m.motif,
          par: m.creePar ? `${m.creePar.prenom} ${m.creePar.nom}` : null,
        })),
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
}
