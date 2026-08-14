import jwt from 'jsonwebtoken';
import prisma from '../utils/prisma.js';
import { CONTROLE } from '../config/roles.js';

// Vérifie que le token est valide et attache les infos utilisateur à req.user.
//
// Pour le personnel, les rôles sont RELUS EN BASE à chaque requête plutôt que d'être
// repris du token. Sans cela, retirer un rôle ou désactiver un compte n'aurait aucun
// effet tant que le jeton n'a pas expiré : l'employé continuerait de travailler avec
// son onglet déjà ouvert.
export async function verifierToken(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Token manquant' });
  }

  const token = authHeader.split(' ')[1];

  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    return res.status(401).json({ message: 'Token invalide ou expiré' });
  }

  if (decoded.type !== 'utilisateur') {
    req.user = decoded; // jeton client (réservation en ligne) : rien à revalider ici
    return next();
  }

  try {
    const utilisateur = await prisma.utilisateur.findUnique({
      where: { id: decoded.id },
      include: { roles: { include: { role: true } } },
    });

    if (!utilisateur || !utilisateur.actif) {
      return res.status(401).json({ message: 'Compte introuvable ou désactivé' });
    }

    req.user = {
      id: utilisateur.id,
      email: utilisateur.email,
      nomComplet: `${utilisateur.prenom} ${utilisateur.nom}`,
      type: 'utilisateur',
      roles: utilisateur.roles.map((r) => r.role.code),
    };
    next();
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
}

// Vérifie que l'utilisateur a AU MOINS UN des rôles autorisés
export function autoriserRoles(...rolesAutorises) {
  return (req, res, next) => {
    if (req.user.type !== 'utilisateur') {
      return res.status(403).json({ message: 'Accès réservé au personnel' });
    }

    const aUnRoleAutorise = req.user.roles.some((r) => rolesAutorises.includes(r));
    if (!aUnRoleAutorise) {
      return res.status(403).json({
        message: `Accès refusé. Rôle requis parmi : ${rolesAutorises.join(', ')}`,
      });
    }

    next();
  };
}

// Raccourci : l'administrateur et le caissier contrôlent l'ensemble des caisses et
// des recettes. Les autres ne voient que leurs propres données.
export function estSuperviseur(req) {
  return req.user?.roles?.some((r) => CONTROLE.includes(r)) ?? false;
}
