-- MariaDB dump 10.19  Distrib 10.4.32-MariaDB, for Win64 (AMD64)
--
-- Host: 127.0.0.1    Database: motel_db
-- ------------------------------------------------------
-- Server version	10.4.32-MariaDB

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `_prisma_migrations`
--

DROP TABLE IF EXISTS `_prisma_migrations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `_prisma_migrations` (
  `id` varchar(36) NOT NULL,
  `checksum` varchar(64) NOT NULL,
  `finished_at` datetime(3) DEFAULT NULL,
  `migration_name` varchar(255) NOT NULL,
  `logs` text DEFAULT NULL,
  `rolled_back_at` datetime(3) DEFAULT NULL,
  `started_at` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `applied_steps_count` int(10) unsigned NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `_prisma_migrations`
--

LOCK TABLES `_prisma_migrations` WRITE;
/*!40000 ALTER TABLE `_prisma_migrations` DISABLE KEYS */;
INSERT INTO `_prisma_migrations` VALUES ('04bc524c-04e4-4e63-8f8d-42afc71f5be4','cfd8f99f21cf234aecc726a6dd30cec34e1dd2809c4c1f640da925aa57f78cb5','2026-08-11 03:42:40.796','20260811034233_ajout_heures_supplementaires',NULL,NULL,'2026-08-11 03:42:33.328',1),('04f8e764-d9a1-472e-a76f-16752c2aa7d8','1d158c975323345744ce4bba055c09fc80c9498c0dea2f25a85dd8fdcdd85c2d','2026-08-07 04:29:21.873','20260807042857_client_optionnel_tarif_horaire_categorie_service',NULL,NULL,'2026-08-07 04:28:57.867',1),('a9fa756e-2d37-4d37-8966-7f3a07a58dc9','65eba2f44069b1c4844402acb4a88d997042c2425a4795ea339b4d9903ac23de','2026-07-14 17:56:40.789','20260714175634_init',NULL,NULL,'2026-07-14 17:56:34.832',1),('ba17d9df-c4cf-422f-a9c2-7213e23fc9e7','53a45f7b79fa89f2e09cbdec89aa2c6804956667ac73cb018d461f65d4df58d2','2026-08-14 12:05:32.990','20260814120500_tracabilite_et_comptage_caisse','',NULL,'2026-08-14 12:05:32.990',0),('d586fcc0-510a-4815-bbc9-6d5747aaa7f2','186ebd1759e22c11751f2f1a5257f76f02a85cd9d1d7231cdf7933b56fec6048','2026-07-14 22:13:49.283','20260714221333_add_remboursement_paiement',NULL,NULL,'2026-07-14 22:13:33.675',1),('f12022fd-4329-4ade-8a82-2781bbf1e075','f1b0a104d24fe744991c85221e3b3343de0acd94e90c92171a85afd64300bd01','2026-08-07 04:32:02.211','20260807043150_ajout_sejour_service_consommation',NULL,NULL,'2026-08-07 04:31:50.226',1),('fa22860b-8279-44cf-809e-18ed013d9894','3f6f3703cbe99f71b234eec5a7a8f84795e0eff077ddb45b12f8220c5b326395','2026-08-11 02:16:28.881','20260811021557_schema_consolide',NULL,NULL,'2026-08-11 02:15:59.318',1);
/*!40000 ALTER TABLE `_prisma_migrations` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `caisses`
--

DROP TABLE IF EXISTS `caisses`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `caisses` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `dateOuverture` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `dateFermeture` datetime(3) DEFAULT NULL,
  `soldeInitial` decimal(10,2) NOT NULL,
  `soldeFinal` decimal(10,2) DEFAULT NULL,
  `ouverte` tinyint(1) NOT NULL DEFAULT 1,
  `utilisateurId` int(11) NOT NULL,
  `montantCompte` decimal(10,2) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `caisses_utilisateurId_fkey` (`utilisateurId`),
  CONSTRAINT `caisses_utilisateurId_fkey` FOREIGN KEY (`utilisateurId`) REFERENCES `utilisateurs` (`id`) ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=14 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `caisses`
--

LOCK TABLES `caisses` WRITE;
/*!40000 ALTER TABLE `caisses` DISABLE KEYS */;
INSERT INTO `caisses` VALUES (1,'2026-07-14 22:54:09.212','2026-07-14 22:59:00.731',20000.00,45000.00,0,1,NULL),(2,'2026-07-15 01:59:54.328','2026-07-15 02:04:37.983',500000.00,310050.00,0,1,NULL),(3,'2026-07-15 02:34:18.621','2026-07-16 17:23:41.350',50000.00,176000.00,0,1,NULL),(4,'2026-07-17 20:28:32.414','2026-07-27 14:08:59.796',50000.00,51000.00,0,1,NULL),(5,'2026-07-29 04:04:11.074','2026-08-06 01:50:22.831',0.00,801500.00,0,1,NULL),(6,'2026-08-07 04:36:56.567','2026-08-07 05:27:52.458',15000.00,14900.00,0,1,NULL),(7,'2026-08-07 15:48:33.893','2026-08-08 03:59:03.868',0.00,295000.00,0,1,NULL),(8,'2026-08-07 20:32:00.414',NULL,0.00,NULL,1,3,NULL),(9,'2026-08-08 05:19:48.974','2026-08-09 12:19:08.576',15000.00,15000.00,0,1,NULL),(10,'2026-08-11 03:03:27.151',NULL,0.00,NULL,1,4,NULL),(11,'2026-08-13 06:16:28.426','2026-08-13 20:40:16.063',0.00,5500.00,0,1,NULL),(12,'2026-08-13 20:47:40.441',NULL,0.00,NULL,1,1,NULL);
/*!40000 ALTER TABLE `caisses` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `chambres`
--

DROP TABLE IF EXISTS `chambres`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `chambres` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `numero` varchar(191) NOT NULL,
  `etat` enum('DISPONIBLE','OCCUPEE','MAINTENANCE','NETTOYAGE') NOT NULL DEFAULT 'DISPONIBLE',
  `etage` int(11) DEFAULT NULL,
  `typeChambreId` int(11) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `chambres_numero_key` (`numero`),
  KEY `chambres_typeChambreId_fkey` (`typeChambreId`),
  CONSTRAINT `chambres_typeChambreId_fkey` FOREIGN KEY (`typeChambreId`) REFERENCES `types_chambre` (`id`) ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=13 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `chambres`
--

LOCK TABLES `chambres` WRITE;
/*!40000 ALTER TABLE `chambres` DISABLE KEYS */;
INSERT INTO `chambres` VALUES (10,'001','OCCUPEE',1,4),(11,'002','DISPONIBLE',1,5),(12,'003','NETTOYAGE',2,4);
/*!40000 ALTER TABLE `chambres` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `clients`
--

DROP TABLE IF EXISTS `clients`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `clients` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `nom` varchar(191) DEFAULT NULL,
  `prenom` varchar(191) DEFAULT NULL,
  `telephone` varchar(191) NOT NULL,
  `email` varchar(191) DEFAULT NULL,
  `motDePasse` varchar(191) DEFAULT NULL,
  `adresse` varchar(191) DEFAULT NULL,
  `numeroPiece` varchar(191) DEFAULT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updatedAt` datetime(3) NOT NULL,
  `sexe` enum('M','F') DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `clients_telephone_key` (`telephone`),
  UNIQUE KEY `clients_email_key` (`email`)
) ENGINE=InnoDB AUTO_INCREMENT=12 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `clients`
--

LOCK TABLES `clients` WRITE;
/*!40000 ALTER TABLE `clients` DISABLE KEYS */;
INSERT INTO `clients` VALUES (10,'Noé','Kendrick','771271398','noekendrick919@gmail.com','$2b$10$DthQTFOEoJ0XQDNHOjn.Rugae3R8ohvTNFnixmFKG7mjDwi4tFoOO','Ouakam','GA2026j','2026-08-13 05:50:09.063','2026-08-13 05:50:09.063','M'),(11,'Abdou','xxx','705569888','a@gmail.com','$2b$10$pzr.pGl6jMwTZbWpUcn4h.W3st.2uHtF5fyrK3VlpeK9BenXDOem.','oukamam','aaaaa5588','2026-08-13 20:59:06.333','2026-08-13 20:59:06.333','M');
/*!40000 ALTER TABLE `clients` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `consommations`
--

DROP TABLE IF EXISTS `consommations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `consommations` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `quantite` int(11) NOT NULL DEFAULT 1,
  `dateConsommation` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `prixApplique` decimal(10,2) NOT NULL,
  `sejourId` int(11) NOT NULL,
  `serviceId` int(11) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `consommations_sejourId_fkey` (`sejourId`),
  KEY `consommations_serviceId_fkey` (`serviceId`),
  CONSTRAINT `consommations_sejourId_fkey` FOREIGN KEY (`sejourId`) REFERENCES `sejours` (`id`) ON UPDATE CASCADE,
  CONSTRAINT `consommations_serviceId_fkey` FOREIGN KEY (`serviceId`) REFERENCES `services` (`id`) ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `consommations`
--

LOCK TABLES `consommations` WRITE;
/*!40000 ALTER TABLE `consommations` DISABLE KEYS */;
/*!40000 ALTER TABLE `consommations` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `factures`
--

DROP TABLE IF EXISTS `factures`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `factures` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `numeroFacture` varchar(191) NOT NULL,
  `dateEmission` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `montantHT` decimal(10,2) NOT NULL,
  `tva` decimal(10,2) NOT NULL,
  `montantTTC` decimal(10,2) NOT NULL,
  `paiementId` int(11) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `factures_numeroFacture_key` (`numeroFacture`),
  UNIQUE KEY `factures_paiementId_key` (`paiementId`),
  CONSTRAINT `factures_paiementId_fkey` FOREIGN KEY (`paiementId`) REFERENCES `paiements` (`id`) ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=16 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `factures`
--

LOCK TABLES `factures` WRITE;
/*!40000 ALTER TABLE `factures` DISABLE KEYS */;
INSERT INTO `factures` VALUES (14,'FACT-2026-000014','2026-08-13 20:47:40.387',12711.86,2288.14,15000.00,14);
/*!40000 ALTER TABLE `factures` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `heures_supplementaires`
--

DROP TABLE IF EXISTS `heures_supplementaires`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `heures_supplementaires` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `nombreHeures` int(11) NOT NULL,
  `prixParHeure` decimal(10,2) NOT NULL,
  `montant` decimal(10,2) NOT NULL,
  `dateAjout` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `sejourId` int(11) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `heures_supplementaires_sejourId_fkey` (`sejourId`),
  CONSTRAINT `heures_supplementaires_sejourId_fkey` FOREIGN KEY (`sejourId`) REFERENCES `sejours` (`id`) ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `heures_supplementaires`
--

LOCK TABLES `heures_supplementaires` WRITE;
/*!40000 ALTER TABLE `heures_supplementaires` DISABLE KEYS */;
/*!40000 ALTER TABLE `heures_supplementaires` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `journal_chambres`
--

DROP TABLE IF EXISTS `journal_chambres`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `journal_chambres` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `dateChangement` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `etatAvant` enum('DISPONIBLE','OCCUPEE','MAINTENANCE','NETTOYAGE') NOT NULL,
  `etatApres` enum('DISPONIBLE','OCCUPEE','MAINTENANCE','NETTOYAGE') NOT NULL,
  `motif` varchar(191) DEFAULT NULL,
  `chambreId` int(11) NOT NULL,
  `utilisateurId` int(11) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `journal_chambres_chambreId_dateChangement_idx` (`chambreId`,`dateChangement`),
  KEY `journal_chambres_utilisateurId_fkey` (`utilisateurId`),
  CONSTRAINT `journal_chambres_chambreId_fkey` FOREIGN KEY (`chambreId`) REFERENCES `chambres` (`id`) ON UPDATE CASCADE,
  CONSTRAINT `journal_chambres_utilisateurId_fkey` FOREIGN KEY (`utilisateurId`) REFERENCES `utilisateurs` (`id`) ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `journal_chambres`
--

LOCK TABLES `journal_chambres` WRITE;
/*!40000 ALTER TABLE `journal_chambres` DISABLE KEYS */;
INSERT INTO `journal_chambres` VALUES (1,'2026-08-14 12:28:23.748','DISPONIBLE','NETTOYAGE',NULL,12,3);
/*!40000 ALTER TABLE `journal_chambres` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `lignes_vente`
--

DROP TABLE IF EXISTS `lignes_vente`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `lignes_vente` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `quantite` int(11) NOT NULL DEFAULT 1,
  `prixApplique` decimal(10,2) NOT NULL,
  `venteId` int(11) NOT NULL,
  `serviceId` int(11) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `lignes_vente_venteId_fkey` (`venteId`),
  KEY `lignes_vente_serviceId_fkey` (`serviceId`),
  CONSTRAINT `lignes_vente_serviceId_fkey` FOREIGN KEY (`serviceId`) REFERENCES `services` (`id`) ON UPDATE CASCADE,
  CONSTRAINT `lignes_vente_venteId_fkey` FOREIGN KEY (`venteId`) REFERENCES `ventes_directes` (`id`) ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `lignes_vente`
--

LOCK TABLES `lignes_vente` WRITE;
/*!40000 ALTER TABLE `lignes_vente` DISABLE KEYS */;
INSERT INTO `lignes_vente` VALUES (1,2,3000.00,1,2),(2,1,3000.00,2,2),(3,1,2500.00,2,3),(4,3,2500.00,3,4),(5,1,3000.00,4,2),(6,1,2500.00,4,4),(7,1,2500.00,4,3);
/*!40000 ALTER TABLE `lignes_vente` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `mouvements_caisse`
--

DROP TABLE IF EXISTS `mouvements_caisse`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `mouvements_caisse` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `dateMouvement` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `type` enum('ENTREE','SORTIE') NOT NULL,
  `montant` decimal(10,2) NOT NULL,
  `motif` varchar(191) DEFAULT NULL,
  `caisseId` int(11) NOT NULL,
  `creeParId` int(11) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `mouvements_caisse_caisseId_fkey` (`caisseId`),
  KEY `mouvements_caisse_creeParId_fkey` (`creeParId`),
  CONSTRAINT `mouvements_caisse_caisseId_fkey` FOREIGN KEY (`caisseId`) REFERENCES `caisses` (`id`) ON UPDATE CASCADE,
  CONSTRAINT `mouvements_caisse_creeParId_fkey` FOREIGN KEY (`creeParId`) REFERENCES `utilisateurs` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=24 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `mouvements_caisse`
--

LOCK TABLES `mouvements_caisse` WRITE;
/*!40000 ALTER TABLE `mouvements_caisse` DISABLE KEYS */;
INSERT INTO `mouvements_caisse` VALUES (1,'2026-07-14 22:55:03.031','ENTREE',30000.00,'Paiement chambre 101',1,NULL),(2,'2026-07-14 22:55:50.414','SORTIE',5000.00,'Achat fournitures ménage',1,NULL),(3,'2026-07-15 02:01:08.876','ENTREE',50.00,'Matelas pour chambre',2,NULL),(4,'2026-07-15 02:01:43.532','ENTREE',60000.00,'facture de courant',2,NULL),(5,'2026-07-15 02:02:42.430','SORTIE',250000.00,'Achat télévision pour le motel ',2,NULL),(6,'2026-07-15 02:50:06.364','ENTREE',6000.00,'client elodie',3,NULL),(7,'2026-07-15 02:51:57.836','ENTREE',120000.00,'cliente à solder',3,NULL),(8,'2026-07-17 20:29:14.008','ENTREE',1000.00,'pour boire',4,NULL),(9,'2026-07-29 04:04:11.085','ENTREE',500000.00,'Paiement réservation #10 · Noé Kendrick · ESPECES',5,NULL),(10,'2026-08-01 14:51:58.766','ENTREE',1500.00,'bieres',5,NULL),(11,'2026-08-01 15:48:49.084','ENTREE',300000.00,'Paiement réservation #11 · Guillaume LEPAIN · ESPECES',5,NULL),(12,'2026-08-07 04:45:40.259','SORTIE',100.00,'oko',6,NULL),(13,'2026-08-07 15:48:33.900','ENTREE',45000.00,'Paiement réservation #12 · loli Léa · ESPECES',7,NULL),(14,'2026-08-07 20:05:09.869','ENTREE',250000.00,'Paiement réservation #14 · Noé Kendrick · MOBILE_MONEY',7,NULL),(15,'2026-08-07 20:32:00.422','ENTREE',135000.00,'Paiement réservation #15 · ela soso · ESPECES',8,NULL),(16,'2026-08-11 03:16:06.536','ENTREE',6000.00,'Vente bar #1 · 1 article(s)',10,NULL),(17,'2026-08-11 03:17:31.045','ENTREE',5500.00,'Vente bar #2 · 2 article(s)',10,NULL),(18,'2026-08-13 06:16:28.439','ENTREE',7500.00,'Vente bar #3 · 1 article(s)',11,NULL),(19,'2026-08-13 06:17:49.651','SORTIE',2000.00,'ravitaillement savon',11,NULL),(20,'2026-08-13 20:47:40.446','ENTREE',15000.00,'Paiement réservation #16 · Kendrick Noé · ESPECES',12,NULL),(23,'2026-08-14 13:10:32.600','ENTREE',8000.00,'Vente bar #4 · 3 article(s)',10,4);
/*!40000 ALTER TABLE `mouvements_caisse` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `paiements`
--

DROP TABLE IF EXISTS `paiements`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `paiements` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `datePaiement` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `montant` decimal(10,2) NOT NULL,
  `modePaiement` enum('ESPECES','CARTE','VIREMENT','MOBILE_MONEY') NOT NULL,
  `reference` varchar(191) DEFAULT NULL,
  `reservationId` int(11) NOT NULL,
  `dateRemboursement` datetime(3) DEFAULT NULL,
  `rembourse` tinyint(1) NOT NULL DEFAULT 0,
  `encaisseParId` int(11) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `paiements_reservationId_fkey` (`reservationId`),
  KEY `paiements_encaisseParId_fkey` (`encaisseParId`),
  CONSTRAINT `paiements_encaisseParId_fkey` FOREIGN KEY (`encaisseParId`) REFERENCES `utilisateurs` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `paiements_reservationId_fkey` FOREIGN KEY (`reservationId`) REFERENCES `reservations` (`id`) ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=16 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `paiements`
--

LOCK TABLES `paiements` WRITE;
/*!40000 ALTER TABLE `paiements` DISABLE KEYS */;
INSERT INTO `paiements` VALUES (14,'2026-08-13 20:47:40.309',15000.00,'ESPECES','okokok2026',16,NULL,0,NULL);
/*!40000 ALTER TABLE `paiements` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `reservations`
--

DROP TABLE IF EXISTS `reservations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `reservations` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `dateReservation` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `dateArrivee` datetime(3) NOT NULL,
  `dateDepart` datetime(3) NOT NULL,
  `nombreNuits` int(11) DEFAULT NULL,
  `montantTotal` decimal(10,2) NOT NULL,
  `statut` enum('EN_ATTENTE','CONFIRMEE','EN_COURS','TERMINEE','ANNULEE') NOT NULL DEFAULT 'EN_ATTENTE',
  `source` enum('EN_LIGNE','RECEPTION') NOT NULL DEFAULT 'RECEPTION',
  `clientId` int(11) NOT NULL,
  `chambreId` int(11) NOT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updatedAt` datetime(3) NOT NULL,
  `modeTarification` enum('NUITEE','HORAIRE') NOT NULL DEFAULT 'NUITEE',
  `nombreHeures` int(11) DEFAULT NULL,
  `creeParId` int(11) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `reservations_clientId_fkey` (`clientId`),
  KEY `reservations_chambreId_fkey` (`chambreId`),
  KEY `reservations_creeParId_fkey` (`creeParId`),
  CONSTRAINT `reservations_chambreId_fkey` FOREIGN KEY (`chambreId`) REFERENCES `chambres` (`id`) ON UPDATE CASCADE,
  CONSTRAINT `reservations_clientId_fkey` FOREIGN KEY (`clientId`) REFERENCES `clients` (`id`) ON UPDATE CASCADE,
  CONSTRAINT `reservations_creeParId_fkey` FOREIGN KEY (`creeParId`) REFERENCES `utilisateurs` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=18 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `reservations`
--

LOCK TABLES `reservations` WRITE;
/*!40000 ALTER TABLE `reservations` DISABLE KEYS */;
INSERT INTO `reservations` VALUES (16,'2026-08-13 20:46:38.552','2026-08-14 00:00:00.000','2026-08-15 00:00:00.000',1,15000.00,'EN_COURS','RECEPTION',10,10,'2026-08-13 20:46:38.552','2026-08-14 11:16:54.929','NUITEE',NULL,NULL),(17,'2026-08-14 12:26:42.366','2026-08-22 00:00:00.000','2026-08-30 00:00:00.000',8,400000.00,'EN_ATTENTE','RECEPTION',11,11,'2026-08-14 12:26:42.366','2026-08-14 12:26:42.366','NUITEE',NULL,3);
/*!40000 ALTER TABLE `reservations` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `roles`
--

DROP TABLE IF EXISTS `roles`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `roles` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `libelle` varchar(191) NOT NULL,
  `description` varchar(191) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `roles_libelle_key` (`libelle`)
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `roles`
--

LOCK TABLES `roles` WRITE;
/*!40000 ALTER TABLE `roles` DISABLE KEYS */;
INSERT INTO `roles` VALUES (1,'Administrateur','Gestion complète du système'),(2,'Manager','Gestion des rapport et de l\'equipe'),(3,'Receptionniste','Elle gere l\'Accueil '),(4,'Caissier','Elle gere la caisse '),(6,'Barman','Gères unique le restaurant bar');
/*!40000 ALTER TABLE `roles` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `sejours`
--

DROP TABLE IF EXISTS `sejours`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `sejours` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `dateEntree` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `dateSortie` datetime(3) DEFAULT NULL,
  `tarifApplique` decimal(10,2) DEFAULT NULL,
  `reservationId` int(11) NOT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `checkInParId` int(11) DEFAULT NULL,
  `checkOutParId` int(11) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `sejours_reservationId_key` (`reservationId`),
  KEY `sejours_checkInParId_fkey` (`checkInParId`),
  KEY `sejours_checkOutParId_fkey` (`checkOutParId`),
  CONSTRAINT `sejours_checkInParId_fkey` FOREIGN KEY (`checkInParId`) REFERENCES `utilisateurs` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `sejours_checkOutParId_fkey` FOREIGN KEY (`checkOutParId`) REFERENCES `utilisateurs` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `sejours_reservationId_fkey` FOREIGN KEY (`reservationId`) REFERENCES `reservations` (`id`) ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `sejours`
--

LOCK TABLES `sejours` WRITE;
/*!40000 ALTER TABLE `sejours` DISABLE KEYS */;
INSERT INTO `sejours` VALUES (3,'2026-08-14 11:16:54.913',NULL,NULL,16,'2026-08-14 11:16:54.913',NULL,NULL);
/*!40000 ALTER TABLE `sejours` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `services`
--

DROP TABLE IF EXISTS `services`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `services` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `nom` varchar(191) NOT NULL,
  `categorie` enum('BLANCHISSERIE','RESTAURANT','MINIBAR','AUTRE') NOT NULL DEFAULT 'AUTRE',
  `prix` decimal(10,2) NOT NULL,
  `description` varchar(191) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `services`
--

LOCK TABLES `services` WRITE;
/*!40000 ALTER TABLE `services` DISABLE KEYS */;
INSERT INTO `services` VALUES (2,'Petit déj standard ','RESTAURANT',3000.00,'omelette + croissant '),(3,'Jus d\'orange','MINIBAR',2500.00,'Jus naturel'),(4,'Brochette poulet','RESTAURANT',2500.00,'il s\'agit des brochettes de poulets');
/*!40000 ALTER TABLE `services` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `types_chambre`
--

DROP TABLE IF EXISTS `types_chambre`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `types_chambre` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `libelle` varchar(191) NOT NULL,
  `prixParNuit` decimal(10,2) NOT NULL,
  `capacite` int(11) NOT NULL,
  `description` varchar(191) DEFAULT NULL,
  `prixHeureSupplementaire` decimal(10,2) DEFAULT NULL,
  `prixPremiereHeure` decimal(10,2) DEFAULT NULL,
  `promo` decimal(5,2) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `types_chambre`
--

LOCK TABLES `types_chambre` WRITE;
/*!40000 ALTER TABLE `types_chambre` DISABLE KEYS */;
INSERT INTO `types_chambre` VALUES (4,'Chambre Standard',15000.00,2,'Cette chambre est très spacieuse',NULL,NULL,NULL),(5,'Chambre Luxieuse',50000.00,4,'Chambre composée d\'une bainoire etc....',NULL,NULL,NULL);
/*!40000 ALTER TABLE `types_chambre` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `utilisateur_roles`
--

DROP TABLE IF EXISTS `utilisateur_roles`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `utilisateur_roles` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `utilisateurId` int(11) NOT NULL,
  `roleId` int(11) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `utilisateur_roles_utilisateurId_roleId_key` (`utilisateurId`,`roleId`),
  KEY `utilisateur_roles_roleId_fkey` (`roleId`),
  CONSTRAINT `utilisateur_roles_roleId_fkey` FOREIGN KEY (`roleId`) REFERENCES `roles` (`id`) ON UPDATE CASCADE,
  CONSTRAINT `utilisateur_roles_utilisateurId_fkey` FOREIGN KEY (`utilisateurId`) REFERENCES `utilisateurs` (`id`) ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `utilisateur_roles`
--

LOCK TABLES `utilisateur_roles` WRITE;
/*!40000 ALTER TABLE `utilisateur_roles` DISABLE KEYS */;
INSERT INTO `utilisateur_roles` VALUES (1,1,1),(5,2,4),(6,3,2),(7,4,6),(8,5,3);
/*!40000 ALTER TABLE `utilisateur_roles` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `utilisateurs`
--

DROP TABLE IF EXISTS `utilisateurs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `utilisateurs` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `nom` varchar(191) NOT NULL,
  `prenom` varchar(191) NOT NULL,
  `email` varchar(191) NOT NULL,
  `motDePasse` varchar(191) NOT NULL,
  `telephone` varchar(191) DEFAULT NULL,
  `actif` tinyint(1) NOT NULL DEFAULT 1,
  `createdAt` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updatedAt` datetime(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `utilisateurs_email_key` (`email`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `utilisateurs`
--

LOCK TABLES `utilisateurs` WRITE;
/*!40000 ALTER TABLE `utilisateurs` DISABLE KEYS */;
INSERT INTO `utilisateurs` VALUES (1,'noe','koelo','nk@gmail.com','$2b$10$TbygQ5Y9gKzyZBhgMFWrt.YJXuVZ5GJCqOBhe74sSyq7Ov/2ZqnYm','771271398',1,'2026-07-15 00:52:26.024','2026-07-17 07:54:20.722'),(2,'Sow','Moussa','moussa.sow@example.com','$2b$10$dG1nFh7f6IvmNSVy5vdGXOpnIODPmAXut2IDM04phgn.4nRHan62W','00330880',1,'2026-07-14 23:57:40.793','2026-08-14 12:32:18.888'),(3,'Krilin','dbz','kdbz@hot.io','$2b$10$7VRZORKGSJWNMPs9h2u5LeUY4ViDyXLP1sYeQ.EdSrUc9R3cOBToe','85596663333',1,'2026-07-16 17:25:53.592','2026-07-16 17:25:53.592'),(4,'Diop','Awa','awa@gmail.com','$2b$10$qkT1OtPqAVE4ZbsZOR5ciOLTo4BBcuGB4ob0Iw6Okzb.TflzqFvHG','771288888',1,'2026-08-11 02:34:10.746','2026-08-11 02:34:10.746'),(5,'Réception','Poste','receptionniste@motelbdustade.local','$2b$10$T4TZ.Zpcxcg.RNP6iznB6uaTtFFht0F8XUMNYa30WLedjaUd7dS4C',NULL,1,'2026-08-14 12:26:49.447','2026-08-14 12:26:49.447');
/*!40000 ALTER TABLE `utilisateurs` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `ventes_directes`
--

DROP TABLE IF EXISTS `ventes_directes`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `ventes_directes` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `dateVente` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `montantTotal` decimal(10,2) NOT NULL,
  `utilisateurId` int(11) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `ventes_directes_utilisateurId_fkey` (`utilisateurId`),
  CONSTRAINT `ventes_directes_utilisateurId_fkey` FOREIGN KEY (`utilisateurId`) REFERENCES `utilisateurs` (`id`) ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `ventes_directes`
--

LOCK TABLES `ventes_directes` WRITE;
/*!40000 ALTER TABLE `ventes_directes` DISABLE KEYS */;
INSERT INTO `ventes_directes` VALUES (1,'2026-08-11 03:16:06.522',6000.00,4),(2,'2026-08-11 03:17:31.032',5500.00,4),(3,'2026-08-13 06:16:28.343',7500.00,1),(4,'2026-08-14 13:10:32.571',8000.00,4);
/*!40000 ALTER TABLE `ventes_directes` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-08-14 13:27:52
