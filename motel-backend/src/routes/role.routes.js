import { Router } from 'express';
import { verifierToken, autoriserRoles } from '../middlewares/auth.middleware.js';
import { getAllRoles, createRole, deleteRole } from '../controllers/role.controller.js';

const router = Router();
router.get('/', getAllRoles); // lecture libre au personnel connecté
router.post('/', verifierToken, autoriserRoles('Administrateur'), createRole);
router.delete('/:id', verifierToken, autoriserRoles('Administrateur'), deleteRole);

export default router;