import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import prisma from '../utils/prisma.js';

// ---------- POST /api/auth/connexion ----------
// Connexion pour Utilisateur (staff : réceptionniste, caissier, manager, admin)
export async function connexionUtilisateur(req, res) {
  try {
    const { email, motDePasse } = req.body;

    if (!email || !motDePasse) {
      return res.status(400).json({ message: 'email et motDePasse sont requis' });
    }

    const utilisateur = await prisma.utilisateur.findUnique({
      where: { email },
      include: { roles: { include: { role: true } } },
    });

    // Message volontairement identique dans les deux cas (email inconnu / mdp faux)
    // pour ne pas révéler si un email existe en base — bonne pratique de sécurité
    if (!utilisateur || !utilisateur.actif) {
      return res.status(401).json({ message: 'Identifiants incorrects' });
    }

    const motDePasseValide = await bcrypt.compare(motDePasse, utilisateur.motDePasse);
    if (!motDePasseValide) {
      return res.status(401).json({ message: 'Identifiants incorrects' });
    }

    const roles = utilisateur.roles.map((r) => r.role.libelle);

    const token = jwt.sign(
      { id: utilisateur.id, email: utilisateur.email, type: 'utilisateur', roles },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN }
    );

    res.json({
      token,
      utilisateur: {
        id: utilisateur.id,
        nom: utilisateur.nom,
        prenom: utilisateur.prenom,
        email: utilisateur.email,
        roles,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
}

// ---------- POST /api/auth/connexion-client ----------
// Connexion pour Client (réservation en ligne)
export async function connexionClient(req, res) {
  try {
    const { email, motDePasse } = req.body;

    if (!email || !motDePasse) {
      return res.status(400).json({ message: 'email et motDePasse sont requis' });
    }

    const client = await prisma.client.findUnique({ where: { email } });

    if (!client) {
      return res.status(401).json({ message: 'Identifiants incorrects' });
    }

    const motDePasseValide = await bcrypt.compare(motDePasse, client.motDePasse);
    if (!motDePasseValide) {
      return res.status(401).json({ message: 'Identifiants incorrects' });
    }

    const token = jwt.sign(
      { id: client.id, email: client.email, type: 'client' },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN }
    );

    res.json({
      token,
      client: { id: client.id, nom: client.nom, prenom: client.prenom, email: client.email },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
}
// GET /api/auth/moi
export async function getMonProfil(req, res) {
  try {
    const utilisateur = await prisma.utilisateur.findUnique({
      where: { id: req.user.id },
      select: {
        id: true, nom: true, prenom: true, email: true, telephone: true, actif: true, createdAt: true,
        roles: { select: { role: { select: { id: true, libelle: true } } } },
      },
    });
    if (!utilisateur) return res.status(404).json({ message: 'Utilisateur non trouvé' });
    res.json({ ...utilisateur, roles: utilisateur.roles.map((r) => r.role) });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
}

// PATCH /api/auth/moi — modifie ses propres infos de base (pas email/mot de passe)
export async function modifierMonProfil(req, res) {
  try {
    const { nom, prenom, telephone } = req.body;
    const utilisateur = await prisma.utilisateur.update({
      where: { id: req.user.id },
      data: { nom, prenom, telephone },
      select: { id: true, nom: true, prenom: true, email: true, telephone: true },
    });
    res.json(utilisateur);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
}

// PATCH /api/auth/moi/mot-de-passe
export async function changerMotDePasse(req, res) {
  try {
    const { motDePasseActuel, nouveauMotDePasse } = req.body;

    if (!motDePasseActuel || !nouveauMotDePasse) {
      return res.status(400).json({ message: 'motDePasseActuel et nouveauMotDePasse sont requis' });
    }
    if (nouveauMotDePasse.length < 6) {
      return res.status(400).json({ message: 'Le nouveau mot de passe doit contenir au moins 6 caractères' });
    }

    const utilisateur = await prisma.utilisateur.findUnique({ where: { id: req.user.id } });
    const valide = await bcrypt.compare(motDePasseActuel, utilisateur.motDePasse);
    if (!valide) return res.status(401).json({ message: 'Mot de passe actuel incorrect' });

    const nouveauHash = await bcrypt.hash(nouveauMotDePasse, 10);
    await prisma.utilisateur.update({ where: { id: req.user.id }, data: { motDePasse: nouveauHash } });

    res.json({ message: 'Mot de passe modifié avec succès' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
}