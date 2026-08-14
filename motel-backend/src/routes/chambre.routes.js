import { Router } from 'express';
import { verifierToken, autoriserRoles } from '../middlewares/auth.middleware.js';
import { ADMIN, ACCUEIL } from '../config/roles.js';
import { getAllChambres, getChambreById, createChambre, updateChambre, deleteChambre, updateEtatChambre } from '../controllers/chambre.controller.js';

const router = Router();

// Tout le personnel connecté : la mini-carte des chambres est affichée dans la barre
// latérale de tous les rôles (Layout.jsx), la lecture doit donc rester largement ouverte.
router.use(verifierToken);

router.get('/', getAllChambres);
router.get('/:id', getChambreById);

// Opérationnel : changer l'état au quotidien (nettoyage, maintenance, remise à disposition)
router.patch('/:id/etat', autoriserRoles(...ACCUEIL), updateEtatChambre);

// Structurel : créer, renuméroter ou supprimer une chambre reste à l'administrateur
router.post('/', autoriserRoles(ADMIN), createChambre);
router.patch('/:id', autoriserRoles(ADMIN), updateChambre);
router.delete('/:id', autoriserRoles(ADMIN), deleteChambre);

export default router;
