import { Router } from 'express';
import { verifierToken, autoriserRoles } from '../middlewares/auth.middleware.js';
import { ADMIN, ACCUEIL } from '../config/roles.js';
import { getAllServices, createService, updateService, deleteService, supprimerConsommation } from '../controllers/service.controller.js';

const router = Router();

router.use(verifierToken);

// Le menu est consultable par tout le personnel : le barman vend, la standardiste
// facture les consommations au séjour.
router.get('/', getAllServices);

// Le menu et les prix relèvent de la direction : le barman vend ce qui est au menu,
// il ne décide pas de ce qui y figure ni à quel prix.
router.post('/', autoriserRoles(ADMIN), createService);
router.patch('/:id', autoriserRoles(ADMIN), updateService);
router.delete('/:id', autoriserRoles(ADMIN), deleteService);

router.delete('/consommations/:id', autoriserRoles(...ACCUEIL), supprimerConsommation);

export default router;
