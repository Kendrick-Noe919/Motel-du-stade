import { Router } from 'express';
import { verifierToken, autoriserRoles } from '../middlewares/auth.middleware.js';
import { TIENT_UNE_CAISSE, CONTROLE } from '../config/roles.js';
import {
  ouvrirCaisse,
  enregistrerMouvement,
  consulterSolde,
  fermerCaisse,
  getCaissesParUtilisateur,
  getCaissesOuvertes,
  getRapportJournee,
} from '../controllers/caisse.controller.js';

const router = Router();

// Tout rôle qui manipule de l'argent doit pouvoir ouvrir et fermer sa caisse.
// La standardiste et le barman encaissent chacun de leur côté : les exclure d'ici
// revenait à leur créer des caisses fantômes qu'ils ne pouvaient jamais clôturer.
router.use(verifierToken, autoriserRoles(...TIENT_UNE_CAISSE));

// Contrôle : le caissier récupère en fin de journée la caisse du poste et celle du bar
// et rapproche les montants. Lecture seule sur les caisses des autres.
router.get('/', autoriserRoles(...CONTROLE), getCaissesOuvertes);
router.get('/rapport-journee', autoriserRoles(...CONTROLE), getRapportJournee);

router.post('/ouvrir', ouvrirCaisse);
router.post('/:id/mouvements', enregistrerMouvement);
router.get('/:id/solde', consulterSolde);
router.patch('/:id/fermer', fermerCaisse);
router.get('/utilisateur/:utilisateurId', getCaissesParUtilisateur);

export default router;
