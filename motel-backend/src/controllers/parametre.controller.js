import prisma from '../utils/prisma.js';
import { tracer } from '../utils/journal.js';
import { TYPES_NOTIFICATION, clefParametre } from '../config/notifications.js';

// GET /api/parametres/notifications
//
// L'état de chaque type, construit à partir du catalogue plutôt que de la base :
// un type ajouté au code apparaît immédiatement dans l'écran, sans migration ni
// insertion préalable. La base ne stocke que les écarts au défaut.
export async function getReglagesNotifications(req, res) {
  try {
    const enregistres = await prisma.parametre.findMany({
      where: { cle: { startsWith: 'NOTIF_' } },
    });
    const parCle = new Map(enregistres.map((p) => [p.cle, p.valeur]));

    const reglages = Object.entries(TYPES_NOTIFICATION).map(([type, definition]) => {
      const valeur = parCle.get(clefParametre(type));
      return {
        type,
        libelle: definition.libelle,
        groupe: definition.groupe,
        destinataires: definition.destinataires,
        actif: valeur === undefined ? definition.parDefaut : valeur !== 'false',
        parDefaut: definition.parDefaut,
      };
    });

    res.json(reglages);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
}

// PATCH /api/parametres/notifications/:type, body: { actif }
export async function basculerNotification(req, res) {
  try {
    const { type } = req.params;
    const { actif } = req.body;

    const definition = TYPES_NOTIFICATION[type];
    if (!definition) return res.status(404).json({ message: 'Type de notification inconnu' });
    if (typeof actif !== 'boolean') {
      return res.status(400).json({ message: 'actif doit valoir true ou false' });
    }

    const cle = clefParametre(type);

    await prisma.$transaction(async (tx) => {
      // upsert : le paramètre n'existe qu'à partir du moment où l'administrateur
      // s'écarte du réglage d'origine.
      await tx.parametre.upsert({
        where: { cle },
        update: { valeur: String(actif) },
        create: {
          cle,
          valeur: String(actif),
          libelle: `Notification — ${definition.libelle}`,
          unite: null,
        },
      });

      await tracer(tx, req, {
        action: 'NOTIFICATION_REGLEE',
        cibleType: 'parametre',
        resume: `Notification « ${definition.libelle} » ${actif ? 'activée' : 'désactivée'}`,
        avant: String(!actif),
        apres: String(actif),
      });
    });

    res.json({ type, actif });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
}

// GET /api/parametres
export async function getParametres(req, res) {
  try {
    res.json(await prisma.parametre.findMany({ orderBy: { cle: 'asc' } }));
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
}

// PATCH /api/parametres/:cle
// Les paramètres sont créés par migration : on modifie une valeur, on n'en invente pas.
export async function modifierParametre(req, res) {
  try {
    const { cle } = req.params;
    const { valeur } = req.body;

    const existant = await prisma.parametre.findUnique({ where: { cle } });
    if (!existant) return res.status(404).json({ message: 'Paramètre inconnu' });

    const nombre = Number(valeur);
    if (!Number.isFinite(nombre) || nombre < 0) {
      return res.status(400).json({ message: 'La valeur doit être un nombre positif ou nul' });
    }
    if (existant.unite === 'heures' && nombre > 720) {
      return res.status(400).json({ message: 'Un délai supérieur à 720 heures (30 jours) n\'a pas de sens' });
    }

    const parametre = await prisma.$transaction(async (tx) => {
      const maj = await tx.parametre.update({ where: { cle }, data: { valeur: String(nombre) } });
      await tracer(tx, req, {
        action: 'PARAMETRE_MODIFIE',
        cibleType: 'parametre',
        resume: `${maj.libelle} : ${existant.valeur} vers ${maj.valeur} ${maj.unite ?? ''}`.trim(),
        avant: existant.valeur,
        apres: maj.valeur,
      });
      return maj;
    });

    res.json(parametre);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
}
