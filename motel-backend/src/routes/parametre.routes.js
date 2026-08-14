import { Router } from 'express';
import { verifierToken, autoriserRoles } from '../middlewares/auth.middleware.js';
import { ADMIN } from '../config/roles.js';
import { getParametres, modifierParametre } from '../controllers/parametre.controller.js';

const router = Router();

router.use(verifierToken, autoriserRoles(ADMIN));

router.get('/', getParametres);
router.patch('/:cle', modifierParametre);

export default router;
