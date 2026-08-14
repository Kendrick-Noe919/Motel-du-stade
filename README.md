# Motel du Stade

Application de gestion pour le Motel du Stade (réservations, chambres, caisse, clients, etc.).

## Structure du projet

```
Motel-du-stade/
├── motel-backend/      # API REST (Node.js, Express, Prisma, MySQL)
├── motel-frontend/     # Interface web (React, Vite)
├── database/           # Sauvegardes et scripts SQL
│   └── motel_db.sql
└── README.md
```

Cette organisation **backend / frontend séparés** est la norme pour un déploiement VPS :
- le **frontend** est compilé en fichiers statiques (Nginx ou Apache),
- le **backend** tourne en service Node.js (PM2),
- la **base MySQL** est hébergée sur le même VPS ou un service managé.

## Prérequis locaux

- Node.js 20+
- XAMPP (MySQL/MariaDB) ou MySQL
- npm

## Démarrage en local

### 1. Base de données

Importer le dump en ligne de commande :

```bash
mysql -u root -p --default-character-set=utf8mb4 motel_db < database/motel_db.sql
```

> ⚠️ **`--default-character-set=utf8mb4` n'est pas optionnel.** Sans ce drapeau, MySQL
> remplace chaque octet accentué par un `?` : « système » devient « syst??me », et la
> perte est définitive côté base. C'est exactement ce qui était arrivé à la base locale.
> Même précaution pour les exports : `mysqldump --default-character-set=utf8mb4`.
> Les tables doivent rester en **InnoDB** : MyISAM ignore les transactions et les clés
> étrangères, ce qui rend les paiements et les check-in non atomiques.

### 2. Backend

```bash
cd motel-backend
cp .env.example .env   # adapter mot de passe MySQL si besoin
npm install
npx prisma generate
npm run dev
```

API disponible sur `http://localhost:5000`

### 3. Frontend

```bash
cd motel-frontend
cp .env.example .env
npm install
npm run dev
```

Interface disponible sur `http://localhost:5173`

## Déploiement VPS (LWS)

1. **MySQL** : créer la base `motel_db` et importer `database/motel_db.sql`
2. **Backend** : `npm install`, `npx prisma generate`, variables `.env`, lancer avec PM2
3. **Frontend** : `npm run build`, servir le dossier `dist/` via Nginx/Apache
4. **Reverse proxy** : rediriger `/api` vers le backend (port 5000)

## Variables d'environnement

| Fichier | Variables |
|---------|-----------|
| `motel-backend/.env` | `DB_*`, `JWT_SECRET`, `PORT`, `CORS_ORIGINS` |
| `motel-frontend/.env` | `VITE_API_URL` (URL de l'API en prod) |

`CORS_ORIGINS` liste les origines autorisées à appeler l'API depuis un navigateur,
séparées par des virgules. En production, y mettre l'URL exacte du frontend.

## Rôles et autorisations

La matrice d'accès est déclarée à deux endroits qui doivent rester alignés :

- **API (fait autorité)** : `verifierToken` + `autoriserRoles` en tête de chaque fichier
  de `motel-backend/src/routes/`. Les rôles sont relus en base à chaque requête, donc
  retirer un rôle ou désactiver un compte prend effet immédiatement.
- **Interface (confort)** : `motel-frontend/src/config/acces.js`, lu à la fois par le
  menu latéral et par les gardes de routes.

| Rôle | Accès |
|------|-------|
| Administrateur | tout |
| Manager | accueil, paiements, vue consolidée des caisses, tableau de bord |
| Receptionniste | chambres, réservations, séjours, clients, paiements, sa caisse |
| Caissier | paiements, réservations en lecture, sa caisse |
| Barman | services, ventes du bar, sa caisse |
