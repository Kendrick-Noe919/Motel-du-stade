import { Router } from 'express';
import { verifierToken, autoriserRoles } from '../middlewares/auth.middleware.js';
import { ADMIN } from '../config/roles.js';
import { getJournal, getFiltresJournal } from '../controllers/journal.controller.js';

const router = Router();

// L'historique révèle qui a fait quoi dans tout l'établissement : administrateur seul.
router.use(verifierToken, autoriserRoles(ADMIN));

router.get('/filtres', getFiltresJournal);
router.get('/', getJournal);

export default router;
