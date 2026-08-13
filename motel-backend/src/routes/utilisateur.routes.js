import { Router } from 'express';
import { verifierToken, autoriserRoles } from '../middlewares/auth.middleware.js';
import { createUtilisateur, getAllUtilisateurs, modifierUtilisateur, deleteUtilisateur, attribuerRole, retirerRole } from '../controllers/utilisateur.controller.js';


const router = Router();
router.use(verifierToken, autoriserRoles('Administrateur'));


router.get('/', getAllUtilisateurs);
router.post('/', createUtilisateur);
router.patch('/:id', modifierUtilisateur);
router.post('/:id/roles', attribuerRole);
router.delete('/:id/roles/:roleId', retirerRole);
router.delete('/:id', deleteUtilisateur);

export default router;