/*
  Warnings:

  - A unique constraint covering the columns `[telephone]` on the table `clients` will be added. If there are existing duplicate values, this will fail.
  - Made the column `telephone` on table `clients` required. This step will fail if there are existing NULL values in that column.

*/
-- DropIndex
DROP INDEX `caisses_utilisateurId_fkey` ON `caisses`;

-- DropIndex
DROP INDEX `chambres_typeChambreId_fkey` ON `chambres`;

-- DropIndex
DROP INDEX `mouvements_caisse_caisseId_fkey` ON `mouvements_caisse`;

-- DropIndex
DROP INDEX `paiements_reservationId_fkey` ON `paiements`;

-- DropIndex
DROP INDEX `reservations_chambreId_fkey` ON `reservations`;

-- DropIndex
DROP INDEX `reservations_clientId_fkey` ON `reservations`;

-- DropIndex
DROP INDEX `utilisateur_roles_roleId_fkey` ON `utilisateur_roles`;

-- AlterTable
ALTER TABLE `clients` ADD COLUMN `sexe` ENUM('M', 'F') NULL,
    MODIFY `nom` VARCHAR(191) NULL,
    MODIFY `prenom` VARCHAR(191) NULL,
    MODIFY `telephone` VARCHAR(191) NOT NULL,
    MODIFY `email` VARCHAR(191) NULL,
    MODIFY `motDePasse` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `reservations` ADD COLUMN `modeTarification` ENUM('NUITEE', 'HORAIRE') NOT NULL DEFAULT 'NUITEE',
    ADD COLUMN `nombreHeures` INTEGER NULL,
    MODIFY `nombreNuits` INTEGER NULL;

-- AlterTable
ALTER TABLE `types_chambre` ADD COLUMN `prixHeureSupplementaire` DECIMAL(10, 2) NULL,
    ADD COLUMN `prixPremiereHeure` DECIMAL(10, 2) NULL,
    ADD COLUMN `promo` DECIMAL(5, 2) NULL;

-- CreateTable
CREATE TABLE `services` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `nom` VARCHAR(191) NOT NULL,
    `categorie` ENUM('BLANCHISSERIE', 'RESTAURANT', 'MINIBAR', 'AUTRE') NOT NULL DEFAULT 'AUTRE',
    `prix` DECIMAL(10, 2) NOT NULL,
    `description` VARCHAR(191) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `consommations` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `quantite` INTEGER NOT NULL DEFAULT 1,
    `dateConsommation` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `prixApplique` DECIMAL(10, 2) NOT NULL,
    `sejourId` INTEGER NOT NULL,
    `serviceId` INTEGER NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `sejours` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `dateEntree` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `dateSortie` DATETIME(3) NULL,
    `tarifApplique` DECIMAL(10, 2) NULL,
    `reservationId` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `sejours_reservationId_key`(`reservationId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE UNIQUE INDEX `clients_telephone_key` ON `clients`(`telephone`);

-- AddForeignKey
ALTER TABLE `utilisateur_roles` ADD CONSTRAINT `utilisateur_roles_utilisateurId_fkey` FOREIGN KEY (`utilisateurId`) REFERENCES `utilisateurs`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `utilisateur_roles` ADD CONSTRAINT `utilisateur_roles_roleId_fkey` FOREIGN KEY (`roleId`) REFERENCES `roles`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `chambres` ADD CONSTRAINT `chambres_typeChambreId_fkey` FOREIGN KEY (`typeChambreId`) REFERENCES `types_chambre`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `consommations` ADD CONSTRAINT `consommations_sejourId_fkey` FOREIGN KEY (`sejourId`) REFERENCES `sejours`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `consommations` ADD CONSTRAINT `consommations_serviceId_fkey` FOREIGN KEY (`serviceId`) REFERENCES `services`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `sejours` ADD CONSTRAINT `sejours_reservationId_fkey` FOREIGN KEY (`reservationId`) REFERENCES `reservations`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

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
