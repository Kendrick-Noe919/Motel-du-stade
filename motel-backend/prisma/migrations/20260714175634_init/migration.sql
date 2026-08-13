-- CreateTable
CREATE TABLE `roles` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `libelle` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NULL,

    UNIQUE INDEX `roles_libelle_key`(`libelle`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `utilisateurs` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `nom` VARCHAR(191) NOT NULL,
    `prenom` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `motDePasse` VARCHAR(191) NOT NULL,
    `telephone` VARCHAR(191) NULL,
    `actif` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `utilisateurs_email_key`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `utilisateur_roles` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `utilisateurId` INTEGER NOT NULL,
    `roleId` INTEGER NOT NULL,

    UNIQUE INDEX `utilisateur_roles_utilisateurId_roleId_key`(`utilisateurId`, `roleId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `clients` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `nom` VARCHAR(191) NOT NULL,
    `prenom` VARCHAR(191) NOT NULL,
    `telephone` VARCHAR(191) NULL,
    `email` VARCHAR(191) NOT NULL,
    `motDePasse` VARCHAR(191) NOT NULL,
    `adresse` VARCHAR(191) NULL,
    `numeroPiece` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `clients_email_key`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `types_chambre` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `libelle` VARCHAR(191) NOT NULL,
    `prixParNuit` DECIMAL(10, 2) NOT NULL,
    `capacite` INTEGER NOT NULL,
    `description` VARCHAR(191) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `chambres` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `numero` VARCHAR(191) NOT NULL,
    `etat` ENUM('DISPONIBLE', 'OCCUPEE', 'MAINTENANCE', 'NETTOYAGE') NOT NULL DEFAULT 'DISPONIBLE',
    `etage` INTEGER NULL,
    `typeChambreId` INTEGER NOT NULL,

    UNIQUE INDEX `chambres_numero_key`(`numero`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `reservations` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `dateReservation` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `dateArrivee` DATETIME(3) NOT NULL,
    `dateDepart` DATETIME(3) NOT NULL,
    `nombreNuits` INTEGER NOT NULL,
    `montantTotal` DECIMAL(10, 2) NOT NULL,
    `statut` ENUM('EN_ATTENTE', 'CONFIRMEE', 'EN_COURS', 'TERMINEE', 'ANNULEE') NOT NULL DEFAULT 'EN_ATTENTE',
    `source` ENUM('EN_LIGNE', 'RECEPTION') NOT NULL DEFAULT 'RECEPTION',
    `clientId` INTEGER NOT NULL,
    `chambreId` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `paiements` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `datePaiement` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `montant` DECIMAL(10, 2) NOT NULL,
    `modePaiement` ENUM('ESPECES', 'CARTE', 'VIREMENT', 'MOBILE_MONEY') NOT NULL,
    `reference` VARCHAR(191) NULL,
    `reservationId` INTEGER NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `factures` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `numeroFacture` VARCHAR(191) NOT NULL,
    `dateEmission` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `montantHT` DECIMAL(10, 2) NOT NULL,
    `tva` DECIMAL(10, 2) NOT NULL,
    `montantTTC` DECIMAL(10, 2) NOT NULL,
    `paiementId` INTEGER NOT NULL,

    UNIQUE INDEX `factures_numeroFacture_key`(`numeroFacture`),
    UNIQUE INDEX `factures_paiementId_key`(`paiementId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `caisses` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `dateOuverture` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `dateFermeture` DATETIME(3) NULL,
    `soldeInitial` DECIMAL(10, 2) NOT NULL,
    `soldeFinal` DECIMAL(10, 2) NULL,
    `ouverte` BOOLEAN NOT NULL DEFAULT true,
    `utilisateurId` INTEGER NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `mouvements_caisse` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `dateMouvement` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `type` ENUM('ENTREE', 'SORTIE') NOT NULL,
    `montant` DECIMAL(10, 2) NOT NULL,
    `motif` VARCHAR(191) NULL,
    `caisseId` INTEGER NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `utilisateur_roles` ADD CONSTRAINT `utilisateur_roles_utilisateurId_fkey` FOREIGN KEY (`utilisateurId`) REFERENCES `utilisateurs`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `utilisateur_roles` ADD CONSTRAINT `utilisateur_roles_roleId_fkey` FOREIGN KEY (`roleId`) REFERENCES `roles`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `chambres` ADD CONSTRAINT `chambres_typeChambreId_fkey` FOREIGN KEY (`typeChambreId`) REFERENCES `types_chambre`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `reservations` ADD CONSTRAINT `reservations_clientId_fkey` FOREIGN KEY (`clientId`) REFERENCES `clients`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `reservations` ADD CONSTRAINT `reservations_chambreId_fkey` FOREIGN KEY (`chambreId`) REFERENCES `chambres`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `paiements` ADD CONSTRAINT `paiements_reservationId_fkey` FOREIGN KEY (`reservationId`) REFERENCES `reservations`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `factures` ADD CONSTRAINT `factures_paiementId_fkey` FOREIGN KEY (`paiementId`) REFERENCES `paiements`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `caisses` ADD CONSTRAINT `caisses_utilisateurId_fkey` FOREIGN KEY (`utilisateurId`) REFERENCES `utilisateurs`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `mouvements_caisse` ADD CONSTRAINT `mouvements_caisse_caisseId_fkey` FOREIGN KEY (`caisseId`) REFERENCES `caisses`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
