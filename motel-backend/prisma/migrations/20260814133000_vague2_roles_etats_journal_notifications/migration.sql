-- Vague 2 : code de rôle stable, nouveaux états, journal général, notifications, paramètres.
-- Réécrite à la main par rapport au diff Prisma pour deux raisons :
--   1. `roles.code` ne peut pas être ajouté NOT NULL sans valeur sur des lignes existantes ;
--   2. journal_chambres doit être recopiée dans journal_operations AVANT d'être supprimée.

-- ---------- Nouveaux états et statuts (additifs, aucune donnée touchée) ----------
ALTER TABLE `chambres` MODIFY `etat` ENUM('DISPONIBLE', 'RESERVEE', 'OCCUPEE', 'NETTOYAGE', 'MAINTENANCE', 'HORS_SERVICE') NOT NULL DEFAULT 'DISPONIBLE';
ALTER TABLE `reservations` MODIFY `statut` ENUM('EN_ATTENTE', 'CONFIRMEE', 'EN_COURS', 'TERMINEE', 'ANNULEE', 'EXPIREE') NOT NULL DEFAULT 'EN_ATTENTE';

-- ---------- Code technique des rôles ----------
-- Ajouté d'abord vide, rempli depuis les libellés actuels, puis rendu unique.
ALTER TABLE `roles` ADD COLUMN `code` VARCHAR(191) NOT NULL DEFAULT '';

UPDATE `roles` SET `code` = 'ADMIN'        WHERE `libelle` = 'Administrateur';
UPDATE `roles` SET `code` = 'STANDARDISTE' WHERE `libelle` = 'Receptionniste';
UPDATE `roles` SET `code` = 'MANAGER'      WHERE `libelle` = 'Manager';
UPDATE `roles` SET `code` = 'CAISSIER'     WHERE `libelle` = 'Caissier';
UPDATE `roles` SET `code` = 'BARMAN'       WHERE `libelle` = 'Barman';
-- Filet pour un rôle créé à la main depuis l'écran Paramètres
UPDATE `roles` SET `code` = CONCAT('ROLE_', `id`) WHERE `code` = '';

ALTER TABLE `roles` ALTER COLUMN `code` DROP DEFAULT;
CREATE UNIQUE INDEX `roles_code_key` ON `roles`(`code`);

-- ---------- Journal général des opérations ----------
CREATE TABLE `journal_operations` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `dateOperation` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `action` VARCHAR(191) NOT NULL,
    `cibleType` VARCHAR(191) NOT NULL,
    `cibleId` INTEGER NULL,
    `resume` VARCHAR(191) NOT NULL,
    `avant` VARCHAR(191) NULL,
    `apres` VARCHAR(191) NULL,
    `utilisateurId` INTEGER NULL,
    `auteurNom` VARCHAR(191) NULL,

    INDEX `journal_operations_dateOperation_idx`(`dateOperation`),
    INDEX `journal_operations_cibleType_cibleId_idx`(`cibleType`, `cibleId`),
    INDEX `journal_operations_utilisateurId_idx`(`utilisateurId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Reprise de l'historique déjà enregistré par la vague 1
INSERT INTO `journal_operations`
  (`dateOperation`, `action`, `cibleType`, `cibleId`, `resume`, `avant`, `apres`, `utilisateurId`, `auteurNom`)
SELECT
  j.`dateChangement`,
  'CHAMBRE_ETAT',
  'chambre',
  j.`chambreId`,
  CONCAT('Chambre ', COALESCE(c.`numero`, j.`chambreId`), ' : ', j.`etatAvant`, ' vers ', j.`etatApres`),
  j.`etatAvant`,
  j.`etatApres`,
  j.`utilisateurId`,
  CONCAT(COALESCE(u.`prenom`, ''), ' ', COALESCE(u.`nom`, ''))
FROM `journal_chambres` j
LEFT JOIN `chambres` c ON c.`id` = j.`chambreId`
LEFT JOIN `utilisateurs` u ON u.`id` = j.`utilisateurId`;

ALTER TABLE `journal_chambres` DROP FOREIGN KEY `journal_chambres_chambreId_fkey`;
ALTER TABLE `journal_chambres` DROP FOREIGN KEY `journal_chambres_utilisateurId_fkey`;
DROP TABLE `journal_chambres`;

-- ---------- Notifications ----------
CREATE TABLE `notifications` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `dateCreation` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `type` VARCHAR(191) NOT NULL,
    `titre` VARCHAR(191) NOT NULL,
    `message` VARCHAR(191) NOT NULL,
    `lien` VARCHAR(191) NULL,
    `roleCible` VARCHAR(191) NULL,
    `utilisateurCibleId` INTEGER NULL,
    `lue` BOOLEAN NOT NULL DEFAULT false,
    `dateLecture` DATETIME(3) NULL,

    INDEX `notifications_roleCible_lue_idx`(`roleCible`, `lue`),
    INDEX `notifications_utilisateurCibleId_lue_idx`(`utilisateurCibleId`, `lue`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- ---------- Paramètres généraux ----------
CREATE TABLE `parametres` (
    `cle` VARCHAR(191) NOT NULL,
    `valeur` VARCHAR(191) NOT NULL,
    `libelle` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NULL,
    `unite` VARCHAR(191) NULL,
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`cle`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

INSERT INTO `parametres` (`cle`, `valeur`, `libelle`, `description`, `unite`, `updatedAt`) VALUES
  ('EXPIRATION_RESERVATION_HEURES', '2',
   'Délai avant expiration d''une réservation',
   'Une réservation encore en attente passée ce délai est annulée automatiquement et la chambre redevient disponible.',
   'heures', NOW(3)),
  ('TAMPON_NETTOYAGE_HEURES', '1',
   'Tampon avant une arrivée',
   'Une chambre réservée reste louable jusqu''à ce délai avant l''arrivée prévue, pour laisser le temps du nettoyage.',
   'heures', NOW(3));

-- ---------- Clés étrangères ----------
ALTER TABLE `journal_operations` ADD CONSTRAINT `journal_operations_utilisateurId_fkey` FOREIGN KEY (`utilisateurId`) REFERENCES `utilisateurs`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `notifications` ADD CONSTRAINT `notifications_utilisateurCibleId_fkey` FOREIGN KEY (`utilisateurCibleId`) REFERENCES `utilisateurs`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
