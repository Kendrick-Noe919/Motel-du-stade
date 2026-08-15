-- Remises de fidélité accordées au comptoir à un client qui revient.
--
-- Les trois colonnes sont NULL par défaut : une réservation sans remise se
-- comporte exactement comme avant, et les réservations existantes ne changent pas.
--
-- remiseChambrePourcent est appliquée une fois, au calcul du montant de la
-- réservation. remiseBarPourcent reste vivante pendant le séjour : chaque
-- consommation portée sur la chambre en bénéficie au moment de sa saisie.
ALTER TABLE `reservations`
  ADD COLUMN `remiseChambrePourcent` INTEGER NULL,
  ADD COLUMN `remiseBarPourcent` INTEGER NULL,
  ADD COLUMN `remiseMotif` VARCHAR(191) NULL;
