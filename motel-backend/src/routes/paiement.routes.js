import { Router } from 'express';
import { verifierToken, autoriserRoles } from '../middlewares/auth.middleware.js';
import { ENCAISSEMENT } from '../config/roles.js';
import {
  enregistrerPaiement, getAllPaiements, getPaiementsParReservation, rembourserPaiement, genererFacturePDF,
} from '../controllers/paiement.controller.js';

const router = Router();

// Un paiement expose le nom du client et le montant : le barman n'a pas à y accéder,
// ses propres ventes passent par le module Ventes.
router.use(verifierToken, autoriserRoles(...ENCAISSEMENT));

router.get('/', getAllPaiements);
router.get('/reservation/:reservationId', getPaiementsParReservation);
router.get('/:id/facture', genererFacturePDF);
router.post('/', enregistrerPaiement);
router.patch('/:id/rembourser', rembourserPaiement);

export default router;
