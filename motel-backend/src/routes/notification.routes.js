import { Router } from 'express';
import { verifierToken } from '../middlewares/auth.middleware.js';
import { getNotifications, marquerLue, marquerToutesLues } from '../controllers/notification.controller.js';

const router = Router();

// Chacun ne voit que ce qui lui est adressé : le filtrage se fait dans le contrôleur,
// à partir des rôles du jeton.
router.use(verifierToken);

router.get('/', getNotifications);
router.patch('/toutes-lues', marquerToutesLues);
router.patch('/:id/lue', marquerLue);

export default router;
