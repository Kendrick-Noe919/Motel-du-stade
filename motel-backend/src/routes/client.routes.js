import { Router } from 'express';
import { verifierToken, autoriserRoles } from '../middlewares/auth.middleware.js';
import { ADMIN, ACCUEIL } from '../config/roles.js';
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

// Le fichier clients contient des données personnelles (téléphone, adresse, pièce d'identité) :
// il reste réservé aux rôles qui accueillent réellement la clientèle.
router.use(verifierToken, autoriserRoles(...ACCUEIL));

// ⚠️ l'ordre compte : les routes spécifiques doivent être déclarées AVANT /:id
router.get('/recherche', rechercherClient);
router.get('/', getAllClients);
router.get('/:id/historique', getHistoriqueClient);
router.post('/inscription', inscrireClient);
router.post('/rapide', enregistrerClientRapide);
router.patch('/:id', updateClient);

// Supprimer une fiche client efface un historique
router.delete('/:id', autoriserRoles(ADMIN), deleteClient);

export default router;
