import prisma from '../utils/prisma.js';
import { lireParametreNombre, RETENTION_NOTIFICATIONS } from '../utils/parametres.js';

// Les notifications ne se périmaient jamais.
//
// Rien ne les supprimait : la cloche accumulait tout depuis la première mise en
// service, et une barre de défilement ne règle pas le problème — au bout de
// quelques mois, la notification utile est noyée sous des centaines d'anciennes.
//
// Une notification est un signal, pas une archive. Ce qui doit rester consultable
// vit dans le journal des opérations, qui n'est jamais purgé, lui.
const INTERVALLE_MS = 60 * 60 * 1000; // un passage par heure suffit

export async function purgerAnciennesNotifications() {
  const heures = await lireParametreNombre(RETENTION_NOTIFICATIONS);

  // 0 = conservation illimitée, pour qui préfère tout garder.
  if (heures <= 0) return { supprimees: 0, desactive: true };

  const limite = new Date(Date.now() - heures * 3600000);
  const { count } = await prisma.notification.deleteMany({
    where: { dateCreation: { lt: limite } },
  });

  if (count > 0) {
    console.log(`Purge des notifications : ${count} supprimée(s) (plus de ${heures} h)`);
  }
  return { supprimees: count };
}

export function demarrerPurgeNotifications() {
  // Un passage au démarrage rattrape ce qui s'est accumulé pendant l'arrêt.
  purgerAnciennesNotifications().catch((e) => console.error('Purge des notifications :', e.message));

  const minuteur = setInterval(
    () => purgerAnciennesNotifications().catch((e) => console.error('Purge des notifications :', e.message)),
    INTERVALLE_MS,
  );
  minuteur.unref?.(); // n'empêche pas le processus de s'arrêter proprement
  return minuteur;
}
