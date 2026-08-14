import prisma from '../utils/prisma.js';
import { tracer } from '../utils/journal.js';
import { notifier } from '../utils/notifications.js';
import { ADMIN } from '../config/roles.js';
import { lireParametreNombre, TAMPON_NETTOYAGE } from '../utils/parametres.js';
import { ETATS_NON_EXPLOITABLES } from './chambre.controller.js';
import { exigerCaisseOuverte } from './caisse.controller.js';

// ============================================================
// Fonctions utilitaires internes
// ============================================================

function calculerNombreNuits(dateArrivee, dateDepart) {
  const msParJour = 1000 * 60 * 60 * 24;
  const diff = new Date(dateDepart) - new Date(dateArrivee);
  return Math.round(diff / msParJour);
}

// En mode horaire, on tolère une arrivée légèrement passée : au comptoir, la
// standardiste saisit souvent la réservation quelques minutes après l'arrivée réelle,
// et un refus sec sur « 16h05 pour 16h00 » n'aurait aucun sens.
const TOLERANCE_ARRIVEE_PASSEE_HEURES = 6;

// Centralise la validation des dates, utilisée à la création ET à la modification.
//
// La granularité dépend du mode, et c'est essentiel :
//   - NUITEE  : le formulaire envoie une DATE seule (« 2026-08-14 »), interprétée à
//               minuit. Comparer cet instant à « maintenant » rejetterait toute
//               réservation du jour passé 6h du matin. On compare donc des jours.
//   - HORAIRE : le formulaire envoie un instant précis, on compare des instants.
function validerDatesReservation(dateArrivee, dateDepart, mode = 'NUITEE') {
  const arrivee = new Date(dateArrivee);
  const depart = new Date(dateDepart);

  if (isNaN(arrivee.getTime()) || isNaN(depart.getTime())) {
    return 'Dates invalides';
  }

  if (mode === 'NUITEE') {
    // Un séjour qui commence aujourd'hui est valide, quelle que soit l'heure qu'il est.
    const jourArrivee = Date.UTC(arrivee.getUTCFullYear(), arrivee.getUTCMonth(), arrivee.getUTCDate());
    const maintenant = new Date();
    const aujourdHui = Date.UTC(maintenant.getFullYear(), maintenant.getMonth(), maintenant.getDate());
    if (jourArrivee < aujourdHui) {
      return 'La date d\'arrivée ne peut pas être dans le passé';
    }
  } else if (arrivee < new Date(Date.now() - TOLERANCE_ARRIVEE_PASSEE_HEURES * 3600000)) {
    return `L'heure d'arrivée est trop ancienne (plus de ${TOLERANCE_ARRIVEE_PASSEE_HEURES}h dans le passé)`;
  }

  if (depart <= arrivee) {
    return 'La date de départ doit être après la date d\'arrivée';
  }
  return null;
}

// Retrouve un client par son téléphone, ou le crée à la volée.
// Au téléphone, le client n'a pas le temps qu'on ouvre une autre page pour saisir
// sa fiche : le pivot est le numéro, qui est déjà unique en base.
async function resoudreClient(tx, { clientId, client }) {
  if (clientId) {
    const existant = await tx.client.findUnique({ where: { id: Number(clientId) } });
    if (!existant) { const e = new Error('Client introuvable'); e.statut = 400; throw e; }
    return existant;
  }

  if (!client?.telephone) {
    const e = new Error('Indiquez au minimum le téléphone du client');
    e.statut = 400;
    throw e;
  }

  const telephone = String(client.telephone).trim();
  const deja = await tx.client.findUnique({ where: { telephone } });

  if (deja) {
    // Le client rappelle : on complète sa fiche si elle était incomplète, sans jamais écraser
    const complements = {};
    for (const champ of ['nom', 'prenom', 'email', 'adresse', 'numeroPiece']) {
      if (!deja[champ] && client[champ]) complements[champ] = String(client[champ]).trim();
    }
    if (client.sexe && !deja.sexe && ['M', 'F'].includes(client.sexe)) complements.sexe = client.sexe;

    return Object.keys(complements).length
      ? tx.client.update({ where: { id: deja.id }, data: complements })
      : deja;
  }

  return tx.client.create({
    data: {
      telephone,
      nom: client.nom?.trim() || null,
      prenom: client.prenom?.trim() || null,
      email: client.email?.trim() || null,
      adresse: client.adresse?.trim() || null,
      numeroPiece: client.numeroPiece?.trim() || null,
      sexe: ['M', 'F'].includes(client.sexe) ? client.sexe : null,
    },
  });
}

export function calculerMontant(typeChambre, modeTarification, nombreNuits, nombreHeures) {
  let montant;

  if (modeTarification === 'HORAIRE') {
    if (!typeChambre.prixPremiereHeure) {
      throw new Error('Tarif horaire non configuré pour ce type de chambre');
    }
    montant = Number(typeChambre.prixPremiereHeure);
    if (nombreHeures > 1) {
      montant += (nombreHeures - 1) * Number(typeChambre.prixHeureSupplementaire || 0);
    }
  } else {
    montant = nombreNuits * Number(typeChambre.prixParNuit);
  }

  if (typeChambre.promo) {
    montant = montant * (1 - Number(typeChambre.promo) / 100);
  }

  return Math.round(montant * 100) / 100;
}

// Somme des paiements non remboursés, et ce qu'il reste à encaisser.
// Utilisé partout où l'on affiche une réservation : le personnel doit toujours
// voir le reste dû, y compris après ajout d'heures supplémentaires.
// Le total dû comprend les consommations du séjour, pas seulement la chambre.
// Sans elles, une réservation s'affichait « soldée » alors que le check-out la
// refusait ensuite pour un minibar impayé : deux chiffres différents pour la même
// question. Les consommations ne sont comptées que si l'appelant a chargé le
// séjour ; les écrans qui ne s'intéressent qu'à la chambre restent inchangés.
export function calculerSoldeReservation(reservation) {
  const montantPaye = (reservation.paiements || [])
    .filter((p) => !p.rembourse)
    .reduce((somme, p) => somme + Number(p.montant), 0);

  const montantConsommations = (reservation.sejour?.consommations || [])
    .reduce((somme, c) => somme + Number(c.prixApplique) * c.quantite, 0);

  const totalDu = Math.round((Number(reservation.montantTotal) + montantConsommations) * 100) / 100;
  const resteAPayer = Math.round(Math.max(0, totalDu - montantPaye) * 100) / 100;

  return { montantPaye, montantConsommations, totalDu, resteAPayer };
}

// Une chambre réservée pour ce soir reste louable ce matin, mais on garde un tampon
// avant l'arrivée suivante pour laisser le temps du nettoyage. Le délai se règle
// depuis l'écran Paramètres (TAMPON_NETTOYAGE_HEURES).
//
// `client` accepte prisma ou un tx : lors d'une création, la vérification doit se
// faire DANS la transaction, sinon deux réservations simultanées passent toutes les deux.
export async function chambreEstDisponible(client, chambreId, dateArrivee, dateDepart, reservationIdAIgnorer = null) {
  const tampon = await lireParametreNombre(TAMPON_NETTOYAGE);
  const tamponMs = tampon * 3600000;

  // On élargit la période demandée du tampon de chaque côté : le départ doit laisser
  // le temps de nettoyer avant l'arrivée suivante, et réciproquement.
  const debut = new Date(new Date(dateArrivee).getTime() - tamponMs);
  const fin = new Date(new Date(dateDepart).getTime() + tamponMs);

  const conflits = await client.reservation.findMany({
    where: {
      chambreId: Number(chambreId),
      statut: { notIn: ['ANNULEE', 'TERMINEE', 'EXPIREE'] },
      dateArrivee: { lt: fin },
      dateDepart: { gt: debut },
      ...(reservationIdAIgnorer && { id: { not: Number(reservationIdAIgnorer) } }),
    },
  });
  return conflits.length === 0;
}

// ============================================================
// GET /api/reservations/disponibilites
// ============================================================

export async function consulterDisponibilites(req, res) {
  try {
    const { dateArrivee, dateDepart } = req.query;

    if (!dateArrivee || !dateDepart) {
      return res.status(400).json({ message: 'dateArrivee et dateDepart sont requis (format YYYY-MM-DD)' });
    }

    const tampon = await lireParametreNombre(TAMPON_NETTOYAGE);
    const tamponMs = tampon * 3600000;
    const debut = new Date(new Date(dateArrivee).getTime() - tamponMs);
    const fin = new Date(new Date(dateDepart).getTime() + tamponMs);

    const chambresOccupeesIds = await prisma.reservation.findMany({
      where: {
        statut: { notIn: ['ANNULEE', 'TERMINEE', 'EXPIREE'] },
        dateArrivee: { lt: fin },
        dateDepart: { gt: debut },
      },
      select: { chambreId: true },
    });

    const idsAExclure = chambresOccupeesIds.map((r) => r.chambreId);

    // Une chambre RESERVEE pour plus tard reste proposable si sa période ne chevauche
    // pas celle demandée : c'est le filtre sur les réservations qui fait foi, pas l'état.
    // En revanche une chambre occupée, en nettoyage ou hors service n'est pas louable.
    const chambresDisponibles = await prisma.chambre.findMany({
      where: {
        id: { notIn: idsAExclure },
        etat: { notIn: ['OCCUPEE', 'NETTOYAGE', ...ETATS_NON_EXPLOITABLES] },
      },
      include: { typeChambre: true },
      orderBy: { numero: 'asc' },
    });

    res.json(chambresDisponibles);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
}

// ============================================================
// GET /api/reservations
// ============================================================

export async function getAllReservations(req, res) {
  try {
    const reservations = await prisma.reservation.findMany({
      // Les consommations sont chargées avec le séjour : l'écran Paiements doit
      // afficher le reste réellement dû, minibar compris.
      include: {
        client: true,
        chambre: { include: { typeChambre: true } },
        paiements: true,
        sejour: { include: { consommations: true } },
      },
      // La dernière réservation saisie doit arriver en tête de liste. Trier sur
      // dateArrivee remontait au contraire les arrivées lointaines : une résa
      // prise à l'instant pour la semaine prochaine passait devant celle qu'on
      // vient d'enregistrer pour ce soir. L'id départage les saisies simultanées.
      orderBy: [{ dateReservation: 'desc' }, { id: 'desc' }],
    });
    res.json(reservations.map((r) => ({ ...r, ...calculerSoldeReservation(r) })));
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
}

// ============================================================
// GET /api/reservations/:id
// ============================================================

export async function getReservationById(req, res) {
  try {
    const { id } = req.params;
    const reservation = await prisma.reservation.findUnique({
      where: { id: Number(id) },
      include: {
        client: true,
        chambre: { include: { typeChambre: true } },
        paiements: true,
        sejour: true,
      },
    });

    if (!reservation) {
      return res.status(404).json({ message: 'Réservation non trouvée' });
    }
    res.json({ ...reservation, ...calculerSoldeReservation(reservation) });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
}

// ============================================================
// POST /api/reservations
// ============================================================

export async function createReservation(req, res) {
  try {
    // `client` permet de saisir le client directement dans le formulaire de réservation,
    // sans passer par la page Clients. `clientId` reste accepté pour un client déjà choisi.
    const { clientId, client, chambreId, dateArrivee, modeTarification, nombreHeures, source } = req.body;
    let { dateDepart } = req.body;
    const mode = modeTarification === 'HORAIRE' ? 'HORAIRE' : 'NUITEE';

    if ((!clientId && !client?.telephone) || !chambreId || !dateArrivee) {
      return res.status(400).json({ message: 'Le client (ou son téléphone), la chambre et la date d\'arrivée sont requis' });
    }

    if (mode === 'HORAIRE') {
      if (!nombreHeures || Number(nombreHeures) < 1) {
        return res.status(400).json({ message: 'nombreHeures est requis et doit être au moins 1 en mode horaire' });
      }
      // ---------- Calcul automatique : la date de départ n'est JAMAIS saisie en horaire ----------
      const arrivee = new Date(dateArrivee);
      if (isNaN(arrivee.getTime())) {
        return res.status(400).json({ message: 'Date d\'arrivée invalide' });
      }
      const departCalcule = new Date(arrivee.getTime() + Number(nombreHeures) * 60 * 60 * 1000);
      dateDepart = departCalcule.toISOString();
    } else if (!dateDepart) {
      return res.status(400).json({ message: 'dateDepart est requis en mode nuitée' });
    }

    const erreurDates = validerDatesReservation(dateArrivee, dateDepart, mode);
    if (erreurDates) return res.status(400).json({ message: erreurDates });

    const chambre = await prisma.chambre.findUnique({
      where: { id: Number(chambreId) }, include: { typeChambre: true },
    });
    if (!chambre) return res.status(400).json({ message: 'Chambre introuvable' });

    if (ETATS_NON_EXPLOITABLES.includes(chambre.etat)) {
      return res.status(400).json({
        message: `Cette chambre est en ${chambre.etat.toLowerCase().replace('_', ' ')} et ne peut pas être réservée`,
      });
    }

    const nombreNuits = mode === 'NUITEE' ? calculerNombreNuits(dateArrivee, dateDepart) : null;

    let montantTotal;
    try {
      montantTotal = calculerMontant(chambre.typeChambre, mode, nombreNuits, mode === 'HORAIRE' ? Number(nombreHeures) : null);
    } catch (err) {
      return res.status(400).json({ message: err.message });
    }

    // Tout dans une transaction : la vérification de disponibilité doit être atomique
    // avec la création, sinon deux réservations enregistrées au même instant sur la
    // même chambre passent toutes les deux.
    const reservation = await prisma.$transaction(async (tx) => {
      // Verrou sur la ligne de la chambre : les créations concurrentes sur cette
      // chambre attendent ici, et la vérification qui suit voit bien l'autre réservation.
      await tx.$queryRaw`SELECT id FROM chambres WHERE id = ${Number(chambreId)} FOR UPDATE`;

      const disponible = await chambreEstDisponible(tx, chambreId, dateArrivee, dateDepart);
      if (!disponible) {
        const e = new Error('Cette chambre est déjà réservée sur cette période');
        e.statut = 409;
        throw e;
      }

      const clientFinal = await resoudreClient(tx, { clientId, client });

      const creee = await tx.reservation.create({
        data: {
          client: { connect: { id: clientFinal.id } },
          chambre: { connect: { id: Number(chambreId) } },
          dateArrivee: new Date(dateArrivee),
          dateDepart: new Date(dateDepart),
          modeTarification: mode,
          nombreNuits,
          nombreHeures: mode === 'HORAIRE' ? Number(nombreHeures) : null,
          montantTotal,
          source: source === 'EN_LIGNE' ? 'EN_LIGNE' : 'RECEPTION',
          statut: 'EN_ATTENTE',
          creePar: { connect: { id: req.user.id } },
        },
        include: { client: true, chambre: { include: { typeChambre: true } } },
      });

      const nomClient = `${clientFinal.prenom ?? ''} ${clientFinal.nom ?? ''}`.trim() || clientFinal.telephone;
      await tracer(tx, req, {
        action: 'RESERVATION_CREEE',
        cibleType: 'reservation',
        cibleId: creee.id,
        resume: `Réservation #${creee.id} pour ${nomClient}, chambre ${chambre.numero}, ${montantTotal}`,
      });

      return creee;
    });

    res.status(201).json({ ...reservation, ...calculerSoldeReservation(reservation) });
  } catch (error) {
    if (error.statut) return res.status(error.statut).json({ message: error.message });
    console.error(error);
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
}

// ============================================================
// POST /api/reservations/arrivee-directe
// Le client se présente au comptoir : client, réservation, confirmation, check-in
// et encaissement en une seule opération. C'est le parcours le plus fréquent d'un
// motel, il ne doit pas coûter six écrans.
// ============================================================

export async function arriveeDirecte(req, res) {
  try {
    const { clientId, client, chambreId, modeTarification, nombreHeures, nombreNuits,
            montantRegle, modePaiement, reference } = req.body;

    const mode = modeTarification === 'HORAIRE' ? 'HORAIRE' : 'NUITEE';

    if ((!clientId && !client?.telephone) || !chambreId) {
      return res.status(400).json({ message: 'Le client (ou son téléphone) et la chambre sont requis' });
    }
    if (mode === 'HORAIRE' && (!nombreHeures || Number(nombreHeures) < 1)) {
      return res.status(400).json({ message: 'Indiquez le nombre d\'heures' });
    }
    if (mode === 'NUITEE' && (!nombreNuits || Number(nombreNuits) < 1)) {
      return res.status(400).json({ message: 'Indiquez le nombre de nuitées' });
    }

    const chambre = await prisma.chambre.findUnique({
      where: { id: Number(chambreId) }, include: { typeChambre: true },
    });
    if (!chambre) return res.status(400).json({ message: 'Chambre introuvable' });
    if (chambre.etat !== 'DISPONIBLE') {
      return res.status(409).json({
        message: `La chambre ${chambre.numero} est en ${chambre.etat.toLowerCase().replace('_', ' ')}, elle n'est pas prête à recevoir un client.`,
      });
    }

    const arrivee = new Date();
    const depart = mode === 'HORAIRE'
      ? new Date(arrivee.getTime() + Number(nombreHeures) * 3600000)
      : new Date(arrivee.getTime() + Number(nombreNuits) * 24 * 3600000);

    let montantTotal;
    try {
      montantTotal = calculerMontant(
        chambre.typeChambre, mode,
        mode === 'NUITEE' ? Number(nombreNuits) : null,
        mode === 'HORAIRE' ? Number(nombreHeures) : null,
      );
    } catch (err) {
      return res.status(400).json({ message: err.message });
    }

    const aRegler = Number(montantRegle) || 0;
    if (aRegler > 0 && !modePaiement) {
      return res.status(400).json({ message: 'Indiquez le mode de paiement' });
    }

    const resultat = await prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM chambres WHERE id = ${Number(chambreId)} FOR UPDATE`;

      const disponible = await chambreEstDisponible(tx, chambreId, arrivee, depart);
      if (!disponible) {
        const e = new Error('Cette chambre est déjà réservée sur cette période');
        e.statut = 409;
        throw e;
      }

      const clientFinal = await resoudreClient(tx, { clientId, client });

      const reservation = await tx.reservation.create({
        data: {
          client: { connect: { id: clientFinal.id } },
          chambre: { connect: { id: Number(chambreId) } },
          dateArrivee: arrivee,
          dateDepart: depart,
          modeTarification: mode,
          nombreNuits: mode === 'NUITEE' ? Number(nombreNuits) : null,
          nombreHeures: mode === 'HORAIRE' ? Number(nombreHeures) : null,
          montantTotal,
          source: 'RECEPTION',
          statut: 'EN_COURS',
          creePar: { connect: { id: req.user.id } },
        },
      });

      const sejour = await tx.sejour.create({
        data: {
          reservation: { connect: { id: reservation.id } },
          checkInPar: { connect: { id: req.user.id } },
        },
      });

      await tx.chambre.update({ where: { id: Number(chambreId) }, data: { etat: 'OCCUPEE' } });

      // Encaissement immédiat si le client règle tout de suite
      let paiement = null;
      if (aRegler > 0) {
        const caisse = await exigerCaisseOuverte(tx, req.user.id);

        paiement = await tx.paiement.create({
          data: {
            reservation: { connect: { id: reservation.id } },
            montant: aRegler,
            modePaiement,
            reference: reference || null,
            encaissePar: { connect: { id: req.user.id } },
          },
        });

        const ttc = aRegler;
        await tx.facture.create({
          data: {
            numeroFacture: `FACT-${new Date().getFullYear()}-${String(paiement.id).padStart(6, '0')}`,
            montantHT: (ttc / 1.18).toFixed(2),
            tva: (ttc - ttc / 1.18).toFixed(2),
            montantTTC: ttc.toFixed(2),
            paiement: { connect: { id: paiement.id } },
          },
        });

        const nom = `${clientFinal.prenom ?? ''} ${clientFinal.nom ?? ''}`.trim() || clientFinal.telephone;
        await tx.mouvementCaisse.create({
          data: {
            caisse: { connect: { id: caisse.id } },
            type: 'ENTREE',
            montant: ttc,
            motif: `Arrivée directe #${reservation.id} · ${nom} · ${modePaiement}`,
            creePar: { connect: { id: req.user.id } },
          },
        });
      }

      const nomClient = `${clientFinal.prenom ?? ''} ${clientFinal.nom ?? ''}`.trim() || clientFinal.telephone;

      await tracer(tx, req, {
        action: 'ARRIVEE_DIRECTE',
        cibleType: 'reservation',
        cibleId: reservation.id,
        resume: `Arrivée directe de ${nomClient}, chambre ${chambre.numero}, ${montantTotal} dont ${aRegler} réglé`,
      });

      await notifier(tx, {
        type: 'CLIENT_ARRIVE',
        titre: 'Un client vient d\'arriver',
        message: `${nomClient} occupe la chambre ${chambre.numero} depuis maintenant.`,
        lien: '/reservations',
        roleCible: ADMIN,
      });

      return { reservation, sejour, paiement, resteAPayer: Math.max(0, montantTotal - aRegler) };
    });

    res.status(201).json(resultat);
  } catch (error) {
    if (error.statut) return res.status(error.statut).json({ message: error.message });
    console.error(error);
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
}

// ============================================================
// PATCH /api/reservations/:id
// ============================================================

export async function modifierReservation(req, res) {
  try {
    const { id } = req.params;
    const { dateArrivee, dateDepart, statut } = req.body;

    const reservationExistante = await prisma.reservation.findUnique({
      where: { id: Number(id) },
      include: { chambre: { include: { typeChambre: true } } },
    });

    if (!reservationExistante) {
      return res.status(404).json({ message: 'Réservation non trouvée' });
    }

    if (['ANNULEE', 'TERMINEE'].includes(reservationExistante.statut) && (dateArrivee || dateDepart)) {
      return res.status(400).json({ message: 'Impossible de modifier les dates d\'une réservation annulée ou terminée' });
    }

    const nouvelleArrivee = dateArrivee || reservationExistante.dateArrivee;
    const nouveauDepart = dateDepart || reservationExistante.dateDepart;

    let dataAMettreAJour = {};

    if (dateArrivee || dateDepart) {
      const erreurDates = validerDatesReservation(
        nouvelleArrivee, nouveauDepart, reservationExistante.modeTarification,
      );
      if (erreurDates) return res.status(400).json({ message: erreurDates });

      const disponible = await chambreEstDisponible(
        prisma,
        reservationExistante.chambreId,
        nouvelleArrivee,
        nouveauDepart,
        id
      );

      if (!disponible) {
        return res.status(409).json({ message: 'La chambre n\'est pas disponible sur ces nouvelles dates' });
      }

      if (reservationExistante.modeTarification === 'NUITEE') {
        const nombreNuits = calculerNombreNuits(nouvelleArrivee, nouveauDepart);
        const montantTotal = nombreNuits * Number(reservationExistante.chambre.typeChambre.prixParNuit);
        dataAMettreAJour = {
          dateArrivee: new Date(nouvelleArrivee),
          dateDepart: new Date(nouveauDepart),
          nombreNuits,
          montantTotal,
        };
      } else {
        // En mode horaire, on ne recalcule pas automatiquement le montant ici,
        // les heures supplémentaires passent par leur propre endpoint dédié (Chapitre 54)
        dataAMettreAJour = {
          dateArrivee: new Date(nouvelleArrivee),
          dateDepart: new Date(nouveauDepart),
        };
      }
    }

    if (statut) {
      dataAMettreAJour.statut = statut;
    }

    const reservation = await prisma.reservation.update({
      where: { id: Number(id) },
      data: dataAMettreAJour,
      include: { client: true, chambre: { include: { typeChambre: true } } },
    });

    res.json(reservation);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
}

// ============================================================
// PATCH /api/reservations/:id/annuler
// ============================================================

export async function annulerReservation(req, res) {
  try {
    const { id } = req.params;

    const reservation = await prisma.reservation.findUnique({
      where: { id: Number(id) },
      include: { paiements: true, sejour: true },
    });

    if (!reservation) {
      return res.status(404).json({ message: 'Réservation non trouvée' });
    }

    if (reservation.statut === 'ANNULEE') {
      return res.status(400).json({ message: 'Cette réservation est déjà annulée' });
    }

    if (reservation.statut === 'TERMINEE') {
      return res.status(400).json({ message: 'Impossible d\'annuler une réservation déjà terminée' });
    }

    // Un séjour en cours signifie que le client est physiquement dans la chambre.
    // On refuse plutôt que d'annuler en laissant la chambre occupée pour l'éternité :
    // le check-out doit être fait d'abord, il clôture le séjour et libère la chambre.
    if (reservation.sejour && !reservation.sejour.dateSortie) {
      return res.status(409).json({
        message: 'Le client est encore dans la chambre. Faites le check-out avant d\'annuler cette réservation.',
      });
    }

    const reservationAnnulee = await prisma.$transaction(async (tx) => {
      const maj = await tx.reservation.update({
        where: { id: Number(id) },
        data: { statut: 'ANNULEE' },
      });

      // Si la chambre n'était retenue que pour cette réservation, elle se libère
      const chambre = await tx.chambre.findUnique({ where: { id: reservation.chambreId } });
      if (chambre?.etat === 'RESERVEE') {
        const autre = await tx.reservation.findFirst({
          where: {
            chambreId: reservation.chambreId,
            statut: { in: ['CONFIRMEE', 'EN_COURS'] },
            id: { not: reservation.id },
          },
        });
        if (!autre) {
          await tx.chambre.update({ where: { id: reservation.chambreId }, data: { etat: 'DISPONIBLE' } });
        }
      }

      await tracer(tx, req, {
        action: 'RESERVATION_ANNULEE',
        cibleType: 'reservation',
        cibleId: maj.id,
        resume: `Réservation #${maj.id} annulée`,
        avant: reservation.statut,
        apres: 'ANNULEE',
      });

      return maj;
    });

    const aDesPaiements = reservation.paiements.length > 0;

    res.json({
      reservation: reservationAnnulee,
      remboursementRequis: aDesPaiements,
      message: aDesPaiements
        ? `${reservation.paiements.length} paiement(s) associé(s), remboursement à traiter (voir module Paiements)`
        : 'Aucun paiement associé, aucune action supplémentaire requise',
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
}

// ============================================================
// PATCH /api/reservations/:id/confirmer
// Confirmer une réservation sans exiger le paiement intégral (réservation
// téléphonique, acompte, client de confiance). Le reste dû reste visible.
// ============================================================

export async function confirmerReservation(req, res) {
  try {
    const { id } = req.params;

    const reservation = await prisma.reservation.findUnique({
      where: { id: Number(id) },
      include: { paiements: true },
    });

    if (!reservation) return res.status(404).json({ message: 'Réservation non trouvée' });

    if (reservation.statut !== 'EN_ATTENTE') {
      return res.status(400).json({
        message: `Seule une réservation en attente peut être confirmée (statut actuel : ${reservation.statut})`,
      });
    }

    const reservationConfirmee = await prisma.$transaction(async (tx) => {
      const maj = await tx.reservation.update({
        where: { id: Number(id) },
        data: { statut: 'CONFIRMEE' },
        include: { client: true, chambre: { include: { typeChambre: true } }, paiements: true },
      });

      // La chambre passe en RESERVEE : elle est promise, sans être encore occupée.
      // On ne touche pas à une chambre déjà occupée ou en travaux.
      if (maj.chambre?.etat === 'DISPONIBLE') {
        await tx.chambre.update({ where: { id: maj.chambreId }, data: { etat: 'RESERVEE' } });
      }

      await tracer(tx, req, {
        action: 'RESERVATION_CONFIRMEE',
        cibleType: 'reservation',
        cibleId: maj.id,
        resume: `Réservation #${maj.id} confirmée (chambre ${maj.chambre?.numero ?? '?'})`,
        avant: 'EN_ATTENTE',
        apres: 'CONFIRMEE',
      });

      return maj;
    });

    res.json({ ...reservationConfirmee, ...calculerSoldeReservation(reservationConfirmee) });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
}

// ============================================================
// DELETE /api/reservations/:id : suppression définitive
// ============================================================

export async function deleteReservation(req, res) {
  try {
    const { id } = req.params;

    const reservation = await prisma.reservation.findUnique({
      where: { id: Number(id) },
      include: { paiements: true, sejour: true },
    });

    if (!reservation) return res.status(404).json({ message: 'Réservation non trouvée' });

    const paiementsActifs = reservation.paiements.filter((p) => !p.rembourse);
    if (paiementsActifs.length > 0) {
      return res.status(409).json({
        message: `Impossible de supprimer : ${paiementsActifs.length} paiement(s) actif(s) non remboursé(s). Remboursez-les d'abord.`,
      });
    }

    if (reservation.sejour && !reservation.sejour.dateSortie) {
      return res.status(409).json({
        message: 'Le client est encore dans la chambre. Faites le check-out avant de supprimer cette réservation.',
      });
    }

    await prisma.$transaction(async (tx) => {
      const paiementIds = reservation.paiements.map((p) => p.id);
      if (paiementIds.length > 0) {
        await tx.facture.deleteMany({ where: { paiementId: { in: paiementIds } } });
        await tx.paiement.deleteMany({ where: { reservationId: Number(id) } });
      }
      // Le séjour et ses lignes doivent partir avec la réservation : les oublier
      // laissait des séjours orphelins pointant vers une réservation inexistante.
      if (reservation.sejour) {
        await tx.consommation.deleteMany({ where: { sejourId: reservation.sejour.id } });
        await tx.heureSupplementaire.deleteMany({ where: { sejourId: reservation.sejour.id } });
        await tx.sejour.delete({ where: { id: reservation.sejour.id } });
      }
      await tx.reservation.delete({ where: { id: Number(id) } });
    });

    res.status(204).send();
  } catch (error) {
    if (error.code === 'P2025') return res.status(404).json({ message: 'Réservation non trouvée' });
    console.error(error);
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
}

// ============================================================
// DELETE /api/reservations/annulees : nettoyage en masse
// ============================================================

export async function supprimerReservationsAnnulees(req, res) {
  try {
    const candidates = await prisma.reservation.findMany({
      where: { statut: 'ANNULEE' },
      include: { paiements: true, sejour: true },
    });

    // On écarte aussi les réservations dont le séjour est encore ouvert : le client
    // serait toujours dans la chambre.
    const supprimables = candidates.filter(
      (r) => r.paiements.every((p) => p.rembourse) && !(r.sejour && !r.sejour.dateSortie)
    );
    const ignorees = candidates.length - supprimables.length;
    const ids = supprimables.map((r) => r.id);

    const nombreSupprimees = await prisma.$transaction(async (tx) => {
      const paiementIds = supprimables.flatMap((r) => r.paiements.map((p) => p.id));
      if (paiementIds.length > 0) {
        await tx.facture.deleteMany({ where: { paiementId: { in: paiementIds } } });
        await tx.paiement.deleteMany({ where: { reservationId: { in: ids } } });
      }
      const sejourIds = supprimables.filter((r) => r.sejour).map((r) => r.sejour.id);
      if (sejourIds.length > 0) {
        await tx.consommation.deleteMany({ where: { sejourId: { in: sejourIds } } });
        await tx.heureSupplementaire.deleteMany({ where: { sejourId: { in: sejourIds } } });
        await tx.sejour.deleteMany({ where: { id: { in: sejourIds } } });
      }
      const { count } = await tx.reservation.deleteMany({ where: { id: { in: ids } } });
      return count;
    });

    res.json({
      message: `${nombreSupprimees} réservation(s) annulée(s) supprimée(s)` + (ignorees > 0 ? `, ${ignorees} ignorée(s) (paiement non remboursé)` : ''),
      count: nombreSupprimees,
      ignorees,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
}