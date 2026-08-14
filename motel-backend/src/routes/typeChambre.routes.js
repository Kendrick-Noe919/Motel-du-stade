import { Router } from 'express';
import { verifierToken, autoriserRoles } from '../middlewares/auth.middleware.js';
import { ADMIN } from '../config/roles.js';
import {
  getAllTypesChambre,
  createTypeChambre,
  updateTypeChambre,
  deleteTypeChambre,
} from '../controllers/typeChambre.controller.js';

const router = Router();

router.use(verifierToken);

// Lecture ouverte au personnel connecté : le formulaire des chambres et l'écran des
// réservations ont besoin des libellés et des tarifs.
router.get('/', getAllTypesChambre);

// La tarification est une décision de gestion : administrateur uniquement
router.post('/', autoriserRoles(ADMIN), createTypeChambre);
router.patch('/:id', autoriserRoles(ADMIN), updateTypeChambre);
router.delete('/:id', autoriserRoles(ADMIN), deleteTypeChambre);

export default router;
