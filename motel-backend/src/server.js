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
import parametreRoutes from './routes/parametre.routes.js';
import notificationRoutes from './routes/notification.routes.js';
import journalRoutes from './routes/journal.routes.js';
import { demarrerExpirationAutomatique } from './taches/expirationReservations.js';

const app = express();

// ---------- Middlewares globaux ----------
// CORS restreint aux origines déclarées. Sans cette liste, n'importe quel site web
// pourrait piloter l'API depuis le navigateur d'un visiteur déjà connecté.
const originesAutorisees = (process.env.CORS_ORIGINS || 'http://localhost:5173')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

app.use(cors({
  origin(origine, callback) {
    // Pas d'origine = appel hors navigateur (curl, Postman, PM2 healthcheck) : on laisse passer,
    // ces appels restent soumis à l'authentification comme les autres.
    if (!origine || originesAutorisees.includes(origine)) return callback(null, true);
    callback(new Error(`Origine non autorisée par CORS : ${origine}`));
  },
  credentials: true,
}));

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
app.use('/api/parametres', parametreRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/journal', journalRoutes);

// ---------- Démarrage du serveur ----------
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`✅ Noé Kendrick le Serveur a démarré sur http://localhost:${PORT}`);
  // Libère les chambres des réservations restées sans confirmation
  demarrerExpirationAutomatique();
});