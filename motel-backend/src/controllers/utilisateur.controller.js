import bcrypt from 'bcrypt';
import prisma from '../utils/prisma.js';
import { tracer } from '../utils/journal.js';
import { ADMIN } from '../config/roles.js';

// Renvoie un message de blocage si l'opération ferait disparaître le dernier
// administrateur actif, ou null si elle est permise.
async function verifierDernierAdministrateur(utilisateurId) {
  const cible = await prisma.utilisateur.findUnique({
    where: { id: utilisateurId },
    include: { roles: { include: { role: true } } },
  });
  if (!cible) return null;

  const estAdmin = cible.roles.some((r) => r.role.code === ADMIN);
  if (!estAdmin || !cible.actif) return null;

  const autresAdmins = await prisma.utilisateur.count({
    where: {
      actif: true,
      id: { not: utilisateurId },
      roles: { some: { role: { code: ADMIN } } },
    },
  });

  return autresAdmins > 0
    ? null
    : 'C\'est le dernier administrateur actif. Créez un autre administrateur avant de le retirer, '
      + 'sinon plus personne ne pourra administrer l\'application.';
}

const champsPublics = {
  id: true,
  nom: true,
  prenom: true,
  email: true,
  telephone: true,
  actif: true,
  createdAt: true,
  roles: { select: { role: { select: { id: true, libelle: true } } } },
};

// Aplati la structure roles: [{ role: {...} }] en roles: [{...}] pour un JSON plus simple côté frontend
function formaterUtilisateur(utilisateur) {
  return { ...utilisateur, roles: utilisateur.roles.map((r) => r.role) };
}

// ---------- POST /api/utilisateurs ----------
// Créer un utilisateur avec un ou plusieurs rôles (réservé à l'Administrateur)
export async function createUtilisateur(req, res) {
  try {
    const { nom, prenom, email, motDePasse, telephone, roleIds } = req.body;

    if (!nom || !prenom || !email || !motDePasse || !roleIds?.length) {
      return res.status(400).json({
        message: 'nom, prenom, email, motDePasse et roleIds (au moins un) sont requis',
      });
    }

    const motDePasseHash = await bcrypt.hash(motDePasse, 10);

    const utilisateur = await prisma.utilisateur.create({
      data: {
        nom, prenom, email, telephone,
        motDePasse: motDePasseHash,
        roles: {
          create: roleIds.map((roleId) => ({ role: { connect: { id: Number(roleId) } } })),
        },
      },
      select: champsPublics,
    });

    res.status(201).json(formaterUtilisateur(utilisateur));
  } catch (error) {
    if (error.code === 'P2002') {
      return res.status(409).json({ message: 'Cet email est déjà utilisé' });
    }
    console.error(error);
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
}

// ---------- GET /api/utilisateurs ----------
export async function getAllUtilisateurs(req, res) {
  try {
    const utilisateurs = await prisma.utilisateur.findMany({ select: champsPublics });
    res.json(utilisateurs.map(formaterUtilisateur));
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
}

// ---------- PATCH /api/utilisateurs/:id ----------
// Modifier un utilisateur (infos de base, activation/désactivation)
export async function modifierUtilisateur(req, res) {
  try {
    const { id } = req.params;
    const { nom, prenom, telephone, actif } = req.body;

    // Perdre le dernier administrateur actif rendrait l'application inadministrable,
    // sans aucun moyen de rattrapage depuis l'interface.
    if (actif === false) {
      const blocage = await verifierDernierAdministrateur(Number(id));
      if (blocage) return res.status(409).json({ message: blocage });
    }

    const avant = await prisma.utilisateur.findUnique({ where: { id: Number(id) } });
    if (!avant) return res.status(404).json({ message: 'Utilisateur non trouvé' });

    const utilisateur = await prisma.$transaction(async (tx) => {
      const maj = await tx.utilisateur.update({
        where: { id: Number(id) },
        data: { nom, prenom, telephone, actif },
        select: champsPublics,
      });

      if (actif !== undefined && actif !== avant.actif) {
        await tracer(tx, req, {
          action: actif ? 'COMPTE_REACTIVE' : 'COMPTE_ARCHIVE',
          cibleType: 'utilisateur',
          cibleId: maj.id,
          resume: `${maj.prenom} ${maj.nom} ${actif ? 'réactivé' : 'archivé'}`,
          avant: avant.actif ? 'actif' : 'archivé',
          apres: actif ? 'actif' : 'archivé',
        });
      }

      return maj;
    });

    res.json(formaterUtilisateur(utilisateur));
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ message: 'Utilisateur non trouvé' });
    }
    console.error(error);
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
}

// Ce qu'un compte laisse derrière lui.
//
// Deux familles, et la distinction commande tout le reste :
//
//   - Les traces « comptables » — caisses tenues et ventes du bar — sont liées au
//     compte par une clé obligatoire. Les détruire pour effacer une personne
//     effacerait des recettes réelles. Un compte qui en porte n'est pas supprimable.
//
//   - Les traces « d'auteur » — qui a encaissé, qui a fait le check-in, qui a écrit
//     au journal — sont facultatives. L'opération garde son sens sans son auteur :
//     on peut détacher le nom et supprimer le compte.
async function inventaireDuCompte(utilisateurId) {
  const [caisses, ventes, paiements, reservations, checkIns, checkOuts, mouvements, operations] =
    await Promise.all([
      prisma.caisse.count({ where: { utilisateurId } }),
      prisma.venteDirecte.count({ where: { utilisateurId } }),
      prisma.paiement.count({ where: { encaisseParId: utilisateurId } }),
      prisma.reservation.count({ where: { creeParId: utilisateurId } }),
      prisma.sejour.count({ where: { checkInParId: utilisateurId } }),
      prisma.sejour.count({ where: { checkOutParId: utilisateurId } }),
      prisma.mouvementCaisse.count({ where: { creeParId: utilisateurId } }),
      prisma.journalOperation.count({ where: { utilisateurId } }),
    ]);

  return {
    bloquant: { caisses, ventes },
    detachable: { paiements, reservations, checkIns, checkOuts, mouvements, operations },
    estSupprimable: caisses === 0 && ventes === 0,
  };
}

// ---------- GET /api/utilisateurs/:id/archive ----------
// Le dossier complet d'un compte, à conserver avant de le supprimer. C'est la
// contrepartie de la suppression : ce qui disparaît de la base reste sur le disque
// de l'administrateur.
export async function archiverUtilisateur(req, res) {
  try {
    const id = Number(req.params.id);

    const utilisateur = await prisma.utilisateur.findUnique({
      where: { id },
      include: { roles: { include: { role: true } } },
    });
    if (!utilisateur) return res.status(404).json({ message: 'Utilisateur non trouvé' });

    const [caisses, ventes, paiements, operations] = await Promise.all([
      prisma.caisse.findMany({
        where: { utilisateurId: id },
        include: { mouvements: true },
        orderBy: { dateOuverture: 'asc' },
      }),
      prisma.venteDirecte.findMany({
        where: { utilisateurId: id },
        include: { lignes: { include: { service: { select: { nom: true } } } } },
        orderBy: { dateVente: 'asc' },
      }),
      prisma.paiement.findMany({
        where: { encaisseParId: id },
        select: { id: true, datePaiement: true, montant: true, modePaiement: true, reservationId: true },
        orderBy: { datePaiement: 'asc' },
      }),
      prisma.journalOperation.findMany({
        where: { utilisateurId: id },
        orderBy: { dateOperation: 'asc' },
      }),
    ]);

    const inventaire = await inventaireDuCompte(id);

    // Le mot de passe n'est jamais exporté, même haché.
    const archive = {
      genereLe: new Date().toISOString(),
      generePar: req.user?.email || null,
      compte: {
        id: utilisateur.id,
        nom: utilisateur.nom,
        prenom: utilisateur.prenom,
        email: utilisateur.email,
        telephone: utilisateur.telephone,
        actif: utilisateur.actif,
        creeLe: utilisateur.createdAt,
        roles: utilisateur.roles.map((r) => ({ code: r.role.code, libelle: r.role.libelle })),
      },
      resume: inventaire,
      caisses: caisses.map((c) => ({
        id: c.id,
        dateOuverture: c.dateOuverture,
        dateFermeture: c.dateFermeture,
        soldeInitial: Number(c.soldeInitial),
        soldeFinal: c.soldeFinal === null ? null : Number(c.soldeFinal),
        montantCompte: c.montantCompte === null ? null : Number(c.montantCompte),
        mouvements: c.mouvements.map((m) => ({
          date: m.dateMouvement, type: m.type, montant: Number(m.montant), motif: m.motif,
        })),
      })),
      ventesDuBar: ventes.map((v) => ({
        id: v.id,
        date: v.dateVente,
        montantTotal: Number(v.montantTotal),
        lignes: v.lignes.map((l) => ({
          service: l.service?.nom || null, quantite: l.quantite, prixApplique: Number(l.prixApplique),
        })),
      })),
      encaissements: paiements.map((p) => ({
        id: p.id, date: p.datePaiement, montant: Number(p.montant),
        mode: p.modePaiement, reservationId: p.reservationId,
      })),
      journal: operations.map((o) => ({
        date: o.dateOperation, action: o.action, cible: `${o.cibleType} #${o.cibleId ?? ''}`.trim(), resume: o.resume,
      })),
    };

    const nomFichier = `archive-${utilisateur.prenom}-${utilisateur.nom}-${id}.json`
      .toLowerCase()
      .replace(/[^a-z0-9.-]+/g, '-');

    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${nomFichier}"`);
    res.send(JSON.stringify(archive, null, 2));
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
}

// ---------- DELETE /api/utilisateurs/:id ----------
// Suppression définitive. Réservée aux comptes archivés qui n'ont tenu ni caisse
// ni vente : sans cela, la comptabilité passée deviendrait invérifiable.
export async function supprimerUtilisateur(req, res) {
  try {
    const id = Number(req.params.id);

    if (id === req.user.id) {
      return res.status(400).json({ message: 'Vous ne pouvez pas supprimer votre propre compte.' });
    }

    const utilisateur = await prisma.utilisateur.findUnique({
      where: { id },
      include: { roles: { include: { role: true } } },
    });
    if (!utilisateur) return res.status(404).json({ message: 'Utilisateur non trouvé' });

    // L'archivage est un passage obligé : il laisse le temps de constater qu'un
    // compte désactivé ne manque à personne avant de le détruire.
    if (utilisateur.actif) {
      return res.status(409).json({
        message: 'Archivez d\'abord ce compte. Un compte encore actif ne se supprime pas directement.',
      });
    }

    const blocage = await verifierDernierAdministrateur(id);
    if (blocage) return res.status(409).json({ message: blocage });

    const inventaire = await inventaireDuCompte(id);
    if (!inventaire.estSupprimable) {
      const { caisses, ventes } = inventaire.bloquant;
      const details = [
        caisses > 0 ? `${caisses} caisse(s) tenue(s)` : null,
        ventes > 0 ? `${ventes} vente(s) au bar` : null,
      ].filter(Boolean).join(' et ');

      return res.status(409).json({
        message: `Suppression impossible : ce compte porte ${details}. `
               + 'Les supprimer effacerait des recettes réelles et rendrait la comptabilité invérifiable. '
               + 'Le compte reste archivé, sans accès à l\'application.',
        inventaire,
      });
    }

    const identite = `${utilisateur.prenom} ${utilisateur.nom} (${utilisateur.email})`;

    await prisma.$transaction(async (tx) => {
      // Les traces d'auteur sont détachées, pas détruites : l'encaissement et le
      // check-in gardent toute leur valeur comptable sans le nom de leur auteur.
      await tx.paiement.updateMany({ where: { encaisseParId: id }, data: { encaisseParId: null } });
      await tx.reservation.updateMany({ where: { creeParId: id }, data: { creeParId: null } });
      await tx.sejour.updateMany({ where: { checkInParId: id }, data: { checkInParId: null } });
      await tx.sejour.updateMany({ where: { checkOutParId: id }, data: { checkOutParId: null } });
      await tx.mouvementCaisse.updateMany({ where: { creeParId: id }, data: { creeParId: null } });
      await tx.journalOperation.updateMany({ where: { utilisateurId: id }, data: { utilisateurId: null } });
      await tx.notification.deleteMany({ where: { utilisateurCibleId: id } });

      await tx.utilisateurRole.deleteMany({ where: { utilisateurId: id } });
      await tx.utilisateur.delete({ where: { id } });

      // La trace de la suppression, elle, doit survivre à la personne supprimée :
      // le journal fige le nom au moment de l'écriture.
      await tracer(tx, req, {
        action: 'COMPTE_SUPPRIME',
        cibleType: 'utilisateur',
        cibleId: id,
        resume: `Compte supprimé définitivement : ${identite}`,
        avant: 'archivé',
        apres: 'supprimé',
      });
    });

    res.json({ message: `Compte de ${identite} supprimé définitivement.` });
  } catch (error) {
    if (error.code === 'P2025') return res.status(404).json({ message: 'Utilisateur non trouvé' });
    console.error(error);
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
}

// ---------- GET /api/utilisateurs/:id/suppression-possible ----------
// Interrogé par l'écran avant de proposer le bouton : mieux vaut griser une action
// impossible que d'afficher une erreur après le clic.
export async function verifierSuppression(req, res) {
  try {
    const id = Number(req.params.id);
    const utilisateur = await prisma.utilisateur.findUnique({ where: { id } });
    if (!utilisateur) return res.status(404).json({ message: 'Utilisateur non trouvé' });
    res.json(await inventaireDuCompte(id));
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
}

// ---------- POST /api/utilisateurs/:id/roles ----------
// Attribuer un rôle supplémentaire à un utilisateur existant
export async function attribuerRole(req, res) {
  try {
    const { id } = req.params;
    const { roleId } = req.body;

    if (!roleId) {
      return res.status(400).json({ message: 'roleId est requis' });
    }

    await prisma.utilisateurRole.create({
      data: {
        utilisateur: { connect: { id: Number(id) } },
        role: { connect: { id: Number(roleId) } },
      },
    });

    const utilisateur = await prisma.utilisateur.findUnique({
      where: { id: Number(id) },
      select: champsPublics,
    });

    res.json(formaterUtilisateur(utilisateur));
  } catch (error) {
    if (error.code === 'P2002') {
      return res.status(409).json({ message: 'Cet utilisateur a déjà ce rôle' });
    }
    console.error(error);
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
}

// ---------- DELETE /api/utilisateurs/:id/roles/:roleId ----------
// Retirer un rôle
export async function retirerRole(req, res) {
  try {
    const { id, roleId } = req.params;

    const role = await prisma.role.findUnique({ where: { id: Number(roleId) } });
    if (role?.code === ADMIN) {
      const blocage = await verifierDernierAdministrateur(Number(id));
      if (blocage) return res.status(409).json({ message: blocage });
    }

    await prisma.utilisateurRole.delete({
      where: {
        utilisateurId_roleId: { utilisateurId: Number(id), roleId: Number(roleId) },
      },
    });

    res.status(204).send();
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ message: 'Cette association utilisateur/rôle n\'existe pas' });
    }
    console.error(error);
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
}
// Pas de suppression de compte : un compte se désactive et rejoint les archives.
// Ses caisses, ses ventes et ses encaissements restent rattachés à un nom réel,
// sinon la comptabilité passée deviendrait invérifiable.
