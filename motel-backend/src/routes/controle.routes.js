import { Router } from 'express';
import { verifierJetonSysteme } from '../middlewares/licence.middleware.js';
import {
  connexionControle, statutPublic, lireEtat, basculerEtat,
} from '../controllers/controle.controller.js';

const router = Router();

// Public : le frontend s'en sert pour choisir entre l'application et la page de blocage.
router.get('/statut', statutPublic);

// Console privée : connexion, puis lecture et bascule de l'interrupteur.
router.post('/acces', connexionControle);
router.get('/etat', verifierJetonSysteme, lireEtat);
router.post('/basculer', verifierJetonSysteme, basculerEtat);

export default router;
