import prisma from '../utils/prisma.js';
import { filtreDestinataire } from '../utils/notifications.js';

// GET /api/notifications
// Renvoie les notifications qui visent l'un des rôles de l'utilisateur, ou lui-même.
export async function getNotifications(req, res) {
  try {
    const [notifications, nonLues] = await Promise.all([
      prisma.notification.findMany({
        where: filtreDestinataire(req),
        orderBy: { dateCreation: 'desc' },
        take: 40,
      }),
      prisma.notification.count({ where: { ...filtreDestinataire(req), lue: false } }),
    ]);

    res.json({ notifications, nonLues });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
}

// PATCH /api/notifications/:id/lue
export async function marquerLue(req, res) {
  try {
    const { id } = req.params;

    // On ne marque que ce qui nous est adressé
    const notification = await prisma.notification.findFirst({
      where: { id: Number(id), ...filtreDestinataire(req) },
    });
    if (!notification) return res.status(404).json({ message: 'Notification non trouvée' });

    res.json(await prisma.notification.update({
      where: { id: notification.id },
      data: { lue: true, dateLecture: new Date() },
    }));
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
}

// PATCH /api/notifications/toutes-lues
export async function marquerToutesLues(req, res) {
  try {
    const { count } = await prisma.notification.updateMany({
      where: { ...filtreDestinataire(req), lue: false },
      data: { lue: true, dateLecture: new Date() },
    });
    res.json({ marquees: count });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
}
