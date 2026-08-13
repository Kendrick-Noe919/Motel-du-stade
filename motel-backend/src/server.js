import express from 'express';
import cors from 'cors';
import 'dotenv/config';

import typeChambreRoutes from './routes/typeChambre.routes.js';
import chambreRoutes from './routes/chambre.routes.js';
import clientRoutes from './routes/client.routes.js';
import reservationRoutes from './routes/reservation.routes.js';
import paiementRoutes from './routes/paiement.routes.js';
import caisseRoutes from './routes/caisse.routes.js';
import roleRoutes from './routes/role.routes.js';
import utilisateurRoutes from './routes/utilisateur.routes.js';
import authRoutes from './routes/auth.routes.js';
import dashboardRoutes from './routes/dashboard.routes.js';
import sejourRoutes from './routes/sejour.routes.js';
import serviceRoutes from './routes/service.routes.js';
import venteRoutes from './routes/vente.routes.js';

const app = express();

// ---------- Middlewares globaux ----------
app.use(cors());            // autorise React (autre port) à appeler cette API
app.use(express.json());    // permet de lire le JSON envoyé dans le corps des requêtes

// ---------- Route de test ----------
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Le serveur motel fonctionne' });
});

// ---------- Routes de l'application ----------
app.use('/api/types-chambre', typeChambreRoutes);
app.use('/api/chambres', chambreRoutes);
app.use('/api/clients', clientRoutes);
app.use('/api/reservations', reservationRoutes);
app.use('/api/paiements', paiementRoutes);
app.use('/api/caisses', caisseRoutes);
app.use('/api/roles', roleRoutes);
app.use('/api/utilisateurs', utilisateurRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/sejours', sejourRoutes);
app.use('/api/services', serviceRoutes);
app.use('/api/ventes', venteRoutes);

// ---------- Démarrage du serveur ----------
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`✅ Noé Kendrick le Serveur a démarré sur http://localhost:${PORT}`);
});