import { Router } from 'express';
import { verifierToken, autoriserRoles } from '../middlewares/auth.middleware.js';
import { ADMIN } from '../config/roles.js';
import {
  createUtilisateur, getAllUtilisateurs, modifierUtilisateur, attribuerRole, retirerRole,
  archiverUtilisateur, supprimerUtilisateur, verifierSuppression,
} from '../controllers/utilisateur.controller.js';

const router = Router();
router.use(verifierToken, autoriserRoles(ADMIN));

router.get('/', getAllUtilisateurs);
router.post('/', createUtilisateur);
router.patch('/:id', modifierUtilisateur);
router.post('/:id/roles', attribuerRole);
router.delete('/:id/roles/:roleId', retirerRole);

// Archiver puis supprimer.
//
// La suppression reste refusée aux comptes qui ont tenu une caisse ou vendu au bar :
// ces enregistrements exigent un utilisateur, et les effacer supprimerait des recettes
// réelles. Pour tous les autres — comptes d'essai, personnel parti sans avoir manipulé
// d'argent — la suppression évite d'accumuler des archives sans fin.
router.get('/:id/archive', archiverUtilisateur);
router.get('/:id/suppression-possible', verifierSuppression);
router.delete('/:id', supprimerUtilisateur);

export default router;
