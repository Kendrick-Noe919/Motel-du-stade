import { Router } from 'express';
import { verifierToken, autoriserRoles } from '../middlewares/auth.middleware.js';
import { ACCUEIL, ADMIN } from '../config/roles.js';
import { checkIn, checkOut, getSejourParReservation, ajouterHeuresSupplementaires, getHeuresSupplementaires, ajouterNuitsSupplementaires } from '../controllers/sejour.controller.js';
import { ajouterConsommation } from '../controllers/service.controller.js';

const router = Router();

router.use(verifierToken, autoriserRoles(...ACCUEIL));

router.post('/check-in', checkIn);
router.patch('/:id/check-out', checkOut);
router.get('/reservation/:reservationId', getSejourParReservation);

// Les consommations n'entrent plus par la réception : elles naissent au bar, sur
// l'écran du point de vente, et rejoignent la note de la chambre par
// POST /api/ventes/sur-chambre. Une réception qui pouvait aussi les saisir créait
// deux portes d'entrée pour la même recette, sans savoir laquelle faisait foi.
// La route reste ouverte à l'administrateur seul, pour rattraper une erreur.
router.post('/:sejourId/consommations', autoriserRoles(ADMIN), ajouterConsommation);
router.post('/:id/heures-supplementaires', ajouterHeuresSupplementaires);
router.post('/:id/nuits-supplementaires', ajouterNuitsSupplementaires);
router.get('/:id/heures-supplementaires', getHeuresSupplementaires);

export default router;
