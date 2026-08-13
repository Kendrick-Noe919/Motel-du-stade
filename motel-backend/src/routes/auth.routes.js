import { Router } from 'express';
import { verifierToken } from '../middlewares/auth.middleware.js';
import { connexionUtilisateur, connexionClient, getMonProfil, modifierMonProfil, changerMotDePasse } from '../controllers/auth.controller.js';

const router = Router();
router.post('/connexion', connexionUtilisateur);
router.post('/connexion-client', connexionClient);
router.get('/moi', verifierToken, getMonProfil);
router.patch('/moi', verifierToken, modifierMonProfil);
router.patch('/moi/mot-de-passe', verifierToken, changerMotDePasse);

export default router;