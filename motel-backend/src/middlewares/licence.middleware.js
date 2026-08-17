import jwt from 'jsonwebtoken';
import { lireEtatSysteme } from '../utils/etatSysteme.js';

// ---------- La barrière ----------
// Placée AVANT les routes métier dans server.js. Quand l'application est suspendue,
// toute requête métier est refusée avec un signal que le frontend sait reconnaître
// pour afficher la page de blocage. Les données ne sont pas touchées : on refuse
// l'accès, on n'efface rien.
//
// La console privée (/api/systeme) n'est jamais barrée : sans quoi, une fois
// suspendu, on ne pourrait plus jamais réactiver.
export function barriereLicence(req, res, next) {
  const { actif, message } = lireEtatSysteme();
  if (actif) return next();

  return res.status(503).json({
    suspendu: true,
    message: message
      || "Votre période de paiement est arrivée à échéance. Pour continuer à utiliser "
       + "l'application, veuillez procéder au règlement du solde de votre facture. Une fois "
       + "le règlement effectué, l'accès à l'application sera rétabli.",
  });
}

// ---------- Le jeton de la console privée ----------
// Volontairement séparé de l'authentification de l'application : secret distinct,
// type distinct. Compromettre l'un ne donne aucun accès à l'autre, et ce jeton ne
// vaut rien pour piloter le motel — seulement pour l'interrupteur.
export function verifierJetonSysteme(req, res, next) {
  const entete = req.headers.authorization;
  if (!entete || !entete.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Accès refusé' });
  }

  try {
    const decode = jwt.verify(entete.split(' ')[1], process.env.CONTROLE_JWT_SECRET);
    if (decode.type !== 'controle') {
      return res.status(401).json({ message: 'Accès refusé' });
    }
    req.controle = decode;
    next();
  } catch {
    return res.status(401).json({ message: 'Accès refusé' });
  }
}
