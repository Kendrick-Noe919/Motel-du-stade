import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { lireEtatSysteme, definirEtatSysteme } from '../utils/etatSysteme.js';

// La console de licence.
//
// Elle ne connaît ni la table Utilisateur, ni les rôles de l'application : c'est un
// dispositif à part. Les identifiants vivent dans les variables d'environnement du
// serveur (CONTROLE_LOGIN, CONTROLE_MDP_HASH), jamais dans la base du client. Le
// mot de passe n'y figure que sous forme d'empreinte bcrypt.

// ---------- POST /api/systeme/acces ----------
export async function connexionControle(req, res) {
  try {
    const { identifiant, motDePasse } = req.body;

    const login = process.env.CONTROLE_LOGIN;
    const hash = process.env.CONTROLE_MDP_HASH;
    const secret = process.env.CONTROLE_JWT_SECRET;

    // Sans configuration côté serveur, la console reste close : pas d'identifiant
    // par défaut, jamais.
    if (!login || !hash || !secret) {
      return res.status(503).json({ message: 'Console non configurée sur ce serveur.' });
    }

    if (!identifiant || !motDePasse) {
      return res.status(400).json({ message: 'Identifiant et mot de passe requis' });
    }

    // On vérifie toujours l'empreinte, même quand l'identifiant est faux, pour ne
    // pas révéler par le temps de réponse lequel des deux champs a échoué.
    const motDePasseValide = await bcrypt.compare(motDePasse, hash);
    if (identifiant !== login || !motDePasseValide) {
      return res.status(401).json({ message: 'Accès refusé' });
    }

    const token = jwt.sign({ type: 'controle' }, secret, { expiresIn: '2h' });
    res.json({ token, etat: lireEtatSysteme() });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
}

// ---------- GET /api/systeme/statut ----------
// Public et minimal : le frontend le lit au chargement pour savoir s'il doit
// afficher l'application ou la page de blocage. Il ne renvoie qu'un booléen et
// l'éventuel message, rien qui expose le fonctionnement de la console.
export function statutPublic(req, res) {
  const { actif, message } = lireEtatSysteme();
  res.json({ actif, message: actif ? null : message });
}

// ---------- GET /api/systeme/etat ---------- (console, jeton requis)
export function lireEtat(req, res) {
  res.json(lireEtatSysteme());
}

// ---------- POST /api/systeme/basculer ---------- (console, jeton requis)
// body : { actif: boolean, message?: string }
export function basculerEtat(req, res) {
  const { actif, message } = req.body;
  if (typeof actif !== 'boolean') {
    return res.status(400).json({ message: 'actif doit valoir true ou false' });
  }

  const etat = definirEtatSysteme(actif, message);
  console.log(`⚙️  Licence : application ${actif ? 'RÉACTIVÉE' : 'SUSPENDUE'} le ${etat.modifieLe}`);
  res.json(etat);
}
