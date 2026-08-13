import { Router } from 'express';
import { verifierToken, autoriserRoles } from '../middlewares/auth.middleware.js';
import { getAllServices, createService, updateService, deleteService, supprimerConsommation } from '../controllers/service.controller.js';

const router = Router();

router.get('/', verifierToken, getAllServices);
router.post('/', verifierToken, autoriserRoles('Administrateur', 'Barman'), createService);
router.patch('/:id', verifierToken, autoriserRoles('Administrateur', 'Barman'), updateService);
router.delete('/:id', verifierToken, autoriserRoles('Administrateur', 'Barman'), deleteService);
router.delete('/consommations/:id', verifierToken, autoriserRoles('Administrateur', 'Manager', 'Receptionniste'), supprimerConsommation);

export default router;