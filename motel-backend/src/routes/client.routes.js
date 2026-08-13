import { Router } from 'express';
import {
  inscrireClient,
  enregistrerClientRapide,
  getAllClients,
  rechercherClient,
  getHistoriqueClient,
  updateClient,
  deleteClient,
} from '../controllers/client.controller.js';

const router = Router();

// ⚠️ l'ordre compte : les routes spécifiques doivent être déclarées AVANT /:id
router.get('/recherche', rechercherClient);
router.get('/', getAllClients);
router.get('/:id/historique', getHistoriqueClient);
router.post('/inscription', inscrireClient);
router.post('/rapide', enregistrerClientRapide);
router.patch('/:id', updateClient);
router.delete('/:id', deleteClient);

export default router;