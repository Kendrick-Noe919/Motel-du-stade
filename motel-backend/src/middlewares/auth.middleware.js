import jwt from 'jsonwebtoken';

// Vérifie que le token est valide et attache les infos utilisateur à req.user
export function verifierToken(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Token manquant' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // disponible dans tous les controllers suivants
    next();
  } catch (error) {
    return res.status(401).json({ message: 'Token invalide ou expiré' });
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