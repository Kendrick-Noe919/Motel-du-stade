import prisma from './prisma.js';

// Crée une notification adressée soit à tout un poste (roleCible), soit à une
// personne précise. Comme le journal, elle ne doit jamais faire échouer l'opération
// métier qui la déclenche.
export async function notifier(client, { type, titre, message, lien, roleCible, utilisateurCibleId }) {
  try {
    await client.notification.create({
      data: {
        type,
        titre,
        message,
        lien: lien ?? null,
        roleCible: roleCible ?? null,
        utilisateurCibleId: utilisateurCibleId ?? null,
      },
    });
  } catch (erreur) {
    console.error('Notification : écriture impossible', erreur.message);
  }
}

// Ce que l'utilisateur courant doit voir : ce qui vise l'un de ses rôles, ou lui-même.
export function filtreDestinataire(req) {
  return {
    OR: [
      { roleCible: { in: req.user.roles } },
      { utilisateurCibleId: req.user.id },
    ],
  };
}
