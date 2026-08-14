import { Router } from 'express';
import { verifierToken, autoriserRoles } from '../middlewares/auth.middleware.js';
import { BAR, CONTROLE } from '../config/roles.js';
import {
  creerVente, getVentes, getChambresOccupees, envoyerSurChambre, getConsommationsSurChambre,
} from '../controllers/vente.controller.js';

const router = Router();

router.use(verifierToken);

// Le caissier consulte les ventes du bar pour les rapprocher de la caisse qu'il récupère,
// sans pouvoir en créer.
router.get('/', autoriserRoles(...BAR, ...CONTROLE), getVentes);
router.post('/', autoriserRoles(...BAR), creerVente);

// Consommation portée sur la note d'un client logé : réglée au départ, pas au bar.
router.get('/chambres-occupees', autoriserRoles(...BAR), getChambresOccupees);
router.get('/sur-chambre', autoriserRoles(...BAR, ...CONTROLE), getConsommationsSurChambre);
router.post('/sur-chambre', autoriserRoles(...BAR), envoyerSurChambre);

export default router;
