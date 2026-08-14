import { Router } from 'express';
import { verifierToken, autoriserRoles } from '../middlewares/auth.middleware.js';
import { ADMIN, CAISSIER, ACCUEIL } from '../config/roles.js';
import {
  consulterDisponibilites, getAllReservations, getReservationById, createReservation,
  modifierReservation, annulerReservation, confirmerReservation, deleteReservation,
  supprimerReservationsAnnulees, arriveeDirecte,
} from '../controllers/reservation.controller.js';

const router = Router();

// Le caissier a besoin de lire les réservations : l'écran Paiements les liste pour
// rattacher un encaissement, et il contrôle les recettes en fin de journée.
const rolesLecture = [...ACCUEIL, CAISSIER];

router.use(verifierToken);

router.get('/disponibilites', autoriserRoles(...rolesLecture), consulterDisponibilites);
router.get('/', autoriserRoles(...rolesLecture), getAllReservations);

// ⚠️ /annulees doit être déclaré AVANT /:id, sinon Express interprète "annulees" comme un id
router.delete('/annulees', autoriserRoles(ADMIN), supprimerReservationsAnnulees);

router.get('/:id', autoriserRoles(...rolesLecture), getReservationById);
router.post('/', autoriserRoles(...ACCUEIL), createReservation);

// Client qui se présente au comptoir : client, réservation, check-in et paiement d'un bloc
router.post('/arrivee-directe', autoriserRoles(...ACCUEIL), arriveeDirecte);

router.patch('/:id', autoriserRoles(...ACCUEIL), modifierReservation);
router.patch('/:id/annuler', autoriserRoles(...ACCUEIL), annulerReservation);
router.patch('/:id/confirmer', autoriserRoles(...ACCUEIL), confirmerReservation);

router.delete('/:id', autoriserRoles(ADMIN), deleteReservation);

export default router;
