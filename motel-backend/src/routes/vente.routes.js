import { Router } from 'express';
import { verifierToken, autoriserRoles } from '../middlewares/auth.middleware.js';
import { creerVente, getVentes } from '../controllers/vente.controller.js';

const router = Router();

router.use(verifierToken, autoriserRoles('Administrateur', 'Barman'));

router.post('/', creerVente);
router.get('/', getVentes);

export default router;