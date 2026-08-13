import { Router } from 'express';
import { verifierToken, autoriserRoles } from '../middlewares/auth.middleware.js';
import { checkIn, checkOut, getSejourParReservation } from '../controllers/sejour.controller.js';
import { ajouterConsommation } from '../controllers/service.controller.js';
import { ajouterHeuresSupplementaires, getHeuresSupplementaires } from '../controllers/sejour.controller.js';

const router = Router();
const rolesAutorises = ['Administrateur', 'Manager', 'Receptionniste'];

router.use(verifierToken, autoriserRoles(...rolesAutorises));

router.post('/check-in', checkIn);
router.patch('/:id/check-out', checkOut);
router.get('/reservation/:reservationId', getSejourParReservation);
router.post('/:sejourId/consommations', ajouterConsommation);
router.post('/:id/heures-supplementaires', ajouterHeuresSupplementaires);
router.get('/:id/heures-supplementaires', getHeuresSupplementaires);
export default router;