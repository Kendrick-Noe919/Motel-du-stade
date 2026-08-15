import { Router } from 'express';
import { verifierToken, autoriserRoles } from '../middlewares/auth.middleware.js';
import { ADMIN } from '../config/roles.js';
import {
  getParametres, modifierParametre, getReglagesNotifications, basculerNotification,
} from '../controllers/parametre.controller.js';

const router = Router();

router.use(verifierToken, autoriserRoles(ADMIN));

// Déclarées avant /:cle, sinon « notifications » serait pris pour une clé de paramètre.
router.get('/notifications', getReglagesNotifications);
router.patch('/notifications/:type', basculerNotification);

router.get('/', getParametres);
router.patch('/:cle', modifierParametre);

export default router;
