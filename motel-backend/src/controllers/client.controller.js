import bcrypt from 'bcrypt';
import prisma from '../utils/prisma.js';
import { notifier } from '../utils/notifications.js';

// Liste UNIQUE et centrale des champs renvoyés au frontend, jamais le mot de passe
const champsPublics = {
  id: true,
  nom: true,
  prenom: true,
  sexe: true,
  telephone: true,
  email: true,
  adresse: true,
  numeroPiece: true,
  createdAt: true,
};

const SEXES_VALIDES = ['M', 'F'];

// ============================================================
// POST /api/clients/inscription : compte complet (réservation en ligne)
// ============================================================
export async function inscrireClient(req, res) {
  try {
    const { nom, prenom, sexe, telephone, email, motDePasse, adresse, numeroPiece } = req.body;

    if (!telephone) return res.status(400).json({ message: 'telephone est requis' });
    if (!email || !motDePasse) {
      return res.status(400).json({ message: 'email et motDePasse sont requis pour créer un compte' });
    }
    if (motDePasse.length < 6) {
      return res.status(400).json({ message: 'Le mot de passe doit contenir au moins 6 caractères' });
    }

    const motDePasseHash = await bcrypt.hash(motDePasse, 10);
    const sexeFinal = SEXES_VALIDES.includes(sexe) ? sexe : null;

    const client = await prisma.client.create({
      data: { nom, prenom, sexe: sexeFinal, telephone, email, motDePasse: motDePasseHash, adresse, numeroPiece },
      select: champsPublics,
    });

    res.status(201).json(client);
  } catch (error) {
    if (error.code === 'P2002') {
      const champ = error.meta?.target?.includes('telephone') ? 'Ce téléphone' : 'Cet email';
      return res.status(409).json({ message: `${champ} est déjà utilisé` });
    }
    console.error(error);
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
}

// ============================================================
// POST /api/clients/rapide : client de passage, téléphone seul obligatoire
// ============================================================
export async function enregistrerClientRapide(req, res) {
  try {
    const { nom, prenom, sexe, telephone } = req.body;

    if (!telephone) return res.status(400).json({ message: 'telephone est requis' });

    const existant = await prisma.client.findUnique({ where: { telephone }, select: champsPublics });
    if (existant) return res.status(200).json(existant);

    const sexeFinal = SEXES_VALIDES.includes(sexe) ? sexe : null;

    const client = await prisma.client.create({
      data: { nom, prenom, sexe: sexeFinal, telephone },
      select: champsPublics,
    });

    await notifier(prisma, {
      type: 'CLIENT_ENREGISTRE',
      titre: 'Nouveau client enregistré',
      message: `${`${prenom || ''} ${nom || ''}`.trim() || telephone} a été ajouté au fichier clients.`,
      lien: '/clients',
    });

    res.status(201).json(client);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
}

// ============================================================
// GET /api/clients
// ============================================================
export async function getAllClients(req, res) {
  try {
    const clients = await prisma.client.findMany({
      select: champsPublics,
      orderBy: { createdAt: 'desc' },
    });
    res.json(clients);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
}

// ============================================================
// GET /api/clients/recherche?q=xxx
// ============================================================
export async function rechercherClient(req, res) {
  try {
    const { q } = req.query;
    if (!q) return res.status(400).json({ message: 'Paramètre de recherche "q" requis' });

    const clients = await prisma.client.findMany({
      where: {
        OR: [
          { nom: { contains: q } },
          { prenom: { contains: q } },
          { email: { contains: q } },
          { telephone: { contains: q } },
        ],
      },
      select: {
        ...champsPublics,
        // Les séjours réellement venus : ni les annulations ni les non-venues ne
        // font un client fidèle. C'est ce compteur qui déclenche la proposition de
        // remise au moment de la réservation.
        _count: { select: { reservations: { where: { statut: { in: ['EN_COURS', 'TERMINEE'] } } } } },
      },
    });

    res.json(clients.map(({ _count, ...client }) => ({
      ...client,
      nombreSejours: _count.reservations,
    })));
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
}

// ============================================================
// GET /api/clients/:id/historique
// ============================================================
export async function getHistoriqueClient(req, res) {
  try {
    const { id } = req.params;

    const client = await prisma.client.findUnique({
      where: { id: Number(id) },
      select: {
        ...champsPublics,
        reservations: {
          include: { chambre: true },
          orderBy: { dateArrivee: 'desc' },
        },
      },
    });

    if (!client) return res.status(404).json({ message: 'Client non trouvé' });

    res.json(client);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
}

// ============================================================
// PATCH /api/clients/:id : modifie les infos de base (jamais email/mdp)
// ============================================================
export async function updateClient(req, res) {
  try {
    const { id } = req.params;
    const { nom, prenom, sexe, telephone, adresse, numeroPiece } = req.body;

    if (telephone !== undefined && !telephone.trim()) {
      return res.status(400).json({ message: 'Le téléphone est obligatoire et ne peut pas être vide' });
    }

    const data = {};
    if (nom !== undefined) data.nom = nom || null;
    if (prenom !== undefined) data.prenom = prenom || null;
    if (sexe !== undefined) data.sexe = SEXES_VALIDES.includes(sexe) ? sexe : null;
    if (telephone !== undefined) data.telephone = telephone;
    if (adresse !== undefined) data.adresse = adresse || null;
    if (numeroPiece !== undefined) data.numeroPiece = numeroPiece || null;

    const client = await prisma.client.update({
      where: { id: Number(id) },
      data,
      select: champsPublics,
    });

    res.json(client);
  } catch (error) {
    if (error.code === 'P2002') return res.status(409).json({ message: 'Ce téléphone est déjà utilisé par un autre client' });
    if (error.code === 'P2025') return res.status(404).json({ message: 'Client non trouvé' });
    console.error(error);
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
}

// ============================================================
// DELETE /api/clients/:id
// ============================================================
export async function deleteClient(req, res) {
  try {
    const { id } = req.params;

    const nombreReservations = await prisma.reservation.count({ where: { clientId: Number(id) } });
    if (nombreReservations > 0) {
      return res.status(409).json({
        message: `Impossible de supprimer : ce client a ${nombreReservations} réservation(s) associée(s)`,
      });
    }

    await prisma.client.delete({ where: { id: Number(id) } });
    res.status(204).send();
  } catch (error) {
    if (error.code === 'P2025') return res.status(404).json({ message: 'Client non trouvé' });
    console.error(error);
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
}