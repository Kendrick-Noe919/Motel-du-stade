import { Router } from 'express';
import { verifierToken, autoriserRoles } from '../middlewares/auth.middleware.js';
import { getDashboard } from '../controllers/dashboard.controller.js';

const router = Router();

router.get('/', verifierToken, autoriserRoles('Manager', 'Administrateur'), getDashboard);

export default router;