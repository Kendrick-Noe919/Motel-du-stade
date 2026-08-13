-- DropIndex
DROP INDEX `caisses_utilisateurId_fkey` ON `caisses`;

-- DropIndex
DROP INDEX `chambres_typeChambreId_fkey` ON `chambres`;

-- DropIndex
DROP INDEX `consommations_sejourId_fkey` ON `consommations`;

-- DropIndex
DROP INDEX `consommations_serviceId_fkey` ON `consommations`;

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
