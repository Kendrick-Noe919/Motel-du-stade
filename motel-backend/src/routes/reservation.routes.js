import { Router } from 'express';
import { verifierToken, autoriserRoles } from '../middlewares/auth.middleware.js';
import {
  consulterDisponibilites, getAllReservations, getReservationById, createReservation,
  modifierReservation, annulerReservation, deleteReservation, supprimerReservationsAnnulees,
} from '../controllers/reservation.controller.js';

const router = Router();

router.get('/disponibilites', consulterDisponibilites);
router.get('/', getAllReservations);
router.get('/:id', getReservationById);
router.post('/', createReservation);
router.patch('/:id', modifierReservation);
router.patch('/:id/annuler', annulerReservation);

// ⚠️ /annulees doit être déclaré AVANT /:id, sinon Express interprète "annulees" comme un id
router.delete('/annulees', verifierToken, autoriserRoles('Administrateur', 'Manager'), supprimerReservationsAnnulees);
router.delete('/:id', verifierToken, autoriserRoles('Administrateur', 'Manager'), deleteReservation);

export default router;