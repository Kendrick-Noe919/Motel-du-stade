import { Router } from 'express';
import { getAllTypesChambre, createTypeChambre } from '../controllers/typeChambre.controller.js';

const router = Router();

router.get('/', getAllTypesChambre);
router.post('/', createTypeChambre);

export default router;