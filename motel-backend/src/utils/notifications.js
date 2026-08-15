import prisma from './prisma.js';
import { TYPES_NOTIFICATION, clefParametre } from '../config/notifications.js';

// Crée une notification à partir du catalogue.
//
// L'appelant ne dit plus QUI doit être prévenu : il annonce ce qui vient de se
// passer, et le catalogue décide des destinataires. Un contrôleur qui se trompait
// de rôle envoyait la notification dans le vide, sans que rien ne le signale.
//
// Deux garde-fous conservés du code d'origine :
//   - une notification ne doit jamais faire échouer l'opération métier ;
//   - le type peut être coupé depuis l'écran Paramètres.
//
// `roleCible` reste accepté pour forcer un destinataire hors catalogue.
export async function notifier(client, { type, titre, message, lien, roleCible, utilisateurCibleId }) {
  try {
    const definition = TYPES_NOTIFICATION[type];

    // Un type inconnu du catalogue est une erreur de programmation : on le laisse
    // passer pour ne pas perdre l'information, mais on le signale.
    if (!definition && !roleCible && !utilisateurCibleId) {
      console.error(`Notification : type « ${type} » absent du catalogue, aucun destinataire.`);
      return;
    }

    if (definition && !(await typeActif(type, definition))) return;

    // Une ligne par destinataire : le modèle ne porte qu'un rôle, et la lecture par
    // un poste ne doit pas effacer la notification d'un autre.
    const cibles = roleCible
      ? [roleCible]
      : (definition?.destinataires ?? []);

    if (utilisateurCibleId) {
      await client.notification.create({
        data: { type, titre, message, lien: lien ?? null, roleCible: null, utilisateurCibleId },
      });
      return;
    }

    for (const cible of cibles) {
      await client.notification.create({
        data: { type, titre, message, lien: lien ?? null, roleCible: cible, utilisateurCibleId: null },
      });
    }
  } catch (erreur) {
    console.error('Notification : écriture impossible', erreur.message);
  }
}

// Le type est-il allumé ? Lu dans les paramètres, avec la valeur du catalogue en
// repli si l'administrateur n'y a jamais touché.
async function typeActif(type, definition) {
  const parametre = await prisma.parametre.findUnique({ where: { cle: clefParametre(type) } });
  if (!parametre) return definition.parDefaut;
  return parametre.valeur !== 'false';
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
