import { Router } from 'express';
import { verifierToken, autoriserRoles } from '../middlewares/auth.middleware.js';
import {
  enregistrerPaiement, getAllPaiements, getPaiementsParReservation, rembourserPaiement, genererFacturePDF,
} from '../controllers/paiement.controller.js';

const router = Router();

router.use(verifierToken); // toutes les routes ci-dessous nécessitent d'être connecté

router.get('/', getAllPaiements);
router.get('/reservation/:reservationId', getPaiementsParReservation);
router.get('/:id/facture', genererFacturePDF);
router.post('/', autoriserRoles('Administrateur', 'Manager', 'Receptionniste', 'Caissier'), enregistrerPaiement);
router.patch('/:id/rembourser', autoriserRoles('Administrateur', 'Manager', 'Receptionniste', 'Caissier'), rembourserPaiement);

export default router;