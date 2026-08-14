-- DropIndex
DROP INDEX `caisses_utilisateurId_fkey` ON `caisses`;

-- DropIndex
DROP INDEX `chambres_typeChambreId_fkey` ON `chambres`;

-- DropIndex
DROP INDEX `consommations_sejourId_fkey` ON `consommations`;

-- DropIndex
DROP INDEX `consommations_serviceId_fkey` ON `consommations`;

-- DropIndex
DROP INDEX `heures_supplementaires_sejourId_fkey` ON `heures_supplementaires`;

-- DropIndex
DROP INDEX `lignes_vente_serviceId_fkey` ON `lignes_vente`;

-- DropIndex
DROP INDEX `lignes_vente_venteId_fkey` ON `lignes_vente`;

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

-- DropIndex
DROP INDEX `ventes_directes_utilisateurId_fkey` ON `ventes_directes`;

-- AlterTable
ALTER TABLE `caisses` ADD COLUMN `montantCompte` DECIMAL(10, 2) NULL;

-- AlterTable
ALTER TABLE `mouvements_caisse` ADD COLUMN `creeParId` INTEGER NULL;

-- AlterTable
ALTER TABLE `paiements` ADD COLUMN `encaisseParId` INTEGER NULL;

-- AlterTable
ALTER TABLE `reservations` ADD COLUMN `creeParId` INTEGER NULL;

-- AlterTable
ALTER TABLE `sejours` ADD COLUMN `checkInParId` INTEGER NULL,
    ADD COLUMN `checkOutParId` INTEGER NULL;

-- CreateTable
CREATE TABLE `journal_chambres` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `dateChangement` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `etatAvant` ENUM('DISPONIBLE', 'OCCUPEE', 'MAINTENANCE', 'NETTOYAGE') NOT NULL,
    `etatApres` ENUM('DISPONIBLE', 'OCCUPEE', 'MAINTENANCE', 'NETTOYAGE') NOT NULL,
    `motif` VARCHAR(191) NULL,
    `chambreId` INTEGER NOT NULL,
    `utilisateurId` INTEGER NOT NULL,

    INDEX `journal_chambres_chambreId_dateChangement_idx`(`chambreId`, `dateChangement`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `utilisateur_roles` ADD CONSTRAINT `utilisateur_roles_utilisateurId_fkey` FOREIGN KEY (`utilisateurId`) REFERENCES `utilisateurs`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `utilisateur_roles` ADD CONSTRAINT `utilisateur_roles_roleId_fkey` FOREIGN KEY (`roleId`) REFERENCES `roles`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `chambres` ADD CONSTRAINT `chambres_typeChambreId_fkey` FOREIGN KEY (`typeChambreId`) REFERENCES `types_chambre`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `journal_chambres` ADD CONSTRAINT `journal_chambres_chambreId_fkey` FOREIGN KEY (`chambreId`) REFERENCES `chambres`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `journal_chambres` ADD CONSTRAINT `journal_chambres_utilisateurId_fkey` FOREIGN KEY (`utilisateurId`) REFERENCES `utilisateurs`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `reservations` ADD CONSTRAINT `reservations_clientId_fkey` FOREIGN KEY (`clientId`) REFERENCES `clients`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `reservations` ADD CONSTRAINT `reservations_chambreId_fkey` FOREIGN KEY (`chambreId`) REFERENCES `chambres`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `reservations` ADD CONSTRAINT `reservations_creeParId_fkey` FOREIGN KEY (`creeParId`) REFERENCES `utilisateurs`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `sejours` ADD CONSTRAINT `sejours_reservationId_fkey` FOREIGN KEY (`reservationId`) REFERENCES `reservations`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `sejours` ADD CONSTRAINT `sejours_checkInParId_fkey` FOREIGN KEY (`checkInParId`) REFERENCES `utilisateurs`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `sejours` ADD CONSTRAINT `sejours_checkOutParId_fkey` FOREIGN KEY (`checkOutParId`) REFERENCES `utilisateurs`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `heures_supplementaires` ADD CONSTRAINT `heures_supplementaires_sejourId_fkey` FOREIGN KEY (`sejourId`) REFERENCES `sejours`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `consommations` ADD CONSTRAINT `consommations_sejourId_fkey` FOREIGN KEY (`sejourId`) REFERENCES `sejours`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `consommations` ADD CONSTRAINT `consommations_serviceId_fkey` FOREIGN KEY (`serviceId`) REFERENCES `services`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ventes_directes` ADD CONSTRAINT `ventes_directes_utilisateurId_fkey` FOREIGN KEY (`utilisateurId`) REFERENCES `utilisateurs`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `lignes_vente` ADD CONSTRAINT `lignes_vente_venteId_fkey` FOREIGN KEY (`venteId`) REFERENCES `ventes_directes`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `lignes_vente` ADD CONSTRAINT `lignes_vente_serviceId_fkey` FOREIGN KEY (`serviceId`) REFERENCES `services`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `paiements` ADD CONSTRAINT `paiements_reservationId_fkey` FOREIGN KEY (`reservationId`) REFERENCES `reservations`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `paiements` ADD CONSTRAINT `paiements_encaisseParId_fkey` FOREIGN KEY (`encaisseParId`) REFERENCES `utilisateurs`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `factures` ADD CONSTRAINT `factures_paiementId_fkey` FOREIGN KEY (`paiementId`) REFERENCES `paiements`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `caisses` ADD CONSTRAINT `caisses_utilisateurId_fkey` FOREIGN KEY (`utilisateurId`) REFERENCES `utilisateurs`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `mouvements_caisse` ADD CONSTRAINT `mouvements_caisse_caisseId_fkey` FOREIGN KEY (`caisseId`) REFERENCES `caisses`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `mouvements_caisse` ADD CONSTRAINT `mouvements_caisse_creeParId_fkey` FOREIGN KEY (`creeParId`) REFERENCES `utilisateurs`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

