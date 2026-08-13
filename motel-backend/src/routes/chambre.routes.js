import { Router } from 'express';

import { getAllChambres, getChambreById, createChambre, updateChambre, deleteChambre, updateEtatChambre } from '../controllers/chambre.controller.js';

const router = Router();

router.get('/', getAllChambres);
router.get('/:id', getChambreById);
router.post('/', createChambre);
router.patch('/:id/etat', updateEtatChambre);

router.patch('/:id', updateChambre);
router.delete('/:id', deleteChambre);

export default router;