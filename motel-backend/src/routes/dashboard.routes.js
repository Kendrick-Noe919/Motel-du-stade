import { Router } from 'express';
import { verifierToken, autoriserRoles } from '../middlewares/auth.middleware.js';
import { ACCUEIL, CONTROLE } from '../config/roles.js';
import { getDashboard, getRecettes } from '../controllers/dashboard.controller.js';

const router = Router();

router.use(verifierToken);

// La standardiste pilote l'établissement au quotidien, elle a besoin des indicateurs
router.get('/', autoriserRoles(...ACCUEIL), getDashboard);

// Recettes détaillées : administrateur et caissier (contrôle de fin de journée)
router.get('/recettes', autoriserRoles(...CONTROLE), getRecettes);

export default router;
