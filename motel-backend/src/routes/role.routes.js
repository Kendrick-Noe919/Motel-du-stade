import { Router } from 'express';
import { verifierToken, autoriserRoles } from '../middlewares/auth.middleware.js';
import { ADMIN } from '../config/roles.js';
import { getAllRoles, createRole, deleteRole } from '../controllers/role.controller.js';

const router = Router();

router.get('/', verifierToken, getAllRoles); // lecture libre au personnel connecté
router.post('/', verifierToken, autoriserRoles(ADMIN), createRole);
router.delete('/:id', verifierToken, autoriserRoles(ADMIN), deleteRole);

export default router;
