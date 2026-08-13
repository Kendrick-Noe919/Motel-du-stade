import { Router } from 'express';
import { verifierToken, autoriserRoles } from '../middlewares/auth.middleware.js';
import {
  ouvrirCaisse,
  enregistrerMouvement,
  consulterSolde,
  fermerCaisse,
  getCaissesParUtilisateur,
} from '../controllers/caisse.controller.js';

const router = Router();

// Toutes les routes de ce fichier exigent d'être connecté ET d'avoir l'un de ces rôles
router.use(verifierToken, autoriserRoles('Administrateur', 'Caissier', 'Barman'));

router.post('/ouvrir', ouvrirCaisse);
router.post('/:id/mouvements', enregistrerMouvement);
router.get('/:id/solde', consulterSolde);
router.patch('/:id/fermer', fermerCaisse);
router.get('/utilisateur/:utilisateurId', getCaissesParUtilisateur);

export default router;